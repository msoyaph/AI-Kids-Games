// The critters and the bosses, in the bold look: real animals, big, colourful and round, with big
// eyes and thick outlines, after the snacks (never scary). Models face -x (the way they walk, toward
// the blanket); the view turns them a little toward the camera and leans them back so their faces
// read. About one world unit tall, so each fills three quarters of a tile's height or more. Part 0
// is the body; flyers' wings, a snail's shell or a kite are separate parts that move on their own.
import { ball, buildOutlined, capsule, cone, cyl, softBox, torus, type Piece, type Vec3 } from '../geo';
import { CHARACTER_OUTLINE } from './plants';
import { scaled, type Model, type Part } from './types';

/** A big cartoon eye looking forward-left (-x, toward the camera at +z). */
const eye = (x: number, y: number, z: number, r: number): Piece[] => [
  { geo: ball(r, 12, 10), color: 0xffffff, at: [x, y, z], scale: [0.8, 1.1, 0.8] },
  { geo: ball(r * 0.56, 10, 8), color: 0x1d1410, at: [x - r * 0.42, y - r * 0.05, z + r * 0.34], scale: [0.6, 1.05, 0.6], outline: false },
  { geo: ball(r * 0.2, 6, 4), color: 0xffffff, at: [x - r * 0.62, y + r * 0.3, z + r * 0.42], outline: false },
];
const eyes = (x: number, y: number, gap: number, r: number) => [...eye(x, y, gap, r), ...eye(x, y, -gap, r)];
const smile = (x: number, y: number, z: number, s: number, rotY = -0.9): Piece => ({ geo: torus(0.045 * s, 0.012 * s, 4, 12, Math.PI), color: 0x3a1a14, at: [x, y, z], rot: [0, rotY, Math.PI], outline: false });
const nose = (x: number, y: number, r: number, c = 0x2b1910): Piece => ({ geo: ball(r, 8, 6), color: c, at: [x, y, 0], outline: false });
const legs = (xs: number[], y: number, r: number, h: number, c: number): Piece[] => xs.flatMap(x => [-1, 1].map((s): Piece => ({ geo: capsule(r, h, 2, 6), color: c, at: [x, y, s * 0.12] })));

const part = (pieces: Piece[], pivot: Vec3 = [0, 0, 0], twoSided = false): Part => ({ ...buildOutlined(pieces, CHARACTER_OUTLINE), pivot, twoSided });
const model = (id: string, fill: number, height: number, shadow: number, ...parts: Part[]): Model => ({ id, parts, shadow, height, fill });

/** Snack Snail: a soft periwinkle body with eyes on stalks and a big golden shell with a coral swirl. */
export function snail(): Model {
  return scaled(model('snail', 0xffd15c, 0.86, 0.4,
    part([{ geo: capsule(0.13, 0.5, 6, 14), color: 0xa9bcff, at: [0.02, 0.13, 0], rot: [0, 0, Math.PI / 2], scale: [1, 1, 0.92] }, { geo: ball(0.17, 14, 12), color: 0xb8c8ff, at: [-0.36, 0.26, 0] },
      { geo: cyl(0.022, 0.028, 0.24, 6), color: 0xa9bcff, at: [-0.42, 0.48, 0.07], rot: [0.25, 0, 0.3] }, { geo: cyl(0.022, 0.028, 0.24, 6), color: 0xa9bcff, at: [-0.42, 0.48, -0.07], rot: [-0.25, 0, 0.3] },
      ...eye(-0.47, 0.62, 0.1, 0.075), ...eye(-0.47, 0.62, -0.1, 0.075), smile(-0.48, 0.22, 0.1, 1.3), { geo: ball(0.03, 6, 4), color: 0xff9db0, at: [-0.44, 0.25, 0.15], scale: [1, 0.7, 0.4], outline: false }]),
    part([{ geo: ball(0.3, 18, 14), color: 0xffd15c, at: [0.1, 0.5, 0], scale: [1, 1, 0.8] }, { geo: torus(0.17, 0.05, 8, 22), color: 0xff7a59, at: [0.1, 0.5, 0.19], outline: false }, { geo: ball(0.08, 10, 8), color: 0xff7a59, at: [0.12, 0.51, 0.23], outline: false }, { geo: torus(0.17, 0.05, 8, 22), color: 0xff7a59, at: [0.1, 0.5, -0.19], outline: false }], [0.1, 0.5, 0])), 1.22);
}

