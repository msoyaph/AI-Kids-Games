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
