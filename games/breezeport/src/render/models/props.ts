/**
 * Park and street furniture, one tile or less each: a fountain, benches, a playground (slide,
 * swings and a climbing dome), a picnic table, flower beds, street lamps, a bus shelter, a fire
 * hydrant, a post box and a bin; and the trees: round street trees, blossom trees and pines (their
 * canopies take the instance colour, so seasons and looks don't need extra models).
 */
import type * as THREE from 'three';
import { bevelBox, box, cone, cyl, ico, merge, PAT, part, sphere, torus } from '../geo';
import { PAINT } from '../palette';
import { shrub, tinted, TRIM, WHITE, FLOWERS, LEAF, METAL, METAL_LIGHT, WOOD, type Parts } from './kit';

const PARK_GREEN = 0x2f6f5a;

/** A two-tier fountain in a round stone basin (2 × 2 lot, centred). */
export function fountain(): THREE.BufferGeometry {
  const parts: Parts = [
    part(cyl(0.72, 0.76, 0.16, 20), PAINT.stone, { pos: [0, 0.08, 0], pattern: PAT.stone }),
    part(cyl(0.64, 0.64, 0.04, 20), 0x5fc7d6, { pos: [0, 0.15, 0], pattern: PAT.glass }),
    part(cyl(0.12, 0.16, 0.42, 10), PAINT.stone, { pos: [0, 0.32, 0], pattern: PAT.stone }),
    part(cyl(0.3, 0.2, 0.08, 14), PAINT.stone, { pos: [0, 0.54, 0] }),
    part(cyl(0.26, 0.26, 0.02, 14), 0x7fd6e2, { pos: [0, 0.58, 0] }),
    part(cyl(0.05, 0.07, 0.22, 8), PAINT.stone, { pos: [0, 0.68, 0] }),
    part(sphere(0.07, 8, 6), 0x9ae4ee, { pos: [0, 0.83, 0] }),
    // falling water: soft pale sheets from the top bowl
    part(cyl(0.29, 0.34, 0.36, 14, ), 0xbdeff4, { pos: [0, 0.38, 0], scale: [1, 1, 1] }),
  ];
  return merge(parts);
}

export function bench(): THREE.BufferGeometry {
  return merge([
    part(bevelBox(0.5, 0.03, 0.14, 0.008), WOOD, { pos: [0, 0.14, 0], pattern: PAT.boards }),
    part(bevelBox(0.5, 0.1, 0.025, 0.008), WOOD, { pos: [0, 0.24, -0.07], rot: [-0.15, 0, 0], pattern: PAT.boards }),
    ...[-1, 1].map(s => part(box(0.03, 0.14, 0.15), PARK_GREEN, { pos: [s * 0.21, 0.07, 0] })),
    ...[-1, 1].map(s => part(box(0.03, 0.14, 0.03), PARK_GREEN, { pos: [s * 0.21, 0.2, -0.07] })),
  ]);
}

