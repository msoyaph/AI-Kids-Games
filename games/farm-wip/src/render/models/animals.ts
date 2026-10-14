/**
 * Animal homes and the animals themselves, built in code. Homes use the building convention (origin
 * at the north-west corner of the footprint, facing south); animals are centred on their feet and
 * face +z. Each home has a fenced yard at the front where its animals wander.
 */
import type * as THREE from 'three';
import { bevelBox, box, cone, cyl, ico, merge, PAT, part, prism, sphere, torus } from '../geo';
import { ITEMS } from '../../data/items';

const WOOD = 0xb07a4f, WOOD_DARK = 0x8a5a3b, CREAM = 0xfff2d6, RED = 0xd9534a, RED_DARK = 0xb8433b, STRAW = 0xe8cf7a, BLUE = 0x6fa8d6;

/** A low post-and-rail fence around the edge of a w × d footprint, with a gate gap at the front middle. */
function fence(w: number, d: number, z0 = 0): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  const post = (x: number, z: number) => {
    parts.push(part(bevelBox(0.09, 0.4, 0.09, 0.015), WOOD_DARK, { pos: [x, 0.2, z], pattern: PAT.boards }));
    parts.push(part(cone(0.065, 0.06, 4), WOOD_DARK, { pos: [x, 0.43, z], rot: [0, Math.PI / 4, 0] }));
  };
  const rail = (x0: number, z0_: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0_), cx = (x0 + x1) / 2, cz = (z0_ + z1) / 2, rot = Math.atan2(z1 - z0_, x1 - x0);
    for (const y of [0.15, 0.3]) parts.push(part(box(len, 0.05, 0.04), WOOD, { pos: [cx, y, cz], rot: [0, -rot, 0], pattern: PAT.planks }));
  };
  const e = 0.06;
  for (const [x, z] of [[e, z0 + e], [w - e, z0 + e], [w - e, d - e], [e, d - e]] as const) post(x, z);
  // a middle post on long sides
  for (const x of [e, w - e]) if (d - z0 > 1.5) post(x, (z0 + d) / 2);
  rail(e, z0 + e, e, d - e);
  rail(w - e, z0 + e, w - e, d - e);
  rail(e, d - e, w / 2 - 0.3, d - e);
  rail(w / 2 + 0.3, d - e, w - e, d - e);
  post(w / 2 - 0.3, d - e); post(w / 2 + 0.3, d - e);
  return parts;
}

function shedRoof(cx: number, cz: number, w: number, d: number, y: number, color: number): THREE.BufferGeometry[] {
  const pitch = 0.58, half = d / 2 + 0.1, len = half / Math.cos(pitch), rise = Math.tan(pitch) * (d / 2);
  return [
    part(box(w + 0.18, 0.07, len), color, { pos: [cx, y + rise / 2 + 0.02, cz - half / 2], rot: [-pitch, 0, 0], pattern: PAT.shingles }),
    part(box(w + 0.18, 0.07, len), color, { pos: [cx, y + rise / 2 + 0.02, cz + half / 2], rot: [pitch, 0, 0], pattern: PAT.shingles }),
    part(prism(w, d, rise), 0xfff2d6, { pos: [cx, y, cz], pattern: PAT.boards }),
    part(cyl(0.045, 0.045, w + 0.2, 6), WOOD_DARK, { pos: [cx, y + rise + 0.06, cz], rot: [0, 0, Math.PI / 2] }),
  ];
}

/** A grain trough or a water trough on short legs. */
function trough(x: number, z: number, len: number, water: boolean, rot = 0): THREE.BufferGeometry[] {
  const c = Math.cos(rot), sn = Math.sin(rot);
  const at = (dx: number): [number, number] => [x + dx * c, z - dx * sn];
  return [
    part(bevelBox(len, 0.14, 0.24, 0.02), WOOD, { pos: [x, 0.13, z], rot: [0, rot, 0], pattern: PAT.planks }),
    part(box(len - 0.08, 0.02, 0.16), water ? 0x6fc3e6 : 0xe8cf7a, { pos: [x, 0.205, z], rot: [0, rot, 0] }),
    ...[-1, 1].map(k => { const [px, pz] = at(k * (len / 2 - 0.06)); return part(box(0.06, 0.08, 0.26), WOOD_DARK, { pos: [px, 0.04, pz], rot: [0, rot, 0] }); }),
  ];
}

