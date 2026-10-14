/**
 * The painted ground: a shader that paints grass in soft patches, clover, specks of wildflowers, worn
 * dirt where people walk and work, damp banks, the water's bed, earthy terrace sides with a grass lip,
 * a soft mist over land that isn't open yet, and contact shade around everything standing on it.
 *
 * A small data texture over the whole drawn world says, two texels a tile: red, farm land (mown) or
 * wild; green, locked; blue, worn; alpha, contact shade. Red and green change when land opens, blue
 * and alpha when things are built or moved. Grass blades use the same colours, so they melt into the
 * ground under them.
 */
import * as THREE from 'three';
import { BUILDING } from '../data/buildings';
import { areaAt, H, tileAt, W, WATER_Y, type AreaId } from '../sim/map';
import type { Obj } from '../sim/objects';
import type { Farm } from '../sim/state';
import { sizeOf } from '../sim/world';
import { SPAN, WORLD0, waterTexture } from './land';
import { EARTH, SEASON_PALETTES } from './palette';
import type { Season } from '../sim/clock';

/** Texels per tile of the ground data. */
const GPT = 2;
const GN = SPAN * GPT;

const color = (hex = 0xffffff) => ({ value: new THREE.Color(hex) });
export const groundUniforms = {
  gData: { value: null as THREE.DataTexture | null },
  gWater: { value: null as THREE.DataTexture | null },
  gGrass: color(), gGrassAlt: color(), gWild: color(), gWildAlt: color(), gDry: color(),
  gDirt: color(EARTH.dirt), gSoil: color(EARTH.soil), gRock: color(EARTH.rock), gSand: color(EARTH.sand), gBed: color(EARTH.bed), gMist: color(EARTH.mist),
  gFlower0: color(), gFlower1: color(), gFlower2: color(), gFlower3: color(),
  gFlowerAmt: { value: 1 },
};

export const GROUND_GLSL = /* glsl */ `
uniform sampler2D gData;
uniform sampler2D gWater;
uniform vec3 gGrass; uniform vec3 gGrassAlt; uniform vec3 gWild; uniform vec3 gWildAlt; uniform vec3 gDry;
uniform vec3 gDirt; uniform vec3 gSoil; uniform vec3 gRock; uniform vec3 gSand; uniform vec3 gBed; uniform vec3 gMist;
uniform vec3 gFlower0; uniform vec3 gFlower1; uniform vec3 gFlower2; uniform vec3 gFlower3;
uniform float gFlowerAmt;
vec2 gUv(vec2 p) { return (p - ${WORLD0.toFixed(1)}) / ${SPAN.toFixed(1)}; }
vec4 gSample(vec2 p) { return texture2D(gData, gUv(p)); }
float gWaterSdf(vec2 p) { return (texture2D(gWater, gUv(p)).r * 255.0 - 128.0) / 32.0; }
/** Grass colour without specks or dirt: what a grass blade standing here is made of. */
vec3 groundGrass(vec2 p, vec4 d) {
  float big = fxFbm(p * 0.11);
  vec3 farm = mix(gGrass, gGrassAlt, smoothstep(0.36, 0.64, big));
  vec3 wild = mix(gWild, gWildAlt, smoothstep(0.3, 0.7, big));
  vec3 c = mix(wild, farm, d.r);
  c = mix(c, gDry, smoothstep(0.6, 0.82, fxNoise(p * 0.2 + 31.0)) * 0.5);
  c *= 0.9 + 0.2 * fxNoise(p * 0.55);
  // locked land: a light mist, a little paler and softer, never washed out
  float l = dot(c, vec3(0.3, 0.55, 0.15));
  return mix(c, mix(vec3(l), gMist, 0.3), d.g * 0.26);
}
vec3 groundColor(vec3 w, vec3 n, float top) {
  vec2 p = w.xz;
  vec4 d = gSample(p);
  float sd = gWaterSdf(p);
  float fine = fxNoise(p * 3.1);
  float mid = fxNoise(p * 0.55 + 7.0);
  vec3 c = groundGrass(p, vec4(d.rg, 0.0, 0.0));
  // clover clumps and little light flecks
  float clover = smoothstep(0.62, 0.78, fxNoise(p * 2.6 + 11.0)) * (0.5 + 0.5 * fine);
  c = mix(c, c * vec3(0.84, 0.94, 0.8), clover * 0.5);
  c *= 0.94 + 0.12 * smoothstep(0.55, 0.9, fxNoise(p * 7.0));
  // wildflower specks: at most one in each 0.4-tile cell
  vec2 cell = floor(p * 2.5), f = fract(p * 2.5);
  float h = fxHash(cell);
  vec2 at = vec2(fxHash(cell + 5.3), fxHash(cell + 9.1)) * 0.6 + 0.2;
  float dens = gFlowerAmt * mix(0.2, 0.08, d.r) * (1.0 - d.g * 0.5) * (0.35 + smoothstep(0.3, 0.6, fxNoise(p * 0.3 + 4.0)));
  float speck = (1.0 - smoothstep(0.075, 0.12, length(f - at))) * step(h, dens);
  float hc = fract(h * 37.7);
  vec3 fc = hc < 0.25 ? gFlower0 : hc < 0.5 ? gFlower1 : hc < 0.75 ? gFlower2 : gFlower3;
  c = mix(c, fc, speck * (1.0 - d.g * 0.6));
  // worn dirt where people walk and work
  float wear = smoothstep(0.3, 0.68, d.b + (fine - 0.5) * 0.32 + (mid - 0.5) * 0.24);
  c = mix(c, gDirt * (0.86 + 0.24 * fine), wear);
  // banks: damp earth and sand at the water's edge, the bed under the water
  float shore = 1.0 - smoothstep(-0.05, 0.38 + 0.25 * mid, sd);
  c = mix(c, mix(gSand, gDirt, 0.35 + 0.3 * fine), shore * 0.85);
  float under = smoothstep(${(WATER_Y + 0.03).toFixed(3)}, ${(WATER_Y - 0.22).toFixed(3)}, w.y);
  c = mix(c, gBed * (0.8 + 0.3 * fine), under);
  // terrace sides: earth in bands, with the grass lip hanging over the top
  float side = 1.0 - smoothstep(0.45, 0.7, n.y);
  if (side > 0.0) {
    float band = fxNoise(vec2((w.x + w.z) * 1.3, w.y * 7.0));
    vec3 earth = mix(gSoil, gRock, smoothstep(0.42, 0.78, band));
    earth *= 0.82 + 0.3 * fxNoise(vec2((w.x - w.z) * 3.0, w.y * 18.0));
    float lip = smoothstep(0.13, 0.05, top - w.y + (fine - 0.5) * 0.06);
    c = mix(c, mix(earth, c, lip), side);
  }
  // contact shade under and around things
  return c * (1.0 - d.a * 0.42);
}`;

