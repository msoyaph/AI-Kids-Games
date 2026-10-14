/**
 * Battle backdrops: a 240×120 pixel scene for each kind of place (sky, far layers that fade into the
 * air, a middle layer, and the ground both friends stand on, with small things growing on it), in
 * four times of day (1.1). Bright and calm, never scary: even the night is a friendly blue with a
 * moon and stars. Caves, Trials and rooms have no sky, so they look the same all day.
 * Drawn once per place and time, then scaled up crisply.
 */
import { hash32 } from '../core/rng';
import type { DayTime } from '../core/world/daytime';
import type { MapDef } from '../core/world/map';
import { P } from './palette';
import { darken, lighten, mix, PixelCanvas } from './pixelcanvas';

export const BG_W = 240, BG_H = 120, GROUND_Y = 92;

type Bg = MapDef['battleBg'];

/** Places with no sky: one look all day. */
export const INDOOR_BG: readonly Bg[] = ['cave', 'trial', 'indoor'];

const DAY_SKY: Record<Bg, [number, number]> = {
  meadow: [0x8fc8ff, 0xd8f0ff], beach: [0x7fc0ff, 0xe0f4ff], forest: [0x9fd0e8, 0xe8f6e0], cave: [0x2a2440, 0x463c52],
  mountain: [0x8fb8ff, 0xe0ecff], desert: [0xffc888, 0xfff0d0], snow: [0xb8d0f0, 0xf4f8ff], sky: [0x9fc8ff, 0xffe6f4],
  trial: [0x6a5a9a, 0xb8a8e0], town: [0x8fc8ff, 0xfff0e0], indoor: [0xf0d8b4, 0xfbe8c8],
};

/** The sky at the other times of day (top, horizon), nudged toward each place's own day sky. */
const TIME_SKY: Record<Exclude<DayTime, 'day'>, [number, number]> = {
  morning: [0x9cc8f4, 0xffd8c6],
  evening: [0x7464b4, 0xffa870],
  night: [0x24306a, 0x5868a8],
};

/** The light on everything under the sky: a colour and how much of it. */
const GRADE: Record<DayTime, [number, number]> = {
  morning: [0xffe2c8, 0.12],
  day: [0xffffff, 0],
  evening: [0xff9058, 0.2],
  night: [0x2e3c84, 0.4],
};

const GROUND: Record<Bg, [number, number, number]> = {
  meadow: [P.g3, P.g2, P.g4], beach: [P.sand2, P.sand1, P.sand3], forest: [P.g2, P.g1, P.g3], cave: [P.cave2, P.cave1, P.cave3],
  mountain: [P.g3, P.r2, P.g4], desert: [0xe8b878, 0xd09860, 0xf4d098], snow: [P.snow2, P.snow1, 0xffffff], sky: [P.cloud2, P.cloud1, 0xffffff],
  trial: [0xc8b8e8, 0xa898d0, 0xe0d8f8], town: [P.cob2, P.cob1, P.cob3], indoor: [P.wood3, P.wood2, P.wood4],
};

const rnd = (i: number, k: number, n: number) => hash32(i, k, 77) % n;

