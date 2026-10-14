// The plants, in the bold look (owner's art direction, 2026-10-14): each has its own silhouette, a
// signature colour that stands out 3:1 from the soil, a big expressive face and a thick outline.
// Shots leave from branches, pods and stalks, never from mouths (IP log). About one world unit tall,
// so they fill three quarters of a tile's height on screen or more. Part 0 is the body; a second
// part, when there is one, is what moves on its own (a flicking branch, a nodding stalk, a bee).
import { ball, bigFace, buildOutlined, capsule, cone, cyl, softBox, torus, type Piece, type Vec3 } from '../geo';
import type { Model, Part } from './types';

/** Outline thickness for characters (world units). */
export const CHARACTER_OUTLINE = 0.03;

const SOIL = 0x6a3d22, STEM = 0x5fb33a, WOOD = 0xa8693c;
const mound = (r: number): Piece => ({ geo: ball(r, 14, 6), color: SOIL, at: [0, -0.02, 0], scale: [1, 0.22, 0.95] });

/** A big rounded leaf lying out from the middle at angle `a`. */
const leaf = (a: number, r: number, len: number, color: number, lift = 0.25, y = 0.07): Piece[] => {
  const x = Math.cos(a) * r, z = Math.sin(a) * r;
  return [
    { geo: ball(0.13, 14, 8), color, at: [x, y, z], rot: [0, -a, lift], scale: [len, 0.3, 0.7] },
    { geo: capsule(0.012, len * 0.16, 2, 5), color: 0x4f9e2c, at: [x, y + 0.04, z], rot: [0, -a, Math.PI / 2 + lift], outline: false },
  ];
};
const leafRing = (n: number, r: number, len: number, a: number, b: number, lift = 0.25, y = 0.07, turn = 0.25) => Array.from({ length: n }, (_, i) => leaf((i / n) * Math.PI * 2 + turn, r, len, i % 2 ? a : b, lift, y)).flat();

/** A stem from one point to another. */
function stem(from: Vec3, to: Vec3, r = 0.03, color = STEM): Piece {
  const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2], len = Math.hypot(dx, dy, dz);
  // a cylinder stands along y; tip it over toward the target
  const rz = -Math.atan2(dx, dy), rx = Math.atan2(dz, Math.hypot(dx, dy));
  return { geo: cyl(r * 0.8, r, len, 7), color, at: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2], rot: [rx, 0, rz] };
}

/** A flower: `n` round petals around a centre, facing up (+y) or toward the camera (+z). */
function flower(at: Vec3, n: number, r: number, petal: number, centre: number, facing: 'up' | 'front' = 'up', size = 1): Piece[] {
  const [x, y, z] = at, out: Piece[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, px = Math.cos(a) * r * size, pq = Math.sin(a) * r * size;
    out.push(facing === 'up'
      ? { geo: ball(0.07 * size, 10, 6), color: petal, at: [x + px, y, z + pq], rot: [0, -a, 0], scale: [1.4, 0.35, 0.9] }
      : { geo: ball(0.07 * size, 10, 6), color: petal, at: [x + px, y + pq, z], rot: [0, 0, a], scale: [1.4, 0.9, 0.35] });
  }
  out.push({ geo: ball(0.07 * size, 10, 8), color: centre, at: [x, y + (facing === 'up' ? 0.02 : 0), z + (facing === 'front' ? 0.02 : 0)], outline: false });
  return out;
}

const part = (pieces: Piece[], pivot: Vec3 = [0, 0, 0], twoSided = false): Part => ({ ...buildOutlined(pieces, CHARACTER_OUTLINE), pivot, twoSided });
const model = (id: string, fill: number, height: number, shadow: number, ...parts: Part[]): Model => ({ id, parts, shadow, height, fill });