/** A playground (2 × 2): a slide on a little tower, swings, a climbing dome, all on soft red ground. */
export function playground(): THREE.BufferGeometry {
  const RED = 0xe25c4a, YEL = 0xffc23d, BLUE = 0x3f8fd0;
  const parts: Parts = [
    part(cyl(0.9, 0.9, 0.02, 20), 0xd8775f, { pos: [0, 0.01, 0], scale: [1, 1, 0.9] }),
    // the tower and slide
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => part(box(0.04, 0.6, 0.04), BLUE, { pos: [-0.35 + sx! * 0.15, 0.3, -0.3 + sz! * 0.15] })),
    part(bevelBox(0.36, 0.04, 0.36, 0.01), YEL, { pos: [-0.35, 0.34, -0.3] }),
    part(cone(0.27, 0.22, 4), RED, { pos: [-0.35, 0.72, -0.3], rot: [0, Math.PI / 4, 0] }),
    part(box(0.18, 0.025, 0.62), YEL, { pos: [-0.35, 0.2, 0.12], rot: [-0.55, 0, 0] }),
    ...[-1, 1].map(s => part(box(0.02, 0.06, 0.62), RED, { pos: [-0.35 + s * 0.09, 0.23, 0.12], rot: [-0.55, 0, 0] })),
    // a ladder
    ...[-1, 1].map(s => part(box(0.02, 0.4, 0.02), BLUE, { pos: [-0.62 + 0.0, 0.2, -0.3 + s * 0.08] })),
    ...[0.08, 0.18, 0.28].map(y => part(box(0.02, 0.02, 0.16), BLUE, { pos: [-0.62, y, -0.3] })),
    // the swings
    ...[-1, 1].map(s => part(box(0.035, 0.62, 0.035), RED, { pos: [0.48 + s * 0.3, 0.31, -0.34], rot: [0, 0, s * 0.12] })),
    part(box(0.68, 0.035, 0.035), RED, { pos: [0.48, 0.6, -0.34] }),
    ...[0.36, 0.6].flatMap(x => [
      ...[-1, 1].map(s => part(box(0.008, 0.4, 0.008), METAL_LIGHT, { pos: [x + s * 0.05, 0.4, -0.34] })),
      part(bevelBox(0.13, 0.025, 0.07, 0.008), x < 0.5 ? YEL : BLUE, { pos: [x, 0.2, -0.34] }),
    ]),
    // the climbing dome
    part(torus(0.24, 0.015, 4, 14, Math.PI), BLUE, { pos: [0.42, 0, 0.36] }),
    part(torus(0.24, 0.015, 4, 14, Math.PI), BLUE, { pos: [0.42, 0, 0.36], rot: [0, Math.PI / 2, 0] }),
    part(torus(0.24, 0.015, 4, 14, Math.PI), YEL, { pos: [0.42, 0, 0.36], rot: [0, Math.PI / 4, 0] }),
    part(torus(0.24, 0.015, 4, 14, Math.PI), YEL, { pos: [0.42, 0, 0.36], rot: [0, -Math.PI / 4, 0] }),
    part(torus(0.17, 0.014, 4, 14), RED, { pos: [0.42, 0.17, 0.36], rot: [Math.PI / 2, 0, 0] }),
  ];
  return merge(parts);
}

export function picnicTable(): THREE.BufferGeometry {
  return merge([
    part(bevelBox(0.5, 0.03, 0.24, 0.008), WOOD, { pos: [0, 0.2, 0], pattern: PAT.boards }),
    ...[-1, 1].map(s => part(bevelBox(0.5, 0.025, 0.09, 0.008), WOOD, { pos: [0, 0.11, s * 0.2], pattern: PAT.boards })),
    ...[-1, 1].map(s => part(box(0.03, 0.22, 0.46), 0x8a5a3b, { pos: [s * 0.18, 0.1, 0], rot: [0, 0, 0] })),
  ]);
}

/** A flower bed (1 × 1): a low stone edge filled with flowers in the instance's colours. */
export function flowerBed(): THREE.BufferGeometry {
  const parts: Parts = [part(bevelBox(0.82, 0.1, 0.82, 0.03), PAINT.stone, { pos: [0, 0.05, 0], pattern: PAT.stone }), part(box(0.74, 0.04, 0.74), 0x7a5a3a, { pos: [0, 0.09, 0] })];
  for (let i = 0; i < 16; i++) {
    const x = -0.28 + (i % 4) * 0.19, z = -0.28 + Math.floor(i / 4) * 0.19;
    parts.push(part(ico(0.07, 0), LEAF, { pos: [x, 0.14, z], round: true }));
    parts.push(part(ico(0.05, 0), WHITE, { pos: [x + 0.02, 0.2, z + 0.02], pattern: tinted(PAT.none) }));
  }
  return merge(parts);
}

