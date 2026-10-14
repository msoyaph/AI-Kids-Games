/**
 * The town's landmarks, each its own design: the old harbour pier (the ferry docks at its end);
 * later chapters add the Ferris wheel, the glasshouse, the aquarium, the observatory and the
 * festival stage.
 */
import type * as THREE from 'three';
import { bevelBox, box, cone, cyl, ico, merge, PAT, part, sphere, torus } from '../geo';
import { moved, TRIM, WOOD, WOOD_DARK, type Parts } from './kit';

/**
 * The harbour pier (2 × 5): a plank deck on posts running out into the bay, white rails, two lamps,
 * a life ring, and a little ticket hut at the end where the ferry ties up. Built facing south: the
 * town end is at +z (the turn in the town puts it pointing out to sea).
 */
export function pier(): THREE.BufferGeometry {
  const len = 5, wd = 1.3, deck = 0.18;
  const parts: Parts = [part(bevelBox(wd, 0.07, len, 0.015), 0xc79a68, { pos: [0, deck, 0], pattern: PAT.boards })];
  for (let i = 0; i <= 5; i++) for (const s of [-1, 1]) {
    const z = -len / 2 + 0.15 + i * ((len - 0.3) / 5);
    parts.push(part(cyl(0.05, 0.06, 0.8, 7), WOOD_DARK, { pos: [s * (wd / 2 - 0.05), deck - 0.4, z], pattern: PAT.bark }));
    parts.push(part(box(0.04, 0.24, 0.04), TRIM, { pos: [s * (wd / 2 - 0.03), deck + 0.15, z] }));
  }
  for (const s of [-1, 1]) for (const y of [0.13, 0.25]) parts.push(part(box(0.03, 0.025, len - 0.1), TRIM, { pos: [s * (wd / 2 - 0.03), deck + y, 0] }));
  // lamps and a life ring
  for (const z of [-1.2, 1.0]) parts.push(part(cyl(0.015, 0.02, 0.62, 6), 0x2f5f5a, { pos: [wd / 2 - 0.08, deck + 0.34, z] }), part(box(0.08, 0.1, 0.08), 0xfff1c8, { pos: [wd / 2 - 0.08, deck + 0.68, z], pattern: PAT.glow }));
  parts.push(part(torus(0.09, 0.03, 6, 12), 0xef6a55, { pos: [-wd / 2 + 0.02, deck + 0.24, 0.4], rot: [0, Math.PI / 2, 0] }));
  // the ticket hut at the sea end, and a mooring bollard
  const hz = -len / 2 + 0.55;
  parts.push(part(bevelBox(0.62, 0.5, 0.56, 0.02), 0xf6f0e2, { pos: [0.2, deck + 0.3, hz], pattern: PAT.boards }));
  parts.push(part(bevelBox(0.74, 0.06, 0.68, 0.02), 0xef6a55, { pos: [0.2, deck + 0.58, hz] }));
  parts.push(part(box(0.28, 0.18, 0.02), 0x9fd4e6, { pos: [0.2, deck + 0.36, hz + 0.29], pattern: PAT.glass }));
  parts.push(part(cyl(0.05, 0.06, 0.14, 8), 0x3b3f46, { pos: [-0.45, deck + 0.1, -len / 2 + 0.2] }));
  parts.push(part(box(0.5, 0.04, 0.3), WOOD, { pos: [-0.3, deck - 0.05, -len / 2 - 0.1], pattern: PAT.boards }));
  return merge(parts);
}

