/**
 * Decorations, built in code. One-tile pieces are centred on their tile (origin at the tile's
 * middle); bigger ones use the building convention (north-west corner). Fences and hedges join up
 * with their neighbours: `mask` says which sides have another piece (1 north, 2 east, 4 south, 8 west).
 */
import type * as THREE from 'three';
import { bevelBox, box, cone, cyl, ico, merge, PAT, part, sphere, torus } from '../geo';

const WOOD = 0xb07a4f, WOOD_DARK = 0x8a5a3b, WHITE = 0xfaf6ee, STONE = 0xb9b2a6, GREEN = 0x5fa85a, METAL = 0x5a5f6b;

export function fencePiece(def: string, mask: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  if (def === 'hedge') {
    parts.push(part(ico(0.3, 1), GREEN, { pos: [0, 0.26, 0], scale: [1, 0.95, 1], round: true }));
    parts.push(part(ico(0.16, 1), 0x7cbc66, { pos: [0.06, 0.44, 0.08], round: true }));
    if (mask & 1) parts.push(part(ico(0.26, 1), GREEN, { pos: [0, 0.24, -0.33], round: true }));
    if (mask & 2) parts.push(part(ico(0.26, 1), GREEN, { pos: [0.33, 0.24, 0], round: true }));
    if (mask & 4) parts.push(part(ico(0.26, 1), GREEN, { pos: [0, 0.24, 0.33], round: true }));
    if (mask & 8) parts.push(part(ico(0.26, 1), GREEN, { pos: [-0.33, 0.24, 0], round: true }));
    return merge(parts);
  }
  const picket = def === 'picket';
  const color = picket ? WHITE : WOOD, postC = picket ? WHITE : WOOD_DARK;
  const postH = picket ? 0.46 : 0.42;
  parts.push(part(bevelBox(0.1, postH, 0.1, 0.015), postC, { pos: [0, postH / 2, 0], pattern: picket ? 0 : PAT.boards }));
  parts.push(part(cone(0.075, 0.07, 4), postC, { pos: [0, postH + 0.035, 0], rot: [0, Math.PI / 4, 0] }));
  const arm = (dx: number, dz: number) => {
    const along = dx !== 0;
    for (const y of [0.14, 0.31]) parts.push(part(box(along ? 0.5 : 0.04, 0.05, along ? 0.04 : 0.5), color, { pos: [dx * 0.25, y, dz * 0.25], pattern: picket ? 0 : PAT.planks }));
    if (picket) for (let i = 1; i <= 2; i++) {
      const px = dx * i * 0.17, pz = dz * i * 0.17;
      parts.push(part(box(along ? 0.065 : 0.03, 0.36, along ? 0.03 : 0.065), WHITE, { pos: [px, 0.2, pz] }));
      parts.push(part(cone(0.045, 0.06, 4), WHITE, { pos: [px, 0.41, pz], rot: [0, Math.PI / 4, 0], scale: along ? [1, 1, 0.5] : [0.5, 1, 1] }));
    }
  };
  if (mask & 1) arm(0, -1);
  if (mask & 2) arm(1, 0);
  if (mask & 4) arm(0, 1);
  if (mask & 8) arm(-1, 0);
  if (!mask) { arm(1, 0); arm(-1, 0); }
  return merge(parts);
}

const FLOWER_COLORS: Record<string, number[]> = {
  flowers_sun: [0xffd34d, 0xffb020, 0xfff2a0], flowers_rose: [0xff9fb8, 0xf06a8a, 0xffd0dc], flowers_sky: [0x8fc8ff, 0x6a9cf0, 0xb59cff], flowers_mix: [0xffd34d, 0xff7a6b, 0xb59cff, 0xffffff, 0x8fc8ff],
};

