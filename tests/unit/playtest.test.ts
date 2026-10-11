import { describe, expect, it } from 'vitest';
import { FrameStats, PLAYTEST_KEY, PLAYTEST_MAX_CHARS, PlaytestStore, type PlaytestRun } from '../../src/app/playtest';
import { STORAGE_BUDGET_BYTES } from '../../src/app/save';
import { perfVerdict } from '../../src/app/perfTest';
import { dedupe, groupRuns, lossCluster, runsFromExport, suggest, unusedTowers } from '../../scripts/lib/playtests';

class MemKV {
  m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
}

const run = (over: Partial<PlaytestRun> = {}): PlaytestRun => ({
  build: '2.0',
  day: '2026-10-11',
  map: 'w1m2',
  diff: 'normal',
  mode: 'campaign',
  modifiers: [],
  result: 'won',
  wave: 40,
  totalWaves: 40,
  lives: 18,
  maxLives: 20,
  gameSeconds: 1500,
  realSeconds: 900,
  speed: [0.5, 0.3, 0.2],
  pauses: 2,
  towers: { arrow: 6, flame: 2 },
  specs: ['flame.inferno'],
  upgrades: 10,
  sold: 1,
  abilities: 3,
  heroSpecials: 4,
  hero: { id: 'vanguard', level: 4 },
  leaksByWave: Array(40).fill(0),
  coinsEarned: 4000,
  coinsSpent: 3900,
  wavesSentEarly: 5,
  fps: { avg: 60, low1: 50 },
  quality: 'high',
  device: { w: 915, h: 412, dpr: 2.6, touch: true, renderer: 'webgl' },
  locale: 'en',
  ...over,
});

describe('playtest store', () => {
  it('is off until enabled, uses the vanex-defense- prefix and stays under its cap', () => {
    const kv = new MemKV();
    const s = new PlaytestStore(kv);
    expect(s.enabled).toBe(false);
    s.setEnabled(true);
    expect(PLAYTEST_KEY.startsWith('vanex-defense-')).toBe(true);
    for (let i = 0; i < 500; i++) s.add(run({ wave: i }));
    const raw = kv.getItem(PLAYTEST_KEY)!;
    expect(raw.length).toBeLessThanOrEqual(PLAYTEST_MAX_CHARS);
    // oldest runs went first
    expect(s.data.runs.at(-1)!.wave).toBe(499);
    expect(s.data.runs[0]!.wave).toBeGreaterThan(0);
    // reload keeps it; save + playtest together fit the shared budget
    expect(new PlaytestStore(kv).data.runs.length).toBe(s.data.runs.length);
    expect(PLAYTEST_MAX_CHARS * 2 + 50_000).toBeLessThan(STORAGE_BUDGET_BYTES);
  });

  it('records nothing personal', () => {
    const keys = Object.keys(run()).sort();
    expect(keys).not.toContain('name');
    const s = JSON.stringify(run());
    expect(s).not.toMatch(/T\d\d:\d\d/); // no clock time, only the day
    // only whitelisted fields
    expect(keys).toEqual(
      ['abilities', 'build', 'coinsEarned', 'coinsSpent', 'day', 'device', 'diff', 'fps', 'gameSeconds', 'hero', 'heroSpecials', 'leaksByWave', 'lives', 'locale', 'map', 'maxLives', 'mode', 'modifiers', 'pauses', 'quality', 'realSeconds', 'result', 'sold', 'specs', 'speed', 'totalWaves', 'towers', 'upgrades', 'wave', 'wavesSentEarly'].sort(),
    );
  });

  it('clearing and stopping removes the key entirely', () => {
    const kv = new MemKV();
    const s = new PlaytestStore(kv);
    s.setEnabled(true);
    s.add(run());
    s.clear();
    s.setEnabled(false);
    expect(kv.getItem(PLAYTEST_KEY)).toBeNull();
    // damaged data is ignored
    kv.setItem(PLAYTEST_KEY, '{nope');
    expect(new PlaytestStore(kv).data.runs).toEqual([]);
  });

  it('exports runs the analyzer can read back', () => {
    const s = new PlaytestStore(new MemKV());
    s.add(run());
    expect(runsFromExport(JSON.parse(s.exportJson()))).toHaveLength(1);
    expect(runsFromExport({ hello: 1 })).toEqual([]);
    expect(runsFromExport([run(), { map: 1 }])).toHaveLength(1);
  });
});

describe('frame stats', () => {
  it('average and slowest-1 % fps from a histogram', () => {
    const f = new FrameStats();
    for (let i = 0; i < 990; i++) f.add(1 / 60);
    for (let i = 0; i < 10; i++) f.add(0.1);
    expect(f.avgFps).toBeGreaterThan(50);
    expect(f.low1Fps).toBeCloseTo(10, 0);
    expect(perfVerdict({ avgFps: 60, low1Fps: 50 })).toBe('great');
    expect(perfVerdict({ avgFps: 45, low1Fps: 20 })).toBe('ok');
    expect(perfVerdict({ avgFps: 25, low1Fps: 10 })).toBe('slow');
  });
});

describe('playtest analysis', () => {
  it('suggests easing a map players keep losing at the same waves', () => {
    const leaks = Array(40).fill(0);
    leaks[22] = 8;
    const runs = [run(), ...[23, 23, 24, 22].map((w, i) => run({ result: 'lost', wave: w, lives: 0, realSeconds: 600 + i, leaksByWave: leaks.slice(0, w) }))];
    const [g] = groupRuns(dedupe([...runs, runs[1]!]));
    expect(g!.runs).toBe(5);
    expect(lossCluster(g!.endWaves)).toEqual({ from: 22, to: 24, count: 4 });
    const s = suggest(g!, [{ skill: 'good', won: true, lives: 15, maxLives: 20, wave: 40 }]);
    expect(s.map((x) => x.kind)).toContain('easier');
    expect(s.find((x) => x.kind === 'easier')!.text).toMatch(/waves 22–24/);
    expect(s.map((x) => x.kind)).toContain('spike');
  });

  it('flags maps that are too easy, slow pacing and poor frame rates', () => {
    const runs = [1, 2, 3].map(() => run({ lives: 20, speed: [0.1, 0.3, 0.6], fps: { avg: 35, low1: 18 } }));
    const [g] = groupRuns(runs);
    const kinds = suggest(g!, [{ skill: 'casual', won: true, lives: 20, maxLives: 20, wave: 40 }]).map((x) => x.kind);
    expect(kinds).toEqual(expect.arrayContaining(['harder', 'pace', 'performance']));
    expect(unusedTowers(groupRuns(Array(10).fill(run())), ['arrow', 'flame', 'gravity'])[0]!.text).toMatch(/gravity/);
  });

  it('stays quiet with too little data', () => {
    const [g] = groupRuns([run({ result: 'lost', wave: 5 })]);
    expect(suggest(g!, [])).toEqual([]);
  });
});
