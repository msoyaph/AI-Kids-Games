import { describe, expect, it } from 'vitest';
import { simulatePacing, totalHours } from '../../src/systems/pacing';

describe('pacing model', () => {
  it('Normal play takes about 5-6 hours', () => {
    const h = totalHours(simulatePacing('normal'));
    expect(h).toBeGreaterThan(5);
    expect(h).toBeLessThan(6.2);
  });

  it('Easy story play takes about 5-6 hours, and everything stays under 7', () => {
    expect(totalHours(simulatePacing('easy', false))).toBeGreaterThan(4.8);
    expect(totalHours(simulatePacing('easy', false))).toBeLessThan(6.2);
    expect(totalHours(simulatePacing('easy'))).toBeLessThan(7);
  });

  it('no chapter is tiny or huge', () => {
    for (const d of ['easy', 'normal'] as const) {
      for (const c of simulatePacing(d)) {
        expect(c.totalMin, `${d} ch${c.chapter}`).toBeGreaterThan(40);
        expect(c.totalMin, `${d} ch${c.chapter}`).toBeLessThan(120);
      }
    }
  });
});
