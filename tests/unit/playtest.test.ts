import { describe, expect, it } from 'vitest';
import { PLAYTEST_MAX_CHARS, PlaytestStore, trimToBudget, type PlaytestPlayer, type PlaytestRecord } from '../../src/save/playtest';
import { collectRecords, groupRecords, suggest } from '../../src/tuning/analyze';
import { BALANCE } from '../../src/tuning/balance';

function fakePlayer(over: Partial<PlaytestPlayer> = {}): PlaytestPlayer {
  return {
    racer: 'calex',
    weight: 'medium',
    body: 'zoomster',
    wheels: 'standard',
    glider: 'kite',
    input: 'keyboard',
    assist: 'off',
    autoAccel: false,
    pos: 5,
    of: 8,
    time: 130.5,
    projected: false,
    laps: [44.1, 43.2, 43.2],
    falls: 0,
    drift: 21.5,
    mt: [4, 3, 1],
    items: 5,
    hitsTaken: 2,
    hitsGiven: 1,
    dodges: 0,
    shortcuts: [1],
    start: 'boost',
    tricks: 3,
    pads: 6,
    walls: 4,
    offroad: 2.5,
    score: 0,
    ...over,
  };
}

function fakeRecord(n: number, over: Partial<PlaytestRecord> = {}, p: Partial<PlaytestPlayer> = {}): PlaytestRecord {
  return {
    n,
    build: 'test',
    mode: 'grandPrix',
    track: 'seashell-boardwalk',
    cls: 'pro',
    mirror: false,
    laps: 3,
    items: true,
    itemSet: 'all',
    ai: 7,
    quit: false,
    dur: 130,
    fps: 60,
    tier: 'high',
    touchDevice: false,
    p: [fakePlayer(p)],
    ...over,
  };
}

describe('playtest log', () => {
  it('trimToBudget drops the oldest races first and fits the budget', () => {
    const races = Array.from({ length: 400 }, (_, i) => fakeRecord(i + 1));
    const kept = trimToBudget(races, 20_000);
    expect(JSON.stringify(kept).length).toBeLessThanOrEqual(20_000);
    expect(kept.length).toBeGreaterThan(10);
    expect(kept[kept.length - 1].n).toBe(400); // newest kept
    expect(kept[0].n).toBeGreaterThan(1); // oldest dropped
  });

  it('store numbers races, stays under ~100 KB as a rolling buffer, and clears', () => {
    const store = new PlaytestStore();
    store.clear();
    for (let i = 0; i < 300; i++) store.add(fakeRecord(0));
    const all = store.all();
    expect(all[all.length - 1].n).toBe(300);
    expect(store.chars).toBeLessThanOrEqual(PLAYTEST_MAX_CHARS);
    expect(store.chars * 2).toBeLessThanOrEqual(100 * 1024); // UTF-16 bytes
    expect(all.length).toBeGreaterThan(40);
    store.clear();
    expect(store.count).toBe(0);
  });

  it('records contain no personal fields', () => {
    const json = JSON.stringify(fakeRecord(1));
    for (const bad of ['name', 'slot', 'email', 'date', 'user']) expect(json.toLowerCase()).not.toContain(`"${bad}`);
  });
});

describe('playtest analyzer', () => {
  it('collects records from exports, arrays and bare records', () => {
    const rec = fakeRecord(1);
    const got = collectRecords([{ game: 'calex-cart', format: 1, build: 'x', races: [rec, rec] }, [rec], rec, 'junk', null]);
    expect(got.length).toBe(4);
  });

  it('suggests easing the AI when players always finish last, and never edits BALANCE', () => {
    const before = JSON.stringify(BALANCE);
    const recs = Array.from({ length: 30 }, (_, i) => fakeRecord(i + 1, { track: i % 2 ? 'seashell-boardwalk' : 'canyon-run' }, { pos: 8 }));
    const groups = groupRecords(recs);
    const sug = suggest(groups);
    const ai = sug.find((s) => s.field === 'BALANCE.classes.pro.aiSkill');
    expect(ai).toBeTruthy();
    expect(Number(ai!.suggested)).toBeLessThan(BALANCE.classes.pro.aiSkill);
    expect(JSON.stringify(BALANCE)).toBe(before);
  });

  it('flags tracks where players fall far more than the AI', () => {
    const recs = Array.from({ length: 12 }, (_, i) => fakeRecord(i + 1, {}, { falls: 4, pos: 3 }));
    const sug = suggest(groupRecords(recs), new Map([['seashell-boardwalk|pro', { winnerTime: 125, bestLap: 40, fallsPerRacer: 0.1, miniTurbosPerRacer: [5, 4, 1] }]]));
    expect(sug.some((s) => s.field.includes('seashell-boardwalk'))).toBe(true);
  });

  it('counts quits separately from finished races', () => {
    const recs = [fakeRecord(1), fakeRecord(2, { quit: true }, { time: -1 })];
    const [g] = groupRecords(recs);
    expect(g.races).toBe(2);
    expect(g.quits).toBe(1);
    expect(g.finished).toBe(1);
  });
});
