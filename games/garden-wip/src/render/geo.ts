// A small kit for building models in code: primitive shapes, each painted one colour (as vertex
// colours) and placed with a position, rotation and scale, merged into one geometry per part.
// Every model is built once per level; nothing here runs per frame.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type Vec3 = readonly [number, number, number];

export interface Piece {
  geo: THREE.BufferGeometry;
  color: number | ((x: number, y: number, z: number) => number);
  at?: Vec3;
  rot?: Vec3;
  scale?: Vec3 | number;
}

const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
const col = new THREE.Color();

/** One painted, placed piece, ready to merge (non-indexed, position + normal + color only). */
function prepare(piece: Piece): THREE.BufferGeometry {
  let g = piece.geo.index ? piece.geo.toNonIndexed() : piece.geo.clone();
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
  const sc = piece.scale ?? 1;
  s.set(...(typeof sc === 'number' ? [sc, sc, sc] as const : sc));
  e.set(...(piece.rot ?? [0, 0, 0]));
  q.setFromEuler(e);
  p.set(...(piece.at ?? [0, 0, 0]));
  m.compose(p, q, s);
  g.applyMatrix4(m);
  const pos = g.attributes.position!;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const hex = typeof piece.color === 'number' ? piece.color : piece.color(pos.getX(i), pos.getY(i), pos.getZ(i));
    col.setHex(hex, THREE.SRGBColorSpace);
    colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  if (g !== piece.geo) piece.geo.dispose();
  return g;
}

/** Merges painted pieces into one geometry. */
export function build(pieces: readonly Piece[]): THREE.BufferGeometry {
  const parts = pieces.map(prepare);
  const merged = mergeGeometries(parts, false)!;
  for (const g of parts) g.dispose();
  merged.computeBoundingSphere();
  return merged;
}

// Shapes, sized in world units (a tile is 1 wide). Low segment counts keep the triangle budget small;
// toon shading makes them read as soft and round.
export const ball = (r: number, ws = 12, hs = 9) => new THREE.SphereGeometry(r, ws, hs);
export const capsule = (r: number, len: number, cap = 4, radial = 10) => new THREE.CapsuleGeometry(r, len, cap, radial);
export const cyl = (rt: number, rb: number, h: number, radial = 10) => new THREE.CylinderGeometry(rt, rb, h, radial);
export const cone = (r: number, h: number, radial = 10) => new THREE.ConeGeometry(r, h, radial);
export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
export const torus = (r: number, tube: number, radial = 6, tubular = 16, arc = Math.PI * 2) => new THREE.TorusGeometry(r, tube, radial, tubular, arc);
export const disc = (r: number, seg = 16) => new THREE.CircleGeometry(r, seg).rotateX(-Math.PI / 2);

/** A soft rounded block (a sphere pushed out toward a box): topiary and pebbles. */
export function softBox(w: number, h: number, d: number, round = 0.35, seg = 10): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, seg * 2, seg + 2);
  const pos = g.attributes.position!;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // superellipsoid-ish: flatten the sphere toward a cube, keeping rounded edges
    const k = 1 - round;
    const f = (a: number) => Math.sign(a) * Math.pow(Math.abs(a), 1 - k * 0.85);
    pos.setXYZ(i, f(v.x) * w / 2, f(v.y) * h / 2, f(v.z) * d / 2);
  }
  g.computeVertexNormals();
  return g;
}

/** Two bead eyes and a tiny smile on a face pointing toward +z, centred at `at`. */
export function face(at: Vec3, size = 1, eye = 0x2a1d17): Piece[] {
  const [x, y, z] = at;
  const r = 0.032 * size, gap = 0.07 * size;
  return [
    { geo: ball(r, 8, 6), color: eye, at: [x - gap, y, z] },
    { geo: ball(r, 8, 6), color: eye, at: [x + gap, y, z] },
    { geo: ball(r * 0.35, 6, 4), color: 0xffffff, at: [x - gap + r * 0.35, y + r * 0.4, z + r * 0.8] },
    { geo: ball(r * 0.35, 6, 4), color: 0xffffff, at: [x + gap + r * 0.35, y + r * 0.4, z + r * 0.8] },
    { geo: torus(0.034 * size, 0.008 * size, 4, 10, Math.PI), color: eye, at: [x, y - 0.055 * size, z], rot: [0, 0, Math.PI] },
  ];
}
