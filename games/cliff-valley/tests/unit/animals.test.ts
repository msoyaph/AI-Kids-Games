import { describe, expect, it } from 'vitest';
import { Sim } from '../../src/sim';
import { addAnimal, canBuy, touchAnimal, capacity } from '../../src/sim/animals';
import { buy, shopStock } from '../../src/sim/shops';
import { count } from '../../src/sim/inventory';

const mk = () => Sim.newGame({ name: 'Pip', farm: 'Daisy', pet: 'dog', petName: 'Rex', seed: 21 });

describe('animals & buildings', () => {
  it('the carpenter builds a coop over two nights', () => {
    const sim = mk();
    sim.p.coins = 100000;
    sim.p.inv[10] = { id: 'wood', n: 99, q: 0 };
    sim.p.inv[11] = { id: 'wood', n: 99, q: 0 };
    sim.p.inv[12] = { id: 'stone', n: 99, q: 0 };
    const e = shopStock(sim, 'carpenter').find((x) => x.id === 'bld.coop0')!;
    expect(e).toBeDefined();
    expect(buy(sim, 'carpenter', e).ok).toBe(true);
    expect(count(sim.p.inv, 'wood')).toBe(198 - 150);
    // only one project at a time
    const barn = shopStock(sim, 'carpenter').find((x) => x.id === 'bld.barn0')!;
    expect(barn.locked).toBeTruthy();
    sim.sleep();
    expect(sim.state.buildings.built.coop).toBeUndefined();
    sim.sleep();
    expect(sim.state.buildings.built.coop).toBe(0);
    expect(capacity(sim, 'coop')).toBe(4);
    // the coop door now leads inside
    const farm = sim.loc('farm');
    expect(farm.warps.some((w) => w.to === 'coop')).toBe(true);
  });

  it('happy, fed animals make products; unfed ones do not', () => {
    const sim = mk();
    sim.state.buildings.built.coop = 0;
    sim.state.buildings.built.silo = 0;
    sim.refreshLoc('farm');
    expect(canBuy(sim, 'chicken').ok).toBe(true);
    expect(canBuy(sim, 'duck').ok).toBe(false);
    const hen = addAnimal(sim, 'chicken', 'Nugget');
    hen.fed = true;
    sim.sleep();
    expect(hen.prod).toBe('egg');
    const r = touchAnimal(sim, hen);
    expect(r.kind).toBe('collect');
    expect(count(sim.p.inv, 'egg')).toBe(1);
    // a winter day with no hay → hungry, no product
    sim.state.day = 31;
    sim.state.buildings.hay = 0;
    hen.fed = false;
    sim.state.tomorrow = 'snow';
    sim.sleep();
    expect(hen.fed).toBe(false);
    sim.sleep();
    expect(hen.prod).toBeNull();
  });

  it('silo hay feeds animals on snowy days', () => {
    const sim = mk();
    sim.state.buildings.built.barn = 0;
    sim.state.buildings.built.silo = 0;
    sim.state.buildings.hay = 10;
    const cow = addAnimal(sim, 'cow', 'Buttercup');
    sim.state.day = 31;
    sim.state.tomorrow = 'snow';
    sim.sleep();
    expect(cow.fed).toBe(true);
    expect(sim.state.buildings.hay).toBe(9);
  });

  it('house upgrade adds a kitchen', () => {
    const sim = mk();
    sim.p.coins = 99999;
    sim.p.inv[10] = { id: 'wood', n: 99, q: 0 };
    sim.p.inv[11] = { id: 'wood', n: 99, q: 0 };
    sim.p.inv[12] = { id: 'wood', n: 99, q: 0 };
    sim.p.inv[13] = { id: 'wood', n: 99, q: 0 };
    const e = shopStock(sim, 'carpenter').find((x) => x.id === 'house.1')!;
    expect(buy(sim, 'carpenter', e).ok).toBe(true);
    sim.sleep();
    sim.sleep();
    expect(sim.state.buildings.houseLevel).toBe(1);
    expect(sim.loc('farmhouse').def.triggers.some((t) => t.action === 'kitchen')).toBe(true);
  });
});