export function drawBackdrop(kind: Bg, time: DayTime = 'day'): PixelCanvas {
  const c = new PixelCanvas(BG_W, BG_H);
  const t: DayTime = INDOOR_BG.includes(kind) ? 'day' : time;
  const [dTop, dBottom] = DAY_SKY[kind];
  const [top, bottom] = t === 'day' ? [dTop, dBottom] : [mix(TIME_SKY[t][0], dTop, 0.2), mix(TIME_SKY[t][1], dBottom, 0.2)];
  // sky gradient in soft bands (pixel-art style dithering between bands)
  for (let y = 0; y < GROUND_Y; y++) {
    const f = y / GROUND_Y;
    const band = Math.floor(f * 6) / 6;
    for (let x = 0; x < BG_W; x++) {
      const dither = ((x + y) % 2 === 0 && f * 6 - Math.floor(f * 6) > 0.6) ? 1 / 6 : 0;
      c.px[y * BG_W + x] = mix(top, bottom, Math.min(1, band + dither));
    }
  }
  if (!INDOOR_BG.includes(kind)) sunMoonStars(c, kind, t, bottom);
  // everything drawn from here on is "scene" and takes the time of day's light
  const sky = c.px.slice();

  const far = (seed: number, base: number, amp: number, col: number) => {
    for (let x = 0; x < BG_W; x++) {
      const h = base + Math.sin(x * 0.03 + seed) * amp + Math.sin(x * 0.011 + seed * 2) * amp * 0.8;
      for (let y = Math.floor(h); y < GROUND_Y; y++) c.set(x, y, col);
    }
  };
  const haze = (col: number, k = 0.45) => mix(col, bottom, k);
  switch (kind) {
    case 'meadow':
      clouds(c, 0xffffff);
      far(1, 56, 6, haze(P.g4, 0.55));
      far(3, 68, 5, haze(mix(P.g3, P.g4, 0.4), 0.25));
      for (let i = 0; i < 9; i++) roundTree(c, rnd(i, 5, BG_W), 72 - (i % 3) * 2, i % 2 ? P.leaf : P.leafLight);
      far(5, 84, 2, P.g3);
      break;
    case 'town':
      clouds(c, 0xffffff);
      far(1, 58, 5, haze(P.g4, 0.55));
      for (let i = 0; i < 7; i++) {
        const x = i * 36 + rnd(i, 1, 10), w = 18 + rnd(i, 2, 8), h = 12 + rnd(i, 3, 8), y = 80 - h;
        const roof = [P.roofRed, P.roofBlue, P.roofTeal, P.roofSun, P.roofPlum][i % 5]!;
        c.rect(x, y, w, h + 12, haze([P.wallCream, P.wallPeach, P.wallWhite][i % 3]!, 0.2));
        c.poly([[x - 3, y + 1], [x + w / 2, y - 9], [x + w + 3, y + 1]], haze(roof, 0.2));
        c.rect(x + 4, y + 4, 4, 4, haze(0x8fc8f0, 0.2)).rect(x + w - 8, y + 4, 4, 4, haze(0x8fc8f0, 0.2));
      }
      // bunting across the square
      for (let x = 0; x < BG_W; x++) c.set(x, 30 + Math.round(Math.sin(x * 0.026) * 5), 0x6a5a7a);
      for (let x = 6; x < BG_W; x += 12) {
        const y = 31 + Math.round(Math.sin(x * 0.026) * 5);
        c.poly([[x - 3, y], [x + 3, y], [x, y + 6]], [P.flowerPink, P.flowerYellow, P.flowerBlue][(x / 12) % 3 | 0]!);
      }
      break;
    case 'beach':
      clouds(c, 0xffffff);
      // a far island with the lighthouse
      c.ellipse(46, 64, 26, 6, haze(P.g3, 0.5));
      c.rect(52, 46, 5, 16, haze(0xfff8ec, 0.4)).rect(52, 50, 5, 3, haze(P.roofRed, 0.4)).rect(51, 44, 7, 3, haze(P.roofRed, 0.4));
      c.rect(0, 64, BG_W, GROUND_Y - 64, P.w2);
      for (let x = 0; x < BG_W; x += 7) c.hline(x, x + 3, 66 + (x % 3) * 6, P.w3);
      for (let x = 3; x < BG_W; x += 11) c.hline(x, x + 1, 70 + (x % 4) * 4, lighten(P.w2, 0.35));
      c.rect(0, 84, BG_W, 8, P.w3);
      for (let x = 0; x < BG_W; x += 5) c.set(x, 84, P.foam).set(x + 1, 84, P.foam).set(x + 2, 85, P.foam);
      break;
    case 'forest':
      for (let i = 0; i < 16; i++) { const x = i * 15 + rnd(i, 1, 8); c.rect(x + 5, 26, 3, 66, haze(0x6a4a30, 0.55)); c.circle(x + 6, 24, 11, haze(P.leafDark, 0.55)); }
      for (let i = 0; i < 12; i++) {
        const x = i * 21 + rnd(i, 4, 9);
        c.rect(x + 4, 34, 5, 58, 0x6a4a30).rect(x + 4, 34, 1, 58, lighten(0x6a4a30, 0.2));
        c.circle(x + 6, 32, 13, i % 2 ? P.leafDark : P.leaf).circle(x + 1, 42, 9, P.leaf).circle(x + 12, 40, 8, P.leafLight);
      }
      // ferns along the ground line
      for (let i = 0; i < 14; i++) fern(c, rnd(i, 7, BG_W), GROUND_Y + 1, P.leaf);
      break;
    case 'mountain':
      clouds(c, 0xffffff);
      for (let k = 0; k < 4; k++) {
        const x = k * 70 - 20, peak = 22 + (k % 2) * 10;
        c.poly([[x, GROUND_Y], [x + 50, peak], [x + 100, GROUND_Y]], haze(P.r3, 0.4));
        c.poly([[x + 38, peak + 12], [x + 50, peak], [x + 62, peak + 12], [x + 55, peak + 9], [x + 50, peak + 13], [x + 44, peak + 9]], 0xffffff);
      }
      far(2, 72, 4, haze(P.g4, 0.2));
      for (let i = 0; i < 10; i++) pine(c, rnd(i, 3, BG_W), 84 - rnd(i, 4, 6), P.leafDark, 0);
      break;
    case 'desert':
      if (t === 'day') c.circle(200, 22, 10, 0xfff3c0).circle(200, 22, 7, 0xfffbe6);
      for (let k = 0; k < 5; k++) {
        const x = k * 52 + 10, y = 40 + (k % 2) * 8;
        c.rect(x, y, 26, 60, k % 2 ? 0xd9774b : 0xeaa16b).rect(x - 4, y - 2, 34, 4, 0xc45f3c);
        for (let s = y + 8; s < 88; s += 9) c.hline(x, x + 25, s, darken(k % 2 ? 0xd9774b : 0xeaa16b, 0.08));
      }
      far(6, 82, 3, 0xf0c890);
      break;
    case 'snow':
      far(2, 46, 10, haze(0xe6eeff, 0.2));
      far(4, 66, 6, 0xd4e2f6);
      for (let i = 0; i < 9; i++) pine(c, rnd(i, 3, BG_W), 82 - rnd(i, 4, 8), 0x3f7a6a, 0xffffff);
      for (let i = 0; i < 40; i++) c.set(rnd(i, 1, BG_W), rnd(i, 2, GROUND_Y), 0xffffff);
      break;
    case 'cave':
      for (let x = 0; x < BG_W; x += 12) c.poly([[x, 0], [x + 6, 10 + rnd(x, 1, 14)], [x + 12, 0]], P.cave1);
      for (let x = 5; x < BG_W; x += 17) c.poly([[x, GROUND_Y], [x + 4, 70 + rnd(x, 2, 10)], [x + 8, GROUND_Y]], mix(P.cave1, P.cave2, 0.5));
      for (let i = 0; i < 7; i++) crystal(c, 16 + i * 34 + rnd(i, 6, 10), GROUND_Y - 1, i % 2 ? 0x9ff7e8 : 0xc8a8ff);
      for (let i = 0; i < 14; i++) { const x = rnd(i, 9, BG_W), y = 20 + rnd(i, 3, 50); c.set(x, y, 0x9ff7e8).set(x + 1, y, 0x6fd0c8); }
      break;
    case 'sky':
      for (let i = 0; i < 6; i++) { const x = i * 44 + 8, y = 40 + (i % 3) * 12; c.ellipse(x + 12, y, 18, 6, P.cloud1).ellipse(x + 6, y - 3, 10, 6, 0xffffff); }
      // a floating island far away, with the Beacon Spire
      c.ellipse(186, 34, 20, 5, haze(P.g3, 0.4)).poly([[168, 35], [204, 35], [186, 50]], haze(P.r3, 0.4));
      c.rect(184, 16, 4, 18, haze(0xfff8ec, 0.35)).circle(186, 15, 3, haze(P.beaconGlow, 0.2));
      break;
    case 'trial':
      for (let x = 0; x < BG_W; x += 20) c.rect(x + 4, 20, 10, 72, 0x8a7ab8).rect(x + 2, 18, 14, 4, 0xa898d0).rect(x + 5, 20, 2, 72, 0x9a8ac8);
      c.circle(120, 30, 12, 0xfff3b0).circle(120, 30, 8, 0xfffbe0).circle(120, 30, 4, 0xffffff);
      break;
    case 'indoor':
      c.rect(0, 70, BG_W, 22, P.wood2);
      for (let x = 0; x < BG_W; x += 4) c.set(x, 70, P.wood3);
      for (let x = 0; x < BG_W; x += 40) c.rect(x + 10, 26, 22, 18, 0x8fc8f0).rect(x + 9, 25, 24, 2, P.white).rect(x + 20, 26, 2, 18, P.white).rect(x + 10, 34, 22, 1, P.white);
      for (let x = 30; x < BG_W; x += 80) c.rect(x, 52, 16, 18, P.wood1).rect(x + 2, 56, 12, 2, P.wood3).rect(x + 2, 62, 12, 2, P.wood3).circle(x + 8, 49, 4, P.leaf);
      break;
  }

  // the ground both friends stand on, with small things growing on it
  const [g, gd, gl] = GROUND[kind];
  for (let y = GROUND_Y; y < BG_H; y++) for (let x = 0; x < BG_W; x++) {
    const n = hash32(x >> 1, y >> 1, 3) & 31;
    c.px[y * BG_W + x] = y === GROUND_Y ? gl : n === 0 ? gd : n === 1 ? gl : g;
  }
  groundBits(c, kind);

  // the time of day's light on everything but the sky itself
  const [gc, gk] = GRADE[t];
  if (gk > 0) for (let i = 0; i < c.px.length; i++) if (c.px[i] !== sky[i]) c.px[i] = mix(c.px[i]!, gc, gk);
  if (t === 'morning') for (let y = 58; y < GROUND_Y; y++) for (let x = 0; x < BG_W; x++) c.px[y * BG_W + x] = mix(c.px[y * BG_W + x]!, 0xfff4ec, 0.1 * (1 - Math.abs(y - 75) / 17));
  return c;
}

