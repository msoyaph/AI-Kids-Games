import { describe, expect, it } from 'vitest';
import { read, useMemoryStorage } from '../../src/core/storage';
import { PLAYTEST_KEY, PlaytestRecorder, emptyLog, loadLog, quickSummary } from '../../src/game/playtest-log';

useMemoryStorage();
const device = { w: 390, h: 844, dpr: 3, touch: true, renderer: 'webgl', lowq: false };

describe('playtest log', () => {
  it('splits time into playing, paused and title, and closes days', () => {
    const rec = new PlaytestRecorder(emptyLog(device, 'abc'), '2026-10-11');
    rec.tick(30, 'title', 60);
    for (let i = 0; i < 600; i++) rec.tick(1, i % 6 === 0 ? 'paused' : 'play', 60);
    rec.menuOpened();
    rec.event(0, 600, 'firstHarvest');
    rec.endDay({ slot: 1, day: 0, bed: 1320, passedOut: false, coins: 640, boards: 0, bundles: 1, deepest: 0 });
    const log = rec.snapshot();
    expect(log.sessions[0].titleSec).toBe(30);
    expect(log.sessions[0].playSec + log.sessions[0].pausedSec).toBe(600);
    expect(log.sessions[0].pausedSec).toBe(100);
    expect(log.days[0]).toMatchObject({ day: 0, playSec: 500, pausedSec: 100, menus: 1, bed: 1320 });
    expect(quickSummary(log)).toEqual({ minutes: 10, days: 1, perDay: 10 });
  });

  it('stores locally under cliffvalley.playtest with nothing personal, and resumes', () => {
    const rec = new PlaytestRecorder(emptyLog(device, 'xyz'), '2026-10-11');
    rec.tick(5, 'play', 58);
    expect(rec.flush()).toBe(true);
    const raw = read(PLAYTEST_KEY)!;
    expect(raw).toContain('"game":"cliff-valley"');
    expect(raw).not.toMatch(/name|farm|pet|birthday|email/i);
    const again = loadLog(device, () => 'new');
    expect(again.id).toBe('xyz');
    const rec2 = new PlaytestRecorder(again, '2026-10-12');
    expect(rec2.s).toBe(1);
    expect(rec2.log.sessions.length).toBe(2);
  });
});
