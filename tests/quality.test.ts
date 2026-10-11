// Quality tiers, the Auto governor, and the performance benchmark's island and math.
import { describe, expect, it } from 'vitest';
import { Governor, guessTier, QUALITY, urlTier } from '../src/render/quality';
import { summarize } from '../src/ui/bench';
import { benchRoute, buildBusyIsland } from '../src/sim/benchIsland';
import { festivalToday } from '../src/sim/happenings';
import { residents } from '../src/sim/villagers';

const frames = (g: Governor, sec: number, fps: number) => {
  let out = null;
  for (let t = 0; t < sec; t += 1 / fps) out = g.sample(1 / fps) ?? out;
  return out;
};

describe('quality tiers', () => {
  it('Low is light enough for tablets', () => {
    expect(QUALITY.low).toMatchObject({ pixelRatio: 1, shadows: false, foam: false, treeSway: false });
    expect(QUALITY.high.shadowRadius).toBeGreaterThan(QUALITY.medium.shadowRadius);
    expect(QUALITY.high.shadowMap).toBe(2048);
  });

  it('guesses a starting tier from the device', () => {
    expect(guessTier({ maxTouchPoints: 5, hardwareConcurrency: 4, userAgent: 'iPad' })).toBe('low');
    expect(guessTier({ maxTouchPoints: 5, hardwareConcurrency: 8, userAgent: 'Android' })).toBe('medium');
    expect(guessTier({ maxTouchPoints: 0, hardwareConcurrency: 10, userAgent: 'Mac' })).toBe('high');
    expect(urlTier('?quality=low')).toBe('low');
    expect(urlTier('?quality=ultra')).toBeNull();
    expect(urlTier('')).toBeNull();
  });

  it('Auto steps down when frames stay slow and back up when they stay fast — never above its start', () => {
    const g = new Governor('high');
    expect(frames(g, 5, 60)).toBeNull();
    expect(frames(g, 3, 30)).toBe('medium');
    // a hitch (tab switch) is ignored
    expect(g.sample(2)).toBeNull();
    frames(g, 2, 60); // settle
    expect(frames(g, 4, 30)).toBe('low');
    expect(frames(g, 12, 60)).toBe('medium');
    expect(frames(g, 12, 60)).toBe('high');
    expect(frames(g, 30, 60)).toBeNull();
    expect(g.tier).toBe('high');
    const low = new Governor('low');
    expect(frames(low, 20, 60)).toBeNull();
    expect(low.tier).toBe('low');
  });
});

describe('performance benchmark', () => {
  it('reports average and 1% low FPS', () => {
    const f = [...Array(99).fill(1 / 60), 1 / 10];
    const s = summarize(f);
    expect(s.avgFps).toBeCloseTo(100 / (99 / 60 + 0.1), 0);
    expect(s.low1Fps).toBe(10);
    expect(summarize([])).toEqual({ avgFps: 0, low1Fps: 0 });
  });

  it('builds a busy island in memory: every neighbor out at the Harvest Feast, 6 PM', () => {
    const g = buildBusyIsland();
    expect(residents(g)).toHaveLength(8);
    expect(festivalToday(g)?.id).toBe('harvestFeast');
    expect(g.state.clock.minute).toBe(18 * 60);
    expect(benchRoute(g).length).toBeGreaterThanOrEqual(3);
    expect(g.state.player.name).toBe('Bench');
  });
});
