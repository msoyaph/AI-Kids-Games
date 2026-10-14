// The plants, built from soft shapes in code. Each faces the camera (+z) with small bead eyes and a
// tiny smile (the IP log's style rules: no mouths that shoot, no snouts, nothing like a seed packet).
// Shots leave from branches, pods and stalks. Sizes are world units: a tile is 1 wide and 1.3 deep.
import { ball, build, capsule, cone, cyl, face, softBox, type Piece } from '../geo';
import { scaled, type Model } from './types';

/** Plants are drawn this much bigger than built, so they fill their tile at the diorama's distance. */
const SIZE = 1.32;

const leafy = (a: number, r: number, tilt: number, len: number, color: number, vein: number): Piece[] => {
  const x = Math.cos(a) * r, z = Math.sin(a) * r;
  return [
    { geo: ball(0.1, 12, 8), color, at: [x, 0.06, z], rot: [0, -a, tilt], scale: [len, 0.28, 0.62] },
    { geo: capsule(0.012, len * 0.12, 2, 5), color: vein, at: [x, 0.09, z], rot: [0, -a, Math.PI / 2 + tilt], scale: 1 },
  ];
};

/** Comfrey Crumble: a rosette of big fuzzy leaves, a round leafy head, and nodding bell flowers. */
export function comfrey(): Model {
  const leaves: Piece[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    leaves.push(...leafy(a, 0.19, 0.28, 2.1, i % 2 ? 0x3d8c3b : 0x4a9c41, 0x9ed37a));
  }
  const body = build([
    { geo: ball(0.3, 14, 8), color: 0x6b4a33, at: [0, -0.02, 0], scale: [1, 0.16, 0.9] }, // a little soil mound
    ...leaves,
    { geo: ball(0.15, 14, 10), color: 0x58a84a, at: [0, 0.17, 0.02], scale: [1, 0.92, 0.95] },
    { geo: ball(0.06, 10, 8), color: 0x6cbc58, at: [-0.08, 0.27, -0.02] },
    { geo: ball(0.055, 10, 8), color: 0x6cbc58, at: [0.09, 0.26, -0.03] },
    ...face([0, 0.18, 0.15], 1.05),
  ]);
  // the curled flower stalk with its nodding bells (comfrey's real flower shape)
  const bells: Piece[] = [];
  const bellAt: [number, number, number, number][] = [[0.1, 0.5, 0.02, 0xb07ad6], [0.15, 0.46, 0.05, 0xd59ae6], [0.06, 0.45, 0.07, 0xf2b4d6], [0.14, 0.53, -0.03, 0x9b6ad0]];
  for (const [x, y, z, c] of bellAt) bells.push({ geo: cone(0.04, 0.08, 8), color: c, at: [x, y, z], rot: [Math.PI, 0, 0.3] });
  const bloom = build([
    { geo: cyl(0.014, 0.018, 0.3, 6), color: 0x4f8f3e, at: [0.03, 0.4, 0.01], rot: [0, 0, -0.25] },
    { geo: cyl(0.012, 0.014, 0.12, 6), color: 0x4f8f3e, at: [0.1, 0.56, 0.01], rot: [0, 0, -1.1] },
    ...bells,
  ]);
  return { id: 'comfrey', parts: [{ geo: body, pivot: [0, 0, 0] }, { geo: bloom, pivot: [0.02, 0.26, 0] }], shadow: 0.36, height: 0.6 };
}

/** Rowan Flicker: a little tree with a round crown and red berry bunches; a springy branch flicks berries. */
export function rowan(): Model {
  const berries = (cx: number, cy: number, cz: number): Piece[] =>
    [[0, 0, 0], [0.045, -0.02, 0.01], [-0.04, -0.025, 0.015], [0.01, -0.06, 0.02], [0.03, 0.03, -0.01]].map(([x, y, z]) => ({ geo: ball(0.032, 8, 6), color: 0xd7342a, at: [cx + x!, cy + y!, cz + z!] as const }));
  const tree = build([
    { geo: ball(0.24, 12, 8), color: 0x6b4a33, at: [0, -0.02, 0], scale: [1, 0.16, 0.9] },
    { geo: cyl(0.045, 0.065, 0.42, 8), color: 0x8a5a3b, at: [0, 0.2, 0] },
    { geo: ball(0.2, 14, 10), color: 0x4f9a46, at: [0, 0.56, 0] },
    { geo: ball(0.14, 12, 8), color: 0x5fae52, at: [-0.16, 0.5, 0.02] },
    { geo: ball(0.13, 12, 8), color: 0x45893f, at: [0.14, 0.52, -0.04] },
    { geo: ball(0.12, 12, 8), color: 0x67b85a, at: [0.02, 0.71, -0.05] },
    ...berries(-0.15, 0.4, 0.1),
    ...berries(0.05, 0.42, 0.17),
    ...face([0, 0.57, 0.19], 1.1),
  ]);
  // the flicking branch: out to the right (toward the critters), ending in a leaf tuft and a berry bunch
  const arm = build([
    { geo: cyl(0.018, 0.026, 0.26, 6), color: 0x8a5a3b, at: [0.15, 0.4, 0.04], rot: [0, 0, -1.2] },
    { geo: ball(0.07, 10, 8), color: 0x5fae52, at: [0.28, 0.45, 0.04] },
    ...berries(0.3, 0.4, 0.1),
  ]);
  return { id: 'rowan', parts: [{ geo: tree, pivot: [0, 0, 0] }, { geo: arm, pivot: [0.04, 0.35, 0.04] }], shadow: 0.3, height: 0.85 };
}

/** Boxwood Block: a clipped square hedge with a little ball on top. Critters nibble gaps into it. */
export function boxwood(): Model {
  const bumps: Piece[] = [];
  // leaf bumps on the faces we see (front, top, sides)
  const spots: [number, number, number][] = [[-0.18, 0.18, 0.31], [0.12, 0.47, 0.31], [0.22, 0.28, 0.3], [-0.24, 0.42, 0.29], [0.31, 0.2, 0.1], [-0.31, 0.3, -0.05], [0.31, 0.44, -0.15], [-0.1, 0.59, 0.12], [0.15, 0.59, -0.1], [-0.2, 0.58, -0.18], [0.02, 0.12, 0.31], [-0.31, 0.12, 0.18]];
  for (const [x, y, z] of spots) bumps.push({ geo: ball(0.05, 8, 6), color: 0x3f8a42, at: [x, y, z] });
  const hedge = build([
    { geo: ball(0.36, 12, 8), color: 0x6b4a33, at: [0, -0.02, 0], scale: [1, 0.14, 0.95] },
    { geo: softBox(0.64, 0.56, 0.62, 0.38), color: 0x2f6e36, at: [0, 0.31, 0] },
    ...bumps,
    { geo: cyl(0.03, 0.03, 0.06, 6), color: 0x5b3f2a, at: [0, 0.62, 0] },
    { geo: ball(0.11, 12, 8), color: 0x347a3b, at: [0, 0.71, 0] },
    ...face([0, 0.34, 0.315], 1.35),
  ]);
  return { id: 'boxwood', parts: [{ geo: hedge, pivot: [0, 0, 0] }], shadow: 0.4, height: 0.8 };
}

export const PLANT_MODELS = { comfrey: () => scaled(comfrey(), SIZE), rowan: () => scaled(rowan(), SIZE), boxwood: () => scaled(boxwood(), SIZE) } as const;
export type PlantModelId = keyof typeof PLANT_MODELS;
