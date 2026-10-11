import { describe, expect, it } from 'vitest';
import { xpToNext } from '../../src/config/balance';
import { simulateRun } from '../../src/sim/headless';
import { gainXp, totalXpForLevel } from '../../src/sim/leveling';
import { newRun } from '../../src/sim/run';
import { step } from '../../src/sim/sim';
import { emptyInput } from '../../src/sim/world';

describe('xp curve', () => {
  it('is positive and non-decreasing', () => {
    let prev = 0;
    for (let l = 1; l < 120; l++) {
      const x = xpToNext(l);
      expect(x).toBeGreaterThan(0);
      expect(x).toBeGreaterThanOrEqual(prev);
      prev = x;
    }
  });

  it('total XP sums the per-level requirements', () => {
    expect(totalXpForLevel(1)).toBe(0);
    expect(totalXpForLevel(2)).toBe(xpToNext(1));
    expect(totalXpForLevel(4)).toBe(xpToNext(1) + xpToNext(2) + xpToNext(3));
  });
});

describe('leveling', () => {
  it('a single gain can queue several level-ups and keeps the remainder', () => {
    const w = newRun({ seed: 1, characterId: 'thea' });
    const amount = totalXpForLevel(4) + 3;
    gainXp(w, amount);
    expect(w.player.level).toBe(4);
    expect(w.pendingLevels).toBe(3);
    expect(w.player.xp).toBeCloseTo(3);
    expect(w.player.xpNext).toBe(xpToNext(4));
  });

  it('growth multiplies experience', () => {
    const a = newRun({ seed: 2, characterId: 'thea' });
    const b = newRun({ seed: 2, characterId: 'thea', meta: { growth: 0.5 } });
    gainXp(a, 2);
    gainXp(b, 2);
    expect(b.player.xp).toBeCloseTo(a.player.xp * 1.5);
  });

  it('the sim pauses on level-up until a choice is resolved', () => {
    const w = newRun({ seed: 3, characterId: 'thea' });
    gainXp(w, 100);
    step(w, emptyInput());
    expect(w.state).toBe('levelup');
    expect(w.choices.length).toBeGreaterThanOrEqual(3);
    const t = w.time;
    step(w, emptyInput());
    expect(w.time).toBe(t);
  });
});

describe('determinism', () => {
  it('the same seed and inputs reproduce the same run', () => {
    const a = simulateRun({ characterId: 'thea', seed: 777, maxSeconds: 90 });
    const b = simulateRun({ characterId: 'thea', seed: 777, maxSeconds: 90 });
    expect(b).toEqual(a);
  });

  it('different seeds produce different runs', () => {
    const a = simulateRun({ characterId: 'thea', seed: 1, maxSeconds: 60 });
    const b = simulateRun({ characterId: 'thea', seed: 2, maxSeconds: 60 });
    expect(b).not.toEqual(a);
  });
});
