/**
 * The economy: no single strategy wins by much. From the same mid-game farm, the bot plays two hours
 * with its usual mix, and again growing only one crop, or pricing everything on the stand the same
 * way, or skipping the workshops. None may earn more than 15% over the mix, so a varied farm is
 * always a good way to play.
 */
import { describe, expect, it } from 'vitest';
import { newFarm, type Farm } from '../../src/sim/state';
import { Bot, type BotOptions } from './bot';

const earned = (farm: Farm) => farm.ledger.reduce((s, p) => s + p.earned, 0);

function income(start: Farm, opts: BotOptions): number {
  const farm = structuredClone(start);
  const before = earned(farm);
  new Bot(farm, { ...opts, maxHours: 2 }).run();
  return earned(farm) - before;
}

describe('no dominant strategy', () => {
  // the same farm, at the start of chapter 5 (fields, animals, workshops, the stand, contracts)
  const start = newFarm(3);
  new Bot(start, { until: f => f.story.chapter >= 4 }).run();
  const mix = income(start, {});

  it('the mix earns well', () => { expect(mix).toBeGreaterThan(1000); });

  it.each(['wheat', 'strawberry', 'cabbage', 'onion', 'bokchoy', 'sugarbeet'])('growing only %s is not much better than the mix', crop => {
    expect(income(start, { crop })).toBeLessThanOrEqual(mix * 1.15);
  });

  it.each([0.6, 1.3, 1.6])('pricing the whole stand at %s is not much better than fair prices', standPrice => {
    expect(income(start, { standPrice })).toBeLessThanOrEqual(mix * 1.15);
  });

  it('skipping the workshops is not much better', () => {
    expect(income(start, { workshops: false })).toBeLessThanOrEqual(mix * 1.15);
  });
});
