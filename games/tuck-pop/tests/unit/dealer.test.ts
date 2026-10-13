import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';
import { findLines, fitsAnywhere, newLines } from '../../src/sim/board';
import { casualChoice } from '../../src/sim/bot';
import { deal, isOpen, newStats, openThreshold, pressure } from '../../src/sim/dealer';
import { newGame, place, type Mode } from '../../src/sim/game';
import { placeable } from '../../src/sim/solver';
import { TUNING } from '../../src/tuning';

interface Board { lo: number; hi: number; score: number }
const BIG = 50_000_000; // the tests' own solver budget: far beyond the dealer's, so "no" really means no

/** Boards reached by real play: casual-bot games in every mode, recorded after each move. */
function playedBoards(n: number): Board[] {
  const out: Board[] = [];
  const modes: [Mode, 'easy' | 'normal'][] = [['classic', 'normal'], ['classic', 'easy'], ['relax', 'easy']];
  for (let seed = 0; out.length < n; seed++) {
    const [mode, difficulty] = modes[seed % 3]!;
    const g = newGame({ mode, difficulty, seed: 5000 + seed });
    const rng = new Rng(seed);
    while (!g.over && out.length < n) {
      const c = casualChoice(g, rng);
      if (!c || !place(g, c.slot, c.pos)) break;
      // scores spread over the whole pressure range, and past the tightening point
      out.push({ lo: g.lo, hi: g.hi, score: g.score + (seed % 7) * 2000 });
    }
  }
  return out;
}

/** Crowded boards made by hand: random fill (60–92%), with full lines cleared as the game would. */
function crowdedBoards(n: number): Board[] {
  const rng = new Rng(99), lines = newLines(), out: Board[] = [];
  while (out.length < n) {
    const density = 0.6 + rng.next() * 0.32;
    let lo = 0, hi = 0;
    for (let i = 0; i < 64; i++) if (rng.chance(density)) { if (i < 32) lo |= 1 << i; else hi |= 1 << (i - 32); }
    findLines(lo, hi, lines);
    lo &= ~lines.clrLo; hi &= ~lines.clrHi;
    out.push({ lo, hi, score: rng.int(40000) });
  }
  return out;
}

const played = playedBoards(10_000);
const crowded = crowdedBoards(200);

describe('the fair dealer', { timeout: 120_000 }, () => {
  it('I1: every fresh tray has a piece that fits, in every mode, on played and crowded boards', () => {
    for (const [i, b] of [...played, ...crowded].entries()) for (const kind of ['build', 'normal'] as const) {
      const d = deal({ ...b, seed: i, trayNo: i % 50, kind });
      expect(d.pieces.some(p => fitsAnywhere(b.lo, b.hi, p)), `${kind} #${i}`).toBe(true);
    }
  });
  it('I2: built trays (Easy, Relax, Adventure, Shuffle) can always be fully placed', () => {
    for (const [i, b] of [...played.filter((_, k) => k % 4 === 0), ...crowded].entries()) {
      const d = deal({ ...b, seed: i, trayNo: 3, kind: 'build', weights: TUNING.dealer.easy });
      expect(placeable(b.lo, b.hi, d.pieces, BIG), `#${i}`).toBe(true);
    }
  });
  it('I3: on Normal, while the board is open, every tray can be fully placed', () => {
    let open = 0;
    for (const [i, b] of [...played, ...crowded].entries()) {
      if (!isOpen(b.lo, b.hi, b.score)) continue;
      open++;
      const d = deal({ ...b, seed: i, trayNo: 7, kind: 'normal' });
      expect(placeable(b.lo, b.hi, d.pieces, BIG), `#${i}`).toBe(true);
    }
    expect(open).toBeGreaterThan(3000); // most played boards are open
  });
  it('I4: a deal depends only on the board, score, seed, tray number and salt', () => {
    for (const [i, b] of played.slice(0, 300).entries()) for (const kind of ['build', 'normal'] as const) {
      const a = deal({ ...b, seed: i, trayNo: 2, kind }), c = deal({ ...b, seed: i, trayNo: 2, kind });
      expect(a.pieces.map(p => p.id)).toEqual(c.pieces.map(p => p.id));
      expect(a.colors).toEqual(c.colors);
    }
    const a = deal({ lo: 0, hi: 0, score: 0, seed: 1, trayNo: 2, kind: 'build', salt: 0 });
    const shuffled = deal({ lo: 0, hi: 0, score: 0, seed: 1, trayNo: 2, kind: 'build', salt: 1001 });
    expect(a.pieces.map(p => p.id).join() + a.colors.join()).not.toBe(shuffled.pieces.map(p => p.id).join() + shuffled.colors.join());
  });
  it('I5: Normal trays grow with the score (about +4 cells per tray from 0 to 10,000 points), Easy stays mostly small', () => {
    const avg = (score: number, kind: 'normal' | 'build') => {
      let cells = 0;
      for (let s = 0; s < 2000; s++) for (const p of deal({ lo: 0, hi: 0, score, seed: s, trayNo: 1, kind }).pieces) cells += p.size;
      return cells / 2000;
    };
    expect(avg(10_000, 'normal') - avg(0, 'normal')).toBeGreaterThan(3);
    expect(pressure(0)).toBe(0); expect(pressure(10_000)).toBe(1);
    let big = 0;
    for (let s = 0; s < 2000; s++) big += deal({ lo: 0, hi: 0, score: 50_000, seed: s, trayNo: 1, kind: 'build', weights: TUNING.dealer.easy }).pieces.filter(p => p.tier === 2).length;
    expect(big / 6000).toBeLessThan(0.15);
  });
  it('the open threshold rises with pressure, then keeps rising past the tightening score', () => {
    expect(openThreshold(0)).toBe(TUNING.dealer.openBase);
    expect(openThreshold(10_000)).toBe(TUNING.dealer.openBase + TUNING.dealer.openPressure);
    expect(openThreshold(TUNING.dealer.tightenFrom + 7 * TUNING.dealer.tightenEvery)).toBe(TUNING.dealer.openBase + TUNING.dealer.openPressure + 7);
  });
  it('uses a fixed budget: deals count their work and stay within it', () => {
    const stats = newStats();
    for (const [i, b] of crowded.entries()) deal({ ...b, seed: i, trayNo: 1, kind: 'normal', stats });
    expect(stats.deals).toBe(200);
    expect(stats.ops / stats.deals).toBeLessThan(TUNING.dealer.dealBudget + TUNING.dealer.checkBudget);
  });
});
