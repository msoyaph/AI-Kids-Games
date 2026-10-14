// A small kit for building models in code: primitive shapes, each painted one colour (as vertex
// colours) and placed with a position, rotation and scale, merged into one geometry per part.
// Every model is built once per level; nothing here runs per frame.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type Vec3 = readonly [number, number, number];

export interface Piece {
  geo: THREE.BufferGeometry;
  color: number | ((x: number, y: number, z: number) => number);
  at?: Vec3;
  rot?: Vec3;
  scale?: Vec3 | number;
  /** Drawn with an outline (default true); pupils, highlights and mouths go without. */
  outline?: boolean;
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
  return buildOutlined(pieces, 0).geo;
}

/**
 * Merges painted pieces into one geometry, plus its outline hull: each outlined piece pushed out
 * `thickness` along smoothed normals (so boxes don't crack at their corners), drawn back-faces only
 * in the outline colour. Thickness is in the model's units.
 */
export function buildOutlined(pieces: readonly Piece[], thickness: number): { geo: THREE.BufferGeometry; hull: THREE.BufferGeometry | null } {
  const hulls: THREE.BufferGeometry[] = [];
  const parts = pieces.map(piece => {
    const g = prepare(piece);
    if (thickness > 0 && piece.outline !== false) {
      const shell = new THREE.BufferGeometry();
      shell.setAttribute('position', g.attributes.position!.clone());
      const welded = mergeVertices(shell, 1e-4);
      welded.computeVertexNormals();
      const pos = welded.attributes.position!, nrm = welded.attributes.normal!;
      for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) + nrm.getX(i) * thickness, pos.getY(i) + nrm.getY(i) * thickness, pos.getZ(i) + nrm.getZ(i) * thickness);
      const flat = welded.toNonIndexed();
      flat.deleteAttribute('normal');
      flat.computeVertexNormals();
      hulls.push(flat);
      shell.dispose(); welded.dispose();
    }
    return g;
  });
  const geo = mergeGeometries(parts, false)!;
  for (const g of parts) g.dispose();
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  const hull = hulls.length ? mergeGeometries(hulls, false) : null;
  for (const g of hulls) g.dispose();
  return { geo, hull };
}

// Shapes, sized in world units (a tile is 1 wide). Low segment counts keep the triangle budget small;
// toon shading makes them read as soft and round.
export const ball = (r: number, ws = 12, hs = 9) => new THREE.SphereGeometry(r, ws, hs);
/** The lower half of a ball (a bowl): open mouths. */
export const bowl = (r: number, ws = 12, hs = 6) => new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
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

/**
 * A big, expressive face pointing toward +z, centred at `at`: round white eyes with big pupils and a
 * glint, an open smile with a tongue, and rosy cheeks. Readable from across the garden. `mood`
 * changes the mouth: 'happy' (open smile), 'grin' (wide closed smile), 'brave' (small smile, brows).
 */
export function bigFace(at: Vec3, size = 1, mood: 'happy' | 'grin' | 'brave' = 'happy', eyeGap = 1): Piece[] {
  const [x, y, z] = at, s = size;
  const ex = 0.088 * s * eyeGap, er = 0.078 * s;
  const pieces: Piece[] = [];
  for (const side of [-1, 1]) {
    pieces.push({ geo: ball(er, 14, 10), color: 0xffffff, at: [x + side * ex, y, z], scale: [1, 1.12, 0.55] });
    pieces.push({ geo: ball(er * 0.58, 10, 8), color: 0x1d1410, at: [x + side * ex + side * -0.006 * s, y - 0.006 * s, z + er * 0.42], scale: [1, 1.1, 0.5], outline: false });
    pieces.push({ geo: ball(er * 0.2, 6, 4), color: 0xffffff, at: [x + side * ex - 0.02 * s, y + 0.026 * s, z + er * 0.62], outline: false });
    pieces.push({ geo: ball(0.036 * s, 8, 6), color: 0xff9db0, at: [x + side * (ex + 0.055 * s), y - 0.085 * s, z - 0.004 * s], scale: [1.3, 0.8, 0.35], outline: false });
    if (mood === 'brave') pieces.push({ geo: capsule(0.014 * s, 0.07 * s, 2, 6), color: 0x2a1a12, at: [x + side * ex, y + er * 1.32, z + 0.01 * s], rot: [0, 0, Math.PI / 2 + side * 0.32], outline: false });
  }
  if (mood === 'happy') {
    pieces.push({ geo: bowl(0.062 * s, 12, 6), color: 0x7a1f24, at: [x, y - 0.1 * s, z + 0.005 * s], scale: [1.25, 0.95, 0.45], outline: false });
    pieces.push({ geo: ball(0.034 * s, 8, 6), color: 0xff7b8a, at: [x, y - 0.135 * s, z + 0.018 * s], scale: [1.4, 0.7, 0.5], outline: false });
  } else {
    const wide = mood === 'grin' ? 1.3 : 0.75;
    pieces.push({ geo: torus(0.05 * s * wide, 0.013 * s, 5, 14, Math.PI), color: 0x3a1a14, at: [x, y - 0.075 * s, z + 0.01 * s], rot: [0, 0, Math.PI], outline: false });
  }
  return pieces;
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