/** Comfrey Crumble (producer), pink-lilac: a plump bud with a big happy face, a ring of big fuzzy leaves, and comfrey's curled stalk of nodding bells. */
export function comfrey(): Model {
  const bells: Piece[] = ([[0.2, 0.86, 0.03, 0xc98cff], [0.27, 0.78, 0.05, 0xf0a8f5], [0.24, 0.7, 0.02, 0xc98cff], [0.12, 0.93, 0.0, 0xf0a8f5]] as const).map(([x, y, z, c]) => ({ geo: cone(0.06, 0.12, 10), color: c, at: [x, y, z], rot: [Math.PI, 0, 0.35] }));
  return model('comfrey', 0xe8a8f5, 1.0, 0.42,
    part([mound(0.42), ...leafRing(6, 0.26, 2.0, 0x8fe05a, 0x7ad24c), { geo: ball(0.3, 18, 14), color: 0xe8a8f5, at: [0, 0.4, 0], scale: [1, 0.95, 0.92] }, { geo: ball(0.1, 10, 8), color: 0xf6d2fb, at: [-0.13, 0.55, 0.12], outline: false }, ...bigFace([0, 0.4, 0.27], 1.15, 'happy')]),
    part([{ geo: torus(0.13, 0.026, 6, 16, Math.PI * 1.35), color: STEM, at: [0.08, 0.8, 0], rot: [0, 0, -0.4] }, ...bells], [0.02, 0.66, 0]));
}

/** Rowan Flicker (shooter), orange: a puffy autumn tree with a face in its crown, red berry bunches and a springy flicking branch. */
export function rowan(): Model {
  const berries = (cx: number, cy: number, cz: number, s = 1): Piece[] =>
    [[0, 0, 0], [0.06, -0.03, 0.01], [-0.055, -0.035, 0.02], [0.01, -0.08, 0.03], [0.04, 0.04, -0.01]].map(([x, y, z]) => ({ geo: ball(0.045 * s, 10, 8), color: 0xff5a4c, at: [cx + x! * s, cy + y! * s, cz + z! * s] as const }));
  const ring: [number, number, number, number][] = [[-0.3, 0.6, 0.0, 0.17], [-0.2, 0.84, -0.02, 0.17], [0.05, 0.92, -0.04, 0.18], [0.29, 0.82, -0.02, 0.17], [0.36, 0.6, 0.0, 0.16], [0.18, 0.46, 0.06, 0.15], [-0.18, 0.46, 0.06, 0.15]];
  return model('rowan', 0xffb04d, 1.06, 0.36,
    part([mound(0.34), { geo: cyl(0.08, 0.12, 0.44, 10), color: WOOD, at: [0, 0.22, 0] }, { geo: cone(0.05, 0.16, 6), color: WOOD, at: [-0.11, 0.05, 0.03], rot: [0, 0, 1.0] }, { geo: cone(0.05, 0.16, 6), color: WOOD, at: [0.11, 0.05, 0.03], rot: [0, 0, -1.0] },
      ...ring.map(([x, y, z, r], i): Piece => ({ geo: ball(r, 12, 10), color: i % 2 ? 0xffc56e : 0xf59a37, at: [x, y, z] })),
      { geo: ball(0.3, 18, 14), color: 0xffb04d, at: [0.02, 0.66, 0.04], scale: [1.12, 0.92, 0.9] }, ...berries(-0.32, 0.42, 0.16), ...berries(0.32, 0.44, 0.14, 0.9), ...berries(-0.05, 0.95, 0.12, 0.8), ...bigFace([0.02, 0.66, 0.32], 1.1, 'grin')]),
    part([{ geo: cyl(0.026, 0.038, 0.34, 8), color: WOOD, at: [0.24, 0.48, 0.06], rot: [0, 0, -1.15] }, { geo: ball(0.09, 10, 8), color: 0xffb04d, at: [0.4, 0.56, 0.06] }, ...berries(0.44, 0.5, 0.12, 1.15)], [0.08, 0.42, 0.06]));
}

/** Boxwood Block (blocker), emerald: a tall clipped square hedge with a topiary bobble and a brave face. */
export function boxwood(): Model {
  const spots: [number, number, number][] = [[-0.24, 0.26, 0.34], [0.2, 0.62, 0.34], [0.27, 0.3, 0.33], [-0.3, 0.6, 0.31], [0.38, 0.22, 0.12], [-0.38, 0.4, -0.05], [0.38, 0.62, -0.12], [-0.1, 0.8, 0.14], [0.18, 0.8, -0.1], [-0.24, 0.79, -0.18]];
  return model('boxwood', 0x4fdc8c, 1.12, 0.46, part([mound(0.44), { geo: softBox(0.82, 0.8, 0.72, 0.36), color: 0x4fdc8c, at: [0, 0.42, 0] }, { geo: softBox(0.7, 0.08, 0.6, 0.6), color: 0x7cebac, at: [0, 0.8, 0], outline: false },
    ...spots.map(([x, y, z]): Piece => ({ geo: ball(0.06, 8, 6), color: 0x3cc778, at: [x, y, z], outline: false })), { geo: cyl(0.04, 0.04, 0.08, 8), color: 0x7a4a2a, at: [0, 0.86, 0] }, { geo: ball(0.15, 14, 10), color: 0x4fdc8c, at: [0, 0.98, 0] }, ...bigFace([0, 0.45, 0.37], 1.25, 'brave')]));
}

