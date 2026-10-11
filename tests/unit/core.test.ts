import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';
import { SpatialHash } from '../../src/sim/spatialHash';
import { Terrain } from '../../src/sim/terrain';

describe('Rng', () => {
  it('is deterministic for a seed', () => {
    const a = new Rng(1234);
    const b = new Rng(1234);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('differs between seeds and stays in [0,1)', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    let same = 0;
    for (let i = 0; i < 100; i++) {
      const x = a.next();
      const y = b.next();
      if (x === y) same++;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
    expect(same).toBeLessThan(3);
  });

  it('weightedIndex respects zero weights', () => {
    const r = new Rng(9);
    for (let i = 0; i < 200; i++) expect(r.weightedIndex([0, 5, 0, 1])).not.toBe(0);
    expect(r.weightedIndex([0, 0])).toBe(-1);
  });
});

describe('Terrain', () => {
  it('generates the same map for the same seed', () => {
    const a = new Terrain(77);
    const b = new Terrain(77);
    expect(a.structures.length).toBe(b.structures.length);
    expect(a.props.length).toBe(b.props.length);
    for (let i = 0; i < 50; i++) {
      const x = (i * 37) % 280 - 140;
      const z = (i * 53) % 280 - 140;
      expect(a.height(x, z)).toBe(b.height(x, z));
    }
  });

  it('has mesas with ramps and a gentle spawn area', () => {
    const t = new Terrain(5);
    expect(t.structures.some((s) => s.kind === 'mesa')).toBe(true);
    expect(t.structures.some((s) => s.kind === 'ramp')).toBe(true);
    expect(Math.abs(t.height(0, 0) - t.height(3, 3))).toBeLessThan(1);
    expect(t.shrineSpots.length).toBeGreaterThanOrEqual(14);
  });
});

describe('SpatialHash', () => {
  it('finds items in range and the nearest one', () => {
    const n = 500;
    const xs = new Float32Array(n);
    const zs = new Float32Array(n);
    const alive = new Uint8Array(n).fill(1);
    const r = new Rng(3);
    for (let i = 0; i < n; i++) {
      xs[i] = r.range(-100, 100);
      zs[i] = r.range(-100, 100);
    }
    const g = new SpatialHash(150, 4, n);
    g.build(xs, zs, alive, n);
    const out = new Int32Array(n);
    const c = g.query(10, -5, 12, out);
    const found = new Set(Array.from(out.subarray(0, c)));
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(xs[i] - 10, zs[i] + 5);
      if (d <= 12) expect(found.has(i)).toBe(true);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    expect(g.nearest(10, -5, 200, xs, zs, null)).toBe(best);
  });
});
