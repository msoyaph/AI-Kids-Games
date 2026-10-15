// Adapted from games/fieldlark/src/input/pick.ts (the shared engine): a tall box carries the thing it
// belongs to, so a tap on a building picks that building.
/**
 * Tap picking: which tile is under a screen point. The tap's ray is walked through the tile grid
 * (a 2D DDA, cell by cell, nearest first) and stops at the first tile whose top it meets. Sea tiles
 * are met at the water's surface.
 *
 * Generous taps: `pickNear` also looks at the tiles around the hit and takes the nearest one, by
 * distance on screen, that the current action can use (a coin bubble, an empty lot…), within a
 * finger's width. Pure math, unit-tested in tests/unit/pick.test.ts.
 */
import type * as THREE from 'three';
import { H, MAX_TOP, topY, W } from '../sim/map';

export interface TileRef { x: number; z: number }
export interface Hit extends TileRef { t: number }

/** The first tile a ray meets, or null if it misses the land. */
export function pickTile(ray: THREE.Ray, top: (x: number, z: number) => number = topY): Hit | null {
  const o = ray.origin, d = ray.direction;
  if (d.y >= 0) return null;
  // start where the ray comes down through the highest terrace top (nothing above it can be hit)
  let t = o.y > MAX_TOP ? (MAX_TOP - o.y) / d.y : 0;
  // clip to the grid's box in x and z
  const clip = (p: number, dp: number, max: number): [number, number] => {
    if (Math.abs(dp) < 1e-12) return p >= 0 && p <= max ? [-Infinity, Infinity] : [Infinity, -Infinity];
    const a = (0 - p) / dp, b = (max - p) / dp;
    return a < b ? [a, b] : [b, a];
  };
  const [tx0, tx1] = clip(o.x, d.x, W), [tz0, tz1] = clip(o.z, d.z, H);
  const tEnter = Math.max(t, tx0, tz0), tLeave = Math.min(tx1, tz1);
  if (tEnter > tLeave) return null;
  t = tEnter;
  const eps = 1e-9;
  let x = Math.min(W - 1, Math.max(0, Math.floor(o.x + d.x * (t + eps))));
  let z = Math.min(H - 1, Math.max(0, Math.floor(o.z + d.z * (t + eps))));
  const stepX = d.x > 0 ? 1 : -1, stepZ = d.z > 0 ? 1 : -1;
  const dtX = Math.abs(d.x) < 1e-12 ? Infinity : Math.abs(1 / d.x);
  const dtZ = Math.abs(d.z) < 1e-12 ? Infinity : Math.abs(1 / d.z);
  let tMaxX = Math.abs(d.x) < 1e-12 ? Infinity : ((d.x > 0 ? x + 1 : x) - o.x) / d.x;
  let tMaxZ = Math.abs(d.z) < 1e-12 ? Infinity : ((d.z > 0 ? z + 1 : z) - o.z) / d.z;
  for (let guard = 0; guard < W + H + 4; guard++) {
    const tExit = Math.min(tMaxX, tMaxZ, tLeave);
    const yIn = o.y + d.y * t, yOut = o.y + d.y * tExit;
    const topHere = top(x, z);
    // the side of a raised tile, or its top inside this cell
    if (yIn <= topHere + 1e-9) return { x, z, t };
    if (yOut <= topHere) return { x, z, t: (topHere - o.y) / d.y };
    if (tExit >= tLeave) return null;
    t = tExit;
    if (tMaxX < tMaxZ) { x += stepX; tMaxX += dtX; } else { z += stepZ; tMaxZ += dtZ; }
    if (x < 0 || z < 0 || x >= W || z >= H) return null;
  }
  return null;
}

/** Where a ray enters a box (or null): for picking tall things like buildings and trees. */
export function rayBox(ray: THREE.Ray, min: [number, number, number], max: [number, number, number]): number | null {
  const o = [ray.origin.x, ray.origin.y, ray.origin.z], d = [ray.direction.x, ray.direction.y, ray.direction.z];
  let t0 = 0, t1 = Infinity;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]!) < 1e-12) { if (o[i]! < min[i]! || o[i]! > max[i]!) return null; continue; }
    let a = (min[i]! - o[i]!) / d[i]!, b = (max[i]! - o[i]!) / d[i]!;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b);
    if (t0 > t1) return null;
  }
  return t0;
}

/** A tall thing's box for picking, the tile a tap on it means, and the thing's id. */
export interface TallBox { min: [number, number, number]; max: [number, number, number]; tile: TileRef; id?: number }
export interface Picked extends TileRef { id?: number }

/** The nearest of the ground hit and any tall box the ray enters first. */
export function pickWithBoxes(ray: THREE.Ray, boxes: readonly TallBox[]): Picked | null {
  const ground = pickTile(ray);
  let best: Picked | null = ground ? { x: ground.x, z: ground.z } : null, bestT = ground ? ground.t : Infinity;
  for (const b of boxes) {
    const t = rayBox(ray, b.min, b.max);
    if (t !== null && t < bestT - 1e-6) { bestT = t; best = { x: b.tile.x, z: b.tile.z, id: b.id }; }
  }
  return best;
}

/**
 * The best tile for a tap at screen point (sx, sy): the tile under the finger if `wanted` accepts it,
 * otherwise the nearest wanted tile around it whose middle is within `radius` px of the tap.
 * `screenOf` gives a tile's middle on screen.
 */
export function pickNear(
  hit: TileRef | null,
  sx: number,
  sy: number,
  radius: number,
  wanted: (x: number, z: number) => boolean,
  screenOf: (x: number, z: number) => { x: number; y: number },
): TileRef | null {
  if (!hit) return null;
  if (wanted(hit.x, hit.z)) return { x: hit.x, z: hit.z };
  let best: TileRef | null = null, bestD = radius * radius;
  for (let dz = -2; dz <= 2; dz++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = hit.x + dx, z = hit.z + dz;
      if ((dx === 0 && dz === 0) || x < 0 || z < 0 || x >= W || z >= H || !wanted(x, z)) continue;
      const p = screenOf(x, z), d2 = (p.x - sx) ** 2 + (p.y - sy) ** 2;
      if (d2 <= bestD) { bestD = d2; best = { x, z }; }
    }
  }
  return best;
}