/** Field Mouse: round and quick, pale pink-grey with big round ears and a curly tail. */
export function mouse(): Model {
  return model('mouse', 0xd9c8d2, 0.78, 0.32, part([
    { geo: ball(0.24, 16, 12), color: 0xd9c8d2, at: [0.06, 0.26, 0], scale: [1.3, 1, 0.95] }, { geo: ball(0.17, 14, 12), color: 0xe4d6de, at: [-0.24, 0.4, 0] },
    ...[-1, 1].flatMap(s => [{ geo: cyl(0.12, 0.12, 0.03, 14), color: 0xd9c8d2, at: [-0.18, 0.6, s * 0.12] as Vec3, rot: [Math.PI / 2, 0, 0.3] as Vec3 }, { geo: cyl(0.08, 0.08, 0.035, 12), color: 0xffb3c6, at: [-0.17, 0.6, s * 0.13] as Vec3, rot: [Math.PI / 2, 0, 0.3] as Vec3, outline: false }]),
    ...eyes(-0.36, 0.45, 0.07, 0.055), nose(-0.41, 0.36, 0.035, 0xff8fa8), smile(-0.38, 0.31, 0.06, 1.0),
    { geo: torus(0.12, 0.02, 4, 12, Math.PI * 1.4), color: 0xffb3c6, at: [0.38, 0.22, 0], rot: [0, 0, -0.6] }, ...legs([-0.08, 0.18], 0.06, 0.03, 0.08, 0xffb3c6)]));
}

/** Ant (of an Ant Column): a chunky coral ant standing tall, six legs, big eyes and curly antennae. */
export function ant(): Model {
  const c = 0xff9a6c, dark = 0x6b2e1c;
  const limbs: Piece[] = [];
  for (const [x, a] of [[0.06, 0.4], [-0.02, -0.2]] as const) for (const s of [1, -1]) limbs.push({ geo: cyl(0.018, 0.016, 0.24, 6), color: dark, at: [x, 0.1, s * 0.09], rot: [s * 0.45, 0, a] });
  return model('ants', c, 0.95, 0.24, part([
    { geo: ball(0.19, 14, 12), color: c, at: [0.16, 0.26, 0], scale: [1.2, 1, 1.05] }, { geo: ball(0.09, 12, 10), color: 0xff8a58, at: [0.0, 0.36, 0], scale: [0.9, 1.15, 0.9] }, { geo: ball(0.2, 14, 12), color: c, at: [-0.06, 0.6, 0], scale: [1, 0.95, 1.05] }, ...limbs,
    { geo: cyl(0.016, 0.014, 0.2, 6), color: dark, at: [-0.12, 0.4, 0.1], rot: [0.5, 0, 0.9] }, { geo: cyl(0.016, 0.014, 0.2, 6), color: dark, at: [-0.12, 0.4, -0.1], rot: [-0.5, 0, 0.9] },
    { geo: cyl(0.012, 0.012, 0.2, 5), color: dark, at: [-0.12, 0.82, 0.07], rot: [0.35, 0, 0.45] }, { geo: cyl(0.012, 0.012, 0.2, 5), color: dark, at: [-0.12, 0.82, -0.07], rot: [-0.35, 0, 0.45] },
    { geo: ball(0.03, 8, 6), color: dark, at: [-0.17, 0.92, 0.11] }, { geo: ball(0.03, 8, 6), color: dark, at: [-0.17, 0.92, -0.11] }, ...eyes(-0.2, 0.66, 0.09, 0.07), smile(-0.23, 0.52, 0.07, 1.15)]));
}

/** Roly-poly: a dome of slate-blue shell plates (a pattern for colourblind players too), little legs. */
export function rolyPoly(): Model {
  const plates: Piece[] = [];
  for (let i = 0; i < 5; i++) plates.push({ geo: torus(0.3 - i * 0.012, 0.035, 6, 16, Math.PI), color: i % 2 ? 0x8fa6d2 : 0xb8caee, at: [-0.2 + i * 0.1, 0.18, 0], rot: [0, Math.PI / 2, 0], scale: [1, 1.1, 1] });
  return model('roly-poly', 0xa9bde3, 0.82, 0.36, part([
    { geo: ball(0.32, 18, 12), color: 0xa9bde3, at: [0, 0.2, 0], scale: [1.25, 1.15, 0.95] }, ...plates, { geo: ball(0.15, 12, 10), color: 0xc9d6f0, at: [-0.36, 0.22, 0] },
    ...eyes(-0.45, 0.3, 0.07, 0.06), smile(-0.47, 0.16, 0.06, 1.0), ...legs([-0.2, 0, 0.2], 0.04, 0.025, 0.06, 0x6b7fa8)]));
}

