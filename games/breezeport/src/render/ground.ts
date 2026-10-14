/**
 * The painted ground: one shader paints the whole town, so streets cost no geometry at all. Roads
 * are asphalt with sidewalks wherever a road has no neighbour, rounded curbs at the corners, a dashed
 * centre line on straight stretches and zebra crossings beside junctions. Lots are wild grass, mown
 * lawn (with mowing stripes), plaza paving or gravel paths; the beach and the sea bed come from the
 * shore's distance; contact shade sits under everything standing on the ground.
 *
 * Two small data textures cover the drawn world:
 * - the tile map (one texel a tile, nearest): red = road links (N 1, E 2, S 4, W 8) + 16 for road;
 *   green = sidewalk corners (NE 1, SE 2, SW 4, NW 8) + crossings (N 16, E 32, S 64, W 128);
 *   blue = the lot's finish (sim/city.ts FINISH);
 * - the shade map (two texels a tile, linear): red = contact shade, green = lawn (softened edges).
 *
 * (The idea of a data-texture ground follows games/fieldlark/src/render/ground.ts; the town's
 * streets, lots and shore are new.)
 */
import * as THREE from 'three';
import type { Season } from '../sim/clock';
import { FINISH, isRoad, linkCount, type City, type Thing } from '../sim/city';
import { BEACH, H, inMap, W, WATER_Y } from '../sim/map';
import { SPAN, WORLD0 } from './land';
import { SEASON_PALETTES, STREET } from './palette';

const SPT = 2;
const SN = SPAN * SPT;

const color = (hex = 0xffffff) => ({ value: new THREE.Color(hex) });
export const groundUniforms = {
  gTile: { value: null as THREE.DataTexture | null },
  gShade: { value: null as THREE.DataTexture | null },
  gGrass: color(), gGrassAlt: color(), gLawn: color(), gLawnAlt: color(), gDry: color(),
  gAsphalt: color(STREET.asphalt), gSidewalk: color(STREET.sidewalk), gCurb: color(STREET.curb), gPaint: color(STREET.paint), gPaintY: color(STREET.paintYellow),
  gPaving: color(STREET.paving), gPavingAlt: color(STREET.pavingAlt), gGravel: color(STREET.gravel), gSand: color(STREET.sand), gWetSand: color(STREET.wetSand), gBed: color(STREET.bed),
  gFlower0: color(), gFlower1: color(), gFlower2: color(), gFlower3: color(),
  gFlowerAmt: { value: 1 },
};

/** The shore's curve in GLSL (the same function as sim/map.ts seaEdge). */
export const SHORE_GLSL = /* glsl */ `
float gSeaEdge(float x) { return 2.4 + sin(x * 0.21) * 0.45 + sin(x * 0.07 + 1.3) * 0.8; }
float gInland(vec2 p) { return p.y - gSeaEdge(p.x); }`;

