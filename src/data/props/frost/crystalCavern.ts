import type { ModelPart } from '../../types';

/** Scenery recipes for Crystal Cavern (names must be globally unique: prefix them with `cc_`). */

const DEG = Math.PI / 180;
const r2 = (v: number): number => Math.round(v * 100) / 100;

// glowing crystal colours
const CYAN = 0x7fe8ff;
const ICE = 0xc8f6ff;
const VIOLET = 0xb48cff;
const PINK = 0xff9fe6;
const DEEP = 0x2e3a6a;

/**
 * A hexagonal crystal (prism + pointed tip) growing from (x, y, z), leaning by `rx`/`rz` degrees.
 * Two parts.
 */
function crystal(x: number, y: number, z: number, len: number, dia: number, rx: number, rz: number, c: number, seg = 6): ModelPart[] {
  // axis of a unit +Y vector after the XYZ euler rotation (Rz first, then Rx)
  const ax = -Math.sin(rz * DEG);
  const ay = Math.cos(rz * DEG) * Math.cos(rx * DEG);
  const az = Math.cos(rz * DEG) * Math.sin(rx * DEG);
  const tip = dia * 1.1;
  const at = (d: number): [number, number, number] => [r2(x + ax * d), r2(y + ay * d), r2(z + az * d)];
  return [
    { shape: 'cyl', p: at(len / 2), s: [dia, len, dia], r: [rx, 0, rz], c, seg },
    { shape: 'cone', p: at(len + tip / 2), s: [dia, tip, dia], r: [rx, 0, rz], c, seg },
  ];
}

