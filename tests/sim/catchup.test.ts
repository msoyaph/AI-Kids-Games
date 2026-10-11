import { describe, expect, it } from 'vitest';
import { measureCatchUp } from '../../src/sim/catchup';

// Deterministic: same tracks/seeds every run (all tracks × 5 seeds = 80 races per scenario, Pro, 8 racers,
// items + catch-up on). Item luck makes these numbers swing ±5 % between seed sets, so targets need real margin.
describe('catch-up targets (Pro, 8 racers)', () => {
  const r = measureCatchUp({ seeds: [11, 23, 37, 41, 53] });
  it('keeps equal-skill fields close', () => {
    expect(r.gap4).toBeLessThanOrEqual(4);
    expect(r.gap8).toBeLessThanOrEqual(12);
  });
  it('rewards a strong racer', () => {
    expect(r.strongWin).toBeGreaterThanOrEqual(0.45);
    expect(r.strongTop3).toBeGreaterThanOrEqual(0.8);
  });
  it('does not hand wins to a weak racer', () => {
    expect(r.weakWin).toBeLessThanOrEqual(0.08);
  });
  it('lets a Pro racer recover from the back of the grid sometimes', () => {
    expect(r.lastTop4).toBeGreaterThanOrEqual(0.3);
    expect(r.lastTop4).toBeLessThanOrEqual(0.5);
  });
});