/** A metal bucket. */
function bucket(x: number, z: number, water = false): THREE.BufferGeometry[] {
  return [
    part(cyl(0.075, 0.06, 0.13, 9), 0x9aa4ae, { pos: [x, 0.065, z] }),
    part(torus(0.07, 0.008, 3, 10, Math.PI), 0x5a5f6b, { pos: [x, 0.13, z] }),
    ...(water ? [part(cyl(0.068, 0.068, 0.01, 9), 0x6fc3e6, { pos: [x, 0.12, z] })] : []),
  ];
}

export function coop(): THREE.BufferGeometry {
  const COOP = 0x6fa3c8;
  return merge([
    ...fence(2, 2),
    // the hen house up on legs, with a nesting box at the side, a ramp and a round window
    ...[[0.55, 0.22], [1.45, 0.22], [0.55, 0.72], [1.45, 0.72]].map(([x, z]) => part(box(0.07, 0.3, 0.07), WOOD_DARK, { pos: [x!, 0.15, z!] })),
    part(bevelBox(1.05, 0.6, 0.66, 0.03), COOP, { pos: [1, 0.6, 0.47], pattern: PAT.boards }),
    ...[-1, 1].flatMap(sx => [-1, 1].map(sz => part(box(0.06, 0.6, 0.06), 0xfffaf0, { pos: [1 + sx * 0.52, 0.6, 0.47 + sz * 0.33] }))),
    ...shedRoof(1, 0.47, 1.05, 0.66, 0.9, 0xb8743f),
    part(bevelBox(0.32, 0.32, 0.44, 0.02), COOP, { pos: [1.68, 0.5, 0.47], pattern: PAT.boards }),
    part(box(0.4, 0.05, 0.5), 0xb8743f, { pos: [1.7, 0.7, 0.47], rot: [0, 0, -0.35], pattern: PAT.shingles }),
    part(bevelBox(0.26, 0.32, 0.04, 0.01), 0xfffaf0, { pos: [0.82, 0.55, 0.8] }),
    part(box(0.2, 0.26, 0.03), 0x3d3a35, { pos: [0.82, 0.54, 0.815] }),
    part(cyl(0.09, 0.09, 0.04, 10), 0xfffaf0, { pos: [1.25, 0.66, 0.8], rot: [Math.PI / 2, 0, 0] }),
    part(cyl(0.065, 0.065, 0.05, 10), 0xa9dcf2, { pos: [1.25, 0.66, 0.805], rot: [Math.PI / 2, 0, 0] }),
    part(box(0.24, 0.035, 0.62), WOOD, { pos: [0.82, 0.18, 1.08], rot: [-0.55, 0, 0], pattern: PAT.planks }),
    ...[0, 1, 2, 3].map(i => part(box(0.24, 0.02, 0.025), WOOD_DARK, { pos: [0.82, 0.08 + i * 0.075, 1.29 - i * 0.13], rot: [-0.55, 0, 0] })),
    // straw, a feeder, water, and a sack of grain in the yard
    part(ico(0.2, 1), STRAW, { pos: [0.35, 0.05, 0.35], scale: [1.4, 0.35, 1.1], pattern: PAT.straw }),
    ...trough(1.38, 1.55, 0.5, false, 0.3),
    ...bucket(0.3, 1.7, true),
    part(sphere(0.12, 8, 6), 0xe6d3a8, { pos: [1.78, 0.13, 1.25], scale: [1, 1.15, 0.8] }),
    part(cyl(0.04, 0.07, 0.06, 6), 0xe6d3a8, { pos: [1.78, 0.29, 1.25] }),
  ]);
}

