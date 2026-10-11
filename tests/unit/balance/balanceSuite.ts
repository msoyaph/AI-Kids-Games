import { describe, expect, it } from 'vitest';
import { DIFFICULTY_ORDER, starsFor } from '../../../src/data/difficulty';
import { mapsOfWorld } from '../../../src/data/worlds';
import { simulate } from '../../../src/sim/autoplay';

/**
 * Headless auto-play proves every campaign map can be won on Story, Normal and
 * Hard (Expert is report-only: `npm run sim -- expert`), and that Story is
 * very forgiving even for a less clever player.
 * (One file per world so Vitest runs the worlds in parallel.)
 */
export function balanceSuite(world: number): void {
  describe(`balance: world ${world}`, () => {
    for (const map of mapsOfWorld(world)) {
      for (const diff of DIFFICULTY_ORDER.filter((d) => d !== 'expert')) {
        it(`${map.id} is winnable on ${diff}`, () => {
          const r = simulate(map, diff, { seed: 1 });
          expect(r.won, `${map.id}/${diff} lost at wave ${r.wave}`).toBe(true);
          expect(r.wave).toBe(40);
        });
      }
      it(`${map.id} on Easy gives a casual player 3 stars`, () => {
        const r = simulate(map, 'easy', { seed: 2, skill: 'casual' });
        expect(r.won).toBe(true);
        expect(starsFor(r.lives, r.maxLives)).toBe(3);
      });
    }
  });
}
