import { describe, expect, it } from 'vitest';
import { dateLabel, DAY_SEC, dayOfSeason, dayPart, duskAmount, playTimeLabel, SEASON_DAYS, seasonOf, START_T, yearOf } from '../../src/sim/clock';
import { newFarm } from '../../src/sim/state';
import { advance } from '../../src/sim/tick';

describe('farm time', () => {
  it('starts on the first morning of spring', () => {
    expect(seasonOf(START_T)).toBe('spring');
    expect(dayOfSeason(START_T)).toBe(1);
    expect(dayPart(START_T)).toBe('day');
    expect(dateLabel(START_T)).toBe('Spring, day 1');
  });

  it('runs through the seasons and the years', () => {
    expect(seasonOf(DAY_SEC * SEASON_DAYS)).toBe('summer');
    expect(seasonOf(DAY_SEC * SEASON_DAYS * 3 + 1)).toBe('winter');
    expect(seasonOf(DAY_SEC * SEASON_DAYS * 4)).toBe('spring');
    expect(yearOf(DAY_SEC * SEASON_DAYS * 4)).toBe(2);
    expect(dateLabel(DAY_SEC * SEASON_DAYS * 4 + 1)).toBe('Spring, day 1 · Year 2');
  });

  it('eases into evening and back without jumps', () => {
    let prev = duskAmount(0);
    for (let t = 0; t <= DAY_SEC * 2; t += 0.5) {
      const d = duskAmount(t);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(1);
      expect(Math.abs(d - prev)).toBeLessThan(0.02);
      prev = d;
    }
    expect(duskAmount(DAY_SEC * 0.4)).toBe(0);
    expect(duskAmount(DAY_SEC * 0.95)).toBe(1);
  });

  it('only moves forward with play time', () => {
    const farm = newFarm(1);
    const t0 = farm.t;
    advance(farm, 0);
    advance(farm, -5);
    advance(farm, Number.NaN);
    expect(farm.t).toBe(t0);
    advance(farm, 2.5);
    expect(farm.t).toBe(t0 + 2.5);
  });

  it('writes play timers simply', () => {
    expect(playTimeLabel(42.2)).toBe('43s');
    expect(playTimeLabel(125)).toBe('2:05');
    expect(playTimeLabel(-3)).toBe('0s');
  });
});
