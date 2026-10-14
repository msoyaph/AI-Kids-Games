// Tap picking: which tile is under a screen point. The tap's ray meets the ground (y = 0), and the
// tile there is the pick. Taps are generous twice over: a tap just off the board's edge still picks
// the edge tile, and `pickNear` snaps a tap that lands on a tile the current action can't use (a
// planted one, say) to the nearest tile it can, within a finger's reach on screen. Pure math,
// unit-tested in tests/unit/pick.test.ts; pickNear follows farm-wip's input/pick.ts.
import type * as THREE from 'three';
import { rayToPlane } from '../render/camera';
import { BOARD_D, BOARD_W, COLS, LANES, tileAt, type Tile } from '../sim/board';

/** How far off the board (world units) a tap still counts for the edge tile. */
export const EDGE_SLACK = 0.35;
/** How far (CSS px) a tap snaps to a tile the action can use. */
export const SNAP_PX = 40;

/** The tile a ray points at, or null when it's well off the board. */
export function pickTile(ray: THREE.Ray): Tile | null {
  const p = rayToPlane(ray, 0);
  if (!p) return null;
  if (p.x < -EDGE_SLACK || p.z < -EDGE_SLACK || p.x > BOARD_W + EDGE_SLACK || p.z > BOARD_D + EDGE_SLACK) return null;
  const e = 1e-6;
  return tileAt(Math.min(BOARD_W - e, Math.max(0, p.x)), Math.min(BOARD_D - e, Math.max(0, p.z)));
}

/**
 * The best tile for a tap at (sx, sy): the tile under the finger if `wanted` accepts it, otherwise
 * the nearest wanted tile within `radius` px whose middle is closest to the tap. `screenOf` gives a
 * tile's middle on screen.
 */
export function pickNear(
  hit: Tile | null,
  sx: number,
  sy: number,
  wanted: (tile: Tile) => boolean,
  screenOf: (tile: Tile) => { x: number; y: number },
  radius = SNAP_PX,
): Tile | null {
  if (!hit) return null;
  if (wanted(hit)) return hit;
  let best: Tile | null = null, bestD = radius * radius;
  for (let dl = -2; dl <= 2; dl++) {
    for (let dc = -2; dc <= 2; dc++) {
      const tile = { lane: hit.lane + dl, col: hit.col + dc };
      if ((dl === 0 && dc === 0) || tile.lane < 0 || tile.col < 0 || tile.lane >= LANES || tile.col >= COLS || !wanted(tile)) continue;
      const p = screenOf(tile), d2 = (p.x - sx) ** 2 + (p.y - sy) ** 2;
      if (d2 <= bestD) { bestD = d2; best = tile; }
    }
  }
  return best;
}