export const GROUND_GLSL = /* glsl */ `
uniform sampler2D gTile;
uniform sampler2D gShade;
uniform vec3 gGrass; uniform vec3 gGrassAlt; uniform vec3 gLawn; uniform vec3 gLawnAlt; uniform vec3 gDry;
uniform vec3 gAsphalt; uniform vec3 gSidewalk; uniform vec3 gCurb; uniform vec3 gPaint; uniform vec3 gPaintY;
uniform vec3 gPaving; uniform vec3 gPavingAlt; uniform vec3 gGravel; uniform vec3 gSand; uniform vec3 gWetSand; uniform vec3 gBed;
uniform vec3 gFlower0; uniform vec3 gFlower1; uniform vec3 gFlower2; uniform vec3 gFlower3;
uniform float gFlowerAmt;
${SHORE_GLSL}
vec2 gUv(vec2 p) { return (p - ${WORLD0.toFixed(1)}) / ${SPAN.toFixed(1)}; }
float gBox(vec2 f, vec2 a, vec2 b) { vec2 c = (a + b) * 0.5, h = (b - a) * 0.5; vec2 d = abs(f - c) - h; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }

/** Grass without specks: what a grass tuft standing here is made of. */
vec3 groundGrass(vec2 p, float lawn) {
  float big = fxFbm(p * 0.11);
  vec3 wild = mix(gGrass, gGrassAlt, smoothstep(0.36, 0.64, big));
  wild = mix(wild, gDry, smoothstep(0.62, 0.84, fxNoise(p * 0.2 + 31.0)) * 0.45);
  // mown lawns: soft stripes where the mower went up and down
  float stripe = smoothstep(0.35, 0.65, abs(fract(p.x * 0.5) * 2.0 - 1.0));
  vec3 mown = mix(gLawn, gLawnAlt, stripe * 0.8);
  vec3 c = mix(wild, mown, lawn);
  return c * (0.92 + 0.16 * fxNoise(p * 0.55));
}

vec3 roadColor(vec2 p, vec2 f, int links, int extra) {
  bool cN = (links & 1) != 0, cE = (links & 2) != 0, cS = (links & 4) != 0, cW = (links & 8) != 0;
  const float SW = 0.16;
  // the sidewalks: strips along unlinked edges and rounded corners where two roads meet
  float s = 9.0;
  if (!cN) s = min(s, gBox(f, vec2(-1.0, -1.0), vec2(2.0, SW)));
  if (!cS) s = min(s, gBox(f, vec2(-1.0, 1.0 - SW), vec2(2.0, 2.0)));
  if (!cW) s = min(s, gBox(f, vec2(-1.0, -1.0), vec2(SW, 2.0)));
  if (!cE) s = min(s, gBox(f, vec2(1.0 - SW, -1.0), vec2(2.0, 2.0)));
  if ((extra & 1) != 0) s = min(s, length(f - vec2(1.0, 0.0)) - SW - 0.04);
  if ((extra & 2) != 0) s = min(s, length(f - vec2(1.0, 1.0)) - SW - 0.04);
  if ((extra & 4) != 0) s = min(s, length(f - vec2(0.0, 1.0)) - SW - 0.04);
  if ((extra & 8) != 0) s = min(s, length(f - vec2(0.0, 0.0)) - SW - 0.04);
  float fine = fxNoise(p * 9.0);
  // asphalt: speckled, a little darker along the wheel tracks
  vec3 c = gAsphalt * (0.93 + 0.1 * fine + 0.05 * fxNoise(p * 31.0));
  int n = int(cN) + int(cE) + int(cS) + int(cW);
  bool ns = (cN || cS) && !(cE || cW);
  bool ew = (cE || cW) && !(cN || cS);
  if (ns) c *= 1.0 - 0.06 * (smoothstep(0.1, 0.0, abs(f.x - 0.32)) + smoothstep(0.1, 0.0, abs(f.x - 0.68)));
  if (ew) c *= 1.0 - 0.06 * (smoothstep(0.1, 0.0, abs(f.y - 0.32)) + smoothstep(0.1, 0.0, abs(f.y - 0.68)));
  // a dashed centre line on straight stretches
  float paint = 0.0;
  if (ns && n <= 2) paint = (1.0 - smoothstep(0.014, 0.026, abs(f.x - 0.5))) * step(fract(p.y * 1.4), 0.55);
  if (ew && n <= 2) paint = (1.0 - smoothstep(0.014, 0.026, abs(f.y - 0.5))) * step(fract(p.x * 1.4), 0.55);
  c = mix(c, gPaintY * (0.92 + 0.1 * fine), paint * 0.92);
  // zebra crossings on the side next to a junction
  float zebra = 0.0;
  float bars = step(0.5, fract((ns ? f.x : f.y) * 8.0 + 0.25));
  if ((extra & 16) != 0) zebra = max(zebra, step(f.y, 0.24) * step(0.04, f.y) * step(0.5, fract(f.x * 8.0 + 0.25)));
  if ((extra & 64) != 0) zebra = max(zebra, step(0.76, f.y) * step(f.y, 0.96) * step(0.5, fract(f.x * 8.0 + 0.25)));
  if ((extra & 32) != 0) zebra = max(zebra, step(0.76, f.x) * step(f.x, 0.96) * step(0.5, fract(f.y * 8.0 + 0.25)));
  if ((extra & 128) != 0) zebra = max(zebra, step(f.x, 0.24) * step(0.04, f.x) * step(0.5, fract(f.y * 8.0 + 0.25)));
  c = mix(c, gPaint * (0.9 + 0.1 * fine), zebra * 0.9 * (0.85 + 0.15 * bars));
  // the curb: a shadow on the road side, a bright lip, then the paving slabs
  vec3 walk = gSidewalk * (0.94 + 0.08 * fxNoise(p * 4.0));
  vec2 slab = fract(p * 4.0);
  walk *= 0.93 + 0.07 * smoothstep(0.0, 0.08, min(min(slab.x, slab.y), min(1.0 - slab.x, 1.0 - slab.y)));
  c *= 1.0 - 0.32 * (1.0 - smoothstep(0.0, 0.05, s));
  c = mix(c, gCurb * 1.12, 1.0 - smoothstep(-0.012, 0.0, s));
  c = mix(c, walk, 1.0 - smoothstep(-0.035, -0.022, s));
  return c;
}

vec3 groundColor(vec3 w, vec3 n) {
  vec2 p = w.xz;
  vec2 tile = floor(p), f = p - tile;
  vec4 t = texture2D(gTile, (tile + 0.5 - ${WORLD0.toFixed(1)}) / ${SPAN.toFixed(1)});
  vec4 sh = texture2D(gShade, gUv(p));
  int r = int(t.r * 255.0 + 0.5), g = int(t.g * 255.0 + 0.5), b = int(t.b * 255.0 + 0.5);
  float fine = fxNoise(p * 3.1);
  vec3 c;
  if ((r & 16) != 0) {
    c = roadColor(p, f, r & 15, g);
  } else {
    c = groundGrass(p, sh.g);
    // wildflower specks in wild grass, at most one in each 0.4-tile cell
    vec2 cell = floor(p * 2.5), cf = fract(p * 2.5);
    float h = fxHash(cell);
    vec2 at = vec2(fxHash(cell + 5.3), fxHash(cell + 9.1)) * 0.6 + 0.2;
    float dens = gFlowerAmt * 0.16 * (1.0 - sh.g) * (0.35 + smoothstep(0.3, 0.6, fxNoise(p * 0.3 + 4.0)));
    float speck = (1.0 - smoothstep(0.075, 0.12, length(cf - at))) * step(h, dens);
    float hc = fract(h * 37.7);
    vec3 fc = hc < 0.25 ? gFlower0 : hc < 0.5 ? gFlower1 : hc < 0.75 ? gFlower2 : gFlower3;
    c = mix(c, fc, speck);
    if (b == ${FINISH.paving}) {
      // plaza paving: big pale slabs in two tones
      vec2 q = floor(p * 2.0);
      vec2 qf = fract(p * 2.0);
      float seam = smoothstep(0.0, 0.05, min(min(qf.x, qf.y), min(1.0 - qf.x, 1.0 - qf.y)));
      c = mix(gPaving, gPavingAlt, step(0.5, fxHash(q)) * 0.6) * (0.9 + 0.1 * seam) * (0.95 + 0.08 * fine);
    } else if (b == ${FINISH.gravel}) {
      c = gGravel * (0.86 + 0.18 * fxNoise(p * 14.0) + 0.06 * fine);
      // soft grassy edges where the path meets the lawn
      float e = min(min(f.x, f.y), min(1.0 - f.x, 1.0 - f.y));
      c = mix(c, groundGrass(p, 1.0), (1.0 - smoothstep(0.0, 0.08, e)) * 0.25);
    } else if (b == ${FINISH.sand}) {
      c = gSand * (0.94 + 0.1 * fine);
    }
  }
  // the beach and the bay's bed
  float d = gInland(p);
  if (d < ${(BEACH + 0.4).toFixed(2)}) {
    float ripple = fxNoise(vec2(p.x * 1.2, d * 9.0)) * 0.08;
    vec3 sand = mix(gWetSand, gSand, smoothstep(0.15, 0.9, d)) * (0.95 + 0.08 * fine + ripple);
    float beach = 1.0 - smoothstep(${(BEACH - 0.15).toFixed(2)}, ${(BEACH + 0.35).toFixed(2)}, d + (fine - 0.5) * 0.25);
    c = mix(c, sand, beach);
  }
  float under = smoothstep(${(WATER_Y + 0.02).toFixed(3)}, ${(WATER_Y - 0.2).toFixed(3)}, w.y);
  c = mix(c, gBed * (0.8 + 0.3 * fine), under);
  // contact shade under and around things
  return c * (1.0 - sh.r * 0.45);
}`;