/** A street lamp: a dark green post with a lantern that lights up at night. */
export function streetLamp(): THREE.BufferGeometry {
  return merge([
    part(cyl(0.035, 0.05, 0.08, 8), 0x2f5f5a, { pos: [0, 0.04, 0] }),
    part(cyl(0.016, 0.022, 0.86, 6), 0x2f5f5a, { pos: [0, 0.47, 0] }),
    part(box(0.09, 0.12, 0.09), 0xfff1c8, { pos: [0, 0.94, 0], pattern: PAT.glow }),
    part(cone(0.085, 0.07, 4), 0x2f5f5a, { pos: [0, 1.04, 0], rot: [0, Math.PI / 4, 0] }),
    part(box(0.1, 0.02, 0.1), 0x2f5f5a, { pos: [0, 0.875, 0] }),
  ], { ao: false });
}

/** A bus shelter (1 × 1, along x): a roof, glass sides, a bench and a round sign on a post. */
export function busShelter(): THREE.BufferGeometry {
  return merge([
    part(bevelBox(0.84, 0.04, 0.36, 0.01), PAINT.roofs[2]!, { pos: [0, 0.62, -0.08] }),
    ...[-1, 1].map(s => part(box(0.03, 0.6, 0.03), METAL, { pos: [s * 0.4, 0.3, 0.06] })),
    ...[-1, 1].map(s => part(box(0.03, 0.6, 0.03), METAL, { pos: [s * 0.4, 0.3, -0.22] })),
    part(box(0.78, 0.46, 0.02), 0xbfe6f2, { pos: [0, 0.33, -0.24], pattern: PAT.glass }),
    ...[-1, 1].map(s => part(box(0.02, 0.46, 0.26), 0xbfe6f2, { pos: [s * 0.4, 0.33, -0.09], pattern: PAT.glass })),
    part(bevelBox(0.56, 0.03, 0.11, 0.008), WOOD, { pos: [0, 0.15, -0.16], pattern: PAT.boards }),
    // the stop sign: a pole with a round bus badge
    part(cyl(0.012, 0.012, 0.74, 5), METAL, { pos: [0.5, 0.37, 0.14] }),
    part(cyl(0.08, 0.08, 0.02, 12), 0x2fa3b0, { pos: [0.5, 0.74, 0.14], rot: [Math.PI / 2, 0, 0] }),
    part(box(0.07, 0.04, 0.025), WHITE, { pos: [0.5, 0.74, 0.14] }),
  ]);
}

export function hydrant(): THREE.BufferGeometry {
  return merge([
    part(cyl(0.04, 0.045, 0.14, 8), 0xe2453a, { pos: [0, 0.07, 0] }),
    part(sphere(0.042, 8, 5), 0xe2453a, { pos: [0, 0.15, 0] }),
    part(cyl(0.016, 0.016, 0.1, 6), 0xd23a30, { pos: [0, 0.1, 0], rot: [0, 0, Math.PI / 2] }),
  ]);
}

export function postBox(): THREE.BufferGeometry {
  return merge([
    part(bevelBox(0.12, 0.18, 0.1, 0.02), 0x3f6fd0, { pos: [0, 0.2, 0] }),
    part(cyl(0.06, 0.06, 0.1, 10, ), 0x3f6fd0, { pos: [0, 0.29, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 1] }),
    ...[-1, 1].map(s => part(box(0.02, 0.12, 0.02), 0x2f3540, { pos: [s * 0.04, 0.06, 0] })),
  ]);
}

export function bin(): THREE.BufferGeometry {
  return merge([part(cyl(0.065, 0.055, 0.17, 8), 0x2f6f5a, { pos: [0, 0.085, 0], pattern: PAT.boards }), part(cyl(0.07, 0.07, 0.02, 8), 0x2f3a3a, { pos: [0, 0.18, 0] })]);
}

const TRUNK = 0x8a5a3b;

