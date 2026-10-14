/** Phase 11: the farm stand (prices and shoppers) and contracts with Larkford's businesses. */
import { describe, expect, it } from 'vitest';
import { BUSINESSES } from '../../src/data/businesses';
import { ITEMS } from '../../src/data/items';
import { decodeFarm, encodeFarm } from '../../src/save/save';
import { DAY_SEC } from '../../src/sim/clock';
import { contractFor, contractsOpen, contractsTick, CONTRACT_PAY, sendDrop } from '../../src/sim/contracts';
import { assign, hire } from '../../src/sim/helpers';
import { add, count } from '../../src/sim/inventory';
import { obtainable, TRIP } from '../../src/sim/orders';
import { priceOf } from '../../src/sim/market';
import { buyChance, priceWord, setPrice, shelfCount, shelves, shelfPrice, SHELF_MAX, standOpen, standTick, stock, unstock, WANTED } from '../../src/sim/stand';
import { newFarm, type Farm } from '../../src/sim/state';
import { advance } from '../../src/sim/tick';

const run = (farm: Farm, seconds: number) => { for (let i = 0; i < seconds; i++) advance(farm, 1); };
const atChapter = (ch: number, seed = 1) => { const farm = newFarm(seed); farm.story.chapter = ch; farm.coins = 5000; farm.xp = 1e7; return farm; };

describe('the farm stand', () => {
  it('opens in chapter 2 with six shelves (more from the Lab)', () => {
    expect(standOpen(newFarm(1))).toBe(false);
    const farm = atChapter(1);
    expect(standOpen(farm)).toBe(true);
    expect(shelves(farm)).toHaveLength(6);
    farm.flags['lab:stand1'] = 1;
    expect(shelfCount(farm)).toBe(8);
    expect(shelves(farm)).toHaveLength(8);
  });

  it('takes things from the barn and gives them back; one kind per shelf', () => {
    const farm = atChapter(1);
    add(farm, 'wheat', 2, 20);
    add(farm, 'egg', 1, 3);
    expect(stock(farm, 0, 'wheat', 2, 5)).toEqual({ ok: true, n: 5 });
    expect(count(farm, 'wheat')).toBe(15);
    expect(stock(farm, 0, 'egg', 1, 1).ok).toBe(false);
    expect(stock(farm, 0, 'wheat', 2, 99)).toEqual({ ok: true, n: SHELF_MAX - 5 });
    expect(unstock(farm, 0)).toEqual({ ok: true, n: SHELF_MAX });
    expect(count(farm, 'wheat')).toBe(20);
    expect(stock(farm, 1, 'fertilizer', 1, 1).ok).toBe(false);
  });

  it('prices go from 60% to 160% of a fair stand price, in steps, with a word for each', () => {
    const farm = atChapter(1);
    add(farm, 'cabbage', 1, 4);
    stock(farm, 0, 'cabbage', 1, 4);
    setPrice(farm, 0, 9);
    expect(shelves(farm)[0]!.price).toBe(1.6);
    setPrice(farm, 0, 0.1);
    expect(shelves(farm)[0]!.price).toBe(0.6);
    expect([0.6, 1, 1.3, 1.6].map(priceWord)).toEqual(['Bargain', 'Fair', 'A bit pricey', 'Pricey']);
    setPrice(farm, 0, 1);
    // a fair stand price is better than the market's
    expect(shelfPrice(farm, shelves(farm)[0]!)).toBeGreaterThan(priceOf(farm, 'cabbage', 1));
  });

  it('shoppers buy less as the price goes up, and more from a varied stand', () => {
    expect(buyChance('wheat', 'spring', 0.6, 1)).toBeGreaterThan(buyChance('wheat', 'spring', 1, 1));
    expect(buyChance('wheat', 'spring', 1, 1)).toBeGreaterThan(buyChance('wheat', 'spring', 1.6, 1));
    expect(buyChance('wheat', 'spring', 1, 6)).toBeGreaterThan(buyChance('wheat', 'spring', 1, 1));
    expect(buyChance('lemonade', 'summer', 1, 1)).toBeGreaterThan(buyChance('lemonade', 'winter', 1, 1));
    for (const p of [0.6, 1, 1.6]) expect(buyChance('lemonade', 'summer', p, 10)).toBeLessThanOrEqual(0.9);
    for (const ids of Object.values(WANTED)) for (const id of ids) expect(ITEMS[id], id).toBeDefined();
  });

  it('sells while you play: a bargain sells more, a high price earns more for each', () => {
    const sell = (price: number) => {
      const farm = atChapter(1, 7);
      add(farm, 'cabbage', 1, 40);
      for (let i = 0; i < 3; i++) { stock(farm, i, 'cabbage', 1, 12); setPrice(farm, i, price); }
      const coins = farm.coins;
      run(farm, 60 * 20);
      const sold = farm.stats['stand-sold'] ?? 0;
      return { sold, each: sold ? (farm.coins - coins) / sold : 0 };
    };
    const cheap = sell(0.6), dear = sell(1.6);
    expect(cheap.sold).toBeGreaterThan(dear.sold);
    expect(dear.each).toBeGreaterThan(cheap.each);
    expect(cheap.sold).toBeGreaterThan(0);
  });

  it('remembers a few days of sales, and a helper keeps shelves topped up', () => {
    const farm = atChapter(2, 8);
    add(farm, 'wheat', 1, 60);
    stock(farm, 0, 'wheat', 1, 2);
    setPrice(farm, 0, 0.6);
    hire(farm, { x: 36, z: 40 });
    assign(farm, 0, 'deliver');
    run(farm, DAY_SEC * 6);
    expect(farm.stand.days.length).toBeLessThanOrEqual(4);
    expect(farm.stats['stand-sold']).toBeGreaterThan(2);
    expect(farm.stats['helper:deliveries']).toBeGreaterThan(0);
  });
});