/** The Ferris wheel (3 × 3): a white wheel with eight coloured cabins, an A-frame, a ticket kiosk and a queue rail. */
export function ferris(): THREE.BufferGeometry {
  const R = 1.35, cy = 1.75;
  const parts: Parts = [part(bevelBox(2.6, 0.08, 1.6, 0.03), 0xd6cebe, { pos: [0, 0.04, 0], pattern: PAT.stone })];
  for (const z of [-0.18, 0.18]) {
    parts.push(part(torus(R, 0.035, 5, 32), TRIM, { pos: [0, cy, z] }));
    parts.push(part(torus(R * 0.35, 0.025, 4, 16), TRIM, { pos: [0, cy, z] }));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; parts.push(part(box(0.025, R, 0.025), TRIM, { pos: [Math.cos(a) * R / 2, cy + Math.sin(a) * R / 2, z], rot: [0, 0, a + Math.PI / 2] })); }
    for (const s of [-1, 1]) parts.push(part(box(0.06, 1.95, 0.06), 0x3f6f8f, { pos: [s * 0.5, 0.88, z * 1.6], rot: [0, 0, -s * 0.27] }));
  }
  parts.push(part(cyl(0.08, 0.08, 0.6, 8), 0x3f6f8f, { pos: [0, cy, 0], rot: [Math.PI / 2, 0, 0] }));
  const colors = [0xef6a55, 0xffc23d, 0x2fa3b0, 0x5fbf7a, 0xb08ae0, 0xff8a5a, 0x3f8fd0, 0xf29ab0];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const x = Math.cos(a) * R, y = cy + Math.sin(a) * R;
    parts.push(part(bevelBox(0.26, 0.22, 0.26, 0.05), colors[i]!, { pos: [x, y - 0.16, 0] }));
    parts.push(part(box(0.2, 0.08, 0.27), PAINT_GLASS, { pos: [x, y - 0.12, 0], pattern: PAT.glass }));
    parts.push(part(cone(0.18, 0.08, 6), WHITE_ROOF, { pos: [x, y - 0.02, 0] }));
  }
  // the kiosk and the queue
  parts.push(part(bevelBox(0.4, 0.36, 0.34, 0.02), 0xf6f0e2, { pos: [1.0, 0.26, 0.55], pattern: PAT.boards }), part(cone(0.32, 0.18, 4), 0xef6a55, { pos: [1.0, 0.53, 0.55], rot: [0, Math.PI / 4, 0], pattern: PAT.stripes }));
  for (let i = 0; i < 5; i++) parts.push(part(box(0.025, 0.2, 0.025), 0x3b3f46, { pos: [-1.0 + i * 0.3, 0.14, 0.7] }));
  parts.push(part(box(1.25, 0.02, 0.02), 0xef6a55, { pos: [-0.4, 0.22, 0.7] }));
  return merge(parts);
}
const PAINT_GLASS = 0x9fd4e6, WHITE_ROOF = 0xfdfbf5;

/** The glasshouse (4 × 3): a curved Victorian-style frame of white iron and glass, full of green, with a fountain path. */
export function glasshouse(): THREE.BufferGeometry {
  const parts: Parts = [part(bevelBox(3.6, 0.12, 2.4, 0.03), 0xd6cebe, { pos: [0, 0.06, -0.2], pattern: PAT.stone })];
  // the central dome and two long wings, as glass shells with white ribs
  parts.push(part(sphere(0.9, 16, 8), PAINT_GLASS, { pos: [0, 0.72, -0.2], scale: [1, 1.1, 1], pattern: PAT.glass }));
  for (let i = 0; i < 8; i++) parts.push(part(torus(0.9, 0.02, 3, 16, Math.PI), TRIM, { pos: [0, 0.72, -0.2], rot: [0, (i / 8) * Math.PI, 0], scale: [1, 1.1, 1] }));
  for (const s of [-1, 1]) {
    parts.push(part(cyl(0.62, 0.62, 1.2, 12, ), PAINT_GLASS, { pos: [s * 1.15, 0.7, -0.2], rot: [0, 0, Math.PI / 2], scale: [1, 1, 1], pattern: PAT.glass }));
    for (let k = 0; k < 5; k++) parts.push(part(torus(0.62, 0.018, 3, 14, Math.PI), TRIM, { pos: [s * (0.62 + k * 0.27), 0.7, -0.2], rot: [0, Math.PI / 2, 0] }));
  }
  parts.push(part(box(3.4, 0.7, 1.22), 0x3f8a4a, { pos: [0, 0.4, -0.2] }));
  for (let i = 0; i < 9; i++) parts.push(part(ico(0.28, 0), [0x5fae5a, 0x3f8a4a, 0x7fc86a][i % 3]!, { pos: [-1.4 + i * 0.35, 0.9 + (i % 2) * 0.15, -0.2 + ((i * 7) % 3 - 1) * 0.2], round: true }));
  parts.push(part(cyl(0.02, 0.02, 0.3, 5), 0xf2c84b, { pos: [0, 1.75, -0.2] }), part(sphere(0.05, 6, 4), 0xf2c84b, { pos: [0, 1.92, -0.2] }));
  parts.push(...[-1, 1].map(s => part(bevelBox(0.5, 0.6, 0.14, 0.02), TRIM, { pos: [s * 0.0 + 0, 0.42, 0.75] })));
  parts.push(part(box(0.3, 0.46, 0.02), PAINT_GLASS, { pos: [0, 0.4, 0.83], pattern: PAT.glass }));
  for (let i = 0; i < 6; i++) parts.push(part(ico(0.06, 0), [0xff7a8a, 0xffd34d, 0xb59cff][i % 3]!, { pos: [-1.5 + i * 0.6, 0.18, 0.95] }));
  return merge(parts);
}

