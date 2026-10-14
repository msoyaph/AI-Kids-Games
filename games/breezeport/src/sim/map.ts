/**
 * The town's land: a grid of 1 × 1 tiles beside the sea. The bay is to the north; the coast curves
 * gently, with a sandy beach between the sea and the first street. Everything else is flat land the
 * player can build on. (The style frame only needs this corner; the full map, with the river mouth,
 * the hill and the districts' land, comes with the map phase.)
 *
 * Pure: no DOM, no Date, no Math.random.
 */

/** Tiles across (x, west → east) and deep (z, north → south). */
export const W = 40;
export const H = 36;

/** The water's surface, just below the land (0). */
export const WATER_Y = -0.12;
/** How deep the beach is, from the water's edge to the grass (tiles). */
export const BEACH = 2.2;

export type Ground = 'sea' | 'beach' | 'land';

/** The water's edge for any x (a smooth curve; z of the edge). The bay is north of it. */
export function seaEdge(x: number): number {
  return 2.4 + Math.sin(x * 0.21) * 0.45 + Math.sin(x * 0.07 + 1.3) * 0.8;
}

/** How far a point is inland from the water's edge (negative out in the bay). */
export const inland = (x: number, z: number) => z - seaEdge(x);

/** What a tile is, judged at its middle. Outside the grid the land carries on and the bay fills the north. */
export function groundAt(x: number, z: number): Ground {
  const d = inland(x + 0.5, z + 0.5);
  if (d < 0) return 'sea';
  if (d < BEACH + 0.5) return 'beach';
  return 'land';
}

export const inMap = (x: number, z: number) => x >= 0 && z >= 0 && x < W && z < H;
export const idx = (x: number, z: number) => z * W + x;
