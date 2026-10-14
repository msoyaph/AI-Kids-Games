/**
 * The workshops, built in code: each a small house in its own colours with a sign of what it makes
 * (the windmill has sails). Building convention: origin at the north-west corner, facing south.
 */
import type * as THREE from 'three';
import type { MachineDef } from '../../data/production';
import { bevelBox, box, cone, cyl, ico, merge, PAT, part, sphere } from '../geo';
import { barrel, crate, roof, sack } from './buildings';

const WOOD = 0xb07a4f, WOOD_DARK = 0x8a5a3b, STONE = 0xb9b2a6, GLASS = 0x9fd6f0;

const TRIM = 0xfffaf0;

function house(def: MachineDef, wallH = 1.0): THREE.BufferGeometry[] {
  const cx = def.w / 2, cz = def.d / 2, bw = def.w - 0.5, bd = def.d - 0.6;
  const f = cz - 0.05 + bd / 2;
  const win = (x: number) => [
    part(bevelBox(0.38, 0.36, 0.05, 0.012), TRIM, { pos: [x, 0.66, f + 0.015] }),
    part(box(0.3, 0.28, 0.05), GLASS, { pos: [x, 0.66, f + 0.025] }),
    part(box(0.03, 0.28, 0.06), TRIM, { pos: [x, 0.66, f + 0.03] }),
    part(bevelBox(0.42, 0.08, 0.12, 0.015), WOOD, { pos: [x, 0.45, f + 0.07], pattern: PAT.planks }),
    ...[-0.12, 0, 0.12].map((dx, i) => part(ico(0.04, 0), [0xff7a8a, 0xffd34d, 0xffffff][i]!, { pos: [x + dx, 0.51, f + 0.09] })),
  ];
  return [
    part(bevelBox(def.w - 0.2, 0.12, def.d - 0.2, 0.03), STONE, { pos: [cx, 0.06, cz], pattern: PAT.stone }),
    part(box(bw, wallH, bd), def.color.wall, { pos: [cx, 0.1 + wallH / 2, cz - 0.05], pattern: PAT.planks }),
    ...[-1, 1].flatMap(sx => [-1, 1].map(sz => part(box(0.09, wallH, 0.09), TRIM, { pos: [cx + sx * bw / 2, 0.1 + wallH / 2, cz - 0.05 + sz * bd / 2] }))),
    ...roof(cx, cz - 0.05, bw, bd, 0.1 + wallH, def.color.roof),
    part(bevelBox(0.46, 0.68, 0.05, 0.012), TRIM, { pos: [cx, 0.44, f + 0.012] }),
    part(box(0.36, 0.6, 0.05), WOOD_DARK, { pos: [cx, 0.4, f + 0.02], pattern: PAT.boards }),
    part(sphere(0.025, 5, 4), 0xf2c94c, { pos: [cx + 0.12, 0.4, f + 0.05] }),
    ...win(cx - bw / 2 + 0.3),
    ...win(cx + bw / 2 - 0.3),
  ];
}

/** A round sign over the door showing what the workshop makes. */
function sign(x: number, y: number, z: number, thing: THREE.BufferGeometry[]): THREE.BufferGeometry[] {
  return [part(cyl(0.2, 0.2, 0.04, 12), 0xfffdf7, { pos: [x, y, z], rot: [Math.PI / 2, 0, 0] }), ...thing];
}

export function windmill(def: MachineDef): THREE.BufferGeometry {
  const cx = def.w / 2, cz = def.d / 2;
  const parts = [
    part(bevelBox(def.w - 0.2, 0.12, def.d - 0.2, 0.03), STONE, { pos: [cx, 0.06, cz], pattern: PAT.stone }),
    part(cyl(0.55, 0.75, 2.0, 10), def.color.wall, { pos: [cx, 1.1, cz], pattern: PAT.boards }),
    part(cone(0.7, 0.72, 10), def.color.roof, { pos: [cx, 2.46, cz], pattern: PAT.shingles }),
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
  // sacks of flour by the door
  const out: THREE.BufferGeometry[] = [];
  sack(out, cx - 0.62, cz + 0.72, 0.3, 0xf2eadb);
  sack(out, cx - 0.4, cz + 0.85, -0.4, 0xf2eadb);
  return merge([...parts, ...out]);
}

export function workshop(def: MachineDef): THREE.BufferGeometry {
  if (def.id === 'mill') return windmill(def);
  const cx = def.w / 2, front = def.d / 2 - 0.05 + (def.d - 0.6) / 2 + 0.04;
  const parts = house(def);
  const sy = 1.2;
  // every workshop has a little working corner: a barrel and a crate by the side wall
  barrel(parts, def.w - 0.22, def.d - 0.32, 0.13, 0.3);
  crate(parts, 0.26, def.d - 0.3, 0.26, 0.2, 0, def.id !== 'loom');
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
