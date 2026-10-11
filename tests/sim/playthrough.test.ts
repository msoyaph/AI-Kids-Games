/**
 * Headless bot playthrough: a new game played by the bot through the real sim rules must
 * repair all six boards, place the Heartstone and reach the year-one finale — no soft-locks,
 * no exceptions, and the save must round-trip (under budget) every few nights.
 */
import { describe, expect, it } from 'vitest';
import { useMemoryStorage } from '../../src/core/storage';
import { BOARDS, FINALE_DAY } from '../../src/data/boards';
import { deserialize, serialize } from '../../src/sim/save';
import { TUNING } from '../../src/tuning';
import { Bot } from './bot';

useMemoryStorage();

function playYear(seed: number, checkSaves: boolean): Bot {
  const bot = new Bot(seed);
  while (bot.finaleDay < 0 && bot.sim.state.day <= FINALE_DAY + 5) {
    bot.playDay();
    if (checkSaves && bot.sim.state.day % 5 === 0) {
      const raw = serialize(bot.sim);
      expect(raw.length).toBeLessThan(TUNING.saveBudgetBytes);
      const back = deserialize(raw);
      expect(back.state.day).toBe(bot.sim.state.day);
      expect(back.state.story.bundles).toEqual(bot.sim.state.story.bundles);
      expect(back.p.coins).toBe(bot.sim.p.coins);
    }
  }
  return bot;
}

describe('year-one playthrough', () => {
  it('reaches the Winter 10 finale with every board repaired (seed 2026)', () => {
    const bot = playYear(2026, true);
    const st = bot.sim.state;
    expect(bot.missing()).toEqual([]);
    for (const b of BOARDS) expect(st.story.done, `board ${b.id}`).toContain(b.id);
    expect(st.story.heartstone).toBe(2);
    expect(bot.finaleDay).toBe(FINALE_DAY);
    expect(st.story.finale).toBe(1);
    // the bag never holds broken stacks
    expect(bot.sim.p.inv.every((s) => !s || (typeof s.id === 'string' && s.n > 0))).toBe(true);
  });

  it('other farms finish too (the finale waits kindly if a board is a day late)', () => {
    for (const seed of [11, 42]) {
      const bot = playYear(seed, false);
      expect(bot.missing(), `seed ${seed}`).toEqual([]);
      expect(bot.finaleDay, `seed ${seed}`).toBeGreaterThanOrEqual(FINALE_DAY);
      expect(bot.finaleDay, `seed ${seed}`).toBeLessThanOrEqual(FINALE_DAY + 2);
    }
  });
});
