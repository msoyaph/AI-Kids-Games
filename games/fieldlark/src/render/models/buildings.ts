/**
 * Buildings and clutter, built in code. Each model's origin is the north-west corner of its
 * footprint at ground level (so it sits on its tiles like the grid says), facing south (+z).
 * Surfaces carry painted patterns (planks, shingles, stone; see geo.ts PAT) and chunky bevelled trim.
 */
import type * as THREE from 'three';
import { bevelBox, box, cone, cyl, dodec, ico, merge, PAT, part, prism, sphere, torus } from '../geo';

export const WOOD = 0xb07a4f, WOOD_DARK = 0x8a5a3b, PLANK = 0xd2a26e, CREAM = 0xfff4dc, TRIM = 0xfffaf0;
const STONE = 0xbab3a6, GLASS = 0xa9dcf2, GREEN = 0x6fae5a, METAL = 0x6a6f7a;
const ROOF = 0xd8643f, ROOF_DARK = 0xb04e32, WALL = 0xf2d9a2, SHUTTER = 0x7fae7a, DOOR = 0x3f7f86;
const FLOWERS = [0xff7a8a, 0xffd34d, 0xffffff, 0xff9fd0, 0xb59cff];

type Parts = THREE.BufferGeometry[];

/**
 * A pitched roof over a w × d box centred at (cx, cz), eaves at height y, ridge along x: two thick
 * shingled slopes with an overhang, a ridge cap, and board gable ends.
 */
export function roof(cx: number, cz: number, w: number, d: number, y: number, color: number, overhang = 0.16, pitch = 0.62): Parts {
  const rise = Math.tan(pitch) * (d / 2);
  const half = d / 2 + overhang, len = half / Math.cos(pitch);
  const drop = Math.tan(pitch) * overhang;
  const t = 0.1;
  const dark = color === ROOF ? ROOF_DARK : color;
  return [
    part(prism(w, d, rise), CREAM, { pos: [cx, y, cz], pattern: PAT.boards }),
    part(box(w + overhang * 2, t, len), color, { pos: [cx, y - drop + (Math.sin(pitch) * len) / 2 + t / 2, cz - (Math.cos(pitch) * len) / 2], rot: [-pitch, 0, 0], pattern: PAT.shingles }),
    part(box(w + overhang * 2, t, len), color, { pos: [cx, y - drop + (Math.sin(pitch) * len) / 2 + t / 2, cz + (Math.cos(pitch) * len) / 2], rot: [pitch, 0, 0], pattern: PAT.shingles }),
    part(cyl(0.07, 0.07, w + overhang * 2 + 0.04, 6), dark, { pos: [cx, y + rise + t * 0.9, cz], rot: [0, 0, Math.PI / 2] }),
    // white bargeboards along the gable edges
    ...[-1, 1].flatMap(sx => [-1, 1].map(sz => part(box(0.05, 0.07, len + 0.02), TRIM, { pos: [cx + sx * (w / 2 + overhang + 0.01), y - drop + (Math.sin(pitch) * len) / 2 + 0.02, cz + sz * (Math.cos(pitch) * len) / 2], rot: [sz * pitch, 0, 0] }))),
  ];
}

/** A framed window with a cross, shutters and a flower box, on a wall facing `face` (+1 south, -1 north) at x. */
function addWindow(parts: Parts, x: number, y: number, z: number, face: 1 | -1, w = 0.42, h = 0.4, flowers = true) {
  const o = face * 0.03;
  parts.push(part(bevelBox(w + 0.1, h + 0.1, 0.06, 0.015), TRIM, { pos: [x, y, z + o] }));
  parts.push(part(box(w, h, 0.04), GLASS, { pos: [x, y, z + o * 1.6] }));
  parts.push(part(box(0.035, h, 0.05), TRIM, { pos: [x, y, z + o * 2] }), part(box(w, 0.035, 0.05), TRIM, { pos: [x, y, z + o * 2] }));
  for (const s of [-1, 1]) parts.push(part(box(0.16, h + 0.06, 0.04), SHUTTER, { pos: [x + s * (w / 2 + 0.14), y, z + o * 1.4], pattern: PAT.boards }));
  if (!flowers) return;
  parts.push(part(bevelBox(w + 0.14, 0.12, 0.16, 0.02), WOOD, { pos: [x, y - h / 2 - 0.11, z + face * 0.1], pattern: PAT.planks }));
  for (let i = 0; i < 5; i++) {
    const fx = x - w / 2 + 0.02 + (i / 4) * (w - 0.04);
    parts.push(part(ico(0.06, 0), GREEN, { pos: [fx, y - h / 2 - 0.03, z + face * 0.12], round: true }));
    parts.push(part(ico(0.045, 0), FLOWERS[(i + Math.round(x * 3)) % FLOWERS.length]!, { pos: [fx + 0.02, y - h / 2 + 0.02, z + face * 0.16] }));
  }
}

