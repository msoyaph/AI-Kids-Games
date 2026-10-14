// The lane board as plain numbers: 5 lanes × 9 tiles in front of the picnic blanket. World units:
// x runs left to right (blanket on the left, critters walk in from the right), z runs from the
// back lane (0) to the front lane (4), and the tile tops sit at y = 0. No DOM, no three.js.
import { BOARD } from '../data/tuning';

export const LANES = BOARD.lanes;
export const COLS = BOARD.tiles;
export const TILE_W = BOARD.tileWidth;
export const TILE_D = BOARD.tileDepth;
export const BOARD_W = COLS * TILE_W;
export const BOARD_D = LANES * TILE_D;
/** Where the path in begins (the bushes' gap): critters enter here and walk to the beds. */
export const RUNWAY = BOARD.runway;
export const ENTRY_X = BOARD_W + RUNWAY;

export interface Tile { lane: number; col: number }

/** World x of a column's middle. */
export const colX = (col: number) => (col + 0.5) * TILE_W;
/** World z of a lane's middle. */
export const laneZ = (lane: number) => (lane + 0.5) * TILE_D;

/** The tile under a ground point, or null off the board. */
export function tileAt(x: number, z: number): Tile | null {
  if (x < 0 || z < 0 || x >= BOARD_W || z >= BOARD_D) return null;
  return { lane: Math.floor(z / TILE_D), col: Math.floor(x / TILE_W) };
}

export const sameTile = (a: Tile | null, b: Tile | null) => !!a && !!b && a.lane === b.lane && a.col === b.col;

/** Every tile, back lane first. */
export const ALL_TILES: readonly Tile[] = Array.from({ length: LANES * COLS }, (_, i) => ({ lane: Math.floor(i / COLS), col: i % COLS }));