const tileData = new Uint8Array(SPAN * SPAN * 4);
const shadeData = new Uint8Array(SN * SN * 4);
let tileTex: THREE.DataTexture | null = null;
let shadeTex: THREE.DataTexture | null = null;

function textures() {
  if (tileTex) return;
  tileTex = new THREE.DataTexture(tileData, SPAN, SPAN, THREE.RGBAFormat, THREE.UnsignedByteType);
  tileTex.magFilter = tileTex.minFilter = THREE.NearestFilter;
  shadeTex = new THREE.DataTexture(shadeData, SN, SN, THREE.RGBAFormat, THREE.UnsignedByteType);
  shadeTex.magFilter = shadeTex.minFilter = THREE.LinearFilter;
  for (const t of [tileTex, shadeTex]) t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  groundUniforms.gTile.value = tileTex;
  groundUniforms.gShade.value = shadeTex;
}

/**
 * Roads that reach the town's edge carry on out into the countryside (the roads out of town), so
 * the street doesn't stop at a grassy wall. Returns road-ness for any tile of the drawn world.
 */
export function roadAnywhere(c: City, x: number, z: number): boolean {
  if (inMap(x, z)) return isRoad(c, x, z);
  if (z < 0 || ((x < 0 || x >= W) && z >= H)) return false; // the bay, and the far corners
  // straight on only: a road running out of the west or east edge keeps its row, south its column
  if (x < 0) return isRoad(c, 0, z) && isRoad(c, 1, z);
  if (x >= W) return isRoad(c, W - 1, z) && isRoad(c, W - 2, z);
  return isRoad(c, x, H - 1) && isRoad(c, x, H - 2);
}