function sunMoonStars(c: PixelCanvas, kind: Bg, t: DayTime, horizon: number): void {
  if (t === 'morning') c.circle(44, 52, 13, mix(0xfff0c0, horizon, 0.45)).circle(44, 52, 9, 0xfff4cc);
  if (t === 'evening') c.circle(196, 58, 16, mix(0xffc070, horizon, 0.4)).circle(196, 58, 11, 0xffd890);
  if (t === 'night') {
    for (let i = 0; i < 46; i++) {
      const x = rnd(i, 11, BG_W), y = rnd(i, 12, 70);
      c.set(x, y, i % 5 === 0 ? 0xfff6c8 : 0xe8ecff);
      if (i % 9 === 0) c.set(x - 1, y, 0xb8c4f0).set(x + 1, y, 0xb8c4f0).set(x, y - 1, 0xb8c4f0).set(x, y + 1, 0xb8c4f0);
    }
    // a friendly crescent moon: a disc with a bite of sky taken out of it
    const before = c.px.slice();
    c.circle(198, 22, 9, 0xfff3c8);
    for (let y = 10; y < 34; y++) for (let x = 186; x < 212; x++) {
      if ((x - 203) ** 2 + (y - 18) ** 2 <= 64) c.px[y * BG_W + x] = before[y * BG_W + x]!;
    }
  }
  if (kind === 'sky' && t !== 'night') for (let i = 0; i < 20; i++) c.set(rnd(i, 4, BG_W), rnd(i, 6, 40), 0xffffff);
}

