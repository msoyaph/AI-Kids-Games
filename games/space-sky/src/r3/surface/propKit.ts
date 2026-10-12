import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  CanvasTexture,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Shape,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Curve,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Material,
  type Object3D,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Rng } from '../../core/rng';
import { markShared } from '../dispose';

/**
 * Building kit for the surface props (exploration levels and landing). Props are drawn from a few
 * vertex-colored materials (paint, matte, metal, gem, ice, glow), so every static part that shares a
 * material merges into one cached geometry: a prop is usually 2-4 draw calls.
 */

/** Anything animated: update(dt, time) is called every rendered frame while visible. */
export interface Prop {
  readonly group: Group;
  update?(dt: number, time: number): void;
}

export const INK = '#20124d';

// ------------------------------------------------------------------ materials

const mats = new Map<string, Material>();
function sharedMat<T extends Material>(key: string, make: () => T): T {
  let m = mats.get(key) as T | undefined;
  if (!m) {
    m = markShared(make());
    mats.set(key, m);
  }
  return m;
}

/** Shared vertex-colored materials. Glow colors are stored above 1 in the vertex colors so they bloom. */
export const M = {
  paint: () => sharedMat('paint', () => new MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.04, envMapIntensity: 1.3 })),
  matte: () => sharedMat('matte', () => new MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0, envMapIntensity: 0.8 })),
  metal: () => sharedMat('metal', () => new MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.85, envMapIntensity: 2 })),
  gem: () => sharedMat('gem', () => new MeshStandardMaterial({ vertexColors: true, roughness: 0.14, metalness: 0.1, flatShading: true, envMapIntensity: 2.6, emissive: new Color('#2a1850'), emissiveIntensity: 1 })),
  ice: () => sharedMat('ice', () => new MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.05, flatShading: true, envMapIntensity: 2.8, emissive: new Color('#1d4a6a'), emissiveIntensity: 1 })),
  rock: () => sharedMat('rockflat', () => new MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, flatShading: true, envMapIntensity: 0.9 })),
  glow: () => sharedMat('glow', () => new MeshBasicMaterial({ vertexColors: true })),
  /** What glow parts look like while switched off: plain colored plastic. */
  glowOff: () => sharedMat('glowOff', () => new MeshStandardMaterial({ vertexColors: true, color: new Color(0.14, 0.14, 0.16), roughness: 0.3, metalness: 0, envMapIntensity: 1.6 })),
  /** Glassy see-through bubble (power orb shell). */
  bubble: () => sharedMat('bubble', () => new MeshStandardMaterial({ color: '#8fe8ff', transparent: true, opacity: 0.3, roughness: 0.04, metalness: 0.1, envMapIntensity: 3, depthWrite: false, emissive: new Color('#1a7aa0'), emissiveIntensity: 0.7 })),
  /** Soft see-through white (steam, cloud wisps). */
  mist: () => sharedMat('mist', () => new MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0.55, depthWrite: false, envMapIntensity: 0.5, emissive: new Color('#8a90b0') })),
};

/** A per-prop glow material (for pulsing): vertex colors times `.color`. Freed with the prop. */
export function ownGlow(): MeshBasicMaterial {
  return new MeshBasicMaterial({ vertexColors: true });
}

/** Faceted, glossy and glowing from inside in its own vertex colors (magic crystals). */
export function gemGlowMat(ei = 0.6, own = false): MeshStandardMaterial {
  const make = () => {
    const m = new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.12, metalness: 0.1, envMapIntensity: 2.4, emissive: new Color(1, 1, 1), emissiveIntensity: ei });
    m.onBeforeCompile = (s) => {
      s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance *= vColor.rgb;');
    };
    m.customProgramCacheKey = () => 'vcEmissive';
    return m;
  };
  return own ? make() : sharedMat(`gemGlow:${ei}`, make);
}

/** Plain solid-color materials, cached. */
export function solid(color: string, rough = 0.45, metal = 0.05, emissive?: string, ei = 1): MeshStandardMaterial {
  return sharedMat(`solid:${color}:${rough}:${metal}:${emissive ?? ''}:${ei}`, () =>
    new MeshStandardMaterial({ color, roughness: rough, metalness: metal, envMapIntensity: metal > 0.5 ? 2 : 1.3, emissive: emissive ? new Color(emissive) : new Color(0), emissiveIntensity: ei }),
  );
}

export function glowColor(color: string, power = 2.2): MeshBasicMaterial {
  return sharedMat(`glowc:${color}:${power}`, () => new MeshBasicMaterial({ color: new Color(color).multiplyScalar(power) }));
}

/** Linear color times `p` (vertex colors above 1 bloom on the glow material). */
export function hot(c: string, p = 2.2): Color {
  return new Color(c).multiplyScalar(p);
}

