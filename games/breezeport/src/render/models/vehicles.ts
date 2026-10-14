/**
 * Toy-like vehicles, rounded and chunky, built pointing south (+z) with their middle at the origin:
 * a little car, a hatchback, a delivery van and the town bus. Bodies take the instance colour; the
 * windows, wheels, lights and trim keep their own. Sizes fit a lane a third of a tile wide.
 */
import type * as THREE from 'three';
import { bevelBox, box, cyl, merge, PAT, part, sphere } from '../geo';
import { tinted, WHITE, type Parts } from './kit';

const TYRE = 0x2b2d33, HUB = 0xcfd5dc, GLASS = 0x8fc6dc, DARK = 0x3a3f48;

function wheels(xs: number, zs: number[], r = 0.055): Parts {
  return zs.flatMap(z => [-1, 1].flatMap(s => [
    part(cyl(r, r, 0.045, 10), TYRE, { pos: [s * xs, r, z], rot: [0, 0, Math.PI / 2] }),
    part(cyl(r * 0.5, r * 0.5, 0.05, 8), HUB, { pos: [s * xs, r, z], rot: [0, 0, Math.PI / 2] }),
  ]));
}

function lights(w: number, front: number, back: number, y: number): Parts {
  return [
    ...[-1, 1].map(s => part(sphere(0.02, 6, 4), 0xfff4c8, { pos: [s * w * 0.32, y, front], pattern: PAT.glow })),
    ...[-1, 1].map(s => part(box(0.04, 0.025, 0.01), 0xe2453a, { pos: [s * w * 0.34, y, back] })),
  ];
}

/** A little round car (0.28 × 0.56). */
export function car(): THREE.BufferGeometry {
  const w = 0.27, l = 0.54;
  return merge([
    ...wheels(w / 2 - 0.01, [-0.16, 0.16]),
    part(bevelBox(w, 0.1, l, 0.035), WHITE, { pos: [0, 0.1, 0], pattern: tinted(PAT.none) }),
    part(bevelBox(w - 0.03, 0.1, l * 0.5, 0.035), WHITE, { pos: [0, 0.19, -0.02], pattern: tinted(PAT.none) }),
    part(box(w - 0.025, 0.07, l * 0.46), GLASS, { pos: [0, 0.195, -0.02], pattern: PAT.glass }),
    part(bevelBox(w + 0.01, 0.025, 0.04, 0.01), DARK, { pos: [0, 0.07, l / 2] }),
    part(bevelBox(w + 0.01, 0.025, 0.04, 0.01), DARK, { pos: [0, 0.07, -l / 2] }),
    ...lights(w, l / 2 + 0.003, -l / 2 - 0.003, 0.11),
  ], { ao: false });
}

/** A boxy hatchback (0.28 × 0.5) with a roof rack. */
export function hatchback(): THREE.BufferGeometry {
  const w = 0.27, l = 0.5;
  return merge([
    ...wheels(w / 2 - 0.01, [-0.15, 0.15]),
    part(bevelBox(w, 0.11, l, 0.03), WHITE, { pos: [0, 0.105, 0], pattern: tinted(PAT.none) }),
    part(bevelBox(w - 0.02, 0.11, l * 0.62, 0.03), WHITE, { pos: [0, 0.2, -0.06], pattern: tinted(PAT.none) }),
    part(box(w - 0.015, 0.075, l * 0.58), GLASS, { pos: [0, 0.205, -0.06], pattern: PAT.glass }),
    ...[-1, 1].map(s => part(box(0.015, 0.015, l * 0.5), DARK, { pos: [s * 0.09, 0.265, -0.06] })),
    ...lights(w, l / 2 + 0.003, -l / 2 - 0.003, 0.12),
  ], { ao: false });
}

/** A delivery van (0.3 × 0.66): a tall box with a short bonnet. */
export function van(): THREE.BufferGeometry {
  const w = 0.29, l = 0.64;
  return merge([
    ...wheels(w / 2 - 0.01, [-0.2, 0.2], 0.06),
    part(bevelBox(w, 0.25, l * 0.74, 0.03), WHITE, { pos: [0, 0.2, -l * 0.13], pattern: tinted(PAT.none) }),
    part(bevelBox(w, 0.12, l * 0.3, 0.03), WHITE, { pos: [0, 0.13, l * 0.34], pattern: tinted(PAT.none) }),
    part(box(w - 0.02, 0.08, 0.02), GLASS, { pos: [0, 0.27, l * 0.24 + 0.006], rot: [-0.3, 0, 0], pattern: PAT.glass }),
    ...[-1, 1].map(s => part(box(0.01, 0.07, 0.1), GLASS, { pos: [s * (w / 2 + 0.002), 0.26, l * 0.17], pattern: PAT.glass })),
    part(box(w + 0.004, 0.05, l * 0.5), 0xfff4dc, { pos: [0, 0.2, -l * 0.18] }),
    ...lights(w, l / 2 + 0.003, -l / 2 - 0.003, 0.13),
  ], { ao: false });
}

/** The town bus (0.32 × 1.3): long and friendly, a band of windows, a destination sign, a door. */
export function bus(): THREE.BufferGeometry {
  const w = 0.31, l = 1.28;
  return merge([
    ...wheels(w / 2 - 0.01, [-0.42, 0.42], 0.065),
    part(bevelBox(w, 0.34, l, 0.05), WHITE, { pos: [0, 0.24, 0], pattern: tinted(PAT.none) }),
    part(box(w + 0.004, 0.12, l - 0.16), GLASS, { pos: [0, 0.3, -0.04], pattern: PAT.glass }),
    part(box(w - 0.04, 0.13, 0.01), GLASS, { pos: [0, 0.3, l / 2 + 0.002], pattern: PAT.glass }),
    part(box(w + 0.006, 0.035, l - 0.04), 0xfff4dc, { pos: [0, 0.18, 0] }),
    part(box(w * 0.6, 0.04, 0.012), 0xffd34d, { pos: [0, 0.39, l / 2 + 0.004], pattern: PAT.glow }),
    part(box(0.01, 0.22, 0.14), 0x3a4a58, { pos: [w / 2 + 0.002, 0.2, l / 2 - 0.2] }),
    part(bevelBox(w - 0.06, 0.03, l * 0.5, 0.01), 0xd8dde3, { pos: [0, 0.42, -0.1] }),
    ...lights(w, l / 2 + 0.003, -l / 2 - 0.003, 0.14),
  ], { ao: false });
}
