/**
 * Larkford's square, downstream of the farm on the river's west bank: the bakery, the school, The
 * Lark's Nest café and Bobbin & Thread round a cobbled square, your farm stand in the middle, a little
 * fountain, lamps and bunting, and a jetty where the Little Lark ties up. Built in code in world
 * coordinates (the square is drawn once; nothing here is a farm tile).
 */
import type * as THREE from 'three';
import { bevelBox, box, cone, cyl, merge, PAT, part, sphere, torus } from '../geo';
import { roof } from './buildings';

const CREAM = 0xfff4dc, WOOD = 0xb07a4f, WOOD_DARK = 0x8a5a3b, STONE = 0xc9c1b2, GLASS = 0x9fd6f0, TRIM = 0xfffaf0, PLANKS = 0xd2a26e;

type Parts = THREE.BufferGeometry[];

/** A shop: walls, a pitched roof (ridge along x), a door and windows on the front (+z or −z), and a sign board. */
function shop(parts: Parts, x: number, z: number, w: number, d: number, h: number, wall: number, roofColor: number, front: 1 | -1, sign: number) {
  parts.push(part(bevelBox(w, h, d, 0.04), wall, { pos: [x, h / 2, z], pattern: PAT.boards }));
  parts.push(...roof(x, z, w, d, h, roofColor));
  const fz = z + front * (d / 2 + 0.02);
  parts.push(part(box(0.42, 0.7, 0.05), WOOD_DARK, { pos: [x, 0.35, fz], pattern: PAT.planks }));
  for (const sx of [-1, 1]) {
    parts.push(part(box(0.42, 0.38, 0.05), GLASS, { pos: [x + sx * w * 0.28, h * 0.55, fz] }));
    parts.push(part(box(0.5, 0.06, 0.08), TRIM, { pos: [x + sx * w * 0.28, h * 0.55 - 0.22, fz + front * 0.02] }));
  }
  parts.push(part(bevelBox(w * 0.5, 0.26, 0.06, 0.02), sign, { pos: [x, h * 0.9, fz + front * 0.03] }));
}

