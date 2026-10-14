// The plants, redesigned for the bold look (owner's art direction, 2026-10-14): each has its own
// silhouette, a signature colour that stands out 3:1 from the soil, a big expressive face and a
// thick outline. Shots leave from branches, never from mouths (IP log). Built at full size: about
// one world unit tall, so they fill three quarters of a tile's height on screen or more.
import { ball, bigFace, buildOutlined, capsule, cone, cyl, softBox, torus, type Piece } from '../geo';
import type { Model } from './types';

/** Outline thickness for characters (world units). */
export const CHARACTER_OUTLINE = 0.03;

const mound = (r: number): Piece => ({ geo: ball(r, 14, 6), color: 0x6a3d22, at: [0, -0.02, 0], scale: [1, 0.22, 0.95] });

/** A big rounded leaf lying out from the middle at angle `a`. */
const leaf = (a: number, r: number, len: number, color: number, lift = 0.25): Piece[] => {
  const x = Math.cos(a) * r, z = Math.sin(a) * r;
  return [
    { geo: ball(0.13, 14, 8), color, at: [x, 0.07, z], rot: [0, -a, lift], scale: [len, 0.3, 0.7] },
    { geo: capsule(0.012, len * 0.16, 2, 5), color: 0x4f9e2c, at: [x, 0.11, z], rot: [0, -a, Math.PI / 2 + lift], outline: false },
  ];
};

/**
 * Comfrey Crumble (producer), lilac: a plump round lilac bud with a big happy face, sitting in a
 * ring of big fuzzy leaves, with comfrey's real curled flower stalk on top, its bells nodding.
 */
export function comfrey(): Model {
  const leaves: Piece[] = [];
  for (let i = 0; i < 6; i++) leaves.push(...leaf((i / 6) * Math.PI * 2 + 0.25, 0.26, 2.0, i % 2 ? 0x8fe05a : 0x7ad24c));
  const body = buildOutlined([
    mound(0.42),
    ...leaves,
    { geo: ball(0.3, 18, 14), color: 0xd4adff, at: [0, 0.4, 0], scale: [1, 0.95, 0.92] },
    { geo: ball(0.1, 10, 8), color: 0xe6ccff, at: [-0.13, 0.55, 0.12], outline: false },
    ...bigFace([0, 0.4, 0.27], 1.15, 'happy'),
  ], CHARACTER_OUTLINE);
  // the curled stalk with its bells (comfrey's real "scorpion tail" of flowers)
  const bells: Piece[] = [];
  const bellAt: [number, number, number, number][] = [[0.2, 0.86, 0.03, 0xb98cff], [0.27, 0.78, 0.05, 0xe39be9], [0.24, 0.7, 0.02, 0xb98cff], [0.12, 0.93, 0.0, 0xe39be9]];
  for (const [x, y, z, c] of bellAt) bells.push({ geo: cone(0.06, 0.12, 10), color: c, at: [x, y, z], rot: [Math.PI, 0, 0.35] });
  const bloom = buildOutlined([
    { geo: torus(0.13, 0.026, 6, 16, Math.PI * 1.35), color: 0x5fb33a, at: [0.08, 0.8, 0], rot: [0, 0, -0.4] },
    ...bells,
  ], CHARACTER_OUTLINE);
  return { id: 'comfrey', parts: [{ ...body, pivot: [0, 0, 0] }, { ...bloom, pivot: [0.02, 0.66, 0] }], shadow: 0.42, height: 1.0, fill: 0xd4adff };
}

/**
 * Rowan Flicker (shooter), orange: a little round tree in rowan's autumn orange with a big face in
 * its crown, red berry bunches, and a springy branch on the right that flicks berries.
 */
