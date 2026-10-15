import { afterEach, describe, expect, it } from 'vitest';
import { GAME } from '../../src/config';
import { LEVELS } from '../../src/data/levels';
import { CHALLENGES } from '../../src/data/modes';
import { PLANTS } from '../../src/data/roster';
import { freshSave, load, migrate, save, SAVE_BUDGET } from '../../src/save/save';
import { persistent, read, remove, resetForTests, write } from '../../src/save/storage';

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
  it('only ever touches keys with the game prefix, and never clears or lists the origin', () => {
    const { touched, map } = fakeStorage();
    map.set('aikg:favorites', '["theabonk"]');
    const data = freshSave();
    data.stars['meadow-1'] = 3;
    save(data);
    expect(load().stars['meadow-1']).toBe(3);
    write('other', '{}');
    read('other');
    remove('other');
    expect([...touched].every(key => key.startsWith(GAME.storagePrefix))).toBe(true);
    expect(map.get('aikg:favorites')).toBe('["theabonk"]');
  });
  it('keeps playing from memory when storage is blocked, and says so', () => {
    fakeStorage(true);
    expect(persistent()).toBe(false);
    const data = freshSave();
    data.partyBest = 7;
    save(data);
    expect(load().partyBest).toBe(7);
  });
});

describe('saves', () => {
  it('migrate any older or broken save without losing what can be kept', () => {
    expect(migrate(null)).toEqual(freshSave());
    expect(migrate('nonsense')).toEqual(freshSave());
    // the starter template's save keeps only its sound setting
    expect(migrate({ v: 2, best: 9, plays: 3, sound: false }).settings.sfx).toBe(0);
    const odd = migrate({ v: 1, stars: { 'meadow-1': 7, 'meadow-2': -2, x: 'y' }, settings: { music: 4, quality: 'ultra', speed: 2 }, seen: { tips: ['a', 3] } });
    expect(odd.stars).toEqual({ 'meadow-1': 3, 'meadow-2': 0 });
    expect(odd.settings).toMatchObject({ music: 1, quality: 'auto', speed: 2 });
    expect(odd.seen.tips).toEqual(['a']);
  });
  it('a complete save (every level, Challenge, plant and tip, a month of Dailies) stays under 100 KB', () => {
    const full = freshSave();
    for (const l of LEVELS) { full.stars[l.id] = 3; full.lastSeeds[l.id] = l.plants.slice(0, 8); }
    for (const c of CHALLENGES) full.stars[c.id] = 3;
    for (let d = 1; d <= 60; d++) full.daily[`2026-${String(Math.ceil(d / 30)).padStart(2, '0')}-${String(((d - 1) % 30) + 1).padStart(2, '0')}`] = 3;
    full.seen.plants = PLANTS.map(p => p.id);
    full.seen.tips = Array.from({ length: 120 }, (_, i) => `tip-${i}`);
    const text = JSON.stringify(migrate(JSON.parse(JSON.stringify(full))));
    expect(text.length).toBeLessThan(SAVE_BUDGET);
    expect(Object.keys(migrate(full).daily)).toHaveLength(30);
  });
});
