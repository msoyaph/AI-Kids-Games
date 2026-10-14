/**
 * Pacing (docs/PLAN.md "Pacing target"): the playthrough bot plays the story on six seeds, like a kid
 * would (tests/sim/bot.ts). Every town reaches the festival; the story takes 6–8 hours on average and
 * 5.5–8.5 hours on every seed; no chapter takes over 75 minutes; nobody waits more than 90 s of play
 * for coins; and a town that starts every chapter with no coins at all still finishes (the grant).
 */
import { describe, expect, it } from 'vitest';
import { CHAPTERS } from '../../src/data/chapters';
import { playthrough, type BotRun } from './bot';

const SEEDS = [1, 2, 3, 4, 5, 6];
const H = 3600;
const minutes = (s: number) => Math.round(s / 6) / 10;

function report(seed: number, r: BotRun) {
  const per = r.chapters.map((t, i) => minutes(t - (r.chapters[i - 1] ?? 0)));
  // printed so balance changes can be compared run to run
  console.log(`seed ${seed}: ${(r.total / H).toFixed(2)} h, chapters ${per.join(' / ')} min, ${r.actions} actions, longest coin wait ${r.coinWait} s${r.stuck ? `, STUCK: ${r.stuck}` : ''}`);
  return per;
}

describe('pacing', () => {
  const runs = new Map<number, BotRun>();

  for (const seed of SEEDS) {
    it(`seed ${seed} reaches the festival in 5.5–8.5 hours, no chapter over 75 minutes`, () => {
      const r = playthrough(seed);
      runs.set(seed, r);
      const per = report(seed, r);
      expect(r.stuck).toBeNull();
      expect(r.chapters).toHaveLength(CHAPTERS.length);
      expect(r.total).toBeGreaterThanOrEqual(5.5 * H);
      expect(r.total).toBeLessThanOrEqual(8.5 * H);
      for (const m of per) expect(m).toBeLessThanOrEqual(75);
      expect(r.coinWait).toBeLessThanOrEqual(90);
    });
  }

  it('averages 6–8 hours', () => {
    expect(runs.size).toBe(SEEDS.length);
    const mean = [...runs.values()].reduce((n, r) => n + r.total, 0) / runs.size;
    console.log(`mean ${(mean / H).toFixed(2)} h`);
    expect(mean).toBeGreaterThanOrEqual(6 * H);
    expect(mean).toBeLessThanOrEqual(8 * H);
  });

  it('finishes every chapter even when it starts with no coins at all', () => {
    const r = playthrough(7, { broke: true, limit: 14 * H });
    report(7, r);
    expect(r.stuck).toBeNull();
    expect(r.town.stats.grants ?? 0).toBeGreaterThan(0);
  });
});
