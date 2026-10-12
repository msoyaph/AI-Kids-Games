import type { ModelPart } from '../../types';

// Frozen-lake colours: pale blue ice, darker clear-ice patches and wind-blown snow drifts.
const ICE_MID = 0xa8d5f2;
const ICE_CLEAR = 0x8cc6ec;
const DRIFT = 0xf1f7ff;
const SNOW = 0xf8fbff;
const WOOD = 0x8a5a33;
const INK = 0x2b2b3a;

/**
 * Scenery recipes for Shiver Lake (names must be globally unique: prefix them with `sh_`).
 * Big flat lake pieces are symmetric about local x = 0 (or use `mirror`), so they stay correct in Mirror mode,
 * where placements are reflected but recipes are not.
 */
export const SHIVER_LAKE_PROPS: Record<string, ModelPart[]> = {
  // Pieces of the frozen lake (flat; clear-ice patches and snow drifts sit 2.5 cm above the ice so nothing
  // flickers). Flat discs are cheap, so the outline gets more segments than usual (LOD1 halves them).
  // 100 m × 250 m at scale 1.
  sh_lake_long: [
    { shape: 'cyl', p: [0, 0, 0], s: [100, 0.1, 250], c: ICE_MID, seg: 20 },
    { shape: 'cyl', p: [16, 0.025, 50], s: [26, 0.1, 52], r: [0, 12, 0], c: ICE_CLEAR, seg: 8, mirror: true },
    { shape: 'cyl', p: [0, 0.025, -40], s: [34, 0.1, 50], c: ICE_CLEAR, seg: 8 },
    { shape: 'cyl', p: [22, 0.025, -88], s: [18, 0.1, 9], r: [0, -20, 0], c: DRIFT, seg: 7, mirror: true },
    { shape: 'cyl', p: [0, 0.025, 5], s: [22, 0.1, 10], c: DRIFT, seg: 7 },
    { shape: 'cyl', p: [0, 0.025, 98], s: [24, 0.1, 30], c: ICE_CLEAR, seg: 8 },
  ],
  // 100 m × 200 m at scale 1.
  sh_lake_oval: [
    { shape: 'cyl', p: [0, 0, 0], s: [100, 0.1, 200], c: ICE_MID, seg: 20 },
    { shape: 'cyl', p: [14, 0.025, 34], s: [24, 0.1, 46], r: [0, 12, 0], c: ICE_CLEAR, seg: 8, mirror: true },
    { shape: 'cyl', p: [0, 0.025, -46], s: [30, 0.1, 40], c: ICE_CLEAR, seg: 8 },
    { shape: 'cyl', p: [22, 0.025, -8], s: [16, 0.1, 8], r: [0, -20, 0], c: DRIFT, seg: 7, mirror: true },
  ],
  // 100 m across at scale 1.
  sh_lake_round: [
    { shape: 'cyl', p: [0, 0, 0], s: [100, 0.1, 100], c: ICE_MID, seg: 16 },
    { shape: 'cyl', p: [15, 0.025, 10], s: [22, 0.1, 30], r: [0, 20, 0], c: ICE_CLEAR, seg: 8, mirror: true },
    { shape: 'cyl', p: [0, 0.025, -26], s: [18, 0.1, 8], c: DRIFT, seg: 7 },
  ],
  // Open water in the crack across the thin-ice shortcut (spans a 9 m wide, 5 m long gap), with bobbing ice floes.
  sh_crack: [
    { shape: 'box', p: [0, 0, 0], s: [10, 0.1, 4.8], c: 0x1f6f9a },
    { shape: 'box', p: [2.6, 0, 2.3], s: [3.2, 0.1, 1.3], r: [0, 24, 0], c: 0x1f6f9a, mirror: true },
    { shape: 'box', p: [1.6, 0, -2.4], s: [3.6, 0.1, 1.1], r: [0, -18, 0], c: 0x1f6f9a, mirror: true },
    { shape: 'box', p: [1.4, 0.07, 0.5], s: [1.3, 0.14, 0.9], r: [0, 30, 0], c: 0xdff4ff, mirror: true },
    { shape: 'box', p: [0, 0.07, -0.9], s: [0.9, 0.14, 0.7], r: [0, -15, 0], c: 0xeaf8ff },
    // cracks running out across the lake on both sides
    { shape: 'box', p: [7.6, 0.06, 0.8], s: [5, 0.06, 0.22], r: [0, 18, 0], c: 0x5f9fcc, mirror: true },
    { shape: 'box', p: [9.6, 0.06, -1.2], s: [3.2, 0.06, 0.18], r: [0, -30, 0], c: 0x5f9fcc, mirror: true },
  ],
  // Red ice-fishing hut with a snowy roof, a stove pipe and a fishing hole.
  sh_fishhut: [
    { shape: 'box', p: [0, 1.1, 0], s: [2.6, 2.2, 2.2], c: 0xe0524f },
    { shape: 'box', p: [0, 0.12, 0], s: [2.8, 0.24, 2.4], c: SNOW },
    { shape: 'wedge', p: [0, 2.6, 0.63], s: [3.0, 0.8, 1.26], c: SNOW },
    { shape: 'wedge', p: [0, 2.6, -0.63], s: [3.0, 0.8, 1.26], r: [0, 180, 0], c: SNOW },
    { shape: 'box', p: [0, 0.95, 1.12], s: [0.8, 1.5, 0.06], c: 0x6d4228 },
    { shape: 'box', p: [0.85, 1.45, 1.12], s: [0.5, 0.45, 0.06], c: 0xffe08a },
    { shape: 'cyl', p: [-0.8, 3.0, -0.45], s: [0.22, 1.1, 0.22], c: 0x5a5f6a, seg: 6 },
    { shape: 'sphere', p: [-0.95, 3.8, -0.45], s: [0.65, 0.5, 0.65], c: 0xeef2f6, seg: 6 },
    { shape: 'cyl', p: [2.0, 0.03, 1.3], s: [0.95, 0.06, 0.95], c: 0x2a5f8a, seg: 8 },
    { shape: 'cyl', p: [1.75, 0.6, 1.05], s: [0.05, 1.4, 0.05], r: [-20, 0, -35], c: WOOD, seg: 4 },
    { shape: 'cyl', p: [-1.75, 0.25, 0.9], s: [0.45, 0.5, 0.45], c: 0x3fa7ff, seg: 6 },
  ],
  // Sunny yellow ice-fishing hut with a teal door and a little sled.
  sh_fishhut_b: [
    { shape: 'box', p: [0, 1.0, 0], s: [2.2, 2.0, 2.6], c: 0xffc93c },
    { shape: 'box', p: [0, 0.12, 0], s: [2.4, 0.24, 2.8], c: SNOW },
    { shape: 'wedge', p: [0, 2.4, 0.73], s: [2.6, 0.8, 1.46], c: SNOW },
    { shape: 'wedge', p: [0, 2.4, -0.73], s: [2.6, 0.8, 1.46], r: [0, 180, 0], c: SNOW },
    { shape: 'box', p: [0, 0.9, 1.32], s: [0.75, 1.4, 0.06], c: 0x2ec4b6 },
    { shape: 'box', p: [1.11, 1.3, 0.3], s: [0.06, 0.45, 0.5], c: 0xffe08a },
    { shape: 'cyl', p: [0.6, 2.85, -0.6], s: [0.2, 1.0, 0.2], c: 0x5a5f6a, seg: 6 },
    { shape: 'box', p: [-1.9, 0.3, 0.4], s: [0.8, 0.1, 1.5], c: 0xff4d6d },
    { shape: 'box', p: [-1.9, 0.12, 0.4], s: [0.7, 0.14, 1.6], c: WOOD },
    { shape: 'cyl', p: [1.6, 0.03, 1.8], s: [0.9, 0.06, 0.9], c: 0x2a5f8a, seg: 8 },
  ],
  // Skating penguin (also the side-gliding hazard): scarf, bobble hat, flippers out for balance, little skates.
  sh_skatepenguin: [
    { shape: 'sphere', p: [0, 0.95, 0], s: [1.25, 1.6, 1.1], c: INK, seg: 10 },
    { shape: 'sphere', p: [0, 0.9, 0.24], s: [0.95, 1.3, 0.75], c: 0xffffff, seg: 10 },
    { shape: 'sphere', p: [0, 1.85, 0], s: [0.9, 0.85, 0.85], c: INK, seg: 10 },
    { shape: 'sphere', p: [0.17, 1.93, 0.36], s: [0.2, 0.22, 0.08], c: 0xffffff, seg: 6, mirror: true },
    { shape: 'sphere', p: [0.17, 1.93, 0.4], s: [0.09, 0.11, 0.04], c: 0x111111, seg: 5, mirror: true },
    { shape: 'cone', p: [0, 1.78, 0.52], s: [0.22, 0.34, 0.22], r: [90, 0, 0], c: 0xffb74d, seg: 6 },
    { shape: 'torus', p: [0, 1.47, 0], s: [1.05, 1.05, 1.2], r: [90, 0, 0], c: 0xff4d6d, seg: 8 },
    { shape: 'cone', p: [0, 2.38, 0], s: [0.62, 0.55, 0.62], c: 0x3fa7ff, seg: 7 },
    { shape: 'sphere', p: [0, 2.7, 0], s: [0.26, 0.26, 0.26], c: 0xffffff, seg: 6 },
    { shape: 'box', p: [0.72, 1.15, 0], s: [0.75, 0.16, 0.4], r: [0, 0, -25], c: INK, mirror: true },
    { shape: 'box', p: [0.26, 0.14, 0.06], s: [0.32, 0.22, 0.52], c: 0xffb74d, mirror: true },
    { shape: 'box', p: [0.26, 0.02, 0.06], s: [0.06, 0.06, 0.8], c: 0xc0c8d8, mirror: true },
  ],
  // Landmark: a frozen fountain — the water froze mid-splash into icicles and a glassy spout.
  sh_icefountain: [
    { shape: 'cyl', p: [0, 0.5, 0], s: [8, 1.0, 8], c: 0xc8d4e4, seg: 10 },
    { shape: 'torus', p: [0, 1.0, 0], s: [8, 8, 1.4], r: [90, 0, 0], c: 0xe2eaf4, seg: 10 },
    { shape: 'cyl', p: [0, 0.98, 0], s: [7, 0.1, 7], c: 0xa6dcf6, seg: 10 },
    { shape: 'cyl', p: [0, 2.2, 0], s: [0.9, 2.6, 0.9], c: 0xc8d4e4, seg: 8 },
    { shape: 'cyl', p: [0, 2.3, 0], s: [2.2, 1.8, 2.2], c: 0xbfefff, seg: 8 },
    { shape: 'cone', p: [0, 3.65, 0], s: [3.8, 0.9, 3.8], r: [180, 0, 0], c: 0xe2eaf4, seg: 10 },
    { shape: 'cone', p: [1.45, 2.85, 0], s: [0.38, 1.2, 0.38], r: [180, 0, 0], c: 0xcff4ff, seg: 5, mirror: true },
    { shape: 'cone', p: [0, 2.85, 1.45], s: [0.38, 1.3, 0.38], r: [180, 0, 0], c: 0xcff4ff, seg: 5 },
    { shape: 'cone', p: [0, 2.85, -1.45], s: [0.38, 1.1, 0.38], r: [180, 0, 0], c: 0xcff4ff, seg: 5 },
    { shape: 'cone', p: [0, 5.3, 0], s: [1.0, 2.8, 1.0], c: 0xbfefff, seg: 6 },
    { shape: 'ico', p: [0, 6.8, 0], s: [1.0, 1.0, 1.0], c: 0xe6fbff, seg: 1 },
  ],
  // Landmark: an ice sculpture of a fish leaping out of a splash.
  sh_icefish: [
    { shape: 'box', p: [0, 0.6, 0], s: [3.2, 1.2, 3.2], c: 0xd8e4f2 },
    { shape: 'box', p: [0, 1.45, 0], s: [2.6, 0.5, 2.6], c: 0xbfe9ff },
    { shape: 'cone', p: [0, 2.4, 0.2], s: [1.4, 1.6, 1.4], c: 0xc8f0ff, seg: 6 },
    { shape: 'sphere', p: [0, 3.9, 0], s: [1.4, 1.7, 3.8], r: [-35, 0, 0], c: 0xaee6ff, seg: 8 },
    { shape: 'box', p: [0, 2.5, -1.75], s: [0.25, 1.6, 1.0], r: [-35, 0, 0], c: 0xc8f0ff },
    { shape: 'box', p: [0, 4.85, -0.3], s: [0.2, 0.9, 1.1], r: [-35, 0, 0], c: 0xc8f0ff },
    { shape: 'sphere', p: [0.55, 4.8, 1.15], s: [0.26, 0.26, 0.26], c: 0x4aa8e0, seg: 6, mirror: true },
    { shape: 'ico', p: [1.0, 2.0, 0.9], s: [0.5, 0.5, 0.5], c: 0xe6fbff, seg: 0, mirror: true },
    { shape: 'ico', p: [0, 2.1, -1.1], s: [0.45, 0.45, 0.45], c: 0xe6fbff, seg: 0 },
  ],
  // "Thin ice!" warning sign (a crack symbol on yellow).
  sh_thinice: [
    { shape: 'cyl', p: [0, 0.9, 0], s: [0.14, 1.8, 0.14], c: WOOD, seg: 5 },
    { shape: 'box', p: [0, 1.75, 0.08], s: [1.7, 0.95, 0.08], c: 0xffd23f },
    { shape: 'box', p: [0, 2.24, 0.08], s: [1.8, 0.1, 0.2], c: 0xffffff },
    { shape: 'box', p: [-0.3, 1.82, 0.13], s: [0.55, 0.09, 0.03], r: [0, 0, 35], c: INK },
    { shape: 'box', p: [0.12, 1.7, 0.13], s: [0.5, 0.09, 0.03], r: [0, 0, -30], c: INK },
    { shape: 'box', p: [0.45, 1.8, 0.13], s: [0.35, 0.09, 0.03], r: [0, 0, 40], c: INK },
  ],
  // Stack of ice blocks cut from the lake.
  sh_iceblocks: [
    { shape: 'box', p: [0, 0.45, 0], s: [1.4, 0.9, 1.0], c: 0xbfe9ff },
    { shape: 'box', p: [1.45, 0.45, 0.1], s: [1.4, 0.9, 1.0], r: [0, 8, 0], c: 0xaee0fa },
    { shape: 'box', p: [0.7, 1.35, 0.05], s: [1.4, 0.9, 1.0], r: [0, -6, 0], c: 0xcdf0ff },
    { shape: 'box', p: [-0.9, 0.3, 1.0], s: [1.0, 0.6, 0.8], r: [0, 30, 0], c: 0xbfe9ff },
    { shape: 'box', p: [0.7, 1.83, 0.05], s: [1.3, 0.06, 0.9], r: [0, -6, 0], c: 0xffffff },
  ],
};
