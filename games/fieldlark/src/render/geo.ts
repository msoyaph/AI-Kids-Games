// Helpers for composing low-poly vertex-coloured geometry from primitives.
// Adapted from Light Crossing (games/light-crossing/src/render/models/geo.ts). Added here: rounded
// normals for soft blobs (tree canopies, bushes), a painted-pattern id per part (planks, shingles,
// stone… drawn by the shader, see fx.ts), and ambient occlusion baked into the vertex colours.
import * as THREE from 'three';

/** Painted patterns (the shader draws them on the part's surfaces). */
/** Painted patterns (fx.ts). `keep`: never tinted per instance. `glow`: windows and lamps, lit at night. */
export const PAT = { none: 0, planks: 1, boards: 2, shingles: 3, stone: 4, straw: 5, bark: 6, moss: 7, keep: 8, glow: 9 } as const;
// (keep: no pattern, and never tinted by the instance colour; see fx.ts `tint`)

export interface PartOpts {
  pos?: [number, number, number];
  rot?: [number, number, number];
  scale?: [number, number, number] | number;
  /** Soft round shading (normals point out from the part's middle), for leafy blobs. */
  round?: boolean;
  /** A painted pattern from PAT. */
  pattern?: number;
}

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const s = new THREE.Vector3();
const col = new THREE.Color();
const tmp = new THREE.Vector3();

/** Transform + colour a primitive, returning a non-indexed geometry with position/normal/color/pattern. */
export function part(geo: THREE.BufferGeometry, color: number, o: PartOpts = {}): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.deleteAttribute('uv');
  if (g.getAttribute('uv1')) g.deleteAttribute('uv1');
  e.set(...(o.rot ?? [0, 0, 0]));
  q.setFromEuler(e);
  v.set(...(o.pos ?? [0, 0, 0]));
  if (typeof o.scale === 'number') s.set(o.scale, o.scale, o.scale);
  else s.set(...(o.scale ?? [1, 1, 1]));
  m4.compose(v, q, s);
  g.applyMatrix4(m4);
  g.computeVertexNormals();
  const p = g.getAttribute('position');
  const n = p.count;
  if (o.round) {
    const nor = g.getAttribute('normal');
    for (let i = 0; i < n; i++) {
      tmp.set(p.getX(i) - v.x, p.getY(i) - v.y, p.getZ(i) - v.z);
      tmp.set(tmp.x / (s.x * s.x), tmp.y / (s.y * s.y), tmp.z / (s.z * s.z)).normalize();
      nor.setXYZ(i, tmp.x, tmp.y, tmp.z);
    }
  }
  const c = new Float32Array(n * 3);
  col.setHex(color);
  for (let i = 0; i < n; i++) {
    c[i * 3] = col.r;
    c[i * 3 + 1] = col.g;
    c[i * 3 + 2] = col.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.setAttribute('pattern', new THREE.BufferAttribute(new Float32Array(n).fill(o.pattern ?? 0), 1));
  geo.dispose();
  return g;
}

export interface MergeOpts {
  /** Bake ambient occlusion into the colours: darker near the ground and on undersides (default on). */
  ao?: boolean;
}

/** Concatenate non-indexed part geometries. */
export function merge(parts: THREE.BufferGeometry[], o: MergeOpts = {}): THREE.BufferGeometry {
  let total = 0;
  for (const p of parts) total += p.getAttribute('position').count;
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const colr = new Float32Array(total * 3);
  const pat = new Float32Array(total);
  let off = 0;
  for (const p of parts) {
    pos.set(p.getAttribute('position').array as Float32Array, off * 3);
    nor.set(p.getAttribute('normal').array as Float32Array, off * 3);
    colr.set(p.getAttribute('color').array as Float32Array, off * 3);
    const pa = p.getAttribute('pattern');
    if (pa) pat.set(pa.array as Float32Array, off);
    off += p.getAttribute('position').count;
    p.dispose();
  }
  if (o.ao !== false && total) {
    let top = 0;
    for (let i = 0; i < total; i++) top = Math.max(top, pos[i * 3 + 1]!);
    const reach = Math.min(0.4, Math.max(0.08, top * 0.35));
    for (let i = 0; i < total; i++) {
      const y = pos[i * 3 + 1]!, ny = nor[i * 3 + 1]!;
      const t = Math.min(1, Math.max(0, y / reach));
      const k = (0.66 + 0.34 * t * t * (3 - 2 * t)) * (0.84 + 0.16 * (ny * 0.5 + 0.5));
      colr[i * 3] = colr[i * 3]! * k; colr[i * 3 + 1] = colr[i * 3 + 1]! * k; colr[i * 3 + 2] = colr[i * 3 + 2]! * k;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  g.setAttribute('pattern', new THREE.BufferAttribute(pat, 1));
  g.computeBoundingSphere();
  return g;
}

/**
 * A triangular prism (a pitched roof's shape): base `d` deep at y = 0, apex `h` high at z = 0,
 * running `w` along x, centred on the origin.
 */
export function prism(w: number, d: number, h: number): THREE.BufferGeometry {
  const x0 = -w / 2, x1 = w / 2, z0 = -d / 2, z1 = d / 2;
  const A = [x0, 0, z0], B = [x0, 0, z1], C = [x0, h, 0], D = [x1, 0, z0], E = [x1, 0, z1], F = [x1, h, 0];
  const tri = (...p: number[][]) => p.flat();
  const pos = [
    ...tri(A, B, C), ...tri(D, F, E), // gable ends
    ...tri(B, E, F), ...tri(B, F, C), // south slope
    ...tri(A, C, F), ...tri(A, F, D), // north slope
    ...tri(A, D, E), ...tri(A, E, B), // underside
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

/** A box with every edge cut at 45° (a soft, chunky look), `b` the bevel size. */
export function bevelBox(w: number, h: number, d: number, b = 0.03): THREE.BufferGeometry {
  b = Math.min(b, w / 3, h / 3, d / 3);
  const x = w / 2 - b, y = h / 2 - b, c = b * 0.7;
  const shape = new THREE.Shape();
  shape.moveTo(-x + c, -y); shape.lineTo(x - c, -y); shape.lineTo(x, -y + c); shape.lineTo(x, y - c);
  shape.lineTo(x - c, y); shape.lineTo(-x + c, y); shape.lineTo(-x, y - c); shape.lineTo(-x, -y + c); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: d - b * 2, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 1 });
  g.translate(0, 0, -(d - b * 2) / 2);
  return g;
}

// Short primitive constructors (low segment counts: the look is faceted and soft-lit).
export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
export const cyl = (rt: number, rb: number, h: number, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg);
export const cone = (r: number, h: number, seg = 8) => new THREE.ConeGeometry(r, h, seg);
export const ico = (r: number, detail = 0) => new THREE.IcosahedronGeometry(r, detail);
export const dodec = (r: number) => new THREE.DodecahedronGeometry(r, 0);
export const sphere = (r: number, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);
export const torus = (r: number, t: number, rs = 5, ts = 10, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc);
export const oct = (r: number) => new THREE.OctahedronGeometry(r, 0);
