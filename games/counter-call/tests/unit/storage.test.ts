import { beforeEach, describe, expect, it } from 'vitest';
import { GAME } from '../../src/config';
import { dayOpen, defaultSave, endlessOpen, load, migrate, persistent, read, recordDay, recordEndless, resetForTests, save, write } from '../../src/storage';

function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => { throw new Error('the game must never clear storage'); },
    getItem: k => map.get(k) ?? null,
    key: i => [...map.keys()][i] ?? null,
    removeItem: k => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v)),
  };
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: fakeStorage(), configurable: true });
  resetForTests();
});

describe('storage', () => {
  it('prefixes every key and leaves other keys alone', () => {
    localStorage.setItem('someone.else', 'keep me');
    expect(save(recordDay(defaultSave(), 0, 2, 30))).toBe(true);
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!);
    expect(keys.filter(k => k !== 'someone.else').every(k => k.startsWith(GAME.storagePrefix))).toBe(true);
    expect(localStorage.getItem('someone.else')).toBe('keep me');
    expect(load().days[0]).toEqual({ stars: 2, coins: 30 });
  });

  it('keeps working from memory when storage is blocked', () => {
    Object.defineProperty(globalThis, 'localStorage', { get() { throw new Error('blocked'); }, configurable: true });
    resetForTests();
    expect(persistent()).toBe(false);
    write('save', '{"v":1,"plays":3}');
    expect(read('save')).toBe('{"v":1,"plays":3}');
    expect(load().plays).toBe(3);
  });

  it('cleans up broken or surprising saves', () => {
    expect(migrate(null)).toEqual(defaultSave());
    expect(migrate('nope')).toEqual(defaultSave());
    const s = migrate({ v: 1, sound: false, plays: -4, coins: 12.9, days: [{ stars: 99, coins: 'x' }, null] });
    expect(s).toEqual({ v: 2, sound: false, music: true, plays: 0, coins: 12, days: [{ stars: 3, coins: 0 }, { stars: 0, coins: 0 }], host: 'minty', upgrades: {}, endlessBest: 0 });
    const odd = migrate({ v: 2, host: '<b>', upgrades: { stove: 2, 'bad key': 3, tray: 'x', shoes: 99 }, endlessBest: -3 });
    expect(odd.host).toBe('minty');
    expect(odd.upgrades).toEqual({ stove: 2, shoes: 9 });
    expect(odd.endlessBest).toBe(0);
    localStorage.setItem(GAME.storagePrefix + 'save', '{not json');
    expect(load()).toEqual(defaultSave());
  });

  it('keeps everything from a version 1 save and adds the new parts', () => {
    localStorage.setItem(GAME.storagePrefix + 'save', JSON.stringify({ v: 1, sound: true, music: false, plays: 7, coins: 230, days: [{ stars: 3, coins: 41 }, { stars: 2, coins: 77 }] }));
    expect(load()).toEqual({ v: 2, sound: true, music: false, plays: 7, coins: 230, days: [{ stars: 3, coins: 41 }, { stars: 2, coins: 77 }], host: 'minty', upgrades: {}, endlessBest: 0 });
  });

  it('remembers the chosen host, and the best Endless Rush', () => {
    let data = { ...defaultSave(), host: 'double' };
    expect(endlessOpen(data)).toBe(false);
    for (let day = 0; day < 3; day++) data = recordDay(data, day, 1, 10);
    expect(endlessOpen(data)).toBe(true);
    data = recordEndless(data, 14, 120);
    data = recordEndless(data, 9, 60);
    expect(data.endlessBest).toBe(14);
    expect(data.coins).toBe(210);
    save(data);
    expect(load()).toEqual(data);
  });

  it('opens the next day after a star and keeps best results', () => {
    let data = defaultSave();
    expect(dayOpen(data, 0)).toBe(true);
    expect(dayOpen(data, 1)).toBe(false);
    data = recordDay(data, 0, 0, 5);
    expect(dayOpen(data, 1)).toBe(false);
    data = recordDay(data, 0, 2, 40);
    data = recordDay(data, 0, 1, 20);
    expect(data.days[0]).toEqual({ stars: 2, coins: 40 });
    expect(data.coins).toBe(65);
    expect(data.plays).toBe(3);
    expect(dayOpen(data, 1)).toBe(true);
    expect(dayOpen(data, 2)).toBe(false);
  });
});