export function squareModel(): THREE.BufferGeometry {
  const p: Parts = [];
  // the cobbled square and a low kerb
  p.push(part(box(10.6, 0.08, 9.6), STONE, { pos: [44.2, 0.04, 64.2], pattern: PAT.stone }));
  p.push(part(box(10.9, 0.05, 9.9), 0xb0a796, { pos: [44.2, 0.02, 64.2] }));
  // the bakery (warm walls, a chimney and a loaf on its sign)
  shop(p, 39.6, 60.4, 3, 2.2, 1.6, 0xf6d7b0, 0xd96a3a, 1, 0xffe6b0);
  p.push(part(cyl(0.14, 0.16, 0.7, 6), 0xa8573a, { pos: [40.6, 2.5, 60.0] }));
  p.push(part(sphere(0.16, 8, 5), 0xd9a45a, { pos: [39.6, 1.47, 61.6], scale: [1.6, 0.8, 0.8] }));
  // the school: bigger, with a bell tower
  shop(p, 44.4, 60.0, 4, 2.4, 1.9, 0xf2e6c8, 0x5f8fc0, 1, 0xdff0ff);
  p.push(part(bevelBox(0.7, 0.9, 0.7, 0.04), CREAM, { pos: [44.4, 3.0, 60.0] }));
  p.push(part(cone(0.55, 0.7, 4), 0x4f7fb0, { pos: [44.4, 3.8, 60.0], rot: [0, Math.PI / 4, 0] }));
  p.push(part(cyl(0.12, 0.16, 0.2, 8), 0xe0b040, { pos: [44.4, 2.95, 60.37] }));
  // The Lark's Nest café: a striped awning and tables outside
  shop(p, 39.4, 64.6, 2.8, 2.2, 1.6, 0xffe3e8, 0xc2465a, 1, 0xfff1c9);
  for (let i = 0; i < 6; i++) p.push(part(box(0.46, 0.04, 0.7), i % 2 ? 0xffffff : 0xe8706a, { pos: [38.25 + i * 0.46, 1.25, 66.0], rot: [0.45, 0, 0] }));
  for (const tx of [38.6, 40.2]) {
    p.push(part(cyl(0.26, 0.26, 0.04, 10), TRIM, { pos: [tx, 0.5, 66.9] }), part(cyl(0.03, 0.03, 0.48, 5), WOOD_DARK, { pos: [tx, 0.25, 66.9] }));
    p.push(part(cyl(0.12, 0.12, 0.04, 8), 0x7fc4d8, { pos: [tx - 0.4, 0.3, 66.9] }), part(cyl(0.12, 0.12, 0.04, 8), 0x7fc4d8, { pos: [tx + 0.4, 0.3, 66.9] }));
  }
  // Bobbin & Thread: a big wooden spool hangs over the door
  shop(p, 39.4, 68.8, 2.8, 2.0, 1.5, 0xe9e0f2, 0x8a6ab8, -1, 0xf2e6ff);
  p.push(part(cyl(0.2, 0.2, 0.32, 10), 0xd98ab8, { pos: [39.4, 1.05, 67.55], rot: [0, 0, Math.PI / 2] }));
  p.push(part(cyl(0.26, 0.26, 0.05, 10), WOOD, { pos: [39.24, 1.05, 67.55], rot: [0, 0, Math.PI / 2] }), part(cyl(0.26, 0.26, 0.05, 10), WOOD, { pos: [39.56, 1.05, 67.55], rot: [0, 0, Math.PI / 2] }));
  // the fountain
  p.push(part(cyl(0.9, 0.95, 0.35, 14), STONE, { pos: [44.6, 0.2, 63.2] }));
  p.push(part(cyl(0.78, 0.78, 0.05, 14), 0x6fb8de, { pos: [44.6, 0.36, 63.2] }));
  p.push(part(cyl(0.12, 0.16, 0.7, 8), STONE, { pos: [44.6, 0.6, 63.2] }), part(cyl(0.35, 0.3, 0.12, 10), STONE, { pos: [44.6, 0.95, 63.2] }));
  p.push(part(sphere(0.12, 8, 5), 0x9fd6f0, { pos: [44.6, 1.08, 63.2] }));
  // lamps and bunting across the square
  for (const [lx, lz] of [[42.2, 62.4], [47.6, 62.4], [42.2, 67.6], [47.6, 67.6]] as const) {
    p.push(part(cyl(0.04, 0.05, 1.5, 6), 0x3d3a35, { pos: [lx, 0.75, lz] }), part(bevelBox(0.18, 0.22, 0.18, 0.03), 0xfff1b0, { pos: [lx, 1.6, lz] }), part(cone(0.16, 0.14, 4), 0x3d3a35, { pos: [lx, 1.78, lz], rot: [0, Math.PI / 4, 0] }));
  }
  const flags = [0xe25c4a, 0xffd34d, 0x6fa8d6, 0x8fd06a, 0xf29ab8];
  for (let i = 0; i < 14; i++) {
    const t = i / 13, x = 42.2 + t * 5.4, sag = Math.sin(t * Math.PI) * 0.25;
    p.push(part(cone(0.09, 0.18, 3), flags[i % flags.length]!, { pos: [x, 1.5 - sag, 62.4], rot: [Math.PI, 0, 0] }));
    p.push(part(cone(0.09, 0.18, 3), flags[(i + 2) % flags.length]!, { pos: [x, 1.5 - sag, 67.6], rot: [Math.PI, 0, 0] }));
  }
  // benches and planters
  for (const [bx, bz] of [[46.6, 61.4], [42.6, 66.6]] as const) {
    p.push(part(box(0.8, 0.06, 0.26), WOOD, { pos: [bx, 0.32, bz], pattern: PAT.planks }), part(box(0.8, 0.24, 0.05), WOOD, { pos: [bx, 0.5, bz - 0.12], pattern: PAT.planks }));
    for (const s of [-0.34, 0.34]) p.push(part(box(0.05, 0.3, 0.24), WOOD_DARK, { pos: [bx + s, 0.15, bz] }));
  }
  for (const [px, pz] of [[42.0, 60.2], [46.8, 60.2], [41.2, 64.4]] as const) {
    p.push(part(cyl(0.26, 0.22, 0.32, 10), 0xc2563a, { pos: [px, 0.16, pz] }));
    for (const c of [0xff7a8a, 0xffd34d, 0xffffff]) p.push(part(sphere(0.08, 6, 4), c, { pos: [px + (c % 3 - 1) * 0.09, 0.4, pz + (c % 5 - 2) * 0.04] }));
    p.push(part(sphere(0.2, 8, 5), 0x5fa85a, { pos: [px, 0.36, pz], scale: [1, 0.6, 1] }));
  }
  // the jetty, out over the river, with its posts
  p.push(part(box(2.4, 0.08, 1.1), PLANKS, { pos: [49.9, 0.02, 64.3], pattern: PAT.planks }));
  for (const [jx, jz] of [[48.9, 63.8], [48.9, 64.8], [50.9, 63.8], [50.9, 64.8]] as const) p.push(part(cyl(0.06, 0.07, 0.8, 6), WOOD_DARK, { pos: [jx, -0.2, jz] }));
  p.push(part(torus(0.14, 0.03, 4, 10), 0xe25c4a, { pos: [50.9, 0.4, 64.8], rot: [0, Math.PI / 2, 0] }));
  return merge(p);
}


