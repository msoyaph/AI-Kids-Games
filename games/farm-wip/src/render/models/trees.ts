/**
 * Orchard trees and berry bushes, built in code, in five looks: bare (winter rest for leafy trees),
 * resting (green, no fruit), blooming, growing (small green fruit) and ripe (fruit in its colour,
 * bigger and easy to spot). Ripe always changes the shape too (more, rounder fruit), not only colour.
 * Origin: the middle of the tile, on the ground.
 */
import type * as THREE from 'three';
import type { TreeDef } from '../../data/orchard';
import { box, cone, cyl, ico, merge, part, sphere } from '../geo';
import { mixHex } from '../palette';

export type TreeLook = 'bare' | 'rest' | 'bloom' | 'grow' | 'ripe';
const TRUNK = 0x8a5a3b;

function canopySpots(def: TreeDef): [number, number, number, number][] {
  // [x, y, z, radius] of the leaf clumps
  switch (def.id) {
    case 'lemon': return [[0, 0.95, 0, 0.36], [0.2, 1.1, 0.1, 0.24], [-0.18, 1.08, -0.08, 0.24]];
    case 'fig': return [[0, 0.85, 0, 0.42], [0.28, 0.8, 0.05, 0.28], [-0.28, 0.82, -0.05, 0.28]];
    case 'walnut': return [[0, 1.25, 0, 0.5], [0.3, 1.1, 0.15, 0.3], [-0.3, 1.15, -0.1, 0.32], [0, 1.55, 0, 0.3]];
    case 'almond': return [[0, 1.0, 0, 0.42], [0.25, 1.15, 0.12, 0.26], [-0.22, 1.1, -0.15, 0.26]];
    case 'apricot': return [[0, 1.0, 0, 0.44], [0.24, 1.18, 0.1, 0.27], [-0.24, 1.12, -0.1, 0.27]];
    default: return [[0, 1.0, 0, 0.45], [0.25, 1.2, 0.1, 0.28], [-0.22, 1.15, -0.12, 0.28]];
  }
}

export function treeModel(def: TreeDef, look: TreeLook): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  if (def.kind === 'bush') return bushModel(def, look);
  const tall = def.id === 'walnut' ? 1.15 : 1;
  parts.push(part(cyl(0.08, 0.12, 0.8 * tall, 6), TRUNK, { pos: [0, 0.4 * tall, 0] }));
  const spots = canopySpots(def);
  if (look === 'bare') {
    // a few bare branches with a dusting of snow
    for (const [i, [x, y, z]] of spots.entries()) parts.push(part(cyl(0.025, 0.04, 0.55, 5), TRUNK, { pos: [x * 0.8, y * 0.85, z * 0.8], rot: [0.3 * (i - 1), 0, 0.5 * (i % 2 ? 1 : -1)] }));
    parts.push(part(ico(0.16, 0), 0xf4f8fa, { pos: [0, 1.0 * tall, 0], scale: [1, 0.4, 1] }));
    return merge(parts);
  }
  const leaf = look === 'bloom' && def.bees ? mixHex(def.color.leaf, def.color.blossom, 0.35) : def.color.leaf;
  for (const [x, y, z, r] of spots) parts.push(part(ico(r, 0), leaf, { pos: [x, y * tall, z], scale: [1, 0.9, 1] }));
  if (look === 'bloom') {
    for (let i = 0; i < 9; i++) {
      const [x, y, z, r] = spots[i % spots.length]!;
      const a = i * 2.39;
      parts.push(part(ico(0.06, 0), def.color.blossom, { pos: [x + Math.cos(a) * r * 0.8, y * tall + Math.sin(i) * r * 0.5, z + Math.sin(a) * r * 0.8] }));
    }
  }
  if (look === 'grow' || look === 'ripe') {
    const n = look === 'ripe' ? 10 : 6, r0 = look === 'ripe' ? 0.075 : 0.045;
    const fruit = look === 'ripe' ? def.color.fruit : mixHex(def.color.leaf, 0xd6e8a0, 0.5);
    for (let i = 0; i < n; i++) {
      const [x, y, z, r] = spots[i % spots.length]!;
      const a = i * 2.39 + 0.4;
      parts.push(part(sphere(r0, 6, 4), fruit, { pos: [x + Math.cos(a) * r * 0.92, y * tall - r * 0.2 + (i % 3) * 0.08, z + Math.sin(a) * r * 0.92], scale: def.id === 'lemon' ? [1, 1.3, 1] : def.id === 'almond' || def.id === 'walnut' ? [1, 0.9, 1.1] : 1 }));
    }
  }
  return merge(parts);
}

function bushModel(def: TreeDef, look: TreeLook): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const bare = look === 'bare';
  const leaf = bare ? 0x9a7a5a : def.color.leaf;
  for (const [x, z, r] of [[0, 0, 0.3], [0.2, 0.1, 0.22], [-0.18, -0.1, 0.22], [0.05, -0.2, 0.2]] as const) {
    parts.push(part(ico(r, 0), leaf, { pos: [x, r * 0.85, z], scale: bare ? [0.7, 0.6, 0.7] : [1, 0.85, 1] }));
  }
  if (def.id === 'hazelnut' && look !== 'bare') for (let i = 0; i < 5; i++) parts.push(part(cone(0.025, 0.14, 4), 0xd9c46a, { pos: [Math.cos(i * 1.3) * 0.25, 0.45, Math.sin(i * 1.3) * 0.25], rot: [Math.PI, 0, 0] }));
  if (look === 'bloom') for (let i = 0; i < 8; i++) parts.push(part(ico(0.045, 0), def.color.blossom, { pos: [Math.cos(i * 2.39) * 0.28, 0.32 + (i % 3) * 0.08, Math.sin(i * 2.39) * 0.28] }));
  if (look === 'grow' || look === 'ripe') {
    const n = look === 'ripe' ? 12 : 7;
    const fruit = look === 'ripe' ? def.color.fruit : mixHex(def.color.leaf, 0xd6e8a0, 0.5);
    for (let i = 0; i < n; i++) parts.push(part(sphere(look === 'ripe' ? 0.05 : 0.035, 6, 4), fruit, { pos: [Math.cos(i * 2.39) * 0.3, 0.2 + (i % 4) * 0.08, Math.sin(i * 2.39) * 0.3] }));
  }
  if (bare) parts.push(part(box(0.5, 0.04, 0.5), 0xf4f8fa, { pos: [0, 0.42, 0] }));
  return merge(parts);
}