export function cowBarn(): THREE.BufferGeometry {
  return merge([
    part(box(2.9, 0.02, 2.9), 0xa9c97a, { pos: [1.5, 0.01, 1.5] }),
    ...fence(3, 3, 1.2),
    part(box(2.4, 1.2, 1.3), RED, { pos: [1.5, 0.6, 0.75], pattern: PAT.boards }),
    ...shedRoof(1.5, 0.75, 2.4, 1.3, 1.2, 0x8a3a34),
    part(box(0.9, 0.85, 0.04), CREAM, { pos: [1.5, 0.43, 1.41] }),
    part(box(0.75, 0.04, 0.05), RED_DARK, { pos: [1.5, 0.43, 1.44], rot: [0, 0, 0.8] }),
    part(box(0.75, 0.04, 0.05), RED_DARK, { pos: [1.5, 0.43, 1.44], rot: [0, 0, -0.8] }),
    part(box(0.3, 0.3, 0.04), CREAM, { pos: [1.5, 1.05, 1.41] }),
    ...trough(2.4, 2.2, 0.6, true),
    ...bucket(2.0, 2.45),
    part(cyl(0.22, 0.22, 0.3, 8), STRAW, { pos: [0.55, 0.15, 2.3], rot: [0, 0, Math.PI / 2] }),
  ]);
}

export function sheepShed(): THREE.BufferGeometry {
  return merge([
    part(box(2.9, 0.02, 1.9), 0xb3d18a, { pos: [1.5, 0.01, 1] }),
    ...fence(3, 2, 0.7),
    part(box(2.2, 0.75, 0.75), WOOD, { pos: [1.5, 0.38, 0.4], pattern: PAT.planks }),
    part(box(2.4, 0.08, 1.0), 0x8f8a80, { pos: [1.5, 0.82, 0.45], rot: [0.25, 0, 0] }),
    part(box(0.5, 0.55, 0.04), WOOD_DARK, { pos: [1.5, 0.28, 0.79] }),
    part(cyl(0.2, 0.2, 0.3, 8), STRAW, { pos: [2.5, 0.15, 1.5], rot: [0, 0, Math.PI / 2] }),
  ]);
}

export function goatPen(): THREE.BufferGeometry {
  return merge([
    part(box(1.9, 0.02, 1.9), 0xc2c98a, { pos: [1, 0.01, 1] }),
    ...fence(2, 2),
    part(box(0.8, 0.55, 0.6), WOOD, { pos: [0.55, 0.28, 0.42], pattern: PAT.planks }),
    ...shedRoof(0.55, 0.42, 0.8, 0.6, 0.55, 0x7a8f5a),
    part(ico(0.32, 0), 0x9a948a, { pos: [1.45, 0.18, 0.6], scale: [1.2, 0.6, 1] }), // a rock to climb
    part(box(0.36, 0.06, 0.6), WOOD, { pos: [1.35, 0.35, 1.25], rot: [0, 0.3, 0.3] }),
  ]);
}

export function duckHouse(): THREE.BufferGeometry {
  return merge([
    part(box(1.9, 0.02, 1.9), 0xb3d18a, { pos: [1, 0.01, 1] }),
    ...[[0.55, 0.3], [1.15, 0.3], [0.55, 0.85], [1.15, 0.85]].map(([x, z]) => part(cyl(0.04, 0.04, 0.35, 5), WOOD_DARK, { pos: [x!, 0.18, z!] })),
    part(box(0.8, 0.5, 0.7), BLUE, { pos: [0.85, 0.6, 0.58], pattern: PAT.boards }),
    ...shedRoof(0.85, 0.58, 0.8, 0.7, 0.85, 0x3f78a8),
    part(box(0.24, 0.04, 0.8), WOOD, { pos: [0.85, 0.2, 1.2], rot: [-0.4, 0, 0] }),
    part(cyl(0.45, 0.45, 0.03, 14), 0x7ec8e3, { pos: [1.4, 0.03, 1.45] }), // a little splash pool
  ]);
}

