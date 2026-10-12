import { describe, expect, it } from 'vitest';
import { FpsGovernor } from '../../src/render/quality';

function feed(g: FpsGovernor, ms: number, seconds: number): ('down' | 'up' | null)[] {
  const out: ('down' | 'up' | null)[] = [];
  for (let t = 0; t < seconds; t += ms / 1000) out.push(g.sample(ms, ms / 1000));
  return out;
}

describe('FpsGovernor (adaptive quality)', () => {
  it('leaves quality alone at a steady 60 fps', () => {
    const g = new FpsGovernor('high');
    expect(feed(g, 16.7, 20).filter(Boolean)).toHaveLength(0);
    expect(g.tier).toBe('high');
    expect(g.resScale).toBe(1);
  });

  it('lowers resolution first when a little slow, then the tier', () => {
    const g = new FpsGovernor('high');
    feed(g, 25, 4); // 40 fps
    expect(g.resScale).toBeLessThan(1);
    feed(g, 25, 12);
    expect(g.tier).not.toBe('high');
  });

  it('drops a whole tier quickly when very slow', () => {
    const g = new FpsGovernor('high');
    feed(g, 60, 3); // ~16 fps
    expect(g.tier).toBe('medium');
    feed(g, 60, 3);
    expect(g.tier).toBe('low');
    feed(g, 60, 6);
    expect(g.tier).toBe('low');
    expect(g.resScale).toBeGreaterThanOrEqual(0.7);
  });

  it('ignores single hitches (tab switches, GC)', () => {
    const g = new FpsGovernor('medium');
    feed(g, 16.7, 2);
    g.sample(400, 0.4);
    feed(g, 16.7, 2);
    expect(g.tier).toBe('medium');
  });
});