/** Snuggly Lamb's Ear (slower), silver: a soft mound with tall fuzzy leaves standing up like a lamb's ears. */
export function lambsEar(): Model {
  const ears: Piece[] = [];
  for (const [x, z, a, h] of [[-0.2, 0, 0.35, 0.95], [0.2, 0, -0.35, 0.95], [-0.32, -0.08, 0.7, 0.7], [0.32, -0.08, -0.7, 0.7], [0, -0.14, 0, 0.88]] as const) ears.push({ geo: ball(0.13, 14, 10), color: 0xd5dce6, at: [x, h * 0.55, z], rot: [0, 0, a], scale: [0.9, h * 3.2, 0.5] });
  return model('lambs-ear', 0xe4e8ee, 1.0, 0.42, part([mound(0.4), ...ears, { geo: ball(0.3, 18, 14), color: 0xe4e8ee, at: [0, 0.32, 0.04], scale: [1.1, 0.9, 0.95] }, { geo: ball(0.08, 8, 6), color: 0xf6f8fb, at: [-0.15, 0.45, 0.2], outline: false }, ...bigFace([0, 0.32, 0.31], 1.1, 'happy')]));
}

/** Maple Twirler (lobber), maple red: a five-pointed maple-leaf head on a slim trunk, with winged seeds that spin away. */
export function maple(): Model {
  const lobes: Piece[] = [];
  for (let i = 0; i < 5; i++) { const a = Math.PI / 2 + (i - 2) * 0.62; lobes.push({ geo: cone(0.17, 0.42, 8), color: i % 2 ? 0xff9d93 : 0xff8a80, at: [Math.cos(a) * 0.24, 0.62 + Math.sin(a) * 0.24, 0], rot: [0, 0, a - Math.PI / 2], scale: [1, 1, 0.45] }); }
  return model('maple', 0xff8a80, 1.08, 0.36,
    part([mound(0.32), { geo: cyl(0.05, 0.08, 0.44, 8), color: WOOD, at: [0, 0.2, 0] }, ...lobes, { geo: ball(0.27, 16, 12), color: 0xff8a80, at: [0, 0.62, 0.02], scale: [1, 0.95, 0.6] }, ...bigFace([0, 0.62, 0.18], 1.05, 'happy')]),
    part([...[-1, 1].flatMap(s => [{ geo: ball(0.04, 8, 6), color: 0xc76b3d, at: [0.3 * s, 0.34, 0.1] as Vec3 }, { geo: ball(0.08, 8, 6), color: 0xffc56e, at: [0.3 * s + 0.08, 0.38, 0.1] as Vec3, scale: [1.3, 0.25, 0.7] as Vec3 }])], [0, 0.5, 0]));
}

/** Basil Buddy (support), bright green: a glossy bush of round leaves with a little white flower spike. */
export function basil(): Model {
  const leaves: Piece[] = [];
  for (const [x, y, z, r] of [[-0.2, 0.3, 0.06, 0.16], [0.2, 0.32, 0.04, 0.16], [0, 0.5, -0.02, 0.17], [-0.16, 0.62, -0.06, 0.13], [0.16, 0.62, -0.04, 0.13], [0, 0.22, 0.12, 0.15]] as const) leaves.push({ geo: ball(r, 14, 10), color: 0x8fe05a, at: [x, y, z], scale: [1, 0.85, 0.8] });
  return model('basil', 0x8fe05a, 1.0, 0.38, part([mound(0.36), stem([0, 0, 0], [0, 0.5, 0], 0.035), ...leaves, { geo: ball(0.25, 16, 12), color: 0x9ae867, at: [0, 0.42, 0.08] }, ...flower([0, 0.84, -0.04], 5, 0.05, 0xffffff, 0xf3f3f3, 'up', 0.8), stem([0, 0.6, -0.04], [0, 0.82, -0.04], 0.02), ...bigFace([0, 0.42, 0.32], 1.05, 'grin')]));
}

