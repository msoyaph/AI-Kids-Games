/**
 * The playtest pipeline end to end: a bot year recorded through the real PlaytestRecorder,
 * exported as JSON and summarized by scripts/analyze-playtests.mjs — its projection should
 * agree with the bot's own clock.
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { useMemoryStorage } from '../../src/core/storage';
import { FINALE_DAY } from '../../src/data/boards';
import { PlaytestRecorder, emptyLog, type PlaytestLog } from '../../src/game/playtest-log';
import { Bot } from './bot';

useMemoryStorage();

interface Analyzer {
  loadLogs(paths: string[]): PlaytestLog[];
  summarize(logs: PlaytestLog[]): { projected: number; markdown: string; players: { days: number; finaleDay?: number }[] };
}

describe('playtest export → analyze', () => {
  it('projects year one like the pacing model', async () => {
    const bot = new Bot(2026);
    const rec = new PlaytestRecorder(emptyLog({ w: 1280, h: 800, dpr: 1, touch: false, renderer: 'webgl', lowq: false }, 'bot2026'), '2026-10-11');
    while (bot.finaleDay < 0 && bot.sim.state.day <= FINALE_DAY + 3) {
      const before = bot.sim.state.story.done.length;
      const log = bot.playDay();
      const paused = log.pausedSec, play = log.realSec - log.pausedSec;
      rec.tick(play, 'play', 60);
      rec.tick(paused, 'paused', 60);
      if (log.did.includes('FINALE')) rec.event(log.day, 18 * 60, 'finale');
      for (const b of bot.sim.state.story.done.slice(before)) rec.event(bot.sim.state.day, 360, 'board', b);
      rec.endDay({ slot: 1, day: log.day, bed: Math.round(log.bed), passedOut: false, coins: log.coins, boards: log.boards, bundles: bot.sim.state.story.bundles.length, deepest: log.deepest });
    }
    const dir = mkdtempSync(join(tmpdir(), 'cv-playtest-'));
    writeFileSync(join(dir, 'bot.json'), JSON.stringify(rec.snapshot()));
    const mod = (await import(/* @vite-ignore */ pathToFileURL(resolve('scripts/analyze-playtests.mjs')).href)) as Analyzer;
    const logs = mod.loadLogs([dir]);
    expect(logs.length).toBe(1);
    const sum = mod.summarize(logs);
    const botHours = bot.realSec / 3600;
    expect(Math.abs(sum.projected - botHours)).toBeLessThan(0.75); // median day vs. mean incl. festivals
    expect(sum.players[0].finaleDay).toBe(FINALE_DAY);
    expect(sum.markdown).toContain('projected year one');
  });
});