export function flowerBed(def: string): THREE.BufferGeometry {
  const cols = FLOWER_COLORS[def] ?? FLOWER_COLORS.flowers_mix!;
  const parts = [part(box(0.86, 0.06, 0.86), 0x7d5a3d, { pos: [0, 0.03, 0] })];
  for (let i = 0; i < 9; i++) {
    const x = ((i % 3) - 1) * 0.26 + (i % 2 ? 0.04 : -0.04), z = (Math.floor(i / 3) - 1) * 0.26;
    parts.push(part(cyl(0.012, 0.012, 0.16, 4), 0x5aa64a, { pos: [x, 0.13, z] }));
    parts.push(part(ico(0.065, 0), cols[i % cols.length]!, { pos: [x, 0.23, z] }));
    parts.push(part(sphere(0.06, 5, 3), 0x6fbf5a, { pos: [x + 0.05, 0.08, z + 0.04], scale: [1.2, 0.5, 1] }));
  }
  return merge(parts);
}

const MODELS: Record<string, () => THREE.BufferGeometry> = {
  bench: () => merge([
    ...[-0.08, 0.02, 0.12].map(z => part(bevelBox(0.82, 0.04, 0.09, 0.012), WOOD, { pos: [0, 0.29, z], pattern: PAT.planks })),
    ...[0.4, 0.5].map(y => part(bevelBox(0.82, 0.07, 0.04, 0.012), WOOD, { pos: [0, y, -0.13], rot: [-0.12, 0, 0], pattern: PAT.planks })),
    ...[-0.34, 0.34].flatMap(x => [part(box(0.05, 0.3, 0.05), METAL, { pos: [x, 0.15, 0.1] }), part(box(0.05, 0.55, 0.05), METAL, { pos: [x, 0.27, -0.12] }), part(box(0.05, 0.04, 0.3), METAL, { pos: [x, 0.36, -0.01] })]),
  ]),
  lamp: () => merge([
    part(cyl(0.05, 0.08, 1.2, 6), METAL, { pos: [0, 0.6, 0] }),
    part(cyl(0.12, 0.08, 0.2, 6), 0xffe9a8, { pos: [0, 1.3, 0] }),
    part(cone(0.16, 0.12, 6), METAL, { pos: [0, 1.46, 0] }),
  ]),
  scarecrow: () => merge([
    part(cyl(0.035, 0.035, 1.1, 5), WOOD_DARK, { pos: [0, 0.55, 0] }),
    part(box(0.7, 0.05, 0.05), WOOD_DARK, { pos: [0, 0.85, 0] }),
    part(box(0.36, 0.42, 0.18), 0x6fa8d6, { pos: [0, 0.75, 0] }),
    part(sphere(0.14, 7, 5), 0xf2d38c, { pos: [0, 1.08, 0] }),
    part(cone(0.24, 0.2, 8), 0xd9a84a, { pos: [0, 1.25, 0] }),
    part(cyl(0.26, 0.26, 0.03, 10), 0xd9a84a, { pos: [0, 1.16, 0] }),
    part(box(0.12, 0.08, 0.06), 0xe25c4a, { pos: [-0.3, 0.83, 0] }), part(box(0.12, 0.08, 0.06), 0xffd34d, { pos: [0.3, 0.83, 0] }),
  ]),
  haybale: () => merge([
    part(cyl(0.24, 0.24, 0.5, 12), 0xe8cf7a, { pos: [-0.12, 0.24, 0], rot: [0, 0, Math.PI / 2], pattern: PAT.straw }),
    ...[-0.25, 0.01].map(x => part(torus(0.243, 0.012, 3, 14), 0xc9a24a, { pos: [x, 0.24, 0], rot: [0, Math.PI / 2, 0] })),
    part(bevelBox(0.36, 0.3, 0.5, 0.04), 0xdcbf6a, { pos: [0.24, 0.15, 0.12], rot: [0, 0.4, 0], pattern: PAT.straw }),
    part(ico(0.06, 0), 0xe8cf7a, { pos: [0.1, 0.02, 0.3], scale: [1.6, 0.4, 1] }),
  ]),
  wheelbarrow: () => merge([
    part(bevelBox(0.38, 0.2, 0.52, 0.04), 0x4f8fb8, { pos: [0, 0.3, 0], rot: [0.15, 0, 0] }),
    part(box(0.3, 0.02, 0.44), 0x6b4a2e, { pos: [0, 0.4, 0.01], rot: [0.15, 0, 0] }),
    part(cyl(0.12, 0.12, 0.06, 12), 0x3d3a35, { pos: [0, 0.12, 0.32], rot: [0, 0, Math.PI / 2] }),
    part(cyl(0.05, 0.05, 0.07, 8), METAL, { pos: [0, 0.12, 0.32], rot: [0, 0, Math.PI / 2] }),
    ...[-0.14, 0.14].flatMap(x => [part(box(0.04, 0.04, 0.5), WOOD, { pos: [x, 0.26, -0.3], rot: [-0.15, 0, 0] }), part(box(0.035, 0.2, 0.035), WOOD_DARK, { pos: [x, 0.1, -0.15] })]),
    part(ico(0.09, 0), 0xf08a24, { pos: [0.06, 0.44, 0.06] }), part(ico(0.08, 0), 0xe2453a, { pos: [-0.07, 0.44, -0.04] }), part(ico(0.08, 0), 0x8fd06a, { pos: [0.02, 0.45, -0.12] }),
  ]),
  birdbath: () => merge([part(cyl(0.08, 0.12, 0.45, 8), STONE, { pos: [0, 0.22, 0] }), part(cyl(0.28, 0.18, 0.1, 10), STONE, { pos: [0, 0.5, 0] }), part(cyl(0.24, 0.24, 0.02, 10), 0x8fd0f0, { pos: [0, 0.55, 0] }), part(sphere(0.05, 5, 3), 0x7a5a3a, { pos: [0.18, 0.6, 0] })]),
  barrel: () => merge([part(cyl(0.22, 0.2, 0.4, 12), WOOD, { pos: [0, 0.2, 0], pattern: PAT.boards }), part(torus(0.215, 0.015, 4, 12), METAL, { pos: [0, 0.32, 0], rot: [Math.PI / 2, 0, 0] }), part(torus(0.205, 0.015, 4, 12), METAL, { pos: [0, 0.08, 0], rot: [Math.PI / 2, 0, 0] }), part(ico(0.2, 0), GREEN, { pos: [0, 0.48, 0] }), part(ico(0.06, 0), 0xff9fb8, { pos: [0.1, 0.62, 0.05] }), part(ico(0.06, 0), 0xffd34d, { pos: [-0.08, 0.6, -0.06] })]),
  well: () => merge([part(cyl(0.36, 0.38, 0.45, 10), STONE, { pos: [0, 0.22, 0] }), part(cyl(0.3, 0.3, 0.02, 10), 0x4a8fc0, { pos: [0, 0.42, 0] }), part(box(0.06, 0.8, 0.06), WOOD_DARK, { pos: [0.32, 0.8, 0] }), part(box(0.06, 0.8, 0.06), WOOD_DARK, { pos: [-0.32, 0.8, 0] }), part(cone(0.5, 0.35, 4), 0xe25c4a, { pos: [0, 1.32, 0], rot: [0, Math.PI / 4, 0] })]),
  gazebo: () => merge([
    part(cyl(0.95, 0.95, 0.1, 8), STONE, { pos: [1, 0.05, 1] }),
    ...Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2; return part(cyl(0.05, 0.05, 1.3, 6), WHITE, { pos: [1 + Math.cos(a) * 0.8, 0.75, 1 + Math.sin(a) * 0.8] }); }),
    part(cone(1.15, 0.6, 8), 0x7cc4a0, { pos: [1, 1.7, 1] }),
    part(sphere(0.08, 6, 4), 0xffd34d, { pos: [1, 2.05, 1] }),
  ]),
  bunting: () => merge([part(cyl(0.035, 0.035, 1.6, 5), WOOD_DARK, { pos: [-0.35, 0.8, 0] }), part(cyl(0.035, 0.035, 1.6, 5), WOOD_DARK, { pos: [0.35, 0.8, 0] }), ...[0xe25c4a, 0xffd34d, 0x6fa8d6, 0x6fbf73, 0xff9fb8].map((c, i) => part(cone(0.07, 0.16, 3), c, { pos: [-0.28 + i * 0.14, 1.42 - Math.sin((i / 4) * Math.PI) * 0.08, 0], rot: [Math.PI, 0, 0] }))]),
  ribbonarch: () => merge([part(torus(0.45, 0.06, 6, 14, Math.PI), 0xffffff, { pos: [0, 0.9, 0] }), part(cyl(0.05, 0.05, 0.9, 5), WHITE, { pos: [0.45, 0.45, 0] }), part(cyl(0.05, 0.05, 0.9, 5), WHITE, { pos: [-0.45, 0.45, 0] }), part(box(0.25, 0.25, 0.04), 0x4f8fd6, { pos: [0, 1.35, 0.05], rot: [0, 0, Math.PI / 4] }), part(cyl(0.08, 0.08, 0.05, 8), 0xffd34d, { pos: [0, 1.35, 0.08], rot: [Math.PI / 2, 0, 0] })]),
  prizestand: () => merge([part(box(0.6, 0.5, 0.4), WOOD, { pos: [0, 0.25, 0] }), part(box(0.66, 0.05, 0.46), WOOD_DARK, { pos: [0, 0.52, 0] }), part(sphere(0.18, 8, 6), 0xf08a24, { pos: [0, 0.7, 0], scale: [1.3, 0.9, 1.1] }), part(box(0.18, 0.18, 0.03), 0x4f8fd6, { pos: [0.2, 0.3, 0.21], rot: [0, 0, Math.PI / 4] })]),
  // the ribbon wall: a little board on two posts with a gold, a silver and a blue rosette
  ribbonwall: () => merge([
    part(cyl(0.04, 0.04, 1.1, 5), WOOD_DARK, { pos: [-0.38, 0.55, 0] }), part(cyl(0.04, 0.04, 1.1, 5), WOOD_DARK, { pos: [0.38, 0.55, 0] }),
    part(bevelBox(0.86, 0.5, 0.06), WOOD, { pos: [0, 0.82, 0], pattern: PAT.boards }),
    ...[[-0.24, 0xffc93d], [0, 0xd9dde4], [0.24, 0x4f8fd6]].flatMap(([x, c]) => [
      part(cyl(0.085, 0.085, 0.03, 10), c as number, { pos: [x as number, 0.88, 0.05], rot: [Math.PI / 2, 0, 0] }),
      part(cyl(0.045, 0.045, 0.035, 8), 0xfffaf0, { pos: [x as number, 0.88, 0.06], rot: [Math.PI / 2, 0, 0] }),
      part(box(0.05, 0.16, 0.012), c as number, { pos: [(x as number) - 0.03, 0.74, 0.05], rot: [0, 0, 0.2] }),
      part(box(0.05, 0.16, 0.012), c as number, { pos: [(x as number) + 0.03, 0.74, 0.05], rot: [0, 0, -0.2] }),
    ]),
  ]),
  rosearch: () => merge([part(torus(0.42, 0.05, 5, 12, Math.PI), GREEN, { pos: [0, 0.95, 0] }), part(cyl(0.05, 0.05, 0.95, 5), GREEN, { pos: [0.42, 0.47, 0] }), part(cyl(0.05, 0.05, 0.95, 5), GREEN, { pos: [-0.42, 0.47, 0] }), ...Array.from({ length: 8 }, (_, i) => { const a = (i / 7) * Math.PI; return part(ico(0.07, 0), i % 2 ? 0xff7a9a : 0xffffff, { pos: [Math.cos(a) * 0.42, 0.95 + Math.sin(a) * 0.42, 0.05] }); })]),
  topiary: () => merge([part(box(0.36, 0.3, 0.36), 0xc2563a, { pos: [0, 0.15, 0] }), part(sphere(0.24, 8, 6), GREEN, { pos: [0, 0.55, 0], scale: [1, 0.9, 1.3] }), part(sphere(0.13, 7, 5), GREEN, { pos: [0, 0.8, 0.22] }), part(cone(0.07, 0.25, 5), GREEN, { pos: [0, 0.65, -0.35], rot: [-1.0, 0, 0] })]),
  sundial: () => merge([part(cyl(0.12, 0.16, 0.55, 8), STONE, { pos: [0, 0.27, 0] }), part(cyl(0.24, 0.24, 0.05, 12), 0xe8e0cc, { pos: [0, 0.57, 0] }), part(box(0.02, 0.14, 0.16), METAL, { pos: [0, 0.65, 0], rot: [0, 0, 0] })]),
  windpump: () => merge([...[[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].map(([x, z]) => part(box(0.05, 2.2, 0.05), METAL, { pos: [x! * 0.6, 1.1, z! * 0.6], rot: [z! * 0.1, 0, -x! * 0.1] })), ...Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return part(box(0.08, 0.4, 0.02), 0xe25c4a, { pos: [Math.sin(a) * 0.25, 2.3 + Math.cos(a) * 0.25, 0.1], rot: [0, 0, -a] }); }), part(box(0.05, 0.25, 0.5), METAL, { pos: [0, 2.3, -0.3] })]),
  cart: () => merge([part(box(1.4, 0.3, 0.7), WOOD, { pos: [1, 0.45, 0.5] }), part(torus(0.25, 0.04, 5, 12), WOOD_DARK, { pos: [0.6, 0.25, 0.88] }), part(torus(0.25, 0.04, 5, 12), WOOD_DARK, { pos: [1.4, 0.25, 0.88] }), part(box(0.05, 0.05, 0.9), WOOD_DARK, { pos: [1.9, 0.35, 0.5], rot: [0, Math.PI / 2, 0.2] }), part(ico(0.18, 0), 0xf08a24, { pos: [0.8, 0.72, 0.5] }), part(ico(0.15, 0), 0xe8cf7a, { pos: [1.2, 0.7, 0.45] })]),
  milkcans: () => merge([part(cyl(0.11, 0.13, 0.36, 8), 0xdfe8ee, { pos: [-0.12, 0.18, 0] }), part(cyl(0.06, 0.09, 0.1, 8), 0xdfe8ee, { pos: [-0.12, 0.41, 0] }), part(cyl(0.11, 0.13, 0.36, 8), 0xdfe8ee, { pos: [0.16, 0.18, 0.1] }), part(cyl(0.06, 0.09, 0.1, 8), 0xdfe8ee, { pos: [0.16, 0.41, 0.1] })]),
  snowfolk: () => merge([part(sphere(0.28, 8, 6), WHITE, { pos: [0, 0.28, 0] }), part(sphere(0.2, 8, 6), WHITE, { pos: [0, 0.68, 0] }), part(cone(0.04, 0.16, 5), 0xf08a24, { pos: [0, 0.7, 0.22], rot: [Math.PI / 2, 0, 0] }), part(cyl(0.18, 0.18, 0.05, 8), 0xe25c4a, { pos: [0, 0.82, 0] }), part(cyl(0.12, 0.13, 0.18, 8), 0xe25c4a, { pos: [0, 0.94, 0] })]),
  lanterns: () => merge([part(cyl(0.035, 0.035, 1.5, 5), WOOD_DARK, { pos: [-0.38, 0.75, 0] }), part(cyl(0.035, 0.035, 1.5, 5), WOOD_DARK, { pos: [0.38, 0.75, 0] }), ...[0xffd34d, 0xff9f6b, 0xffe9a8].map((c, i) => part(sphere(0.08, 6, 4), c, { pos: [-0.22 + i * 0.22, 1.32 - (i === 1 ? 0.08 : 0), 0], scale: [1, 1.2, 1] }))]),
  pinetree: () => merge([part(cyl(0.05, 0.07, 0.3, 5), WOOD_DARK, { pos: [0, 0.15, 0] }), part(cone(0.36, 0.55, 7), 0x3f8f5a, { pos: [0, 0.55, 0] }), part(cone(0.26, 0.45, 7), 0x3f8f5a, { pos: [0, 0.88, 0] }), part(ico(0.06, 0), 0xffd34d, { pos: [0, 1.15, 0] })]),
};

/** The model for a decoration (one-tile pieces centred; the gazebo and the cart from their corner). */
export function decorModel(def: string): THREE.BufferGeometry {
  if (def.startsWith('flowers_')) return flowerBed(def);
  if (def === 'fence' || def === 'picket' || def === 'hedge') return fencePiece(def, 10);
  return (MODELS[def] ?? (() => merge([part(box(0.5, 0.5, 0.5), 0xdddddd, { pos: [0, 0.25, 0] })])))();
}

/** Bigger decorations built from their corner (like buildings). */
export const CORNER_DECOR = new Set(['gazebo', 'cart']);
