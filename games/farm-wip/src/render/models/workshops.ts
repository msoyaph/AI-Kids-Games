/**
 * The workshops, built in code: each a small house in its own colours with a sign of what it makes
 * (the windmill has sails). Building convention: origin at the north-west corner, facing south.
 */
import type * as THREE from 'three';
import type { MachineDef } from '../../data/production';
import { box, cone, cyl, ico, merge, part, sphere } from '../geo';
import { roof } from './buildings';

const WOOD = 0xb07a4f, WOOD_DARK = 0x8a5a3b, STONE = 0xb9b2a6, GLASS = 0x9fd6f0;

function house(def: MachineDef, wallH = 1.0): THREE.BufferGeometry[] {
  const cx = def.w / 2, cz = def.d / 2, bw = def.w - 0.5, bd = def.d - 0.6;
  return [
    part(box(def.w - 0.2, 0.1, def.d - 0.2), STONE, { pos: [cx, 0.05, cz] }),
    part(box(bw, wallH, bd), def.color.wall, { pos: [cx, 0.1 + wallH / 2, cz - 0.05] }),
    ...roof(cx, cz - 0.05, bw, bd, 0.1 + wallH, def.color.roof),
    part(box(0.36, 0.6, 0.05), WOOD_DARK, { pos: [cx, 0.4, cz - 0.05 + bd / 2 + 0.01] }),
    part(box(0.3, 0.28, 0.05), GLASS, { pos: [cx - bw / 2 + 0.3, 0.65, cz - 0.05 + bd / 2 + 0.01] }),
    part(box(0.3, 0.28, 0.05), GLASS, { pos: [cx + bw / 2 - 0.3, 0.65, cz - 0.05 + bd / 2 + 0.01] }),
  ];
}

/** A round sign over the door showing what the workshop makes. */
function sign(x: number, y: number, z: number, thing: THREE.BufferGeometry[]): THREE.BufferGeometry[] {
  return [part(cyl(0.2, 0.2, 0.04, 12), 0xfffdf7, { pos: [x, y, z], rot: [Math.PI / 2, 0, 0] }), ...thing];
}

export function windmill(def: MachineDef): THREE.BufferGeometry {
  const cx = def.w / 2, cz = def.d / 2;
  const parts = [
    part(box(def.w - 0.2, 0.1, def.d - 0.2), STONE, { pos: [cx, 0.05, cz] }),
    part(cyl(0.55, 0.75, 2.0, 8), def.color.wall, { pos: [cx, 1.1, cz] }),
    part(cone(0.68, 0.7, 8), def.color.roof, { pos: [cx, 2.45, cz] }),
    part(box(0.34, 0.55, 0.05), WOOD_DARK, { pos: [cx, 0.38, cz + 0.72] }),
    part(box(0.22, 0.22, 0.05), GLASS, { pos: [cx, 1.45, cz + 0.6] }),
    part(cyl(0.07, 0.07, 0.3, 6), WOOD_DARK, { pos: [cx, 2.0, cz + 0.72], rot: [Math.PI / 2, 0, 0] }),
  ];
  // four sails, set at a jaunty angle
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.3;
    parts.push(part(box(0.05, 1.05, 0.04), WOOD, { pos: [cx + Math.sin(a) * 0.55, 2.0 + Math.cos(a) * 0.55, cz + 0.87], rot: [0, 0, -a] }));
    parts.push(part(box(0.24, 0.85, 0.02), 0xfff6e4, { pos: [cx + Math.sin(a) * 0.62 + Math.cos(a) * 0.13, 2.0 + Math.cos(a) * 0.62 - Math.sin(a) * 0.13, cz + 0.9], rot: [0, 0, -a] }));
  }
  return merge(parts);
}

export function workshop(def: MachineDef): THREE.BufferGeometry {
  if (def.id === 'mill') return windmill(def);
  const cx = def.w / 2, front = def.d / 2 - 0.05 + (def.d - 0.6) / 2 + 0.04;
  const parts = house(def);
  const sy = 1.2;
  switch (def.id) {
    case 'bakery':
      parts.push(part(box(0.3, 0.7, 0.3), 0xc2563a, { pos: [cx + 0.45, 1.75, def.d / 2 - 0.3] }));
      parts.push(...sign(cx, sy, front, [part(sphere(0.12, 8, 5), 0xd9a35a, { pos: [cx, sy, front + 0.06], scale: [1.4, 0.8, 0.6] })]));
      break;
    case 'dairy':
      parts.push(part(cyl(0.12, 0.14, 0.32, 8), 0xdfe8ee, { pos: [cx + 0.75, 0.26, front + 0.25] }), part(cyl(0.12, 0.14, 0.32, 8), 0xdfe8ee, { pos: [cx + 0.45, 0.26, front + 0.3] }));
      parts.push(...sign(cx, sy, front, [part(cyl(0.08, 0.09, 0.2, 8), 0x7cc4f2, { pos: [cx, sy, front + 0.06] })]));
      break;
    case 'loom':
      parts.push(part(ico(0.13, 1), 0xe2443a, { pos: [cx + 0.7, 0.2, front + 0.25] }), part(ico(0.12, 1), 0x6fa8d6, { pos: [cx + 0.45, 0.18, front + 0.32] }));
      parts.push(...sign(cx, sy, front, [part(ico(0.1, 1), 0xb59cff, { pos: [cx, sy, front + 0.06] })]));
      break;
    case 'juicepress':
      parts.push(part(cyl(0.2, 0.2, 0.42, 10), WOOD, { pos: [cx + 0.65, 0.31, front + 0.3] }), part(cyl(0.04, 0.04, 0.4, 6), WOOD_DARK, { pos: [cx + 0.65, 0.65, front + 0.3] }));
      parts.push(...sign(cx, sy, front, [part(cyl(0.07, 0.07, 0.18, 8), 0xffc93d, { pos: [cx, sy, front + 0.06] })]));
      break;
    case 'jamkitchen':
      for (const [i, c] of [0xd92a3a, 0x6b2a6a, 0xc2304a].entries()) parts.push(part(cyl(0.07, 0.07, 0.14, 8), c, { pos: [cx + 0.45 + i * 0.17, 0.17, front + 0.28] }), part(cyl(0.075, 0.075, 0.03, 8), 0xfff2d6, { pos: [cx + 0.45 + i * 0.17, 0.26, front + 0.28] }));
      parts.push(...sign(cx, sy, front, [part(cyl(0.08, 0.08, 0.14, 8), 0xd92a3a, { pos: [cx, sy, front + 0.06] })]));
      break;
    case 'kitchen':
      parts.push(part(box(0.3, 0.8, 0.3), STONE, { pos: [cx - 0.7, 1.8, def.d / 2 - 0.25] }));
      parts.push(...sign(cx, sy, front, [part(cyl(0.12, 0.09, 0.1, 8), 0x8b8fa3, { pos: [cx, sy - 0.02, front + 0.08] }), part(sphere(0.08, 6, 3), 0xe8a04a, { pos: [cx, sy + 0.05, front + 0.08], scale: [1, 0.4, 1] })]));
      break;
  }
  return merge(parts);
}
