// Save format v3: compact codec, migration from real v2 fixtures, storage budget, quota handling.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  PREFIX,
  SLOT_BUDGET,
  SafeStorage,
  SaveManager,
  decodeObjects,
  decodeSave,
  encodeObjects,
  encodeSave,
  isQuotaError,
  measureSave,
} from '../src/sim/save';
import { SAVE_VERSION, newGameState, type GameState, type TileObj } from '../src/sim/state';
import { createGame } from '../src/sim/systems';
import { World } from '../src/sim/world';
import { ITEMS } from '../src/data/registry';
import { VILLAGERS } from '../src/data/villagers';
import { MISSIONS } from '../src/data/missions';
import { nextDay, setHour } from './story';

class MemStorage implements Storage {
  protected m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  used(): number {
    let n = 0;
    for (const [k, v] of this.m) n += k.length + v.length;
    return n;
  }
}

/** Behaves like a browser localStorage with a small quota. */
class QuotaStorage extends MemStorage {
  constructor(private limit: number) {
    super();
  }
  override setItem(k: string, v: string) {
    const prev = this.m.get(k);
    const next = this.used() - (prev ? k.length + prev.length : 0) + k.length + v.length;
    if (next > this.limit) {
      const e = new Error('The quota has been exceeded.');
      e.name = 'QuotaExceededError';
      throw e;
    }
    this.m.set(k, v);
  }
}

/** Accepts writes but silently drops them (some private modes). */
class BlackHoleStorage extends MemStorage {
  override setItem() {}
}

const FIXTURES = ['save-v2-fresh', 'save-v2-midgame'];
const loadFixture = (name: string) => readFileSync(`tests/fixtures/${name}.json`, 'utf8');

/** Every leaf path of a JSON value, with its value. */
function leaves(v: unknown, path = '', out: [string, unknown][] = []): [string, unknown][] {
  if (v && typeof v === 'object') {
    const entries = Array.isArray(v) ? v.map((x, i) => [String(i), x] as const) : Object.entries(v);
    if (entries.length === 0) out.push([path, Array.isArray(v) ? '[]' : '{}']);
    for (const [k, x] of entries) leaves(x, path ? `${path}.${k}` : k, out);
  } else out.push([path, v]);
  return out;
}
function at(root: unknown, path: string): unknown {
  let cur = root as Record<string, unknown> | undefined;
  for (const k of path.split('.')) {
    if (cur === undefined || cur === null) return undefined;
    cur = cur[k] as Record<string, unknown>;
  }
  if (cur && typeof cur === 'object' && Object.keys(cur).length === 0) return Array.isArray(cur) ? '[]' : '{}';
  return cur;
}

describe('compact objects codec', () => {
  it('round-trips every object of a real island', () => {
    const st = newGameState(31337, 'Codec');
    const enc = encodeObjects(st.world.objects);
    expect(decodeObjects(enc)).toEqual(st.world.objects);
    expect(JSON.stringify(enc).length).toBeLessThan(JSON.stringify(st.world.objects).length / 2.5);
  });

  it('round-trips awkward strings, zeros and unknown fields', () => {
    const objs: Record<number, TileObj> = {
      0: { k: 'item', item: 'cloth_tee#3', q: 0, tag: "a,b;c=d:e%f'g" },
      7: { k: 'mystery' as TileObj['k'], item: 'cloth_tee#3', v: 1.5 },
      6399: { k: 'deco', item: 'furn_plank_table', r: 3, v: 0, tag: 'fill' },
      42: { k: 'flower', v: 37, g: 0, w: 1, pd: 12 },
      43: { k: 'sapling', item: 'sapling_pine', g: 2.5 },
    };
    (objs[42] as unknown as Record<string, unknown>).nx = -0.25;
    expect(decodeObjects(encodeObjects(objs))).toEqual(objs);
    expect(decodeObjects({ t: [], o: '' })).toEqual({});
  });

  it('decodes old plain-JSON saves and new compact saves to the same state', () => {
    const st = newGameState(9, 'Same');
    const plain = JSON.stringify({ version: SAVE_VERSION, savedAt: 1, meta: {}, state: st });
    const compact = encodeSave(st, 1);
    expect(JSON.parse(compact).format).toBe(2);
    expect(decodeSave(compact)).toEqual(decodeSave(plain));
    expect(compact.length).toBeLessThan(plain.length * 0.6);
  });
});

