import { describe, expect, it } from 'vitest';
import { Sim } from '../../src/sim';
import { count } from '../../src/sim/inventory';
import { buy, shopOpen, shopStock } from '../../src/sim/shops';

const mk = () => {
  const sim = Sim.newGame({ name: 'Shop', farm: 'Shop', pet: 'cat', petName: 'Tab', seed: 9 });
  sim.state.day = 1; // a weekday when everything is open
  sim.state.min = 10 * 60;
  return sim;
};
const entry = (sim: Sim, shop: string, id: string) => shopStock(sim, shop).find((e) => e.id === id)!;

describe('shops', () => {
  it('keep their hours and closed days', () => {
    const sim = mk();
    expect(shopOpen(sim, 'store').open).toBe(true);
    sim.state.min = 7 * 60;
    expect(shopOpen(sim, 'store').open).toBe(false);
    expect(shopOpen(sim, 'store').reason).toBeTruthy();
  });

  it('Wren gives one free rod', () => {
    const sim = mk();
    const e = entry(sim, 'fishshop', 'tool.rod');
    expect(e.price).toBe(0);
    expect(buy(sim, 'fishshop', e).ok).toBe(true);
    expect(sim.p.tools.rod).toBe(0);
    expect(count(sim.p.inv, 'tool.rod')).toBe(1);
    expect(shopStock(sim, 'fishshop').some((x) => x.id === 'tool.rod')).toBe(false);
  });

  it('the ranch sells animals once there is a home, and hay once there is a silo', () => {
    const sim = mk();
    sim.p.coins = 10000;
    expect(entry(sim, 'ranch', 'animal.chicken').locked).toBeTruthy();
    expect(entry(sim, 'ranch', 'hay').locked).toBeTruthy();
    sim.state.buildings.built = { coop: 0, silo: 0 };
    expect(buy(sim, 'ranch', entry(sim, 'ranch', 'animal.chicken')).ok).toBe(true);
    expect(sim.state.animals.length).toBe(1);
    expect(entry(sim, 'ranch', 'hay').locked).toBeFalsy();
  });

  it('the carpenter sells clay so the silo is always reachable', () => {
    const sim = mk();
    expect(buy(sim, 'carpenter', entry(sim, 'carpenter', 'clay'), 10).ok).toBe(true);
    expect(count(sim.p.inv, 'clay')).toBe(10);
  });

  it('Grit upgrades tools for coins + bars and cracks geodes', () => {
    const sim = mk();
    sim.p.coins = 5000;
    const up = entry(sim, 'smithy', 'tool.pick');
    expect(up.mats?.[0][0]).toBe('copperBar');
    expect(buy(sim, 'smithy', up).ok).toBe(false); // no bars yet
    sim.give('copperBar', 5);
    expect(buy(sim, 'smithy', up).ok).toBe(true);
    expect(sim.p.tools.pick).toBe(1);
    expect(count(sim.p.inv, 'copperBar')).toBe(0);
    sim.give('geode', 2);
    expect(buy(sim, 'smithy', entry(sim, 'smithy', 'geode')).ok).toBe(true);
    expect(count(sim.p.inv, 'geode')).toBe(1);
    expect(sim.state.stats.geodes).toBe(1);
  });

  it('the bag can grow twice', () => {
    const sim = mk();
    sim.p.coins = 20000;
    expect(buy(sim, 'store', entry(sim, 'store', 'backpack')).ok).toBe(true);
    expect(sim.p.inv.length).toBe(30);
    expect(buy(sim, 'store', entry(sim, 'store', 'backpack')).ok).toBe(true);
    expect(sim.p.inv.length).toBe(36);
    expect(shopStock(sim, 'store').some((x) => x.id === 'backpack')).toBe(false);
  });
});