/** Magpie: black and white with white shoulder patches, a teal-blue sheen and a long tail; wings flap. */
export function magpie(): Model {
  const black = 0x23252f, white = 0xffffff, sheen = 0x47c4f0;
  const wing = (side: 1 | -1) => part([{ geo: ball(0.24, 14, 8), color: black, at: [0.05, 0, side * 0.22], scale: [1.15, 0.18, 0.85] }, { geo: ball(0.17, 12, 6), color: white, at: [-0.02, 0.03, side * 0.2], scale: [1.15, 0.2, 0.8], outline: false }, { geo: ball(0.14, 12, 6), color: sheen, at: [0.2, 0.01, side * 0.32], scale: [1.2, 0.16, 0.62], outline: false }], [0, 0.06, side * 0.1], true);
  return scaled(model('magpie', white, 0.5, 0.34,
    part([{ geo: ball(0.2, 16, 12), color: black, scale: [1.4, 1, 1] }, { geo: ball(0.17, 14, 12), color: white, at: [0.04, -0.06, 0], scale: [1.3, 0.85, 1.06] }, { geo: ball(0.09, 12, 8), color: white, at: [0.02, 0.12, 0.1], scale: [1.6, 0.5, 0.8] }, { geo: ball(0.09, 12, 8), color: white, at: [0.02, 0.12, -0.1], scale: [1.6, 0.5, 0.8] },
      { geo: ball(0.15, 14, 12), color: black, at: [-0.28, 0.1, 0] }, { geo: cone(0.045, 0.14, 8), color: 0x3a3c46, at: [-0.45, 0.08, 0], rot: [0, 0, Math.PI / 2] }, ...eyes(-0.34, 0.15, 0.11, 0.06),
      { geo: cone(0.1, 0.6, 10), color: sheen, at: [0.52, 0.06, 0], rot: [0, 0, Math.PI / 2 + 0.12], scale: [1, 1, 0.38] }]),
    wing(1), wing(-1)), 1.45);
}

/** Leaf-shield Beetle: a round teal stag beetle holding a big bright leaf in front of it. */
export function beetle(): Model {
  return model('beetle', 0x5fd3b0, 0.9, 0.38, part([
    { geo: ball(0.3, 18, 12), color: 0x5fd3b0, at: [0.08, 0.3, 0], scale: [1.2, 1.05, 1] }, { geo: torus(0.24, 0.02, 4, 16, Math.PI), color: 0x3fae8c, at: [0.08, 0.36, 0], rot: [Math.PI / 2, 0, Math.PI / 2], outline: false },
    { geo: ball(0.17, 14, 12), color: 0x6fe0bc, at: [-0.24, 0.36, 0] }, ...[-1, 1].map((s): Piece => ({ geo: cone(0.035, 0.22, 6), color: 0x2f8a6c, at: [-0.4, 0.5, s * 0.08], rot: [s * 0.3, 0, 1.1] })),
    ...eyes(-0.34, 0.42, 0.08, 0.06), smile(-0.37, 0.3, 0.07, 1.0), ...legs([-0.1, 0.1, 0.28], 0.06, 0.025, 0.1, 0x2f8a6c),
    { geo: ball(0.32, 14, 10), color: 0x8fe05a, at: [-0.5, 0.42, 0.04], scale: [0.18, 1.2, 1] }, { geo: capsule(0.012, 0.5, 2, 4), color: 0x5fb33a, at: [-0.53, 0.42, 0.06], outline: false }]));
}

/** Grasshopper: a bright lime hopper with big back legs and long antennae. */
export function grasshopper(): Model {
  return model('grasshopper', 0xb7eb5a, 0.86, 0.32, part([
    { geo: capsule(0.13, 0.42, 6, 12), color: 0xb7eb5a, at: [0.06, 0.32, 0], rot: [0, 0, Math.PI / 2 - 0.25] }, { geo: ball(0.16, 14, 12), color: 0xc8f26e, at: [-0.26, 0.46, 0] },
    ...[-1, 1].flatMap(s => [{ geo: capsule(0.05, 0.36, 4, 8), color: 0x9ad648, at: [0.18, 0.38, s * 0.14] as Vec3, rot: [0, 0, -1.0] as Vec3 }, { geo: capsule(0.03, 0.34, 3, 6), color: 0x8ac53c, at: [0.26, 0.16, s * 0.15] as Vec3, rot: [0, 0, 0.5] as Vec3 }]),
    ...[-1, 1].map((s): Piece => ({ geo: cyl(0.01, 0.01, 0.36, 4), color: 0x6b9a2c, at: [-0.4, 0.72, s * 0.06], rot: [s * 0.3, 0, 0.7] })), ...eyes(-0.34, 0.52, 0.08, 0.06), smile(-0.38, 0.4, 0.06, 1.0)]));
}

