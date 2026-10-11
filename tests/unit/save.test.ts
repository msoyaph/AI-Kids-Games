import { describe, expect, it } from 'vitest';
import { defaultSave, migrate, SAVE_KEY, SAVE_VERSION, SaveStore, type KV } from '../../src/app/save';

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