/** Lavender Shoo (push-back), lavender: tall slim flower spikes over a grey-green tuft. */
export function lavender(): Model {
  const spikes: Piece[] = [];
  for (const [x, z, lean, h] of [[-0.18, -0.02, 0.25, 0.95], [0, -0.06, 0, 1.08], [0.18, -0.02, -0.25, 0.95], [-0.08, 0.06, 0.12, 0.88], [0.09, 0.05, -0.12, 0.9]] as const) {
    spikes.push(stem([x * 0.4, 0.2, z], [x + lean * 0.3, h, z], 0.018));
    for (let k = 0; k < 6; k++) spikes.push({ geo: ball(0.045 - k * 0.003, 8, 6), color: k % 2 ? 0xa9b4ff : 0x8f9bff, at: [x + lean * 0.3 * (0.6 + k * 0.08), h - 0.28 + k * 0.055, z] });
  }
  return model('lavender', 0xa9b4ff, 1.08, 0.36, part([mound(0.36), ...leafRing(7, 0.16, 1.4, 0xa9c8a0, 0x98b88f, 0.6, 0.12), ...spikes, { geo: ball(0.24, 16, 12), color: 0xa9b4ff, at: [0, 0.32, 0.08], scale: [1, 0.9, 0.85] }, ...bigFace([0, 0.32, 0.29], 1.0, 'happy')]));
}

/** Arrowhead Skimmer (water shooter), fresh lime: arrow-shaped leaves standing in its channel, with white three-petal flowers. */
export function arrowhead(): Model {
  const arrows: Piece[] = [];
  for (const [x, z, a] of [[-0.24, -0.04, 0.35], [0.24, -0.04, -0.35], [0, -0.12, 0]] as const) arrows.push(stem([x * 0.3, 0, z], [x, 0.6, z], 0.025), { geo: cone(0.18, 0.4, 3), color: 0xa6ec6c, at: [x, 0.78, z], rot: [0, 0, a], scale: [1, 1, 0.3] });
  return model('arrowhead', 0xa6ec6c, 1.0, 0.34, part([{ geo: torus(0.3, 0.05, 6, 18), color: 0x7cc7e8, at: [0, 0.02, 0], rot: [Math.PI / 2, 0, 0], outline: false }, ...arrows, { geo: ball(0.25, 16, 12), color: 0xa6ec6c, at: [0, 0.32, 0.06] }, ...flower([0.24, 0.5, 0.18], 3, 0.06, 0xffffff, 0xffe680, 'front', 0.9), ...bigFace([0, 0.33, 0.29], 1.05, 'grin')]));
}

/** Pickerelweed Splash (water slower), sky blue: heart-shaped leaves and a tall spike of blue flowers. */
export function pickerelweed(): Model {
  const spike: Piece[] = [];
  for (let k = 0; k < 7; k++) spike.push({ geo: ball(0.06 - k * 0.004, 8, 6), color: k % 2 ? 0x7cc0ff : 0x9fd0ff, at: [0.02 * Math.sin(k), 0.6 + k * 0.065, 0] });
  return model('pickerelweed', 0x7cc0ff, 1.04, 0.36, part([{ geo: torus(0.3, 0.05, 6, 18), color: 0x7cc7e8, at: [0, 0.02, 0], rot: [Math.PI / 2, 0, 0], outline: false }, stem([0, 0.2, 0], [0, 0.62, 0], 0.025),
    ...[-1, 1].map((s): Piece => ({ geo: ball(0.17, 14, 10), color: 0x6fcf5a, at: [0.26 * s, 0.4, -0.04], rot: [0, 0, -0.6 * s], scale: [1, 1.4, 0.35] })), ...spike, { geo: ball(0.24, 16, 12), color: 0x7cc0ff, at: [0, 0.32, 0.06] }, ...bigFace([0, 0.33, 0.28], 1.05, 'happy')]));
}