/** Umbrella Frog: a bright tree frog holding a big round leaf umbrella over its head. */
export function frog(): Model {
  return model('frog', 0x7fe08a, 0.98, 0.36,
    part([{ geo: ball(0.27, 18, 12), color: 0x7fe08a, at: [0.02, 0.26, 0], scale: [1.15, 0.95, 1] }, { geo: ball(0.2, 14, 10), color: 0xd8f5c2, at: [-0.08, 0.2, 0.02], scale: [1, 0.9, 1.05], outline: false },
      ...eye(-0.14, 0.5, 0.12, 0.08), ...eye(-0.14, 0.5, -0.12, 0.08), smile(-0.28, 0.3, 0.06, 1.4), ...[-1, 1].map((s): Piece => ({ geo: ball(0.06, 8, 6), color: 0xffd23a, at: [-0.12, 0.02, s * 0.2], scale: [1.4, 0.4, 1] })),
      { geo: cyl(0.015, 0.015, 0.5, 5), color: 0x5fb33a, at: [-0.02, 0.62, 0.16] }]),
    part([{ geo: ball(0.36, 16, 8), color: 0xd8f06a, at: [-0.02, 0.88, 0.16], scale: [1, 0.3, 1] }, { geo: torus(0.3, 0.02, 4, 18), color: 0x9fc43a, at: [-0.02, 0.86, 0.16], rot: [Math.PI / 2, 0, 0], outline: false }], [-0.02, 0.62, 0.16]));
}

/** Vole: a chubby tan vole with a pink nose; it digs (a molehill shows where it'll pop up). */
export function vole(): Model {
  return model('vole', 0xd6b48c, 0.76, 0.34, part([
    { geo: ball(0.3, 18, 12), color: 0xd6b48c, at: [0.04, 0.28, 0], scale: [1.3, 0.95, 1] }, { geo: ball(0.18, 14, 12), color: 0xe2c49e, at: [-0.28, 0.32, 0] },
    ...[-1, 1].map((s): Piece => ({ geo: ball(0.06, 10, 8), color: 0xc49a6c, at: [-0.2, 0.5, s * 0.12] })), ...eyes(-0.4, 0.38, 0.07, 0.05), nose(-0.46, 0.3, 0.04, 0xff8fa8), smile(-0.44, 0.24, 0.06, 0.9),
    ...[-1, 1].map((s): Piece => ({ geo: ball(0.06, 8, 6), color: 0xf0b3a0, at: [-0.3, 0.06, s * 0.14], scale: [1.4, 0.5, 1] }))]));
}

/** Hedgehog: a tan dome of soft spines (rounded cones), pink face and bright eyes. Never blue, no shoes. */
export function hedgehog(): Model {
  const spines: Piece[] = [];
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI, b = (i % 3 - 1) * 0.5; spines.push({ geo: cone(0.07, 0.16, 6), color: i % 2 ? 0xb88a5c : 0xc89a6a, at: [0.06 + Math.cos(a) * 0.26, 0.28 + Math.sin(a) * 0.26 * Math.cos(b), Math.sin(b) * 0.24], rot: [b, 0, a - Math.PI / 2], outline: false }); }
  return model('hedgehog', 0xdcb284, 0.8, 0.38, part([{ geo: ball(0.3, 18, 12), color: 0xdcb284, at: [0.06, 0.26, 0], scale: [1.2, 1, 1] }, ...spines, { geo: ball(0.16, 14, 12), color: 0xffd6c2, at: [-0.26, 0.24, 0] }, ...eyes(-0.36, 0.32, 0.07, 0.05), nose(-0.43, 0.22, 0.04), smile(-0.4, 0.17, 0.06, 0.8)]));
}

/** Moth Flutter (one moth of three): fluffy cream wings with soft eyespots, a fuzzy body. */
export function moth(): Model {
  const wing = (side: 1 | -1) => part([{ geo: ball(0.2, 12, 8), color: 0xf5e6b8, at: [0, 0.02, side * 0.18], scale: [1, 0.15, 1.2] }, { geo: ball(0.05, 8, 6), color: 0xc9a46a, at: [0, 0.05, side * 0.24], scale: [1, 0.3, 1], outline: false }], [0, 0.02, side * 0.04], true);
  return model('moths', 0xf5e6b8, 0.6, 0.2, part([{ geo: capsule(0.07, 0.16, 4, 8), color: 0xe8d4a0, rot: [0, 0, Math.PI / 2] }, { geo: ball(0.08, 10, 8), color: 0xf5e6b8, at: [-0.14, 0.02, 0] }, ...eyes(-0.2, 0.05, 0.04, 0.035), ...[-1, 1].map((s): Piece => ({ geo: cyl(0.008, 0.008, 0.14, 4), color: 0x9a7a4a, at: [-0.2, 0.12, s * 0.04], rot: [s * 0.4, 0, 0.6] }))]), wing(1), wing(-1));
}

