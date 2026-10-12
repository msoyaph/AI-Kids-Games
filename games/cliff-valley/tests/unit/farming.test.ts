import { describe, expect, it } from 'vitest';
import { Sim } from '../../src/sim';
import { harvest, isMature, plant, till, waterTile, rollQuality, sprinklerArea } from '../../src/sim/farming';
import { sellPrice, shipFromSlot } from '../../src/sim/economy';
import { useTool } from '../../src/sim/tools';
import { count } from '../../src/sim/inventory';
import { SOIL_TILLED, SOIL_WATERED } from '../../src/sim/types';
import { CROP_BALANCE, TUNING } from '../../src/tuning';
import { CROPS } from '../../src/data/crops';
import { Rng } from '../../src/core/rng';

function newSim() {
  const sim = Sim.newGame({ name: 'T', farm: 'F', pet: 'dog', petName: 'D', seed: 3 });
  sim.warpTo('farm', 30, 12, 0);
  return sim;
}

function growPlot(sim: Sim, x: number, y: number, crop: string) {
  const farm = sim.loc('farm');
  farm.removeObj(x, y);
  expect(till(sim, farm, x, y)).toBe(true);
  expect(plant(sim, farm, x, y, `seed.${crop}`).ok).toBe(true);
  return farm;
}

describe('farming', () => {
  it('has 24+ crops across all four seasons with balance data', () => {
    expect(CROPS.length).toBeGreaterThanOrEqual(24);
    for (let s = 0; s < 4; s++) expect(CROPS.some((c) => c.seasons.includes(s))).toBe(true);
    for (const c of CROPS) {
      const b = CROP_BALANCE[c.id];
      expect(b.days).toBeLessThanOrEqual(TUNING.seasonDays - 1); // can mature within one season
      expect(b.sell).toBeGreaterThan(0);
    }
    expect(CROPS.some((c) => c.trellis)).toBe(true);
    expect(CROPS.some((c) => c.giant)).toBe(true);
    expect(CROPS.filter((c) => CROP_BALANCE[c.id].regrow).length).toBeGreaterThan(5);
  });

  it('grows only on watered days and matures on schedule', () => {
    const sim = newSim();
    const farm = growPlot(sim, 30, 13, 'radish');
    const days = CROP_BALANCE.radish.days;
    sim.state.weather = 'sun';
    // a dry night: no growth
    sim.sleep();
    expect(farm.obj(30, 13)!.g).toBe(0);
    for (let d = 0; d < days; d++) {
      waterTile(sim, farm, 30, 13);
      sim.sleep();
    }
    expect(isMature(farm.obj(30, 13)!, farm, 30, 13)).toBe(true);
    expect(harvest(sim, farm, 30, 13)).toBe(true);
    expect(count(sim.p.inv, 'radish')).toBe(1);
    expect(farm.obj(30, 13)).toBeUndefined();
    expect(farm.soilAt(30, 13) & SOIL_TILLED).toBeTruthy();
  });

  it('multi-harvest crops regrow', () => {
    const sim = newSim();
    sim.state.day = 10; // summer
    const farm = growPlot(sim, 31, 13, 'hotpepper');
    const b = CROP_BALANCE.hotpepper;
    farm.obj(31, 13)!.g = b.days;
    expect(harvest(sim, farm, 31, 13)).toBe(true);
    const o = farm.obj(31, 13)!;
    expect(o).toBeDefined();
    expect(isMature(o, farm, 31, 13)).toBe(false);
    for (let d = 0; d < b.regrow!; d++) {
      farm.setSoil(31, 13, farm.soilAt(31, 13) | SOIL_WATERED);
      sim.sleep();
    }
    expect(isMature(farm.obj(31, 13)!, farm, 31, 13)).toBe(true);
  });

  it('refuses out-of-season seeds with a friendly message', () => {
    const sim = newSim();
    const farm = sim.loc('farm');
    farm.removeObj(33, 13);
    till(sim, farm, 33, 13);
    const r = plant(sim, farm, 33, 13, 'seed.pumpkin');
    expect(r.ok).toBe(false);
    expect(r.msg).toMatch(/autumn/);
  });

  it('withers out-of-season crops when the season changes', () => {
    const sim = newSim();
    const farm = growPlot(sim, 30, 13, 'radish');
    sim.state.day = 9;
    sim.sleep();
    expect(farm.obj(30, 13)!.dead).toBe(true);
  });

  it('quality rolls stay in range and improve with level', () => {
    const r = new Rng(1);
    let lowGold = 0, highGold = 0;
    for (let i = 0; i < 4000; i++) {
      const a = rollQuality(r, 0, 0), b = rollQuality(r, 10, 2);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(3);
      if (a >= 2) lowGold++;
      if (b >= 2) highGold++;
    }
    expect(highGold).toBeGreaterThan(lowGold * 3);
  });

  it('sprinklers water their area each morning', () => {
    const sim = newSim();
    const farm = sim.loc('farm');
    for (const [dx, dy] of sprinklerArea('sprinkler2')) {
      farm.removeObj(40 + dx, 25 + dy);
      farm.setSoil(40 + dx, 25 + dy, SOIL_TILLED);
    }
    farm.removeObj(40, 25);
    farm.setObj(40, 25, { k: 'sprinkler', id: 'sprinkler2' });
    sim.state.tomorrow = 'sun';
    sim.sleep();
    for (const [dx, dy] of sprinklerArea('sprinkler2')) expect(farm.soilAt(40 + dx, 25 + dy) & SOIL_WATERED).toBeTruthy();
    expect(sprinklerArea('sprinkler1').length).toBe(4);
    expect(sprinklerArea('sprinkler3').length).toBe(24);
  });

  it('clearing gives resources and costs a little energy', () => {
    const sim = newSim();
    const farm = sim.loc('farm');
    farm.removeObj(30, 13);
    farm.setObj(30, 13, { k: 'stone', id: 'stone', hp: 1, n: 0 });
    const e0 = sim.p.energy;
    expect(useTool(sim, 'pick', 30, 13).ok).toBe(true);
    expect(count(sim.p.inv, 'stone')).toBeGreaterThan(0);
    expect(sim.p.energy).toBeLessThan(e0);
    farm.setObj(30, 13, { k: 'weed', id: 'weed', hp: 1, n: 0 });
    const e1 = sim.p.energy;
    expect(useTool(sim, 'scythe', 30, 13).ok).toBe(true);
    expect(sim.p.energy).toBe(e1); // scythe is free
    expect(farm.obj(30, 13)).toBeUndefined();
  });
});

describe('economy', () => {
  it('pays for shipped items overnight with quality bonuses', () => {
    const sim = newSim();
    sim.p.inv[9] = { id: 'radish', n: 3, q: 0 };
    sim.p.inv[8] = { id: 'radish', n: 1, q: 2 };
    const c0 = sim.p.coins;
    expect(shipFromSlot(sim, 9)).toBe(true);
    expect(shipFromSlot(sim, 8)).toBe(true);
    const r = sim.sleep();
    const expected = sellPrice(sim, 'radish', 0) * 3 + sellPrice(sim, 'radish', 2);
    expect(r.total).toBe(expected);
    expect(sim.p.coins).toBe(c0 + expected);
    expect(sellPrice(sim, 'radish', 2)).toBe(Math.floor(CROP_BALANCE.radish.sell * TUNING.qualityMult[2]));
    expect(sim.state.col.shipped.radish).toBe(4);
  });

  it('cannot ship tools', () => {
    const sim = newSim();
    expect(shipFromSlot(sim, 0)).toBe(false);
  });
});
