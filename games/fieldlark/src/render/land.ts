/**
 * The land as the renderer sees it, a little bigger than the farm: a ring of countryside all round the
 * 56 × 56 farm (woods and hills, the river running on north and south), round banks wherever there is
 * water, and gentle bumps on the wild ground. The sim never sees any of this; farm tiles keep their
 * flat terrace tops, so taps and placing work exactly as before.
 *
 * One height function serves the ground mesh, the scenery and the grass. One signed distance to the
 * water (negative in the water), computed once from the water tiles with rounded corners, serves the
 * banks here and, uploaded as a texture, the water's depth colour and foam.
 */
import * as THREE from 'three';
import { noise } from '../core/rng';
import { areaAt, H, HOME_POND, POND, RIVER_X0, RIVER_X1, STEP_Y, tileAt, W, type Zone } from '../sim/map';

/** Tiles of countryside drawn around the farm on every side. */
export const RING = 26;
/** The drawn world: x and z from WORLD0 to WORLD0 + SPAN. */
export const WORLD0 = -RING;
export const SPAN = W + 2 * RING;
/** The river bed, under the water's surface. */
export const BED_Y = -0.62;

export interface LandTile { zone: Zone | 'ring'; level: number; water: boolean }

/** Any tile of the drawn world. Outside the farm the land carries on at the level of the nearest edge. */
export function landTile(x: number, z: number): LandTile {
  if (x >= 0 && z >= 0 && x < W && z < H) return tileAt(x, z);
  if (x >= RIVER_X0 && x <= RIVER_X1) return { zone: 'ring', level: -1, water: true };
  const t = tileAt(Math.min(W - 1, Math.max(0, x)), Math.min(H - 1, Math.max(0, z)));
  return { zone: 'ring', level: t.water ? 0 : t.level, water: false };
}

/** How far a point is outside the farm (0 inside). */
export function outside(x: number, z: number) {
  const dx = Math.max(0, -x, x - W), dz = Math.max(0, -z, z - H);
  return Math.hypot(dx, dz);
}

// --- smooth value noise (the GLSL in fx.ts is a different, cheaper one) ---
const smooth = (t: number) => t * t * (3 - 2 * t);
export function vnoise(x: number, z: number, seed: number) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = smooth(x - ix), fz = smooth(z - iz);
  const a = noise(ix, iz, seed), b = noise(ix + 1, iz, seed), c = noise(ix, iz + 1, seed), d = noise(ix + 1, iz + 1, seed);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

/** Rolling hills outside the farm, low near it and along the river's valley. */
export function hill(x: number, z: number): number {
  const d = outside(x, z);
  if (d <= 0) return 0;
  const valley = Math.min(1, Math.max(0, (Math.abs(x - (RIVER_X0 + RIVER_X1 + 1) / 2) - 3.5) / 7));
  const amp = 0.8 + 2.8 * vnoise(x * 0.07, z * 0.07, 91) + 1.2 * vnoise(x * 0.16, z * 0.16, 92);
  const rise = smooth(Math.min(1, Math.max(0, (d - 1.5) / 15)));
  return rise * amp * (0.25 + 0.75 * valley);
}

/** Small bumps on wild ground. */
const bumpAt = (x: number, z: number) => (vnoise(x * 0.45, z * 0.45, 93) - 0.5) * 0.3 + (vnoise(x * 1.1, z * 1.1, 94) - 0.5) * 0.12;

// --- water: a signed distance field with rounded corners ---
/** Texels per tile of the water field. */
const TPT = 4;
const N = SPAN * TPT;
let sdf: Float32Array | null = null;
let sdfTex: THREE.DataTexture | null = null;

/** Felzenszwalb–Huttenlocher squared distance transform of one row or column. */
function dt1(f: Float64Array, n: number, d: Float64Array, v: Int32Array, zz: Float64Array) {
  let k = 0;
  v[0] = 0; zz[0] = -Infinity; zz[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    while (s <= zz[k]!) { k--; s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!); }
    k++; v[k] = q; zz[k] = s; zz[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (zz[k + 1]! < q) k++; d[q] = (q - v[k]!) * (q - v[k]!) + f[v[k]!]!; }
}

/** Distance (in texels) from every texel to the nearest texel where `isFeature`. */
function distance(isFeature: (i: number) => boolean): Float64Array {
  const g = new Float64Array(N * N);
  for (let i = 0; i < N * N; i++) g[i] = isFeature(i) ? 0 : 1e20;
  const f = new Float64Array(N), d = new Float64Array(N), v = new Int32Array(N), zz = new Float64Array(N + 1);
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) f[y] = g[y * N + x]!;
    dt1(f, N, d, v, zz);
    for (let y = 0; y < N; y++) g[y * N + x] = d[y]!;
  }
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) f[x] = g[y * N + x]!;
    dt1(f, N, d, v, zz);
    for (let x = 0; x < N; x++) g[y * N + x] = Math.sqrt(d[x]!);
  }
  return g;
}

/** A box blur of radius 1, in place. */
function blur(a: Float32Array, w: number, h: number) {
  const t = new Float32Array(a.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let k = -1; k <= 1; k++) { const xx = x + k; if (xx >= 0 && xx < w) { s += a[y * w + xx]!; n++; } }
    t[y * w + x] = s / n;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let k = -1; k <= 1; k++) { const yy = y + k; if (yy >= 0 && yy < h) { s += t[yy * w + x]!; n++; } }
    a[y * w + x] = s / n;
  }
}

