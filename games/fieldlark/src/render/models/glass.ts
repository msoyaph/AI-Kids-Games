/**
 * Greenhouses and irrigation, built in code. A greenhouse is a white frame on a low brick curb with
 * raised beds inside (one per bed in src/sim/greenhouse.ts) and, as a separate see-through mesh, its
 * glass. A channel tile is a dug trench that joins its neighbours, with water in it when it is wet.
 * Origins: greenhouses at the footprint's north-west corner; channel tiles at the tile's middle.
 */
import type * as THREE from 'three';
import { bevelBox, box, merge, PAT, part } from '../geo';

const FRAME = 0xfaf6ee, BRICK = 0xc2704f, WOOD = 0xb07a4f, SOIL = 0x6b4a32, GLASS = 0xdff4ff;

/** Where each bed is in a greenhouse's footprint (tiles; the 3×3 keeps its front-middle as a doorway). */
export function bedTiles(w: number, d: number): [number, number][] {
  const out: [number, number][] = [];
  for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) if (!(w === 3 && d === 3 && x === 1 && z === 2)) out.push([x, z]);
  return out;
}

const ROOF_RISE = 0.55, WALL = 1.05;

export function greenhouseFrame(w: number, d: number): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];
  p.push(part(bevelBox(w - 0.08, 0.22, d - 0.08, 0.03), BRICK, { pos: [w / 2, 0.11, d / 2], pattern: PAT.stone }));
  // corner and middle posts, the eaves and the ridge
  for (let i = 0; i <= w; i++) for (const z of [0.06, d - 0.06]) p.push(part(box(0.06, WALL, 0.06), FRAME, { pos: [Math.min(w - 0.06, Math.max(0.06, i)), 0.22 + WALL / 2, z] }));
  for (let j = 1; j < d; j++) for (const x of [0.06, w - 0.06]) p.push(part(box(0.06, WALL, 0.06), FRAME, { pos: [x, 0.22 + WALL / 2, j] }));
  for (const z of [0.06, d - 0.06]) p.push(part(box(w, 0.06, 0.08), FRAME, { pos: [w / 2, 0.22 + WALL, z] }));
  for (const x of [0.06, w - 0.06]) p.push(part(box(0.08, 0.06, d), FRAME, { pos: [x, 0.22 + WALL, d / 2] }));
  p.push(part(box(w + 0.04, 0.07, 0.09), FRAME, { pos: [w / 2, 0.22 + WALL + ROOF_RISE, d / 2] }));
  // rafters
  const slope = Math.hypot(d / 2, ROOF_RISE), ang = Math.atan2(ROOF_RISE, d / 2);
  for (let i = 0; i <= w; i++) for (const s of [-1, 1]) p.push(part(box(0.05, 0.05, slope), FRAME, { pos: [Math.min(w - 0.03, Math.max(0.03, i)), 0.22 + WALL + ROOF_RISE / 2, d / 2 + (s * d) / 4], rot: [s * ang, 0, 0] }));
  // a door on the front
  p.push(part(box(0.5, 0.8, 0.04), 0x6fae8a, { pos: [w / 2, 0.62, d + 0.005] }));
  // raised beds: a wooden box of dark soil on each bed tile
  for (const [x, z] of bedTiles(w, d)) {
    p.push(part(bevelBox(0.78, 0.28, 0.78, 0.03), WOOD, { pos: [x + 0.5, 0.36, z + 0.5], pattern: PAT.planks }));
    p.push(part(box(0.68, 0.04, 0.68), SOIL, { pos: [x + 0.5, 0.5, z + 0.5] }));
  }
  return merge(p);
}

/** The glass: walls and the two roof slopes (drawn see-through). */
export function greenhouseGlass(w: number, d: number): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];
  for (const z of [0.05, d - 0.05]) p.push(part(box(w - 0.1, WALL, 0.02), GLASS, { pos: [w / 2, 0.22 + WALL / 2, z] }));
  for (const x of [0.05, w - 0.05]) p.push(part(box(0.02, WALL, d - 0.1), GLASS, { pos: [x, 0.22 + WALL / 2, d / 2] }));
  const slope = Math.hypot(d / 2, ROOF_RISE), ang = Math.atan2(ROOF_RISE, d / 2);
  for (const s of [-1, 1]) p.push(part(box(w, 0.02, slope), GLASS, { pos: [w / 2, 0.22 + WALL + ROOF_RISE / 2, d / 2 + (s * d) / 4], rot: [s * ang, 0, 0] }));
  // gable ends
  p.push(part(box(w - 0.1, ROOF_RISE * 0.9, 0.02), GLASS, { pos: [w / 2, 0.22 + WALL + ROOF_RISE * 0.35, 0.05], scale: [1, 1, 1] }));
  p.push(part(box(w - 0.1, ROOF_RISE * 0.9, 0.02), GLASS, { pos: [w / 2, 0.22 + WALL + ROOF_RISE * 0.35, d - 0.05] }));
  return merge(p, { ao: false });
}

/** The bed's soil top, for planting crops on it. */
export const BED_Y = 0.52;

/** A channel tile: a trench of earth with arms towards joined neighbours (mask: 1 north, 2 east, 4 south, 8 west), water inside when wet. */
export function channelPiece(mask: number, wet: boolean): THREE.BufferGeometry {
  const EARTH = 0x7d5a3d, WATER = 0x6aa9c4, MUD = 0x5e4430;
  const p: THREE.BufferGeometry[] = [part(box(0.62, 0.045, 0.62), EARTH, { pos: [0, 0.02, 0] }), part(box(0.42, 0.03, 0.42), wet ? WATER : MUD, { pos: [0, 0.035, 0] })];
  const dirs: [number, number, number][] = [[1, 0, -1], [2, 1, 0], [4, 0, 1], [8, -1, 0]];
  for (const [bit, dx, dz] of dirs) {
    if (!(mask & bit)) continue;
    const along = dx !== 0;
    p.push(part(box(along ? 0.2 : 0.62, 0.045, along ? 0.62 : 0.2), EARTH, { pos: [dx * 0.4, 0.02, dz * 0.4] }));
    p.push(part(box(along ? 0.2 : 0.42, 0.03, along ? 0.42 : 0.2), wet ? WATER : MUD, { pos: [dx * 0.4, 0.035, dz * 0.4] }));
  }
  return merge(p, { ao: false });
}
