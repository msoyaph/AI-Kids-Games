import {
  AdditiveBlending,
  BackSide,
  Color,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Matrix3,
  Mesh,
  NormalBlending,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
  type CubeTexture,
  type WebGLCubeRenderTarget,
  type WebGLRenderer,
} from 'three';
import { fbm3 } from '../../core/noise';
import { Rng } from '../../core/rng';
import type { QualityProfile } from '../../systems/quality';
import { bakeCube } from '../bake';
import { markShared } from '../dispose';
import {
  BAKE_GLSL,
  CLOUD_FRAG,
  HALO_FRAG,
  HALO_VERT,
  PLANET_FRAG,
  PLANET_VERT,
  RING_FRAG,
  RING_VERT,
  SUN_SURF_FRAG,
} from './planetShaders';
import { KIND, recipeFor, type PlanetRecipe } from './recipes';

// ------------------------------------------------------------------ bake cache

interface BakeEntry {
  rt: WebGLCubeRenderTarget;
  bytes: number;
  refs: number;
  used: number;
}

const bakes = new Map<string, BakeEntry>();
let useTick = 0;

/** Rough budget for baked planet textures; old unused bakes are freed beyond it. */
function budgetBytes(p: QualityProfile): number {
  return p.tier === 'low' ? 12e6 : p.tier === 'medium' ? 40e6 : 80e6;
}

function evict(p: QualityProfile): void {
  let total = 0;
  for (const e of bakes.values()) total += e.bytes;
  if (total <= budgetBytes(p)) return;
  const idle = [...bakes.entries()].filter(([, e]) => e.refs <= 0).sort((a, b) => a[1].used - b[1].used);
  for (const [key, e] of idle) {
    if (total <= budgetBytes(p)) break;
    e.rt.dispose();
    bakes.delete(key);
    total -= e.bytes;
  }
}

const C = (hex: string | undefined, fallback = '#808080') => new Color(hex ?? fallback);

function bakeUniforms(r: PlanetRecipe, layer: 0 | 1, bakeClouds: boolean) {
  const c = r.colors;
  return {
    uKind: { value: KIND[r.kind] },
    uLayer: { value: layer },
    uC0: { value: C(c[0]) },
    uC1: { value: C(c[1] ?? c[0]) },
    uC2: { value: C(c[2] ?? c[0]) },
    uC3: { value: C(c[3] ?? c[1] ?? c[0]) },
    uC4: { value: C(c[4] ?? c[1] ?? c[0]) },
    uC5: { value: C(c[5] ?? c[0]) },
    uP: { value: r.p.slice() },
    uSeed: { value: (r.seed % 97) * 0.731 },
    uCloudCover: { value: r.clouds?.coverage ?? 0.4 },
    uBakeClouds: { value: bakeClouds ? 1 : 0 },
    uCloudColor: { value: C(r.clouds?.color, '#ffffff') },
  };
}

/** Baked surface (layer 0) or cloud (layer 1) cube for a body. Shared and reference counted. */
function acquireBake(renderer: WebGLRenderer, id: string, layer: 0 | 1, size: number, p: QualityProfile): { tex: CubeTexture; release: () => void } {
  const r = recipeFor(id);
  const bakeClouds = layer === 0 && !p.clouds && !!r.clouds;
  const key = `${id}:${layer}:${size}:${p.octaves}:${bakeClouds ? 1 : 0}`;
  let e = bakes.get(key);
  if (!e) {
    const rt = bakeCube(renderer, {
      size,
      shader: BAKE_GLSL,
      uniforms: bakeUniforms(r, layer, bakeClouds),
      defines: { OCTAVES: r.kind === 'sun' ? 3 : p.octaves },
      mipmaps: true,
    });
    markShared(rt.texture);
    e = { rt, bytes: size * size * 6 * 4 * 1.34, refs: 0, used: 0 };
    bakes.set(key, e);
    evict(p);
  }
  e.refs++;
  e.used = ++useTick;
  const entry = e;
  let released = false;
  return {
    tex: entry.rt.texture,
    release: () => {
      if (released) return;
      released = true;
      entry.refs--;
    },
  };
}