/** A round street tree: a slim trunk and a soft canopy in three shades (the canopy takes the tint). */
export function roundTree(): THREE.BufferGeometry {
  return merge([
    part(cyl(0.05, 0.075, 0.6, 7), TRUNK, { pos: [0, 0.3, 0], pattern: PAT.bark }),
    part(ico(0.36, 1), 0xb4b4b4, { pos: [0, 0.82, 0], scale: [1, 0.9, 1], round: true, pattern: tinted(PAT.none) }),
    part(ico(0.27, 0), 0xe6e6e6, { pos: [0.18, 0.92, 0.1], round: true, pattern: tinted(PAT.none) }),
    part(ico(0.25, 0), 0xe6e6e6, { pos: [-0.17, 0.9, 0.08], round: true, pattern: tinted(PAT.none) }),
    part(ico(0.22, 1), 0xffffff, { pos: [0.03, 1.1, 0.06], round: true, pattern: tinted(PAT.none) }),
  ]);
}

/** A tall pine for the edges of town and the park. */
export function pineTree(): THREE.BufferGeometry {
  return merge([
    part(cyl(0.05, 0.08, 0.36, 6), TRUNK, { pos: [0, 0.18, 0], pattern: PAT.bark }),
    part(cone(0.42, 0.6, 8), 0xa8a8a8, { pos: [0, 0.58, 0], pattern: tinted(PAT.none) }),
    part(cone(0.33, 0.52, 8), 0xd6d6d6, { pos: [0, 0.88, 0], rot: [0, 0.3, 0], pattern: tinted(PAT.none) }),
    part(cone(0.23, 0.44, 8), 0xffffff, { pos: [0, 1.16, 0], rot: [0, 0.6, 0], pattern: tinted(PAT.none) }),
  ]);
}

/** A cheap far tree for the countryside around town: a trunk and two blobs. */
export function farTree(): THREE.BufferGeometry {
  return merge([
    part(cyl(0.07, 0.1, 0.5, 5), TRUNK, { pos: [0, 0.25, 0], pattern: PAT.keep }),
    part(ico(0.5, 0), 0xc0c0c0, { pos: [0, 0.82, 0], scale: [1, 0.9, 1], round: true, pattern: tinted(PAT.none) }),
    part(ico(0.32, 0), 0xffffff, { pos: [0.07, 1.18, 0.05], round: true, pattern: tinted(PAT.none) }),
  ]);
}

/** A clump of bushes for yards and the park's edges. */
export function bushClump(): THREE.BufferGeometry {
  return merge([...shrub(-0.12, 0, 0.13, FLOWERS[0]), ...shrub(0.12, 0.06, 0.11), ...shrub(0.0, -0.12, 0.1, FLOWERS[2])]);
}

/** A white trellis arch for the park's gate, with roses. */
export function parkArch(): THREE.BufferGeometry {
  return merge([
    ...[-1, 1].map(s => part(box(0.05, 0.62, 0.05), TRIM, { pos: [s * 0.34, 0.31, 0] })),
    part(torus(0.34, 0.03, 4, 12, Math.PI), TRIM, { pos: [0, 0.62, 0] }),
    ...Array.from({ length: 9 }, (_, i) => part(ico(0.05, 0), i % 2 ? LEAF : 0xff7a8a, { pos: [Math.cos((i / 8) * Math.PI) * 0.34, 0.62 + Math.sin((i / 8) * Math.PI) * 0.34, 0.03] })),
  ]);
}