export function rowan(): Model {
  const berries = (cx: number, cy: number, cz: number, s = 1): Piece[] =>
    [[0, 0, 0], [0.06, -0.03, 0.01], [-0.055, -0.035, 0.02], [0.01, -0.08, 0.03], [0.04, 0.04, -0.01]].map(([x, y, z]) => ({ geo: ball(0.045 * s, 10, 8), color: 0xff5a4c, at: [cx + x! * s, cy + y! * s, cz + z! * s] as const }));
  // a puffy, many-lobed autumn crown (wider than tall) on a sturdy trunk with roots
  const lobes: Piece[] = [];
  const ring: [number, number, number, number][] = [[-0.3, 0.6, 0.0, 0.17], [-0.2, 0.84, -0.02, 0.17], [0.05, 0.92, -0.04, 0.18], [0.29, 0.82, -0.02, 0.17], [0.36, 0.6, 0.0, 0.16], [0.18, 0.46, 0.06, 0.15], [-0.18, 0.46, 0.06, 0.15]];
  ring.forEach(([x, y, z, r], i) => lobes.push({ geo: ball(r, 12, 10), color: i % 2 ? 0xffc56e : 0xf59a37, at: [x, y, z] }));
  const tree = buildOutlined([
    mound(0.34),
    { geo: cyl(0.08, 0.12, 0.44, 10), color: 0xa8693c, at: [0, 0.22, 0] },
    { geo: cone(0.05, 0.16, 6), color: 0xa8693c, at: [-0.11, 0.05, 0.03], rot: [0, 0, 1.0] },
    { geo: cone(0.05, 0.16, 6), color: 0xa8693c, at: [0.11, 0.05, 0.03], rot: [0, 0, -1.0] },
    ...lobes,
    { geo: ball(0.3, 18, 14), color: 0xffb04d, at: [0.02, 0.66, 0.04], scale: [1.12, 0.92, 0.9] },
    ...berries(-0.32, 0.42, 0.16),
    ...berries(0.32, 0.44, 0.14, 0.9),
    ...berries(-0.05, 0.95, 0.12, 0.8),
    ...bigFace([0.02, 0.66, 0.32], 1.1, 'grin'),
  ], CHARACTER_OUTLINE);
  // the flicking branch: out to the right (toward the critters), holding a berry bunch to fling
  const arm = buildOutlined([
    { geo: cyl(0.026, 0.038, 0.34, 8), color: 0xa8693c, at: [0.24, 0.48, 0.06], rot: [0, 0, -1.15] },
    { geo: ball(0.09, 10, 8), color: 0xffb04d, at: [0.4, 0.56, 0.06] },
    ...berries(0.44, 0.5, 0.12, 1.15),
  ], CHARACTER_OUTLINE);
  return { id: 'rowan', parts: [{ ...tree, pivot: [0, 0, 0] }, { ...arm, pivot: [0.08, 0.42, 0.06] }], shadow: 0.36, height: 1.06, fill: 0xffb04d };
}

/**
 * Boxwood Block (blocker), emerald: a tall clipped square hedge with a topiary bobble on top and a
 * brave face. Square, never nut-shaped; critters nibble gaps into it.
 */
export function boxwood(): Model {
  const bumps: Piece[] = [];
  const spots: [number, number, number][] = [[-0.24, 0.26, 0.34], [0.2, 0.62, 0.34], [0.27, 0.3, 0.33], [-0.3, 0.6, 0.31], [0.38, 0.22, 0.12], [-0.38, 0.4, -0.05], [0.38, 0.62, -0.12], [-0.1, 0.8, 0.14], [0.18, 0.8, -0.1], [-0.24, 0.79, -0.18]];
  for (const [x, y, z] of spots) bumps.push({ geo: ball(0.06, 8, 6), color: 0x3cc778, at: [x, y, z], outline: false });
  const hedge = buildOutlined([
    mound(0.44),
    { geo: softBox(0.82, 0.8, 0.72, 0.36), color: 0x4fdc8c, at: [0, 0.42, 0] },
    { geo: softBox(0.7, 0.08, 0.6, 0.6), color: 0x7cebac, at: [0, 0.8, 0], outline: false },
    ...bumps,
    { geo: cyl(0.04, 0.04, 0.08, 8), color: 0x7a4a2a, at: [0, 0.86, 0] },
    { geo: ball(0.15, 14, 10), color: 0x4fdc8c, at: [0, 0.98, 0] },
    ...bigFace([0, 0.45, 0.37], 1.25, 'brave'),
  ], CHARACTER_OUTLINE);
  return { id: 'boxwood', parts: [{ ...hedge, pivot: [0, 0, 0] }], shadow: 0.46, height: 1.12, fill: 0x4fdc8c };
}

export const PLANT_MODELS = { comfrey, rowan, boxwood } as const;
export type PlantModelId = keyof typeof PLANT_MODELS;