/** Wisteria Popper (piercing shooter), violet: an arch of twisty vine with cascading flower clusters and a pod-launching stalk. */
export function wisteria(): Model {
  const drips: Piece[] = [];
  for (const [x, z] of [[-0.3, 0.02], [0.3, 0.02], [-0.16, -0.12], [0.16, -0.12]] as const) for (let k = 0; k < 5; k++) drips.push({ geo: ball(0.06 - k * 0.008, 8, 6), color: k % 2 ? 0xc4a6ff : 0xd9c4ff, at: [x, 0.86 - k * 0.075, z] });
  return model('wisteria', 0xc4a6ff, 1.06, 0.4,
    part([mound(0.38), { geo: torus(0.32, 0.035, 6, 18, Math.PI), color: WOOD, at: [0, 0.6, -0.02] }, ...drips, { geo: ball(0.27, 16, 12), color: 0xc4a6ff, at: [0, 0.36, 0.06] }, ...bigFace([0, 0.37, 0.31], 1.1, 'grin')]),
    part([stem([0.12, 0.5, 0.08], [0.38, 0.62, 0.1], 0.025, WOOD), { geo: capsule(0.05, 0.16, 4, 8), color: 0x9fd07a, at: [0.42, 0.62, 0.12], rot: [0, 0, Math.PI / 2 + 0.3] }], [0.12, 0.5, 0.08]));
}

/** Yarrow Brew (producer), cream: a wide, flat-topped dome of tiny flowers on feathery leaves. */
export function yarrow(): Model {
  const tops: Piece[] = [];
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, r = i % 2 ? 0.28 : 0.16; tops.push({ geo: ball(0.07, 8, 6), color: i % 3 ? 0xffe680 : 0xfff4c0, at: [Math.cos(a) * r, 0.86 + (i % 2) * 0.02, Math.sin(a) * r * 0.7] }); }
  return model('yarrow', 0xffe680, 1.0, 0.4, part([mound(0.38), ...leafRing(6, 0.2, 1.6, 0x7ad24c, 0x6cc23f, 0.5, 0.1), stem([0, 0.2, 0], [0, 0.8, 0], 0.03), ...tops, { geo: ball(0.24, 16, 10), color: 0xffe680, at: [0, 0.84, 0], scale: [1.4, 0.35, 1] }, { geo: ball(0.24, 16, 12), color: 0xd4ec8a, at: [0, 0.36, 0.06] }, ...bigFace([0, 0.37, 0.28], 1.05, 'happy')]));
}

/** Touch-me-not Jiggler (area), tangerine: a plump bush with orange slipper flowers and fat seed pods ready to burst. */
export function touchMeNot(): Model {
  const pods: Piece[] = [];
  for (const [x, y, z, a] of [[-0.3, 0.62, 0.05, 0.5], [0.3, 0.64, 0.04, -0.5], [-0.18, 0.86, -0.04, 0.2], [0.18, 0.88, -0.04, -0.2]] as const) pods.push({ geo: capsule(0.045, 0.12, 4, 8), color: 0x9fd07a, at: [x, y, z], rot: [0, 0, a] });
  return model('touch-me-not', 0xffa36b, 1.0, 0.4, part([mound(0.38), ...leafRing(5, 0.22, 1.6, 0x7ad24c, 0x6cc23f), { geo: ball(0.32, 18, 14), color: 0xffa36b, at: [0, 0.42, 0.02] }, ...pods,
    ...[-1, 1].map((s): Piece => ({ geo: cone(0.08, 0.16, 8), color: 0xff8a50, at: [0.34 * s, 0.38, 0.14], rot: [0.3, 0, Math.PI / 2 * s] })), ...bigFace([0, 0.43, 0.3], 1.15, 'grin')]));
}

/** Twilight Primrose (dusk shooter), soft yellow: a big four-petal cup flower that opens at dusk, glowing at its heart. */
export function primrose(): Model {
  const petals: Piece[] = [];
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; petals.push({ geo: ball(0.2, 14, 10), color: 0xfff07a, at: [Math.cos(a) * 0.22, 0.62 + Math.sin(a) * 0.22, -0.02], rot: [0, 0, a], scale: [1.2, 1, 0.35] }); }
  return model('primrose', 0xfff07a, 1.04, 0.36, part([mound(0.34), ...leafRing(5, 0.2, 1.6, 0x7ad24c, 0x6cc23f), stem([0, 0.1, 0], [0, 0.5, 0], 0.035), ...petals, { geo: ball(0.22, 16, 12), color: 0xfff9c2, at: [0, 0.62, 0.06], scale: [1, 1, 0.6] }, ...bigFace([0, 0.62, 0.17], 1.0, 'happy')]));
}