/** A duck pond (2 × 2): a round pool with reeds, lily pads, a stepping-stone edge and three ducks. */
export function pond(): THREE.BufferGeometry {
  const parts: Parts = [
    part(cyl(0.86, 0.9, 0.06, 20), PAINT.stone, { pos: [0, 0.03, 0], pattern: PAT.stone }),
    part(cyl(0.78, 0.78, 0.04, 20), 0x4fb8c8, { pos: [0, 0.05, 0], pattern: PAT.glass }),
  ];
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1;
    parts.push(part(cyl(0.09, 0.09, 0.01, 8), 0x5fae5a, { pos: [Math.cos(a) * 0.45, 0.075, Math.sin(a) * 0.4] }));
    if (i % 2) parts.push(part(ico(0.03, 0), 0xff9fd0, { pos: [Math.cos(a) * 0.45, 0.095, Math.sin(a) * 0.4] }));
  }
  for (let i = 0; i < 8; i++) {
    const a = 2.4 + i * 0.18;
    parts.push(part(cyl(0.008, 0.01, 0.3, 4), 0x5f9e45, { pos: [Math.cos(a) * 0.72, 0.18, Math.sin(a) * 0.72] }));
    if (i % 3 === 0) parts.push(part(cyl(0.015, 0.015, 0.07, 5), 0x8a5a3b, { pos: [Math.cos(a) * 0.72, 0.32, Math.sin(a) * 0.72] }));
  }
  [[-0.2, 0.1, 0], [0.15, -0.2, 1], [0.3, 0.25, 2]].forEach(([x, z, k]) => {
    const r = (k ?? 0) * 2;
    parts.push(part(sphere(0.06, 8, 5), k === 0 ? 0x6f8f5a : WHITE, { pos: [x!, 0.1, z!], scale: [1.2, 0.8, 1], rot: [0, r, 0] }));
    parts.push(part(sphere(0.035, 7, 4), k === 0 ? 0x2f6f4a : WHITE, { pos: [x! + Math.cos(r) * 0.06, 0.15, z! - Math.sin(r) * 0.06] }));
    parts.push(part(cone(0.015, 0.03, 4), 0xf2a93b, { pos: [x! + Math.cos(r) * 0.095, 0.15, z! - Math.sin(r) * 0.095], rot: [0, r, -Math.PI / 2] }));
  });
  return merge(parts);
}

/** A skate park (3 × 3): a smooth concrete pad with a quarter pipe, a fun box, a rail and a bowl, and graffiti-free bright paint. */
export function skatepark(): THREE.BufferGeometry {
  const C = 0xc9c4ba, EDGE = 0x8c949a;
  const parts: Parts = [part(bevelBox(2.8, 0.06, 2.8, 0.02), C, { pos: [0, 0.03, 0] })];
  // a quarter pipe along the back: a curved ramp in five steps of slope
  for (let i = 0; i < 5; i++) {
    const a0 = (i / 5) * (Math.PI / 2) * 0.9, a1 = ((i + 1) / 5) * (Math.PI / 2) * 0.9;
    const p0 = [-0.7 - Math.sin(a0) * 0.5, 0.56 - Math.cos(a0) * 0.5], p1 = [-0.7 - Math.sin(a1) * 0.5, 0.56 - Math.cos(a1) * 0.5];
    const len = Math.hypot(p1[0]! - p0[0]!, p1[1]! - p0[1]!);
    parts.push(part(box(2.4, 0.04, len + 0.02), C, { pos: [0, (p0[1]! + p1[1]!) / 2 + 0.06, (p0[0]! + p1[0]!) / 2], rot: [Math.atan2(p1[1]! - p0[1]!, -(p1[0]! - p0[0]!)), 0, 0] }));
  }
  parts.push(part(box(2.4, 0.5, 0.2), C, { pos: [0, 0.31, -1.3] }), part(cyl(0.025, 0.025, 2.4, 6), 0x3f8fd0, { pos: [0, 0.57, -1.2], rot: [0, 0, Math.PI / 2] }));
  // a fun box and a rail
  parts.push(part(bevelBox(0.7, 0.18, 0.5, 0.03), 0x5fbf7a, { pos: [-0.6, 0.15, 0.4] }), part(box(0.7, 0.02, 0.5), EDGE, { pos: [-0.6, 0.25, 0.4] }));
  parts.push(part(box(0.9, 0.025, 0.025), 0xef6a55, { pos: [0.6, 0.24, 0.6] }), ...[-1, 1].map(s => part(box(0.03, 0.2, 0.03), 0xef6a55, { pos: [0.6 + s * 0.4, 0.14, 0.6] })));
  // a little bowl, painted in a sunny ring
  parts.push(part(cyl(0.4, 0.4, 0.02, 16), 0xffc23d, { pos: [0.7, 0.065, -0.1] }), part(cyl(0.32, 0.32, 0.025, 16), C, { pos: [0.7, 0.07, -0.1] }));
  parts.push(part(bevelBox(0.36, 0.035, 0.12, 0.01), 0xb07a4f, { pos: [-1.1, 0.14, 1.2], pattern: PAT.boards }));
  return merge(parts);
}

