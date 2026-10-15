/**
 * Roads on the grid: laying them, which neighbours join up, and junctions. A road tile's links
 * (N 1, E 2, S 4, W 8) decide how the ground shader draws it and where cars may turn.
 *
 * Pure: no DOM, no Date, no Math.random.
 */
import { idx, inMap } from './map';
import { FINISH, ROAD, touch, type Finish, type Town } from './state';

export const isRoad = (town: Pick<Town, 'roads'>, x: number, z: number) => inMap(x, z) && town.roads[idx(x, z)]! > 0;

/** Lay a straight road from (x0, z0) to (x1, z1) (one of them must match). */
export function layRoad(town: Town, x0: number, z0: number, x1: number, z1: number) {
  const dx = Math.sign(x1 - x0), dz = Math.sign(z1 - z0);
  for (let x = x0, z = z0; ; x += dx, z += dz) {
    if (inMap(x, z)) { town.roads[idx(x, z)] = ROAD.street; town.zones[idx(x, z)] = 0; }
    if (x === x1 && z === z1) break;
  }
  touch(town);
}

/** Finish a rectangle of lots (paths and plazas). */
export function paint(town: Town, x0: number, z0: number, x1: number, z1: number, f: Finish) {
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (inMap(x, z) && !isRoad(town, x, z)) town.finish[idx(x, z)] = f;
  touch(town);
}

/** Which neighbours of a road tile are road: bits N 1, E 2, S 4, W 8. */
export function roadLinks(town: Pick<Town, 'roads'>, x: number, z: number): number {
  return (isRoad(town, x, z - 1) ? 1 : 0) | (isRoad(town, x + 1, z) ? 2 : 0) | (isRoad(town, x, z + 1) ? 4 : 0) | (isRoad(town, x - 1, z) ? 8 : 0);
}

/** How many roads meet at a tile (3 or 4 is a junction). */
export const linkCount = (links: number) => (links & 1) + ((links >> 1) & 1) + ((links >> 2) & 1) + ((links >> 3) & 1);

export { FINISH };
