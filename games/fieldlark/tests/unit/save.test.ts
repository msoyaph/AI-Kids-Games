/**
 * Saves are sacred: only our own keys, versioned, damaged saves repaired, newer saves left alone,
 * and the game keeps working (from memory) when storage is blocked.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { GAME } from '../../src/config';
import { decodeFarm, encodeFarm, loadFarm, saveFarm, SAVE_VERSION } from '../../src/save/save';
import { loadSettings, sanitizeSettings, saveSettings } from '../../src/save/settings';
import { persistent, read, resetForTests, write } from '../../src/save/storage';
import { newFarm } from '../../src/sim/state';

/** A fake localStorage that records every key touched and refuses whole-store operations. */
function fakeStorage(start: Record<string, string> = {}) {
  const data = new Map(Object.entries(start));
  const touched = new Set<string>();
  return {
    touched, data,
    getItem: (k: string) => { touched.add(k); return data.get(k) ?? null; },
    setItem: (k: string, v: string) => { touched.add(k); data.set(k, v); },
    removeItem: (k: string) => { touched.add(k); data.delete(k); },
    clear: () => { throw new Error('clear() must never be called'); },
    key: () => { throw new Error('keys must never be listed'); },
    get length() { throw new Error('length must never be read'); },
  };
}

function useStorage(s: unknown) {
  Object.defineProperty(globalThis, 'localStorage', { value: s, configurable: true, writable: true });
  resetForTests();
}

afterEach(() => { useStorage(undefined); });

describe('saving', () => {
  it('round-trips a farm', () => {
    const farm = newFarm(42);
    farm.t = 1234.5; farm.coins = 777; farm.unlocked = ['home', 'meadow']; farm.flags = { tip_pan: 1 };
    farm.cam = { x: 30, z: 40, yawStep: 3, zoom: 50 };
    const back = decodeFarm(JSON.parse(JSON.stringify(encodeFarm(farm))));
    expect(back.status).toBe('ok');
    expect(back.farm).toEqual({ ...farm, v: SAVE_VERSION });
  });

  it('repairs damaged fields instead of failing', () => {
    const back = decodeFarm({ v: 1, seed: 5, t: 'soon', coins: -40, unlocked: ['meadow', 'moon'], cam: { x: 9999, yawStep: 12 } });
    expect(back.status).toBe('repaired');
    expect(back.farm.coins).toBeGreaterThanOrEqual(0);
    expect(back.farm.unlocked).toEqual(['home', 'meadow']);
    expect(back.farm.cam.x).toBeLessThanOrEqual(56);
    expect(back.farm.cam.yawStep).toBeLessThanOrEqual(7);
    expect(decodeFarm(null).status).toBe('new');
    expect(decodeFarm('broken').status).toBe('new');
  });

  it('leaves a save from a newer version of the game alone', () => {
    expect(decodeFarm({ v: SAVE_VERSION + 1, seed: 3 }).status).toBe('future');
  });

  it('only ever touches keys with the game’s prefix', () => {
    const s = fakeStorage({ 'othergame.save': '{"keep":true}', 'aikg:favorites': '[]' });
    useStorage(s);
    saveFarm(newFarm(1));
    expect(loadFarm()?.status).toBe('ok');
    saveSettings(loadSettings());
    for (const k of s.touched) expect(k.startsWith(GAME.storagePrefix), k).toBe(true);
    expect(s.data.get('othergame.save')).toBe('{"keep":true}');
    expect([...s.data.keys()].filter(k => k.startsWith(GAME.storagePrefix)).sort()).toEqual([`${GAME.storagePrefix}save`, `${GAME.storagePrefix}settings`]);
  });

  it('keeps playing from memory when storage is blocked', () => {
    useStorage({ getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } });
    expect(persistent()).toBe(false);
    expect(write('save', 'x')).toBe(true);
    expect(read('save')).toBe('x');
  });

  it('checks every setting on load', () => {
    const s = sanitizeSettings({ textSize: 7, readAloud: 'yes', volume: { master: 3, music: -1 }, quality: 'ultra' });
    expect(s.textSize).toBe(0);
    expect(s.readAloud).toBe(false);
    expect(s.volume.master).toBe(1);
    expect(s.volume.music).toBe(0);
    expect(s.quality).toBe('auto');
  });
});

describe('a full or broken storage never loses a save', () => {
  /** Like fakeStorage, but full: any write that would make a value longer than before throws. */
  function fullStorage(start: Record<string, string>) {
    const s = fakeStorage(start);
    const set = s.setItem;
    s.setItem = (k: string, v: string) => {
      if (k.endsWith('__probe')) return set(k, v);
      if (v.length > (s.data.get(k)?.length ?? 0)) { const e = new Error('The quota has been exceeded.'); e.name = 'QuotaExceededError'; throw e; }
      set(k, v);
    };
    return s;
  }

  it('a refused write reports false, and the last save stays whole', () => {
    const farm = newFarm(5);
    farm.coins = 321;
    const before = JSON.stringify(encodeFarm(farm, 1000));
    const s = fullStorage({ [`${GAME.storagePrefix}save`]: before });
    useStorage(s);
    farm.coins = 999999;
    farm.objects.push(...farm.objects.slice(0, 20).map((o, i) => ({ ...o, id: 9000 + i })));
    expect(saveFarm(farm, 2000)).toBe(false);
    expect(s.data.get(`${GAME.storagePrefix}save`)).toBe(before);
    const back = loadFarm();
    expect(back && back.status !== 'broken' && back.farm.coins).toBe(321);
    expect(persistent()).toBe(true);
  });

  it('an unreadable save is copied aside before anything could overwrite it', () => {
    const s = fakeStorage({ [`${GAME.storagePrefix}save`]: '{"v":1,"coins":12' });
    useStorage(s);
    const r = loadFarm();
    expect(r).toEqual({ status: 'broken', kept: true });
    expect(s.data.get(`${GAME.storagePrefix}save.broken`)).toBe('{"v":1,"coins":12');
  });

  it('if the copy can’t be made either, it says so (and the game then won’t save over it)', () => {
    const s = fullStorage({ [`${GAME.storagePrefix}save`]: '{"v":1,"coins":12' });
    useStorage(s);
    expect(loadFarm()).toEqual({ status: 'broken', kept: false });
    expect(s.data.get(`${GAME.storagePrefix}save`)).toBe('{"v":1,"coins":12');
  });
});
