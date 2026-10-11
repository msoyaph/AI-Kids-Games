import { describe, expect, it } from 'vitest';
import { Sim } from '../../src/sim';
import { CRAFTS, DISHES, RADIO_RECIPES, COOK_LEARN } from '../../src/data/recipes';
import { MACHINES } from '../../src/data/machines';
import { LETTERS } from '../../src/data/mail';
import { CUTSCENES } from '../../src/data/cutscenes';
import { choosePerk, cook, craft, pendingPerk, refreshLearned } from '../../src/sim/crafting';
import { loadMachine, advanceMachines } from '../../src/sim/machines';
import { placeItem, interactAt } from '../../src/sim/actions';
import { count } from '../../src/sim/inventory';
import { tryItem } from '../../src/data/items';
import { gainXp } from '../../src/sim/skills';
import { TUNING } from '../../src/tuning';
import { shopStock } from '../../src/sim/shops';

const mk = () => Sim.newGame({ name: 'Pip', farm: 'Daisy', pet: 'dog', petName: 'Rex', seed: 41 });

describe('crafting, cooking, machines, skills', () => {
  it('has 30+ recipes, 60+ crafts and the 8 required machines, all with real ingredients', () => {
    expect(DISHES.length).toBeGreaterThanOrEqual(30);
    expect(CRAFTS.length).toBeGreaterThanOrEqual(60);
    for (const m of ['preservesJar', 'juicer', 'cheesePress', 'loom', 'furnace', 'beeHouse', 'oilPress', 'recycler']) expect(MACHINES.some((x) => x.id === m), m).toBe(true);
    for (const c of CRAFTS) {
      expect(tryItem(c.out ?? c.id), `craft output ${c.id}`).toBeDefined();
      for (const [k] of c.ing) if (!k.includes(':')) expect(tryItem(k), `ingredient ${k}`).toBeDefined();
    }
    for (const d of DISHES) for (const [k] of d.ing) if (!k.includes(':')) expect(tryItem(k), `ingredient ${k}`).toBeDefined();
  });

  it('every cooking recipe can be learned somewhere', () => {
    const sources = new Set<string>([...Object.keys(COOK_LEARN), ...RADIO_RECIPES]);
    for (const l of LETTERS) if (l.attach?.recipe) sources.add(l.attach.recipe);
    for (const c of CUTSCENES) if (c.reward?.recipe) sources.add(c.reward.recipe);
    const sim = mk();
    sim.state.day = 0;
    // the café rotates recipe cards for anything unknown
    const cards = new Set<string>();
    for (let d = 0; d < 40; d++) {
      sim.state.day = d;
      for (const e of shopStock(sim, 'cafe')) if (e.service?.startsWith('recipe:')) cards.add(e.service.slice(7));
    }
    for (const d of DISHES) expect(sources.has(d.id) || cards.has(d.id), d.id).toBe(true);
  });

  it('crafting consumes ingredients and makes items', () => {
    const sim = mk();
    sim.p.inv[10] = { id: 'wood', n: 60, q: 0 };
    expect(craft(sim, 'chest').ok).toBe(true);
    expect(count(sim.p.inv, 'wood')).toBe(10);
    expect(count(sim.p.inv, 'chest')).toBe(1);
    expect(craft(sim, 'chest').ok).toBe(false);
  });

  it('skills unlock recipes and perks', () => {
    const sim = mk();
    expect(sim.p.crafts).not.toContain('sprinkler1');
    gainXp(sim, 'farming', TUNING.skillXp[1]);
    refreshLearned(sim);
    expect(sim.p.crafts).toContain('sprinkler1');
    gainXp(sim, 'farming', TUNING.skillXp[5]);
    const pend = pendingPerk(sim);
    expect(pend?.skill).toBe('farming');
    expect(choosePerk(sim, 'tiller')).toBe(true);
    expect(pendingPerk(sim)).toBeNull();
  });

  it('cooking makes dishes and gives cooking XP', () => {
    const sim = mk();
    sim.p.inv[10] = { id: 'egg', n: 2, q: 0 };
    expect(cook(sim, 'friedEgg').ok).toBe(true);
    expect(count(sim.p.inv, 'friedEgg')).toBe(1);
    expect(sim.p.xp.cooking).toBeGreaterThan(0);
  });

  it('machines process goods over time, including overnight', () => {
    const sim = mk();
    sim.warpTo('farm', 30, 12, 0);
    sim.p.inv[10] = { id: 'preservesJar', n: 1, q: 0 };
    sim.p.inv[11] = { id: 'strawberry', n: 1, q: 0 };
    const farm = sim.here;
    farm.removeObj(31, 12);
    expect(placeItem(sim, 'preservesJar', 31, 12).ok).toBe(true);
    const o = farm.obj(31, 12)!;
    expect(loadMachine(sim, o, 11).ok).toBe(true);
    advanceMachines(sim, 60);
    expect(o.out).toBeFalsy();
    sim.sleep();
    sim.sleep();
    expect(o.out?.id).toBe('jam.strawberry');
    sim.warpTo('farm', 30, 12, 2);
    const r = interactAt(sim, 31, 12);
    expect(r.type).toBe('collect');
    expect(count(sim.p.inv, 'jam.strawberry')).toBe(1);
  });

  it('the furnace smelts 5 ore + coal into a bar', () => {
    const sim = mk();
    sim.warpTo('farm', 30, 12, 0);
    sim.p.inv[10] = { id: 'furnace', n: 1, q: 0 };
    sim.p.inv[11] = { id: 'copperOre', n: 5, q: 0 };
    sim.p.inv[12] = { id: 'coal', n: 1, q: 0 };
    sim.here.removeObj(31, 12);
    placeItem(sim, 'furnace', 31, 12);
    const o = sim.here.obj(31, 12)!;
    expect(loadMachine(sim, o, 11).ok).toBe(true);
    expect(count(sim.p.inv, 'coal')).toBe(0);
    advanceMachines(sim, 30);
    expect(o.out?.id).toBe('copperBar');
  });
});