/** Teatime Four-o'clock (dusk slower), magenta: a round bush ringed with trumpet flowers. */
export function fourOclock(): Model {
  const trumpets: Piece[] = [];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; trumpets.push({ geo: cone(0.09, 0.2, 10, ), color: i % 2 ? 0xff8ad8 : 0xffa8e4, at: [Math.cos(a) * 0.33, 0.52 + Math.sin(a) * 0.22, 0.04], rot: [0, 0, a - Math.PI / 2] }); }
  return model('four-oclock', 0xff8ad8, 1.0, 0.4, part([mound(0.38), ...leafRing(6, 0.24, 1.7, 0x7ad24c, 0x6cc23f), ...trumpets, { geo: ball(0.3, 18, 14), color: 0xff8ad8, at: [0, 0.52, 0.04] }, ...bigFace([0, 0.52, 0.31], 1.1, 'happy')]));
}

/** Hop Vine Twister (holder), mint green: a vine coiling up a little pole, with papery hop cones. */
export function hopVine(): Model {
  const coil: Piece[] = [];
  for (let k = 0; k < 10; k++) { const a = k * 1.1; coil.push({ geo: ball(0.05, 8, 6), color: 0x5fb33a, at: [Math.cos(a) * 0.12, 0.1 + k * 0.08, Math.sin(a) * 0.12] }); }
  const cones: Piece[] = [[-0.22, 0.6, 0.08], [0.24, 0.72, 0.06], [-0.1, 0.92, 0.02]].map(([x, y, z]) => ({ geo: cone(0.09, 0.2, 8), color: 0x9ff0c8, at: [x!, y!, z!] as Vec3, rot: [Math.PI, 0, 0] as Vec3 }));
  return model('hop-vine', 0x6fe0b0, 1.04, 0.36, part([mound(0.34), { geo: cyl(0.025, 0.03, 1.0, 6), color: WOOD, at: [0, 0.5, -0.06] }, ...coil, ...cones, { geo: ball(0.26, 16, 12), color: 0x6fe0b0, at: [0, 0.4, 0.08] }, ...bigFace([0, 0.4, 0.33], 1.05, 'grin')]));
}

/** Allium Pom (pollen cloud), purple: one tall stem holding up a big round pom-pom of tiny flowers. */
export function allium(): Model {
  const pom: Piece[] = [];
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, b = (i % 3 - 1) * 0.6; pom.push({ geo: ball(0.06, 8, 6), color: i % 2 ? 0xd9bcff : 0xb48af5, at: [Math.cos(a) * 0.27 * Math.cos(b), 0.72 + Math.sin(b) * 0.27, Math.sin(a) * 0.2 * Math.cos(b)], outline: false }); }
  return model('allium', 0xc59bff, 1.08, 0.34, part([mound(0.32), ...leafRing(4, 0.16, 1.8, 0x7ad24c, 0x6cc23f, 0.15, 0.08), stem([0, 0.1, 0], [0, 0.5, 0], 0.035), { geo: ball(0.28, 18, 14), color: 0xc59bff, at: [0, 0.72, 0] }, ...pom, ...bigFace([0, 0.72, 0.27], 1.05, 'happy')]));
}

/** Nasturtium Lure (lure), bright orange: round shield-like leaves and big trumpet flowers that look tasty. */
export function nasturtium(): Model {
  const pads: Piece[] = [];
  for (const [x, y, z, a] of [[-0.3, 0.24, 0.06, 0.6], [0.3, 0.26, 0.04, -0.6], [0, 0.18, -0.2, 0], [-0.22, 0.5, -0.1, 0.3], [0.22, 0.52, -0.1, -0.3]] as const) pads.push({ geo: cyl(0.16, 0.16, 0.025, 14), color: 0x7ad24c, at: [x, y, z], rot: [Math.PI / 2 - 0.5, 0, a] });
  return model('nasturtium', 0xffa35a, 1.0, 0.4, part([mound(0.38), ...pads, { geo: ball(0.28, 16, 12), color: 0xffa35a, at: [0, 0.48, 0.06] },
    ...[-1, 1].map((s): Piece => ({ geo: cone(0.1, 0.22, 10), color: 0xff7a3a, at: [0.3 * s, 0.7, 0.04], rot: [0, 0, 0.9 * s] })), ...bigFace([0, 0.48, 0.32], 1.1, 'grin')]));
}

