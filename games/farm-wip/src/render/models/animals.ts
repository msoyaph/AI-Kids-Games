/**
 * Animal homes and the animals themselves, built in code. Homes use the building convention (origin
 * at the north-west corner of the footprint, facing south); animals are centred on their feet and
 * face +z. Each home has a fenced yard at the front where its animals wander.
 */
import type * as THREE from 'three';
import { box, cone, cyl, ico, merge, part, prism, sphere } from '../geo';
import { ITEMS } from '../../data/items';

const WOOD = 0xb07a4f, WOOD_DARK = 0x8a5a3b, CREAM = 0xfff2d6, RED = 0xd9534a, RED_DARK = 0xb8433b, STRAW = 0xe8cf7a, BLUE = 0x6fa8d6;

/** A low fence around the edge of a w × d footprint, with a gap at the front middle. */
function fence(w: number, d: number, z0 = 0): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  const post = (x: number, z: number) => parts.push(part(box(0.07, 0.36, 0.07), WOOD_DARK, { pos: [x, 0.18, z] }));
  const rail = (x0: number, z0_: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0_), cx = (x0 + x1) / 2, cz = (z0_ + z1) / 2, rot = Math.atan2(z1 - z0_, x1 - x0);
    for (const y of [0.14, 0.28]) parts.push(part(box(len, 0.04, 0.035), WOOD, { pos: [cx, y, cz], rot: [0, -rot, 0] }));
  };
  const e = 0.06;
  for (const [x, z] of [[e, z0 + e], [w - e, z0 + e], [w - e, d - e], [e, d - e]] as const) post(x, z);
  rail(e, z0 + e, e, d - e);
  rail(w - e, z0 + e, w - e, d - e);
  rail(e, d - e, w / 2 - 0.3, d - e);
  rail(w / 2 + 0.3, d - e, w - e, d - e);
  post(w / 2 - 0.3, d - e); post(w / 2 + 0.3, d - e);
  return parts;
}

function shedRoof(cx: number, cz: number, w: number, d: number, y: number, color: number): THREE.BufferGeometry[] {
  const pitch = 0.55, half = d / 2 + 0.08, len = half / Math.cos(pitch), rise = Math.tan(pitch) * (d / 2);
  return [
    part(box(w + 0.14, 0.06, len), color, { pos: [cx, y + rise / 2, cz - half / 2], rot: [-pitch, 0, 0] }),
    part(box(w + 0.14, 0.06, len), color, { pos: [cx, y + rise / 2, cz + half / 2], rot: [pitch, 0, 0] }),
    part(prism(w, d, rise), 0xfff2d6, { pos: [cx, y, cz] }),
  ];
}

export function coop(): THREE.BufferGeometry {
  return merge([
    part(box(1.9, 0.02, 1.9), STRAW, { pos: [1, 0.01, 1] }),
    ...fence(2, 2),
    part(box(1.0, 0.7, 0.75), RED, { pos: [1, 0.55, 0.5] }),
    part(box(0.12, 0.25, 0.75), RED, { pos: [0.5, 0.2, 0.5] }), part(box(0.12, 0.25, 0.75), RED, { pos: [1.5, 0.2, 0.5] }),
    ...shedRoof(1, 0.5, 1.0, 0.75, 0.9, RED_DARK),
    part(box(0.26, 0.3, 0.04), WOOD_DARK, { pos: [1, 0.5, 0.88] }),
    part(box(0.26, 0.04, 0.6), WOOD, { pos: [1, 0.15, 1.15], rot: [-0.45, 0, 0] }),
    part(box(0.2, 0.2, 0.04), CREAM, { pos: [0.7, 0.68, 0.88] }),
  ]);
}