// ------------------------------------------------------------------ halo sprites

let haloTex: CanvasTexture | null = null;
function haloTexture(): CanvasTexture {
  if (!haloTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.3, 'rgba(255,255,255,0.62)');
    r.addColorStop(0.65, 'rgba(255,255,255,0.2)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    haloTex = markShared(new CanvasTexture(c));
    haloTex.colorSpace = SRGBColorSpace;
  }
  return haloTex;
}

/** A soft additive glow behind something bright (reads as glow even on Low tier without bloom). */
export function halo(color: string, size: number, opacity = 0.5, own = false): Sprite {
  const make = () => new SpriteMaterial({ map: haloTexture(), color, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false });
  const s = new Sprite(own ? make() : sharedMat(`halo:${color}:${opacity}`, make));
  markShared(s.geometry);
  s.scale.setScalar(size);
  s.renderOrder = 3;
  return s;
}

// ------------------------------------------------------------------ geometry primitives (fresh, consumed by a Kit)

export const rbox = (w: number, h: number, d: number, r = 0.06, seg = 2): BufferGeometry =>
  new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
/** Plain box (12 triangles) for thin trims and stripes. */
export const box = (w: number, h: number, d: number): BufferGeometry => new BoxGeometry(w, h, d);
export const cyl = (rt: number, rb: number, h: number, seg = 20): BufferGeometry => new CylinderGeometry(rt, rb, h, seg);
export const cone = (r: number, h: number, seg = 16): BufferGeometry => new ConeGeometry(r, h, seg);
export const tor = (R: number, r: number, rs = 8, ts = 28, arc = Math.PI * 2): BufferGeometry => new TorusGeometry(R, r, rs, ts, arc);
export const caps = (r: number, len: number, cs = 4, rs = 12): BufferGeometry => new CapsuleGeometry(r, len, cs, rs);

export function sph(rx: number, ry = rx, rz = rx, ws = 20, hs = 14): BufferGeometry {
  return new SphereGeometry(1, ws, hs).scale(rx, ry, rz);
}

/** Upper half sphere (dome), base at y = 0. */
export function dome(rx: number, ry = rx, rz = rx, ws = 24, hs = 8): BufferGeometry {
  return new SphereGeometry(1, ws, hs, 0, Math.PI * 2, 0, Math.PI / 2).scale(rx, ry, rz);
}

export function lath(points: Array<[number, number]>, seg = 24): BufferGeometry {
  return new LatheGeometry(points.map(([r, y]) => new Vector2(Math.max(0.002, r), y)), seg);
}

/** A shape extruded along z, centered on z = 0. */
export function ext(shape: Shape, depth: number, bevel = 0.03, curve = 8): BufferGeometry {
  const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: curve });
  g.translate(0, 0, -depth / 2);
  return g;
}

export function starShape(outer: number, inner: number, points = 5): Shape {
  const s = new Shape();
  for (let i = 0; i <= points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? inner : outer;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}

/** Puffy star (rounded points), centered. */
export function star(outer: number, depth: number, inner = outer * 0.48, bevel = outer * 0.12): BufferGeometry {
  return ext(starShape(outer - bevel, inner - bevel * 0.4), depth, bevel, 4);
}

export function roundRectShape(w: number, h: number, r: number): Shape {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Chevron pointing up (for jump pads), centered. */
export function chevronShape(w: number, h: number, t: number): Shape {
  const s = new Shape();
  s.moveTo(-w / 2, -h / 2);
  s.lineTo(0, h / 2 - t);
  s.lineTo(w / 2, -h / 2);
  s.lineTo(w / 2, -h / 2 + t);
  s.lineTo(0, h / 2);
  s.lineTo(-w / 2, -h / 2 + t);
  s.closePath();
  return s;
}

/**
 * A lumpy rock: an icosphere pushed in and out by smooth seeded waves (cracks can't happen because
 * the push only depends on direction), flat-ish bottom. Smooth normals unless the material is flat-shaded.
 */
export function rock(seed: number, rx: number, ry: number, rz: number, detail = 2, amp = 0.16, flatBottom = true, taper = 0, cuts = 0): BufferGeometry {
  const rng = new Rng(seed);
  const ph = [rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28)];
  const f = rng.range(1.6, 2.4);
  // Chisel planes (stylized cut facets), mostly facing up and sideways.
  const planes: number[] = [];
  for (let i = 0; i < cuts; i++) {
    const a = rng.range(0, Math.PI * 2);
    const up = rng.range(0.15, 0.85);
    const h = Math.sqrt(1 - up * up);
    planes.push(Math.cos(a) * h, up, Math.sin(a) * h, rng.range(0.7, 0.86));
  }
  let g: BufferGeometry = new IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i);
    let y = p.getY(i);
    let z = p.getZ(i);
    const n =
      Math.sin(x * f + ph[0]) * Math.sin(y * f * 1.2 + ph[1]) * 0.6 +
      Math.sin(z * f * 1.4 + ph[2]) * Math.sin(x * f * 0.8 + ph[3]) * 0.5 +
      Math.sin((x + y + z) * f * 2.1 + ph[4]) * 0.22 +
      Math.sin(x * f * 3.3 + ph[5]) * Math.sin(z * f * 2.9 + ph[1]) * 0.18;
    const s = 1 + amp * n;
    x *= s;
    y *= s;
    z *= s;
    for (let k = 0; k < planes.length; k += 4) {
      const t = x * planes[k] + y * planes[k + 1] + z * planes[k + 2] - planes[k + 3];
      if (t > 0) {
        x -= planes[k] * t;
        y -= planes[k + 1] * t;
        z -= planes[k + 2] * t;
      }
    }
    const tp = 1 - taper * (p.getY(i) + 1) * 0.5;
    if (flatBottom && y < -0.35) y = -0.35 + (y + 0.35) * 0.25;
    p.setXYZ(i, x * rx * tp, y * ry, z * rz * tp);
  }
  g.computeVertexNormals();
  return g;
}

