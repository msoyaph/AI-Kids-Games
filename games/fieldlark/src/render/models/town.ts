/**
 * The Little Lark (the farm's river boat), the order board, and little people for visitors.
 * Built in code. The boat and people are centred and face +z; the board uses the tile middle.
 */
import type * as THREE from 'three';
import { bevelBox, box, cone, cyl, merge, PAT, part, sphere } from '../geo';

export function boat(): THREE.BufferGeometry {
  const HULL = 0xe25c4a, TRIM = 0xfff2d6, WOOD = 0xb07a4f;
  return merge([
    part(bevelBox(0.9, 0.28, 2.2, 0.06), HULL, { pos: [0, 0.05, 0], pattern: PAT.planks }),
    part(cone(0.45, 0.6, 4), HULL, { pos: [0, 0.05, 1.38], rot: [Math.PI / 2, Math.PI / 4, 0], scale: [1, 1, 0.45] }),
    part(box(0.92, 0.06, 2.22), TRIM, { pos: [0, 0.2, 0] }),
    part(box(0.8, 0.04, 2.0), WOOD, { pos: [0, 0.18, 0], pattern: PAT.planks }),
    part(bevelBox(0.6, 0.45, 0.6, 0.03), TRIM, { pos: [0, 0.42, -0.55], pattern: PAT.boards }), // little cabin
    part(box(0.7, 0.06, 0.7), 0x3f78a8, { pos: [0, 0.68, -0.55] }),
    part(box(0.2, 0.18, 0.04), 0x9fd6f0, { pos: [0, 0.48, -0.24] }),
    part(cyl(0.05, 0.05, 0.5, 6), 0x5a5f6b, { pos: [0.18, 0.95, -0.7] }), // chimney
    part(box(0.3, 0.25, 0.3), WOOD, { pos: [-0.15, 0.32, 0.45] }), // crates
    part(box(0.26, 0.22, 0.26), 0xd9a84a, { pos: [0.18, 0.3, 0.7] }),
    part(cyl(0.28, 0.28, 0.12, 10), 0x8a5a3b, { pos: [0.52, 0.12, -0.2], rot: [0, 0, Math.PI / 2] }), // paddle wheel
  ]);
}

export function orderBoard(): THREE.BufferGeometry {
  const WOOD = 0x8a5a3b;
  return merge([
    part(box(0.08, 1.2, 0.08), WOOD, { pos: [-0.36, 0.6, 0] }),
    part(box(0.08, 1.2, 0.08), WOOD, { pos: [0.36, 0.6, 0] }),
    part(bevelBox(0.82, 0.62, 0.06, 0.015), 0xd2a26e, { pos: [0, 0.9, 0.02], pattern: PAT.planks }),
    part(box(0.9, 0.1, 0.16), 0xe25c4a, { pos: [0, 1.26, 0.02], rot: [0.2, 0, 0] }),
    part(box(0.2, 0.24, 0.02), 0xfffdf7, { pos: [-0.22, 0.95, 0.06], rot: [0, 0, 0.06] }),
    part(box(0.2, 0.2, 0.02), 0xfff2a0, { pos: [0.05, 0.88, 0.06], rot: [0, 0, -0.05] }),
    part(box(0.18, 0.22, 0.02), 0xdff0ff, { pos: [0.26, 0.96, 0.06], rot: [0, 0, 0.04] }),
  ]);
}

/** A friendly little person in a coat, with hair and a face colour. */
export function person(c: { coat: number; hair: number; skin: number }): THREE.BufferGeometry {
  return merge([
    part(cyl(0.12, 0.17, 0.42, 8), c.coat, { pos: [0, 0.33, 0] }),
    part(sphere(0.13, 8, 6), c.skin, { pos: [0, 0.66, 0] }),
    part(sphere(0.135, 8, 6), c.hair, { pos: [0, 0.71, -0.02], scale: [1, 0.7, 1] }),
    part(box(0.07, 0.12, 0.07), 0x4a4038, { pos: [0.06, 0.06, 0] }),
    part(box(0.07, 0.12, 0.07), 0x4a4038, { pos: [-0.06, 0.06, 0] }),
    part(sphere(0.02, 4, 3), 0x3d3a35, { pos: [0.045, 0.68, 0.12] }),
    part(sphere(0.02, 4, 3), 0x3d3a35, { pos: [-0.045, 0.68, 0.12] }),
  ]);
}
