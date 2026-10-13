import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeCreature } from '../../src/core/creature';
import { Rng } from '../../src/core/rng';
import { codecTables, packBits, packCreature, unpackBits, unpackCreature } from '../../src/core/save/codec';
import { deserialize, fromSave, migrate, SAVE_VERSION, serialize, SLOT_BUDGET, toSave } from '../../src/core/save/save';
import { addFriend, BASE_MAX, newGameState, TEAM_MAX, type GameState } from '../../src/core/state';
import { PERSONALITIES } from '../../src/core/types';
import { deleteSlot, loadSlot, persistent, readKey, resetStoreForTests, saveSlot, SLOT_LIMIT, storedBytes, writeKey } from '../../src/game/store';
import { dex, items } from './fixtures';

const t = codecTables(dex, items);
const speciesIds = Object.keys(dex.species);

function randomCreature(rng: Rng) {
  const c = makeCreature(dex, { species: rng.pick(speciesIds), level: rng.range(1, 50), personality: rng.pick(PERSONALITIES), shimmer: rng.chance(0.2), nick: rng.range(-1, 1500) }, rng);
  c.uid = rng.range(1, 65_000);
  c.friendship = rng.range(0, 255);
  c.energy = rng.range(0, c.energy);
  c.met = rng.range(0, 200);
  if (rng.chance(0.3)) c.gear = 'flare-charm';
  if (rng.chance(0.2)) c.holdGrowth = true;
  return c;
}

function fullState(): GameState {
  const rng = new Rng(42);
  const s = newGameState({ slot: 2, name: 77, look: { skin: 3, hair: 5, hairColor: 2, outfit: 4 }, difficulty: 'hard', seed: 9, start: { map: 'brightmoor', x: 12, y: 9 }, now: 1_700_000_000_000 });
  for (let i = 0; i < TEAM_MAX + BASE_MAX; i++) addFriend(s, randomCreature(rng));
  for (let i = 0; i < 60; i++) s.bag[`item-number-${i}`] = 999;
  // Generous stand-ins until phase 7 swaps in the real flag and quest lists (all of them set).
  for (let i = 0; i < 400; i++) s.flags.add(`story-flag-name-${i}`);
  for (let i = 0; i < 150; i++) s.vars[`quest-counter-${i}`] = 12345;
  for (let i = 1; i <= 52; i++) { s.guide.seen.add(i); s.guide.friends.add(i); s.guide.stars[i] = 3; s.guide.shimmer.add(i); }
  for (let i = 0; i < 60; i++) s.quests[`side-quest-${i}`] = -1;
  for (let i = 0; i < 40; i++) s.tutorials.add(`tutorial-${i}`);
  s.playMs = 123_456_789;
  s.coins = 999_999;
  return s;
}

describe('creature codec', () => {
  it('packs every field and unpacks it exactly, for a thousand random creatures', () => {
    const rng = new Rng(1);
    for (let i = 0; i < 1000; i++) {
      const c = randomCreature(rng);
      const packed = packCreature(t, c);
      expect(packed).toHaveLength(23);
      expect(unpackCreature(t, packed)).toEqual(c);
    }
  });

  it('returns null for damaged data or an unknown species, never throwing', () => {
    expect(unpackCreature(t, '')).toBeNull();
    expect(unpackCreature(t, '!!!')).toBeNull();
    expect(unpackCreature(t, 'AAAA')).toBeNull();
    const c = makeCreature(dex, { species: 'fx-tide', level: 5 }, new Rng(1));
    const other = codecTables({ species: {}, moves: dex.moves }, items);
    expect(unpackCreature(other, packCreature(t, c))).toBeNull();
  });

  it('packs flag bitsets 6 to a character', () => {
    const set = new Set([0, 5, 6, 51]);
    const text = packBits(set, 52);
    expect(text).toHaveLength(9);
    expect(unpackBits(text, 52)).toEqual(set);
    expect(unpackBits('', 52).size).toBe(0);
  });
});