/** Badger: grey and white with a striped face, carrying a round cake-tin lid in front like a shield. */
export function badger(): Model {
  return model('badger', 0xdfe3ea, 0.92, 0.42, part([
    { geo: ball(0.33, 18, 12), color: 0xb9bec8, at: [0.08, 0.32, 0], scale: [1.3, 1, 1] }, { geo: ball(0.22, 16, 12), color: 0xdfe3ea, at: [-0.28, 0.38, 0] },
    ...[-1, 1].map((s): Piece => ({ geo: ball(0.1, 10, 8), color: 0x3a3c46, at: [-0.3, 0.42, s * 0.11], scale: [1.4, 0.5, 0.4], outline: false })), { geo: ball(0.06, 8, 6), color: 0xffffff, at: [-0.36, 0.56, 0], scale: [1.6, 0.5, 0.6], outline: false },
    ...eyes(-0.42, 0.44, 0.08, 0.055), nose(-0.5, 0.34, 0.045), smile(-0.47, 0.28, 0.06, 1.0), ...legs([-0.1, 0.24], 0.06, 0.04, 0.1, 0x3a3c46),
    { geo: cyl(0.32, 0.32, 0.05, 20), color: 0xdfe3ea, at: [-0.56, 0.4, 0.04], rot: [0, 0, Math.PI / 2] }, { geo: torus(0.3, 0.025, 4, 20), color: 0xa8b0bd, at: [-0.58, 0.4, 0.04], rot: [0, Math.PI / 2, 0], outline: false }, { geo: ball(0.05, 8, 6), color: 0xa8b0bd, at: [-0.6, 0.4, 0.04] }]));
}

/** Owlet: a round fluffy little owl with huge eyes; wings flap as parts. */
export function owlet(): Model {
  const wing = (side: 1 | -1) => part([{ geo: ball(0.16, 12, 8), color: 0xc9a77a, at: [0.04, 0, side * 0.2], scale: [1, 0.2, 1.2] }], [0, 0.05, side * 0.1], true);
  return model('owlet', 0xe6cfa6, 0.62, 0.3, part([{ geo: ball(0.26, 18, 14), color: 0xe6cfa6, scale: [1, 1.1, 1] }, { geo: ball(0.18, 14, 12), color: 0xf6ead2, at: [-0.08, -0.04, 0], scale: [1, 1, 1.1], outline: false },
    ...[-1, 1].map((s): Piece => ({ geo: cone(0.05, 0.1, 6), color: 0xc9a77a, at: [-0.04, 0.27, s * 0.12] })), ...eye(-0.2, 0.08, 0.09, 0.075), ...eye(-0.2, 0.08, -0.09, 0.075), { geo: cone(0.03, 0.06, 6), color: 0xffb03a, at: [-0.27, 0.0, 0], rot: [0, 0, Math.PI / 2 + 0.6] }]), wing(1), wing(-1));
}

/** Desert Gecko: a bright aqua gecko with sunny spots and round toe pads. */
export function gecko(): Model {
  return model('gecko', 0x5fe0d0, 0.72, 0.32, part([
    { geo: capsule(0.12, 0.46, 6, 12), color: 0x5fe0d0, at: [0.05, 0.16, 0], rot: [0, 0, Math.PI / 2] }, { geo: ball(0.17, 14, 12), color: 0x6feadb, at: [-0.32, 0.26, 0], scale: [1.2, 1, 1] },
    { geo: cone(0.08, 0.4, 8), color: 0x5fe0d0, at: [0.44, 0.14, 0], rot: [0, 0, -Math.PI / 2] }, ...[[0, 0.26, 0.1], [0.16, 0.24, -0.06], [-0.1, 0.22, -0.08]].map(([x, y, z]): Piece => ({ geo: ball(0.035, 6, 4), color: 0xffd23a, at: [x!, y!, z!], outline: false })),
    ...eyes(-0.38, 0.38, 0.09, 0.065), smile(-0.46, 0.22, 0.06, 1.2), ...[-0.18, 0.18].flatMap(x => [-1, 1].map((s): Piece => ({ geo: ball(0.045, 8, 6), color: 0x4fc8b8, at: [x, 0.03, s * 0.16] })))]));
}