/** A stack of split logs (against a wall). */
export function woodpile(parts: Parts, x: number, z: number, along: 'x' | 'z', n = 3) {
  for (let row = 0; row < n; row++) for (let i = 0; i < n + 1 - row; i++) {
    const off = (i - (n - row) / 2) * 0.13;
    const px = along === 'x' ? x + off : x, pz = along === 'z' ? z + off : z;
    const rot: [number, number, number] = along === 'x' ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2];
    parts.push(part(cyl(0.065, 0.065, 0.42, 7), WOOD_DARK, { pos: [px, 0.07 + row * 0.115, pz], rot, pattern: PAT.bark }));
    parts.push(part(cyl(0.05, 0.05, 0.43, 7), PLANK, { pos: [px, 0.07 + row * 0.115, pz], rot }));
  }
}

/** A mailbox on a post. */
export function mailbox(parts: Parts, x: number, z: number) {
  parts.push(part(box(0.06, 0.55, 0.06), WOOD_DARK, { pos: [x, 0.27, z] }));
  parts.push(part(bevelBox(0.16, 0.14, 0.28, 0.03), 0x4f8fd6, { pos: [x, 0.6, z] }));
  parts.push(part(box(0.02, 0.12, 0.05), 0xe25c4a, { pos: [x + 0.09, 0.66, z - 0.06] }));
}

/** A water butt or a barrel. */
export function barrel(parts: Parts, x: number, z: number, r = 0.17, h = 0.36, lid = true) {
  parts.push(part(cyl(r * 0.92, r, h, 10), WOOD, { pos: [x, h / 2, z], pattern: PAT.boards }));
  for (const y of [0.22, 0.78]) parts.push(part(torus(r * 0.97, 0.014, 4, 12), METAL, { pos: [x, h * y, z], rot: [Math.PI / 2, 0, 0] }));
  if (lid) parts.push(part(cyl(r * 0.9, r * 0.9, 0.03, 10), WOOD_DARK, { pos: [x, h + 0.01, z] }));
}