describe('migration from real v2 saves', () => {
  for (const name of FIXTURES) {
    it(`${name}: keeps every v2 field, then keeps playing`, () => {
      const raw = loadFixture(name);
      const v2 = JSON.parse(raw);
      expect(v2.version).toBe(2);
      const mem = new MemStorage();
      mem.setItem(PREFIX + 'slot1', raw);
      const mgr = new SaveManager(new SafeStorage(mem));
      expect(mgr.meta(1)?.name).toBe(v2.state.player.name);
      const res = mgr.read(1);
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      const st = res.state;
      expect(st.version).toBe(SAVE_VERSION);
      // nothing from the v2 save may be lost or changed
      const lost: string[] = [];
      for (const [path, value] of leaves(v2.state)) {
        if (path === 'version') continue;
        if (at(st, path) !== value) lost.push(`${path}: ${JSON.stringify(value)} -> ${JSON.stringify(at(st, path))}`);
      }
      expect(lost).toEqual([]);

      // keep playing on the migrated save, then save + load again in the new format
      const g = createGame(st);
      const day0 = g.state.clock.day;
      for (let d = 0; d < 3; d++) {
        setHour(g, 12);
        for (let k = 0; k < 120; k++) g.update(1 / 30, null);
        nextDay(g);
      }
      expect(g.state.clock.day).toBe(day0 + 3);
      expect(mgr.write(1, g.state)).toBe(true);
      const again = mgr.read(1);
      expect(again.ok && again.state.clock.day).toBe(day0 + 3);
      expect(again.ok && again.state.player.glints).toBe(g.state.player.glints);
      expect(again.ok && again.state.world.objects).toEqual(g.state.world.objects);
      expect(JSON.parse(mem.getItem(PREFIX + 'slot1')!).format).toBe(2);
    });
  }
});

/** A save with every collection as full as the game allows. */
function maxedState(): GameState {
  const st = newGameState(777, 'Maximilian');
  const ids = Object.keys(ITEMS);
  for (const id of ids) {
    st.catalog.seen[id] = 1;
    st.catalog.owned[id] = 1;
  }
  st.museum.donated = ids.filter((id) => ['fish', 'bug', 'fossil'].includes(ITEMS[id]!.cat));
  st.recipes = ids.filter((id) => id.startsWith('r_'));
  st.quests.done = MISSIONS.map((m) => m.id);
  st.quests.finished = true;
  st.player.invSize = 40;
  st.player.inv = Array.from({ length: 40 }, (_, i) => ({ id: ids[i % ids.length]!, qty: 30, dur: 99 }));
  st.home.level = 2;
  st.home.storage = Array.from({ length: 300 }, (_, i) => ({ id: ids[i % ids.length]!, qty: 99 }));
  st.home.furniture = Array.from({ length: 200 }, (_, i) => ({ uid: i + 1, id: 'furn_plank_table', x: i % 12, z: (i / 12) | 0, rot: i % 4 }));
  for (const v of VILLAGERS)
    st.villagers[v.id] = {
      movedIn: true,
      homeId: 99,
      friendship: 100,
      talkedDay: 400,
      giftDay: 400,
      giftsToday: 3,
      rewardsGiven: 5,
      metDay: 2,
      request: { kind: 'deliver', target: 'timber', qty: 5, day: 400, accepted: true, done: false, reward: 800 },
    };
  for (let i = 0; i < 60; i++) {
    st.stats[`stat_${i}`] = 99999;
    st.achievements[`ach_${i}`] = 3;
    st.flags[`flag_${i}`] = 1;
    st.tips[`tip_${i}`] = 1;
  }
  // a fully decorated island: a multi-field object on every free land tile
  const w = new World(st);
  for (let i = 0; i < 80 * 80; i++)
    if (w.isFreeForObject(i)) st.world.objects[i] = { k: 'deco', item: ids[i % 40]!, r: 2, v: i, tag: 'fill', pd: 400 };
  for (let i = 0; i < 40; i++) st.world.structures.push({ id: 100 + i, type: 'bridge', x: i, z: i, w: 1, d: 3, level: 0, dir: 0 });
  st.clock.day = 999;
  st.playSeconds = 999999;
  return st;
}

