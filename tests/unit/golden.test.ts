import { describe, expect, it } from 'vitest';
import { fingerprintWorld } from '../../src/sim/fingerprint';
import { simulateRun } from '../../src/sim/headless';
import type { World } from '../../src/sim/world';

/**
 * Golden determinism fingerprints: two seeded 120 s bot runs. A pure refactor must not
 * change these. When a change *intends* to alter the simulation (new pathing, new random
 * streams, rebalancing), update the expected values in the same commit and say why.
 */
const GOLDEN: Array<{ hero: string; seed: number; hash: string }> = [
  { hero: 'thea', seed: 4242, hash: '2055916a' },
  { hero: 'brindle', seed: 9001, hash: 'f4beddb6' },
];

describe('golden determinism', () => {
  for (const g of GOLDEN) {
    it(`${g.hero} seed ${g.seed} reproduces its fingerprint`, () => {
      let world: World | null = null;
      simulateRun({ characterId: g.hero, seed: g.seed, maxSeconds: 120, onWorld: (w) => (world = w) });
      expect(fingerprintWorld(world!)).toBe(g.hash);
    });
  }
});