function clouds(c: PixelCanvas, col: number) {
  for (const [x, y, w] of [[30, 16, 18], [120, 10, 24], [196, 20, 16]] as const) {
    c.ellipse(x, y, w, 5, col).ellipse(x - w * 0.4, y - 3, w * 0.45, 5, col).ellipse(x + w * 0.3, y - 4, w * 0.5, 6, col);
  }
}

function roundTree(c: PixelCanvas, x: number, y: number, leaf: number) {
  c.rect(x, y + 4, 2, 8, P.trunk);
  c.circle(x, y, 6, leaf).circle(x + 4, y - 2, 5, lighten(leaf, 0.15));
}

function pine(c: PixelCanvas, x: number, y: number, col: number, cap: number) {
  c.rect(x - 1, y, 2, 6, P.trunk);
  for (let k = 0; k < 3; k++) {
    const w = 7 - k * 2, yy = y - k * 5;
    c.poly([[x - w, yy + 1], [x, yy - 7], [x + w, yy + 1]], col);
    if (cap) c.hline(x - w + 2, x + w - 2, yy - 1, cap);
  }
}

function fern(c: PixelCanvas, x: number, y: number, col: number) {
  for (let k = -2; k <= 2; k++) c.line(x, y, x + k * 3, y - 6 + Math.abs(k), k % 2 ? col : lighten(col, 0.2));
}