/** A shallow dish (paraboloid shell), concave side up, rim at y = depth. */
export function dishGeo(R: number, depth: number, t = 0.03, seg = 20): BufferGeometry {
  const pts: Array<[number, number]> = [];
  const n = 4;
  for (let i = 0; i <= n; i++) pts.push([(i / n) * R, (i / n) ** 2 * depth - t]);
  for (let i = n; i >= 0; i--) pts.push([(i / n) * R, (i / n) ** 2 * depth]);
  return lath(pts, seg);
}

class Helix extends Curve<Vector3> {
  constructor(
    private readonly r0: number,
    private readonly r1: number,
    private readonly h: number,
    private readonly turns: number,
  ) {
    super();
  }

  override getPoint(t: number, target = new Vector3()): Vector3 {
    const a = t * this.turns * Math.PI * 2;
    const r = this.r0 + (this.r1 - this.r0) * t;
    return target.set(Math.cos(a) * r, -t * this.h, Math.sin(a) * r);
  }
}

/** A thread spiralling down from y = 0 to -h while its radius goes r0 → r1 (drill bits, springs). */
export function helix(r0: number, r1: number, h: number, turns: number, tube: number): BufferGeometry {
  return new TubeGeometry(new Helix(r0, r1, h, turns), Math.round(turns * 20), tube, 5, false);
}

/** Crystal prism: hexagonal column with a pointed top (and a short point at the bottom). */
export function prism(r: number, h: number, sides = 6, tip = 0.32): BufferGeometry {
  return lath([[0, -0.02], [r * 0.85, 0.04], [r, h * 0.12], [r, h * (1 - tip)], [r * 0.06, h], [0, h]], sides);
}

// ------------------------------------------------------------------ merging kit

type Col = string | Color;
const _m = new Matrix4();
const _e = new Euler();
const _c = new Color();
const _c2 = new Color();

function prep(g: BufferGeometry): BufferGeometry {
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
  const n = g.attributes.position.count;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new BufferAttribute(new Float32Array(n * 2), 2));
  if (!g.index) {
    const idx = n > 65535 ? new Uint32Array(n) : new Uint16Array(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    g.setIndex(new BufferAttribute(idx, 1));
  }
  g.morphAttributes = {};
  g.clearGroups();
  return g;
}

/** Collects parts per material; `finish` merges each material's parts into one geometry. */
export class Kit {
  private readonly lists = new Map<Material, BufferGeometry[]>();

  /** Add a part: rotated (x, y, z order) then moved. */
  add(m: Material, g: BufferGeometry, c: Col, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): BufferGeometry {
    prep(g);
    if (rx || ry || rz) g.applyMatrix4(_m.makeRotationFromEuler(_e.set(rx, ry, rz)));
    if (x || y || z) g.translate(x, y, z);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    if (typeof c === 'string') _c.set(c);
    else _c.copy(c);
    for (let i = 0; i < n; i++) {
      col[i * 3] = _c.r;
      col[i * 3 + 1] = _c.g;
      col[i * 3 + 2] = _c.b;
    }
    g.setAttribute('color', new BufferAttribute(col, 3));
    let list = this.lists.get(m);
    if (!list) this.lists.set(m, (list = []));
    list.push(g);
    return g;
  }

  /** Vertical color gradient (c0 at y0, c1 at y1, final coordinates) over an already added part. */
  grad(g: BufferGeometry, c0: Col, c1: Col, y0: number, y1: number): void {
    const a = typeof c0 === 'string' ? new Color(c0) : c0;
    const b = typeof c1 === 'string' ? new Color(c1) : c1;
    const p = g.attributes.position;
    const col = g.attributes.color;
    for (let i = 0; i < p.count; i++) {
      const t = Math.min(1, Math.max(0, (p.getY(i) - y0) / (y1 - y0 || 1)));
      _c2.copy(a).lerp(b, t);
      col.setXYZ(i, _c2.r, _c2.g, _c2.b);
    }
  }

