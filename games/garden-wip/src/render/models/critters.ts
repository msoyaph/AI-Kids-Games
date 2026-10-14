// The critters, built from soft shapes in code: real animals, round and friendly, after the snacks.
// Models face -x (the way they walk, toward the blanket); the view turns them a little toward the
// camera so their faces read. Sizes are world units (a tile is 1 wide).
import { ball, build, capsule, cone, cyl, torus, type Piece } from '../geo';
import { scaled, type Model } from './types';

const eyes = (x: number, y: number, z: number, r: number): Piece[] => [
  { geo: ball(r, 8, 6), color: 0x1f1714, at: [x, y, z] },
  { geo: ball(r * 0.38, 6, 4), color: 0xffffff, at: [x - r * 0.45, y + r * 0.4, z + r * 0.55] },
];

/** Snack Snail: a soft pale body, eyes on stalks, and a caramel shell with a cream swirl. */
export function snail(): Model {
  const body = build([
    { geo: capsule(0.085, 0.36, 4, 12), color: 0xdcc6a8, at: [0, 0.085, 0], rot: [0, 0, Math.PI / 2], scale: [1, 1, 0.95] },
    { geo: ball(0.1, 12, 10), color: 0xe5d1b5, at: [-0.25, 0.15, 0] },
    { geo: cyl(0.013, 0.016, 0.14, 6), color: 0xd8c09f, at: [-0.28, 0.27, 0.045], rot: [0.2, 0, 0.35] },
    { geo: cyl(0.013, 0.016, 0.14, 6), color: 0xd8c09f, at: [-0.28, 0.27, -0.045], rot: [-0.2, 0, 0.35] },
    ...eyes(-0.305, 0.345, 0.06, 0.03),
    ...eyes(-0.305, 0.345, -0.06, 0.03),
    { geo: torus(0.03, 0.007, 4, 10, Math.PI), color: 0x7a4e3a, at: [-0.33, 0.13, 0.05], rot: [0, -1.1, Math.PI] },
  ]);
  const shell = build([
    { geo: ball(0.16, 14, 12), color: 0xe39b4a, scale: [1, 1, 0.78] },
    { geo: torus(0.095, 0.026, 6, 18), color: 0xfbe2ad, at: [0, 0, 0.1] },
    { geo: ball(0.045, 10, 8), color: 0xfbe2ad, at: [0.01, 0.01, 0.12] },
    { geo: torus(0.095, 0.026, 6, 18), color: 0xfbe2ad, at: [0, 0, -0.1] },
  ]);
  return { id: 'snail', parts: [{ geo: body, pivot: [0, 0, 0] }, { geo: shell, pivot: [0.06, 0.27, 0] }], shadow: 0.26, height: 0.42 };
}

/** One ant of an Ant Column: red-brown, three round body parts, six legs and curly antennae. */
export function ant(): Model {
  const c = 0x8c3a20, leg = 0x5c2513;
  const legs: Piece[] = [];
  for (const [x, a] of [[-0.03, 0.5], [0, 0], [0.03, -0.5]] as const) {
    for (const side of [1, -1]) legs.push({ geo: cyl(0.007, 0.007, 0.11, 4), color: leg, at: [x + a * 0.04, 0.035, side * 0.045], rot: [side * 1.05, a, 0] });
  }
  const g = build([
    { geo: ball(0.058, 10, 8), color: c, at: [0.075, 0.07, 0], scale: [1.25, 1, 1] },
    { geo: ball(0.034, 8, 6), color: c, at: [0, 0.07, 0] },
    { geo: ball(0.046, 10, 8), color: 0x9c4428, at: [-0.065, 0.085, 0] },
    ...legs,
    { geo: cyl(0.005, 0.005, 0.07, 4), color: leg, at: [-0.085, 0.14, 0.02], rot: [0.4, 0, 0.5] },
    { geo: cyl(0.005, 0.005, 0.07, 4), color: leg, at: [-0.085, 0.14, -0.02], rot: [-0.4, 0, 0.5] },
    ...eyes(-0.1, 0.1, 0.03, 0.014),
    ...eyes(-0.1, 0.1, -0.03, 0.014),
  ]);
  return { id: 'ant', parts: [{ geo: g, pivot: [0, 0, 0] }], shadow: 0.1, height: 0.18 };
}

/** Magpie: black and white with a long blue-green tail; borrows plants. Wings flap as separate parts. */
export function magpie(): Model {
  const black = 0x1e2029, white = 0xf3f3ee, sheen = 0x2d6378;
  const body = build([
    { geo: ball(0.11, 14, 10), color: black, scale: [1.45, 1, 1] },
    { geo: ball(0.095, 12, 10), color: white, at: [0.02, -0.035, 0], scale: [1.3, 0.85, 0.98] },
    { geo: ball(0.085, 12, 10), color: black, at: [-0.15, 0.06, 0] },
    { geo: cone(0.026, 0.09, 8), color: 0x34363e, at: [-0.25, 0.05, 0], rot: [0, 0, Math.PI / 2] },
    ...eyes(-0.19, 0.09, 0.06, 0.02),
    ...eyes(-0.19, 0.09, -0.06, 0.02),
    { geo: cone(0.06, 0.38, 8), color: sheen, at: [0.3, 0.03, 0], rot: [0, 0, Math.PI / 2 + 0.12], scale: [1, 1, 0.35] },
    { geo: cone(0.03, 0.06, 6), color: 0x3a3c44, at: [0.02, -0.12, 0.03], rot: [Math.PI, 0, 0] },
    { geo: cone(0.03, 0.06, 6), color: 0x3a3c44, at: [0.02, -0.12, -0.03], rot: [Math.PI, 0, 0] },
  ]);
  const wing = (side: 1 | -1) => build([
    { geo: ball(0.14, 12, 8), color: black, at: [0.03, 0, side * 0.12], scale: [1.15, 0.16, 0.85] },
    { geo: ball(0.08, 10, 6), color: white, at: [-0.01, 0.012, side * 0.1], scale: [1.1, 0.16, 0.7] },
    { geo: ball(0.08, 10, 6), color: sheen, at: [0.12, 0.004, side * 0.18], scale: [1.2, 0.14, 0.6] },
  ]);
  return {
    id: 'magpie',
    parts: [{ geo: body, pivot: [0, 0, 0] }, { geo: wing(1), pivot: [0, 0.04, 0.06], twoSided: true }, { geo: wing(-1), pivot: [0, 0.04, -0.06], twoSided: true }],
    shadow: 0.22,
    height: 0.3,
  };
}

export const CRITTER_MODELS = { snail: () => scaled(snail(), 1.5), ant: () => scaled(ant(), 1.7), magpie: () => scaled(magpie(), 1.45) } as const;
export type CritterModelId = keyof typeof CRITTER_MODELS;
