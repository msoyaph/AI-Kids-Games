import { describe, expect, it } from 'vitest';
import { terrainPixel } from '../../src/art/ground';
import { MAPS } from '../../src/data/maps/index';
import { TER, type Ter } from '../../src/data/terrain';

describe('ground art', () => {
  it('every terrain in every map theme paints a real colour on every pixel', () => {
    const themes = [...new Set(Object.values(MAPS).map(m => m.theme ?? 0))];
    expect(themes.length).toBeGreaterThan(8);
    const bad: string[] = [];
    for (const theme of themes) {
      for (const t of Object.keys(TER) as Ter[]) {
        for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
          const c = terrainPixel(t, x, y, theme);
          if (!Number.isInteger(c) || c < 0 || c > 0xffffff) { bad.push(`${t} theme ${theme} at ${x},${y}: ${c}`); break; }
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
