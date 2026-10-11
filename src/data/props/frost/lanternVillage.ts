import type { ModelPart } from '../../types';

// Lantern Village: a snowy mountain village at night during the winter lantern festival. Every recipe keeps to
// ≤ 12 parts with low segment counts. Glowing windows and paper lanterns are just bright warm colours.
const SNOW = 0xf4f8ff;
const GLOW = 0xfff0b0; // warm lit window
const GLOW2 = 0xffe08a; // amber lit window
const RED = 0xff8a70; // paper lanterns (light tints so they read as lit at night)
const GOLD = 0xffd970;
const PINK = 0xffb0e8;
const BLUE = 0xa8ecff;
const IRON = 0x3a3040;
const STONE = 0x6a6478;

/** Scenery recipes for Lantern Village (names are globally unique: every one starts with `lv_`). Fronts face +Z. */
export const LANTERN_VILLAGE_PROPS: Record<string, ModelPart[]> = {
  // Two-storey red-brick house with a snowy roof, glowing windows, fairy lights and a wreath on the door.
  lv_house_red: [
    { shape: 'box', p: [0, 1.9, 0], s: [6, 3.8, 5], c: 0x8c3a30 },
    { shape: 'box', p: [0, 0.25, 0], s: [6.2, 0.5, 5.2], c: STONE },
    { shape: 'wedge', p: [0, 4.7, 1.35], s: [6.8, 1.8, 2.7], c: SNOW },
    { shape: 'wedge', p: [0, 4.7, -1.35], s: [6.8, 1.8, 2.7], r: [0, 180, 0], c: SNOW },
    { shape: 'box', p: [0, 1.1, 2.52], s: [1.2, 2.2, 0.1], c: 0x5a3422 },
    { shape: 'box', p: [1.9, 1.5, 2.52], s: [1.1, 1.0, 0.1], c: GLOW, mirror: true },
    { shape: 'box', p: [1.3, 3.0, 2.52], s: [1.0, 0.9, 0.1], c: GLOW2, mirror: true },
    { shape: 'box', p: [1.6, 2.2, -2.52], s: [1.1, 1.0, 0.1], c: GLOW, mirror: true },
    { shape: 'box', p: [3.02, 2.2, 0], s: [0.1, 1.0, 1.2], c: GLOW2, mirror: true },
    { shape: 'box', p: [1.8, 5.3, -0.9], s: [0.7, 1.8, 0.7], c: 0x7a6a6a },
    { shape: 'box', p: [0, 3.85, 2.62], s: [6.4, 0.14, 0.14], c: RED },
    { shape: 'torus', p: [0, 2.55, 2.62], s: [0.75, 0.75, 0.5], c: 0x2f7a4a, seg: 6 },
  ],
  // Blue timber house with a steep alpine gable facing the street and a round attic window.
  lv_house_blue: [
    { shape: 'box', p: [0, 1.6, 0], s: [6.4, 3.2, 5.2], c: 0x2f5a72 },
    { shape: 'box', p: [0, 0.2, 0], s: [6.6, 0.4, 5.4], c: STONE },
    { shape: 'box', p: [0, 3.2, 0], s: [4.5, 4.5, 5.0], r: [0, 0, 45], c: 0x294f66 },
    { shape: 'box', p: [-1.75, 4.95, 0], s: [5.2, 0.35, 5.9], r: [0, 0, 45], c: SNOW, mirror: true },
    { shape: 'box', p: [0, 1.1, 2.62], s: [1.2, 2.2, 0.1], c: 0x6a3a22 },
    { shape: 'box', p: [1.9, 1.6, 2.62], s: [1.0, 1.1, 0.1], c: GLOW, mirror: true },
    { shape: 'cyl', p: [0, 4.1, 2.52], s: [1.1, 0.1, 1.1], r: [90, 0, 0], c: GLOW2, seg: 8 },
    { shape: 'box', p: [1.6, 1.8, -2.62], s: [1.1, 1.0, 0.1], c: GLOW, mirror: true },
    { shape: 'box', p: [3.22, 1.7, 0.6], s: [0.1, 1.0, 1.4], c: GLOW2, mirror: true },
    { shape: 'box', p: [-1.3, 5.7, -1.3], s: [0.6, 1.6, 0.6], c: 0x8a7a72 },
    { shape: 'sphere', p: [0, 2.55, 2.85], s: [0.45, 0.55, 0.45], c: RED, seg: 6 },
  ],
  // Tall, narrow mustard town house (three storeys) with a balcony of blue fairy lights and two red lanterns.
  lv_house_tall: [
    { shape: 'box', p: [0, 3.5, 0], s: [4.6, 7, 5], c: 0xb88a34 },
    { shape: 'box', p: [0, 0.25, 0], s: [4.8, 0.5, 5.2], c: STONE },
    { shape: 'wedge', p: [0, 8.1, 1.3], s: [5.2, 2.2, 2.7], c: SNOW },
    { shape: 'wedge', p: [0, 8.1, -1.3], s: [5.2, 2.2, 2.7], r: [0, 180, 0], c: SNOW },
    { shape: 'box', p: [0, 1.1, 2.52], s: [1.1, 2.2, 0.1], c: 0x4a3a6a },
    { shape: 'box', p: [1.2, 3.0, 2.52], s: [0.9, 1.1, 0.1], c: GLOW, mirror: true },
    { shape: 'box', p: [1.2, 5.2, 2.52], s: [0.9, 1.1, 0.1], c: GLOW2, mirror: true },
    { shape: 'box', p: [0, 5.2, 2.52], s: [0.6, 1.1, 0.1], c: GLOW },
    { shape: 'box', p: [1.2, 4.0, -2.52], s: [0.9, 1.1, 0.1], c: GLOW, mirror: true },
    { shape: 'box', p: [2.32, 4.4, 0], s: [0.1, 1.1, 1.2], c: GLOW2, mirror: true },
    { shape: 'box', p: [0, 6.6, 2.65], s: [4.8, 0.14, 0.14], c: BLUE },
    { shape: 'sphere', p: [1.6, 6.2, 2.85], s: [0.45, 0.55, 0.45], c: RED, seg: 6, mirror: true },
  ],
  // Little log cottage (scattered in the back streets and the outskirts).
  lv_cottage: [
    { shape: 'box', p: [0, 1.3, 0], s: [4, 2.6, 3.6], c: 0x74482e },
    { shape: 'wedge', p: [0, 3.2, 0.95], s: [4.6, 1.2, 1.9], c: SNOW },
    { shape: 'wedge', p: [0, 3.2, -0.95], s: [4.6, 1.2, 1.9], r: [0, 180, 0], c: SNOW },
    { shape: 'box', p: [0, 0.9, 1.82], s: [0.9, 1.8, 0.08], c: 0x5a3422 },
    { shape: 'box', p: [1.25, 1.4, 1.82], s: [0.8, 0.7, 0.08], c: GLOW, mirror: true },
    { shape: 'box', p: [0, 1.4, -1.82], s: [1.0, 0.7, 0.08], c: GLOW },
    { shape: 'box', p: [1.1, 3.6, -0.5], s: [0.5, 1.2, 0.5], c: 0x8a8a96 },
  ],
  // Festival arch: two posts with lanterns and a sagging string of paper lanterns across the whole street (23 m).
  lv_lanternarch: [
    { shape: 'cyl', p: [11.5, 3.5, 0], s: [0.4, 7, 0.4], c: 0x4a3a3a, seg: 6, mirror: true },
    { shape: 'box', p: [11.5, 7.3, 0], s: [0.7, 0.8, 0.7], c: GOLD, mirror: true },
    { shape: 'cone', p: [11.5, 7.95, 0], s: [0.95, 0.5, 0.95], r: [0, 45, 0], c: 0x8a2a2a, seg: 4, mirror: true },
    { shape: 'box', p: [5.75, 6.2, 0], s: [11.65, 0.07, 0.07], r: [0, 0, 7], c: 0x3a2a2a, mirror: true },
    { shape: 'sphere', p: [2.6, 5.35, 0], s: [0.7, 0.85, 0.7], c: RED, seg: 6, mirror: true },
    { shape: 'sphere', p: [6.2, 5.8, 0], s: [0.7, 0.85, 0.7], c: GOLD, seg: 6, mirror: true },
    { shape: 'sphere', p: [9.6, 6.2, 0], s: [0.7, 0.85, 0.7], c: PINK, seg: 6, mirror: true },
    { shape: 'sphere', p: [0, 5.05, 0], s: [0.75, 0.9, 0.75], c: BLUE, seg: 6 },
  ],
  // Street lantern on an iron post with a red paper lantern on top.
  lv_lanternpost: [
    { shape: 'cyl', p: [0, 0.15, 0], s: [0.6, 0.3, 0.6], c: IRON, seg: 6 },
    { shape: 'cyl', p: [0, 2.2, 0], s: [0.16, 4.4, 0.16], c: IRON, seg: 5 },
    { shape: 'box', p: [0.4, 4.2, 0], s: [0.8, 0.08, 0.08], c: IRON },
    { shape: 'box', p: [0.75, 3.85, 0], s: [0.5, 0.6, 0.5], c: GLOW },
    { shape: 'cone', p: [0.75, 4.3, 0], s: [0.7, 0.35, 0.7], r: [0, 45, 0], c: 0x2b2b3a, seg: 4 },
    { shape: 'sphere', p: [0, 4.6, 0], s: [0.5, 0.6, 0.5], c: RED, seg: 6 },
  ],
  // A light snowman with a red scarf and a top hat (cheap enough to scatter along every street).
  lv_snowman: [
    { shape: 'sphere', p: [0, 0.85, 0], s: [1.8, 1.6, 1.8], c: SNOW, seg: 7 },
    { shape: 'sphere', p: [0, 2.1, 0], s: [1.3, 1.2, 1.3], c: SNOW, seg: 7 },
    { shape: 'sphere', p: [0, 3.05, 0], s: [0.95, 0.9, 0.95], c: 0xffffff, seg: 7 },
    { shape: 'cone', p: [0, 3.05, 0.6], s: [0.16, 0.5, 0.16], r: [90, 0, 0], c: 0xff8a1c, seg: 4 },
    { shape: 'box', p: [0.18, 3.2, 0.42], s: [0.12, 0.12, 0.06], c: 0x2b2b3a, mirror: true },
    { shape: 'cyl', p: [0, 2.62, 0], s: [1.15, 0.22, 1.15], c: 0xe8433a, seg: 7 },
    { shape: 'cyl', p: [0, 3.52, 0], s: [0.9, 0.08, 0.9], c: 0x2b2b3a, seg: 7 },
    { shape: 'cyl', p: [0, 3.85, 0], s: [0.6, 0.6, 0.6], c: 0x2b2b3a, seg: 7 },
    { shape: 'cyl', p: [0.8, 2.2, 0], s: [0.07, 1.0, 0.07], r: [0, 0, -55], c: 0x7a4a2a, seg: 4, mirror: true },
  ],
  // A light penguin in a red scarf (skating on the pond, waddling by the road).
  lv_penguin: [
    { shape: 'sphere', p: [0, 0.6, 0], s: [0.9, 1.2, 0.8], c: 0x2b2b3a, seg: 7 },
    { shape: 'sphere', p: [0, 0.55, 0.16], s: [0.68, 0.95, 0.55], c: 0xffffff, seg: 7 },
    { shape: 'sphere', p: [0, 1.25, 0], s: [0.62, 0.58, 0.58], c: 0x2b2b3a, seg: 7 },
    { shape: 'box', p: [0.12, 1.3, 0.27], s: [0.1, 0.1, 0.05], c: 0xffffff, mirror: true },
    { shape: 'cone', p: [0, 1.2, 0.38], s: [0.15, 0.25, 0.15], r: [90, 0, 0], c: 0xffb74d, seg: 4 },
    { shape: 'cyl', p: [0, 0.98, 0], s: [0.72, 0.16, 0.72], c: 0xe8433a, seg: 7 },
    { shape: 'box', p: [0.42, 0.65, 0], s: [0.12, 0.6, 0.3], r: [0, 0, -15], c: 0x2b2b3a, mirror: true },
    { shape: 'box', p: [0.15, 0.04, 0.12], s: [0.22, 0.08, 0.3], c: 0xffb74d, mirror: true },
  ],
  // Landmark: the giant festival pine in the Town Square — garlands of lights, baubles and a golden star.
  lv_festivalpine: [
    { shape: 'cyl', p: [0, 1.2, 0], s: [1.2, 2.4, 1.2], c: 0x6a4024, seg: 6 },
    { shape: 'cone', p: [0, 5.0, 0], s: [11, 6.5, 11], c: 0x1f5e45, seg: 8 },
    { shape: 'cone', p: [0, 9.0, 0], s: [8.5, 5.5, 8.5], c: 0x236a4e, seg: 8 },
    { shape: 'cone', p: [0, 12.6, 0], s: [6, 4.6, 6], c: 0x287556, seg: 8 },
    { shape: 'cone', p: [0, 15.6, 0], s: [3.6, 3.6, 3.6], c: 0x2c7d5c, seg: 8 },
    { shape: 'ico', p: [0, 18.0, 0], s: [1.8, 1.8, 1.8], c: 0xffe45c, seg: 0 },
    { shape: 'torus', p: [0, 4.0, 0], s: [9.4, 9.4, 3], r: [90, 0, 0], c: GLOW, seg: 8 },
    { shape: 'torus', p: [0, 8.6, 0], s: [7.2, 7.2, 3], r: [90, 0, 0], c: RED, seg: 8 },
    { shape: 'torus', p: [0, 12.4, 0], s: [5, 5, 2.5], r: [90, 0, 0], c: BLUE, seg: 8 },
    { shape: 'sphere', p: [2.4, 5.0, 1.4], s: [1.0, 1.0, 1.0], c: 0xff4d6d, seg: 6, mirror: true },
    { shape: 'sphere', p: [1.6, 11.0, -1.95], s: [0.9, 0.9, 0.9], c: 0xffd23f, seg: 6, mirror: true },
  ],
  // Landmark: brick clock tower with glowing clock faces, a lit belfry and a snowy pyramid roof.
  lv_clocktower: [
    { shape: 'box', p: [0, 1.5, 0], s: [5, 3, 5], c: STONE },
    { shape: 'box', p: [0, 7.5, 0], s: [4, 9, 4], c: 0xb8604a },
    { shape: 'cyl', p: [0, 10.2, 2.02], s: [2.6, 0.12, 2.6], r: [90, 0, 0], c: 0xfff2c4, seg: 10 },
    { shape: 'cyl', p: [2.02, 10.2, 0], s: [2.6, 0.12, 2.6], r: [0, 0, 90], c: 0xfff2c4, seg: 10, mirror: true },
    { shape: 'box', p: [0, 10.6, 2.12], s: [0.16, 0.9, 0.05], c: 0x2b2b3a },
    { shape: 'box', p: [0.3, 10.2, 2.12], s: [0.7, 0.16, 0.05], c: 0x2b2b3a },
    { shape: 'box', p: [0, 12.15, 0], s: [4.6, 0.3, 4.6], c: SNOW },
    { shape: 'box', p: [0, 13.2, 0], s: [4.2, 1.8, 4.2], c: GLOW2 },
    { shape: 'cone', p: [0, 15.9, 0], s: [6.4, 3.6, 6.4], r: [0, 45, 0], c: SNOW, seg: 4 },
    { shape: 'ico', p: [0, 18.0, 0], s: [0.8, 0.8, 0.8], c: 0xffe45c, seg: 0 },
    { shape: 'box', p: [0, 1.2, 2.55], s: [1.4, 2.4, 0.1], c: 0x5a3422 },
    { shape: 'cyl', p: [0, 10.2, -2.02], s: [2.6, 0.12, 2.6], r: [90, 0, 0], c: 0xfff2c4, seg: 10 },
  ],
  // Festival market stall: wooden counter, red-and-white awning, glowing treats and two paper lanterns.
  lv_stall: [
    { shape: 'box', p: [0, 0.6, 0], s: [3.4, 1.2, 1.6], c: 0x8d5a3a },
    { shape: 'cyl', p: [1.6, 1.5, -0.7], s: [0.14, 3.0, 0.14], c: 0x6a4024, seg: 4, mirror: true },
    { shape: 'cyl', p: [1.6, 1.3, 0.75], s: [0.14, 2.6, 0.14], c: 0x6a4024, seg: 4, mirror: true },
    { shape: 'box', p: [0, 2.8, 0.05], s: [3.8, 0.14, 2.4], r: [10, 0, 0], c: 0xe8433a },
    { shape: 'box', p: [0.95, 2.81, 0.05], s: [0.65, 0.15, 2.42], r: [10, 0, 0], c: 0xfff4e6, mirror: true },
    { shape: 'box', p: [-0.8, 1.35, 0.2], s: [0.9, 0.3, 0.7], c: GLOW },
    { shape: 'sphere', p: [0.6, 1.42, 0.25], s: [0.6, 0.45, 0.6], c: 0xff8a3c, seg: 6 },
    { shape: 'sphere', p: [1.45, 2.2, 1.0], s: [0.4, 0.5, 0.4], c: RED, seg: 6, mirror: true },
  ],
  // Landmark: the toy workshop at the hairpin — big plum building, glowing windows, a giant present on the roof.
  lv_workshop: [
    { shape: 'box', p: [0, 2.75, 0], s: [12, 5.5, 9], c: 0x663550 },
    { shape: 'box', p: [0, 0.3, 0], s: [12.4, 0.6, 9.4], c: STONE },
    { shape: 'wedge', p: [0, 6.9, 2.35], s: [13, 2.8, 4.7], c: SNOW },
    { shape: 'wedge', p: [0, 6.9, -2.35], s: [13, 2.8, 4.7], r: [0, 180, 0], c: SNOW },
    { shape: 'box', p: [0, 1.6, 4.52], s: [3, 3.2, 0.1], c: 0x5a3422 },
    { shape: 'box', p: [0, 3.75, 4.52], s: [3, 0.7, 0.1], c: GLOW },
    { shape: 'box', p: [3.8, 2.3, 4.52], s: [2.4, 1.6, 0.1], c: GLOW, mirror: true },
    { shape: 'box', p: [3.8, 4.4, 4.52], s: [2.0, 1.0, 0.1], c: GLOW2, mirror: true },
    { shape: 'box', p: [6.02, 3.0, 0], s: [0.1, 1.6, 3.6], c: GLOW, mirror: true },
    { shape: 'box', p: [3.2, 3.0, -4.52], s: [2.4, 1.6, 0.1], c: GLOW, mirror: true },
    { shape: 'box', p: [-3.5, 8.9, 0], s: [2.2, 2.2, 2.2], r: [0, 20, 0], c: 0x3fa7ff },
    { shape: 'box', p: [-3.5, 8.9, 0], s: [2.26, 2.26, 0.5], r: [0, 20, 0], c: 0xffd23f },
  ],
  // Stone bridge-end post with a lantern on top.
  lv_bridgepost: [
    { shape: 'box', p: [0, 1.0, 0], s: [1.0, 2.0, 1.0], c: 0x8a8296 },
    { shape: 'box', p: [0, 2.1, 0], s: [1.25, 0.2, 1.25], c: SNOW },
    { shape: 'box', p: [0, 2.55, 0], s: [0.55, 0.7, 0.55], c: GLOW },
    { shape: 'cone', p: [0, 3.08, 0], s: [0.85, 0.36, 0.85], r: [0, 45, 0], c: 0x2b2b3a, seg: 4 },
  ],
  // Frozen stream: a long strip of blue ice between snowy banks (runs along local Z, 60 m).
  lv_stream: [
    { shape: 'box', p: [0, 0, 0], s: [8, 0.2, 60], c: 0xbfe3f5 },
    { shape: 'box', p: [1.6, 0.06, 0], s: [1.2, 0.12, 60], c: 0xe2f4ff },
    { shape: 'box', p: [4.6, 0.15, 0], s: [1.6, 0.5, 60], c: SNOW, mirror: true },
  ],
  // Frozen pond (64 m across) with a glossy patch and two little snow drifts on the ice.
  lv_pond: [
    { shape: 'cyl', p: [0, 0, 0], s: [64, 0.16, 64], c: 0xbfe3f5, seg: 10 },
    { shape: 'cyl', p: [6, 0.04, -4], s: [34, 0.12, 24], c: 0xd8f0ff, seg: 8 },
    { shape: 'ico', p: [-14, 0.05, 10], s: [6, 0.6, 4], c: SNOW, seg: 0 },
    { shape: 'ico', p: [12, 0.05, 15], s: [4, 0.5, 3], c: SNOW, seg: 0 },
  ],
  // A pile of wrapped presents.
  lv_gifts: [
    { shape: 'box', p: [0, 0.5, 0], s: [1.2, 1.0, 1.2], c: 0xe8433a },
    { shape: 'box', p: [0, 0.5, 0], s: [1.25, 1.02, 0.25], c: 0xffd23f },
    { shape: 'box', p: [1.0, 0.35, 0.6], s: [0.8, 0.7, 0.8], r: [0, 20, 0], c: 0x3fa7ff },
    { shape: 'box', p: [1.0, 0.35, 0.6], s: [0.82, 0.72, 0.18], r: [0, 20, 0], c: 0xffffff },
    { shape: 'box', p: [-0.7, 0.3, 0.8], s: [0.7, 0.6, 0.7], r: [0, -15, 0], c: 0x5ad16b },
    { shape: 'box', p: [0.1, 1.25, 0.1], s: [0.6, 0.5, 0.6], r: [0, 30, 0], c: 0xb47bff },
  ],
};