/** The data texture (two texels a tile, RGBA). */
const data = new Uint8Array(GN * GN * 4);
let tex: THREE.DataTexture | null = null;

function texture() {
  if (tex) return tex;
  tex = new THREE.DataTexture(data, GN, GN, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  groundUniforms.gData.value = tex;
  groundUniforms.gWater.value = waterTexture();
  return tex;
}

function blurChannel(ch: number, passes: number) {
  const t = new Float32Array(GN * GN);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < GN; y++) for (let x = 0; x < GN; x++) {
      let s = 0, n = 0;
      for (let k = -1; k <= 1; k++) { const xx = x + k; if (xx >= 0 && xx < GN) { s += data[(y * GN + xx) * 4 + ch]!; n++; } }
      t[y * GN + x] = s / n;
    }
    for (let y = 0; y < GN; y++) for (let x = 0; x < GN; x++) {
      let s = 0, n = 0;
      for (let k = -1; k <= 1; k++) { const yy = y + k; if (yy >= 0 && yy < GN) { s += t[yy * GN + x]!; n++; } }
      data[(y * GN + x) * 4 + ch] = Math.round(s / n);
    }
  }
}

/** Paint a rectangle of tiles (world units) into one channel, keeping the larger value. */
function paint(ch: number, x0: number, z0: number, x1: number, z1: number, v: number) {
  const a = Math.max(0, Math.floor((x0 - WORLD0) * GPT)), b = Math.min(GN, Math.ceil((x1 - WORLD0) * GPT));
  const c = Math.max(0, Math.floor((z0 - WORLD0) * GPT)), d = Math.min(GN, Math.ceil((z1 - WORLD0) * GPT));
  const val = Math.round(Math.min(1, v) * 255);
  for (let y = c; y < d; y++) for (let x = a; x < b; x++) { const i = (y * GN + x) * 4 + ch; if (data[i]! < val) data[i] = val; }
}

