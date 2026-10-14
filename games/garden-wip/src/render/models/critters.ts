// The critters, redesigned for the bold look: real animals, big, colourful and round, with big
// eyes and thick outlines. Models face -x (the way they walk, toward the blanket); the view turns
// them a little toward the camera and leans them back so their faces read. About one world unit
// tall, so each fills three quarters of a tile's height on screen or more.
import { ball, buildOutlined, capsule, cone, cyl, torus, type Piece } from '../geo';
import { CHARACTER_OUTLINE } from './plants';
import { scaled, type Model } from './types';

/** A big cartoon eye looking forward-left (-x, toward the camera at +z). */
const eye = (x: number, y: number, z: number, r: number): Piece[] => [
  { geo: ball(r, 12, 10), color: 0xffffff, at: [x, y, z], scale: [0.8, 1.1, 0.8] },
  { geo: ball(r * 0.56, 10, 8), color: 0x1d1410, at: [x - r * 0.42, y - r * 0.05, z + r * 0.34], scale: [0.6, 1.05, 0.6], outline: false },
  { geo: ball(r * 0.2, 6, 4), color: 0xffffff, at: [x - r * 0.62, y + r * 0.3, z + r * 0.42], outline: false },
];

const smile = (x: number, y: number, z: number, s: number, rotY = -0.9): Piece => ({ geo: torus(0.045 * s, 0.012 * s, 4, 12, Math.PI), color: 0x3a1a14, at: [x, y, z], rot: [0, rotY, Math.PI], outline: false });

/** Snack Snail: a soft periwinkle body with eyes on stalks and a big golden shell with a coral swirl. */
export function snail(): Model {
  const body = buildOutlined([
    { geo: capsule(0.13, 0.5, 6, 14), color: 0xa9bcff, at: [0.02, 0.13, 0], rot: [0, 0, Math.PI / 2], scale: [1, 1, 0.92] },
    { geo: ball(0.17, 14, 12), color: 0xb8c8ff, at: [-0.36, 0.26, 0] },
    { geo: cyl(0.022, 0.028, 0.24, 6), color: 0xa9bcff, at: [-0.42, 0.48, 0.07], rot: [0.25, 0, 0.3] },
    { geo: cyl(0.022, 0.028, 0.24, 6), color: 0xa9bcff, at: [-0.42, 0.48, -0.07], rot: [-0.25, 0, 0.3] },
    ...eye(-0.47, 0.62, 0.1, 0.075),
    ...eye(-0.47, 0.62, -0.1, 0.075),
    smile(-0.48, 0.22, 0.1, 1.3),
    { geo: ball(0.03, 6, 4), color: 0xff9db0, at: [-0.44, 0.25, 0.15], scale: [1, 0.7, 0.4], outline: false },
  ], CHARACTER_OUTLINE);
  const shell = buildOutlined([
    { geo: ball(0.3, 18, 14), color: 0xffd15c, scale: [1, 1, 0.8] },
    { geo: torus(0.17, 0.05, 8, 22), color: 0xff7a59, at: [0, 0, 0.19], outline: false },
    { geo: ball(0.08, 10, 8), color: 0xff7a59, at: [0.02, 0.01, 0.23], outline: false },
    { geo: torus(0.17, 0.05, 8, 22), color: 0xff7a59, at: [0, 0, -0.19], outline: false },
  ], CHARACTER_OUTLINE);
  return { id: 'snail', parts: [{ ...body, pivot: [0, 0, 0] }, { ...shell, pivot: [0.1, 0.5, 0] }], shadow: 0.4, height: 0.86, fill: 0xffd15c };
}

/** The snail drawn a size up, so it fills its tile like the others. */
const bigSnail = () => scaled(snail(), 1.22);

/**
 * One ant of an Ant Column: a chunky coral ant standing tall on its back four legs with two little
 * arms, big eyes and curly antennae. Six legs, no clothes; marches in a line of three.
 */