describe('contracts', () => {
  it('each business opens with its chapter, one contract at a time', () => {
    const farm = atChapter(1);
    contractsTick(farm);
    expect(farm.contracts).toEqual([]);
    farm.story.chapter = 2;
    contractsTick(farm);
    expect(farm.contracts.map(c => c.business)).toEqual(['bakery']);
    farm.story.chapter = 6;
    contractsTick(farm);
    expect(farm.contracts.map(c => c.business).sort()).toEqual(BUSINESSES.map(b => b.id).sort());
    expect(contractsOpen(farm)).toHaveLength(4);
  });

  it('asks for 3 to 5 baskets of things the farm can make, and pays better than the board', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const farm = atChapter(6, seed);
      contractsTick(farm);
      const can = obtainable(farm);
      for (const c of farm.contracts) {
        expect(c.drops).toBeGreaterThanOrEqual(3);
        expect(c.drops).toBeLessThanOrEqual(5);
        for (const x of c.basket) expect(can.has(x.id) || BUSINESSES.find(b => b.id === c.business)!.wants[0] === x.id, x.id).toBe(true);
        const value = c.basket.reduce((s, x) => s + ITEMS[x.id]!.price * x.n, 0);
        expect(c.coinsPerDrop).toBe(Math.round(value * CONTRACT_PAY));
      }
    }
  });

  it('a basket is wanted about once a day, waits for you, and the boat takes it to town', () => {
    const farm = atChapter(2, 3);
    contractsTick(farm);
    const c = contractFor(farm, 'bakery')!;
    expect(sendDrop(farm, 'bakery').ok).toBe(false); // nothing in the barn yet
    for (const x of c.basket) add(farm, x.id, 1, x.n * 10);
    expect(sendDrop(farm, 'bakery').ok).toBe(true);
    expect(sendDrop(farm, 'bakery').ok).toBe(false); // the next is wanted tomorrow
    const coins = farm.coins;
    run(farm, TRIP + 5);
    expect(farm.stats['contract:bakery']).toBe(1);
    expect(farm.coins - coins).toBeGreaterThanOrEqual(c.coinsPerDrop);
    // days later, still wanted: nothing ever expires
    run(farm, DAY_SEC * 3);
    expect(sendDrop(farm, 'bakery').ok).toBe(true);
  });

  it('finishing every basket pays a bonus and two Lab ideas, then a new contract comes', () => {
    const farm = atChapter(2, 4);
    contractsTick(farm);
    const c = contractFor(farm, 'bakery')!;
    for (const x of c.basket) add(farm, x.id, 1, x.n * 10);
    for (let i = 0; i < c.drops; i++) {
      expect(sendDrop(farm, 'bakery').ok).toBe(true);
      run(farm, DAY_SEC + 5);
    }
    run(farm, TRIP * 3);
    expect(farm.stats['contracts-done']).toBe(1);
    expect(farm.ideas).toBe(2);
    const next = contractFor(farm, 'bakery');
    expect(next && next !== c).toBe(true);
    expect(next!.round).toBe(1);
  });

  it('a helper on Deliveries sends wanted baskets', () => {
    const farm = atChapter(2, 5);
    contractsTick(farm);
    const c = contractFor(farm, 'bakery')!;
    for (const x of c.basket) add(farm, x.id, 1, x.n * 10);
    hire(farm, { x: 36, z: 40 });
    assign(farm, 0, 'deliver');
    run(farm, 20);
    expect(c.sent + c.done).toBe(1);
  });

  it('the stand and contracts survive a save', () => {
    const farm = atChapter(2, 6);
    add(farm, 'wheat', 1, 20);
    stock(farm, 0, 'wheat', 1, 6);
    setPrice(farm, 0, 1.3);
    contractsTick(farm);
    run(farm, 200);
    const back = decodeFarm(JSON.parse(JSON.stringify(encodeFarm(farm)))).farm;
    expect(back.stand.slots[0]).toEqual(farm.stand.slots[0]);
    expect(back.contracts).toEqual(farm.contracts);
    const raw = JSON.parse(JSON.stringify(encodeFarm(farm)));
    raw.stand.slots[0].price = 99;
    raw.contracts.push({ business: 'moon', basket: [] });
    const fixed = decodeFarm(raw).farm;
    expect(fixed.stand.slots[0]!.price).toBe(1.6);
    expect(fixed.contracts).toHaveLength(1);
  });
});
