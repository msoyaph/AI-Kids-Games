import { describe, expect, it } from 'vitest';
import { FLASH_LIMIT_HZ, FX } from '../../src/render/fx';
import { EVOLVE_SWAPS } from '../../src/render/evolution';

describe('no flashing (at most 3 flashes a second)', () => {
  it('every repeating brightness effect is slower than 3 a second', () => {
    for (const [name, hz] of Object.entries(FX)) expect(hz, name).toBeLessThan(FLASH_LIMIT_HZ);
  });

  it('growing swaps shapes at most 3 times in any second', () => {
    expect(EVOLVE_SWAPS.length).toBeGreaterThan(0);
    const times: number[] = [];
    let t = 600; // the glow before the first swap
    for (const gap of EVOLVE_SWAPS) { times.push(t); t += gap; }
    for (const start of times) expect(times.filter(x => x >= start && x < start + 1000).length).toBeLessThanOrEqual(FLASH_LIMIT_HZ);
  });
});
