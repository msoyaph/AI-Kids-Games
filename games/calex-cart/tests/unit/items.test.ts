import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';
import { ITEMS } from '../../src/data/items';
import { itemWeights, positionBucket, rollItem } from '../../src/sim/items/rolls';
import type { ItemId } from '../../src/data/types';

describe('item rolls', () => {
  it('maps positions to buckets', () => {
    expect(positionBucket(1, 8)).toBe(0);
    expect(positionBucket(8, 8)).toBe(4);
    expect(positionBucket(2, 8)).toBe(1);
    expect(positionBucket(4, 8)).toBe(2);
    expect(positionBucket(7, 8)).toBe(3);
    expect(positionBucket(1, 1)).toBe(2);
  });

  it('has 12 original items with sane weights', () => {
    expect(ITEMS.length).toBe(12);
    for (let b = 0; b < 5; b++) {
      const w = itemWeights(b, 'all');
      expect(Array.from(w).reduce((a, x) => a + x, 0)).toBeGreaterThan(0);
    }
  });

  it('first place never gets rocket dash, paper planes, magnets or triple turbos', () => {
    const rng = new Rng(1);
    const banned: ItemId[] = ['rocketDash', 'paperPlane', 'magnet', 'turbo3', 'cloud'];
    for (let i = 0; i < 3000; i++) expect(banned).not.toContain(rollItem(rng, 1, 8));
  });

  it('last place gets strong catch-up items more often than the leader', () => {
    const rng = new Rng(2);
    const strong = new Set<ItemId>(['rocketDash', 'turbo3', 'magnet', 'paperPlane']);
    let last = 0;
    let first = 0;
    for (let i = 0; i < 4000; i++) {
      if (strong.has(rollItem(rng, 8, 8))) last++;
      if (strong.has(rollItem(rng, 1, 8))) first++;
    }
    expect(last).toBeGreaterThan(1500);
    expect(first).toBe(0);
  });

  it('roll frequencies match the weight table', () => {
    const rng = new Rng(3);
    const counts = new Map<ItemId, number>();
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const id = rollItem(rng, 4, 8);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const w = itemWeights(2, 'all');
    const total = Array.from(w).reduce((a, x) => a + x, 0);
    ITEMS.forEach((it, i) => {
      const expected = (w[i] / total) * N;
      const got = counts.get(it.id) ?? 0;
      expect(Math.abs(got - expected)).toBeLessThan(Math.max(60, expected * 0.12));
    });
  });

  it('is deterministic with the same seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 200; i++) expect(rollItem(a, (i % 8) + 1, 8)).toBe(rollItem(b, (i % 8) + 1, 8));
  });

  it('respects item sets', () => {
    const rng = new Rng(5);
    for (let i = 0; i < 2000; i++) {
      const id = rollItem(rng, (i % 8) + 1, 8, 'boosts');
      expect(['turbo', 'turbo3', 'magnet', 'rocketDash', 'shield']).toContain(id);
    }
  });
});
