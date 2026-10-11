import { describe, expect, it } from 'vitest';
import { MemoryStore, SafeLocalStore, type KeyValueStore } from '../../src/core/storage';
import { applyRunResult, buy, checkAchievements, goldForRun, metaBonuses, nextCost, refundAll, type RunSummary } from '../../src/meta/progression';
import { SAVE_KEY, SaveManager, defaultSave, sanitizeSave } from '../../src/meta/save';

function summary(p: Partial<RunSummary> = {}): RunSummary {
  return {
    characterId: 'thea',
    time: 300,
    won: false,
    level: 12,
    kills: 400,
    coins: 30,
    bossKills: {},
    evolutions: 0,
    shrinesBroken: 1,
    topSpeed: 12,
    greed: 0,
    weapons: [],
    passives: [],
    ...p,
  };
}

/** A store whose every call throws, like localStorage in a sandboxed iframe. */
class ThrowingStore implements KeyValueStore {
  readonly persistent = false;
  get(): string | null {
    throw new Error('SecurityError');
  }
  set(): boolean {
    throw new Error('SecurityError');
  }
  remove(): void {
    throw new Error('SecurityError');
  }
}

describe('save / load', () => {
  it('round-trips through a store', () => {
    const store = new MemoryStore();
    const a = new SaveManager(store);
    a.data.gold = 321;
    a.data.shop.might = 2;
    a.data.stats.totalKills = 999;
    a.data.settings.musicVolume = 0.25;
    expect(a.save()).toBe(true);
    const b = new SaveManager(store);
    expect(b.data.gold).toBe(321);
    expect(b.data.shop.might).toBe(2);
    expect(b.data.stats.totalKills).toBe(999);
    expect(b.data.settings.musicVolume).toBe(0.25);
  });

  it('recovers from corrupted JSON with defaults', () => {
    const store = new MemoryStore();
    store.set(SAVE_KEY, '{not json');
    const s = new SaveManager(store);
    expect(s.data).toEqual(defaultSave());
  });

  it('sanitizes bad values, unknown ids and out-of-range numbers', () => {
    const d = sanitizeSave({
      gold: -50,
      shop: { might: 99, bogus: 3 },
      unlockedCharacters: ['pip', 'nobody', 42],
      unlockedWeapons: ['frostFan', 'laserCannon'],
      achievements: ['kills1000', 'fake'],
      stats: { totalKills: 'many', bestTime: 640 },
      settings: { masterVolume: 7, quality: 'ultra', invertY: 'yes' },
    });
    expect(d.gold).toBe(0);
    expect(d.shop.might).toBe(5);
    expect(d.shop.bogus).toBeUndefined();
    expect(d.unlockedCharacters).toContain('thea');
    expect(d.unlockedCharacters).toContain('pip');
    expect(d.unlockedCharacters).not.toContain('nobody');
    expect(d.unlockedWeapons).toEqual(['frostFan']);
    expect(d.achievements).toEqual(['kills1000']);
    expect(d.stats.totalKills).toBe(0);
    expect(d.stats.bestTime).toBe(640);
    expect(d.settings.masterVolume).toBe(1);
    expect(d.settings.quality).toBe('high');
    expect(d.settings.invertY).toBe(false);
  });

  it('never throws when storage is unavailable', () => {
    const s = new SaveManager(new ThrowingStore());
    expect(s.data.gold).toBe(0);
    s.data.gold = 5;
    expect(() => s.save()).not.toThrow();
    expect(s.save()).toBe(false);
  });

  it('SafeLocalStore falls back to memory outside the browser', () => {
    const st = new SafeLocalStore();
    expect(st.persistent).toBe(false);
    st.set('k', 'v');
    expect(st.get('k')).toBe('v');
  });
});

describe('shop', () => {
  it('buys ranks with escalating cost and caps at max rank', () => {
    const d = defaultSave();
    d.gold = 10000;
    const c0 = nextCost(d, 'might')!;
    expect(buy(d, 'might')).toBe(true);
    const c1 = nextCost(d, 'might')!;
    expect(c1).toBeGreaterThan(c0);
    for (let i = 0; i < 10; i++) buy(d, 'might');
    expect(d.shop.might).toBe(5);
    expect(nextCost(d, 'might')).toBeNull();
    expect(metaBonuses(d).might).toBeCloseTo(0.25);
  });

  it('refuses purchases without enough gold', () => {
    const d = defaultSave();
    d.gold = 1;
    expect(buy(d, 'might')).toBe(false);
    expect(d.gold).toBe(1);
  });

  it('refund returns everything spent', () => {
    const d = defaultSave();
    d.gold = 1000;
    buy(d, 'maxHp');
    buy(d, 'maxHp');
    buy(d, 'greed');
    refundAll(d);
    expect(d.gold).toBe(1000);
    expect(d.shop).toEqual({});
  });
});

describe('run results and achievements', () => {
  it('banks gold and lifetime stats', () => {
    const d = defaultSave();
    const out = applyRunResult(d, summary());
    expect(out.gold.total).toBe(goldForRun(summary()).total);
    expect(d.gold).toBeGreaterThanOrEqual(out.gold.total);
    expect(d.stats.runsPlayed).toBe(1);
    expect(d.stats.totalKills).toBe(400);
    expect(d.stats.bestTime).toBe(300);
    expect(out.newBest).toBe(true);
  });

  it('greed scales the performance bonus', () => {
    const a = goldForRun(summary({ greed: 0 }));
    const b = goldForRun(summary({ greed: 0.5 }));
    expect(b.total).toBeGreaterThan(a.total);
  });

  it('unlocks Pip at 1,000 total kills and Brindle after surviving 10 minutes', () => {
    const d = defaultSave();
    expect(d.unlockedCharacters).toEqual(['thea']);
    applyRunResult(d, summary({ kills: 700 }));
    expect(d.unlockedCharacters).not.toContain('pip');
    const out = applyRunResult(d, summary({ kills: 350, time: 610 }));
    expect(d.unlockedCharacters).toContain('pip');
    expect(d.unlockedCharacters).toContain('brindle');
    expect(out.achievements.map((a) => a.id)).toEqual(expect.arrayContaining(['kills1000', 'survive10']));
  });

  it('live checks during a run grant rewards once without double counting stats', () => {
    const d = defaultSave();
    const run = summary({ bossKills: { grumblecap: 1 }, kills: 10 });
    const first = checkAchievements(d, run);
    expect(first.map((a) => a.id)).toContain('beatGrumblecap');
    expect(d.unlockedWeapons).toContain('frostFan');
    expect(checkAchievements(d, run)).toEqual([]);
    expect(d.stats.totalKills).toBe(0);
  });
});
