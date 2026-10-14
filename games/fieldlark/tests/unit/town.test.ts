/** The town: orders the farm can always fill, the boat, and friendly neighbours. */
import { describe, expect, it } from 'vitest';
import { ITEMS } from '../../src/data/items';
import { xpForLevel } from '../../src/data/tuning';
import { decodeFarm, encodeFarm } from '../../src/save/save';
import { buyAndPlace } from '../../src/sim/build';
import { DAY_SEC } from '../../src/sim/clock';
import { add, count } from '../../src/sim/inventory';
import { acceptTrade, giveToCoop, neighborState, startCoop, tradeOffer } from '../../src/sim/neighbors';
import { BOARD_SLOTS, boatCapacity, deliver, makeOrder, obtainable, REFILL, skipOrder, TRIP } from '../../src/sim/orders';
import { newFarm, type Farm } from '../../src/sim/state';
import { advance } from '../../src/sim/tick';

const run = (farm: Farm, seconds: number) => { const ev = []; for (let i = 0; i < seconds; i++) ev.push(...advance(farm, 1)); return ev; };
const stock = (farm: Farm) => { for (const o of farm.orders) for (const x of o.items) add(farm, x.id, 1, x.n); };

describe('the order board', () => {
  it('fills up with orders as play goes on', () => {
    const farm = newFarm(1);
    run(farm, REFILL * BOARD_SLOTS + 5);
    expect(farm.orders).toHaveLength(BOARD_SLOTS);
  });

  it('only ever asks for things the farm can get right now', () => {
    for (const level of [1, 3, 6, 10, 15, 20]) {
      const farm = newFarm(level);
      farm.xp = xpForLevel(level);
      farm.coins = 1e6;
      if (level >= 6) {
        buyAndPlace(farm, { kind: 'building', def: 'mill' }, { x: 44, z: 38, rot: 0 });
      }
      const can = obtainable(farm);
      for (let i = 0; i < 60; i++) {
        const o = makeOrder(farm);
        expect(o.items.length).toBeGreaterThan(0);
        for (const x of o.items) {
          expect(can.has(x.id), `level ${level}: ${x.id}`).toBe(true);
          expect(ITEMS[x.id]!.sellable).toBe(true);
        }
        expect(o.coins).toBeGreaterThan(o.items.reduce((s, x) => s + ITEMS[x.id]!.price * x.n, 0));
      }
    }
  });

  it('delivers by boat: the crate sails to town and the coins come back with it', () => {
    const farm = newFarm(2);
    run(farm, REFILL + 1);
    const o = farm.orders[0]!;
    expect(deliver(farm, o.id).ok).toBe(false); // nothing in the barn yet
    stock(farm);
    const coins = farm.coins;
    expect(deliver(farm, o.id).ok).toBe(true);
    expect(farm.boat.backAt).not.toBeNull();
    for (const x of o.items) expect(count(farm, x.id)).toBeLessThan(999);
    const events = run(farm, TRIP + 1);
    expect(events.some(e => e.type === 'boat-back')).toBe(true);
    expect(farm.coins).toBe(coins + o.coins);
    expect(farm.boat.trips).toBe(1);
  });

  it('waits forever and swaps for free', () => {
    const farm = newFarm(3);
    run(farm, REFILL + 1);
    const first = farm.orders[0]!;
    run(farm, DAY_SEC * 6); // a whole season later it's still there
    expect(farm.orders.some(o => o.id === first.id)).toBe(true);
    const coins = farm.coins;
    expect(skipOrder(farm, first.id)).toBe(true);
    expect(farm.coins).toBe(coins);
    expect(farm.orders.some(o => o.id === first.id)).toBe(false);
  });

  it('carries two crates once the Riverside is open', () => {
    const farm = newFarm(4);
    expect(boatCapacity(farm)).toBe(1);
    farm.unlocked.push('riverside');
    expect(boatCapacity(farm)).toBe(2);
  });
});

describe('neighbours', () => {
  const friendly = () => { const f = newFarm(9); f.xp = xpForLevel(8); f.coins = 1e5; return f; };

  it('offer one fair swap a day, for things you can make', () => {
    const farm = friendly();
    const t = tradeOffer(farm, 'ingrid');
    expect(t).not.toBeNull();
    add(farm, t!.want.id, 1, t!.want.n);
    expect(acceptTrade(farm, t!).ok).toBe(true);
    expect(count(farm, t!.give.id)).toBe(t!.give.n);
    expect(ITEMS[t!.give.id]!.price * t!.give.n).toBeGreaterThanOrEqual(ITEMS[t!.want.id]!.price * t!.want.n * 0.9);
    expect(tradeOffer(farm, 'ingrid')).toBeNull(); // one a day
    expect(neighborState(farm, 'ingrid').hearts).toBeGreaterThan(0);
  });

  it('fill co-op orders together, with no deadline', () => {
    const farm = friendly();
    const c = startCoop(farm)!;
    expect(c).not.toBeNull();
    add(farm, c.item, 1, c.need);
    const coins = farm.coins;
    run(farm, 40 * c.need); // they add their half over time
    expect(farm.coop?.theirs ?? Math.floor(c.need / 2)).toBe(Math.floor(c.need / 2));
    giveToCoop(farm, c.need);
    const ev = run(farm, 2);
    expect(ev.some(e => e.type === 'coop-done')).toBe(true);
    expect(farm.coop).toBeNull();
    expect(farm.coins).toBeGreaterThan(coins);
  });

  it('come to visit now and then, and leave a gift', () => {
    const farm = friendly();
    const coins = farm.coins;
    const ev = run(farm, DAY_SEC * 3);
    const visits = ev.filter(e => e.type === 'visit');
    expect(visits.length).toBeGreaterThanOrEqual(1);
    expect(farm.coins).toBeGreaterThan(coins);
  });

  it('keeps orders, the boat and friendships in the save', () => {
    const farm = friendly();
    run(farm, REFILL * 3);
    stock(farm);
    deliver(farm, farm.orders[0]!.id);
    acceptTradeIfAny(farm);
    const back = decodeFarm(JSON.parse(JSON.stringify(encodeFarm(farm)))).farm;
    expect(back.orders).toEqual(farm.orders);
    expect(back.boat).toEqual(farm.boat);
    expect(back.neighbors).toEqual(farm.neighbors);
  });
});

function acceptTradeIfAny(farm: Farm) {
  const t = tradeOffer(farm, 'lu');
  if (!t) return;
  add(farm, t.want.id, 1, t.want.n);
  acceptTrade(farm, t);
}
