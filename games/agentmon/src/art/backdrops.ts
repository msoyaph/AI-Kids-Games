/**
 * Battle backdrops: a 240×120 pixel scene for each kind of place (sky, a far landscape, and the
 * ground both friends stand on). Bright and calm, never scary. Drawn once and scaled up crisply.
 */
import { hash32 } from '../core/rng';
import type { MapDef } from '../core/world/map';
import { P } from './palette';
import { mix, PixelCanvas } from './pixelcanvas';

export const BG_W = 240, BG_H = 120, GROUND_Y = 92;

type Bg = MapDef['battleBg'];

const SKY: Record<Bg, [number, number]> = {
  meadow: [0x8fc8ff, 0xd8f0ff], beach: [0x7fc0ff, 0xe0f4ff], forest: [0x9fd0e8, 0xe8f6e0], cave: [0x2a2440, 0x463c52],
  mountain: [0x8fb8ff, 0xe0ecff], desert: [0xffc888, 0xfff0d0], snow: [0xb8d0f0, 0xf4f8ff], sky: [0x9fc8ff, 0xffe6f4],
  trial: [0x6a5a9a, 0xb8a8e0], town: [0x8fc8ff, 0xfff0e0], indoor: [0xf0d8b4, 0xfbe8c8],
};

const GROUND: Record<Bg, [number, number, number]> = {
  meadow: [P.g3, P.g2, P.g4], beach: [P.sand2, P.sand1, P.sand3], forest: [P.g2, P.g1, P.g3], cave: [P.cave2, P.cave1, P.cave3],
  mountain: [P.g3, P.r2, P.g4], desert: [0xe8b878, 0xd09860, 0xf4d098], snow: [P.snow2, P.snow1, 0xffffff], sky: [P.cloud2, P.cloud1, 0xffffff],
  trial: [0xc8b8e8, 0xa898d0, 0xe0d8f8], town: [P.cob2, P.cob1, P.cob3], indoor: [P.wood3, P.wood2, P.wood4],
};

