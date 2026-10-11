// Shared world/tile types. Tile (x,z) covers world space [x,x+1) x [z,z+1).
// North is -z (top of the screen), south is +z (towards the camera).

export const WORLD_SIZE = 80;
/** world-space height of one cliff level (visual only; logic uses integer levels) */
export const LEVEL_HEIGHT = 1.4;

export const Ground = {
  Ocean: 0,
  Sand: 1,
  Grass: 2,
  Dirt: 3,
  River: 4,
  Pond: 5,
} as const;
export type GroundT = (typeof Ground)[keyof typeof Ground];

export const isWaterGround = (g: number) => g === Ground.Ocean || g === Ground.River || g === Ground.Pond;

export const Region = {
  None: 0,
  West: 1,
  SE: 2,
  NE: 3,
  Plateau: 4,
  Summit: 5,
} as const;
export type RegionT = number;

export const REGION_NAMES: Record<number, string> = {
  0: 'Sea',
  1: 'Lanternside',
  2: 'Southern Shore',
  3: 'Mossy Reach',
  4: 'Upper Meadow',
  5: 'Lighthouse Peak',
};

export interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

export type LotId = 'plaza' | 'hall' | 'shop' | 'museum' | 'home' | 'dock' | 'lighthouse';

export type GenObjKind = 'tree' | 'pine' | 'palm' | 'fruitTree' | 'rock' | 'flower';

export interface GenObject {
  x: number;
  z: number;
  k: GenObjKind;
  v: number;
}

export const DIRS4 = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

export const DIRS8 = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
] as const;
