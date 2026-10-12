import { describe, expect, it } from 'vitest';
import { mapById } from '../../../src/data/maps';
import { bonusesFrom, RESEARCH_IDS } from '../../../src/data/research';
import { TUNING, type AbilityId } from '../../../src/data/tuning';
import { simulate } from '../../../src/sim/autoplay';

// The hardest challenge-medal cells from `npm run balance-report`: every medal
// must stay earnable once research is done (good bot + full kit, Normal).
const FULL = {
  hero: 'vanguard' as const,
  abilities: ['meteor', 'chrono', 'funds'] as AbilityId[],
  bonuses: bonusesFrom(Object.fromEntries(RESEARCH_IDS.map((id) => [id, TUNING.research[id]!.cost.length]))),
};

describe('challenge medals stay earnable with research', () => {
  for (const [map, mod] of [
    ['w3m1', 'pure'],
    ['w4m3', 'iron'],
    ['w2m2', 'speed'],
  ] as const) {
    it(`${map} ${mod}`, () => {
      const r = simulate(mapById(map)!, 'normal', { seed: 1, ...FULL, modifiers: [mod] });
      expect(r.won, `lost at wave ${r.wave}`).toBe(true);
    });
  }
});
