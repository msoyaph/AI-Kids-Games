import { describe, expect, it } from 'vitest';
import { fromRows } from '../../src/core/bits';
import { findLines, newLines } from '../../src/sim/board';
import { Rng } from '../../src/core/rng';
import { casualChoice } from '../../src/sim/bot';
import { DAILY_MOVES, dailyGame, dailyLayout, dailySeed, dayNumber } from '../../src/sim/daily';
import { place } from '../../src/sim/game';

/** The next 60 days from a fixed start (local CI keeps it short; 365 are checked locally with DAYS=365). */
function days(n = Number(process.env.DAYS) || 60) {
  const out: number[] = [];
  const d = new Date(Date.UTC(2026, 9, 13));
  for (let i = 0; i < n; i++) { out.push(dayNumber(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}

describe('the Daily puzzle', () => {
  it('is the same puzzle for everyone on the same day, and different on other days', () => {
    expect(dayNumber(2026, 10, 13)).toBe(20261013);
    expect(dailyLayout(20261013)).toEqual(dailyLayout(20261013));
    const a = dailyGame(20261013), b = dailyGame(20261013);
    expect(a.tray.map(t => t!.piece.id)).toEqual(b.tray.map(t => t!.piece.id));
    const seeds = new Set(days().map(dailySeed));
    expect(seeds.size).toBe(days().length);
    const layouts = new Set(days().map(d => dailyLayout(d).join('/')));
    expect(layouts.size).toBe(days().length);
  });
  it('starts with a few clumps, no full lines, and room to play, every day', () => {
    const lines = newLines();
    for (const d of days()) {
      const rows = dailyLayout(d), [lo, hi] = fromRows(rows);
      expect(findLines(lo, hi, lines).count, String(d)).toBe(0);
      const blocks = rows.join('').replace(/\./g, '').length;
      expect(blocks, String(d)).toBeGreaterThanOrEqual(5);
      expect(blocks, String(d)).toBeLessThanOrEqual(20);
      const g = dailyGame(d);
      expect(g.tray.every(Boolean)).toBe(true);
      expect(g.movesLimit).toBe(DAILY_MOVES);
    }
  });
  it('ends after 40 moves (a casual player nearly always gets there)', () => {
    let finished = 0;
    for (const [k, d] of days(20).entries()) {
      const g = dailyGame(d), rng = new Rng(k);
      while (!g.over) { const c = casualChoice(g, rng); if (!c) break; place(g, c.slot, c.pos); }
      expect(g.moves).toBeLessThanOrEqual(DAILY_MOVES);
      if (g.end === 'moves') finished++;
    }
    expect(finished).toBeGreaterThanOrEqual(16);
  });
});