/** Agave Anchor (desert blocker), blue-green: a sturdy rosette of thick leaves with rounded tips (no spikes). */
export function agave(): Model {
  const blades: Piece[] = [];
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, up = i % 2 ? 0.8 : 1.15; blades.push({ geo: capsule(0.09, 0.42, 4, 8), color: i % 2 ? 0x8fd9c8 : 0x7cc9b6, at: [Math.cos(a) * 0.24, 0.32 + (up - 1) * 0.2, Math.sin(a) * 0.2], rot: [Math.sin(a) * up * 0.6, 0, -Math.cos(a) * up * 0.6] }); }
  return model('agave', 0x8fd9c8, 0.96, 0.46, part([mound(0.44), ...blades, { geo: ball(0.32, 18, 14), color: 0x8fd9c8, at: [0, 0.4, 0.04], scale: [1.1, 0.95, 1] }, ...bigFace([0, 0.42, 0.33], 1.2, 'brave')]));
}

/** Hollyhock Tosser (lobber), pink: a tall spire stacked with cup flowers, swaying to fling seed discs. */
export function hollyhock(): Model {
  const cups: Piece[] = [];
  for (let k = 0; k < 5; k++) cups.push(...flower([0.02 * (k % 2), 0.46 + k * 0.13, 0.06], 5, 0.06 - k * 0.006, k % 2 ? 0xffb8d4 : 0xffa3c8, 0xfff0a0, 'front', 1 - k * 0.12));
  return model('hollyhock', 0xffa3c8, 1.12, 0.34, part([mound(0.32), ...leafRing(5, 0.2, 1.6, 0x7ad24c, 0x6cc23f), stem([0, 0.1, 0], [0, 1.05, 0], 0.03), ...cups, { geo: ball(0.25, 16, 12), color: 0xffa3c8, at: [0, 0.34, 0.06] }, ...bigFace([0, 0.35, 0.29], 1.05, 'happy')]));
}

/** Chamomile Cheer (support), white: a cluster of three daisies with golden domes, the biggest wearing the face. */
export function chamomile(): Model {
  return model('chamomile', 0xffffff, 1.0, 0.36, part([mound(0.34), ...leafRing(6, 0.18, 1.4, 0x8fe05a, 0x7ad24c, 0.5, 0.1), stem([0, 0.1, 0], [0, 0.55, 0], 0.03), stem([0.05, 0.2, 0], [0.3, 0.72, -0.06], 0.022), stem([-0.05, 0.2, 0], [-0.3, 0.7, -0.06], 0.022),
    ...flower([0.3, 0.74, -0.06], 9, 0.1, 0xffffff, 0xffd23a, 'front', 0.75), ...flower([-0.3, 0.72, -0.06], 9, 0.1, 0xffffff, 0xffd23a, 'front', 0.7), ...flower([0, 0.56, 0.02], 11, 0.24, 0xffffff, 0xffffff, 'front', 1.15),
    { geo: ball(0.2, 16, 12), color: 0xffd23a, at: [0, 0.56, 0.08], scale: [1, 1, 0.6] }, ...bigFace([0, 0.56, 0.18], 0.95, 'happy')]));
}

/** Silky Milkweed (rapid shooter), coral pink: pink flower umbels over a big seed pod that puffs out silky floss. */
export function milkweed(): Model {
  return model('milkweed', 0xffb0a0, 1.04, 0.36, part([mound(0.34), ...leafRing(4, 0.2, 1.8, 0x7ad24c, 0x6cc23f, 0.3, 0.12), stem([0, 0.1, 0], [0, 0.4, 0], 0.035),
    { geo: ball(0.25, 16, 12), color: 0xb9e07a, at: [0, 0.46, 0.04], scale: [1, 1.25, 0.9] }, { geo: ball(0.12, 12, 8), color: 0xffffff, at: [0.16, 0.66, 0.08], outline: false },
    ...flower([-0.18, 0.86, 0], 6, 0.08, 0xffb0a0, 0xff8a80, 'up', 0.9), ...flower([0.16, 0.9, -0.04], 6, 0.08, 0xffc2b5, 0xff8a80, 'up', 0.8), stem([0, 0.6, 0], [-0.18, 0.84, 0], 0.02), stem([0, 0.6, 0], [0.16, 0.88, -0.04], 0.02),
    { geo: ball(0.2, 14, 10), color: 0xffb0a0, at: [0, 0.4, 0.14], scale: [1, 1, 0.6] }, ...bigFace([0, 0.42, 0.24], 1.0, 'grin')]));
}

