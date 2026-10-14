// Helpers for composing low-poly vertex-coloured geometry from primitives.
// Adapted from Light Crossing (games/light-crossing/src/render/models/geo.ts).
import * as THREE from 'three';

export interface PartOpts {
  pos?: [number, number, number];
  rot?: [number, number, number];
  scale?: [number, number, number] | number;
}

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const s = new THREE.Vector3();
const col = new THREE.Color();

/** Transform + colour a primitive, returning a non-indexed geometry with position/normal/color. */
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
  const n = g.getAttribute('position').count;
  const c = new Float32Array(n * 3);
  col.setHex(color);
  for (let i = 0; i < n; i++) {
    c[i * 3] = col.r;
    c[i * 3 + 1] = col.g;
    c[i * 3 + 2] = col.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  geo.dispose();
  return g;
}

/** Concatenate non-indexed part geometries. */
export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let total = 0;
  for (const p of parts) total += p.getAttribute('position').count;
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const colr = new Float32Array(total * 3);
  let off = 0;
  for (const p of parts) {
    pos.set(p.getAttribute('position').array as Float32Array, off * 3);
    nor.set(p.getAttribute('normal').array as Float32Array, off * 3);
    colr.set(p.getAttribute('color').array as Float32Array, off * 3);
    off += p.getAttribute('position').count;
    p.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  g.computeBoundingSphere();
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
