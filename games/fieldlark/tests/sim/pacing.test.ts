/**
 * The playthrough: a bot plays new farms at a kid's pace (src/../tests/sim/bot.ts) from the gate key
 * to the credits. No dead ends, no chapter that drags, no long waits for coins, and the story takes
 * 6 to 8 hours of play on average (reading time included; the farm clock stops for the story).
 */
import { describe, expect, it } from 'vitest';
import { CHAPTERS } from '../../src/data/chapters';
import { newFarm } from '../../src/sim/state';
import { storyDone } from '../../src/sim/story';
import { Bot, type BotReport } from './bot';

const SEEDS = [1, 2, 3, 4, 5, 6];
const runs: { seed: number; r: BotReport }[] = SEEDS.map(seed => ({ seed, r: new Bot(newFarm(seed)).run() }));

describe('the playthrough', () => {
  it('reaches the credits on every farm, with no dead ends', () => {
    for (const { seed, r } of runs) expect(r.done, `seed ${seed}: ${r.stuck}`).toBe(true);
  });

  it('takes 6 to 8 hours of play on average', () => {
    const mean = runs.reduce((s, x) => s + x.r.hours, 0) / runs.length;
    expect(mean).toBeGreaterThanOrEqual(6);
    expect(mean).toBeLessThanOrEqual(8);
    for (const { seed, r } of runs) expect(r.hours, `seed ${seed}`).toBeLessThan(10);
  });

  it('never lets one chapter drag (under 4 hours each) or leaves the player waiting long for coins', () => {
    for (const { seed, r } of runs) {
      expect(r.chapters, `seed ${seed}`).toHaveLength(CHAPTERS.length);
      r.chapters.forEach((h, i) => expect(h - (r.chapters[i - 1] ?? 0), `seed ${seed} chapter ${i + 1}`).toBeLessThan(4));
      expect(r.longestCoinWait, `seed ${seed}`).toBeLessThan(10);
    }
  });
});

describe('starting over with nothing', () => {
  it('recovers from 0 coins and an empty barn at the start of every chapter', () => {
    const farm = newFarm(11);
    for (let ch = 0; ch < CHAPTERS.length; ch++) {
      new Bot(farm, { until: f => f.story.chapter >= ch }).run();
      if (storyDone(farm)) break;
      const poor = structuredClone(farm);
      poor.coins = 0;
      poor.inv = {};
      for (const o of poor.objects) if (o.kind === 'field') { o.crop = null; o.variety = null; }
      const r = new Bot(poor, { maxHours: 5, until: f => f.story.chapter > ch }).run();
      expect(poor.story.chapter, `chapter ${ch + 1} from nothing: ${r.stuck}`).toBeGreaterThan(ch);
    }
  });
});
