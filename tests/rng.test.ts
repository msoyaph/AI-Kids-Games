import { describe, expect, it } from 'vitest';
import { Rng, dayRng, hashString } from '../src/core/rng';

describe('Rng', () => {
  it('is deterministic for the same seed', () => {
    const a = new Rng(42), b = new Rng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });
  it('differs for different seeds', () => {
    const a = new Rng(1), b = new Rng(2);
    const sa = Array.from({ length: 8 }, () => a.next());
    const sb = Array.from({ length: 8 }, () => b.next());
    expect(sa).not.toEqual(sb);
  });
  it('produces values in range', () => {
    const r = new Rng('range');
    for (let i = 0; i < 1000; i++) {
      const v = r.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      const f = r.next();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });
  it('forks are stable and independent', () => {
    const a = new Rng(9).fork('fish'), b = new Rng(9).fork('fish'), c = new Rng(9).fork('bugs');
    expect(a.next()).toBe(b.next());
    expect(new Rng(9).fork('fish').next()).not.toBe(c.next());
  });
  it('weighted pick respects zero weights', () => {
    const r = new Rng(5);
    for (let i = 0; i < 200; i++) expect(r.weighted(['a', 'b', 'c'], (x) => (x === 'b' ? 0 : 1))).not.toBe('b');
    expect(r.weighted([], () => 1)).toBeUndefined();
  });
  it('dayRng depends on day and purpose', () => {
    expect(dayRng(1, 3, 'weather').next()).toBe(dayRng(1, 3, 'weather').next());
    expect(dayRng(1, 3, 'weather').next()).not.toBe(dayRng(1, 4, 'weather').next());
    expect(hashString('abc')).toBe(hashString('abc'));
  });
});