function linksAnywhere(c: City, x: number, z: number) {
  return (roadAnywhere(c, x, z - 1) ? 1 : 0) | (roadAnywhere(c, x + 1, z) ? 2 : 0) | (roadAnywhere(c, x, z + 1) ? 4 : 0) | (roadAnywhere(c, x - 1, z) ? 8 : 0);
}

/** Roads, sidewalk corners, crossings and lot finishes: when roads or lots change. */
export function setGroundTiles(c: City) {
  textures();
  for (let j = 0; j < SPAN; j++) for (let i = 0; i < SPAN; i++) {
    const x = i + WORLD0, z = j + WORLD0;
    const o = (j * SPAN + i) * 4;
    let r = 0, g = 0, b = FINISH.wild as number;
    if (roadAnywhere(c, x, z)) {
      const L = linksAnywhere(c, x, z);
      r = 16 | L;
      const road = (dx: number, dz: number) => roadAnywhere(c, x + dx, z + dz);
      if ((L & 1) && (L & 2) && !road(1, -1)) g |= 1;
      if ((L & 4) && (L & 2) && !road(1, 1)) g |= 2;
      if ((L & 4) && (L & 8) && !road(-1, 1)) g |= 4;
      if ((L & 1) && (L & 8) && !road(-1, -1)) g |= 8;
      // crossings: on a stretch beside a junction, across the road
      if (linkCount(L) <= 2) {
        const junction = (dx: number, dz: number) => road(dx, dz) && linkCount(linksAnywhere(c, x + dx, z + dz)) >= 3;
        if ((L & 1) && junction(0, -1)) g |= 16;
        if ((L & 2) && junction(1, 0)) g |= 32;
        if ((L & 4) && junction(0, 1)) g |= 64;
        if ((L & 8) && junction(-1, 0)) g |= 128;
      }
    } else if (inMap(x, z)) {
      b = c.finish[z * W + x]!;
    }
    tileData[o] = r; tileData[o + 1] = g; tileData[o + 2] = b; tileData[o + 3] = 255;
  }
  // lawns, softened at the edges (green channel of the shade map)
  for (let j = 0; j < SN; j++) for (let i = 0; i < SN; i++) {
    const x = Math.floor(i / SPT) + WORLD0, z = Math.floor(j / SPT) + WORLD0;
    const lawn = inMap(x, z) && !isRoad(c, x, z) && c.finish[z * W + x]! !== FINISH.wild;
    shadeData[(j * SN + i) * 4 + 1] = lawn ? 255 : 0;
  }
  blurChannel(1, 1);
  tileTex!.needsUpdate = true;
  shadeTex!.needsUpdate = true;
}

