import { describe, expect, it } from 'vitest';
import { fingerprintWorld } from '../../src/sim/fingerprint';
import { simulateRun } from '../../src/sim/headless';
import type { World } from '../../src/sim/world';

/**
 * Golden determinism fingerprints for seeded 120 s bot runs.
 *
 * - `sim` cases drive the game with the original (v1) bot, so they only change when the
 *   *simulation* changes. A pure refactor must leave them alone.
 * - `bot` cases use the current bot (slides, hops, ramps), so they also change when the
 *   bot's play changes.
 *
 * When a change *intends* to alter either, update the hashes in the same commit and say why.
 */
const GOLDEN: Array<{ kind: 'sim' | 'bot'; hero: string; seed: number; hash: string }> = [
  // phase 3: flow-field pathing, walls, reachable-only spawns (intentional sim change)
  { kind: 'sim', hero: 'thea', seed: 4242, hash: '66152b2b' },
  { kind: 'sim', hero: 'brindle', seed: 9001, hash: '45b28f6c' },
  { kind: 'bot', hero: 'thea', seed: 4242, hash: 'b7560121' },
  { kind: 'bot', hero: 'brindle', seed: 9001, hash: '7b1d4823' },
];

describe('golden determinism', () => {
  for (const g of GOLDEN) {
    it(`${g.kind}: ${g.hero} seed ${g.seed} reproduces its fingerprint`, () => {
      let world: World | null = null;
      simulateRun({ characterId: g.hero, seed: g.seed, maxSeconds: 120, botMovement: g.kind === 'bot', onWorld: (w) => (world = w) });
      expect(fingerprintWorld(world!)).toBe(g.hash);
    });
  }
});
