import { afterEach, describe, expect, it } from 'vitest';
import { GAME } from '../../src/config';
import { load, migrate, persistent, read, resetForTests, save, write } from '../../src/storage';

/** A stand-in for the browser's localStorage that records every key touched. */
function fakeStorage(fail = false) {
  const map = new Map<string, string>(), touched = new Set<string>();
  const storage = {
    getItem: (k: string) => { touched.add(k); return map.get(k) ?? null; },
    setItem: (k: string, v: string) => { touched.add(k); if (fail) throw new DOMException('blocked', 'SecurityError'); map.set(k, v); },
    removeItem: (k: string) => { touched.add(k); map.delete(k); },
    clear: () => { throw new Error('a game must never clear the whole origin'); },
    key: () => { throw new Error('a game must never list other keys'); },
    get length() { return map.size; },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  resetForTests();
  return { map, touched };
}

afterEach(() => { Reflect.deleteProperty(globalThis, 'localStorage'); resetForTests(); });

describe('storage', () => {
  it('only ever touches keys with the game prefix', () => {
    const { touched, map } = fakeStorage();
    save({ v: 2, best: 9, plays: 3, sound: false });
    expect(load()).toEqual({ v: 2, best: 9, plays: 3, sound: false });
    write('settings', '{}');
    read('settings');
    expect([...touched].every(key => key.startsWith(GAME.storagePrefix))).toBe(true);
    expect([...map.keys()].sort()).toEqual([`${GAME.storagePrefix}save`, `${GAME.storagePrefix}settings`]);
  });

  it('keeps working from memory when storage is blocked', () => {
    fakeStorage(true);
    expect(persistent()).toBe(false);
    save({ v: 2, best: 4, plays: 1, sound: true });
    expect(load().best).toBe(4);
  });

  it('upgrades a version 1 save without losing the best score', () => {
    expect(migrate({ best: 17 })).toEqual({ v: 2, best: 17, plays: 0, sound: true });
    const { map } = fakeStorage();
    map.set(`${GAME.storagePrefix}save`, JSON.stringify({ best: 12 }));
    expect(load()).toMatchObject({ v: 2, best: 12 });
  });

  it('never trusts a broken save', () => {
    const { map } = fakeStorage();
    map.set(`${GAME.storagePrefix}save`, '{not json');
    expect(load()).toEqual({ v: 2, best: 0, plays: 0, sound: true });
    expect(migrate({ v: 2, best: -5, plays: 'lots' })).toEqual({ v: 2, best: 0, plays: 0, sound: true });
  });
});
