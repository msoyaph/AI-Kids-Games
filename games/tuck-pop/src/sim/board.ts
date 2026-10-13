/**
 * Board operations on the two-int bitboard (see core/bits.ts). Full rows and columns are found
 * together on the board right after a placement, so a row and a column that cross both clear and
 * the shared cell counts once. Nothing here allocates.
 */
import { pop } from '../core/bits';
import type { Piece } from './pieces';

export const fitsAt = (lo: number, hi: number, p: Piece, i: number) => (lo & p.lo[i]) === 0 && (hi & p.hi[i]) === 0;

/** Whether the piece fits anywhere. */
export function fitsAnywhere(lo: number, hi: number, p: Piece): boolean {
  for (let i = 0; i < p.count; i++) if ((lo & p.lo[i]) === 0 && (hi & p.hi[i]) === 0) return true;
  return false;
}

export const emptyCells = (lo: number, hi: number) => 64 - pop(lo) - pop(hi);

/** The lines a board would clear: masks of the cleared cells, row and column bitmasks (bit r / bit c), and the count. */
export interface Lines { clrLo: number; clrHi: number; rows: number; cols: number; count: number }

/** Finds full rows and columns (writes into `out`, returns it). */
export function findLines(lo: number, hi: number, out: Lines): Lines {
  let x = lo & (lo >>> 1); x &= x >>> 2; x &= x >>> 4; const rl = x & 0x01010101;
  let y = hi & (hi >>> 1); y &= y >>> 2; y &= y >>> 4; const rh = y & 0x01010101;
  let c = lo & hi; c &= c >>> 8; c &= c >>> 16; c &= 0xff;
  const cm = Math.imul(c, 0x01010101);
  out.clrLo = Math.imul(rl, 0xff) | cm;
  out.clrHi = Math.imul(rh, 0xff) | cm;
  out.rows = (rl & 1) | ((rl >>> 7) & 2) | ((rl >>> 14) & 4) | ((rl >>> 21) & 8) | ((rh & 1) << 4) | (((rh >>> 7) & 2) << 4) | (((rh >>> 14) & 4) << 4) | (((rh >>> 21) & 8) << 4);
  out.cols = c;
  out.count = pop(rl) + pop(rh) + pop(c);
  return out;
}

export const newLines = (): Lines => ({ clrLo: 0, clrHi: 0, rows: 0, cols: 0, count: 0 });

/** Index (row·8 + col) helpers. */
export const isSetIndex = (lo: number, hi: number, i: number) => (i < 32 ? (lo >>> i) & 1 : (hi >>> (i - 32)) & 1) === 1;