/** Free every bake (after a lost GPU context). */
export function clearPlanetBakes(): void {
  for (const e of bakes.values()) e.rt.dispose();
  bakes.clear();
}

// ------------------------------------------------------------------ geometry

const spheres = new Map<number, SphereGeometry>();
function sharedSphere(segments: number): SphereGeometry {
  let g = spheres.get(segments);
  if (!g) {
    g = markShared(new SphereGeometry(1, segments, Math.max(8, Math.round(segments / 2))));
    spheres.set(segments, g);
  }
  return g;
}

const lumps = new Map<string, BufferGeometry>();
/** Potato-shaped small moons (Phobos, Deimos, Vesta). */
function lumpyGeometry(id: string, amount: number, detail: number): BufferGeometry {
  const key = `${id}:${detail}`;
  let g = lumps.get(key);
  if (!g) {
    const geo = new IcosahedronGeometry(1, detail);
    const pos = geo.attributes.position;
    const seed = new Rng(id).int(1, 9999);
    const v = new Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const n = fbm3(v.x * 1.3 + 5, v.y * 1.3, v.z * 1.3, 4, seed);
      const stretch = 1 + 0.18 * v.x * v.x;
      v.multiplyScalar((1 + n * amount) * stretch);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    g = markShared(geo);
    lumps.set(key, g);
  }
  return g;
}

// ------------------------------------------------------------------ planet view

export type PlanetDetail = 'hero' | 'normal' | 'small';

export interface PlanetOptions {
  renderer: WebGLRenderer;
  profile: QualityProfile;
  detail?: PlanetDetail;
  /** Sphere segments override. */
  segments?: number;
  /** Draw the atmosphere halo (off for tiny far-away dots). */
  halo?: boolean;
}

function bakeSizeFor(p: QualityProfile, detail: PlanetDetail): number {
  if (detail === 'hero') return p.bakeSize;
  if (detail === 'normal') return Math.max(128, p.bakeSize / 2);
  return Math.max(64, p.bakeSize / 4);
}

const tmpV = new Vector3();
const tmpM = new Matrix3();

/**
 * A planet, moon or dwarf planet: baked surface + optional clouds, atmosphere halo and rings.
 * `group` is positioned/scaled by the caller (radius 1 inside). Call `update` every frame.
 */
export class PlanetView {
  readonly id: string;
  readonly group = new Group();
  /** Tilt (axial tilt), then `spinner` turns around the axis. */
  readonly tilt = new Group();
  readonly spinner = new Group();
  readonly recipe: PlanetRecipe;
  private readonly surfaceMat: ShaderMaterial;
  private cloudMat: ShaderMaterial | null = null;
  private cloudMesh: Mesh | null = null;
  private haloMat: ShaderMaterial | null = null;
  private ringMat: ShaderMaterial | null = null;
  private readonly releases: Array<() => void> = [];
  private readonly sunWorld = new Vector3(1, 0.3, 0.2).normalize();
  private dim = 1;