function crystal(c: PixelCanvas, x: number, y: number, col: number) {
  c.poly([[x - 3, y], [x - 2, y - 8], [x, y - 12], [x + 2, y - 8], [x + 3, y]], col);
  c.poly([[x - 1, y - 2], [x, y - 10], [x + 1, y - 2]], lighten(col, 0.5));
}

/** Small things on the ground, kept to the front edge and the sides so the friends' feet stay clear. */
function groundBits(c: PixelCanvas, kind: Bg) {
  for (let i = 0; i < 26; i++) {
    const x = rnd(i, 21, BG_W), y = GROUND_Y + 3 + rnd(i, 22, BG_H - GROUND_Y - 5);
    switch (kind) {
      case 'meadow': case 'town':
        if (kind === 'town' && i % 2) break;
        if (i % 3 === 0) c.set(x, y, [P.flowerPink, P.flowerYellow, P.flowerWhite][i % 3 === 0 ? (i / 3) % 3 | 0 : 0]!).set(x, y + 1, P.g1);
        else c.set(x, y, P.g4).set(x + 1, y - 1, P.g4).set(x + 2, y, P.g4);
        break;
      case 'forest':
        if (i % 4 === 0) c.rect(x, y - 1, 3, 1, P.flowerRed).set(x + 1, y, P.white);
        else c.set(x, y, P.g3).set(x + 1, y - 1, P.g3);
        break;
      case 'beach':
        if (i % 5 === 0) c.set(x, y, 0xff9a8a).set(x + 1, y, 0xff9a8a).set(x, y + 1, 0xff9a8a).set(x + 1, y + 1, 0xffc0b0);
        else if (i % 3 === 0) c.hline(x, x + 2, y, P.sand0);
        break;
      case 'mountain': case 'desert':
        if (i % 3 === 0) c.ellipse(x, y, 3, 2, kind === 'desert' ? 0xc89868 : P.r2).set(x - 1, y - 1, kind === 'desert' ? 0xe8c098 : P.r3);
        break;
      case 'snow':
        if (i % 3 === 0) c.ellipse(x, y, 3, 1.5, 0xffffff).set(x, y + 1, P.snow1);
        break;
      case 'cave':
        if (i % 4 === 0) c.set(x, y, 0x9ff7e8);
        break;
      case 'indoor':
        if (i === 0) c.rect(70, GROUND_Y + 8, 100, 18, 0xd8706a).rect(74, GROUND_Y + 11, 92, 12, 0xe8907a);
        break;
      default:
        break;
    }
  }
}
