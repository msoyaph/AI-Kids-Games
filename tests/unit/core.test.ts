import { describe, expect, it } from 'vitest';
import { FixedLoop } from '../../src/app/loop';
import { computeStage, DESIGN_H, DESIGN_W } from '../../src/app/stage';
import { Rng, hashString } from '../../src/core/rng';
import { Pool } from '../../src/core/pool';
import { angleDiff, clamp, distToSegment2, formatPlaytime, formatRaceTime } from '../../src/core/mathx';
import { dayKey } from '../../src/core/time';

describe('FixedLoop', () => {
  it('runs a fixed number of steps for the elapsed time and interpolates', () => {
    let steps = 0;
    let lastAlpha = -1;
    const loop = new FixedLoop(60, () => steps++, (a) => (lastAlpha = a));
    loop.tick(1 / 60);
    expect(steps).toBe(1);
    loop.tick(0.5 / 60);
    expect(steps).toBe(1);
    expect(lastAlpha).toBeCloseTo(0.5, 5);
    loop.tick(0.5 / 60);
    expect(steps).toBe(2);
  });

  it('clamps huge frames so the game does not spiral', () => {
    let steps = 0;
    const loop = new FixedLoop(60, () => steps++, () => {});
    loop.tick(10);
    expect(steps).toBeLessThanOrEqual(loop.maxSteps);
  });

  it('ignores negative or NaN elapsed time', () => {
    let steps = 0;
    const loop = new FixedLoop(60, () => steps++, () => {});
    loop.tick(-1);
    loop.tick(Number.NaN);
    expect(steps).toBe(0);
  });
});

describe('computeStage', () => {
  it('fits the design size and caps resolution at 2', () => {
    const m = computeStage(1920, 1080, 3);
    expect(m.resolution).toBe(2);
    expect(m.height).toBeCloseTo(DESIGN_H);
    expect(m.width).toBeGreaterThanOrEqual(DESIGN_W);
  });

  it('keeps at least the design width on narrow screens', () => {
    const m = computeStage(390, 844, 3);
    expect(m.width).toBeCloseTo(DESIGN_W);
    expect(m.portrait).toBe(true);
  });

  it('uses a wide logical width on phones in landscape', () => {
    const m = computeStage(844, 390, 3);
    expect(m.height).toBeCloseTo(DESIGN_H);
    expect(m.width).toBeGreaterThan(1500);
    expect(m.bakeResolution).toBeLessThanOrEqual(2);
    expect(m.bakeResolution).toBeGreaterThanOrEqual(1);
  });
});

describe('Rng', () => {
  it('is deterministic for the same seed', () => {
    const a = new Rng('asteroids');
    const b = new Rng('asteroids');
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('differs for different seeds and stays in range', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    let same = 0;
    for (let i = 0; i < 50; i++) {
      const x = a.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      if (x === b.next()) same++;
    }
    expect(same).toBeLessThan(3);
  });

  it('int() is inclusive and pick() returns members', () => {
    const r = new Rng(9);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(r.int(1, 3));
    expect([...seen].sort()).toEqual([1, 2, 3]);
    expect(['a', 'b']).toContain(r.pick(['a', 'b']));
  });

  it('hashString is stable', () => {
    expect(hashString('space')).toBe(hashString('space'));
    expect(hashString('space')).not.toBe(hashString('sky'));
  });
});

describe('Pool', () => {
  it('acquires up to capacity without allocating and releases by swap', () => {
    let made = 0;
    const pool = new Pool(3, (i) => ({ i, made: ++made }));
    expect(made).toBe(3);
    const a = pool.acquire();
    const b = pool.acquire();
    const c = pool.acquire();
    expect(pool.acquire()).toBeNull();
    expect(made).toBe(3);
    pool.releaseAt(0);
    expect(pool.count).toBe(2);
    expect(pool.items.slice(0, 2)).toContain(b);
    expect(pool.items.slice(0, 2)).toContain(c);
    expect(a).not.toBeNull();
  });
});

describe('math helpers', () => {
  it('angleDiff takes the short way round', () => {
    expect(angleDiff(0.1, Math.PI * 2 - 0.1)).toBeCloseTo(-0.2);
    expect(angleDiff(-3, 3)).toBeCloseTo(6 - Math.PI * 2);
  });
  it('clamp and segment distance', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(distToSegment2(0, 5, -10, 0, 10, 0)).toBeCloseTo(25);
    expect(distToSegment2(20, 0, -10, 0, 10, 0)).toBeCloseTo(100);
  });
  it('formats times for kids', () => {
    expect(formatRaceTime(65.37)).toBe('1:05.3');
    expect(formatPlaytime(59)).toBe('0 min');
    expect(formatPlaytime(3600 + 5 * 60)).toBe('1 h 05 min');
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