/** Nibble Goat: a small white kid goat with little horns and a tuft of beard. */
export function goat(): Model {
  return model('goat', 0xf2f0ea, 1.0, 0.42, part([
    { geo: ball(0.3, 18, 12), color: 0xf2f0ea, at: [0.08, 0.44, 0], scale: [1.35, 0.95, 0.95] }, ...legs([-0.12, 0.26], 0.16, 0.04, 0.22, 0xd8d4ca), { geo: ball(0.2, 16, 12), color: 0xf8f6f0, at: [-0.3, 0.62, 0] },
    ...[-1, 1].flatMap(s => [{ geo: cone(0.04, 0.16, 6), color: 0xc9b89a, at: [-0.24, 0.84, s * 0.07] as Vec3, rot: [0, 0, 0.5] as Vec3 }, { geo: ball(0.08, 8, 6), color: 0xf2f0ea, at: [-0.22, 0.7, s * 0.2] as Vec3, scale: [1.4, 0.5, 0.6] as Vec3 }]),
    ...eyes(-0.42, 0.68, 0.08, 0.055), nose(-0.5, 0.56, 0.04, 0xffb3c6), smile(-0.48, 0.52, 0.06, 0.9), { geo: cone(0.04, 0.1, 6), color: 0xd8d4ca, at: [-0.44, 0.44, 0], rot: [Math.PI, 0, 0] }]));
}

/** Jackrabbit: a tan hare with very long ears and big hind feet (makes two big hops). */
export function jackrabbit(): Model {
  return model('jackrabbit', 0xe3c9a0, 1.04, 0.36, part([
    { geo: ball(0.26, 18, 12), color: 0xe3c9a0, at: [0.06, 0.3, 0], scale: [1.25, 1, 0.95] }, { geo: ball(0.18, 14, 12), color: 0xecd6b2, at: [-0.24, 0.48, 0] },
    ...[-1, 1].flatMap(s => [{ geo: capsule(0.06, 0.38, 4, 8), color: 0xe3c9a0, at: [-0.16, 0.86, s * 0.08] as Vec3, rot: [s * 0.2, 0, 0.25] as Vec3 }, { geo: capsule(0.035, 0.3, 3, 6), color: 0xffc2b5, at: [-0.17, 0.86, s * 0.1] as Vec3, rot: [s * 0.2, 0, 0.25] as Vec3, outline: false }]),
    ...eyes(-0.34, 0.52, 0.08, 0.055), nose(-0.41, 0.44, 0.03, 0xff8fa8), smile(-0.39, 0.4, 0.06, 0.9), { geo: ball(0.08, 10, 8), color: 0xffffff, at: [0.36, 0.34, 0] },
    ...[-1, 1].map((s): Piece => ({ geo: capsule(0.05, 0.2, 3, 6), color: 0xd4b88a, at: [0.12, 0.06, s * 0.14], rot: [0, 0, Math.PI / 2] }))]));
}

/** Packrat: a grey-brown woodrat with a big fluffy tail, hugging a shiny pebble to trade. */
export function packrat(): Model {
  return model('packrat', 0xd2c2b0, 0.82, 0.36, part([
    { geo: ball(0.26, 16, 12), color: 0xd2c2b0, at: [0.04, 0.3, 0], scale: [1.2, 1.05, 0.95] }, { geo: ball(0.17, 14, 12), color: 0xdccdbc, at: [-0.24, 0.48, 0] },
    ...[-1, 1].map((s): Piece => ({ geo: cyl(0.09, 0.09, 0.03, 12), color: 0xd2c2b0, at: [-0.16, 0.66, s * 0.11], rot: [Math.PI / 2, 0, 0.3] })), ...eyes(-0.34, 0.52, 0.07, 0.055), nose(-0.4, 0.44, 0.03, 0xff8fa8), smile(-0.38, 0.39, 0.06, 0.9),
    { geo: ball(0.2, 14, 10), color: 0xe8dccc, at: [0.36, 0.42, 0], scale: [0.8, 1.6, 0.8] }, { geo: softBox(0.14, 0.12, 0.12, 0.5), color: 0xb9c4d4, at: [-0.34, 0.24, 0.12] }]));
}