/** Your farm stand: a wooden stall with a butter-and-sage striped awning and a sign. */
export function standModel(): THREE.BufferGeometry {
  const p: Parts = [];
  const x = 45.6, z = 65.6;
  p.push(part(bevelBox(1.8, 0.62, 0.7, 0.03), WOOD, { pos: [x, 0.31, z], pattern: PAT.planks }));
  p.push(part(box(1.9, 0.06, 0.8), WOOD_DARK, { pos: [x, 0.64, z] }));
  for (const s of [-0.85, 0.85]) p.push(part(cyl(0.04, 0.04, 1.5, 6), WOOD_DARK, { pos: [x + s, 0.75, z - 0.3] }), part(cyl(0.04, 0.04, 1.2, 6), WOOD_DARK, { pos: [x + s, 0.6, z + 0.3] }));
  for (let i = 0; i < 6; i++) p.push(part(box(0.34, 0.04, 0.95), i % 2 ? 0xffd166 : 0x8fcf7a, { pos: [x - 0.85 + 0.17 + i * 0.34, 1.42, z], rot: [-0.32, 0, 0] }));
  p.push(part(bevelBox(1.0, 0.24, 0.05, 0.02), 0xfff4dc, { pos: [x, 1.15, z - 0.31] }));
  p.push(part(sphere(0.06, 6, 4), 0x6fbf73, { pos: [x - 0.32, 1.15, z - 0.28] }), part(sphere(0.06, 6, 4), 0xe25c4a, { pos: [x + 0.32, 1.15, z - 0.28] }));
  return merge(p);
}

/** One crate of produce on the stand (instanced, tinted per shelf by the item's colour). */
export function standCrate(): THREE.BufferGeometry {
  return merge([
    part(bevelBox(0.26, 0.1, 0.2, 0.015), PLANKS, { pos: [0, 0.05, 0], pattern: PAT.planks }),
    ...[[-0.06, -0.04], [0.06, -0.04], [0, 0.05], [-0.06, 0.05], [0.07, 0.05]].map(([ox, oz]) => part(sphere(0.055, 6, 4), 0xffffff, { pos: [ox!, 0.13, oz!], pattern: 0 })),
  ]);
}

export const STAND_SPOTS: [number, number][] = [[-0.6, -0.15], [-0.2, -0.15], [0.2, -0.15], [0.6, -0.15], [-0.6, 0.15], [-0.2, 0.15], [0.2, 0.15], [0.6, 0.15], [-0.4, 0], [0.4, 0]];
export const STAND_AT = { x: 45.6, z: 65.6, y: 0.67 };