  /**
   * Darken crevices and lighten bumps of a lumpy part (soft fake occlusion): compares each vertex's
   * distance from the part's center (cx, cy, cz) with its nominal ellipsoid radii.
   */
  cavity(g: BufferGeometry, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, amt = 2.5): void {
    const p = g.attributes.position;
    const col = g.attributes.color;
    for (let i = 0; i < p.count; i++) {
      const dx = (p.getX(i) - cx) / rx;
      const dy = (p.getY(i) - cy) / ry;
      const dz = (p.getZ(i) - cz) / rz;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const f = Math.min(1.2, Math.max(0.6, 1 + (d - 1) * amt));
      col.setXYZ(i, col.getX(i) * f, col.getY(i) * f, col.getZ(i) * f);
    }
  }

  paint(g: BufferGeometry, c: Col, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): BufferGeometry {
    return this.add(M.paint(), g, c, x, y, z, rx, ry, rz);
  }
  matte(g: BufferGeometry, c: Col, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): BufferGeometry {
    return this.add(M.matte(), g, c, x, y, z, rx, ry, rz);
  }
  metal(g: BufferGeometry, c: Col, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): BufferGeometry {
    return this.add(M.metal(), g, c, x, y, z, rx, ry, rz);
  }
  /** Glowing part: a string color is boosted ×2.2 so it blooms. */
  glow(g: BufferGeometry, c: Col, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): BufferGeometry {
    return this.add(M.glow(), g, typeof c === 'string' ? hot(c) : c, x, y, z, rx, ry, rz);
  }

  finish(): Array<[Material, BufferGeometry]> {
    const out: Array<[Material, BufferGeometry]> = [];
    for (const [m, list] of this.lists) {
      const merged = list.length === 1 ? list[0] : mergeGeometries(list, false);
      if (!merged) throw new Error('prop merge failed');
      merged.computeBoundingSphere();
      merged.computeBoundingBox();
      out.push([m, markShared(merged)]);
    }
    return out;
  }
}

const baked = new Map<string, Array<[Material, BufferGeometry]>>();

/** A group of meshes (one per material) from a cached merged build. */
export function bake(key: string, make: (k: Kit) => void): Group {
  let parts = baked.get(key);
  if (!parts) {
    const k = new Kit();
    make(k);
    parts = k.finish();
    baked.set(key, parts);
  }
  const g = new Group();
  for (const [m, geo] of parts) {
    const o = new Mesh(geo, m);
    o.castShadow = !(m as MeshBasicMaterial).isMeshBasicMaterial && !m.transparent;
    g.add(o);
  }
  return g;
}

/** Give the meshes of a baked group drawn with `from` their own material `to` (never bake own materials). */
export function swapMat(g: Object3D, from: Material, to: Material): void {
  g.traverse((o) => {
    const m = o as Mesh;
    if (m.isMesh && m.material === from) m.material = to;
  });
}

/** The merged geometry of a single-material build (for instancing). */
export function bakeGeo(key: string, make: (k: Kit) => void): BufferGeometry {
  return (bake(key, make).children[0] as Mesh).geometry;
}

/** The mesh in `g` drawn with material `m` (or null). */
export function meshWith(g: Object3D, m: Material): Mesh | null {
  for (const c of g.children) if ((c as Mesh).isMesh && (c as Mesh).material === m) return c as Mesh;
  return null;
}

/** Wrap `inner` in a fresh group (the lead owns `group`'s transform; animations move `inner`). */
export function wrap(inner: Object3D): Group {
  const g = new Group();
  g.add(inner);
  return g;
}

export function rngFor(seed: number, salt: string): Rng {
  return new Rng(`${salt}:${seed}`);
}

/** Lighten (amt > 0) or darken (amt < 0) toward white/black. */
export function tint(hex: string, amt: number): Color {
  const c = new Color(hex);
  return amt >= 0 ? c.lerp(_c.setRGB(1, 1, 1), amt) : c.multiplyScalar(1 + amt);
}

/** Vertex count sanity for the gallery overlay: triangles drawn by `root`. */
export function triangles(root: Object3D): number {
  let n = 0;
  root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh || !m.geometry) return;
    const g = m.geometry;
    const tris = (g.index ? g.index.count : g.attributes.position.count) / 3;
    const inst = (o as unknown as { count?: number; isInstancedMesh?: boolean }).isInstancedMesh ? (o as unknown as { count: number }).count : 1;
    n += tris * inst;
  });
  return Math.round(n);
}