/** The aquarium (4 × 4): a wave-roofed sea-blue hall with a big round window, a whale-tail sculpture and a fountain. */
export function aquarium(): THREE.BufferGeometry {
  const parts: Parts = [part(bevelBox(3.8, 0.12, 3.8, 0.03), 0xd6cebe, { pos: [0, 0.06, 0], pattern: PAT.stone })];
  parts.push(part(box(3.2, 1.3, 2.4), 0x3f8fd0, { pos: [0, 0.77, -0.5], pattern: PAT.siding }));
  // the wavy roof: three rolling waves
  for (let i = 0; i < 3; i++) parts.push(part(cyl(0.6, 0.6, 2.5, 12, ), 0x2fa3b0, { pos: [-1.05 + i * 1.05, 1.42, -0.5], rot: [Math.PI / 2, 0, 0], scale: [0.9, 1, 0.5], pattern: PAT.tiles }));
  // a big round window into the big tank, with fish shapes
  parts.push(part(cyl(0.55, 0.55, 0.06, 20), TRIM, { pos: [-0.6, 0.85, 0.71], rot: [Math.PI / 2, 0, 0] }), part(cyl(0.48, 0.48, 0.07, 20), 0x5fd0e0, { pos: [-0.6, 0.85, 0.72], rot: [Math.PI / 2, 0, 0], pattern: PAT.glass }));
  for (let i = 0; i < 4; i++) parts.push(part(sphere(0.06, 6, 4), [0xffc23d, 0xef6a55, 0xffffff, 0xff8a5a][i]!, { pos: [-0.8 + (i % 2) * 0.35, 0.7 + Math.floor(i / 2) * 0.3, 0.77], scale: [1.6, 0.8, 0.4] }));
  parts.push(...moved([part(bevelBox(0.6, 0.6, 0.06, 0.02), TRIM, { pos: [0, 0.3, 0] }), part(box(0.5, 0.5, 0.04), PAINT_GLASS, { pos: [0, 0.3, 0.02], pattern: PAT.glass })], 0.8, 0.12, 0.7));
  // the whale-tail sculpture rising from a pool
  parts.push(part(cyl(0.6, 0.62, 0.1, 18), 0xd6cebe, { pos: [0, 0.17, 1.35], pattern: PAT.stone }), part(cyl(0.54, 0.54, 0.03, 18), 0x5fd0e0, { pos: [0, 0.22, 1.35] }));
  parts.push(part(cyl(0.07, 0.1, 0.5, 8), 0x4a6a8a, { pos: [0, 0.45, 1.35], rot: [0.2, 0, 0] }));
  for (const s of [-1, 1]) parts.push(part(sphere(0.2, 8, 5), 0x4a6a8a, { pos: [s * 0.18, 0.72, 1.32], scale: [1.2, 0.35, 0.6], rot: [0, 0, s * 0.5] }));
  return merge(parts);
}

