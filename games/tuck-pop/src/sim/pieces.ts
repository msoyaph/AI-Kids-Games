/**
 * The pieces: 37 fixed polyomino shapes (pieces never rotate, so each orientation is its own
 * piece), grouped into families and three size tiers. Every piece precomputes the board masks of
 * all its positions, so "does it fit?" is two ANDs.
 */
export type Tier = 0 | 1 | 2; // small (1–3 cells), medium (4), big (5–9)

export interface Piece {
  index: number; id: string; family: string; tier: Tier;
  w: number; h: number; size: number;
  /** Cells as [row, col] offsets. */
  cells: readonly (readonly [number, number])[];
  /** Positions: top-left (row pr[i], col pc[i]) and its masks lo[i], hi[i]. */
  count: number; pr: Int8Array; pc: Int8Array; lo: Int32Array; hi: Int32Array;
}

const SHAPES: readonly [id: string, family: string, tier: Tier, rows: string][] = [
  // small
  ['dot', 'dot', 0, '#'],
  ['i2h', 'i2', 0, '##'], ['i2v', 'i2', 0, '#|#'],
  ['i3h', 'i3', 0, '###'], ['i3v', 'i3', 0, '#|#|#'],
  ['c3a', 'c3', 0, '##|#.'], ['c3b', 'c3', 0, '##|.#'], ['c3c', 'c3', 0, '.#|##'], ['c3d', 'c3', 0, '#.|##'],
  // medium
  ['i4h', 'i4', 1, '####'], ['i4v', 'i4', 1, '#|#|#|#'],
  ['o2', 'o2', 1, '##|##'],
  ['l4a', 'l4', 1, '#.|#.|##'], ['l4b', 'l4', 1, '###|#..'], ['l4c', 'l4', 1, '##|.#|.#'], ['l4d', 'l4', 1, '..#|###'],
  ['j4a', 'l4', 1, '.#|.#|##'], ['j4b', 'l4', 1, '#..|###'], ['j4c', 'l4', 1, '##|#.|#.'], ['j4d', 'l4', 1, '###|..#'],
  ['t4a', 't4', 1, '###|.#.'], ['t4b', 't4', 1, '.#.|###'], ['t4c', 't4', 1, '#.|##|#.'], ['t4d', 't4', 1, '.#|##|.#'],
  ['s4a', 's4', 1, '.##|##.'], ['s4b', 's4', 1, '##.|.##'], ['s4c', 's4', 1, '#.|##|.#'], ['s4d', 's4', 1, '.#|##|#.'],
  // big
  ['i5h', 'i5', 2, '#####'], ['i5v', 'i5', 2, '#|#|#|#|#'],
  ['c5a', 'c5', 2, '###|#..|#..'], ['c5b', 'c5', 2, '###|..#|..#'], ['c5c', 'c5', 2, '#..|#..|###'], ['c5d', 'c5', 2, '..#|..#|###'],
  ['r23', 'r6', 2, '###|###'], ['r32', 'r6', 2, '##|##|##'],
  ['o3', 'o3', 2, '###|###|###'],
];

function build(index: number, [id, family, tier, art]: (typeof SHAPES)[number]): Piece {
  const rows = art.split('|');
  const cells: [number, number][] = [];
  rows.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') cells.push([r, c]); }));
  const h = rows.length, w = Math.max(...rows.map(row => row.length));
  const count = (9 - h) * (9 - w);
  const pr = new Int8Array(count), pc = new Int8Array(count), lo = new Int32Array(count), hi = new Int32Array(count);
  let i = 0;
  for (let r = 0; r <= 8 - h; r++) for (let c = 0; c <= 8 - w; c++, i++) {
    let l = 0, m = 0;
    for (const [dr, dc] of cells) { const rr = r + dr, cc = c + dc; if (rr < 4) l |= 1 << (rr * 8 + cc); else m |= 1 << ((rr - 4) * 8 + cc); }
    pr[i] = r; pc[i] = c; lo[i] = l; hi[i] = m;
  }
  return { index, id, family, tier, w, h, size: cells.length, cells, count, pr, pc, lo, hi };
}

export const PIECES: readonly Piece[] = SHAPES.map((shape, i) => build(i, shape));
const byId = new Map(PIECES.map(p => [p.id, p]));
export const FAMILIES = [...new Set(PIECES.map(p => p.family))];

export function piece(id: string): Piece {
  const p = byId.get(id);
  if (!p) throw new Error(`Unknown piece ${id}`);
  return p;
}
export const hasPiece = (id: string) => byId.has(id);

/** The position index of a piece whose top-left is at (r, c), or -1 when it would leave the board. */
export function positionAt(p: Piece, r: number, c: number): number {
  if (r < 0 || c < 0 || r > 8 - p.h || c > 8 - p.w) return -1;
  return r * (9 - p.w) + c;
}
