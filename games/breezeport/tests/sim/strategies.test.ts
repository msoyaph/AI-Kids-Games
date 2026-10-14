/**
 * No single strategy dominates (docs/PLAN.md "Pacing target"). From a chapter-5 town (the bot's own),
 * two hours of play for each one-track strategy and for the balanced mix, with the story standing
 * still so every strategy has the same land. None earns more than 15% over the mix, and none ends
 * up happier than the mix (within a point of rounding).
 */
import { describe, expect, it } from 'vitest';
import { decodeTown, encodeTown } from '../../src/save/codec';
import { netPerDay } from '../../src/sim/budget';
import { ZONE } from '../../src/sim/state';
import { Bot, playthrough } from './bot';

const TWO_HOURS = 2 * 3600;

type Strategy = (b: Bot) => boolean;

/** Fix what the unhappiest home misses (some services, or any), plant trees, and run buses. */
function care(b: Bot, services: readonly string[], transit: boolean): boolean {
  const c = b.sim.census;
  const worst = [...c.homes].sort((x, y) => (c.needs.get(x.id)?.happy ?? 100) - (c.needs.get(y.id)?.happy ?? 100))[0];
  const n = worst ? c.needs.get(worst.id) : undefined;
  if (!n || n.happy >= 90) return false;
  for (const s of services) if (!n.services[s as keyof typeof n.services] && b.place(s)) return true;
  if (n.nature < 0.7 && b.plantTrees(2)) return true;
  if (transit && (b.sim.trips?.jams ?? 0) > 2 && b.busRoute()) return true;
  if (transit && b.paintLane('bike')) return true;
  return false;
}
const ALL = ['school', 'clinic', 'safety', 'library', 'community', 'recycling'];

const STRATEGIES: Record<string, Strategy> = {
  'the balanced mix': b => b.collect() || b.grow() || care(b, ALL, true),
  'only homes and shops': b => b.collect() || b.zoneStrip(ZONE.home) || b.zoneStrip(ZONE.shop, 4) || b.growRoads(),
  'only one kind of service': b => b.collect() || b.grow() || care(b, ['school'], true) || (b.town.coins > 600 && b.place('school')),
  'no transit': b => b.collect() || b.grow() || care(b, ALL, false),
  'as many trees as possible': b => b.collect() || b.plantTrees(4, true) || b.grow(),
  'roads everywhere': b => b.collect() || b.growRoads() || b.grow(),
};

function play(start: string, strategy: Strategy) {
  const town = decodeTown(start).town;
  const b = new Bot(0, town);
  b.storyOn = false;
  const end = town.t + TWO_HOURS;
  while (town.t < end) if (!strategy(b)) b.wait(6);
  const c = b.sim.refresh(true);
  return { net: netPerDay(town, c), happy: c.happy ?? 0, pop: c.population };
}

describe('no strategy dominates', () => {
  for (const seed of [2]) {
    it(`from seed ${seed}'s chapter-5 town`, () => {
      const r = playthrough(seed, { until: 5 });
      expect(r.stuck).toBeNull();
      const start = encodeTown(r.town);
      const results = Object.fromEntries(Object.entries(STRATEGIES).map(([name, s]) => [name, play(start, s)]));
      for (const [name, x] of Object.entries(results)) console.log(`${name}: ${Math.round(x.net)} coins a day, ${x.happy}% happy, ${x.pop} people`);
      const mix = results['the balanced mix']!;
      for (const [name, x] of Object.entries(results)) {
        if (name === 'the balanced mix') continue;
        expect(x.net, `${name} earns`).toBeLessThanOrEqual(mix.net * 1.15);
        expect(x.happy, `${name} happiness`).toBeLessThanOrEqual(mix.happy + 1);
      }
    });
  }
});
