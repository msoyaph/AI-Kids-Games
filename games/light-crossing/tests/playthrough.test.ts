import { describe, expect, it } from 'vitest';
import { makeGame } from './helpers';
import { craftItem, deliverAll, donateSome, expectDone, nextDay, placePlot, setHour, talk } from './story';
import { orderUpgrade, payLoan } from '../src/sim/housing';
import { buy, dailyStock } from '../src/sim/economy';
import { give, money } from '../src/sim/inventory';
import { FISH, BUGS, FOSSILS } from '../src/data/registry';
import { assessFossil } from '../src/sim/museum';
import { enterInterior, exitInterior } from '../src/sim/interior';
import { vstate } from '../src/sim/villagers';

describe('story playthrough (chapters 1-2)', () => {
  it('can be completed through the real systems', () => {
    const g = makeGame(5150);
    // --- Chapter 1
    expect(g.state.quests.active.m1_arrive).toBeTruthy();
    expect(talk(g, 'pemberly')).toBe(true);
    expectDone(g, 'm1_arrive');
    deliverAll(g, 'pemberly');
    expectDone(g, 'm1_camp');
    expect(g.state.home.level).toBe(0);
    for (const r of ['r_net_flimsy', 'r_rod_flimsy', 'r_axe_flimsy', 'r_shovel_flimsy']) craftItem(g, r);
    expectDone(g, 'm1_tools');
    for (let k = 0; k < 2; k++) {
      g.emit('fishCaught', { id: FISH[0]!.id, size: 2, where: 'river', rarity: 1 });
      g.emit('bugCaught', { id: BUGS[0]!.id, rarity: 1 });
    }
    expectDone(g, 'm1_catch');
    g.state.stats.digSpots = 2;
    g.emit('woodChopped', { id: 'timber', qty: 5 });
    // evaluate happens on events; force one more evaluation tick
    g.update(1, null);
    expectDone(g, 'm1_dig');
    setHour(g, 12);
    talk(g, 'pemberly'); // too early
    expect(g.state.quests.active.m1_evening!.counts[0]).toBe(0);
    setHour(g, 18);
    talk(g, 'pemberly');
    nextDay(g);
    expectDone(g, 'm1_evening');
    expect(g.state.quests.chapter).toBe(2);
    // --- Chapter 2
    expect(g.state.world.structures.some((s) => s.type === 'shopCart')).toBe(true);
    talk(g, 'fennimore');
    g.emit('itemSold', { id: 'timber', qty: 50, total: 2500, category: 'material' });
    expectDone(g, 'm2_cart');
    deliverAll(g, 'fennimore');
    expectDone(g, 'm2_shop');
    talk(g, 'pemberly'); // house talk
    expect(orderUpgrade(g)).toBe(true);
    nextDay(g);
    expect(g.state.home.level).toBe(1);
    money(g, 3000);
    payLoan(g, 3000);
    expect(g.state.world.structures.some((s) => s.type === 'shop')).toBe(true);
    money(g, 5000);
    const e = dailyStock(g, 'shop')[0]!;
    expect(buy(g, e)).toBe(true);
    expectDone(g, 'm2_open');
    expectDone(g, 'm2_house');
    // neighbors
    placePlot(g, 'tansy');
    placePlot(g, 'rusk');
    for (const r of ['r_furn_driftwood_stool', 'r_furn_wick_lantern', 'r_furn_woven_rug']) craftItem(g, r);
    deliverAll(g, 'pemberly');
    expectDone(g, 'm2_neighbors');
    nextDay(g);
    expect(vstate(g, 'tansy').movedIn).toBe(true);
    talk(g, 'tansy');
    talk(g, 'rusk');
    g.update(1, null);
    expectDone(g, 'm2_greet');
    // --- Chapter 3 (museum part)
    while (g.state.clock.day < 6) nextDay(g);
    expect(g.state.quests.active.m3_vesper).toBeTruthy();
    talk(g, 'vesper');
    donateSome(g, [...FISH.slice(0, 5).map((f) => f.id)]);
    expectDone(g, 'm3_vesper');
    donateSome(g, [...FISH.slice(5, 10).map((f) => f.id), ...BUGS.slice(0, 5).map((b) => b.id)]);
    g.update(1, null);
    talk(g, 'vesper');
    expectDone(g, 'm3_museum');
    nextDay(g);
    enterInterior(g, 'museum');
    exitInterior(g);
    give(g, 'fossil_unknown', 1);
    assessFossil(g);
    g.update(1, null);
    expectDone(g, 'm3_open');
    expect(FOSSILS.length).toBeGreaterThan(0);
  });
});
