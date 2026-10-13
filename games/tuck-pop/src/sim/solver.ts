/**
 * "Can these pieces all be placed?": tries every order and position, clearing lines between
 * moves. It counts fit tests against a budget so the answer is the same on every device; running
 * out of budget counts as "not placeable" (callers then fall back to a tray they built to fit).
 */
import { findLines, fitsAnywhere, newLines } from './board';
import type { Piece } from './pieces';

const scratch = [newLines(), newLines(), newLines()];
let ops = 0, limit = 0;

function search(lo: number, hi: number, pieces: readonly Piece[], used: number, depth: number): boolean {
  const left = pieces.length - depth;
  if (left === 0) return true;
  for (let k = 0; k < pieces.length; k++) {
    if (used & (1 << k)) continue;
    const p = pieces[k]!;
    // identical pieces: only try the first unused copy
    let dup = false;
    for (let j = 0; j < k; j++) if (!(used & (1 << j)) && pieces[j] === p) { dup = true; break; }
    if (dup) continue;
    if (left === 1) { ops += p.count; if (ops > limit) return false; return fitsAnywhere(lo, hi, p); }
    for (let i = 0; i < p.count; i++) {
      if (++ops > limit) return false;
      if ((lo & p.lo[i]) !== 0 || (hi & p.hi[i]) !== 0) continue;
      const l = lo | p.lo[i], h = hi | p.hi[i];
      const lines = findLines(l, h, scratch[depth]!);
      if (search(l & ~lines.clrLo, h & ~lines.clrHi, pieces, used | (1 << k), depth + 1)) return true;
      if (ops > limit) return false;
    }
  }
  return false;
}

/** Whether all pieces can be placed in some order. `spent` (if given) receives the fit tests used. */
export function placeable(lo: number, hi: number, pieces: readonly Piece[], budget: number, spent?: { ops: number }): boolean {
  ops = 0; limit = budget;
  const ok = search(lo, hi, pieces, 0, 0) && ops <= limit;
  if (spent) spent.ops += ops;
  return ok;
}

/** Whether at least one piece fits somewhere. */
export const anyFits = (lo: number, hi: number, pieces: readonly (Piece | null | undefined)[]) => pieces.some(p => p && fitsAnywhere(lo, hi, p));