export function beehive(): THREE.BufferGeometry {
  return merge([
    part(box(0.6, 0.12, 0.6), WOOD_DARK, { pos: [0.5, 0.06, 0.5] }),
    part(box(0.5, 0.25, 0.5), CREAM, { pos: [0.5, 0.25, 0.5] }),
    part(box(0.5, 0.22, 0.5), 0xf6e3a6, { pos: [0.5, 0.49, 0.5] }),
    part(box(0.56, 0.06, 0.56), WOOD, { pos: [0.5, 0.63, 0.5] }),
    part(box(0.16, 0.04, 0.03), 0x3d3a35, { pos: [0.5, 0.16, 0.76] }),
    part(ico(0.1, 0), 0xf3a6c8, { pos: [0.15, 0.1, 0.85] }), part(ico(0.08, 0), 0xffd34d, { pos: [0.85, 0.08, 0.82] }),
  ]);
}

export function kennel(): THREE.BufferGeometry {
  return merge([
    part(bevelBox(0.7, 0.42, 0.62, 0.025), 0xd2a26e, { pos: [0.5, 0.21, 0.45], pattern: PAT.planks }),
    ...shedRoof(0.5, 0.45, 0.7, 0.62, 0.42, 0xe25c4a),
    part(cyl(0.14, 0.14, 0.04, 10), 0x5a3d2a, { pos: [0.5, 0.18, 0.77], rot: [Math.PI / 2, 0, 0] }),
    part(box(0.26, 0.09, 0.03), CREAM, { pos: [0.5, 0.36, 0.77] }),
    part(cyl(0.1, 0.1, 0.05, 10), 0x6fa8d6, { pos: [0.85, 0.03, 0.85] }),
    part(cyl(0.07, 0.07, 0.01, 10), 0xc98a4a, { pos: [0.85, 0.06, 0.85] }),
    part(box(0.18, 0.04, 0.06), 0xfaf3e6, { pos: [0.18, 0.02, 0.88], rot: [0, 0.5, 0] }), // a bone
  ]);
}

// --- animals (centred on their feet, facing +z) ---

/** A pair of shiny eyes on the front of a head. */
function eyes(dx: number, y: number, z: number, r = 0.018): THREE.BufferGeometry[] {
  return [-1, 1].flatMap(s => [
    part(sphere(r, 6, 4), 0x2a2622, { pos: [s * dx, y, z], scale: [1, 1.15, 0.7] }),
    part(sphere(r * 0.38, 4, 3), 0xffffff, { pos: [s * dx + r * 0.3, y + r * 0.35, z + r * 0.5] }),
  ]);
}

export function chicken(c: { body: number; accent: number }): THREE.BufferGeometry {
  return merge([
    part(sphere(0.11, 7, 5), c.body, { pos: [0, 0.14, 0], scale: [0.9, 0.85, 1.15] }),
    part(sphere(0.065, 6, 4), c.body, { pos: [0, 0.25, 0.08] }),
    part(cone(0.025, 0.05, 4), 0xf4a542, { pos: [0, 0.25, 0.15], rot: [Math.PI / 2, 0, 0] }),
    ...eyes(0.042, 0.27, 0.12, 0.013),
    part(box(0.02, 0.05, 0.06), c.accent, { pos: [0, 0.32, 0.08] }),
    part(cone(0.05, 0.1, 4), c.body, { pos: [0, 0.2, -0.12], rot: [-0.9, 0, 0] }),
    part(cyl(0.012, 0.012, 0.08, 4), 0xf4a542, { pos: [0.04, 0.04, 0] }), part(cyl(0.012, 0.012, 0.08, 4), 0xf4a542, { pos: [-0.04, 0.04, 0] }),
  ]);
}

