import { describe, expect, it } from 'vitest';
import { DAY_MINUTES, dayShare, dayTime, duskAmount, nightAmount, playMsFor } from '../../src/core/world/daytime';

const min = 60000;

describe('time of day', () => {
  it('a new game starts in the morning and the day comes soon after', () => {
    expect(dayTime(0)).toBe('morning');
    expect(dayTime(3 * min)).toBe('day');
  });

  it('runs through morning, day, evening and night, mostly day, then starts again', () => {
    const seen: Record<string, number> = {};
    for (let m = 0; m < DAY_MINUTES; m += 0.05) seen[dayTime(m * min)] = (seen[dayTime(m * min)] ?? 0) + 1;
    const total = Object.values(seen).reduce((a, b) => a + b, 0);
    expect(Object.keys(seen).sort()).toEqual(['day', 'evening', 'morning', 'night']);
    expect(seen.day! / total).toBeGreaterThan(0.45);
    expect(seen.night! / total).toBeLessThan(0.2);
    expect(dayTime(DAY_MINUTES * min)).toBe(dayTime(0));
  });

  it('the evening and night tints ease in and out (no sudden jumps, even where the day wraps)', () => {
    for (const f of [duskAmount, nightAmount]) {
      let last = f(0);
      for (let ms = 0; ms <= DAY_MINUTES * min + 1000; ms += 1000) {
        const d = f(ms);
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(1);
        expect(Math.abs(d - last), `${f.name} at ${ms / 1000}s`).toBeLessThan(0.05);
        last = d;
      }
    }
    expect(nightAmount(4 * min)).toBe(0);
    for (const t of ['morning', 'day', 'evening', 'night'] as const) expect(dayTime(playMsFor(t))).toBe(t);
    expect(nightAmount(playMsFor('night'))).toBe(1);
    expect(duskAmount(playMsFor('day'))).toBe(0);
    expect(dayShare(-5)).toBeGreaterThanOrEqual(0);
  });
});
