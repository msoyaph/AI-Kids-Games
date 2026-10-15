/**
 * The farm's land: a 56 × 56 tile diorama, the same for every player. Tile (x, z) covers
 * x..x+1 and z..z+1 in world units; +x is east, +z is south (towards the default camera).
 *
 *        x: 0-1 edge | 2..17      | 18..33       | 34..49        | 50..53 | 54..55
 *   z  2..17         | wild woods | Hilltop (2)  | wild woods(1) | river  | far bank
 *   z 18..35         | wild woods | Orchard Hill | Riverside     | river  | far bank
 *   z 36..53         | Duck Pond  | Meadow       | Home plot     | river  | far bank
 *
 * Levels are terrace steps of STEP_Y. Neighbouring tiles never differ by more than one level, so a
 * raised edge can never hide the middle of the tile behind it (tested in map.test.ts and pick.test.ts).
 * Water tiles (the river and the pond) sit at level -1 under a water surface at WATER_Y.
 */

export const W = 56;
export const H = 56;
/** World units per terrace level. */
export const STEP_Y = 0.5;
/** The water surface: taps on water pick the water tile at this height. */
export const WATER_Y = -0.18;

export type AreaId = 'home' | 'meadow' | 'pond' | 'riverside' | 'orchard' | 'hilltop';
export const AREA_IDS: readonly AreaId[] = ['home', 'meadow', 'pond', 'riverside', 'orchard', 'hilltop'];

/** What a tile is: part of a farm area, the wild woods around it, the river, or the far bank. */
export type Zone = AreaId | 'wild' | 'river' | 'bank';

export interface AreaDef {
  id: AreaId;
  name: string;
  /** Inclusive tile bounds. */
  x0: number; z0: number; x1: number; z1: number;
  level: number;
}

export const AREAS: readonly AreaDef[] = [
  { id: 'home', name: 'Home Plot', x0: 34, z0: 36, x1: 49, z1: 53, level: 0 },
  { id: 'meadow', name: 'Sunny Meadow', x0: 18, z0: 36, x1: 33, z1: 53, level: 0 },
  { id: 'pond', name: 'Duck Pond', x0: 2, z0: 36, x1: 17, z1: 53, level: 0 },
  { id: 'riverside', name: 'Riverside', x0: 34, z0: 18, x1: 49, z1: 35, level: 0 },
  { id: 'orchard', name: 'Orchard Hill', x0: 18, z0: 18, x1: 33, z1: 35, level: 1 },
  { id: 'hilltop', name: 'Hilltop', x0: 18, z0: 2, x1: 33, z1: 17, level: 2 },
];

export const areaDef = (id: AreaId) => AREAS.find(a => a.id === id)!;

/** The river runs north to south along these columns; the boat sails south, off the map, to town. */
export const RIVER_X0 = 50;
export const RIVER_X1 = 53;
/**
 * Larkford's square, downstream on the river's west bank, south of the farm (world units; it is not
 * part of the farm grid, so nothing there is a tile). The camera may pan down to it.
 */
export const SQUARE = { x0: 37, z0: 58.4, x1: 49.6, z1: 70 };
export const inSquare = (x: number, z: number, margin = 0) => x >= SQUARE.x0 - margin && x <= SQUARE.x1 + margin && z >= SQUARE.z0 - margin && z <= SQUARE.z1 + margin;
/** How far south the camera may look (down to the square). */
export const VIEW_Z_MAX = SQUARE.z1;

/** The pond: an oval of water in the Duck Pond area. */
export const POND = { cx: 9.5, cz: 44.5, rx: 5.6, rz: 4.4 };
/** A small farmhouse pond on the home plot, below the cottage. */
export const HOME_POND = { cx: 36.4, cz: 43.6, rx: 1.95, rz: 1.55 };

export interface Tile {
  zone: Zone;
  /** Terrace level (-1 for water). */
  level: number;
  water: boolean;
}

function inArea(x: number, z: number, a: AreaDef) {
  return x >= a.x0 && x <= a.x1 && z >= a.z0 && z <= a.z1;
}

/** The wild woods around the farm: decoration only, never unlocked. */
function wildLevel(x: number, z: number): number {
  if (x <= 17 && z <= 17) return 2; // north-west woods, beside the Hilltop
  if (x <= 17 && z <= 35) return 1; // west woods, beside the Orchard
  if (x >= 34 && z <= 17) return x >= 48 ? 0 : 1; // north-east woods, stepping down to the river
  return 0;
}

function computeTile(x: number, z: number): Tile {
  if (x >= RIVER_X0 && x <= RIVER_X1) return { zone: 'river', level: -1, water: true };
  if (x > RIVER_X1) return { zone: 'bank', level: 0, water: false };
  // the outer edge takes the level of the land just inside it
  const ix = Math.min(Math.max(x, 2), 49), iz = Math.min(Math.max(z, 2), 53);
  const area = AREAS.find(a => inArea(ix, iz, a));
  const edge = ix !== x || iz !== z;
  if (area) {
    if (!edge && (area.id === 'pond' || area.id === 'home')) {
      const p = area.id === 'pond' ? POND : HOME_POND;
      const dx = (x + 0.5 - p.cx) / p.rx, dz = (z + 0.5 - p.cz) / p.rz;
      if (dx * dx + dz * dz <= 1) return { zone: area.id, level: -1, water: true };
    }
    return { zone: edge ? 'wild' : area.id, level: area.level, water: false };
  }
  return { zone: 'wild', level: wildLevel(ix, iz), water: false };
}

const TILES: Tile[] = [];
for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) TILES.push(computeTile(x, z));
// Smooth terrace corners: no land tile stands more than one level above any of its 8 neighbours
// (a high corner beside a low one, diagonally, would hide part of the low tile from some views).
for (let changed = true; changed;) {
  changed = false;
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const t = TILES[z * W + x]!;
    if (t.water) continue;
    let low = Infinity;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, nz = z + dz;
      if ((dx || dz) && nx >= 0 && nz >= 0 && nx < W && nz < H) low = Math.min(low, TILES[nz * W + nx]!.level);
    }
    if (t.level > low + 1) { t.level = low + 1; changed = true; }
  }
}

export const inBounds = (x: number, z: number) => x >= 0 && z >= 0 && x < W && z < H;
export const tileAt = (x: number, z: number): Tile => TILES[z * W + x]!;
export const levelAt = (x: number, z: number) => tileAt(x, z).level;

/** The height a tap meets on this tile: its terrace top, or the water surface. */
export function topY(x: number, z: number): number {
  const t = tileAt(x, z);
  return t.water ? WATER_Y : t.level * STEP_Y;
}

/** The farm area a tile belongs to (water in the pond counts as the pond), or null for wild land. */
export function areaAt(x: number, z: number): AreaId | null {
  const zone = tileAt(x, z).zone;
  return zone === 'wild' || zone === 'river' || zone === 'bank' ? null : zone;
}

/** The highest terrace top anywhere: rays start above it. */
export const MAX_TOP = 2 * STEP_Y;