function blurChannel(ch: number, passes: number) {
  const t = new Float32Array(SN * SN);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < SN; y++) for (let x = 0; x < SN; x++) {
      let s = 0, n = 0;
      for (let k = -1; k <= 1; k++) { const xx = x + k; if (xx >= 0 && xx < SN) { s += shadeData[(y * SN + xx) * 4 + ch]!; n++; } }
      t[y * SN + x] = s / n;
    }
    for (let y = 0; y < SN; y++) for (let x = 0; x < SN; x++) {
      let s = 0, n = 0;
      for (let k = -1; k <= 1; k++) { const yy = y + k; if (yy >= 0 && yy < SN) { s += t[yy * SN + x]!; n++; } }
      shadeData[(y * SN + x) * 4 + ch] = Math.round(s / n);
    }
  }
}

/** Paint contact shade under a rectangle (world units), keeping the darker value. */
function shade(x0: number, z0: number, x1: number, z1: number, v: number) {
  const a = Math.max(0, Math.floor((x0 - WORLD0) * SPT)), b = Math.min(SN, Math.ceil((x1 - WORLD0) * SPT));
  const c = Math.max(0, Math.floor((z0 - WORLD0) * SPT)), d = Math.min(SN, Math.ceil((z1 - WORLD0) * SPT));
  const val = Math.round(Math.min(1, v) * 255);
  for (let y = c; y < d; y++) for (let x = a; x < b; x++) { const i = (y * SN + x) * 4; if (shadeData[i]! < val) shadeData[i] = val; }
}

/** Contact shade under buildings and props: when things are built or moved. */
export function setGroundShade(things: readonly Thing[], footprint: (t: Thing) => { w: number; d: number; shade: number; inset: number }) {
  textures();
  for (let i = 0; i < SN * SN; i++) shadeData[i * 4] = 0;
  for (const t of things) {
    const f = footprint(t);
    if (!f.shade) continue;
    const w = t.rot % 2 ? f.d : f.w, d = t.rot % 2 ? f.w : f.d;
    shade(t.x + f.inset, t.z + f.inset, t.x + w - f.inset, t.z + d - f.inset, f.shade);
  }
  blurChannel(0, 2);
  shadeTex!.needsUpdate = true;
}

/** Season colours. */
export function setGroundSeason(season: Season) {
  const pal = SEASON_PALETTES[season];
  const u = groundUniforms;
  u.gGrass.value.setHex(pal.grass); u.gGrassAlt.value.setHex(pal.grassAlt);
  u.gLawn.value.setHex(pal.lawn); u.gLawnAlt.value.setHex(pal.lawnAlt);
  u.gDry.value.setHex(pal.dry);
  const f = pal.flower;
  u.gFlower0.value.setHex(f[0]!); u.gFlower1.value.setHex(f[1 % f.length]!); u.gFlower2.value.setHex(f[2 % f.length]!); u.gFlower3.value.setHex(f[3 % f.length]!);
  u.gFlowerAmt.value = season === 'winter' ? 0.15 : season === 'autumn' ? 0.6 : 1;
}