/** Seagull: white with soft grey wings and a yellow beak, after one snack; wings flap. */
export function seagull(): Model {
  const wing = (side: 1 | -1) => part([{ geo: ball(0.26, 14, 8), color: 0xc9d0da, at: [0.06, 0, side * 0.26], scale: [1, 0.15, 1.1] }, { geo: ball(0.12, 10, 6), color: 0x3a3c46, at: [0.18, 0, side * 0.44], scale: [1, 0.15, 0.8], outline: false }], [0, 0.06, side * 0.1], true);
  return scaled(model('seagull', 0xffffff, 0.5, 0.34, part([{ geo: ball(0.2, 16, 12), color: 0xffffff, scale: [1.5, 1, 1] }, { geo: ball(0.15, 14, 12), color: 0xffffff, at: [-0.28, 0.12, 0] }, { geo: cone(0.04, 0.16, 8), color: 0xffc83a, at: [-0.46, 0.1, 0], rot: [0, 0, Math.PI / 2] }, ...eyes(-0.34, 0.17, 0.11, 0.05), { geo: cone(0.1, 0.28, 8), color: 0xe8ecf2, at: [0.36, 0.04, 0], rot: [0, 0, -Math.PI / 2], scale: [1, 1, 0.4] }]), wing(1), wing(-1)), 1.45);
}

/** Kite Crow: a black crow holding the string of a bright diamond kite that bobs above it. */
export function kiteCrow(): Model {
  return scaled(model('kite-crow', 0xffd04d, 0.6, 0.3,
    part([{ geo: ball(0.2, 16, 12), color: 0x2f3240, scale: [1.4, 1, 1] }, { geo: ball(0.15, 14, 12), color: 0x2f3240, at: [-0.26, 0.12, 0] }, { geo: cone(0.04, 0.14, 8), color: 0x5a5d6a, at: [-0.42, 0.1, 0], rot: [0, 0, Math.PI / 2] }, ...eyes(-0.32, 0.17, 0.1, 0.055), ...[-1, 1].map((s): Piece => ({ geo: ball(0.18, 12, 6), color: 0x3d4150, at: [0.06, 0.04, s * 0.2], scale: [1.1, 0.2, 0.8] })), { geo: cyl(0.006, 0.006, 0.7, 4), color: 0xfff6e6, at: [-0.1, 0.45, 0], rot: [0, 0, -0.3], outline: false }]),
    part([{ geo: softBox(0.5, 0.5, 0.04, 0.2), color: 0xffd04d, at: [0, 0.95, 0], rot: [0, 0, Math.PI / 4] }, { geo: softBox(0.25, 0.25, 0.05, 0.2), color: 0xff4f5e, at: [0, 1.04, 0.01], rot: [0, 0, Math.PI / 4], outline: false }, ...[0, 1, 2].map((k): Piece => ({ geo: ball(0.035, 6, 4), color: 0xff4f5e, at: [0.04 * k, 0.62 - k * 0.08, 0] }))], [0, 0.7, 0])), 1.45);
}

/** Cloud Sheep: a big fluffy white lamb of puffy wool with a pale face; floats over gaps. */
export function sheep(): Model {
  const puffs: Piece[] = [];
  for (const [x, y, z, r] of [[0, 0.42, 0, 0.3], [0.24, 0.4, 0.06, 0.22], [0.22, 0.44, -0.12, 0.2], [-0.04, 0.6, -0.02, 0.22], [0.16, 0.6, 0.04, 0.18], [-0.12, 0.4, 0.14, 0.2], [0.08, 0.3, 0.18, 0.18]] as const) puffs.push({ geo: ball(r, 14, 10), color: 0xffffff, at: [x, y, z] });
  return model('sheep', 0xffffff, 0.96, 0.46, part([...puffs, ...legs([-0.1, 0.2], 0.12, 0.04, 0.16, 0xe8dccf), { geo: ball(0.17, 14, 12), color: 0xf4e9dc, at: [-0.3, 0.46, 0], scale: [1.1, 1, 0.95] }, ...[-1, 1].map((s): Piece => ({ geo: ball(0.07, 8, 6), color: 0xf4e9dc, at: [-0.26, 0.56, s * 0.17], scale: [1.4, 0.5, 0.6] })), ...eyes(-0.4, 0.5, 0.07, 0.055), smile(-0.44, 0.4, 0.06, 0.9)]));
}

// ---------------------------------------------------------------- bosses (big, silly, never scary)

/** The Grand Snail: a giant snail hauling a golden shell decorated with a snack wagon. */
export function grandSnail(): Model {
  const s = snail();
  return { ...scaled(s, 1.75), id: 'grand-snail', fill: 0xffd15c };
}

/** The Big Beetle: an extra-large beetle behind an enormous leaf. */
export function bigBeetle(): Model { return { ...scaled(beetle(), 1.7), id: 'big-beetle' }; }