/** Bluebell Chime (anti-air), blue: an arching stem of hanging bells; the big bell rings at flyers. */
export function bluebell(): Model {
  const bells: Piece[] = [];
  for (const [x, y, s] of [[0.2, 0.86, 0.8], [0.32, 0.72, 0.7], [-0.18, 0.88, 0.75]] as const) bells.push({ geo: cone(0.09 * s, 0.18 * s, 10), color: 0x9fc4ff, at: [x, y, 0], rot: [Math.PI, 0, 0] });
  return model('bluebell', 0x7fb0ff, 1.06, 0.36, part([mound(0.34), ...leafRing(5, 0.18, 1.8, 0x7ad24c, 0x6cc23f, 0.15, 0.08), { geo: torus(0.24, 0.025, 6, 16, Math.PI), color: STEM, at: [0, 0.78, -0.02] }, ...bells,
    { geo: cone(0.3, 0.46, 18), color: 0x7fb0ff, at: [0, 0.45, 0.04], scale: [1, 1, 0.9] }, { geo: ball(0.06, 8, 6), color: 0xffe680, at: [0, 0.2, 0.2] }, ...bigFace([0, 0.48, 0.2], 0.95, 'happy')]));
}

/** Borage Buzz (support), pink-violet: a fuzzy plant with star flowers, and a friendly bee that circles it. */
export function borage(): Model {
  const stars: Piece[] = [];
  for (const [x, y] of [[-0.24, 0.8], [0.24, 0.82], [0, 0.92]] as const) for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; stars.push({ geo: cone(0.04, 0.12, 4), color: 0xd79cff, at: [x + Math.cos(a) * 0.06, y + Math.sin(a) * 0.06, 0.04], rot: [0, 0, a - Math.PI / 2], scale: [1, 1, 0.4] }); }
  return model('borage', 0xd79cff, 1.0, 0.38,
    part([mound(0.36), ...leafRing(6, 0.22, 1.6, 0x9ae867, 0x8fd65a), stem([0, 0.1, 0], [0, 0.8, 0], 0.03), ...stars, { geo: ball(0.27, 16, 12), color: 0xd79cff, at: [0, 0.4, 0.06] }, ...bigFace([0, 0.41, 0.31], 1.05, 'happy')]),
    part([{ geo: ball(0.07, 10, 8), color: 0xffd23a, at: [0.42, 0.7, 0.1], scale: [1.3, 1, 1] }, { geo: torus(0.045, 0.012, 4, 10), color: 0x2b1910, at: [0.42, 0.7, 0.1], rot: [0, Math.PI / 2, 0], outline: false }, { geo: ball(0.05, 8, 4), color: 0xffffff, at: [0.42, 0.78, 0.08], scale: [1.4, 0.4, 0.8], outline: false }], [0, 0.6, 0]));
}

/** Pampas Plume (blocker), cream: a fountain of tall feathery plumes over a grassy tuft. */
export function pampas(): Model {
  const plumes: Piece[] = [];
  for (const [x, z, a, h] of [[-0.24, -0.04, 0.35, 1.0], [0, -0.08, 0, 1.12], [0.24, -0.04, -0.35, 1.0], [-0.12, 0.02, 0.16, 0.92], [0.12, 0.02, -0.16, 0.94]] as const) plumes.push(stem([x * 0.3, 0.2, z], [x, h - 0.2, z], 0.015, 0xd9c890), { geo: ball(0.08, 10, 8), color: 0xfff2c8, at: [x, h - 0.12, z], rot: [0, 0, a], scale: [1, 2.6, 0.8] });
  return model('pampas', 0xfff2c8, 1.12, 0.44, part([mound(0.42), ...leafRing(9, 0.2, 1.9, 0x8fd65a, 0x7ac24c, 0.9, 0.16), ...plumes, { geo: ball(0.3, 18, 14), color: 0xfff2c8, at: [0, 0.36, 0.06], scale: [1.1, 0.9, 0.95] }, ...bigFace([0, 0.37, 0.34], 1.1, 'brave')]));
}

export const PLANT_MODELS = {
  comfrey, rowan, boxwood, 'lambs-ear': lambsEar, maple, basil, lavender, arrowhead, pickerelweed, wisteria, yarrow, 'touch-me-not': touchMeNot,
  primrose, 'four-oclock': fourOclock, 'hop-vine': hopVine, allium, nasturtium, agave, hollyhock, chamomile, milkweed, bluebell, borage, pampas,
} as const;
export type PlantModelId = keyof typeof PLANT_MODELS;
