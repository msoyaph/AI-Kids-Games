import { describe, expect, it } from 'vitest';
import { MemoryStore, SafeLocalStore, type KeyValueStore } from '../../src/core/storage';
import { applyRunResult, buy, checkAchievements, goldForRun, metaBonuses, nextCost, refundAll, type RunSummary } from '../../src/meta/progression';
import { readFileSync } from 'node:fs';
import { SAVE_BACKUP_KEY, SAVE_KEY, SAVE_VERSION, SaveManager, defaultSave, sanitizeSave } from '../../src/meta/save';

function summary(p: Partial<RunSummary> = {}): RunSummary {
  return {
    characterId: 'thea',
    mapId: 'meadow',
    difficulty: 'normal',
    tier: 0,
    daily: null,
    goldMult: 1,
    slideDistance: 0,
    banishes: 0,
    killsByType: {},
    acquired: { weapons: [], passives: [] },
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
    expect(d.settings.quality).toBe('auto');
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

describe('save format upgrades', () => {
  const v1Raw = readFileSync('tests/fixtures/save-v1.json', 'utf8');
  const v1 = JSON.parse(v1Raw) as Record<string, unknown> & { stats: Record<string, unknown> };

  it('migrates the real v1 save without losing anything', () => {
    const d = sanitizeSave(v1);
    expect(d.version).toBe(SAVE_VERSION);
    expect(d.gold).toBe(v1.gold);
    expect(d.shop).toEqual(v1.shop);
    expect(d.unlockedCharacters.sort()).toEqual((v1.unlockedCharacters as string[]).sort());
    expect(d.unlockedWeapons.sort()).toEqual((v1.unlockedWeapons as string[]).sort());
    expect(d.achievements.sort()).toEqual((v1.achievements as string[]).sort());
    for (const k of ['runsPlayed', 'wins', 'totalKills', 'bestTime', 'highestLevel', 'evolutions', 'shrinesBroken', 'totalGold']) {
      expect(d.stats[k as keyof typeof d.stats]).toEqual(v1.stats[k]);
    }
    expect(d.stats.bestTimeByChar).toEqual(v1.stats.bestTimeByChar);
    expect(d.stats.bossKills).toEqual(v1.stats.bossKills);
    expect(d.settings).toMatchObject(v1.settings as object); // v1 settings kept; new sub-objects defaulted
    expect(d.settings.controls.bindings.jump.keys).toEqual(['Space']);
    expect(d.settings.access.reducedMotion).toBe('auto');
    // v1 had a single map
    expect(d.stats.bestTimeByMap).toEqual({ meadow: v1.stats.bestTime });
    expect(d.unlockedMaps).toEqual(['meadow']); // no win yet
    expect(d.lastMap).toBe('meadow');
  });

  it('a v1 save with a win unlocks Rimewood', () => {
    const d = sanitizeSave({ ...v1, stats: { ...v1.stats, wins: 2 } });
    expect(d.stats.winsByMap).toEqual({ meadow: 2 });
    expect(d.unlockedMaps).toContain('rimewood');
  });

  it('backs up the old save once, just before the first write in the new format', () => {
    const store = new MemoryStore();
    store.set(SAVE_KEY, v1Raw);
    const m = new SaveManager(store);
    expect(store.get(SAVE_BACKUP_KEY)).toBeNull(); // loading alone writes nothing
    m.data.gold += 5;
    m.save();
    expect(store.get(SAVE_BACKUP_KEY)).toBe(v1Raw);
    expect(JSON.parse(store.get(SAVE_KEY)!).version).toBe(SAVE_VERSION);
    // later saves (and later sessions) never overwrite the backup
    m.data.gold += 5;
    m.save();
    new SaveManager(store).save();
    expect(store.get(SAVE_BACKUP_KEY)).toBe(v1Raw);
  });

  it('current-format saves are not backed up', () => {
    const store = new MemoryStore();
    const m = new SaveManager(store);
    m.save();
    new SaveManager(store).save();
    expect(store.get(SAVE_BACKUP_KEY)).toBeNull();
  });

  it('winning on Gloam Meadow unlocks Rimewood; Rimewood records stay separate', () => {
    const d = defaultSave();
    expect(d.unlockedMaps).toEqual(['meadow']);
    const lost = applyRunResult(d, summary({ time: 500 }));
    expect(lost.newMaps).toEqual([]);
    const won = applyRunResult(d, summary({ time: 1200, won: true }));
    expect(won.newMaps).toEqual(['rimewood']);
    expect(d.unlockedMaps).toContain('rimewood');
    applyRunResult(d, summary({ mapId: 'rimewood', time: 700 }));
    expect(d.stats.bestTimeByMap).toEqual({ meadow: 1200, rimewood: 700 });
    expect(d.stats.winsByMap).toEqual({ meadow: 1 });
  });

  it('drops a remembered map that is locked or unknown', () => {
    expect(sanitizeSave({ ...v1, lastMap: 'rimewood' }).lastMap).toBe('meadow');
    expect(sanitizeSave({ ...v1, lastMap: 'moon' }).lastMap).toBe('meadow');
    expect(sanitizeSave({ ...v1, version: 2, unlockedMaps: ['meadow', 'rimewood', 'moon'], lastMap: 'rimewood' }).unlockedMaps).toEqual(['meadow', 'rimewood']);
  });
});