export function cottage(): THREE.BufferGeometry {
  const cx = 1.5, cz = 1.45, w = 2.3, d = 2.0, wallH = 1.12, base = 0.2;
  const f = cz + d / 2; // front wall
  const parts: Parts = [
    part(bevelBox(w + 0.22, base, d + 0.22, 0.04), STONE, { pos: [cx, base / 2, cz], pattern: PAT.stone }),
    part(box(w, wallH, d), WALL, { pos: [cx, base + wallH / 2, cz], pattern: PAT.planks }),
    // white corner boards and a sill band
    ...[-1, 1].flatMap(sx => [-1, 1].map(sz => part(box(0.1, wallH, 0.1), TRIM, { pos: [cx + sx * w / 2, base + wallH / 2, cz + sz * d / 2] }))),
    part(box(w + 0.06, 0.06, d + 0.06), TRIM, { pos: [cx, base + wallH - 0.02, cz] }),
    ...roof(cx, cz, w, d, base + wallH, ROOF),
  ];
  // the door with its frame, a step, a little porch roof on brackets and a lantern
  parts.push(part(bevelBox(0.58, 0.86, 0.06, 0.015), TRIM, { pos: [cx, base + 0.43, f + 0.02] }));
  parts.push(part(box(0.46, 0.78, 0.05), DOOR, { pos: [cx, base + 0.39, f + 0.04], pattern: PAT.boards }));
  parts.push(part(sphere(0.03, 6, 4), 0xf2c94c, { pos: [cx + 0.15, base + 0.4, f + 0.08] }));
  parts.push(part(box(0.18, 0.14, 0.03), GLASS, { pos: [cx, base + 0.62, f + 0.075] }));
  parts.push(part(bevelBox(0.72, 0.08, 0.32, 0.02), STONE, { pos: [cx, 0.08, f + 0.2], pattern: PAT.stone }));
  parts.push(part(box(0.86, 0.06, 0.42), ROOF, { pos: [cx, base + 0.98, f + 0.2], rot: [0.32, 0, 0], pattern: PAT.shingles }));
  for (const s of [-1, 1]) parts.push(part(box(0.05, 0.05, 0.36), WOOD_DARK, { pos: [cx + s * 0.36, base + 0.88, f + 0.15], rot: [-0.6, 0, 0] }));
  parts.push(part(box(0.1, 0.16, 0.1), 0x3d3a35, { pos: [cx + 0.42, base + 0.66, f + 0.08] }));
  parts.push(part(box(0.07, 0.11, 0.07), 0xffe7a0, { pos: [cx + 0.42, base + 0.64, f + 0.1] }));
  // windows: two at the front, one on each side, one at the back
  addWindow(parts, cx - 0.72, base + 0.62, f, 1);
  addWindow(parts, cx + 0.72, base + 0.62, f, 1);
  addWindow(parts, cx + 0.3, base + 0.62, cz - d / 2, -1, 0.4, 0.38, false);
  for (const s of [-1, 1]) {
    const x = cx + s * (w / 2 + 0.03);
    parts.push(part(bevelBox(0.06, 0.48, 0.5, 0.015), TRIM, { pos: [x, base + 0.62, cz] }));
    parts.push(part(box(0.04, 0.38, 0.4), GLASS, { pos: [x + s * 0.01, base + 0.62, cz] }));
    parts.push(part(box(0.05, 0.38, 0.035), TRIM, { pos: [x + s * 0.02, base + 0.62, cz] }));
  }
  // a round window in the front gable
  parts.push(part(cyl(0.15, 0.15, 0.05, 12), TRIM, { pos: [cx, base + wallH + 0.34, f - 0.02], rot: [Math.PI / 2, 0, 0] }));
  parts.push(part(cyl(0.11, 0.11, 0.06, 12), GLASS, { pos: [cx, base + wallH + 0.34, f - 0.01], rot: [Math.PI / 2, 0, 0] }));
  // the stone chimney
  parts.push(part(box(0.34, 1.0, 0.34), STONE, { pos: [cx + 0.68, base + wallH + 0.55, cz - 0.38], pattern: PAT.stone }));
  parts.push(part(bevelBox(0.42, 0.08, 0.42, 0.02), 0x8f877c, { pos: [cx + 0.68, base + wallH + 1.08, cz - 0.38] }));
  // the yard: a mailbox by the path, a water butt, a woodpile against the west wall, pots by the door
  mailbox(parts, 0.22, 2.82);
  barrel(parts, cx + w / 2 + 0.16, f - 0.2);
  woodpile(parts, cx - w / 2 - 0.16, cz + 0.2, 'z');
  for (const [px, c] of [[cx - 0.42, 0xff7a8a], [cx + 0.62, 0xffd34d]] as const) {
    parts.push(part(cyl(0.08, 0.06, 0.12, 8), 0xc2683a, { pos: [px, 0.06, f + 0.16] }));
    parts.push(part(ico(0.09, 0), GREEN, { pos: [px, 0.17, f + 0.16], round: true }));
    parts.push(part(ico(0.04, 0), c, { pos: [px + 0.03, 0.24, f + 0.2] }));
  }
  // low flowering bushes along the front
  for (const [px, pz] of [[0.32, f + 0.12], [2.7, f + 0.1], [0.3, cz - 0.6]] as const) {
    parts.push(part(ico(0.16, 1), 0x5f9e4a, { pos: [px, 0.12, pz], scale: [1, 0.75, 1], round: true }));
    parts.push(part(ico(0.04, 0), 0xffffff, { pos: [px + 0.07, 0.22, pz + 0.08] }), part(ico(0.04, 0), 0xff9fd0, { pos: [px - 0.06, 0.2, pz + 0.1] }));
  }
  return merge(parts);
}

/** Where the cottage's chimney smoke comes out, in its own coordinates. */
export const COTTAGE_CHIMNEY: [number, number, number] = [1.5 + 0.68, 0.2 + 1.12 + 1.14, 1.45 - 0.38];

