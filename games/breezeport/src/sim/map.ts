/**
 * Breezeport's land: an 80 × 80 grid of 1 × 1 tiles beside the bay. The coast curves along the
 * north, with a sandy beach between the sea and the coast road. The town's land is cut into named
 * areas that open through the story (Old Harbor from the start); the two-tile rim round the edge is
 * countryside, never built on.
 *
 * Pure: no DOM, no Date, no Math.random.
 */

/** Tiles across (x, west → east) and deep (z, north → south). */
export const W = 80;
export const H = 80;
/** The countryside rim round the town (not buildable). */
export const RIM = 2;

/** The water's surface, just below the land (0). */
export const WATER_Y = -0.12;
/** How deep the beach is, from the water's edge to the grass (tiles). */
export const BEACH = 2.2;

export type Ground = 'sea' | 'beach' | 'land';

/** The water's edge for any x (a smooth curve; z of the edge). The bay is north of it. */
export function seaEdge(x: number): number {
  return 2.6 + Math.sin(x * 0.21) * 0.45 + Math.sin(x * 0.07 + 1.3) * 0.8;
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

/** The height a tap meets at a tile: the land, or the water's surface. */
export const topY = (x: number, z: number) => (groundAt(x, z) === 'sea' ? WATER_Y : 0);
/** The highest top anywhere (for tap picking). */
export const MAX_TOP = 0;

export type AreaId = 'harbor' | 'maple' | 'greenway' | 'boardwalk' | 'hilltop' | 'meadows';

export interface Area {
  id: AreaId;
  name: string;
  /** Tile rectangle, inclusive. */
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** One line about it, for the land card. */
  blurb: string;
}

/** The town's areas, in the order the story opens them. */
export const AREAS: readonly Area[] = [
  { id: 'harbor', name: 'Old Harbor', x0: 26, z0: 2, x1: 53, z1: 31, blurb: 'The old heart of town, by the harbour and the lighthouse.' },
  { id: 'maple', name: 'Maple Row', x0: 2, z0: 2, x1: 25, z1: 41, blurb: 'Quiet green streets for new families.' },
  { id: 'greenway', name: 'Greenway', x0: 26, z0: 32, x1: 53, z1: 53, blurb: 'Room for a big park, a glasshouse and bike paths.' },
  { id: 'boardwalk', name: 'Seaside Boardwalk', x0: 54, z0: 2, x1: 77, z1: 35, blurb: 'The sunny shore: a boardwalk, a pier and the aquarium.' },
  { id: 'hilltop', name: 'Hilltop', x0: 54, z0: 36, x1: 77, z1: 77, blurb: 'Up by the hills, where the tram climbs to the observatory.' },
  { id: 'meadows', name: 'Far Meadows', x0: 2, z0: 42, x1: 53, z1: 77, blurb: 'Wide meadows for a town that keeps on growing.' },
];

export const AREA: Record<AreaId, Area> = Object.fromEntries(AREAS.map(a => [a.id, a])) as Record<AreaId, Area>;

/** Which area a tile belongs to (null on the rim). */
export function areaAt(x: number, z: number): Area | null {
  for (const a of AREAS) if (x >= a.x0 && x <= a.x1 && z >= a.z0 && z <= a.z1) return a;
  return null;
}

/** Can anything be built on this tile at all (land, inside an area)? Locked areas are checked separately. */
export const buildable = (x: number, z: number) => inMap(x, z) && groundAt(x, z) === 'land' && areaAt(x, z) !== null;
