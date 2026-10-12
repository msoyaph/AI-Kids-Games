/** Axis-separated AABB movement against the tile grid, with corner nudging. */
import { TILE } from '../core/math';
import type { Loc } from './world';

export interface Body {
  x: number;
  y: number;
}

/** Feet hitbox half-width and height (pixels). */
export const BODY_HW = 5;
export const BODY_H = 6;

export function collides(loc: Loc, x: number, y: number, hw = BODY_HW, hh = BODY_H): boolean {
  const x0 = Math.floor((x - hw) / TILE), x1 = Math.floor((x + hw - 0.001) / TILE);
  const y0 = Math.floor((y - hh) / TILE), y1 = Math.floor((y - 0.001) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (loc.blocked(tx, ty)) return true;
  return false;
}

/** Move body by (dx, dy); returns true if it moved at all. */
export function moveBody(loc: Loc, b: Body, dx: number, dy: number, hw = BODY_HW, hh = BODY_H): boolean {
  let moved = false;
  if (dx !== 0) {
    const nx = b.x + dx;
    if (!collides(loc, nx, b.y, hw, hh)) {
      b.x = nx;
      moved = true;
    } else if (dy === 0) {
      // nudge around corners
      for (const off of [3, -3, 6, -6]) {
        if (!collides(loc, nx, b.y + off, hw, hh) && !collides(loc, b.x, b.y + Math.sign(off) * 1, hw, hh)) {
          b.y += Math.sign(off) * Math.min(Math.abs(dx), 1);
          moved = true;
          break;
        }
      }
    }
  }
  if (dy !== 0) {
    const ny = b.y + dy;
    if (!collides(loc, b.x, ny, hw, hh)) {
      b.y = ny;
      moved = true;
    } else if (dx === 0) {
      for (const off of [3, -3, 6, -6]) {
        if (!collides(loc, b.x + off, ny, hw, hh) && !collides(loc, b.x + Math.sign(off) * 1, b.y, hw, hh)) {
          b.x += Math.sign(off) * Math.min(Math.abs(dy), 1);
          moved = true;
          break;
        }
      }
    }
  }
  return moved;
}