export function cow(c: { body: number; accent: number }): THREE.BufferGeometry {
  return merge([
    part(box(0.34, 0.26, 0.6), c.body, { pos: [0, 0.38, 0] }),
    part(box(0.2, 0.12, 0.25), c.accent, { pos: [0.08, 0.45, -0.08] }),
    part(box(0.15, 0.1, 0.18), c.accent, { pos: [-0.1, 0.36, 0.15] }),
    part(box(0.2, 0.2, 0.22), c.body, { pos: [0, 0.5, 0.38] }),
    part(box(0.16, 0.09, 0.06), 0xf2b8b0, { pos: [0, 0.44, 0.5] }),
    ...eyes(0.065, 0.55, 0.495, 0.02),
    part(cone(0.03, 0.08, 4), 0xf6f1ea, { pos: [0.08, 0.64, 0.38] }), part(cone(0.03, 0.08, 4), 0xf6f1ea, { pos: [-0.08, 0.64, 0.38] }),
    ...[[0.12, 0.2], [-0.12, 0.2], [0.12, -0.2], [-0.12, -0.2]].map(([x, z]) => part(box(0.07, 0.26, 0.07), c.body, { pos: [x!, 0.13, z!] })),
  ]);
}

export function sheep(c: { body: number; accent: number }): THREE.BufferGeometry {
  const parts = [];
  for (const [x, y, z] of [[0, 0.32, 0], [0.1, 0.36, 0.12], [-0.1, 0.36, -0.1], [0.1, 0.34, -0.14], [-0.1, 0.33, 0.1]] as const) parts.push(part(ico(0.16, 0), c.body, { pos: [x, y, z] }));
  parts.push(part(box(0.14, 0.15, 0.16), c.accent, { pos: [0, 0.38, 0.28] }));
  parts.push(...eyes(0.04, 0.4, 0.365, 0.016));
  parts.push(part(box(0.06, 0.03, 0.08), c.accent, { pos: [0.1, 0.42, 0.27] }), part(box(0.06, 0.03, 0.08), c.accent, { pos: [-0.1, 0.42, 0.27] }));
  for (const [x, z] of [[0.09, 0.12], [-0.09, 0.12], [0.09, -0.12], [-0.09, -0.12]]) parts.push(part(box(0.05, 0.2, 0.05), c.accent, { pos: [x!, 0.1, z!] }));
  return merge(parts);
}

export function goat(c: { body: number; accent: number }): THREE.BufferGeometry {
  return merge([
    part(box(0.24, 0.2, 0.42), c.body, { pos: [0, 0.32, 0] }),
    part(box(0.15, 0.15, 0.18), c.body, { pos: [0, 0.46, 0.25] }),
    part(cone(0.025, 0.12, 4), c.accent, { pos: [0.05, 0.6, 0.22], rot: [-0.5, 0, 0] }), part(cone(0.025, 0.12, 4), c.accent, { pos: [-0.05, 0.6, 0.22], rot: [-0.5, 0, 0] }),
    part(cone(0.03, 0.08, 4), 0xfaf3e6, { pos: [0, 0.36, 0.32], rot: [Math.PI, 0, 0] }), // beard
    ...eyes(0.045, 0.49, 0.338, 0.016),
    part(cone(0.03, 0.07, 4), c.body, { pos: [0, 0.4, -0.22], rot: [-0.8, 0, 0] }),
    ...[[0.08, 0.14], [-0.08, 0.14], [0.08, -0.14], [-0.08, -0.14]].map(([x, z]) => part(box(0.05, 0.22, 0.05), c.accent, { pos: [x!, 0.11, z!] })),
  ]);
}