function buildSdf(): Float32Array {
  // The water at 4 texels a tile: the river's straight banks, and each pond's own oval, kept within a
  // little of its water tiles (so a bank never runs under a tile you can build on). Blurred once and
  // cut at a half for clean, round edges.
  const mask = new Float32Array(N * N);
  const isWater = (x: number, z: number) => landTile(Math.floor(x), Math.floor(z)).water;
  for (let ty = 0; ty < N; ty++) for (let tx = 0; tx < N; tx++) {
    const x = (tx + 0.5) / TPT + WORLD0, z = (ty + 0.5) / TPT + WORLD0;
    const tileX = Math.floor(x), tileZ = Math.floor(z);
    let w = landTile(tileX, tileZ).water && tileX >= RIVER_X0 && tileX <= RIVER_X1;
    if (!w) for (const p of [POND, HOME_POND]) {
      if (((x - p.cx) / p.rx) ** 2 + ((z - p.cz) / p.rz) ** 2 > 1) continue;
      w = isWater(x, z) || isWater(x + 0.3, z) || isWater(x - 0.3, z) || isWater(x, z + 0.3) || isWater(x, z - 0.3);
      if (w) break;
    }
    mask[ty * N + tx] = w ? 1 : 0;
  }
  blur(mask, N, N);
  const inWater = (i: number) => mask[i]! >= 0.5;
  const toWater = distance(inWater), toLand = distance(i => !inWater(i));
  const out = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) out[i] = (inWater(i) ? -(toLand[i]! - 0.5) : toWater[i]! - 0.5) / TPT;
  blur(out, N, N);
  return out;
}

function field(): Float32Array {
  return (sdf ??= buildSdf());
}

/** Signed distance to the nearest water, in tiles (negative in the water). */
export function waterSdf(x: number, z: number): number {
  const f = field();
  const fx = (x - WORLD0) * TPT - 0.5, fz = (z - WORLD0) * TPT - 0.5;
  const ix = Math.min(N - 2, Math.max(0, Math.floor(fx))), iz = Math.min(N - 2, Math.max(0, Math.floor(fz)));
  const ax = Math.min(1, Math.max(0, fx - ix)), az = Math.min(1, Math.max(0, fz - iz));
  const a = f[iz * N + ix]!, b = f[iz * N + ix + 1]!, c = f[(iz + 1) * N + ix]!, d = f[(iz + 1) * N + ix + 1]!;
  return (a * (1 - ax) + b * ax) * (1 - az) + (c * (1 - ax) + d * ax) * az;
}

/** The water field as a texture: red = 128 + 32 × distance (so ±4 tiles), linearly filtered. */
export function waterTexture(): THREE.DataTexture {
  if (sdfTex) return sdfTex;
  const f = field();
  const data = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) data[i] = Math.max(0, Math.min(255, Math.round(128 + f[i]! * 32)));
  sdfTex = new THREE.DataTexture(data, N, N, THREE.RedFormat, THREE.UnsignedByteType);
  sdfTex.magFilter = THREE.LinearFilter;
  sdfTex.minFilter = THREE.LinearFilter;
  sdfTex.wrapS = sdfTex.wrapT = THREE.ClampToEdgeWrapping;
  sdfTex.needsUpdate = true;
  return sdfTex;
}

/** Height of a bank: the land's height at the water's edge and above, down to the bed in the water. */
export function bankY(landY: number, d: number): number {
  const t = Math.min(1, Math.max(0, (d + 0.6) / 0.6));
  return BED_Y + (landY - BED_Y) * smooth(t);
}

// --- heights ---
/** Wild ground (not farm land, not near water, not beside a terrace step) may have bumps. */
const bumpable = new Map<number, boolean>();
function isBumpable(x: number, z: number): boolean {
  const key = (z - WORLD0) * SPAN + (x - WORLD0);
  let b = bumpable.get(key);
  if (b === undefined) {
    const t = landTile(x, z);
    b = !t.water && (t.zone === 'wild' || t.zone === 'ring' || t.zone === 'bank') && waterSdf(x + 0.5, z + 0.5) > 2.6;
    if (b) for (let dz = -1; dz <= 1 && b; dz++) for (let dx = -1; dx <= 1 && b; dx++) if (landTile(x + dx, z + dz).level !== t.level) b = false;
    bumpable.set(key, b);
  }
  return b;
}

/** Bumps fade to nothing wherever any tile touching the point is not wild, so farm tiles stay flat. */
function bumpWeight(x: number, z: number): number {
  const xs = Number.isInteger(x) ? [x - 1, x] : [Math.floor(x)];
  const zs = Number.isInteger(z) ? [z - 1, z] : [Math.floor(z)];
  for (const tx of xs) for (const tz of zs) if (!isBumpable(tx, tz)) return 0;
  return 1;
}

/** The ground height at a point of a tile at `level` (water tiles count as level 0, shaped by their banks). */
export function vertexY(level: number, x: number, z: number): number {
  const base = Math.max(0, level) * STEP_Y + hill(x, z) + bumpAt(x, z) * bumpWeight(x, z);
  const d = waterSdf(x, z);
  return d < 0.02 ? bankY(base, d) : base;
}

/** The ground height anywhere (for scenery, grass and people). */
export function groundY(x: number, z: number): number {
  const tx = Math.floor(x), tz = Math.floor(z);
  const t = landTile(tx, tz);
  const level = t.water ? 0 : t.level;
  if (waterSdf(tx + 0.5, tz + 0.5) < 1.6) return vertexY(level, x, z);
  // bilinear between the tile's corners, like the mesh
  const fx = x - tx, fz = z - tz;
  const a = vertexY(level, tx, tz), b = vertexY(level, tx + 1, tz), c = vertexY(level, tx, tz + 1), d = vertexY(level, tx + 1, tz + 1);
  return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
}

/** Is this a farm tile (an area, open or not)? */
export const isFarmTile = (x: number, z: number) => x >= 0 && z >= 0 && x < W && z < H && !!areaAt(x, z) && !tileAt(x, z).water;