/** The Badger Baron: a big badger with a bright bow tie and a big tin lid. */
export function badgerBaron(): Model {
  const b = badger(), bow = part([{ geo: cone(0.08, 0.16, 6), color: 0xff4f5e, at: [-0.4, 0.22, 0.12], rot: [0, 0, Math.PI / 2] }, { geo: cone(0.08, 0.16, 6), color: 0xff4f5e, at: [-0.4, 0.22, -0.12], rot: [0, 0, -Math.PI / 2] }, { geo: ball(0.05, 8, 6), color: 0xffd23a, at: [-0.4, 0.22, 0] }]);
  return { ...scaled({ ...b, parts: [...b.parts, bow] }, 1.7), id: 'badger-baron' };
}

/** Billy the Goat: a big goat with curly horns. */
export function billyGoat(): Model {
  const g = goat(), horns = part([-1, 1].map((sd): Piece => ({ geo: torus(0.12, 0.04, 6, 14, Math.PI * 1.4), color: 0xc9b89a, at: [-0.22, 0.86, sd * 0.12], rot: [0, Math.PI / 2, 0.4] })));
  return { ...scaled({ ...g, parts: [...g.parts, horns] }, 1.7), id: 'billy-goat' };
}

/** Captain Gull: a big gull in a sailor's cap. */
export function captainGull(): Model {
  const g = seagull(), cap = part([{ geo: cyl(0.16, 0.18, 0.08, 14), color: 0xffffff, at: [-0.28, 0.28, 0] }, { geo: cyl(0.19, 0.19, 0.02, 14), color: 0x2b4a8c, at: [-0.28, 0.25, 0] }, { geo: ball(0.03, 6, 4), color: 0xffd23a, at: [-0.44, 0.27, 0] }]);
  return { ...scaled({ ...g, parts: [...g.parts, scaled({ id: '', parts: [cap], shadow: 0, height: 0, fill: 0 }, 1.45).parts[0]!] }, 1.4), id: 'captain-gull' };
}

/** The Snack Parade Float: a wheeled float with bunting, a big cake and critters riding along. */
export function paradeFloat(): Model {
  const flags: Piece[] = [];
  for (let i = 0; i < 8; i++) flags.push({ geo: cone(0.07, 0.14, 3), color: [0xff4f5e, 0xfff6e6, 0xffd23a, 0x47c4f0][i % 4]!, at: [-0.7 + i * 0.2, 0.62, 0.42], rot: [Math.PI, 0, 0], scale: [1, 1, 0.3], outline: false });
  return model('parade-float', 0xffd23a, 1.6, 0.9, part([
    { geo: softBox(1.6, 0.4, 0.9, 0.3), color: 0xffd23a, at: [0, 0.36, 0] }, { geo: softBox(1.64, 0.08, 0.94, 0.6), color: 0xff4f5e, at: [0, 0.56, 0], outline: false },
    ...[-0.6, 0.6].flatMap(x => [-1, 1].map((s): Piece => ({ geo: cyl(0.16, 0.16, 0.08, 14), color: 0x5a3a22, at: [x, 0.16, s * 0.46], rot: [Math.PI / 2, 0, 0] }))), ...flags,
    { geo: cyl(0.3, 0.32, 0.26, 16), color: 0xffb6d0, at: [0.2, 0.74, 0] }, { geo: cyl(0.22, 0.24, 0.2, 16), color: 0xfff6ef, at: [0.2, 0.96, 0] }, { geo: ball(0.06, 8, 6), color: 0xff4a4a, at: [0.2, 1.1, 0] },
    { geo: ball(0.16, 14, 12), color: 0xd9c8d2, at: [-0.45, 0.78, 0.1] }, ...eyes(-0.58, 0.82, 0.06, 0.045), { geo: ball(0.15, 14, 12), color: 0xff9a6c, at: [-0.15, 0.78, 0.22] }, ...eye(-0.27, 0.82, 0.28, 0.045),
    ...eyes(-0.82, 0.38, 0.14, 0.09), smile(-0.84, 0.26, 0.12, 2)]));
}

export const CRITTER_MODELS = {
  snail, mouse: () => scaled(mouse(), 1.12), ants: ant, 'roly-poly': rolyPoly, magpie, beetle, grasshopper, frog, vole: () => scaled(vole(), 1.2), hedgehog: () => scaled(hedgehog(), 1.15), moths: () => scaled(moth(), 1.75), badger, owlet: () => scaled(owlet(), 1.15), gecko: () => scaled(gecko(), 1.35), goat, jackrabbit, packrat: () => scaled(packrat(), 1.08), seagull, 'kite-crow': kiteCrow, sheep,
  'grand-snail': grandSnail, 'big-beetle': bigBeetle, 'badger-baron': badgerBaron, 'billy-goat': billyGoat, 'captain-gull': captainGull, 'parade-float': paradeFloat,
} as const;
export type CritterModelId = keyof typeof CRITTER_MODELS;
