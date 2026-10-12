import { describe, expect, it } from 'vitest';
import { hashString, Rng } from '../../src/core/rng';

describe('Rng', () => {
  it('is deterministic for a seed', () => {
    const a = new Rng(1234);
    const b = new Rng(1234);
    for (let i = 0; i < 100; i++) expect(a.nextU32()).toBe(b.nextU32());
  });

  it('differs between seeds', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    let same = 0;
    for (let i = 0; i < 50; i++) if (a.nextU32() === b.nextU32()) same++;
    expect(same).toBeLessThan(2);
  });

  it('produces floats in [0,1) and ints in range', () => {
    const r = new Rng(99);
    for (let i = 0; i < 2000; i++) {
      const f = r.next();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = r.int(3, 7);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(7);
    }
  });

  it('forks are reproducible and independent', () => {
    const r = new Rng(5);
    expect(r.fork(1).nextU32()).toBe(new Rng(5).fork(1).nextU32());
    expect(r.fork(1).nextU32()).not.toBe(r.fork(2).nextU32());
  });

  it('hashes strings stably', () => {
    expect(hashString('vanex')).toBe(hashString('vanex'));
    expect(hashString('vanex')).not.toBe(hashString('vanex2'));
  });
});