export const CRYSTAL_CAVERN_PROPS: Record<string, ModelPart[]> = {
  // Giant glowing crystal cluster (~15 m tall at scale 1).
  cc_bigcrystal: [
    { shape: 'ico', p: [0, 0.6, 0], s: [9, 3, 8], c: DEEP, seg: 0 },
    ...crystal(0, 0.5, 0, 10, 3.2, 0, 0, CYAN),
    ...crystal(1.6, 0.5, 0.6, 7.5, 2.4, 6, -24, VIOLET),
    ...crystal(-1.6, 0.5, -0.5, 6.5, 2.2, -14, 22, ICE),
    ...crystal(0.3, 0.5, 1.8, 5, 1.8, 30, 6, PINK),
    { shape: 'cone', p: [2.2, 1.9, -1.8], s: [1.2, 4, 1.2], r: [-30, 0, -30], c: ICE, seg: 5 },
    { shape: 'cone', p: [-2.6, 1.6, 1.2], s: [1, 3.2, 1], r: [20, 0, 40], c: CYAN, seg: 5 },
  ],
  // Small crystal cluster for the road side (~3 m).
  cc_crystal: [
    { shape: 'ico', p: [0, 0.2, 0], s: [2, 0.6, 1.8], c: 0x3a4680, seg: 0 },
    ...crystal(0, 0.1, 0, 1.8, 0.8, 0, 0, CYAN),
    ...crystal(0.4, 0.1, 0.1, 1.2, 0.6, 8, -28, VIOLET),
    { shape: 'cone', p: [-0.45, 0.55, 0.35], s: [0.45, 1.2, 0.45], r: [30, 0, 20], c: PINK, seg: 5 },
  ],
  // Rock geode cracked open, glowing violet inside.
  cc_geode: [
    { shape: 'ico', p: [0, 0.6, 0], s: [2.8, 1.6, 2.4], c: 0x3a3f70, seg: 1 },
    { shape: 'sphere', p: [0, 0.95, 0.55], s: [1.9, 1.1, 1.3], c: 0xd38cff, seg: 6 },
    { shape: 'cone', p: [0.3, 1.5, 0.75], s: [0.4, 0.9, 0.4], r: [35, 0, -15], c: 0xffd6f6, seg: 4 },
    { shape: 'cone', p: [-0.35, 1.4, 0.8], s: [0.35, 0.8, 0.35], r: [40, 0, 20], c: ICE, seg: 4 },
    { shape: 'cone', p: [0, 1.65, 0.5], s: [0.4, 1, 0.4], r: [20, 0, 0], c: VIOLET, seg: 4 },
  ],
  // Friendly glowing ice mushrooms.
  cc_glowshroom: [
    { shape: 'cyl', p: [0, 0.6, 0], s: [0.35, 1.2, 0.35], c: 0xdfe8ff, seg: 6 },
    { shape: 'sphere', p: [0, 1.25, 0], s: [1.4, 0.7, 1.4], c: CYAN, seg: 8 },
    { shape: 'sphere', p: [0, 1.36, 0], s: [0.5, 0.3, 0.5], c: 0xe8fcff, seg: 6 },
    { shape: 'cyl', p: [0.75, 0.35, 0.3], s: [0.22, 0.7, 0.22], c: 0xdfe8ff, seg: 5 },
    { shape: 'sphere', p: [0.75, 0.74, 0.3], s: [0.85, 0.45, 0.85], c: PINK, seg: 8 },
    { shape: 'sphere', p: [-0.5, 0.25, 0.5], s: [0.6, 0.35, 0.6], c: VIOLET, seg: 6 },
  ],
  // Ice lamp post with a glowing crystal on top.
  cc_lamp: [
    { shape: 'cyl', p: [0, 0.15, 0], s: [1, 0.3, 1], c: 0x46579a, seg: 6 },
    { shape: 'cyl', p: [0, 1.7, 0], s: [0.3, 3.2, 0.3], c: 0xa8c4f0, seg: 6 },
    { shape: 'torus', p: [0, 3.2, 0], s: [0.9, 0.9, 0.6], r: [90, 0, 0], c: VIOLET, seg: 6 },
    { shape: 'ico', p: [0, 3.75, 0], s: [0.9, 1.4, 0.9], c: 0x9ff4ff, seg: 0 },
  ],
  // Cave wall chunk: craggy blue-violet ice cliff with glowing veins (~21 m).
  cc_icecliff: [
    { shape: 'ico', p: [0, 7, 0], s: [9, 16, 8], c: 0x3b4a86, seg: 0 },
    { shape: 'ico', p: [3, 4.5, 1.5], s: [6, 9, 6], c: 0x46579a, seg: 0 },
    { shape: 'ico', p: [-3, 9, -0.5], s: [5.5, 12, 5.5], c: 0x34427a, seg: 0 },
    { shape: 'cone', p: [0.3, 17, 0], s: [5, 8, 5], c: 0x5a6cb0, seg: 5 },
    { shape: 'ico', p: [0, 12.5, 0.3], s: [6.5, 2.2, 6], c: 0x9fc0f0, seg: 0 },
    { shape: 'cone', p: [2.2, 3, 3.2], s: [1.4, 4.5, 1.4], r: [30, 0, -20], c: CYAN, seg: 5 },
    { shape: 'cone', p: [-2.6, 2.2, 2.8], s: [1.1, 3.6, 1.1], r: [25, 0, 25], c: VIOLET, seg: 5 },
  ],
  // Ice stalagmite spire (~13 m).
  cc_spire: [
    { shape: 'cone', p: [0, 6.5, 0], s: [4, 13, 4], c: 0x5f74c0, seg: 6 },
    { shape: 'cone', p: [1.7, 3, 0.6], s: [2.4, 6, 2.4], r: [0, 0, -8], c: 0x7088d0, seg: 6 },
    { shape: 'cone', p: [-1.4, 2.5, -0.8], s: [2, 5, 2], r: [6, 0, 6], c: 0x4c5ea8, seg: 6 },
    { shape: 'cone', p: [0.6, 0.9, 1.7], s: [0.8, 1.8, 0.8], r: [30, 0, 0], c: CYAN, seg: 4 },
    { shape: 'cone', p: [-0.9, 0.8, 1.4], s: [0.6, 1.4, 0.6], r: [30, 0, 20], c: PINK, seg: 4 },
  ],
  // Frozen waterfall pouring down the cave wall (front faces +Z, ~19 m tall).
  cc_icefall: [
    { shape: 'box', p: [0, 9, -3.5], s: [22, 18, 6], c: 0x34407a },
    { shape: 'ico', p: [-9.5, 10, -1.5], s: [9, 22, 8], c: 0x3c4a88, seg: 0 },
    { shape: 'ico', p: [9.5, 8, -1.5], s: [8, 18, 8], c: 0x2f3a70, seg: 0 },
    { shape: 'ico', p: [0, 18, -2.5], s: [24, 4, 9], c: 0x4a5a9c, seg: 0 },
    { shape: 'box', p: [0, 9, -0.2], s: [9, 18, 1.2], c: 0xbfefff },
    { shape: 'cyl', p: [-2.6, 8.6, 0.6], s: [2.2, 17, 2.2], c: 0xe4fbff, seg: 6 },
    { shape: 'cyl', p: [2.3, 9, 0.6], s: [1.8, 18, 1.8], c: 0x9fe3ff, seg: 6 },
    { shape: 'cyl', p: [0, 9.4, 0.9], s: [1.4, 17, 1.4], c: 0xffffff, seg: 6 },
    { shape: 'sphere', p: [0, 0.9, 2], s: [12, 2.4, 4.5], c: 0xd6f6ff, seg: 8 },
    { shape: 'cyl', p: [0, 0.1, 6.5], s: [18, 0.25, 9], c: 0x8fd8ff, seg: 10 },
    { shape: 'cone', p: [-6, 14.6, 1.2], s: [1.2, 4, 1.2], r: [180, 0, 0], c: 0xd6f6ff, seg: 5 },
    { shape: 'cone', p: [5.5, 15, 1.2], s: [1, 3.4, 1], r: [180, 0, 0], c: ICE, seg: 5 },
  ],
  // Pointed ice arch over the road (spans local X; pillars at ±12.5 m, apex ~11 m). A crystal pendant hangs at
  // 7.5 m over the centre (where a swinging chandelier can hang from it).
  cc_icearch: [
    { shape: 'box', p: [12.5, 2.5, 0], s: [2.4, 9, 2.4], c: 0x8fb0ec, mirror: true },
    { shape: 'box', p: [6.25, 8.5, 0], s: [13.2, 1.4, 1.8], r: [0, 0, -13.5], c: 0xa8c8f4, mirror: true },
    { shape: 'ico', p: [12.5, 7.4, 0], s: [2.8, 2, 2.8], c: CYAN, seg: 0, mirror: true },
    { shape: 'cone', p: [0, 11.6, 0], s: [2.2, 3.4, 2.2], c: VIOLET, seg: 6 },
    { shape: 'cyl', p: [0, 8.8, 0], s: [0.3, 2.8, 0.3], c: 0xdfe8ff, seg: 5 },
    { shape: 'cone', p: [5.5, 7.2, 0], s: [0.9, 2.4, 0.9], r: [180, 0, 0], c: ICE, seg: 5, mirror: true },
    { shape: 'cone', p: [13.6, 1.4, 1.4], s: [1.4, 3.2, 1.4], r: [20, 0, -15], c: VIOLET, seg: 5, mirror: true },
  ],
  // Narrow crystal gate over the Crystal Crack: tall pillars rising out of the chasm (origin at ledge level).
  cc_crackgate: [
    { shape: 'box', p: [5.4, -0.5, 0], s: [1.6, 15, 1.6], c: 0x6f86d0, mirror: true },
    { shape: 'cone', p: [5.4, 8.2, 0], s: [1.8, 2.4, 1.8], c: CYAN, seg: 6, mirror: true },
    { shape: 'box', p: [0, 6.6, 0], s: [12.4, 0.9, 1.4], c: 0x9fb8f0 },
    { shape: 'cone', p: [2.6, 5.5, 0], s: [0.6, 1.6, 0.6], r: [180, 0, 0], c: ICE, seg: 5, mirror: true },
    { shape: 'cone', p: [0, 5.3, 0], s: [0.8, 1.8, 0.8], r: [180, 0, 0], c: ICE, seg: 5 },
    { shape: 'ico', p: [0, 7.4, 0], s: [1.6, 1.6, 1.6], c: PINK, seg: 0 },
  ],
  // Frozen pond with frosty rim and snow drifts (lie it on the floor).
  cc_frozenpond: [
    { shape: 'cyl', p: [0, 0.03, 0], s: [28, 0.06, 22], c: 0xe0f4ff, seg: 10 },
    { shape: 'cyl', p: [0, 0.08, 0], s: [24.5, 0.08, 18.5], c: 0x9fdcff, seg: 10 },
    { shape: 'box', p: [3, 0.14, 2], s: [9, 0.02, 0.6], r: [0, 30, 0], c: 0xffffff },
    { shape: 'box', p: [-5, 0.14, -3], s: [6, 0.02, 0.5], r: [0, 30, 0], c: 0xffffff },
    { shape: 'ico', p: [10.5, 0.4, 6], s: [4, 1.2, 3], c: 0xeef4ff, seg: 1 },
    { shape: 'ico', p: [-10, 0.3, -6], s: [3, 1, 2.5], c: 0xeef4ff, seg: 1 },
  ],
  // Swinger hazard: a crystal chandelier (hangs from a rope; origin ~1.5 m above the road).
  cc_hz_chandelier: [
    { shape: 'cyl', p: [0, 3.4, 0], s: [0.5, 1.6, 0.5], c: 0xc8d8ff, seg: 6 },
    { shape: 'torus', p: [0, 2.4, 0], s: [3.2, 3.2, 3], r: [90, 0, 0], c: VIOLET, seg: 10 },
    { shape: 'ico', p: [0, 1.3, 0], s: [2.4, 3.2, 2.4], c: CYAN, seg: 0 },
    { shape: 'cone', p: [0, -0.3, 0], s: [1.2, 2, 1.2], r: [180, 0, 0], c: 0xd6f6ff, seg: 6 },
    { shape: 'cone', p: [1.3, 1.0, 0], s: [0.7, 2, 0.7], r: [180, 0, 0], c: ICE, seg: 5, mirror: true },
    { shape: 'cone', p: [0, 1.0, 1.3], s: [0.7, 2, 0.7], r: [180, 0, 0], c: ICE, seg: 5 },
    { shape: 'cone', p: [0, 1.0, -1.3], s: [0.7, 2, 0.7], r: [180, 0, 0], c: ICE, seg: 5 },
    { shape: 'sphere', p: [1.6, 2.4, 0], s: [0.6, 0.6, 0.6], c: PINK, seg: 6, mirror: true },
  ],
};
