/** Bit helpers for the 8×8 board, stored as two 32-bit ints (lo = rows 0–3, hi = rows 4–7; bit = row%4·8 + col). */

/** Number of set bits in a 32-bit int. */
export function pop(x: number): number {
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (Math.imul((x + (x >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24);
}

/** Whether the cell at row r, column c is set. */
export const bitAt = (lo: number, hi: number, r: number, c: number): boolean =>
  r < 4 ? ((lo >>> (r * 8 + c)) & 1) === 1 : ((hi >>> ((r - 4) * 8 + c)) & 1) === 1;

/** The single-cell mask for (r, c) as [lo, hi]. */
export const cellMask = (r: number, c: number): [number, number] =>
  r < 4 ? [(1 << (r * 8 + c)) | 0, 0] : [0, (1 << ((r - 4) * 8 + c)) | 0];

/** Set bits as cell indexes (row·8 + col), in order. Allocates: not for hot loops. */
export function cellsOf(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < 64; i++) if (i < 32 ? (lo >>> i) & 1 : (hi >>> (i - 32)) & 1) out.push(i);
  return out;
}

/** A board from 8 strings ('#' or any non-'.' set). */
export function fromRows(rows: readonly string[]): [number, number] {
  let lo = 0, hi = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const ch = rows[r]?.[c] ?? '.';
    if (ch === '.' || ch === ' ') continue;
    const [l, h] = cellMask(r, c); lo |= l; hi |= h;
  }
  return [lo | 0, hi | 0];
}

/** 8 strings for a board, '#' for set cells (for tests and debugging). */
export function toRows(lo: number, hi: number): string[] {
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) { let s = ''; for (let c = 0; c < 8; c++) s += bitAt(lo, hi, r, c) ? '#' : '.'; rows.push(s); }
  return rows;
}