export function cowBarn(): THREE.BufferGeometry {
  return merge([
    part(box(2.9, 0.02, 2.9), 0xa9c97a, { pos: [1.5, 0.01, 1.5] }),
    ...fence(3, 3, 1.2),
    part(box(2.4, 1.2, 1.3), RED, { pos: [1.5, 0.6, 0.75] }),
    ...shedRoof(1.5, 0.75, 2.4, 1.3, 1.2, 0x8a3a34),
    part(box(0.9, 0.85, 0.04), CREAM, { pos: [1.5, 0.43, 1.41] }),
    part(box(0.75, 0.04, 0.05), RED_DARK, { pos: [1.5, 0.43, 1.44], rot: [0, 0, 0.8] }),
    part(box(0.75, 0.04, 0.05), RED_DARK, { pos: [1.5, 0.43, 1.44], rot: [0, 0, -0.8] }),
    part(box(0.3, 0.3, 0.04), CREAM, { pos: [1.5, 1.05, 1.41] }),
    part(box(0.5, 0.2, 0.3), WOOD, { pos: [2.4, 0.1, 2.2] }), // water trough
    part(box(0.42, 0.04, 0.22), BLUE, { pos: [2.4, 0.2, 2.2] }),
    part(cyl(0.22, 0.22, 0.3, 8), STRAW, { pos: [0.55, 0.15, 2.3], rot: [0, 0, Math.PI / 2] }),
  ]);
}

export function sheepShed(): THREE.BufferGeometry {
  return merge([
    part(box(2.9, 0.02, 1.9), 0xb3d18a, { pos: [1.5, 0.01, 1] }),
    ...fence(3, 2, 0.7),
    part(box(2.2, 0.75, 0.75), WOOD, { pos: [1.5, 0.38, 0.4] }),
    part(box(2.4, 0.08, 1.0), 0x8f8a80, { pos: [1.5, 0.82, 0.45], rot: [0.25, 0, 0] }),
    part(box(0.5, 0.55, 0.04), WOOD_DARK, { pos: [1.5, 0.28, 0.79] }),
    part(cyl(0.2, 0.2, 0.3, 8), STRAW, { pos: [2.5, 0.15, 1.5], rot: [0, 0, Math.PI / 2] }),
  ]);
}

export function goatPen(): THREE.BufferGeometry {
  return merge([
    part(box(1.9, 0.02, 1.9), 0xc2c98a, { pos: [1, 0.01, 1] }),
    ...fence(2, 2),
    part(box(0.8, 0.55, 0.6), WOOD, { pos: [0.55, 0.28, 0.42] }),
    ...shedRoof(0.55, 0.42, 0.8, 0.6, 0.55, 0x7a8f5a),
    part(ico(0.32, 0), 0x9a948a, { pos: [1.45, 0.18, 0.6], scale: [1.2, 0.6, 1] }), // a rock to climb
    part(box(0.36, 0.06, 0.6), WOOD, { pos: [1.35, 0.35, 1.25], rot: [0, 0.3, 0.3] }),
  ]);
}

export function duckHouse(): THREE.BufferGeometry {
  return merge([
    part(box(1.9, 0.02, 1.9), 0xb3d18a, { pos: [1, 0.01, 1] }),
    ...[[0.55, 0.3], [1.15, 0.3], [0.55, 0.85], [1.15, 0.85]].map(([x, z]) => part(cyl(0.04, 0.04, 0.35, 5), WOOD_DARK, { pos: [x!, 0.18, z!] })),
    part(box(0.8, 0.5, 0.7), BLUE, { pos: [0.85, 0.6, 0.58] }),
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
    part(box(0.7, 0.42, 0.62), 0xd2a26e, { pos: [0.5, 0.21, 0.45] }),
    ...shedRoof(0.5, 0.45, 0.7, 0.62, 0.42, 0xe25c4a),
    part(cyl(0.14, 0.14, 0.04, 10), 0x5a3d2a, { pos: [0.5, 0.18, 0.77], rot: [Math.PI / 2, 0, 0] }),
    part(box(0.26, 0.09, 0.03), CREAM, { pos: [0.5, 0.36, 0.77] }),
    part(cyl(0.1, 0.1, 0.05, 10), 0x6fa8d6, { pos: [0.85, 0.03, 0.85] }),
  ]);
}