export function dock(): THREE.BufferGeometry {
  const parts: Parts = [];
  // the landing on the farm's two tiles, then the pier out over the river (east, +x)
  parts.push(part(bevelBox(1.8, 0.12, 2.8, 0.03), PLANK, { pos: [1, 0.06, 1.5], pattern: PAT.planks }));
  parts.push(part(box(2.3, 0.1, 1.0), PLANK, { pos: [3.05, 0.02, 1.5], pattern: PAT.planks }));
  for (const [x, z] of [[2.1, 1.0], [2.1, 2.0], [3.1, 1.0], [3.1, 2.0], [4.1, 1.0], [4.1, 2.0]] as const) {
    parts.push(part(cyl(0.08, 0.09, 0.95, 7), WOOD_DARK, { pos: [x, -0.18, z], pattern: PAT.bark }));
    parts.push(part(cyl(0.06, 0.06, 0.02, 7), PLANK, { pos: [x, 0.3, z] }));
  }
  // a sign post, crates and sacks waiting for the boat, a barrel and a coil of rope
  parts.push(part(cyl(0.04, 0.04, 0.75, 5), WOOD_DARK, { pos: [0.3, 0.37, 0.32] }));
  parts.push(part(bevelBox(0.52, 0.3, 0.05, 0.015), CREAM, { pos: [0.3, 0.68, 0.36] }));
  crate(parts, 1.35, 2.45, 0.38, 0.1);
  crate(parts, 1.62, 2.1, 0.3, -0.2);
  crate(parts, 1.42, 2.4, 0.26, 0.3, 0.38);
  sack(parts, 0.55, 2.55, 0.4);
  sack(parts, 0.78, 2.38, -0.5);
  barrel(parts, 1.55, 0.55);
  parts.push(part(torus(0.12, 0.035, 5, 12), 0xd9c08a, { pos: [2.6, 0.1, 1.85], rot: [Math.PI / 2, 0, 0] }));
  return merge(parts);
}

/** A slatted wooden crate (with fruit on top when `full`). */
export function crate(parts: Parts, x: number, z: number, s: number, rot = 0, y = 0, full = true) {
  parts.push(part(bevelBox(s, s * 0.78, s, 0.02), PLANK, { pos: [x, y + s * 0.39, z], rot: [0, rot, 0], pattern: PAT.planks }));
  for (const k of [-1, 1]) parts.push(part(box(s + 0.01, 0.035, 0.035), WOOD_DARK, { pos: [x + Math.sin(rot) * k * s * 0.48, y + s * 0.74, z + Math.cos(rot) * k * s * 0.48], rot: [0, rot, 0] }));
  if (full) for (let i = 0; i < 4; i++) parts.push(part(sphere(s * 0.16, 6, 4), [0xf08a24, 0xe2453a, 0xffd34d, 0x8fd06a][i]!, { pos: [x + ((i % 2) - 0.5) * s * 0.4, y + s * 0.8, z + (Math.floor(i / 2) - 0.5) * s * 0.4] }));
}

/** A tied cloth sack of grain. */
export function sack(parts: Parts, x: number, z: number, rot = 0, color = 0xe6d3a8) {
  parts.push(part(sphere(0.15, 8, 6), color, { pos: [x, 0.15, z], scale: [1, 1.15, 0.8], rot: [0, rot, 0], round: true }));
  parts.push(part(cyl(0.05, 0.08, 0.08, 6), color, { pos: [x, 0.34, z] }));
  parts.push(part(torus(0.05, 0.012, 4, 8), 0x8a5a3b, { pos: [x, 0.33, z], rot: [Math.PI / 2, 0, 0] }));
}

export function compostBin(): THREE.BufferGeometry {
  const parts: Parts = [part(box(0.84, 0.06, 0.84), WOOD_DARK, { pos: [0.5, 0.03, 0.5] })];
  for (const y of [0.13, 0.27, 0.41]) {
    parts.push(part(box(0.8, 0.11, 0.06), WOOD, { pos: [0.5, y, 0.12], pattern: PAT.planks }), part(box(0.8, 0.11, 0.06), WOOD, { pos: [0.5, y, 0.88], pattern: PAT.planks }));
    parts.push(part(box(0.06, 0.11, 0.8), WOOD, { pos: [0.12, y, 0.5], pattern: PAT.planks }), part(box(0.06, 0.11, 0.8), WOOD, { pos: [0.88, y, 0.5], pattern: PAT.planks }));
  }
  for (const [x, z] of [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]] as const) parts.push(part(box(0.08, 0.52, 0.08), WOOD_DARK, { pos: [x, 0.26, z] }));
  parts.push(part(ico(0.34, 1), 0x6b4a2e, { pos: [0.5, 0.36, 0.5], scale: [1, 0.35, 1] }));
  parts.push(part(ico(0.06, 0), 0x8fd06a, { pos: [0.4, 0.47, 0.45] }), part(ico(0.05, 0), 0xf08a24, { pos: [0.6, 0.46, 0.55] }), part(ico(0.05, 0), 0xe8cf7a, { pos: [0.52, 0.47, 0.38] }));
  // a garden fork leaning on it
  parts.push(part(box(0.025, 0.7, 0.025), PLANK, { pos: [0.95, 0.35, 0.65], rot: [0, 0, -0.25] }));
  return merge(parts);
}

