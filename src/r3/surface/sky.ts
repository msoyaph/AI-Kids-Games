import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  type PerspectiveCamera,
  type Scene,
  type WebGLRenderer,
} from 'three';
import { Rng } from '../../core/rng';
import type { FarStyle, Theme } from '../../data/themes';
import type { QualityProfile } from '../../systems/quality';
import { OUTPUT_GLSL } from '../materials';
import { createPlanet, type PlanetView } from '../space/planets';
import { SKIES, SpaceSky } from '../space/sky';
import { isZephyra, type SurfaceLight } from './look';

const DOME_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const DOME_FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uBottom;
uniform vec3 uHaze;
uniform float uHazeAmt;
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform float uSpace;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float e = d.y;
  vec3 col = mix(uBottom, uTop, smoothstep(-0.12, 0.36, e));
  col = mix(col, uHaze, uHazeAmt * exp(-abs(e + 0.02) * 7.0));
  float s = max(0.0, dot(d, uSunDir));
  col += uSunCol * (pow(s, 10.0) * 0.18 + pow(s, 90.0) * 0.5) * (1.0 - uSpace * 0.8);
  // Airless worlds: a soft glow along the horizon fading into the starry sky.
  float a = uSpace > 0.5 ? (1.0 - smoothstep(-0.1, 0.3, e)) * 0.85 : 1.0;
  gl_FragColor = vec4(col * a, a);
  ${OUTPUT_GLSL}
}`;

/** Profile height (0..1-ish) of a distant ridge at x for a style. */
function ridge(style: FarStyle, x: number, ph: number[]): number {
  const w = (f: number, p: number) => Math.sin(x * f + p);
  switch (style) {
    case 'mountains':
    case 'volcano': {
      const r = 1 - Math.abs(w(0.045, ph[0]));
      return 0.35 + 0.35 * r * r + 0.18 * w(0.11, ph[1]) + 0.07 * w(0.31, ph[2]);
    }
    case 'cliffs': {
      const v = 0.45 + 0.22 * w(0.05, ph[0]) + 0.12 * w(0.13, ph[1]);
      return Math.round(v * 6) / 6;
    }
    case 'dunes':
      return 0.25 + 0.12 * w(0.06, ph[0]) + 0.06 * w(0.17, ph[1]) + 0.03 * w(0.4, ph[2]);
    case 'craters':
      return 0.2 + 0.07 * w(0.05, ph[0]) + 0.04 * w(0.14, ph[1]) + 0.05 * Math.max(0, w(0.5, ph[2])) ** 6;
    case 'clouds':
      return -0.4;
    default:
      return 0.14 + 0.05 * w(0.08, ph[0]);
  }
}

const tmpM = new Matrix4();
const tmpQ = new Quaternion();
const tmpS = new Vector3();
const tmpP = new Vector3();

/**
 * A wall of distant scenery at depth z: a ridge strip shaped by the theme's style (with soft
 * normals so it shades like hills), plus instanced 3D shapes for spires, crystals, towers, domes,
 * clouds or a volcano. Fog melts it into the sky.
 */
function sceneryLayer(style: FarStyle, color: string, z: number, x0: number, x1: number, height: number, base: number, seed: number, th: Theme): Group {
  const g = new Group();
  const rng = new Rng(seed);
  const ph = [rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28)];
  const zeph = isZephyra(th);
  const mat = new MeshStandardMaterial({ color, roughness: 0.95, emissive: new Color(color).multiplyScalar(zeph ? 0.35 : th.stars ? 0.32 : 0.22) });
  const step = height > 20 ? 2 : 1;
  const n = Math.ceil((x1 - x0) / step) + 1;
  const pos = new Float32Array(n * 3 * 3);
  const nrm = new Float32Array(n * 3 * 3);
  const col = new Float32Array(n * 3 * 3);
  const bottom = base - 120;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * step;
    const hN = ridge(style, x, ph);
    const y = base + hN * height;
    const slope = ((ridge(style, x + 0.5, ph) - ridge(style, x - 0.5, ph)) * height) / 1;
    const rows: Array<[number, number, number, number]> = [
      [y, z - 3, 0.45 + 0.55 * Math.min(1, hN + 0.3), 1],
      [base + hN * height * 0.45, z, 0.75, 0.62],
      [bottom, z, 0.35, 0.4],
    ];
    rows.forEach(([ry, rz, up, shade], k) => {
      const o = (i * 3 + k) * 3;
      pos[o] = x;
      pos[o + 1] = ry;
      pos[o + 2] = rz;
      const l = Math.hypot(slope * 0.5, up, 1);
      nrm[o] = (-slope * 0.5) / l;
      nrm[o + 1] = up / l;
      nrm[o + 2] = 1 / l;
      col[o] = col[o + 1] = col[o + 2] = shade;
    });
  }
  const idx: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < 2; k++) {
      const a = i * 3 + k;
      const b = (i + 1) * 3 + k;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('normal', new BufferAttribute(nrm, 3));
  geo.setAttribute('color', new BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  mat.vertexColors = true;
  if (style !== 'clouds') g.add(new Mesh(geo, mat));
  else geo.dispose();

  // 3D shapes on top of the ridge.
  const shapes = (geom: BufferGeometry, m: MeshStandardMaterial | MeshBasicMaterial, count: number, place: (i: number) => [number, number, number, number, number]) => {
    const im = new InstancedMesh(geom, m, count);
    for (let i = 0; i < count; i++) {
      const [x, y, sx, sy, rot] = place(i);
      tmpQ.setFromAxisAngle(tmpP.set(0, 1, 0), rot);
      tmpM.compose(tmpP.set(x, y, z - 1.5 - rng.range(0, 4)), tmpQ, tmpS.set(sx, sy, sx));
      im.setMatrixAt(i, tmpM);
    }
    im.computeBoundingSphere();
    g.add(im);
  };
  const span = x1 - x0;
  const yAt = (x: number) => base + ridge(style, x, ph) * height;
  if (style === 'spires' || style === 'crystals') {
    const count = Math.round(span / (height > 20 ? 14 : 7));
    const light = new Color(color).lerp(new Color('#ffffff'), 0.18);
    const m2 = style === 'crystals'
      ? new MeshStandardMaterial({ color, roughness: 0.25, flatShading: true, emissive: new Color(color).multiplyScalar(0.55) })
      : new MeshStandardMaterial({ color: light, roughness: 0.6, flatShading: true, emissive: light.clone().multiplyScalar(th.stars ? 0.35 : 0.2) });
    shapes(new ConeGeometry(1, 1, style === 'crystals' ? 5 : 6, 1), m2, count, (i) => {
      const x = x0 + (i + rng.range(0.1, 0.9)) * (span / count);
      const hh = height * (style === 'crystals' ? rng.range(0.5, 1.3) : rng.range(0.35, 0.95));
      return [x, yAt(x) + hh * 0.5 - 1, hh * (style === 'crystals' ? rng.range(0.1, 0.18) : rng.range(0.16, 0.26)), hh, rng.range(0, 6)];
    });
  } else if (style === 'towers') {
    const count = Math.round(span / (height > 20 ? 18 : 9));
    shapes(new CylinderGeometry(0.7, 1, 1, 8, 1), mat, count, (i) => {
      const x = x0 + (i + rng.range(0.1, 0.9)) * (span / count);
      const hh = height * rng.range(0.5, 1.2);
      return [x, yAt(x) + hh * 0.5 - 1, hh * 0.12, hh, 0];
    });
    const lights = new MeshBasicMaterial({ color: new Color(zeph ? '#ffb0ea' : '#ffe066').multiplyScalar(2.2), fog: true });
    shapes(new SphereGeometry(1, 10, 8), lights, Math.round(span / (height > 20 ? 18 : 9)), (i) => {
      const cnt = Math.round(span / (height > 20 ? 18 : 9));
      const x = x0 + (i + 0.5) * (span / cnt);
      return [x, yAt(x) + height * rng.range(0.4, 0.9), height * 0.03, height * 0.03, 0];
    });
  } else if (style === 'domes') {
    const count = Math.round(span / (height > 20 ? 22 : 11));
    const dm = new MeshStandardMaterial({ color: new Color(color).lerp(new Color('#ffffff'), 0.35), roughness: 0.2, metalness: 0.1, emissive: new Color(color).multiplyScalar(0.3), envMapIntensity: 2 });
    shapes(new SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), dm, count, (i) => {
      const x = x0 + (i + rng.range(0.1, 0.9)) * (span / count);
      const r = height * rng.range(0.25, 0.5);
      return [x, yAt(x) - 0.5, r, r * 0.8, 0];
    });
  } else if (style === 'clouds') {
    const cm = new MeshStandardMaterial({ color, roughness: 1, emissive: new Color(color).multiplyScalar(0.45) });
    const count = Math.round(span / (height > 20 ? 7 : 4));
    shapes(new SphereGeometry(1, 16, 12), cm, count, (i) => {
      const x = x0 + (i + rng.range(0, 1)) * (span / count);
      const r = height * rng.range(0.12, 0.3);
      return [x, base + height * rng.range(-0.3, 0.35), r * 1.6, r, 0];
    });
  } else if (style === 'volcano') {
    const vx = x0 + span * rng.range(0.35, 0.6);
    const cone = new Mesh(new CylinderGeometry(height * 0.12, height * 0.95, height * 1.25, 28, 1, true), mat);
    cone.position.set(vx, base + height * 0.25, z - 6);
    g.add(cone);
    const glow = new Mesh(new SphereGeometry(height * 0.13, 16, 8), new MeshBasicMaterial({ color: new Color('#ff8a3d').multiplyScalar(2), fog: true }));
    glow.scale.y = 0.25;
    glow.position.set(vx, base + height * 0.87, z - 6);
    g.add(glow);
  }
  return g;
}

/**
 * The sky over an exploration world (and the landing site): a gradient dome or, on airless worlds,
 * the real starry sky with a glow at the horizon; the theme's neighbor in the sky (Earth over the
 * Moon, Jupiter over Europa...) as a real 3D planet; and two layers of distant scenery.
 * `group` follows the camera; `scenery` stays put so it parallaxes naturally.
 */
export class SurfaceSky {
  readonly group = new Group();
  readonly scenery = new Group();
  readonly planet: PlanetView | null = null;
  private readonly space: SpaceSky | null = null;
  private readonly slot: { x: number; y: number; size: number } | null = null;
  private readonly planetSun = new Vector3();
  private readonly tmp = new Vector3();

  constructor(world: Scene, th: Theme, light: SurfaceLight, o: { renderer: WebGLRenderer; profile: QualityProfile; pixelRatio: number; x0: number; x1: number; seed: number; heightBoost?: number; layerZ?: [number, number] }) {
    const zeph = isZephyra(th);
    if (light.space) {
      const base = zeph ? SKIES.zephyra : SKIES.space;
      // Same nebula bake as space flight (cached by key); the sun quads are not shown on the ground.
      this.space = new SpaceSky(o.renderer, { ...base, sun: null, sun2: null }, { skySize: o.profile.skySize, octaves: o.profile.octaves, stars: Math.round(o.profile.stars * 0.7), pixelRatio: o.pixelRatio });
      world.background = this.space.background;
      this.group.add(this.space.group);
    } else world.background = new Color(th.sky[1]);
    const boost = th.stars ? 1 : 1.2;
    const dome = new Mesh(
      new SphereGeometry(800, 32, 16),
      new ShaderMaterial({
        uniforms: {
          uTop: { value: new Color(th.sky[0]).multiplyScalar(boost) },
          uBottom: { value: new Color(th.sky[1]).multiplyScalar(boost) },
          uHaze: { value: new Color(th.haze ?? th.sky[1]).multiplyScalar(boost) },
          uHazeAmt: { value: th.haze ? 0.55 : 0.15 },
          uSunDir: { value: light.sunDir },
          uSunCol: { value: new Color(light.sunColor) },
          uSpace: { value: light.space ? 1 : 0 },
        },
        vertexShader: DOME_VERT,
        fragmentShader: DOME_FRAG,
        side: BackSide,
        depthWrite: false,
        transparent: light.space,
      }),
    );
    dome.renderOrder = -12;
    dome.frustumCulled = false;
    this.group.add(dome);
    world.add(this.group);
    if (th.skyPlanet) {
      this.slot = th.skyPlanet;
      const p = createPlanet(th.skyPlanet.body, 1, { renderer: o.renderer, profile: o.profile, detail: 'normal', halo: true });
      this.planet = p;
      this.group.add(p.group);
      // Lit from the side so the planet shows a lovely half-lit globe.
      this.planetSun.set(th.skyPlanet.x > 0.5 ? -0.85 : 0.85, 0.35, 0.5).normalize();
      if (th.skyPlanet.body === 'sun') this.planetSun.set(0, 0, 1);
    }
    const lift = o.heightBoost ?? 0;
    const [midZ, farZ] = o.layerZ ?? [-44, -118];
    this.scenery.add(
      sceneryLayer(th.farStyle, th.far, farZ, o.x0 - 150, o.x1 + 150, 26 * (farZ / -118), 2 + lift * 0.5, o.seed * 7 + 11, th),
      sceneryLayer(th.midStyle, th.mid, midZ, o.x0 - 60, o.x1 + 60, 9 * Math.sqrt(midZ / -44), 1.5 + lift * 0.25, o.seed * 13 + 23, th),
    );
    world.add(this.scenery);
  }

  setPixelRatio(pr: number): void {
    this.space?.setPixelRatio(pr);
  }

  /** Keep the sky centered on the camera and the sky planet at its spot on screen. */
  update(time: number, camera: PerspectiveCamera): void {
    this.group.position.copy(camera.position);
    this.space?.update(time);
    const p = this.planet;
    if (p && this.slot) {
      const L = 600;
      const tanH = Math.tan((camera.fov * Math.PI) / 360);
      const nx = this.slot.x * 2 - 1;
      const ny = 1 - this.slot.y * 2;
      this.tmp.set(nx * tanH * camera.aspect * L, ny * tanH * L, -L).applyQuaternion(camera.quaternion);
      p.group.position.copy(this.tmp);
      p.group.scale.setScalar((this.slot.size / 720) * 1.15 * tanH * L);
      p.update(time, this.planetSun);
    }
  }
}
