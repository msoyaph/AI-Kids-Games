import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  BACKUP_KEY,
  DAILY_KEEP,
  defaultSave,
  migrate,
  SAVE_KEY,
  SAVE_VERSION,
  SaveStore,
  STORAGE_BUDGET_BYTES,
  trimSave,
  WORKSHOP_SLOTS,
  type KV,
  type SaveData,
} from '../../src/app/save';
import { CAMPAIGN_MAPS } from '../../src/data/maps';
import { ACHIEVEMENTS } from '../../src/data/achievements';

class MemKV implements KV {
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

class BrokenKV implements KV {
  getItem(): string | null {
    throw new Error('SecurityError');
  }
  setItem(): void {
    throw new Error('QuotaExceeded');
  }
  removeItem(): void {
    throw new Error('nope');
  }
}

describe('save migrations', () => {
  it('upgrades a v1 prototype save to the current version', () => {
    const v1 = { version: 1, settings: { music: 0.2, sfx: 0.3, quality: 'low', shake: false }, stars: { w1m1: 3, w1m2: 1 }, tutorialDone: true };
    const out = migrate(v1);
    expect(out.version).toBe(SAVE_VERSION);
    expect(out.maps.w1m1!.stars.normal).toBe(3);
    expect(out.maps.w1m2!.stars.normal).toBe(1);
    expect(out.tutorialDone).toBe(true);
    expect(out.settings.music).toBe(0.2);
    expect(out.settings.quality).toBe('low');
    expect(out.settings.damageNumbers).toBe(true); // added in v3 with a default
    expect(out.lifetime.kills).toBe(0);
    expect((out as unknown as Record<string, unknown>).stars).toBeUndefined();
  });

  it('upgrades v2 → v3 keeping progress', () => {
    const v2 = { version: 2, settings: { music: 1, sfx: 1, quality: 'high', shake: true }, maps: { w2m1: { stars: { hard: 2 } } }, endlessBest: { w1m1: 17 }, achievements: { first_win: 5 }, tutorialDone: false };
    const out = migrate(v2);
    expect(out.version).toBe(SAVE_VERSION);
    expect(out.maps.w2m1!.stars.hard).toBe(2);
    expect(out.endlessBest.w1m1).toBe(17);
    expect(out.achievements.first_win).toBe(5);
    expect(out.lastDifficulty).toBe('normal');
  });

  it('migrates a real v3 save (made by the v1 game) with nothing lost', () => {
    const v3 = JSON.parse(readFileSync('tests/fixtures/save-v3.json', 'utf8'));
    const out = migrate(structuredClone(v3));
    expect(out.version).toBe(4);
    // progress carries over exactly
    expect(out.maps).toEqual(v3.maps);
    expect(out.endlessBest).toEqual(v3.endlessBest);
    expect(out.achievements).toEqual(v3.achievements);
    expect(out.lifetime).toEqual(v3.lifetime);
    expect(out.tutorialDone).toBe(true);
    expect(out.lastDifficulty).toBe('hard');
    for (const [k, v] of Object.entries(v3.settings)) expect(out.settings[k as keyof SaveData['settings']]).toEqual(v);
    // new v4 fields get defaults
    expect(out.settings.language).toBe('auto');
    expect(out.settings.reducedMotion).toBe('auto');
    expect(out.settings.hotkeys).toEqual({});
    expect(out.research).toEqual({});
    expect(out.workshop).toEqual([]);
    expect(out.daily).toEqual({});
    expect(out.hero).toBe('');
    // the old achievement ids still exist
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    for (const id of Object.keys(v3.achievements)) expect(ids.has(id)).toBe(true);
  });

  it('keeps a one-time backup of the pre-upgrade save', () => {
    const kv = new MemKV();
    const raw = readFileSync('tests/fixtures/save-v3.json', 'utf8');
    kv.setItem(SAVE_KEY, raw);
    const s = new SaveStore(kv);
    expect(s.totalStars()).toBeGreaterThan(0);
    s.flush();
    expect(kv.getItem(BACKUP_KEY)).toBe(raw);
    expect(JSON.parse(kv.getItem(SAVE_KEY)!).version).toBe(SAVE_VERSION);
    // a second load (already v4) leaves the backup alone
    new SaveStore(kv).flush();
    expect(kv.getItem(BACKUP_KEY)).toBe(raw);
    for (const k of kv.m.keys()) expect(k.startsWith('vanex-defense-')).toBe(true);
  });

  it('stays far under the storage budget even when everything is maxed', () => {
    const d = defaultSave();
    const diffs = ['easy', 'normal', 'hard', 'expert'] as const;
    // 18 maps worth of ids (campaign + 6 future), every star and medal
    const ids = [...CAMPAIGN_MAPS.map((m) => m.id), 'w5m1', 'w5m2', 'w5m3', 'w6m1', 'w6m2', 'w6m3'];
    for (const id of ids) {
      d.maps[id] = { stars: Object.fromEntries(diffs.map((x) => [x, 3])), medals: ['iron', 'pure', 'budget', 'nocombo', 'speed'] };
      d.endlessBest[id] = 999;
    }
    for (let i = 0; i < 80; i++) d.achievements[`badge_with_a_long_id_${i}`] = Date.now();
    for (let i = 0; i < 40; i++) d.research[`research_node_${i}`] = 5;
    for (let i = 0; i < 400; i++) d.daily[`2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}x${i}`] = 123456;
    for (let i = 0; i < 14; i++) d.workshop.push({ code: 'V1.' + 'A'.repeat(900), updated: Date.now(), validated: true });
    d.codexSeen = Array.from({ length: 120 }, (_, i) => `codex_entry_${i}`);
    d.lifetime.combos = Array.from({ length: 15 }, (_, i) => `combo${i}`);
    trimSave(d);
    expect(Object.keys(d.daily).length).toBe(DAILY_KEEP);
    expect(d.workshop.length).toBe(WORKSHOP_SLOTS);
    const bytes = JSON.stringify(d).length * 2; // UTF-16 worst case
    expect(bytes).toBeLessThan(STORAGE_BUDGET_BYTES / 4);
  });

  it('treats garbage and future versions as a fresh save', () => {
    expect(migrate(null)).toEqual(defaultSave());
    expect(migrate('lol')).toEqual(defaultSave());
    expect(migrate({ version: 999 })).toEqual(defaultSave());
  });
});

describe('SaveStore', () => {
  it('round-trips through storage (survives reload)', () => {
    const kv = new MemKV();
    const a = new SaveStore(kv);
    a.recordWin('w1m1', 'normal', 2);
    a.data.settings.music = 0.1;
    a.flush();
    const b = new SaveStore(kv);
    expect(b.stars('w1m1', 'normal')).toBe(2);
    expect(b.data.settings.music).toBe(0.1);
    expect(JSON.parse(kv.getItem(SAVE_KEY)!).version).toBe(SAVE_VERSION);
  });

  it('keeps the best stars only', () => {
    const s = new SaveStore(new MemKV());
    expect(s.recordWin('w1m1', 'easy', 3)).toBe(true);
    expect(s.recordWin('w1m1', 'easy', 1)).toBe(false);
    expect(s.stars('w1m1')).toBe(3);
    s.recordWin('w1m2', 'hard', 2);
    expect(s.totalStars()).toBe(5);
  });

  it('runs without storage and with throwing storage', () => {
    const none = new SaveStore(null);
    none.recordWin('w1m1', 'normal', 3);
    none.flush();
    expect(none.stars('w1m1')).toBe(3);
    expect(none.persistent).toBe(false);

    const broken = new SaveStore(new BrokenKV());
    broken.recordWin('w1m1', 'normal', 1);
    expect(() => broken.flush()).not.toThrow();
    expect(() => broken.reset()).not.toThrow();
  });

  it('reset wipes progress but keeps settings', () => {
    const kv = new MemKV();
    const s = new SaveStore(kv);
    s.recordWin('w1m1', 'normal', 3);
    s.data.settings.sfx = 0.05;
    s.reset();
    expect(s.totalStars()).toBe(0);
    expect(s.data.settings.sfx).toBe(0.05);
    expect(new SaveStore(kv).totalStars()).toBe(0);
  });
});
