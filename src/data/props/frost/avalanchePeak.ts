import type { ModelPart } from '../../types';

/**
 * Scenery recipes for Avalanche Peak, the Frost Cup finale (names are globally unique: prefixed `ap_`).
 * Origins sit on the ground, +Y up; recipes that face somewhere face +Z. All low-poly (≤ 12 parts, few segments).
 */
export const AVALANCHE_PEAK_PROPS: Record<string, ModelPart[]> = {
  // Landmark: the ski lodge at the start — a big timber chalet with a snowy roof, glowing windows and a sign.
  ap_lodge: [
    { shape: 'box', p: [0, 0.6, 0], s: [16.4, 1.2, 10.4], c: 0x8a8f9c },
    { shape: 'box', p: [0, 4, 0], s: [16, 5.6, 10], c: 0x9a5f3c },
    { shape: 'wedge', p: [0, 8.9, 2.9], s: [17.6, 4.2, 5.8], c: 0xf6f8ff },
    { shape: 'wedge', p: [0, 8.9, -2.9], s: [17.6, 4.2, 5.8], r: [0, 180, 0], c: 0xf6f8ff },
    { shape: 'box', p: [0, 4.4, 5.02], s: [12, 1.6, 0.12], c: 0xffcf7a },
    { shape: 'box', p: [0, 2.7, 5.05], s: [2.2, 3, 0.14], c: 0x5a3622 },
    { shape: 'box', p: [0, 6, 5.2], s: [7, 1.3, 0.25], c: 0xff6a3c },
    { shape: 'box', p: [0, 6, 5.24], s: [6.2, 0.3, 0.25], c: 0xffffff },
    { shape: 'box', p: [5, 9.8, -2.2], s: [1.6, 4.5, 1.6], c: 0x8a8f9c },
    { shape: 'box', p: [5, 12.1, -2.2], s: [1.9, 0.4, 1.9], c: 0xffffff },
    { shape: 'sphere', p: [5.3, 13.3, -2.1], s: [1.6, 1.3, 1.6], c: 0xe8e6ee, seg: 6 },
    { shape: 'sphere', p: [5.8, 14.6, -1.9], s: [1.1, 0.9, 1.1], c: 0xf2f0f6, seg: 6 },
  ],
  // Landmark: the summit flag on a stone cairn at the top of the ridge.
  ap_summitflag: [
    { shape: 'ico', p: [0, 1.1, 0], s: [3.4, 2.6, 3], c: 0x7d8597 },
    { shape: 'ico', p: [0.2, 2.5, 0.1], s: [2.4, 1.8, 2.2], c: 0x8f97a8 },
    { shape: 'ico', p: [0.2, 3.2, 0.1], s: [2.2, 0.7, 2], c: 0xffffff },
    { shape: 'cyl', p: [0, 8.2, 0], s: [0.22, 11, 0.22], c: 0xe8e8f0, seg: 6 },
    { shape: 'box', p: [2.15, 12.2, 0], s: [4.2, 2.6, 0.08], c: 0xff5a3c },
    { shape: 'box', p: [2.15, 12.2, 0], s: [4.22, 0.7, 0.1], c: 0xffd23f },
    { shape: 'sphere', p: [0, 13.85, 0], s: [0.6, 0.6, 0.6], c: 0xffd23f, seg: 6 },
    { shape: 'cone', p: [1.5, 1.4, 1.1], s: [0.8, 1.9, 0.8], r: [0, 0, -15], c: 0x9fe3ff, seg: 5 },
  ],
  // Landmark: the finish arch over the run-in — timber posts, snowy beam, a big banner and flags on top.
  ap_arch: [
    { shape: 'box', p: [12.6, 0.5, 0], s: [2.2, 1, 2.2], c: 0x8a8f9c, mirror: true },
    { shape: 'box', p: [12.6, 4.8, 0], s: [1.4, 9, 1.4], c: 0x8d5a3a, mirror: true },
    { shape: 'box', p: [0, 9.6, 0], s: [27, 1.4, 1.6], c: 0x6d4228 },
    { shape: 'box', p: [0, 10.5, 0], s: [27.6, 0.5, 2], c: 0xffffff },
    { shape: 'box', p: [0, 7.5, 0], s: [17, 2.6, 0.25], c: 0xff6a3c },
    { shape: 'box', p: [0, 7.5, 0], s: [17.2, 0.5, 0.3], c: 0xffffff },
    { shape: 'cyl', p: [12.6, 12.3, 0], s: [0.14, 3.2, 0.14], c: 0xdddddd, seg: 4, mirror: true },
    { shape: 'box', p: [13.6, 13.2, 0], s: [2, 1.2, 0.06], c: 0x3fa7ff, mirror: true },
  ],
  // Landmark: the cable car across the great valley (90 m span, cable 37 m up).
  ap_cableway: [
    { shape: 'box', p: [45, 0.6, 0], s: [4, 1.2, 4], c: 0x9aa0ad, mirror: true },
    { shape: 'box', p: [45, 19, 0], s: [1.8, 38, 1.8], c: 0x5a6478, mirror: true },
    { shape: 'box', p: [45, 38, 0], s: [1.2, 1.2, 7], c: 0xff6a3c, mirror: true },
    { shape: 'box', p: [0, 37.4, 2.8], s: [90, 0.16, 0.16], c: 0x2b2b3a },
    { shape: 'box', p: [0, 37.4, -2.8], s: [90, 0.16, 0.16], c: 0x2b2b3a },
    { shape: 'box', p: [-14, 33.2, 2.8], s: [3.4, 2.8, 2.6], c: 0xff4d4d },
    { shape: 'cyl', p: [-14, 35.9, 2.8], s: [0.12, 2.8, 0.12], c: 0x2b2b3a, seg: 4 },
    { shape: 'box', p: [18, 33.2, -2.8], s: [3.4, 2.8, 2.6], c: 0xffc83d },
    { shape: 'cyl', p: [18, 35.9, -2.8], s: [0.12, 2.8, 0.12], c: 0x2b2b3a, seg: 4 },
  ],
  // Start gate of the ski run shortcut (spans X, posts at ±5.4; origin at the ski-run surface).
  ap_skigate: [
    { shape: 'cyl', p: [5.4, 1.5, 0], s: [0.5, 9, 0.5], c: 0xffffff, seg: 6, mirror: true },
    { shape: 'cyl', p: [5.4, 2.4, 0], s: [0.56, 1.2, 0.56], c: 0xff6a3c, seg: 6, mirror: true },
    { shape: 'box', p: [0, 5.6, 0], s: [11.4, 1.6, 0.2], c: 0xff6a3c },
    { shape: 'box', p: [-2.6, 5.6, 0], s: [1.6, 1.6, 0.24], c: 0xffffff },
    { shape: 'box', p: [2.6, 5.6, 0], s: [1.6, 1.6, 0.24], c: 0xffffff },
    { shape: 'cone', p: [5.4, 6.6, 0], s: [0.9, 1, 0.9], c: 0x3fa7ff, seg: 6, mirror: true },
  ],
  // Snowy rock cliff under the ends of the glider leap (top ≈ 37 m at scale 1).
  ap_cliff: [
    { shape: 'ico', p: [0, 17, 0], s: [34, 36, 26], c: 0x7f8aa0 },
    { shape: 'ico', p: [0, 34, 0], s: [26, 8, 20], c: 0xf6f8ff },
    { shape: 'ico', p: [12, 12, 7], s: [22, 26, 18], c: 0x6f7a90 },
    { shape: 'ico', p: [-12, 10, -6], s: [20, 22, 16], c: 0x8792a8 },
    { shape: 'ico', p: [12, 22.5, 7], s: [14, 5, 12], c: 0xeef3ff },
    { shape: 'cone', p: [-8, 21, 9], s: [2.4, 6, 2.4], c: 0x9fe3ff, seg: 5 },
  ],
  // Long snow ridge under the ski run (top 12 m at scale 1, long axis along Z).
  ap_snowridge: [
    { shape: 'sphere', p: [0, 0, 0], s: [18, 24, 46], c: 0xf4f7ff, seg: 8 },
    { shape: 'sphere', p: [6, -1, 10], s: [12, 14, 20], c: 0xe8eefc, seg: 7 },
    { shape: 'sphere', p: [-6, -1, -11], s: [10, 12, 18], c: 0xeef2fd, seg: 7 },
    { shape: 'ico', p: [-7, 3, 6], s: [5, 4, 4.5], c: 0x8792a8 },
    { shape: 'ico', p: [-7, 4.4, 6], s: [4, 1.4, 3.6], c: 0xffffff },
  ],
  // Backdrop: the giant snowy massif towering over the summit ridge.
  ap_bigpeak: [
    { shape: 'cone', p: [0, 47.5, 0], s: [170, 95, 170], c: 0x8e9cbc, seg: 8 },
    { shape: 'cone', p: [0, 74.35, 0], s: [74, 41.3, 74], c: 0xf8faff, seg: 8 },
    { shape: 'cone', p: [70, 30, 40], s: [100, 60, 100], c: 0x7f8eaf, seg: 7 },
    { shape: 'cone', p: [70, 48, 40], s: [40, 24, 40], c: 0xf4f7ff, seg: 7 },
    { shape: 'cone', p: [-65, 23, 30], s: [80, 46, 80], c: 0x8696b6, seg: 7 },
    { shape: 'cone', p: [-65, 37.35, 30], s: [30, 17.3, 30], c: 0xf4f7ff, seg: 7 },
  ],
  // A frozen pond down in the valley.
  ap_frozenpond: [
    { shape: 'cyl', p: [0, 0.15, 0], s: [34, 0.3, 22], c: 0xf4f8ff, seg: 10 },
    { shape: 'cyl', p: [0, 0.2, 0], s: [30, 0.32, 18], c: 0xa8dcff, seg: 10 },
    { shape: 'cyl', p: [5, 0.22, -2], s: [10, 0.34, 6], c: 0xd4f0ff, seg: 8 },
  ],
  // Feather flags lining the run-in to the lodge.
  ap_bannerflag: [
    { shape: 'box', p: [0, 0.1, 0], s: [0.6, 0.2, 0.6], c: 0x555566 },
    { shape: 'cyl', p: [0, 2.7, 0], s: [0.12, 5.4, 0.12], c: 0xdddddd, seg: 4 },
    { shape: 'box', p: [0.6, 3.4, 0], s: [1.1, 3.6, 0.06], c: 0xff6a3c },
    { shape: 'box', p: [0.6, 4.6, 0], s: [1.12, 0.4, 0.08], c: 0xffffff },
  ],
  ap_bannerflag2: [
    { shape: 'box', p: [0, 0.1, 0], s: [0.6, 0.2, 0.6], c: 0x555566 },
    { shape: 'cyl', p: [0, 2.7, 0], s: [0.12, 5.4, 0.12], c: 0xdddddd, seg: 4 },
    { shape: 'box', p: [0.6, 3.4, 0], s: [1.1, 3.6, 0.06], c: 0x3fa7ff },
    { shape: 'box', p: [0.6, 4.6, 0], s: [1.12, 0.4, 0.08], c: 0xffffff },
  ],
  // A friendly snow groomer parked by the lodge.
  ap_snowcat: [
    { shape: 'box', p: [0, 1.4, 0], s: [3.2, 1.4, 4.6], c: 0xff6a3c },
    { shape: 'box', p: [0, 2.9, -0.6], s: [2.6, 1.8, 2], c: 0xff6a3c },
    { shape: 'box', p: [0, 3.1, -0.4], s: [2.7, 0.9, 1.6], c: 0x9fe3ff },
    { shape: 'box', p: [1.6, 0.55, 0], s: [0.9, 1.1, 5.2], c: 0x2b2b3a, mirror: true },
    { shape: 'box', p: [0, 0.8, 2.9], s: [4.2, 1.2, 0.3], r: [-20, 0, 0], c: 0xd0d6e0 },
    { shape: 'box', p: [0, 3.9, -0.2], s: [2.2, 0.2, 0.3], c: 0xffd23f },
  ],
};
