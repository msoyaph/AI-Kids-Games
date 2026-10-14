/**
 * Buildings and clutter, built in code. Each model's origin is the north-west corner of its
 * footprint at ground level (so it sits on its tiles like the grid says), facing south (+z).
 */
import type * as THREE from 'three';
import { box, cone, cyl, dodec, ico, merge, part, prism } from '../geo';

const WOOD = 0xb07a4f, WOOD_DARK = 0x8a5a3b, PLANK = 0xd2a26e, CREAM = 0xfff2d6, ROOF = 0xe25c4a, ROOF_DARK = 0xc2463a;
const STONE = 0xb9b2a6, GLASS = 0x9fd6f0, GREEN = 0x6fbf73;

/**
 * A pitched roof over a w × d box centred at (cx, cz), eaves at height y, ridge along x: two thin
 * coloured slopes with a little overhang, over cream gable ends.
 */
export function roof(cx: number, cz: number, w: number, d: number, y: number, color: number, overhang = 0.14): THREE.BufferGeometry[] {
  const pitch = 0.62;
  const rise = Math.tan(pitch) * (d / 2);
  const half = d / 2 + overhang, len = half / Math.cos(pitch);
  const drop = Math.tan(pitch) * overhang;
  return [
    part(prism(w, d, rise), CREAM, { pos: [cx, y, cz] }),
    part(box(w + overhang * 2, 0.08, len), color, { pos: [cx, y - drop + (Math.sin(pitch) * len) / 2 + 0.04, cz - (Math.cos(pitch) * len) / 2], rot: [-pitch, 0, 0] }),
    part(box(w + overhang * 2, 0.08, len), color, { pos: [cx, y - drop + (Math.sin(pitch) * len) / 2 + 0.04, cz + (Math.cos(pitch) * len) / 2], rot: [pitch, 0, 0] }),
  ];
}

export function cottage(): THREE.BufferGeometry {
  const cx = 1.5, cz = 1.5;
  return merge([
    part(box(2.7, 0.12, 2.5), STONE, { pos: [cx, 0.06, cz] }),
    part(box(2.4, 1.15, 2.1), CREAM, { pos: [cx, 0.69, cz] }),
    ...roof(cx, cz, 2.4, 2.1, 1.26, ROOF),
    part(box(2.75, 0.08, 0.12), ROOF_DARK, { pos: [cx, 1.26 + Math.tan(0.62) * 1.05 + 0.1, cz] }),
    part(box(0.5, 0.78, 0.06), WOOD_DARK, { pos: [cx, 0.51, cz + 1.06] }), // door
    part(box(0.45, 0.4, 0.06), GLASS, { pos: [cx - 0.8, 0.82, cz + 1.06] }),
    part(box(0.45, 0.4, 0.06), GLASS, { pos: [cx + 0.8, 0.82, cz + 1.06] }),
    part(box(0.55, 0.06, 0.08), WOOD, { pos: [cx - 0.8, 0.6, cz + 1.1] }),
    part(box(0.55, 0.06, 0.08), WOOD, { pos: [cx + 0.8, 0.6, cz + 1.1] }),
    part(box(0.35, 0.8, 0.35), STONE, { pos: [cx + 0.7, 1.85, cz - 0.4] }), // chimney
    part(ico(0.2, 0), GREEN, { pos: [cx - 1.05, 0.2, cz + 1.3] }),
    part(ico(0.16, 0), GREEN, { pos: [cx + 1.1, 0.18, cz + 1.3] }),
  ]);
}

export function dock(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // the landing on the farm's two tiles, then the pier out over the river (east, +x)
  parts.push(part(box(1.8, 0.1, 2.8), PLANK, { pos: [1, 0.05, 1.5] }));
  for (let i = 0; i < 6; i++) parts.push(part(box(0.06, 0.02, 2.7), WOOD_DARK, { pos: [0.25 + i * 0.3, 0.11, 1.5] }));
  parts.push(part(box(2.2, 0.1, 1.0), PLANK, { pos: [3.0, 0.02, 1.5] }));
  for (const [x, z] of [[2.1, 1.05], [2.1, 1.95], [3.95, 1.05], [3.95, 1.95]] as const) parts.push(part(cyl(0.07, 0.07, 0.75, 6), WOOD_DARK, { pos: [x, -0.2, z] }));
  // a little sign post and a crate
  parts.push(part(cyl(0.04, 0.04, 0.7, 5), WOOD_DARK, { pos: [0.3, 0.35, 0.35] }));
  parts.push(part(box(0.5, 0.28, 0.05), CREAM, { pos: [0.3, 0.65, 0.38] }));
  parts.push(part(box(0.4, 0.35, 0.4), WOOD, { pos: [1.4, 0.27, 2.5] }));
  return merge(parts);
}

export function compostBin(): THREE.BufferGeometry {
  const parts = [part(box(0.8, 0.06, 0.8), WOOD_DARK, { pos: [0.5, 0.03, 0.5] })];
  for (const y of [0.15, 0.3, 0.45]) {
    parts.push(part(box(0.8, 0.1, 0.06), WOOD, { pos: [0.5, y, 0.12] }), part(box(0.8, 0.1, 0.06), WOOD, { pos: [0.5, y, 0.88] }));
    parts.push(part(box(0.06, 0.1, 0.8), WOOD, { pos: [0.12, y, 0.5] }), part(box(0.06, 0.1, 0.8), WOOD, { pos: [0.88, y, 0.5] }));
  }
  parts.push(part(box(0.7, 0.08, 0.7), 0x6b4a2e, { pos: [0.5, 0.42, 0.5] }));
  parts.push(part(ico(0.08, 0), 0x8fd06a, { pos: [0.4, 0.5, 0.45] }));
  return merge(parts);
}

export function weeds(): THREE.BufferGeometry {
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9;
    parts.push(part(cone(0.06, 0.32, 4), i % 2 ? 0x5a8f3a : 0x6f9e48, { pos: [0.5 + Math.cos(a) * 0.14, 0.15, 0.5 + Math.sin(a) * 0.14], rot: [Math.sin(a) * 0.4, 0, Math.cos(a) * 0.4] }));
  }
  parts.push(part(ico(0.05, 0), 0xf2e36b, { pos: [0.55, 0.3, 0.5] }));
  return merge(parts);
}

export function stone(): THREE.BufferGeometry {
  return merge([
    part(dodec(0.28), 0x9a948a, { pos: [0.5, 0.15, 0.5], scale: [1.2, 0.75, 1] }),
    part(dodec(0.15), 0xaaa49a, { pos: [0.75, 0.08, 0.65], rot: [0.5, 0.2, 0] }),
  ]);
}

export function oldLog(): THREE.BufferGeometry {
  return merge([
    part(cyl(0.16, 0.16, 0.8, 8), 0x8a5a3b, { pos: [0.5, 0.16, 0.5], rot: [0, 0, Math.PI / 2] }),
    part(cyl(0.12, 0.12, 0.02, 8), 0xd2a26e, { pos: [0.9, 0.16, 0.5], rot: [0, 0, Math.PI / 2] }),
    part(ico(0.06, 0), 0x6f9e48, { pos: [0.4, 0.33, 0.55] }),
  ]);
}

/** A see-through block for things with no model yet (never shipped; used while building). */
export function placeholder(w: number, d: number): THREE.BufferGeometry {
  return merge([part(box(w - 0.1, 0.6, d - 0.1), 0xdddddd, { pos: [w / 2, 0.3, d / 2] }), part(cone(0.3, 0.4, 4), 0xbbbbbb, { pos: [w / 2, 0.8, d / 2] })]);
}