/** The observatory (3 × 3): a stone tower with a white dome, its slit open and the big telescope peeking out, steps and a garden. */
export function observatory(): THREE.BufferGeometry {
  const parts: Parts = [
    part(bevelBox(2.6, 0.12, 2.6, 0.03), 0xd6cebe, { pos: [0, 0.06, 0], pattern: PAT.stone }),
    part(cyl(0.9, 1.0, 1.4, 16), 0xe2dccf, { pos: [0, 0.82, -0.2], pattern: PAT.stone }),
    part(cyl(1.0, 1.0, 0.1, 16), TRIM, { pos: [0, 1.56, -0.2] }),
    part(sphere(0.95, 18, 10), 0xf6f6f2, { pos: [0, 1.6, -0.2], scale: [1, 0.9, 1] }),
    part(box(0.3, 0.9, 1.0), 0x2a3440, { pos: [0, 2.0, 0.15], rot: [-0.5, 0, 0] }),
    part(cyl(0.12, 0.16, 1.1, 10), 0x5d6470, { pos: [0, 2.2, 0.35], rot: [-0.9, 0, 0] }),
    part(cyl(0.14, 0.14, 0.06, 10), 0xf2c84b, { pos: [0, 2.53, 0.78], rot: [-0.9, 0, 0], pattern: PAT.glow }),
  ];
  parts.push(...moved([part(bevelBox(0.42, 0.62, 0.06, 0.02), TRIM, { pos: [0, 0.31, 0] }), part(box(0.32, 0.55, 0.05), 0x2f4f8a, { pos: [0, 0.29, 0.02], pattern: PAT.boards })], 0, 0.12, 0.72));
  for (let i = 0; i < 3; i++) parts.push(part(bevelBox(0.9 - i * 0.1, 0.05, 0.16, 0.01), 0xd6cebe, { pos: [0, 0.03 + i * 0.045, 1.05 - i * 0.12], pattern: PAT.stone }));
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) parts.push(part(ico(0.1, 0), [0xff7a8a, 0xffd34d, 0xb59cff][i]!, { pos: [s * (0.7 + i * 0.18), 0.2, 0.9 - i * 0.1] }), part(ico(0.13, 0), 0x5fae5a, { pos: [s * (0.7 + i * 0.18), 0.12, 0.9 - i * 0.1], round: true }));
  return merge(parts);
}

/** The festival stage (4 × 3): a bandstand with a striped canopy, bunting, lanterns, speakers and a big star on top. */
export function stage(): THREE.BufferGeometry {
  const parts: Parts = [
    part(bevelBox(3.6, 0.32, 2.2, 0.04), 0xc79a68, { pos: [0, 0.16, -0.3], pattern: PAT.boards }),
    part(box(3.62, 0.08, 2.22), TRIM, { pos: [0, 0.34, -0.3] }),
  ];
  for (const x of [-1.6, 1.6]) for (const z of [-1.3, 0.7]) parts.push(part(cyl(0.05, 0.06, 1.5, 8), TRIM, { pos: [x, 1.07, z] }));
  // the canopy: a striped curve
  for (let i = 0; i < 8; i++) {
    const x = -1.6 + i * (3.2 / 7);
    parts.push(part(box(0.42, 0.04, 2.2), i % 2 ? 0xef6a55 : 0xfdfbf5, { pos: [x, 1.9 + Math.sin((i / 7) * Math.PI) * 0.3, -0.3] }));
  }
  parts.push(part(cone(0.18, 0.04, 5), 0xf2c84b, { pos: [0, 2.42, -0.3], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 1] }));
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; parts.push(part(cone(0.07, 0.18, 3), 0xf2c84b, { pos: [Math.cos(a) * 0.14, 2.45 - Math.sin(a) * 0.14, -0.3], rot: [0, 0, a - Math.PI / 2] })); }
  // bunting and lanterns along the front
  for (let i = 0; i < 14; i++) {
    const x = -1.6 + i * (3.2 / 13), sag = Math.sin((i / 13) * Math.PI) * 0.18;
    parts.push(part(cone(0.06, 0.1, 3), [0xef6a55, 0xffc23d, 0x2fa3b0, 0x5fbf7a, 0xb08ae0][i % 5]!, { pos: [x, 1.7 - sag, 0.72], rot: [Math.PI, 0, 0] }));
    if (i % 3 === 0) parts.push(part(sphere(0.07, 8, 5), 0xffe7a8, { pos: [x, 1.5 - sag, 0.74], pattern: PAT.glow }));
  }
  // speakers and a piano
  for (const s of [-1, 1]) parts.push(part(bevelBox(0.3, 0.5, 0.3, 0.03), 0x2f3540, { pos: [s * 1.35, 0.63, 0.45] }), part(cyl(0.08, 0.08, 0.02, 10), 0x5d6470, { pos: [s * 1.35, 0.68, 0.61], rot: [Math.PI / 2, 0, 0] }));
  parts.push(part(bevelBox(0.8, 0.4, 0.4, 0.03), 0x2f3540, { pos: [-0.6, 0.6, -0.9] }), part(box(0.7, 0.02, 0.12), WHITE_ROOF, { pos: [-0.6, 0.81, -0.72] }));
  for (let i = 0; i < 3; i++) parts.push(part(bevelBox(1.0 - i * 0.12, 0.08, 0.2, 0.01), 0xc79a68, { pos: [0, 0.04 + i * 0.08, 1.15 - i * 0.14], pattern: PAT.boards }));
  return merge(parts);
}
