import { describe, expect, it } from 'vitest';
import { FlashLimiter } from '../../src/render/flash';

describe('flash safety', () => {
  it('allows at most 3 glows in any one-second window', () => {
    const f = new FlashLimiter(3);
    const allowed: number[] = [];
    for (let t = 0; t < 5000; t += 50) if (f.allow(t)) allowed.push(t);
    for (const t of allowed) expect(allowed.filter(u => u > t - 1000 && u <= t).length).toBeLessThanOrEqual(3);
    expect(allowed.length).toBeGreaterThan(10); // still celebrates regularly
  });
});
