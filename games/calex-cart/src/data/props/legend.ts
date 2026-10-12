import type { ModelPart } from '../types';

// Neon palette
const MAG = 0xff2bd6;
const CYAN = 0x22e8ff;
const VOLT = 0xffe14d;
const LIME = 0x7dff5a;
const VIOLET = 0x9b5cff;
const NIGHT = 0x2a2552;
const STEEL = 0x3a3a50;
// Cloud castle palette
const GOLD = 0xffc83d;
const ROCK = 0x8a7f99;

/** Ring of `n` box segments (a thin hoop) in the XY plane — the unit torus is too chunky for big wheels/rings. */
function hoop(cx: number, cy: number, r: number, n: number, thick: number, depth: number, c: number | ((k: number) => number)): ModelPart[] {
  const out: ModelPart[] = [];
  const seg = 2 * r * Math.sin(Math.PI / n) + thick * 0.3;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    out.push({
      shape: 'box',
      p: [round(cx + Math.cos(a) * r), round(cy + Math.sin(a) * r), 0],
      s: [round(seg), thick, depth],
      r: [0, 0, round((a * 180) / Math.PI + 90)],
      c: typeof c === 'number' ? c : c(k),
    });
  }
  return out;
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Scenery + hazard recipes for the Legend Cup themes. Names must be unique across all prop files. */
export const LEGEND_PROPS: Record<string, ModelPart[]> = {
  // =====================================================================
  // neon night city
  // =====================================================================
  le_neon_tower: [
    { shape: 'box', p: [0, 20, 0], s: [12, 40, 12], c: NIGHT },
    { shape: 'box', p: [0, 10, 6.05], s: [10, 0.7, 0.1], c: CYAN },
    { shape: 'box', p: [0, 18, 6.05], s: [10, 0.7, 0.1], c: MAG },
    { shape: 'box', p: [0, 26, 6.05], s: [10, 0.7, 0.1], c: CYAN },
    { shape: 'box', p: [0, 34, 6.05], s: [10, 0.7, 0.1], c: MAG },
    { shape: 'box', p: [0, 14, -6.05], s: [10, 0.7, 0.1], c: CYAN },
    { shape: 'box', p: [0, 30, -6.05], s: [10, 0.7, 0.1], c: MAG },
    { shape: 'box', p: [6.05, 14, 0], s: [0.1, 0.7, 10], c: VOLT, mirror: true },
    { shape: 'box', p: [6.05, 28, 0], s: [0.1, 0.7, 10], c: VOLT, mirror: true },
    { shape: 'box', p: [0, 40.6, 0], s: [12.6, 1.2, 12.6], c: MAG },
    { shape: 'cyl', p: [0, 44, 0], s: [0.4, 6, 0.4], c: 0xc0c8d8, seg: 5 },
    { shape: 'sphere', p: [0, 47.2, 0], s: [1.2, 1.2, 1.2], c: 0xff4d6d, seg: 6 },
  ],
  le_neon_tower2: [
    { shape: 'box', p: [0, 12, 0], s: [16, 24, 16], c: 0x1f2a4a },
    { shape: 'box', p: [0, 30, 0], s: [11, 12, 11], c: 0x24305a },
    { shape: 'box', p: [0, 40, 0], s: [6, 8, 6], c: 0x2a3768 },
    { shape: 'box', p: [8.05, 12, 0], s: [0.1, 22, 1], c: CYAN, mirror: true },
    { shape: 'box', p: [0, 12, 8.05], s: [1, 22, 0.1], c: CYAN },
    { shape: 'box', p: [0, 12, -8.05], s: [1, 22, 0.1], c: CYAN },
    { shape: 'box', p: [5.55, 30, 0], s: [0.1, 11, 0.8], c: 0xb26bff, mirror: true },
    { shape: 'box', p: [0, 24.4, 0], s: [16.4, 0.8, 16.4], c: 0xb26bff },
    { shape: 'box', p: [0, 36.3, 0], s: [11.4, 0.6, 11.4], c: CYAN },
    { shape: 'cone', p: [0, 46, 0], s: [5, 4, 5], c: MAG, seg: 4 },
  ],
  le_neon_tower3: [
    { shape: 'cyl', p: [0, 18, 0], s: [10, 36, 10], c: 0x2b2350, seg: 10 },
    { shape: 'torus', p: [0, 8, 0], s: [12.5, 12.5, 4], r: [90, 0, 0], c: MAG, seg: 16 },
    { shape: 'torus', p: [0, 18, 0], s: [12, 12, 4], r: [90, 0, 0], c: CYAN, seg: 16 },
    { shape: 'torus', p: [0, 28, 0], s: [11.5, 11.5, 4], r: [90, 0, 0], c: VOLT, seg: 16 },
    { shape: 'sphere', p: [0, 37, 0], s: [8, 4, 8], c: VIOLET, seg: 10 },
    { shape: 'cyl', p: [0, 41, 0], s: [0.3, 6, 0.3], c: 0xdddddd, seg: 4 },
  ],
  le_neon_sign: [
    { shape: 'cyl', p: [3, 3, 0], s: [0.4, 6, 0.4], c: STEEL, seg: 6, mirror: true },
    { shape: 'box', p: [0, 8, 0], s: [10, 5, 0.4], c: 0x14122a },
    { shape: 'box', p: [0, 10.6, 0.1], s: [10.4, 0.3, 0.5], c: MAG },
    { shape: 'box', p: [0, 5.4, 0.1], s: [10.4, 0.3, 0.5], c: MAG },
    { shape: 'box', p: [5.1, 8, 0.1], s: [0.3, 5.4, 0.5], c: MAG, mirror: true },
    { shape: 'sphere', p: [-2.6, 8, 0.25], s: [2.6, 2.6, 0.3], c: VOLT, seg: 10 },
    { shape: 'box', p: [1.6, 8.7, 0.25], s: [4, 0.6, 0.2], c: CYAN },
    { shape: 'box', p: [1.1, 7.4, 0.25], s: [3, 0.6, 0.2], c: LIME },
  ],
  le_neon_lamp: [
    { shape: 'cyl', p: [0, 0.15, 0], s: [0.7, 0.3, 0.7], c: CYAN, seg: 8 },
    { shape: 'cyl', p: [0, 3, 0], s: [0.25, 6, 0.25], c: STEEL, seg: 6 },
    { shape: 'box', p: [0.8, 6, 0], s: [1.8, 0.2, 0.2], c: STEEL },
    { shape: 'sphere', p: [1.6, 5.8, 0], s: [0.8, 0.5, 0.8], c: 0x9ffcff, seg: 8 },
  ],
  le_neon_palm: [
    { shape: 'cyl', p: [0, 1.5, 0], s: [0.5, 3, 0.5], r: [0, 0, 4], c: MAG, seg: 6 },
    { shape: 'cyl', p: [0.2, 4.3, 0], s: [0.42, 2.8, 0.42], r: [0, 0, 8], c: 0xd91fc0, seg: 6 },
    { shape: 'box', p: [1.4, 5.9, 0], s: [2.8, 0.12, 0.8], r: [0, 0, -22], c: CYAN },
    { shape: 'box', p: [-1.0, 5.9, 0], s: [2.8, 0.12, 0.8], r: [0, 0, 22], c: CYAN },
    { shape: 'box', p: [0.2, 5.9, 1.2], s: [0.8, 0.12, 2.8], r: [22, 0, 0], c: LIME },
    { shape: 'box', p: [0.2, 5.9, -1.2], s: [0.8, 0.12, 2.8], r: [-22, 0, 0], c: LIME },
    { shape: 'sphere', p: [0.25, 5.7, 0], s: [0.6, 0.6, 0.6], c: VOLT, seg: 6 },
  ],
  le_vending: [
    { shape: 'box', p: [0, 1.1, 0], s: [1.3, 2.2, 0.9], c: 0xff3b6b },
    { shape: 'box', p: [-0.15, 1.3, 0.46], s: [0.8, 1.4, 0.05], c: 0x9ffcff },
    { shape: 'box', p: [0.45, 1.3, 0.46], s: [0.2, 0.8, 0.05], c: VOLT },
    { shape: 'box', p: [0, 2.25, 0], s: [1.4, 0.1, 1.0], c: CYAN },
  ],
  le_neon_bollard: [
    { shape: 'cyl', p: [0, 0.5, 0], s: [0.5, 1, 0.5], c: 0x2a2a3a, seg: 8 },
    { shape: 'cyl', p: [0, 0.75, 0], s: [0.55, 0.18, 0.55], c: VOLT, seg: 8 },
    { shape: 'sphere', p: [0, 1.05, 0], s: [0.5, 0.3, 0.5], c: MAG, seg: 8 },
  ],
  /** Glowing arch that spans a 13–14 m road plus walls (posts at ±9.5 m). Place with rot = road heading. */
  le_neon_arch: [
    { shape: 'box', p: [9.6, 4.6, 0], s: [1.2, 9.2, 1.2], c: NIGHT, mirror: true },
    { shape: 'box', p: [9.6, 4.6, 0.62], s: [0.5, 8.4, 0.1], c: MAG, mirror: true },
    { shape: 'box', p: [9.6, 4.6, -0.62], s: [0.5, 8.4, 0.1], c: MAG, mirror: true },
    { shape: 'box', p: [0, 9.6, 0], s: [20.4, 1.4, 1.2], c: NIGHT },
    { shape: 'box', p: [0, 9.6, 0.62], s: [19, 0.5, 0.1], c: CYAN },
    { shape: 'box', p: [0, 9.6, -0.62], s: [19, 0.5, 0.1], c: CYAN },
    { shape: 'torus', p: [0, 12, 0], s: [4, 4, 4], c: VOLT, seg: 16 },
    { shape: 'sphere', p: [0, 12, 0], s: [1.4, 1.4, 1.4], c: MAG, seg: 8 },
  ],
  /** Big glowing observation wheel (landmark, ~32 m tall). */
  le_neon_wheel: [
    { shape: 'cyl', p: [3.2, 8.5, 2], s: [0.7, 18, 0.7], r: [0, 0, 18], c: STEEL, seg: 6, mirror: true },
    { shape: 'cyl', p: [3.2, 8.5, -2], s: [0.7, 18, 0.7], r: [0, 0, 18], c: STEEL, seg: 6, mirror: true },
    { shape: 'cyl', p: [0, 17.5, 0], s: [1.6, 5, 1.6], r: [90, 0, 0], c: 0xc0c8d8, seg: 8 },
    ...hoop(0, 17.5, 13, 16, 0.6, 0.6, (k) => (k % 2 ? MAG : CYAN)),
    ...[0, 30, 60, 90, 120, 150].map((a): ModelPart => ({ shape: 'box', p: [0, 17.5, 0], s: [26, 0.25, 0.25], r: [0, 0, a], c: VOLT })),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((k): ModelPart => {
      const a = (k / 8) * Math.PI * 2;
      return { shape: 'box', p: [round(Math.cos(a) * 13), round(17.5 + Math.sin(a) * 13 - 1.4), 0], s: [1.8, 1.8, 1.8], c: [LIME, VOLT, MAG, CYAN][k % 4] };
    }),
  ],
  /** Glowing support pylon for the girder shortcut (about 7.4 m tall). */
  le_neon_pylon: [
    { shape: 'cyl', p: [0, 3.6, 0], s: [1.3, 7.2, 1.3], c: STEEL, seg: 8 },
    { shape: 'torus', p: [0, 2, 0], s: [1.8, 1.8, 2.5], r: [90, 0, 0], c: CYAN, seg: 10 },
    { shape: 'torus', p: [0, 5, 0], s: [1.8, 1.8, 2.5], r: [90, 0, 0], c: MAG, seg: 10 },
    { shape: 'box', p: [0, 7.3, 0], s: [4, 0.4, 1.6], c: MAG },
  ],
  // ---- neon hazards ----
  le_disco_ball: [
    { shape: 'ico', p: [0, 1.9, 0], s: [3.8, 3.8, 3.8], c: 0xcfd6f5, seg: 1 },
    { shape: 'torus', p: [0, 1.9, 0], s: [4.3, 4.3, 4.3], r: [0, 90, 0], c: MAG, seg: 16 },
    { shape: 'torus', p: [0, 1.9, 0], s: [4.3, 4.3, 4.3], c: CYAN, seg: 16 },
    { shape: 'box', p: [0, 3.95, 0], s: [0.5, 0.4, 0.5], c: VOLT },
  ],
  le_neon_bumper: [
    { shape: 'cyl', p: [0, 0.5, 0], s: [2.8, 1.0, 2.8], c: VIOLET, seg: 14 },
    { shape: 'torus', p: [0, 0.6, 0], s: [3.3, 3.3, 3.3], r: [90, 0, 0], c: VOLT, seg: 14 },
    { shape: 'cyl', p: [0, 1.1, 0], s: [2.3, 0.3, 2.3], c: CYAN, seg: 14 },
    { shape: 'sphere', p: [0, 1.4, 0], s: [1.5, 0.8, 1.5], c: MAG, seg: 10 },
  ],

  // =====================================================================
  // jungle temple
  // =====================================================================
  le_giant_tree: [
    { shape: 'cyl', p: [0, 6, 0], s: [2.4, 12, 2.4], c: 0x7a5236, seg: 8 },
    { shape: 'wedge', p: [1.5, 1, 0], s: [0.5, 2, 2.2], r: [0, 90, 0], c: 0x6d4a30, mirror: true },
    { shape: 'wedge', p: [0, 1, 1.5], s: [0.5, 2, 2.2], r: [0, 180, 0], c: 0x6d4a30 },
    { shape: 'wedge', p: [0, 1, -1.5], s: [0.5, 2, 2.2], c: 0x6d4a30 },
    { shape: 'cyl', p: [1.6, 11, 0], s: [0.7, 4, 0.7], r: [0, 0, -45], c: 0x7a5236, seg: 6 },
    { shape: 'cyl', p: [-1.4, 12.5, 0.4], s: [0.6, 4, 0.6], r: [20, 0, 50], c: 0x7a5236, seg: 6 },
    { shape: 'ico', p: [0, 15, 0], s: [12, 5, 12], c: 0x2f8f3a, seg: 1 },
    { shape: 'ico', p: [3, 13.5, 1], s: [7, 3.5, 7], c: 0x3aa046, seg: 1 },
    { shape: 'ico', p: [-3, 14, -2], s: [7, 3.5, 7], c: 0x2a8034, seg: 1 },
    { shape: 'ico', p: [0, 17.5, 0], s: [7, 3, 7], c: 0x48b552, seg: 1 },
    { shape: 'box', p: [4, 9.5, 2], s: [0.15, 7, 0.15], c: 0x4caf50 },
    { shape: 'box', p: [-3.5, 10, 2.5], s: [0.15, 6, 0.15], c: 0x5cbf5a },
    { shape: 'box', p: [2, 10.5, -4], s: [0.15, 5, 0.15], c: 0x4caf50 },
    { shape: 'box', p: [-4.5, 9, -1], s: [0.15, 8, 0.15], c: 0x43a047 },
  ],
  le_kapok: [
    { shape: 'cyl', p: [0, 7, 0], s: [1.2, 14, 1.2], r: [0, 0, 3], c: 0x9c8a6a, seg: 7 },
    { shape: 'cone', p: [0, 14.5, 0], s: [9, 2.2, 9], c: 0x3c9a44, seg: 9 },
    { shape: 'sphere', p: [0, 15.8, 0], s: [8, 1.8, 8], c: 0x4fb455, seg: 9 },
    { shape: 'sphere', p: [0.5, 9, 0], s: [3, 1.2, 3], c: 0x3c9a44, seg: 7 },
  ],
  le_fern_big: [
    { shape: 'box', p: [1, 0.7, 0], s: [2.4, 0.08, 0.7], r: [0, 0, 30], c: 0x3fae4a },
    { shape: 'box', p: [-1, 0.7, 0], s: [2.4, 0.08, 0.7], r: [0, 0, -30], c: 0x36a043 },
    { shape: 'box', p: [0, 0.7, 1], s: [0.7, 0.08, 2.4], r: [-30, 0, 0], c: 0x4cbb55 },
    { shape: 'box', p: [0, 0.7, -1], s: [0.7, 0.08, 2.4], r: [30, 0, 0], c: 0x3fae4a },
    { shape: 'box', p: [0.75, 0.9, 0.75], s: [2.2, 0.08, 0.6], r: [0, -45, 35], c: 0x5cc860 },
    { shape: 'box', p: [-0.75, 0.9, -0.75], s: [2.2, 0.08, 0.6], r: [0, -45, -35], c: 0x5cc860 },
    { shape: 'sphere', p: [0, 0.3, 0], s: [0.8, 0.6, 0.8], c: 0x2e7d32, seg: 6 },
  ],
  le_banana_plant: [
    { shape: 'cyl', p: [0, 1.2, 0], s: [0.45, 2.4, 0.45], c: 0x7cb342, seg: 6 },
    { shape: 'box', p: [1.1, 2.7, 0], s: [2.4, 0.08, 1.0], r: [0, 0, 28], c: 0x66bb6a },
    { shape: 'box', p: [-1.1, 2.9, 0.2], s: [2.4, 0.08, 1.0], r: [0, 20, -32], c: 0x5aae5e },
    { shape: 'box', p: [0.1, 3.0, 1.1], s: [1.0, 0.08, 2.4], r: [-30, 0, 0], c: 0x76c779 },
    { shape: 'box', p: [-0.1, 2.6, -1.1], s: [1.0, 0.08, 2.4], r: [26, 15, 0], c: 0x66bb6a },
    { shape: 'sphere', p: [0.35, 2.1, 0.25], s: [0.5, 0.7, 0.5], c: 0xffd23f, seg: 6 },
  ],
  le_jungle_flower: [
    { shape: 'cyl', p: [0, 0.6, 0], s: [0.14, 1.2, 0.14], c: 0x3f9a3a, seg: 5 },
    { shape: 'sphere', p: [0.5, 1.25, 0], s: [0.9, 0.2, 0.55], r: [0, 0, 18], c: 0xff5a3c, seg: 6 },
    { shape: 'sphere', p: [-0.5, 1.25, 0], s: [0.9, 0.2, 0.55], r: [0, 0, -18], c: 0xff7043, seg: 6 },
    { shape: 'sphere', p: [0, 1.25, 0.5], s: [0.55, 0.2, 0.9], r: [-18, 0, 0], c: 0xff5a3c, seg: 6 },
    { shape: 'sphere', p: [0, 1.25, -0.5], s: [0.55, 0.2, 0.9], r: [18, 0, 0], c: 0xff7043, seg: 6 },
    { shape: 'sphere', p: [0, 1.35, 0], s: [0.35, 0.3, 0.35], c: 0xffd23f, seg: 6 },
    { shape: 'box', p: [0.4, 0.4, 0.1], s: [0.9, 0.06, 0.35], r: [0, 30, 20], c: 0x4caf50 },
  ],
  le_ruin_pillar: [
    { shape: 'box', p: [0, 0.3, 0], s: [2.2, 0.6, 2.2], c: 0x9a9a84 },
    { shape: 'cyl', p: [0, 2.6, 0], s: [1.5, 4, 1.5], c: 0xa8a68e, seg: 8 },
    { shape: 'cyl', p: [0.1, 4.9, 0], s: [1.5, 0.6, 1.5], r: [0, 0, 8], c: 0x9e9c84, seg: 8 },
    { shape: 'box', p: [0.8, 0.4, 1.2], s: [1.1, 0.8, 0.9], r: [0, 30, 0], c: 0x8f8d76 },
    { shape: 'sphere', p: [0, 5.2, 0], s: [1.6, 0.5, 1.6], c: 0x5cae4a, seg: 7 },
    { shape: 'box', p: [0.75, 3, 0.2], s: [0.12, 3, 0.12], c: 0x4caf50 },
  ],
  le_ruin_block: [
    { shape: 'box', p: [0, 0.6, 0], s: [3, 1.2, 2], r: [0, 10, 0], c: 0xa8a68e },
    { shape: 'box', p: [0.4, 1.7, 0.1], s: [2, 1, 1.6], r: [0, -15, 4], c: 0x9a9a84 },
    { shape: 'box', p: [-1.8, 0.4, 1.2], s: [1.2, 0.8, 1.1], r: [0, 40, 0], c: 0x8f8d76 },
    { shape: 'sphere', p: [0.3, 2.25, 0.1], s: [1.8, 0.4, 1.3], c: 0x5cae4a, seg: 7 },
  ],
  /** Friendly carved stone face (a happy temple guardian). */
  le_stone_idol: [
    { shape: 'box', p: [0, 0.5, 0], s: [3, 1, 3], c: 0x8f8d76 },
    { shape: 'box', p: [0, 3, 0], s: [2.6, 4, 2.2], c: 0xa8a68e },
    { shape: 'box', p: [0, 5.4, 0], s: [3, 0.8, 2.6], c: 0x9a9a84 },
    { shape: 'box', p: [0.6, 3.8, 1.12], s: [0.6, 0.4, 0.1], c: 0x3b3b30, mirror: true },
    { shape: 'box', p: [0, 3.1, 1.15], s: [0.4, 0.9, 0.3], c: 0x9a9a84 },
    { shape: 'box', p: [0, 2.2, 1.12], s: [1.4, 0.25, 0.1], c: 0x3b3b30 },
    { shape: 'box', p: [0.75, 2.35, 1.12], s: [0.25, 0.4, 0.1], r: [0, 0, 30], c: 0x3b3b30, mirror: true },
    { shape: 'sphere', p: [0, 5.9, 0], s: [2.6, 0.6, 2.2], c: 0x5cae4a, seg: 7 },
    { shape: 'sphere', p: [1.4, 4.4, 0.8], s: [0.6, 0.6, 0.6], c: 0x3ec46d, seg: 6 },
  ],
  /** Stepped temple pyramid with a shrine on top (origin at the base, ~22 m tall, 60 m wide). */
  le_pyramid: [
    { shape: 'box', p: [0, 1.5, 0], s: [60, 3, 60], c: 0x9a9a84 },
    { shape: 'box', p: [0, 4.5, 0], s: [50, 3, 50], c: 0xa8a68e },
    { shape: 'box', p: [0, 7.5, 0], s: [40, 3, 40], c: 0x9a9a84 },
    { shape: 'box', p: [0, 10.5, 0], s: [31, 3, 31], c: 0xa8a68e },
    { shape: 'box', p: [0, 13.5, 0], s: [23, 3, 23], c: 0x9a9a84 },
    { shape: 'wedge', p: [0, 7.5, 20.75], s: [8, 15, 18.5], c: 0xb8b498 },
    { shape: 'wedge', p: [0, 7.5, -20.75], s: [8, 15, 18.5], r: [0, 180, 0], c: 0xb8b498 },
    { shape: 'box', p: [0, 18, 0], s: [9, 6, 9], c: 0xb0ac90 },
    { shape: 'box', p: [0, 17, 4.55], s: [3, 4, 0.1], c: 0x2e3a2a },
    { shape: 'box', p: [0, 21.5, 0], s: [11, 1, 11], c: 0x3fae4a },
    { shape: 'cone', p: [0, 23.5, 0], s: [8, 3, 8], c: 0x9a9a84, seg: 4 },
    { shape: 'sphere', p: [0, 25.6, 0], s: [1.6, 1.6, 1.6], c: 0x2fd27a, seg: 8 },
    { shape: 'sphere', p: [20, 6.2, 18], s: [10, 3, 8], c: 0x4caf50, seg: 7 },
    { shape: 'sphere', p: [-22, 3.2, -16], s: [12, 3, 9], c: 0x43a047, seg: 7 },
    { shape: 'sphere', p: [-14, 12.2, 10], s: [7, 2, 6], c: 0x5cae4a, seg: 7 },
  ],
  /** Temple gateway spanning a 13 m road with 3 m shoulders (posts at ±11.6 m, sunk 3 m into the verge). Place with rot = road heading. */
  le_temple_gate: [
    { shape: 'box', p: [11.6, 2.5, 0], s: [2.4, 11, 2.4], c: 0xa8a68e, mirror: true },
    { shape: 'box', p: [11.6, 7.2, 0], s: [3, 0.8, 3], c: 0x8f8d76, mirror: true },
    { shape: 'box', p: [0, 8.8, 0], s: [27.4, 1.6, 3], c: 0x9a9a84 },
    { shape: 'box', p: [0, 10.2, 0], s: [20, 1.2, 2.4], c: 0xa8a68e },
    { shape: 'box', p: [0, 11.6, 0], s: [8, 1.6, 2], c: 0x9a9a84 },
    { shape: 'sphere', p: [0, 11.6, 1.05], s: [1.6, 1.6, 0.3], c: 0x2fd27a, seg: 8 },
    { shape: 'box', p: [4.5, 8.8, 1.55], s: [2, 0.6, 0.1], c: 0x2fd27a, mirror: true },
    { shape: 'sphere', p: [11.6, 8.2, 1.3], s: [1.6, 0.7, 1.2], c: 0x5cae4a, seg: 7, mirror: true },
    { shape: 'box', p: [8, 6.5, 1.6], s: [0.15, 4, 0.15], c: 0x4caf50 },
    { shape: 'box', p: [-6, 7, 1.6], s: [0.15, 3, 0.15], c: 0x4caf50 },
    { shape: 'box', p: [2, 6.8, 1.6], s: [0.15, 3.4, 0.15], c: 0x5cbf5a },
  ],
  /** Jade waterfall pouring off a mossy cliff into a pool (landmark). */
  le_waterfall: [
    { shape: 'box', p: [0, 9, -4], s: [26, 18, 8], c: 0x7d7a66 },
    { shape: 'box', p: [-9, 12, -3], s: [9, 24, 9], c: 0x8a8670 },
    { shape: 'box', p: [10, 10, -3], s: [8, 20, 10], c: 0x77735f },
    { shape: 'sphere', p: [0, 18.5, -4], s: [28, 4, 10], c: 0x3f9a44, seg: 8 },
    { shape: 'box', p: [0, 9, 0.2], s: [9, 18, 0.6], c: 0x7fe0d0 },
    { shape: 'box', p: [0, 9, 0.6], s: [5, 18, 0.3], c: 0xc8fff4 },
    { shape: 'cyl', p: [0, 0.15, 5], s: [18, 0.3, 12], c: 0x3fc8c0, seg: 14 },
    { shape: 'sphere', p: [0, 0.6, 1.5], s: [10, 1.4, 3], c: 0xe8fffb, seg: 8 },
    { shape: 'ico', p: [-8, 0.8, 7], s: [3, 1.6, 2.5], c: 0x8a8670 },
    { shape: 'ico', p: [8, 0.8, 8], s: [3.5, 1.8, 2.5], c: 0x8a8670 },
  ],
  /** 20 m stretch of jungle river (long axis along Z — place with rot = river heading). */
  le_river: [
    { shape: 'box', p: [0, 0.1, 0], s: [12, 0.2, 20.5], c: 0x3fc8c0 },
    { shape: 'box', p: [2, 0.22, 3], s: [1.5, 0.05, 6], c: 0x9ff3ea },
    { shape: 'box', p: [-3, 0.22, -5], s: [1.2, 0.05, 5], c: 0x9ff3ea },
  ],
  le_bridge_post: [
    { shape: 'cyl', p: [0, 4, 0], s: [0.6, 8, 0.6], c: 0x8d6e63, seg: 6 },
    { shape: 'sphere', p: [0, 8.1, 0], s: [0.8, 0.5, 0.8], c: 0x7a5236, seg: 6 },
    { shape: 'torus', p: [0, 7.6, 0], s: [0.9, 0.9, 1.4], r: [90, 0, 0], c: 0xd9c08a, seg: 8 },
    { shape: 'box', p: [0, 6, 0.4], s: [0.12, 4, 0.12], c: 0x4caf50 },
  ],
  // ---- jungle hazards ----
  le_stone_ball: [
    { shape: 'ico', p: [0, 1.9, 0], s: [3.8, 3.8, 3.8], c: 0xa8a68e, seg: 1 },
    { shape: 'torus', p: [0, 1.9, 0], s: [4.1, 4.1, 5], r: [0, 90, 0], c: 0x7d7a66, seg: 14 },
    { shape: 'sphere', p: [0.8, 3.2, 0.9], s: [1.4, 0.6, 1.2], c: 0x5cae4a, seg: 6 },
    { shape: 'box', p: [0, 1.9, 1.95], s: [0.8, 0.8, 0.1], c: 0x2fd27a },
  ],

  // =====================================================================
  // cloud castle (no ground: these float, most have their own little rock island)
  // =====================================================================
  le_castle_tower: [
    { shape: 'cone', p: [0, -4, 0], s: [10, 8, 10], r: [180, 0, 0], c: ROCK, seg: 7 },
    { shape: 'cyl', p: [0, 0.1, 0], s: [10.2, 0.4, 10.2], c: 0x9be38a, seg: 9 },
    { shape: 'cyl', p: [0, 7, 0], s: [6, 14, 6], c: 0xf6f2ff, seg: 10 },
    { shape: 'cyl', p: [0, 14.2, 0], s: [6.8, 0.7, 6.8], c: GOLD, seg: 10 },
    { shape: 'cone', p: [0, 17.6, 0], s: [7.6, 6.2, 7.6], c: 0x5a7dff, seg: 10 },
    { shape: 'box', p: [0, 9.5, 3.02], s: [1, 1.8, 0.1], c: 0x5a7dff },
    { shape: 'box', p: [0, 5, 3.02], s: [1, 1.8, 0.1], c: 0x5a7dff },
    { shape: 'box', p: [3.02, 7.5, 0], s: [0.1, 1.8, 1], c: 0x5a7dff, mirror: true },
    { shape: 'cyl', p: [0, 22, 0], s: [0.16, 3, 0.16], c: 0xffffff, seg: 4 },
    { shape: 'box', p: [0.75, 22.9, 0], s: [1.5, 0.8, 0.05], c: 0xff5fa2 },
  ],
  le_castle_tower2: [
    { shape: 'cone', p: [0, -4, 0], s: [10, 8, 10], r: [180, 0, 0], c: ROCK, seg: 7 },
    { shape: 'cyl', p: [0, 0.1, 0], s: [10.2, 0.4, 10.2], c: 0x9be38a, seg: 9 },
    { shape: 'box', p: [0, 6, 0], s: [6, 12, 6], c: 0xfff4e6 },
    { shape: 'box', p: [2.6, 12.6, 2.6], s: [1, 1.2, 1], c: 0xfff4e6, mirror: true },
    { shape: 'box', p: [2.6, 12.6, -2.6], s: [1, 1.2, 1], c: 0xfff4e6, mirror: true },
    { shape: 'box', p: [0, 12.6, 2.6], s: [1, 1.2, 1], c: 0xfff4e6 },
    { shape: 'box', p: [0, 12.6, -2.6], s: [1, 1.2, 1], c: 0xfff4e6 },
    { shape: 'cone', p: [0, 15.3, 0], s: [6.4, 4.6, 6.4], r: [0, 45, 0], c: 0xff7eb6, seg: 4 },
    { shape: 'sphere', p: [0, 17.9, 0], s: [0.9, 0.9, 0.9], c: GOLD, seg: 8 },
    { shape: 'box', p: [0, 7, 3.02], s: [1.2, 2, 0.1], c: 0x8a6cff },
    { shape: 'box', p: [3.02, 7, 0], s: [0.1, 2, 1.2], c: 0x8a6cff, mirror: true },
  ],
  /** Long castle wing with a peaked roof (30 m along Z). */
  le_castle_hall: [
    { shape: 'box', p: [0, -3, 0], s: [12, 6, 32], c: ROCK },
    { shape: 'box', p: [0, 4, 0], s: [10, 8, 30], c: 0xf6f2ff },
    { shape: 'wedge', p: [0, 10, 3.75], s: [10.6, 4, 7.5], r: [0, 180, 0], c: 0x5a7dff },
    { shape: 'wedge', p: [0, 10, -3.75], s: [10.6, 4, 7.5], c: 0x5a7dff },
    { shape: 'wedge', p: [0, 10, 11.25], s: [10.6, 4, 7.5], r: [0, 180, 0], c: 0x6f8dff },
    { shape: 'wedge', p: [0, 10, -11.25], s: [10.6, 4, 7.5], c: 0x6f8dff },
    { shape: 'box', p: [5.05, 4.5, 8], s: [0.1, 2.4, 1.4], c: 0x5a7dff, mirror: true },
    { shape: 'box', p: [5.05, 4.5, 0], s: [0.1, 2.4, 1.4], c: 0x5a7dff, mirror: true },
    { shape: 'box', p: [5.05, 4.5, -8], s: [0.1, 2.4, 1.4], c: 0x5a7dff, mirror: true },
    { shape: 'box', p: [0, 8.2, 0], s: [10.4, 0.5, 30.4], c: GOLD },
  ],
  /** The Great Keep: a huge central tower with four turrets (landmark). */
  le_keep: [
    { shape: 'cone', p: [0, -9, 0], s: [30, 18, 30], r: [180, 0, 0], c: ROCK, seg: 8 },
    { shape: 'cyl', p: [0, 0.2, 0], s: [30.4, 0.6, 30.4], c: 0x9be38a, seg: 12 },
    { shape: 'cyl', p: [0, 14, 0], s: [14, 28, 14], c: 0xf6f2ff, seg: 12 },
    { shape: 'cyl', p: [0, 28.4, 0], s: [15.4, 1, 15.4], c: GOLD, seg: 12 },
    { shape: 'cone', p: [0, 36, 0], s: [16, 14, 16], c: 0x5a7dff, seg: 12 },
    { shape: 'sphere', p: [0, 43.6, 0], s: [2, 2, 2], c: GOLD, seg: 8 },
    { shape: 'cyl', p: [8, 9, 8], s: [5, 18, 5], c: 0xfff4e6, seg: 8, mirror: true },
    { shape: 'cyl', p: [8, 9, -8], s: [5, 18, 5], c: 0xfff4e6, seg: 8, mirror: true },
    { shape: 'cone', p: [8, 20.5, 8], s: [6, 5, 6], c: 0xff7eb6, seg: 8, mirror: true },
    { shape: 'cone', p: [8, 20.5, -8], s: [6, 5, 6], c: 0xff7eb6, seg: 8, mirror: true },
    { shape: 'box', p: [0, 18, 7.05], s: [3, 5, 0.1], c: 0x5a7dff },
    { shape: 'box', p: [0, 6, 7.05], s: [4, 6, 0.1], c: 0x8a6cff },
    { shape: 'box', p: [0, 34, 8.5], s: [5, 3, 0.1], c: 0xff5fa2 },
  ],
  le_cloud_puff: [
    { shape: 'sphere', p: [0, 0, 0], s: [9, 4.5, 7], c: 0xffffff, seg: 9 },
    { shape: 'sphere', p: [3.5, 0.8, 1], s: [6, 4, 5], c: 0xf7fbff, seg: 8 },
    { shape: 'sphere', p: [-3.6, 0.5, -0.5], s: [6, 3.6, 5], c: 0xf2f7ff, seg: 8 },
    { shape: 'sphere', p: [0.5, 2, -0.5], s: [5, 3.5, 4.5], c: 0xffffff, seg: 8 },
  ],
  le_cloud_puff2: [
    { shape: 'sphere', p: [0, 0, 0], s: [8, 4, 6.5], c: 0xffe8f6, seg: 9 },
    { shape: 'sphere', p: [3, 0.9, 0.8], s: [5.4, 3.6, 4.6], c: 0xfff0fa, seg: 8 },
    { shape: 'sphere', p: [-3.2, 0.4, -0.4], s: [5.2, 3.2, 4.4], c: 0xf3e8ff, seg: 8 },
  ],
  /** Golden gate arch over a 13 m road with drop edges (posts at ±9.4 m hang down below the deck). */
  le_golden_gate: [
    { shape: 'box', p: [9.4, 3, 0], s: [1.6, 14, 1.6], c: 0xfff4e6, mirror: true },
    { shape: 'box', p: [9.4, 0.2, 0], s: [2, 0.6, 2], c: GOLD, mirror: true },
    { shape: 'cone', p: [9.4, 11.4, 0], s: [2.4, 2.8, 2.4], c: 0x5a7dff, seg: 8, mirror: true },
    { shape: 'box', p: [0, 9.2, 0], s: [20.4, 1.2, 1.2], c: GOLD },
    ...hoop(0, 9.2, 5, 14, 0.7, 0.9, GOLD).filter((p) => (p.p?.[1] ?? 0) > 9.3),
    { shape: 'sphere', p: [0, 14.4, 0], s: [1.6, 1.6, 1.6], c: 0xff5fa2, seg: 8 },
    { shape: 'box', p: [4.5, 7.4, 0], s: [2.2, 2.6, 0.1], c: 0x5a7dff, mirror: true },
  ],
  le_banner: [
    { shape: 'cyl', p: [0, 2, 0], s: [0.3, 10, 0.3], c: 0xfff4e6, seg: 5 },
    { shape: 'sphere', p: [0, 7.2, 0], s: [0.6, 0.6, 0.6], c: GOLD, seg: 6 },
    { shape: 'box', p: [0, 6.6, 0.75], s: [0.08, 0.3, 1.5], c: GOLD },
    { shape: 'box', p: [0, 4.9, 0.75], s: [0.06, 3.2, 1.3], c: 0xff5fa2 },
    { shape: 'wedge', p: [0, 2.9, 0.75], s: [0.06, 0.8, 1.3], r: [180, 0, 0], c: 0xff5fa2 },
  ],
  le_sky_balloon: [
    { shape: 'sphere', p: [0, 6, 0], s: [6, 7, 6], c: 0xffd23f, seg: 10 },
    { shape: 'torus', p: [0, 6, 0], s: [6.2, 6.2, 7], r: [90, 0, 0], c: 0xff5fa2, seg: 14 },
    { shape: 'cone', p: [0, 2.4, 0], s: [3, 1.6, 3], r: [180, 0, 0], c: 0xffb300, seg: 8 },
    { shape: 'box', p: [0, 0.4, 0], s: [1.4, 1, 1.4], c: 0x8d6e63 },
  ],
  le_float_island: [
    { shape: 'cone', p: [0, -3, 0], s: [9, 6, 9], r: [180, 0, 0], c: ROCK, seg: 7 },
    { shape: 'cyl', p: [0, 0.1, 0], s: [9.2, 0.4, 9.2], c: 0x9be38a, seg: 8 },
    { shape: 'cyl', p: [1.5, 1.2, 0.5], s: [0.5, 2.4, 0.5], c: 0x8d6e63, seg: 5 },
    { shape: 'sphere', p: [1.5, 3, 0.5], s: [3, 2.6, 3], c: 0x7ed957, seg: 7 },
    { shape: 'sphere', p: [-2, 0.6, -1], s: [1.6, 1.2, 1.6], c: 0xff9fd0, seg: 6 },
  ],
  // ---- cloud castle hazards ----
  le_bell: [
    { shape: 'cyl', p: [0, 2.6, 0], s: [0.3, 3.2, 0.3], c: GOLD, seg: 6 },
    { shape: 'sphere', p: [0, 1.0, 0], s: [2.6, 1.8, 2.6], c: GOLD, seg: 10 },
    { shape: 'cyl', p: [0, 0.1, 0], s: [2.6, 1.8, 2.6], c: GOLD, seg: 12 },
    { shape: 'torus', p: [0, -0.8, 0], s: [3.4, 3.4, 4], r: [90, 0, 0], c: 0xffe27a, seg: 14 },
    { shape: 'sphere', p: [0, -1.0, 0], s: [0.8, 0.8, 0.8], c: 0xff5fa2, seg: 6 },
  ],
  le_wind_vent: [
    { shape: 'cyl', p: [0, 0.12, 0], s: [4.6, 0.24, 4.6], c: 0xd8e4ff, seg: 14 },
    { shape: 'torus', p: [0, 0.25, 0], s: [4.4, 4.4, 3], r: [90, 0, 0], c: GOLD, seg: 14 },
    { shape: 'cyl', p: [0, 0.2, 0], s: [3.2, 0.2, 3.2], c: 0x8fd8ff, seg: 12 },
    { shape: 'box', p: [0, 0.3, 0], s: [3.2, 0.1, 0.3], r: [0, 30, 0], c: 0xffffff },
    { shape: 'box', p: [0, 0.3, 0], s: [3.2, 0.1, 0.3], r: [0, 90, 0], c: 0xffffff },
    { shape: 'box', p: [0, 0.3, 0], s: [3.2, 0.1, 0.3], r: [0, 150, 0], c: 0xffffff },
  ],

  // =====================================================================
  // prism parkway (rainbow finale, deep space — origins are at the object's centre unless noted)
  // =====================================================================
  /** Ringed planet (radius 20 m, origin at its centre). */
  le_planet_ring: [
    { shape: 'sphere', p: [0, 0, 0], s: [40, 40, 40], c: 0xff9f6b, seg: 18 },
    { shape: 'sphere', p: [0, 4, 0], s: [40.4, 6, 40.4], c: 0xffc48a, seg: 18 },
    { shape: 'sphere', p: [0, -8, 0], s: [39.6, 5, 39.6], c: 0xf27a5a, seg: 18 },
    { shape: 'torus', p: [0, 0, 0], s: [78, 78, 12], r: [78, 0, 14], c: 0xffe1a8, seg: 32 },
    { shape: 'torus', p: [0, 0, 0], s: [64, 64, 8], r: [78, 0, 14], c: 0xb8a6ff, seg: 32 },
  ],
  /** Small cratered planet with a little moon (radius 9 m, origin at its centre). */
  le_planet_small: [
    { shape: 'sphere', p: [0, 0, 0], s: [18, 18, 18], c: 0x6be0ff, seg: 14 },
    { shape: 'sphere', p: [4, 5, 6.4], s: [4, 4, 1.4], r: [-30, 30, 0], c: 0x4cc4ee, seg: 8 },
    { shape: 'sphere', p: [-5, -2, 6.6], s: [3, 3, 1.2], r: [10, -35, 0], c: 0x4cc4ee, seg: 8 },
    { shape: 'sphere', p: [-2, 7, -5.5], s: [3.4, 3.4, 1.2], r: [50, 0, 0], c: 0x9df0ff, seg: 8 },
    { shape: 'sphere', p: [16, 7, 0], s: [4, 4, 4], c: 0xfff0b0, seg: 8 },
  ],
  /** Cluster of glowing rainbow crystals on a little asteroid (origin at the base of the crystals). */
  le_crystal_cluster: [
    { shape: 'ico', p: [0, -2, 0], s: [9, 5, 8], c: 0x5a4a8a, seg: 0 },
    { shape: 'cyl', p: [0, 3, 0], s: [2.2, 6, 2.2], c: 0x7a5cff, seg: 6 },
    { shape: 'cone', p: [0, 7.2, 0], s: [2.2, 2.4, 2.2], c: 0xb8a6ff, seg: 6 },
    { shape: 'cyl', p: [2, 2, 1], s: [1.6, 4, 1.6], r: [0, 0, -22], c: 0x35d6ff, seg: 6 },
    { shape: 'cone', p: [2.75, 4.85, 1], s: [1.6, 1.8, 1.6], r: [0, 0, -22], c: 0xa8f4ff, seg: 6 },
    { shape: 'cyl', p: [-1.8, 1.6, 1.2], s: [1.4, 3.2, 1.4], r: [18, 0, 18], c: 0xff5fd2, seg: 6 },
    { shape: 'cone', p: [-2.4, 3.9, 1.9], s: [1.4, 1.6, 1.4], r: [18, 0, 18], c: 0xffb0ec, seg: 6 },
    { shape: 'cyl', p: [0.6, 1.4, -2], s: [1.3, 2.8, 1.3], r: [-20, 0, -6], c: 0xffe14d, seg: 6 },
    { shape: 'cone', p: [0.75, 3.5, -2.75], s: [1.3, 1.4, 1.3], r: [-20, 0, -6], c: 0xfff3a8, seg: 6 },
    { shape: 'cyl', p: [-1.6, 1.2, -1.4], s: [1.1, 2.4, 1.1], r: [-14, 0, 20], c: 0x5dff8a, seg: 6 },
    { shape: 'cone', p: [-2.05, 2.95, -1.85], s: [1.1, 1.2, 1.1], r: [-14, 0, 20], c: 0xb0ffc8, seg: 6 },
  ],
  /** The Prism Spire: a tall hexagonal crystal tower in rainbow bands (landmark, origin at its base, ~46 m tall). */
  le_crystal_spire: [
    { shape: 'ico', p: [0, -6, 0], s: [26, 14, 24], c: 0x4a3c78, seg: 1 },
    { shape: 'cyl', p: [0, 3, 0], s: [12, 6, 12], c: 0xff5f6d, seg: 6 },
    { shape: 'cyl', p: [0, 9, 0], s: [11, 6, 11], c: 0xff9f43, seg: 6 },
    { shape: 'cyl', p: [0, 15, 0], s: [10, 6, 10], c: 0xffe14d, seg: 6 },
    { shape: 'cyl', p: [0, 21, 0], s: [9, 6, 9], c: 0x5dff8a, seg: 6 },
    { shape: 'cyl', p: [0, 27, 0], s: [8, 6, 8], c: 0x35d6ff, seg: 6 },
    { shape: 'cyl', p: [0, 33, 0], s: [7, 6, 7], c: 0x7a5cff, seg: 6 },
    { shape: 'cone', p: [0, 40, 0], s: [7, 8, 7], c: 0xd08bff, seg: 6 },
    { shape: 'sphere', p: [0, 45.5, 0], s: [3, 3, 3], c: 0xffffff, seg: 8 },
    { shape: 'cyl', p: [9, 4, 3], s: [3, 10, 3], r: [0, 0, -15], c: 0x35d6ff, seg: 6 },
    { shape: 'cone', p: [10.6, 10, 3], s: [3, 3, 3], r: [0, 0, -15], c: 0xa8f4ff, seg: 6 },
    { shape: 'cyl', p: [-8, 3, -4], s: [3, 8, 3], r: [10, 0, 14], c: 0xff5fd2, seg: 6 },
    { shape: 'cone', p: [-9.1, 8.3, -4.8], s: [3, 3, 3], r: [10, 0, 14], c: 0xffb0ec, seg: 6 },
  ],
  /** Rainbow ring the road passes through (radius 11 m in the XY plane, origin at the ring centre). Place with rot = road heading. */
  le_prism_ring: hoop(0, 0, 11, 21, 1.1, 1.4, (k) => [0xff5f6d, 0xff9f43, 0xffe14d, 0x5dff8a, 0x35d6ff, 0x7a5cff, 0xd08bff][k % 7]),
  /** Floating glow lantern (double pyramid), origin at its centre. */
  le_star_buoy: [
    { shape: 'cone', p: [0, 0.9, 0], s: [1.6, 1.8, 1.6], c: 0xfff3a8, seg: 4 },
    { shape: 'cone', p: [0, -0.9, 0], s: [1.6, 1.8, 1.6], r: [180, 0, 0], c: 0xffe14d, seg: 4 },
    { shape: 'torus', p: [0, 0, 0], s: [2.6, 2.6, 2.6], r: [90, 0, 0], c: 0xff5fd2, seg: 12 },
  ],
  le_asteroid: [
    { shape: 'ico', p: [0, 0, 0], s: [6, 4.4, 5], c: 0x6a5f86, seg: 0 },
    { shape: 'ico', p: [2.6, 1, 1.4], s: [3, 2.4, 2.6], c: 0x7d7299, seg: 0 },
    { shape: 'ico', p: [-2.2, -0.8, -1], s: [2.4, 2, 2.2], c: 0x5a5076, seg: 0 },
    { shape: 'cone', p: [0.5, 2.6, 0], s: [1, 1.6, 1], c: 0x35d6ff, seg: 6 },
  ],
  le_nebula_puff: [
    { shape: 'sphere', p: [0, 0, 0], s: [22, 10, 16], c: 0x7a3fd0, seg: 9 },
    { shape: 'sphere', p: [8, 2, 3], s: [14, 8, 12], c: 0xd04fb8, seg: 8 },
    { shape: 'sphere', p: [-8, 1, -2], s: [14, 7, 11], c: 0x3f6fd0, seg: 8 },
  ],
  le_comet: [
    { shape: 'ico', p: [0, 0, 0], s: [4, 4, 4], c: 0xe8f8ff, seg: 1 },
    { shape: 'cone', p: [0, 0, -9], s: [4.4, 16, 4.4], r: [-90, 0, 0], c: 0x8fd8ff, seg: 8 },
    { shape: 'cone', p: [0, 0, -7], s: [2.6, 11, 2.6], r: [-90, 0, 0], c: 0xffffff, seg: 8 },
  ],
  // ---- prism hazards ----
  le_crystal_bumper: [
    { shape: 'cyl', p: [0, 0.5, 0], s: [2.8, 1.0, 2.8], c: 0x7a5cff, seg: 6 },
    { shape: 'cyl', p: [0, 1.1, 0], s: [2.3, 0.3, 2.3], c: 0xffe14d, seg: 6 },
    { shape: 'cone', p: [0, 1.9, 0], s: [1.8, 1.4, 1.8], c: 0x35d6ff, seg: 6 },
    { shape: 'torus', p: [0, 0.6, 0], s: [3.3, 3.3, 3.3], r: [90, 0, 0], c: 0xff5fd2, seg: 12 },
  ],
};