/** Farm land and locked land (red and green): when the open land changes. */
export function setGroundLand(unlocked: readonly AreaId[]) {
  texture();
  const open = new Set(unlocked);
  for (let y = 0; y < GN; y++) for (let x = 0; x < GN; x++) {
    const tx = Math.floor(x / GPT) + WORLD0, tz = Math.floor(y / GPT) + WORLD0;
    const i = (y * GN + x) * 4;
    const inMap = tx >= 0 && tz >= 0 && tx < W && tz < H;
    const area = inMap ? areaAt(tx, tz) : null;
    data[i] = area && !tileAt(tx, tz).water ? 255 : 0;
    data[i + 1] = area && !open.has(area) ? 255 : 0;
  }
  blurChannel(0, 1);
  blurChannel(1, 2);
  tex!.needsUpdate = true;
}

/** Worn ground and contact shade (blue and alpha): when things are built, moved or paths painted. */
export function setGroundWear(farm: Farm) {
  texture();
  for (let i = 0; i < GN * GN; i++) { data[i * 4 + 2] = 0; data[i * 4 + 3] = 0; }
  for (const o of farm.objects) {
    const size = sizeOf(o);
    const w = o.rot % 2 ? size.d : size.w, d = o.rot % 2 ? size.w : size.d;
    const x0 = o.x, z0 = o.z, x1 = o.x + w, z1 = o.z + d;
    if (o.kind === 'field') { paint(3, x0 + 0.08, z0 + 0.08, x1 - 0.08, z1 - 0.08, 0.5); paint(2, x0 - 0.15, z0 - 0.15, x1 + 0.15, z1 + 0.15, 0.32); continue; }
    if (o.kind === 'tree') { paint(3, x0 + 0.2, z0 + 0.2, x1 - 0.2, z1 - 0.2, 0.55); continue; }
    if (o.kind === 'debris') { paint(3, x0 + 0.25, z0 + 0.25, x1 - 0.25, z1 - 0.25, 0.35); continue; }
    if (o.kind === 'decor') { paint(3, x0 + 0.2, z0 + 0.2, x1 - 0.2, z1 - 0.2, 0.3); continue; }
    paint(3, x0 + 0.05, z0 + 0.05, x1 - 0.05, z1 - 0.05, 0.9);
    // the trodden ground in front of the door (models face south before turning)
    const h = BUILDING[o.def]?.holds;
    const fx = [[0, 1], [-1, 0], [0, -1], [1, 0]][o.rot]!;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const reach = (fx[0] ? w : d) / 2;
    const px = cx + fx[0]! * (reach + 0.5), pz = cz + fx[1]! * (reach + 0.5);
    paint(2, px - 0.7, pz - 0.7, px + 0.7, pz + 0.7, 0.85);
    // animal yards are trampled inside the fence
    if (h && h !== 'bee') paint(2, x0 + 0.3, z0 + 0.3, x1 - 0.3, z1 - 0.3, 0.55);
  }
  for (let i = 0; i < farm.paths.length; i++) {
    if (farm.paths.charCodeAt(i) - 48 <= 0) continue;
    const x = i % W, z = Math.floor(i / W);
    paint(2, x - 0.1, z - 0.1, x + 1.1, z + 1.1, 1);
  }
  blurChannel(2, 2);
  blurChannel(3, 2);
  tex!.needsUpdate = true;
}

/** Season colours. */
export function setGroundSeason(season: Season) {
  const pal = SEASON_PALETTES[season];
  const u = groundUniforms;
  u.gGrass.value.setHex(pal.grass); u.gGrassAlt.value.setHex(pal.grassAlt);
  u.gWild.value.setHex(pal.wild); u.gWildAlt.value.setHex(pal.wildAlt);
  u.gDry.value.setHex(pal.dry);
  const f = pal.flower;
  u.gFlower0.value.setHex(f[0]!); u.gFlower1.value.setHex(f[1 % f.length]!); u.gFlower2.value.setHex(f[2 % f.length]!); u.gFlower3.value.setHex(f[3 % f.length]!);
  u.gFlowerAmt.value = season === 'winter' ? 0.15 : season === 'autumn' ? 0.6 : 1;
}

/** Things standing on a tile, for the grass to keep off. */
export function blockedTiles(farm: Farm): Uint8Array {
  const out = new Uint8Array(W * H);
  const mark = (o: Obj) => {
    const size = sizeOf(o);
    const w = o.rot % 2 ? size.d : size.w, d = o.rot % 2 ? size.w : size.d;
    for (let z = o.z; z < o.z + d; z++) for (let x = o.x; x < o.x + w; x++) if (x >= 0 && z >= 0 && x < W && z < H) out[z * W + x] = o.kind === 'decor' || o.kind === 'tree' ? 2 : 1;
  };
  farm.objects.forEach(mark);
  for (let i = 0; i < farm.paths.length; i++) if (farm.paths.charCodeAt(i) - 48 > 0) out[i] = 1;
  return out;
}