describe('saves', () => {
  it('round-trips a whole adventure', () => {
    const s = fullState();
    const r = deserialize(t, serialize(t, s), 2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.lost).toBe(0);
    expect(r.state).toEqual(s);
  });

  it('a worst-case slot stays inside our budget (and far inside the 300 KB limit)', () => {
    const bytes = storedBytes(serialize(t, fullState()));
    expect(bytes).toBeLessThan(SLOT_BUDGET);
    expect(bytes).toBeLessThan(SLOT_LIMIT);
  });

  it('repairs missing or broken fields to safe values', () => {
    const r = fromSave(t, { v: SAVE_VERSION, map: 'coast', team: ['broken', packCreature(t, makeCreature(dex, { species: 'fx-tide', level: 5, uid: 9 }, new Rng(2)))], coins: -50, difficulty: 'impossible', nextUid: 1, guide: { stars: { 3: 7 } } }, 1);
    expect(r.lost).toBe(1);
    expect(r.state.team).toHaveLength(1);
    expect(r.state.coins).toBe(0);
    expect(r.state.difficulty).toBe('normal');
    expect(r.state.nextUid).toBe(10); // past the highest uid in the save
    expect(r.state.guide.stars[3]).toBe(3);
    expect(r.state.rest.map).toBe('coast');
  });

  it('migrates old versions step by step', () => {
    const m = migrate({ coins: 5 });
    expect(m).toEqual({ ok: true, raw: { coins: 5, v: 1 }, from: 0 });
    // A longer chain, with test-only steps: every step runs, in order.
    const chain = { 0: (r: Record<string, unknown>) => ({ ...r, v: 1, a: 1 }), 1: (r: Record<string, unknown>) => ({ ...r, v: 2, b: (r.a as number) + 1 }), 2: (r: Record<string, unknown>) => ({ ...r, v: 3, c: (r.b as number) + 1 }) };
    expect(migrate({ v: 1, a: 1 }, chain, 3)).toEqual({ ok: true, raw: { v: 3, a: 1, b: 2, c: 3 }, from: 1 });
    expect(migrate({ v: 0 }, chain, 3)).toMatchObject({ ok: true, raw: { a: 1, b: 2, c: 3 } });
  });

  it('refuses a save from a newer game, and unreadable ones', () => {
    expect(migrate({ v: SAVE_VERSION + 1 })).toEqual({ ok: false, reason: 'newer' });
    expect(migrate('nope')).toEqual({ ok: false, reason: 'unreadable' });
    expect(migrate([1, 2])).toEqual({ ok: false, reason: 'unreadable' });
    expect(deserialize(t, '{oops', 1)).toEqual({ ok: false, reason: 'unreadable' });
  });

  it('writes plain, stable JSON', () => {
    const save = toSave(t, fullState());
    expect(save.v).toBe(SAVE_VERSION);
    expect(save.flags).toEqual([...save.flags].sort());
    expect(JSON.parse(JSON.stringify(save))).toEqual(save);
  });
});

/** A tiny localStorage stand-in that can be made full or blocked, and records which keys were touched. */
class FakeStorage {
  data = new Map<string, string>();
  touched = new Set<string>();
  full = false;
  get length() { return this.data.size; }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  getItem(k: string) { this.touched.add(k); return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.touched.add(k); if (this.full && !k.endsWith('__probe')) throw new DOMException('full', 'QuotaExceededError'); this.data.set(k, v); }
  removeItem(k: string) { this.touched.add(k); this.data.delete(k); }
  clear() { throw new Error('the game must never clear all of storage'); }
}

describe('storage', () => {
  let fake: FakeStorage;
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  beforeEach(() => {
    fake = new FakeStorage();
    fake.data.set('othergame.save', 'theirs');
    Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true });
    resetStoreForTests();
  });
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
    resetStoreForTests();
  });

  it('saves and loads a slot, touching only agentmon. keys', () => {
    const s = fullState();
    expect(saveSlot(t, s).result).toBe('ok');
    const r = loadSlot(t, 2);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.load.state).toEqual(s);
    expect([...fake.touched].every(k => k.startsWith('agentmon.'))).toBe(true);
    expect(fake.data.get('othergame.save')).toBe('theirs');
    expect(fake.data.has('agentmon.__probe')).toBe(false);
  });

  it('keeps the old save when storage is full, and says so', () => {
    const s = fullState();
    saveSlot(t, s);
    const before = fake.data.get('agentmon.slot2');
    fake.full = true;
    s.coins = 1;
    expect(saveSlot(t, s).result).toBe('full');
    expect(fake.data.get('agentmon.slot2')).toBe(before);
  });

  it('keeps playing from memory when storage is blocked', () => {
    Object.defineProperty(globalThis, 'localStorage', { get() { throw new Error('blocked'); }, configurable: true });
    resetStoreForTests();
    expect(persistent()).toBe(false);
    expect(writeKey('settings', '{}')).toBe('blocked');
    expect(readKey('settings')).toBe('{}');
  });

  it('copies an old save to slotN.bak before migrating it, and deleting a slot removes both', () => {
    const old = { ...toSave(t, fullState()) } as Record<string, unknown>;
    delete old.v; // a version-0 save
    fake.data.set('agentmon.slot3', JSON.stringify(old));
    const r = loadSlot(t, 3);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.load.migratedFrom).toBe(0);
    expect(fake.data.get('agentmon.slot3.bak')).toBe(JSON.stringify(old));
    deleteSlot(3);
    expect(fake.data.has('agentmon.slot3')).toBe(false);
    expect(fake.data.has('agentmon.slot3.bak')).toBe(false);
  });

  it('reports empty, newer and unreadable slots without changing them', () => {
    expect(loadSlot(t, 1).kind).toBe('empty');
    fake.data.set('agentmon.slot1', JSON.stringify({ v: 99 }));
    expect(loadSlot(t, 1).kind).toBe('newer');
    expect(fake.data.get('agentmon.slot1')).toBe(JSON.stringify({ v: 99 }));
    fake.data.set('agentmon.slot1', 'garbage');
    expect(loadSlot(t, 1).kind).toBe('unreadable');
  });
});
