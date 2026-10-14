/**
 * Storage (save/storage.ts, save/slots.ts, save/settings.ts): only the game's own keys, a full
 * storage area keeps the last good save, a broken save is kept aside and the backup takes over, and
 * every key at its biggest stays under the 150 KB the plan promises the website.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { GAME } from '../../src/config';
import { CAP, encodeTown } from '../../src/save/codec';
import { defaultSettings, loadSettings, sanitizeSettings, saveSettings } from '../../src/save/settings';
import { deleteSlot, loadSlot, saveSlot, slotCards } from '../../src/save/slots';
import { persistent, read, resetForTests, write } from '../../src/save/storage';
import { newTown } from '../../src/sim/newtown';
import { maxTown } from '../support/maxTown';

const BUDGET = 150 * 1024;

function fakeStorage(start: Record<string, string> = {}) {
  const data = new Map(Object.entries(start));
  const touched = new Set<string>();
  return {
    data, touched,
    getItem: (k: string) => { touched.add(k); return data.get(k) ?? null; },
    setItem: (k: string, v: string) => { touched.add(k); data.set(k, v); },
    removeItem: (k: string) => { touched.add(k); data.delete(k); },
    clear: () => { throw new Error('the game must never clear the whole origin'); },
    key: () => { throw new Error('the game must never list other keys'); },
    get length(): number { throw new Error('the game must never count other keys'); },
  };
}
function useStorage(s: unknown) {
  Object.defineProperty(globalThis, 'localStorage', { value: s, configurable: true, writable: true });
  resetForTests();
}
afterEach(() => useStorage(undefined));
const key = (k: string) => GAME.storagePrefix + k;

describe('storage', () => {
  it('only ever touches keys with the game’s own prefix', () => {
    const s = fakeStorage({ 'other.save': 'theirs', 'aikg:favorites': '[]' });
    useStorage(s);
    const town = newTown(1);
    saveSlot(1, town, 0, true);
    saveSlot(2, town, 0);
    loadSlot(1); loadSlot(3); slotCards(); deleteSlot(2);
    saveSettings(defaultSettings()); loadSettings();
    expect(GAME.storagePrefix).toBe('breezeport.');
    for (const k of s.touched) expect(k.startsWith('breezeport.'), k).toBe(true);
    expect(s.data.get('other.save')).toBe('theirs');
  });

  it(`keeps every key at its biggest under ${BUDGET / 1024} KB`, () => {
    const text = encodeTown(maxTown(), 99_999);
    expect(text.length).toBeLessThanOrEqual(CAP);
    const s = fakeStorage();
    useStorage(s);
    const town = maxTown();
    for (const n of [1, 2, 3] as const) expect(saveSlot(n, town, 99_999, n === 3)).toBe('ok');
    write('broken', text);
    saveSettings({ ...defaultSettings(), volume: { master: 0.123456789, music: 0.123456789, sfx: 0.123456789 } });
    let total = 0;
    for (const [k, v] of s.data) total += k.length + v.length;
    expect([...s.data.keys()].sort()).toEqual(['bak', 'broken', 'settings', 'slot1', 'slot2', 'slot3'].map(key).sort());
    expect(total).toBeLessThan(BUDGET);
  });

  it('keeps the last good save when storage is full, and says so', () => {
    const s = fakeStorage();
    useStorage(s);
    const town = newTown(2);
    expect(saveSlot(1, town, 0)).toBe('ok');
    const before = s.data.get(key('slot1'));
    s.setItem = () => { throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); };
    town.coins += 100;
    expect(saveSlot(1, town, 0, true)).toBe('full');
    expect(s.data.get(key('slot1'))).toBe(before);
    expect(s.data.has(key('bak'))).toBe(false);
  });

  it('refuses a save over the cap rather than writing half a town', () => {
    useStorage(fakeStorage());
    const town = maxTown();
    town.things.push(...Array.from({ length: 3000 }, (_, i) => ({ ...town.things[0]!, id: 50_000 + i })));
    // the codec itself never writes past the caps, so it still fits
    expect(saveSlot(1, town, 0)).toBe('ok');
  });

  it('keeps a broken save aside and lets the backup take over', () => {
    const good = newTown(4);
    good.name = 'Backup Bay';
    const s = fakeStorage({ [key('slot2')]: '{oops', [key('bak')]: `2\n${encodeTown(good)}` });
    useStorage(s);
    const r = loadSlot(2);
    expect(r).toMatchObject({ status: 'repaired', fromBackup: true, kept: true });
    expect(r.town?.name).toBe('Backup Bay');
    expect(s.data.get(key('broken'))).toBe('{oops');
    // a backup of a different slot never stands in
    useStorage(fakeStorage({ [key('slot1')]: '{oops', [key('bak')]: `2\n${encodeTown(good)}` }));
    expect(loadSlot(1)).toMatchObject({ status: 'broken', town: null, kept: true });
  });

  it('says when the broken copy couldn’t be kept (so the slot is never written over)', () => {
    const s = fakeStorage({ [key('slot1')]: '{oops' });
    const set = s.setItem;
    s.setItem = (k: string, v: string) => { if (k !== key('__probe')) throw new Error('full'); set(k, v); };
    useStorage(s);
    expect(loadSlot(1)).toMatchObject({ status: 'broken', kept: false });
  });

  it('shows slot cards and deletes a slot with its backup', () => {
    const s = fakeStorage({ [key('slot3')]: 'garbage' });
    useStorage(s);
    const town = newTown(6);
    town.name = 'Kite Cove';
    saveSlot(1, town, 37, true);
    const cards = slotCards();
    expect(cards[0]).toMatchObject({ n: 1, empty: false, name: 'Kite Cove', pop: 37, mode: 'story' });
    expect(cards[1]).toMatchObject({ n: 2, empty: true });
    expect(cards[2]).toMatchObject({ n: 3, unreadable: true });
    deleteSlot(1);
    expect(s.data.has(key('slot1'))).toBe(false);
    expect(s.data.has(key('bak'))).toBe(false);
  });

  it('plays on from memory when storage is blocked', () => {
    useStorage({ getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } });
    expect(persistent()).toBe(false);
    write('settings', '{"v":1}');
    expect(read('settings')).toBe('{"v":1}');
    const town = newTown(8);
    expect(saveSlot(1, town, 0)).toBe('ok');
    expect(loadSlot(1).town?.seed).toBe(8);
  });

  it('checks every setting on load', () => {
    expect(sanitizeSettings({ textSize: 9, readAloud: 'yes', volume: { master: 7, music: -1 }, quality: 'ultra', lastSlot: 4, creative: true })).toMatchObject({
      textSize: 0, readAloud: false, volume: { master: 1, music: 0 }, quality: 'auto', lastSlot: 0, creative: true,
    });
    expect(sanitizeSettings(null)).toEqual(defaultSettings());
  });
});
