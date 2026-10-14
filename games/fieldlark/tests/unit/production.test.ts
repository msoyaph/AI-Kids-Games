/** Workshops and chains: everything can be made from the farm, and good ingredients make good goods. */
import { describe, expect, it } from 'vitest';
import { ANIMALS } from '../../src/data/animals';
import { CROPS } from '../../src/data/crops';
import { ITEMS } from '../../src/data/items';
import { TREES } from '../../src/data/orchard';
import { MACHINE, MACHINES, RECIPES } from '../../src/data/production';
import { xpForLevel } from '../../src/data/tuning';
import { buyAndPlace } from '../../src/sim/build';
import { add, count } from '../../src/sim/inventory';
import { collectGoods, jobLeft, machineState, slotsOf, startJob, upgradeMachine } from '../../src/sim/production';
import { newFarm, type Farm } from '../../src/sim/state';
import { advance } from '../../src/sim/tick';

const grow = (farm: Farm, minutes: number) => { for (let i = 0; i < minutes * 60; i++) advance(farm, 1); };
const rich = () => { const f = newFarm(3); f.xp = xpForLevel(25); f.coins = 1e6; f.objects = f.objects.filter(o => o.kind !== 'debris'); return f; };

/** The farm level at which each item can first be had. */
function firstLevel(): Map<string, number> {
  const lv = new Map<string, number>();
  for (const c of CROPS) lv.set(c.id, c.level);
  for (const t of TREES) lv.set(t.fruit, t.level);
  for (const a of ANIMALS) if (a.product) lv.set(a.product, a.level);
  for (let pass = 0; pass < 6; pass++) {
    for (const r of RECIPES) {
      const inputs = Object.keys(r.inputs).map(i => lv.get(i));
      if (inputs.every(x => x !== undefined)) lv.set(r.id, Math.max(r.level, MACHINE[r.machine]!.level, ...(inputs as number[])));
    }
  }
  return lv;
}

describe('recipes and chains', () => {
  it('has seven workshops and about forty recipes, each made in exactly one place', () => {
    expect(MACHINES.map(m => m.id).sort()).toEqual(['bakery', 'dairy', 'jamkitchen', 'juicepress', 'kitchen', 'loom', 'mill']);
    expect(RECIPES.length).toBeGreaterThanOrEqual(38);
    expect(new Set(RECIPES.map(r => r.id)).size).toBe(RECIPES.length);
    for (const m of MACHINES) expect(RECIPES.filter(r => r.machine === m.id).length, m.id).toBeGreaterThanOrEqual(4);
  });

  it('every chain is closed: every ingredient grows, comes from an animal or is made, and no recipe comes before its ingredients', () => {
    const lv = firstLevel();
    for (const r of RECIPES) {
      for (const input of Object.keys(r.inputs)) {
        expect(ITEMS[input], `${r.id} needs ${input}`).toBeDefined();
        expect(lv.get(input), `${r.id}: ${input} can't be had`).toBeDefined();
        expect(lv.get(input)!, `${r.id} (level ${r.level}) needs ${input} (level ${lv.get(input)})`).toBeLessThanOrEqual(r.level);
      }
      expect(MACHINE[r.machine]!.level, `${r.id}'s workshop comes later`).toBeLessThanOrEqual(r.level);
    }
  });

  it('includes the classic chains wheat → flour → bread and wool → yarn → sweater', () => {
    expect(RECIPES.find(r => r.id === 'flour')!.inputs).toHaveProperty('wheat');
    expect(RECIPES.find(r => r.id === 'bread')!.inputs).toHaveProperty('flour');
    expect(RECIPES.find(r => r.id === 'yarn')!.inputs).toHaveProperty('wool');
    expect(RECIPES.find(r => r.id === 'sweater')!.inputs).toHaveProperty('yarn');
  });

  it('makes every good worth more than its ingredients', () => {
    for (const r of RECIPES) {
      const inputs = Object.entries(r.inputs).reduce((s, [i, n]) => s + ITEMS[i]!.price * n, 0);
      expect(ITEMS[r.id]!.price, r.id).toBeGreaterThan(inputs);
    }
  });
});

describe('workshops at work', () => {
  it('a windmill turns wheat into flour, one job at a time, and keeps finished flour waiting', () => {
    const farm = rich();
    const r = buyAndPlace(farm, { kind: 'building', def: 'mill' }, { x: 44, z: 38, rot: 0 });
    expect(r.ok).toBe(true);
    const mill = r.ok ? r.obj : null!;
    add(farm, 'wheat', 1, 6);
    expect(startJob(farm, mill, 'flour').ok).toBe(true);
    expect(startJob(farm, mill, 'flour').ok).toBe(true);
    expect(startJob(farm, mill, 'flour').ok).toBe(false); // no wheat left (and the queue is full)
    expect(count(farm, 'wheat')).toBe(0);
    expect(jobLeft(farm, mill)).toBe(120);
    grow(farm, 2.1);
    expect(machineState(mill).shelf).toHaveLength(1);
    grow(farm, 2.1);
    expect(machineState(mill).shelf).toHaveLength(2);
    // a long wait changes nothing: finished flour never spoils
    grow(farm, 30);
    const c = collectGoods(farm, mill);
    expect(c.ok && c.got.length).toBe(2);
    expect(count(farm, 'flour')).toBe(2);
  });

  it('good ingredients make good goods', () => {
    const farm = rich();
    const r = buyAndPlace(farm, { kind: 'building', def: 'mill' }, { x: 44, z: 38, rot: 0 });
    const mill = r.ok ? r.obj : null!;
    add(farm, 'wheat', 3, 3);
    add(farm, 'wheat', 1, 3);
    startJob(farm, mill, 'flour'); // takes the three 3-star wheat first
    grow(farm, 2.1);
    collectGoods(farm, mill);
    expect(count(farm, 'flour', 3)).toBe(1);
  });

  it('upgrades add queue slots and work faster', () => {
    const farm = rich();
    const r = buyAndPlace(farm, { kind: 'building', def: 'bakery' }, { x: 44, z: 38, rot: 0 });
    const bakery = r.ok ? r.obj : null!;
    expect(slotsOf(bakery)).toBe(2);
    expect(upgradeMachine(farm, bakery).ok).toBe(true);
    expect(upgradeMachine(farm, bakery).ok).toBe(true);
    expect(upgradeMachine(farm, bakery).ok).toBe(false);
    expect(slotsOf(bakery)).toBe(4);
    add(farm, 'flour', 1, 2);
    startJob(farm, bakery, 'bread');
    expect(jobLeft(farm, bakery)).toBeCloseTo(3 * 60 * 0.7, 5);
  });
});
