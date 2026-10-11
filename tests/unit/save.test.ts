import { beforeEach, describe, expect, it } from 'vitest';
import { useMemoryStorage } from '../../src/core/storage';
import { compactLoc, deserialize, expandLoc, migrate, saveToSlot, loadSlot, SAVE_VERSION, serialize } from '../../src/sim/save';
import { Sim, rleDecode, rleEncode } from '../../src/sim/sim';
import { SOIL_TILLED, SOIL_WATERED } from '../../src/sim/types';
import { TUNING } from '../../src/tuning';

const opts = { name: 'Pip', farm: 'Daisy', pet: 'cat' as const, petName: 'Mochi', seed: 99 };

describe('save system', () => {
  beforeEach(() => useMemoryStorage());

  it('round-trips RLE', () => {
    const a = new Uint8Array(500);
    a.fill(3, 10, 200);
    a[300] = 7;
    a.fill(1, 400, 500);
    expect(Array.from(rleDecode(rleEncode(a), 500))).toEqual(Array.from(a));
  });

  it('round-trips a game through JSON', () => {
    const sim = Sim.newGame(opts);
    const farm = sim.loc('farm');
    farm.setSoil(30, 16, SOIL_TILLED | SOIL_WATERED);
    sim.p.coins = 1234;
    sim.state.day = 7;
    const json = serialize(sim);
    const back = deserialize(json);
    expect(back.state.player.name).toBe('Pip');
    expect(back.state.player.coins).toBe(1234);
    expect(back.state.day).toBe(7);
    const farm2 = back.loc('farm');
    expect(farm2.soilAt(30, 16)).toBe(SOIL_TILLED | SOIL_WATERED);
    expect(farm2.objs.size).toBe(farm.objs.size);
    for (const [i, o] of farm.objs) expect(farm2.objs.get(i)).toEqual(o);
  });

  it('keeps each slot under the storage budget', () => {
    const sim = Sim.newGame(opts);
    const r = saveToSlot(sim, 1);
    expect(r.ok).toBe(true);
    expect(r.bytes).toBeLessThan(TUNING.saveBudgetBytes);
    expect(loadSlot(1)?.state.player.farm).toBe('Daisy');
  });

  it('compacts simple objects into tokens', () => {
    const c = compactLoc({ objs: [[5, { k: 'weed', id: 'weed', hp: 1, n: 2 }], [9, { k: 'tree', id: 'pine', g: 4, hp: 10 }], [12, { k: 'chest', id: 'chest', items: [] }]] });
    expect(c.s).toBe('5W2 9Tp4');
    expect(c.o?.length).toBe(1);
    const back = expandLoc(c);
    expect(back.objs).toContainEqual([9, { k: 'tree', id: 'pine', g: 4, hp: 10 }]);
  });

  it('migrates a v1 save to the current version', () => {
    const sim = Sim.newGame(opts);
    const cur = JSON.parse(serialize(sim));
    // fabricate an old v1 save: energyMax field + uncompacted locations, missing newer fields
    const old = { v: 1, meta: cur.meta, state: { ...cur.state, v: 1 }, locs: { farm: { soil: undefined, objs: [[40, { k: 'stone', id: 'stone', hp: 1, n: 1 }]] } } };
    old.state.player = { ...old.state.player, energyMax: 222 };
    delete old.state.player.maxEnergy;
    delete old.state.achievements;
    delete old.state.mine;
    const m = migrate(JSON.parse(JSON.stringify(old)));
    expect(m.v).toBe(SAVE_VERSION);
    expect(m.state.player.maxEnergy).toBe(222);
    expect(m.locs.farm.s).toBe('14S1');
    const loaded = deserialize(JSON.stringify(old));
    expect(loaded.state.player.maxEnergy).toBe(222);
    expect(loaded.state.achievements).toEqual([]);
    expect(loaded.state.mine.deepest).toBe(0);
    expect(loaded.loc('farm').obj(40 % loaded.loc('farm').w, Math.floor(40 / loaded.loc('farm').w))?.k).toBe('stone');
  });

  it('rejects saves from the future', () => {
    expect(() => migrate({ v: SAVE_VERSION + 1 })).toThrow();
  });
});