export function drawBackdrop(kind: Bg): PixelCanvas {
  const c = new PixelCanvas(BG_W, BG_H);
  const [top, bottom] = SKY[kind];
  // sky gradient in soft bands (pixel-art style dithering between bands)
  for (let y = 0; y < GROUND_Y; y++) {
    const t = y / GROUND_Y;
    const band = Math.floor(t * 6) / 6;
    for (let x = 0; x < BG_W; x++) {
      const dither = ((x + y) % 2 === 0 && t * 6 - Math.floor(t * 6) > 0.6) ? 1 / 6 : 0;
      c.px[y * BG_W + x] = mix(top, bottom, Math.min(1, band + dither));
    }
  }
  const far = (seed: number, base: number, amp: number, col: number, step = 1) => {
    for (let x = 0; x < BG_W; x += step) {
      const h = base + Math.sin(x * 0.03 + seed) * amp + Math.sin(x * 0.011 + seed * 2) * amp * 0.8;
      for (let y = Math.floor(h); y < GROUND_Y; y++) for (let k = 0; k < step; k++) c.set(x + k, y, col);
    }
  };
  switch (kind) {
    case 'meadow': case 'town':
      far(1, 58, 6, mix(P.g4, SKY[kind][1], 0.45));
      far(3, 70, 5, mix(P.g3, P.g4, 0.4));
      for (let i = 0; i < 9; i++) { const x = (hash32(i, 5) % BG_W); c.circle(x, 70 - (i % 3) * 2, 6, P.leaf).circle(x + 4, 68, 5, P.leafLight); c.rect(x, 74, 2, 6, P.trunk); }
      clouds(c, 0xffffff);
      break;
    case 'beach':
      c.rect(0, 64, BG_W, GROUND_Y - 64, P.w2);
      for (let x = 0; x < BG_W; x += 7) c.hline(x, x + 3, 66 + (x % 3) * 6, P.w3);
      c.rect(0, 84, BG_W, 8, P.w3);
      for (let x = 0; x < BG_W; x += 5) c.set(x, 84, P.foam).set(x + 1, 84, P.foam);
      clouds(c, 0xffffff);
      break;
    case 'forest':
      for (let i = 0; i < 18; i++) { const x = (i * 14 + (hash32(i) % 9)); c.rect(x + 4, 30, 4, 60, 0x6a4a30); c.circle(x + 6, 30, 12, i % 2 ? P.leafDark : P.leaf); c.circle(x + 2, 40, 9, P.leaf); }
      break;
    case 'mountain':
      for (let k = 0; k < 4; k++) c.poly([[k * 70 - 20, GROUND_Y], [k * 70 + 30, 22 + (k % 2) * 10], [k * 70 + 80, GROUND_Y]], mix(P.r3, SKY.mountain[1], 0.35));
      for (let k = 0; k < 4; k++) c.poly([[k * 70 + 18, 34 + (k % 2) * 10], [k * 70 + 30, 22 + (k % 2) * 10], [k * 70 + 42, 34 + (k % 2) * 10]], 0xffffff);
      clouds(c, 0xffffff);
      break;
    case 'desert':
      for (let k = 0; k < 5; k++) { const x = k * 52 + 10; c.rect(x, 40 + (k % 2) * 8, 26, 60, k % 2 ? 0xd9774b : 0xeaa16b); c.rect(x - 4, 38 + (k % 2) * 8, 34, 4, 0xc45f3c); }
      c.circle(200, 22, 10, 0xfff3c0);
      break;
    case 'snow':
      far(2, 46, 10, 0xe6eeff);
      far(4, 66, 6, 0xd4e2f6);
      for (let i = 0; i < 40; i++) c.set(hash32(i, 1) % BG_W, hash32(i, 2) % GROUND_Y, 0xffffff);
      break;
    case 'cave':
      for (let x = 0; x < BG_W; x += 12) c.poly([[x, 0], [x + 6, 10 + (hash32(x) % 14)], [x + 12, 0]], P.cave1);
      for (let i = 0; i < 14; i++) { const x = hash32(i, 9) % BG_W, y = 20 + hash32(i, 3) % 50; c.set(x, y, 0x9ff7e8).set(x + 1, y, 0x6fd0c8); }
      break;
    case 'sky':
      for (let i = 0; i < 6; i++) { const x = i * 44 + 8, y = 40 + (i % 3) * 12; c.ellipse(x + 12, y, 18, 6, P.cloud1).ellipse(x + 6, y - 3, 10, 6, 0xffffff); }
      for (let i = 0; i < 20; i++) c.set(hash32(i, 4) % BG_W, hash32(i, 6) % 40, 0xffffff);
      break;
    case 'trial':
      for (let x = 0; x < BG_W; x += 20) c.rect(x + 4, 20, 10, 72, 0x8a7ab8).rect(x + 2, 18, 14, 4, 0xa898d0);
      c.circle(120, 30, 10, 0xfff3b0).circle(120, 30, 6, 0xffffff);
      break;
    case 'indoor':
      c.rect(0, 70, BG_W, 22, P.wood2);
      for (let x = 0; x < BG_W; x += 40) c.rect(x + 10, 26, 22, 18, 0x8fc8f0).rect(x + 9, 25, 24, 2, P.white);
      break;
  }
  // the ground both friends stand on
  const [g, gd, gl] = GROUND[kind];
  for (let y = GROUND_Y; y < BG_H; y++) for (let x = 0; x < BG_W; x++) {
    const n = hash32(x >> 1, y >> 1, 3) & 31;
    c.px[y * BG_W + x] = y === GROUND_Y ? gl : n === 0 ? gd : n === 1 ? gl : g;
  }
  return c;
}

function clouds(c: PixelCanvas, col: number) {
  for (const [x, y, w] of [[30, 16, 18], [120, 10, 24], [196, 20, 16]] as const) {
    c.ellipse(x, y, w, 5, col).ellipse(x - w * 0.4, y - 3, w * 0.45, 5, col).ellipse(x + w * 0.3, y - 4, w * 0.5, 6, col);
  }
}