export function ant(): Model {
  const c = 0xff9a6c, dark = 0x6b2e1c;
  const legs: Piece[] = [];
  for (const [x, a] of [[0.06, 0.4], [-0.02, -0.2]] as const) {
    for (const side of [1, -1]) legs.push({ geo: cyl(0.018, 0.016, 0.24, 6), color: dark, at: [x, 0.1, side * 0.09], rot: [side * 0.45, 0, a] });
  }
  const g = buildOutlined([
    { geo: ball(0.19, 14, 12), color: c, at: [0.16, 0.26, 0], scale: [1.2, 1, 1.05] },
    { geo: ball(0.09, 12, 10), color: 0xff8a58, at: [0.0, 0.36, 0], scale: [0.9, 1.15, 0.9] },
    { geo: ball(0.2, 14, 12), color: c, at: [-0.06, 0.6, 0], scale: [1, 0.95, 1.05] },
    ...legs,
    { geo: cyl(0.016, 0.014, 0.2, 6), color: dark, at: [-0.12, 0.4, 0.1], rot: [0.5, 0, 0.9] },
    { geo: cyl(0.016, 0.014, 0.2, 6), color: dark, at: [-0.12, 0.4, -0.1], rot: [-0.5, 0, 0.9] },
    { geo: cyl(0.012, 0.012, 0.2, 5), color: dark, at: [-0.12, 0.82, 0.07], rot: [0.35, 0, 0.45] },
    { geo: cyl(0.012, 0.012, 0.2, 5), color: dark, at: [-0.12, 0.82, -0.07], rot: [-0.35, 0, 0.45] },
    { geo: ball(0.03, 8, 6), color: dark, at: [-0.17, 0.92, 0.11] },
    { geo: ball(0.03, 8, 6), color: dark, at: [-0.17, 0.92, -0.11] },
    ...eye(-0.2, 0.66, 0.09, 0.07),
    ...eye(-0.2, 0.66, -0.09, 0.07),
    smile(-0.23, 0.52, 0.07, 1.15),
  ], CHARACTER_OUTLINE);
  return { id: 'ant', parts: [{ ...g, pivot: [0, 0, 0] }], shadow: 0.24, height: 0.95, fill: 0xff9a6c };
}

/** Magpie: black and bright white with a teal-blue sheen and a long tail; wings flap as parts. */
export function magpie(): Model {
  const black = 0x23252f, white = 0xffffff, sheen = 0x47c4f0;
  const body = buildOutlined([
    { geo: ball(0.2, 16, 12), color: black, scale: [1.4, 1, 1] },
    { geo: ball(0.17, 14, 12), color: white, at: [0.04, -0.06, 0], scale: [1.3, 0.85, 1.06] },
    { geo: ball(0.09, 12, 8), color: white, at: [0.02, 0.12, 0.1], scale: [1.6, 0.5, 0.8] },
    { geo: ball(0.09, 12, 8), color: white, at: [0.02, 0.12, -0.1], scale: [1.6, 0.5, 0.8] },
    { geo: ball(0.15, 14, 12), color: black, at: [-0.28, 0.1, 0] },
    { geo: cone(0.045, 0.14, 8), color: 0x3a3c46, at: [-0.45, 0.08, 0], rot: [0, 0, Math.PI / 2] },
    ...eye(-0.34, 0.15, 0.11, 0.06),
    ...eye(-0.34, 0.15, -0.11, 0.06),
    { geo: cone(0.1, 0.6, 10), color: sheen, at: [0.52, 0.06, 0], rot: [0, 0, Math.PI / 2 + 0.12], scale: [1, 1, 0.38] },
    { geo: cone(0.05, 0.1, 6), color: 0x3a3c46, at: [0.04, -0.22, 0.06], rot: [Math.PI, 0, 0] },
    { geo: cone(0.05, 0.1, 6), color: 0x3a3c46, at: [0.04, -0.22, -0.06], rot: [Math.PI, 0, 0] },
  ], CHARACTER_OUTLINE);
  const wing = (side: 1 | -1) => buildOutlined([
    { geo: ball(0.24, 14, 8), color: black, at: [0.05, 0, side * 0.22], scale: [1.15, 0.18, 0.85] },
    { geo: ball(0.17, 12, 6), color: white, at: [-0.02, 0.03, side * 0.2], scale: [1.15, 0.2, 0.8], outline: false },
    { geo: ball(0.14, 12, 6), color: sheen, at: [0.2, 0.01, side * 0.32], scale: [1.2, 0.16, 0.62], outline: false },
  ], CHARACTER_OUTLINE);
  return {
    id: 'magpie',
    parts: [{ ...body, pivot: [0, 0, 0] }, { ...wing(1), pivot: [0, 0.06, 0.1], twoSided: true }, { ...wing(-1), pivot: [0, 0.06, -0.1], twoSided: true }],
    shadow: 0.34,
    height: 0.5,
    fill: white,
  };
}

export const CRITTER_MODELS = { snail: bigSnail, ant, magpie: () => scaled(magpie(), 1.45) } as const;
export type CritterModelId = keyof typeof CRITTER_MODELS;