export function duck(c: { body: number; accent: number }): THREE.BufferGeometry {
  return merge([
    part(sphere(0.11, 7, 5), c.body, { pos: [0, 0.12, 0], scale: [0.9, 0.8, 1.25] }),
    part(sphere(0.07, 6, 4), c.body, { pos: [0, 0.25, 0.1] }),
    part(box(0.06, 0.025, 0.08), c.accent, { pos: [0, 0.24, 0.18] }),
    ...eyes(0.048, 0.27, 0.135, 0.013),
    part(cone(0.04, 0.08, 4), c.body, { pos: [0, 0.15, -0.15], rot: [-1.1, 0, 0] }),
    part(box(0.05, 0.02, 0.06), c.accent, { pos: [0.04, 0.01, 0.03] }), part(box(0.05, 0.02, 0.06), c.accent, { pos: [-0.04, 0.01, 0.03] }),
  ]);
}

export function dog(c: { body: number; accent: number }): THREE.BufferGeometry {
  return merge([
    part(box(0.2, 0.17, 0.38), c.body, { pos: [0, 0.25, 0] }),
    part(box(0.17, 0.16, 0.17), c.body, { pos: [0, 0.38, 0.23] }),
    part(box(0.1, 0.07, 0.1), c.accent, { pos: [0, 0.34, 0.33] }),
    part(sphere(0.025, 5, 3), 0x3d3a35, { pos: [0, 0.37, 0.39] }),
    ...eyes(0.05, 0.41, 0.318, 0.017),
    part(box(0.05, 0.1, 0.03), 0x9a6a3e, { pos: [0.08, 0.44, 0.2], rot: [0, 0, 0.3] }), part(box(0.05, 0.1, 0.03), 0x9a6a3e, { pos: [-0.08, 0.44, 0.2], rot: [0, 0, -0.3] }),
    part(box(0.04, 0.04, 0.16), c.body, { pos: [0, 0.34, -0.24], rot: [0.7, 0, 0] }),
    ...[[0.07, 0.12], [-0.07, 0.12], [0.07, -0.12], [-0.07, -0.12]].map(([x, z]) => part(box(0.05, 0.17, 0.05), c.body, { pos: [x!, 0.08, z!] })),
    part(box(0.18, 0.03, 0.03), 0xe25c4a, { pos: [0, 0.32, 0.17] }), // collar
  ]);
}

export function bee(): THREE.BufferGeometry {
  return merge([part(sphere(0.03, 5, 3), 0xf6c445, { scale: [1, 0.9, 1.4] }), part(box(0.065, 0.012, 0.012), 0x3d3a35, {}), part(sphere(0.02, 4, 2), 0xffffff, { pos: [0, 0.03, 0], scale: [1.6, 0.4, 1] })], { ao: false });
}

/** Little product signs that bob over a home when something is ready to collect. */
export function productSign(product: string): THREE.BufferGeometry {
  const disc = part(cyl(0.2, 0.2, 0.04, 14), 0xffffff, { rot: [Math.PI / 2, 0, 0] });
  let thing: THREE.BufferGeometry;
  switch (product) {
    case 'egg': case 'duckegg': thing = part(sphere(0.09, 8, 6), product === 'egg' ? 0xf0dcc0 : 0xe8f0f4, { pos: [0, 0, 0.05], scale: [1, 1.3, 1] }); break;
    case 'milk': case 'goatmilk': thing = merge([part(cyl(0.07, 0.08, 0.2, 8), 0xdfe8ee, { pos: [0, -0.02, 0.06] }), part(cyl(0.04, 0.07, 0.06, 8), 0xdfe8ee, { pos: [0, 0.11, 0.06] })]); break;
    case 'wool': thing = part(ico(0.1, 1), 0xf2ede4, { pos: [0, 0, 0.06] }); break;
    case 'honey': thing = merge([part(cyl(0.08, 0.08, 0.15, 8), 0xf2b33a, { pos: [0, -0.02, 0.06] }), part(cyl(0.09, 0.09, 0.04, 8), 0xd2a26e, { pos: [0, 0.07, 0.06] })]); break;
    default: thing = part(sphere(0.09, 7, 5), ITEMS[product]?.color ?? 0xffd34d, { pos: [0, 0, 0.05], scale: [1.2, 1, 0.8] });
  }
  return merge([disc, thing], { ao: false });
}
