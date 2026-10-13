import { describe, expect, it } from 'vitest';
import { fromRows, pop, toRows } from '../../src/core/bits';
import { emptyCells, findLines, fitsAnywhere, fitsAt, newLines } from '../../src/sim/board';
import { FAMILIES, PIECES, piece, positionAt } from '../../src/sim/pieces';
import { linePoints, multHalves, multText, nextStreak, score, wordFor } from '../../src/sim/scoring';

const lines = newLines();
const after = (rows: string[]) => { const [lo, hi] = fromRows(rows); findLines(lo, hi, lines); return toRows(lo & ~lines.clrLo, hi & ~lines.clrHi); };

describe('pieces', () => {
  it('has 37 original shapes in 13 families and three size tiers, with stable ids', () => {
    expect(PIECES).toHaveLength(37);
    expect(FAMILIES).toHaveLength(13);
    expect(new Set(PIECES.map(p => p.id)).size).toBe(37);
    for (const p of PIECES) {
      expect(p.size).toBe(p.cells.length);
      expect(p.tier).toBe(p.size <= 3 ? 0 : p.size === 4 ? 1 : 2);
      expect(p.count).toBe((9 - p.w) * (9 - p.h));
      for (let i = 0; i < p.count; i++) expect(pop(p.lo[i]!) + pop(p.hi[i]!)).toBe(p.size);
    }
    expect(piece('o3').size).toBe(9);
    expect(piece('i5h').w).toBe(5);
  });
  it('has no two pieces with the same shape (no rotations of one another are merged)', () => {
    const key = (id: string) => { const p = piece(id); return `${p.lo[0]},${p.hi[0]},${p.w}x${p.h}`; };
    expect(new Set(PIECES.map(p => key(p.id))).size).toBe(37);
  });
  it('maps a top-left cell to a position, and refuses positions off the board', () => {
    const p = piece('i3h');
    expect(positionAt(p, 0, 0)).toBe(0);
    expect(positionAt(p, 7, 5)).toBe(p.count - 1);
    expect(positionAt(p, 0, 6)).toBe(-1);
    expect(positionAt(p, -1, 0)).toBe(-1);
    const i = positionAt(p, 5, 2);
    expect(p.pr[i]).toBe(5); expect(p.pc[i]).toBe(2);
  });
});

describe('placement', () => {
  it('fits only on empty cells', () => {
    const [lo, hi] = fromRows(['#.......', '........', '........', '........', '........', '........', '........', '........']);
    const o2 = piece('o2');
    expect(fitsAt(lo, hi, o2, positionAt(o2, 0, 0))).toBe(false);
    expect(fitsAt(lo, hi, o2, positionAt(o2, 0, 1))).toBe(true);
  });
  it('works across the two halves of the board (rows 3 and 4)', () => {
    const [lo, hi] = fromRows(['........', '........', '........', '........', '...#....', '........', '........', '........']);
    const v = piece('i2v');
    expect(fitsAt(lo, hi, v, positionAt(v, 3, 3))).toBe(false);
    expect(fitsAt(lo, hi, v, positionAt(v, 3, 2))).toBe(true);
  });
  it('knows when a piece fits nowhere', () => {
    const rows = ['##.#####', '#.######', '########', '.#######', '#######.', '########', '##.#####', '########'];
    const [lo, hi] = fromRows(rows);
    expect(fitsAnywhere(lo, hi, piece('dot'))).toBe(true);
    expect(fitsAnywhere(lo, hi, piece('i2h'))).toBe(false);
    expect(emptyCells(lo, hi)).toBe(5);
  });
});

describe('clearing lines', () => {
  it('clears a full row', () => {
    expect(after(['........', '########', '#.......', '........', '........', '........', '........', '........']))
      .toEqual(['........', '........', '#.......', '........', '........', '........', '........', '........']);
    expect(lines.count).toBe(1); expect(lines.rows).toBe(0b10); expect(lines.cols).toBe(0);
  });
  it('clears a full column, including across both halves', () => {
    const col = Array.from({ length: 8 }, (_, r) => (r === 2 ? '#....#..' : '.....#..'));
    expect(after(col)).toEqual(['........', '........', '#.......', '........', '........', '........', '........', '........']);
    expect(lines.count).toBe(1); expect(lines.cols).toBe(1 << 5);
  });
  it('clears a row and a column together, counting the shared cell once', () => {
    const rows: string[] = Array.from({ length: 8 }, (_, r) => (r === 6 ? '########' : '..#.....'));
    rows[0] = '..#....#';
    expect(after(rows)).toEqual(['.......#', '........', '........', '........', '........', '........', '........', '........']);
    expect(lines.count).toBe(2); expect(lines.rows).toBe(1 << 6); expect(lines.cols).toBe(1 << 2);
  });
  it('clears every row of a full board and every column at once', () => {
    const full = Array(8).fill('########');
    expect(after(full)).toEqual(Array(8).fill('........'));
    expect(lines.count).toBe(16);
  });
  it('finds rows 3, 4 and 7 (the bit edges) and column 0 and 7', () => {
    const rows = Array(8).fill('#......#');
    rows[3] = '########'; rows[4] = '########'; rows[7] = '########';
    findLines(...fromRows(rows), lines);
    expect(lines.rows).toBe(0b10011000); expect(lines.cols).toBe(0b10000001); expect(lines.count).toBe(5);
  });
});

describe('scoring', () => {
  it('scores lines 10, 30, 60, 100, 150, 210', () => {
    expect([1, 2, 3, 4, 5, 6].map(linePoints)).toEqual([10, 30, 60, 100, 150, 210]);
  });
  it('multiplies line points by the streak, ×1 to ×4 in halves, always whole points', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 20].map(multHalves)).toEqual([2, 3, 4, 5, 6, 7, 8, 8, 8]);
    expect(multText(3)).toBe('×1.5'); expect(multText(8)).toBe('×4');
    for (let s = 1; s < 12; s++) for (let l = 1; l <= 6; l++) expect(Number.isInteger(score(4, l, s, false).total)).toBe(true);
    expect(score(4, 2, 3, false)).toMatchObject({ cells: 4, linePts: 60, total: 64, multHalves: 4 });
  });
  it('gives a board-clear bonus and the words with exact points', () => {
    expect(score(3, 2, 1, true)).toMatchObject({ clearBonus: 300, total: 3 + 30 + 300, word: 'Board clear!' });
    expect(wordFor(0, 5, false)).toBe('');
    expect([1, 2, 3, 4, 6].map(l => wordFor(l, 1, false))).toEqual(['Nice!', 'Super!', 'Amazing!', 'Wow!', 'Wow!']);
    expect(wordFor(1, 4, false)).toBe('Super!');
    expect(score(5, 0, 0, false)).toMatchObject({ total: 5, word: '', linePts: 0 });
  });
  it('keeps the streak through two dry moves and ends it on the third', () => {
    let s = { streak: 0, dry: 0 };
    s = nextStreak(s.streak, s.dry, 1); expect(s).toEqual({ streak: 1, dry: 0 });
    s = nextStreak(s.streak, s.dry, 2); expect(s).toEqual({ streak: 2, dry: 0 });
    s = nextStreak(s.streak, s.dry, 0); s = nextStreak(s.streak, s.dry, 0); expect(s).toEqual({ streak: 2, dry: 2 });
    expect(nextStreak(s.streak, s.dry, 1)).toEqual({ streak: 3, dry: 0 });
    expect(nextStreak(s.streak, s.dry, 0)).toEqual({ streak: 0, dry: 0 });
  });
});