export function weeds(): THREE.BufferGeometry {
  const parts = [];
  for (let i = 0; i < 9; i++) {
    const a = i * 0.9;
    parts.push(part(cone(0.06, 0.3 + (i % 3) * 0.08, 4), i % 2 ? 0x5a8f3a : 0x6f9e48, { pos: [0.5 + Math.cos(a) * 0.15, 0.15, 0.5 + Math.sin(a) * 0.15], rot: [Math.sin(a) * 0.45, 0, Math.cos(a) * 0.45] }));
  }
  parts.push(part(ico(0.13, 0), 0x6f9e48, { pos: [0.5, 0.08, 0.5], scale: [1.4, 0.6, 1.4], round: true }));
  parts.push(part(ico(0.05, 0), 0xf2e36b, { pos: [0.55, 0.33, 0.5] }), part(ico(0.04, 0), 0xffffff, { pos: [0.38, 0.28, 0.6] }));
  return merge(parts);
}

export function stone(): THREE.BufferGeometry {
  return merge([
    part(dodec(0.28), 0x9a948a, { pos: [0.5, 0.15, 0.5], scale: [1.2, 0.75, 1], pattern: PAT.moss }),
    part(dodec(0.15), 0xaaa49a, { pos: [0.78, 0.08, 0.66], rot: [0.5, 0.2, 0], pattern: PAT.moss }),
    part(dodec(0.09), 0xa29c92, { pos: [0.28, 0.05, 0.7], rot: [0.2, 0.9, 0] }),
  ]);
}

export function oldLog(): THREE.BufferGeometry {
  return merge([
    part(cyl(0.17, 0.17, 0.82, 9), 0x8a5a3b, { pos: [0.5, 0.17, 0.5], rot: [0, 0, Math.PI / 2], pattern: PAT.bark }),
    part(cyl(0.14, 0.14, 0.02, 9), 0xd2a26e, { pos: [0.92, 0.17, 0.5], rot: [0, 0, Math.PI / 2] }),
    part(cyl(0.14, 0.14, 0.02, 9), 0xd2a26e, { pos: [0.08, 0.17, 0.5], rot: [0, 0, Math.PI / 2] }),
    part(ico(0.09, 0), 0x5f8f3a, { pos: [0.4, 0.32, 0.55], scale: [1.6, 0.5, 1], round: true }),
    ...mushrooms(0.66, 0.36, 0.42, 2),
  ]);
}

/** A little cluster of toadstools. */
export function mushrooms(x: number, z: number, y = 0, n = 3): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const a = i * 2.2, r = i ? 0.07 : 0, s = 1 - i * 0.22;
    const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    out.push(part(cyl(0.016 * s, 0.022 * s, 0.08 * s, 4), 0xf6ecd8, { pos: [px, y + 0.04 * s, pz] }));
    out.push(part(sphere(0.05 * s, 6, 3), i % 2 ? 0xc9773a : 0xe0463a, { pos: [px, y + 0.085 * s, pz], scale: [1, 0.6, 1] }));
    if (i % 2 === 0) out.push(part(sphere(0.012, 4, 3), 0xffffff, { pos: [px + 0.02 * s, y + 0.11 * s, pz] }));
  }
  return out;
}

/** A see-through block for things with no model yet (never shipped; used while building). */
export function placeholder(w: number, d: number): THREE.BufferGeometry {
  return merge([part(box(w - 0.1, 0.6, d - 0.1), 0xdddddd, { pos: [w / 2, 0.3, d / 2] }), part(cone(0.3, 0.4, 4), 0xbbbbbb, { pos: [w / 2, 0.8, d / 2] })]);
}
