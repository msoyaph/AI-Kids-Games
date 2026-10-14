/**
 * The town as data (the style frame's subset of the real save): which tiles are road, how each lot's
 * ground is finished, and the things standing on the land. The renderer only reads this.
 *
 * Pure: no DOM, no Date, no Math.random.
 */
import { H, idx, inMap, W } from './map';

/** How a tile's ground is finished (drawn by the ground shader). */
export const FINISH = { wild: 0, lawn: 1, paving: 2, gravel: 3, sand: 4 } as const;
export type Finish = (typeof FINISH)[keyof typeof FINISH];

/** Turns: 0 faces south (+z), 1 west, 2 north, 3 east (models face south before turning). */
export type Rot = 0 | 1 | 2 | 3;

export interface Thing {
  def: string;
  x: number;
  z: number;
  rot: Rot;
  /** Which paint or look (an index into the model's colours). */
  look?: number;
}

export interface City {
  seed: number;
  /** Seconds of play. */
  t: number;
  /** 1 where a tile is road. */
  roads: Uint8Array;
  finish: Uint8Array;
  things: Thing[];
  /** Goes up whenever roads, lots or things change (the renderer rebuilds then). */
  version?: number;
}

export function emptyCity(seed: number): City {
  return { seed, t: 0, roads: new Uint8Array(W * H), finish: new Uint8Array(W * H), things: [] };
}

export const isRoad = (c: City, x: number, z: number) => inMap(x, z) && c.roads[idx(x, z)] === 1;

/** Lay a straight road from (x0, z0) to (x1, z1) (one of them must match). */
export function layRoad(c: City, x0: number, z0: number, x1: number, z1: number) {
  const dx = Math.sign(x1 - x0), dz = Math.sign(z1 - z0);
  for (let x = x0, z = z0; ; x += dx, z += dz) {
    if (inMap(x, z)) c.roads[idx(x, z)] = 1;
    if (x === x1 && z === z1) break;
  }
}

export function paint(c: City, x0: number, z0: number, x1: number, z1: number, f: Finish) {
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (inMap(x, z) && !isRoad(c, x, z)) c.finish[idx(x, z)] = f;
}

/** Which neighbours of a road tile are road: bits N 1, E 2, S 4, W 8. */
export function roadLinks(c: City, x: number, z: number): number {
  return (isRoad(c, x, z - 1) ? 1 : 0) | (isRoad(c, x + 1, z) ? 2 : 0) | (isRoad(c, x, z + 1) ? 4 : 0) | (isRoad(c, x - 1, z) ? 8 : 0);
}

/** How many roads meet at a tile (3 or 4 is a junction). */
export const linkCount = (links: number) => (links & 1) + ((links >> 1) & 1) + ((links >> 2) & 1) + ((links >> 3) & 1);