// --- animals (centred on their feet, facing +z) ---

export function chicken(c: { body: number; accent: number }): THREE.BufferGeometry {
  return merge([
    part(sphere(0.11, 7, 5), c.body, { pos: [0, 0.14, 0], scale: [0.9, 0.85, 1.15] }),
    part(sphere(0.065, 6, 4), c.body, { pos: [0, 0.25, 0.08] }),
    part(cone(0.025, 0.05, 4), 0xf4a542, { pos: [0, 0.25, 0.15], rot: [Math.PI / 2, 0, 0] }),
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
    part(cone(0.03, 0.08, 4), 0xf6f1ea, { pos: [0.08, 0.64, 0.38] }), part(cone(0.03, 0.08, 4), 0xf6f1ea, { pos: [-0.08, 0.64, 0.38] }),
    ...[[0.12, 0.2], [-0.12, 0.2], [0.12, -0.2], [-0.12, -0.2]].map(([x, z]) => part(box(0.07, 0.26, 0.07), c.body, { pos: [x!, 0.13, z!] })),
  ]);
}

export function sheep(c: { body: number; accent: number }): THREE.BufferGeometry {
  const parts = [];
  for (const [x, y, z] of [[0, 0.32, 0], [0.1, 0.36, 0.12], [-0.1, 0.36, -0.1], [0.1, 0.34, -0.14], [-0.1, 0.33, 0.1]] as const) parts.push(part(ico(0.16, 0), c.body, { pos: [x, y, z] }));
  parts.push(part(box(0.14, 0.15, 0.16), c.accent, { pos: [0, 0.38, 0.28] }));
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
    part(cone(0.03, 0.07, 4), c.body, { pos: [0, 0.4, -0.22], rot: [-0.8, 0, 0] }),
    ...[[0.08, 0.14], [-0.08, 0.14], [0.08, -0.14], [-0.08, -0.14]].map(([x, z]) => part(box(0.05, 0.22, 0.05), c.accent, { pos: [x!, 0.11, z!] })),
  ]);
}

export function duck(c: { body: number; accent: number }): THREE.BufferGeometry {
  return merge([
    part(sphere(0.11, 7, 5), c.body, { pos: [0, 0.12, 0], scale: [0.9, 0.8, 1.25] }),
    part(sphere(0.07, 6, 4), c.body, { pos: [0, 0.25, 0.1] }),
    part(box(0.06, 0.025, 0.08), c.accent, { pos: [0, 0.24, 0.18] }),
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
    part(box(0.05, 0.1, 0.03), 0x9a6a3e, { pos: [0.08, 0.44, 0.2], rot: [0, 0, 0.3] }), part(box(0.05, 0.1, 0.03), 0x9a6a3e, { pos: [-0.08, 0.44, 0.2], rot: [0, 0, -0.3] }),
    part(box(0.04, 0.04, 0.16), c.body, { pos: [0, 0.34, -0.24], rot: [0.7, 0, 0] }),
    ...[[0.07, 0.12], [-0.07, 0.12], [0.07, -0.12], [-0.07, -0.12]].map(([x, z]) => part(box(0.05, 0.17, 0.05), c.body, { pos: [x!, 0.08, z!] })),
    part(box(0.18, 0.03, 0.03), 0xe25c4a, { pos: [0, 0.32, 0.17] }), // collar
  ]);
}

export function bee(): THREE.BufferGeometry {
  return merge([part(sphere(0.03, 5, 3), 0xf6c445, { scale: [1, 0.9, 1.4] }), part(box(0.065, 0.012, 0.012), 0x3d3a35, {}), part(sphere(0.02, 4, 2), 0xffffff, { pos: [0, 0.03, 0], scale: [1.6, 0.4, 1] })]);
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
  return merge([disc, thing]);
}