  constructor(id: string, o: PlanetOptions) {
    this.id = id;
    const r = (this.recipe = recipeFor(id));
    const p = o.profile;
    const detail = o.detail ?? 'normal';
    const size = bakeSizeFor(p, detail);
    const seg = o.segments ?? (detail === 'hero' ? p.sphereSegments : detail === 'normal' ? Math.round(p.sphereSegments * 0.75) : 28);
    this.group.add(this.tilt);
    this.tilt.add(this.spinner);
    this.tilt.rotation.z = r.tilt;

    const surf = acquireBake(o.renderer, id, 0, size, p);
    this.releases.push(surf.release);
    const geo = r.lumpy ? lumpyGeometry(id, r.lumpy, detail === 'small' ? 3 : 5) : sharedSphere(seg);
    const isSun = r.kind === 'sun';
    this.surfaceMat = new ShaderMaterial({
      defines: p.tier === 'low' || r.bump <= 0 ? {} : { BUMP: 1 },
      uniforms: {
        uSurface: { value: surf.tex },
        uSunDir: { value: this.sunWorld },
        uSunColor: { value: new Color('#fff4e2').multiplyScalar(1.5) },
        uAmbient: { value: new Color('#2a2f55').multiplyScalar(0.35) },
        uAtmo: { value: C(r.atmo ?? '#000000') },
        uAtmoStrength: { value: r.atmo ? r.atmoStrength : 0 },
        uBump: { value: r.bump * 0.03 },
        uTexel: { value: 1.5 / size },
        uSpec: { value: r.spec ?? 0 },
        uSea: { value: r.kind === 'earth' ? r.p[0] : 0 },
        uEmissive: { value: r.emissive ? C(r.emissive.color).multiplyScalar(r.emissive.strength) : new Color(0) },
        uEmissiveMode: { value: r.emissive?.mode ?? 0 },
        uDim: { value: 1 },
        uTime: { value: 0 },
        uCenter: { value: new Vector3() },
        uRadius: { value: 1 },
        uRingN: { value: new Vector3(0, 1, 0) },
        uRing: { value: r.rings ? [r.rings.inner, r.rings.outer, r.rings.opacity, r.rings.faint ? 1 : 0] : [0, 0, 0, 0] },
        uRingOn: { value: r.rings && p.ringShadows ? 1 : 0 },
        uSeedR: { value: r.seed * 0.37 },
        uRot: { value: new Matrix3() },
        uIntensity: { value: 2.4 },
        uC0: { value: C(r.colors[0]) },
        uC1: { value: C(r.colors[1]) },
        uC2: { value: C(r.colors[3] ?? r.colors[2]) },
      },
      vertexShader: PLANET_VERT,
      fragmentShader: isSun ? SUN_SURF_FRAG : PLANET_FRAG,
    });
    const body = new Mesh(geo, this.surfaceMat);
    this.spinner.add(body);

    if (r.clouds && p.clouds && !isSun) {
      const cl = acquireBake(o.renderer, id, 1, Math.max(128, size / (detail === 'hero' ? 1 : 2)), p);
      this.releases.push(cl.release);
      this.cloudMat = new ShaderMaterial({
        uniforms: {
          uClouds: { value: cl.tex },
          uSunDir: { value: this.sunWorld },
          uSunColor: { value: new Color('#ffffff').multiplyScalar(1.45) },
          uAmbient: { value: new Color('#2a2f55').multiplyScalar(0.3) },
          uDim: { value: 1 },
        },
        vertexShader: PLANET_VERT,
        fragmentShader: CLOUD_FRAG,
        transparent: true,
        depthWrite: false,
        blending: NormalBlending,
        premultipliedAlpha: true,
      });
      this.cloudMesh = new Mesh(sharedSphere(seg), this.cloudMat);
      this.cloudMesh.scale.setScalar(1.012);
      this.tilt.add(this.cloudMesh);
    }

    if ((o.halo ?? true) && (r.atmo || isSun)) {
      const k = isSun ? 1.6 : 1 + 0.05 + r.atmoStrength * 0.04;
      this.haloMat = new ShaderMaterial({
        uniforms: {
          uColor: { value: C(r.atmo ?? '#ffb347').multiplyScalar(isSun ? 3 : 1.6) },
          uSunDir: { value: isSun ? new Vector3(0, 1, 0) : this.sunWorld },
          uStrength: { value: isSun ? 1.1 : Math.min(1.4, 0.5 + r.atmoStrength) },
          uLimb: { value: Math.sqrt(1 - 1 / (k * k)) },
          uDim: { value: 1 },
        },
        vertexShader: HALO_VERT,
        fragmentShader: isSun ? HALO_FRAG.replace('float lit = smoothstep(-0.35, 0.45, dot(N, normalize(uSunDir)));', 'float lit = 1.0;') : HALO_FRAG,
        side: BackSide,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        premultipliedAlpha: true,
      });
      const halo = new Mesh(sharedSphere(Math.min(64, seg)), this.haloMat);
      halo.scale.setScalar(k);
      this.group.add(halo);
    }

    if (r.rings) {
      const rr = r.rings;
      const ringGeo = markShared(ringGeometry(rr.inner, rr.outer));
      this.ringMat = new ShaderMaterial({
        uniforms: {
          uC0: { value: C(rr.colors[0]) },
          uC1: { value: C(rr.colors[1]) },
          uRing: { value: [rr.inner, rr.outer, rr.opacity, rr.faint ? 1 : 0] },
          uRadius: { value: 1 },
          uCenter: { value: new Vector3() },
          uSunDir: { value: this.sunWorld },
          uSunColor: { value: new Color('#fff4e2').multiplyScalar(1.3) },
          uRingN: { value: new Vector3(0, 1, 0) },
          uShadow: { value: p.ringShadows ? 1 : 0 },
          uDim: { value: 1 },
          uSeedR: { value: r.seed * 0.37 },
        },
        vertexShader: RING_VERT,
        fragmentShader: RING_FRAG,
        side: DoubleSide,
        transparent: true,
        depthWrite: false,
        premultipliedAlpha: true,
      });
      const ring = new Mesh(ringGeo, this.ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.renderOrder = 1;
      this.tilt.add(ring);
    }
    this.group.userData.onDispose = () => this.dispose();
  }

  /** Planet radius in world units (the group's scale). */
  get radius(): number {
    return this.group.scale.x;
  }

  /** Darken (locked places on the star map). */
  setDim(d: number): void {
    this.dim = d;
  }

  /** Call once per frame. `sunDir` points from the planet toward the Sun (world space). */
  update(time: number, sunDir: Vector3): void {
    const r = this.recipe;
    this.spinner.rotation.y = time * r.spin;
    if (this.cloudMesh) this.cloudMesh.rotation.y = time * (r.spin + (r.clouds?.speed ?? 0));
    this.sunWorld.copy(sunDir).normalize();
    this.group.updateWorldMatrix(true, true);
    const u = this.surfaceMat.uniforms;
    u.uTime.value = time;
    u.uDim.value = this.dim;
    this.group.getWorldPosition(u.uCenter.value as Vector3);
    u.uRadius.value = this.radius;
    (u.uRot.value as Matrix3).setFromMatrix4(this.spinner.matrixWorld);
    tmpM.setFromMatrix4(this.spinner.matrixWorld);
    // Remove scale from the rotation (uniform scale).
    const s = this.radius || 1;
    (u.uRot.value as Matrix3).multiplyScalar(1 / s);
    tmpV.set(0, 1, 0).applyMatrix3(tmpM.setFromMatrix4(this.tilt.matrixWorld)).normalize();
    (u.uRingN.value as Vector3).copy(tmpV);
    if (this.cloudMat) this.cloudMat.uniforms.uDim.value = this.dim;
    if (this.haloMat) this.haloMat.uniforms.uDim.value = this.dim;
    if (this.ringMat) {
      const ru = this.ringMat.uniforms;
      ru.uRadius.value = 1;
      (ru.uCenter.value as Vector3).copy(u.uCenter.value as Vector3);
      ru.uRadius.value = this.radius;
      (ru.uRingN.value as Vector3).copy(tmpV);
      ru.uDim.value = this.dim;
    }
  }

  dispose(): void {
    for (const r of this.releases) r();
    this.releases.length = 0;
  }
}

/** A flat ring whose vertices keep their real radius (in planet radii) so the shader can band it. */
function ringGeometry(inner: number, outer: number): RingGeometry {
  return new RingGeometry(inner, outer, 160, 1);
}

/** Convenience: create a planet view of radius `radius` at a position. */
export function createPlanet(id: string, radius: number, o: PlanetOptions): PlanetView {
  const v = new PlanetView(id, o);
  v.group.scale.setScalar(radius);
  return v;
}

/** Sun direction from a point toward a sun position. */
export function sunDirFrom(from: Vector3, sunPos: Vector3, out: Vector3): Vector3 {
  return out.copy(sunPos).sub(from).normalize();
}
