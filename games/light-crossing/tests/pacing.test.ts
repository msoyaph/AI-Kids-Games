import { describe, expect, it } from 'vitest';

describe('pacing', () => {
  it('the estimated playthrough lands in the 5.5–6.5 hour window', async () => {
    const log = console.log;
    console.log = () => {};
    const { total, rows } = await import('../scripts/pacing');
    console.log = log;
    expect(total / 60).toBeGreaterThanOrEqual(5.5);
    expect(total / 60).toBeLessThanOrEqual(6.5);
    expect(rows.length).toBe(5);
    for (const r of rows) expect(r.minutes).toBeGreaterThan(20);
  });
});