describe('storage budget', () => {
  it(`a maxed-out save fits in ${SLOT_BUDGET / 1024} KB per slot`, () => {
    const size = measureSave(maxedState());
    console.log(`maxed save: ${(size / 1024).toFixed(1)} KB (budget ${SLOT_BUDGET / 1024} KB)`);
    expect(size).toBeLessThan(SLOT_BUDGET);
  });

  it('real saves are far below budget and smaller than the old format', () => {
    for (const name of FIXTURES) {
      const raw = loadFixture(name);
      const size = measureSave(decodeSave(raw));
      console.log(`${name}: v2 ${(raw.length / 1024).toFixed(1)} KB -> v3 ${(size / 1024).toFixed(1)} KB`);
      expect(size).toBeLessThan(raw.length * 0.6);
      expect(size).toBeLessThan(SLOT_BUDGET / 10);
    }
  });
});

describe('full storage', () => {
  it('recognises quota errors from all browsers', () => {
    expect(isQuotaError(Object.assign(new Error('x'), { name: 'QuotaExceededError' }))).toBe(true);
    expect(isQuotaError(Object.assign(new Error('x'), { name: 'NS_ERROR_DOM_QUOTA_REACHED' }))).toBe(true);
    expect(isQuotaError({ code: 22 })).toBe(true);
    expect(isQuotaError(new Error('SecurityError'))).toBe(false);
  });

  it('never corrupts the existing save when storage is full', () => {
    const first = newGameState(55, 'Safe');
    first.player.glints = 4321;
    const size = encodeSave(first).length;
    const quota = new QuotaStorage(size + 2000);
    const mgr = new SaveManager(new SafeStorage(quota));
    expect(mgr.writeResult(0, first)).toBe('ok');
    const before = quota.getItem(PREFIX + 'slot0');

    const bigger = maxedState();
    expect(mgr.writeResult(0, bigger)).toBe('quota');
    expect(quota.getItem(PREFIX + 'slot0')).toBe(before);
    const res = mgr.read(0);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state.player.name).toBe('Safe');
      expect(res.state.player.glints).toBe(4321);
    }
    expect(mgr.meta(0)?.name).toBe('Safe');
  });

  it('frees optional playtest data to make room for a real save', () => {
    const st = newGameState(56, 'Room');
    const size = encodeSave(st).length;
    const quota = new QuotaStorage(size + 3000);
    quota.setItem(PREFIX + 'settings', '{"music":0.5}');
    quota.setItem(PREFIX + 'playtest.slot1', 'x'.repeat(size));
    const mgr = new SaveManager(new SafeStorage(quota));
    expect(mgr.writeResult(0, st)).toBe('ok');
    expect(quota.getItem(PREFIX + 'playtest.slot1')).toBeNull();
    expect(quota.getItem(PREFIX + 'settings')).toBe('{"music":0.5}');
    expect(mgr.read(0).ok).toBe(true);
  });

  it('detects writes that silently do not stick', () => {
    const mgr = new SaveManager(new SafeStorage(new BlackHoleStorage()));
    expect(mgr.writeResult(0, newGameState(1, 'Ghost'))).toBe('error');
  });

  it('only uses lightcrossing.* keys', () => {
    const mem = new MemStorage();
    const storage = new SafeStorage(mem);
    const mgr = new SaveManager(storage);
    mgr.write(0, newGameState(2, 'Keys'));
    mgr.saveSettings({ a: 1 });
    for (let i = 0; i < mem.length; i++) expect(mem.key(i)!.startsWith('lightcrossing.')).toBe(true);
    expect(Object.keys(storage.usage()).sort()).toEqual(['settings', 'slot0']);
  });
});