/** The tram stop (1 × 1): a slim glass shelter with a curved roof and a round tram badge. */
export function tramStop(): THREE.BufferGeometry {
  return merge([
    part(bevelBox(0.86, 0.05, 0.3, 0.015), 0xf6c84b, { pos: [0, 0.7, -0.08] }),
    ...[-1, 1].map(s => part(box(0.03, 0.68, 0.03), 0x3b3f46, { pos: [s * 0.4, 0.34, -0.2] })),
    part(box(0.8, 0.48, 0.02), 0xbfe6f2, { pos: [0, 0.36, -0.22], pattern: PAT.glass }),
    part(bevelBox(0.5, 0.03, 0.1, 0.008), WOOD, { pos: [0, 0.16, -0.14], pattern: PAT.boards }),
    part(cyl(0.012, 0.012, 0.82, 5), METAL, { pos: [0.48, 0.41, 0.14] }),
    part(cyl(0.09, 0.09, 0.02, 12), 0xf2a93b, { pos: [0.48, 0.82, 0.14], rot: [Math.PI / 2, 0, 0] }),
    part(box(0.08, 0.02, 0.025), WHITE, { pos: [0.48, 0.84, 0.14] }), part(box(0.02, 0.07, 0.025), WHITE, { pos: [0.48, 0.81, 0.14] }),
  ]);
}

/** Scaffolding round a building going up: poles, boards, a little crane arm and safety netting. */
export function scaffold(): THREE.BufferGeometry {
  const parts: Parts = [part(box(1.5, 0.5, 1.2), 0xd9cdb6, { pos: [0, 0.25, -0.25] })];
  for (const x of [-0.8, 0, 0.8]) for (const z of [-0.9, 0.4]) parts.push(part(cyl(0.02, 0.02, 1.2, 5), 0xf2a93b, { pos: [x, 0.6, z] }));
  for (const y of [0.4, 0.8, 1.15]) {
    parts.push(part(box(1.66, 0.03, 0.12), 0xc79a68, { pos: [0, y, 0.46], pattern: PAT.boards }), part(box(1.66, 0.03, 0.12), 0xc79a68, { pos: [0, y, -0.96], pattern: PAT.boards }));
    parts.push(part(box(1.62, 0.02, 0.02), 0xf2a93b, { pos: [0, y + 0.12, 0.4] }));
  }
  parts.push(part(box(1.5, 0.5, 0.01), 0x8fc8f2, { pos: [0, 0.75, 0.47], pattern: PAT.glass }));
  parts.push(part(cyl(0.03, 0.03, 1.7, 6), 0xf2c84b, { pos: [0.7, 0.85, -0.6] }), part(box(1.1, 0.05, 0.05), 0xf2c84b, { pos: [0.3, 1.7, -0.6] }), part(box(0.01, 0.4, 0.01), 0x3b3f46, { pos: [-0.15, 1.5, -0.6] }), part(box(0.14, 0.1, 0.14), 0xb07a4f, { pos: [-0.15, 1.28, -0.6] }));
  return merge(parts);
}
