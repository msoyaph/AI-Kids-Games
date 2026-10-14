/** Fields and crops: planting, care stars, rotation, rain, compost, harvest, and kindness. */
import { describe, expect, it } from 'vitest';
import { CROP, CROPS } from '../../src/data/crops';
import { TUNING } from '../../src/data/tuning';
import { DAY_SEC, SEASON_DAYS } from '../../src/sim/clock';
import { care, cantPlant, clearDebris, fertilize, fieldState, harvest, plant, plow, water } from '../../src/sim/fields';
import { add, count, roomLeft } from '../../src/sim/inventory';
import { tileAt } from '../../src/sim/map';
import type { FieldObj } from '../../src/sim/objects';
import { newFarm, type Farm } from '../../src/sim/state';
import { advance, catchUp, stuck } from '../../src/sim/tick';
import { rainyDay } from '../../src/sim/weather';
import { priceOf, sell } from '../../src/sim/market';

const isWater = (x: number, z: number) => x >= 0 && z >= 0 && x < 56 && z < 56 && tileAt(x, z).water;
const fields = (farm: Farm) => farm.objects.filter((o): o is FieldObj => o.kind === 'field');
const grow = (farm: Farm, minutes: number) => { for (let i = 0; i < minutes * 60; i++) advance(farm, 1); };

describe('fields', () => {
  it('starts with six empty fields and some coins', () => {
    const farm = newFarm(1);
    expect(fields(farm)).toHaveLength(6);
    expect(fields(farm).every(f => fieldState(farm, f) === 'empty')).toBe(true);
    expect(farm.coins).toBe(TUNING.startCoins);
  });

  it('grows wheat in play minutes, then waits for you forever', () => {
    const farm = newFarm(1);
    const f = fields(farm)[0]!;
    expect(plant(farm, f, 'wheat', isWater)).toEqual({ ok: true });
    expect(farm.coins).toBe(TUNING.startCoins - CROP.wheat!.seed);
    expect(fieldState(farm, f)).toBe('growing');
    grow(farm, CROP.wheat!.growMin);
    expect(fieldState(farm, f)).toBe('ready');
    // a whole year later it is still there, still ready: nothing wilts
    farm.t += DAY_SEC * SEASON_DAYS * 4;
    expect(fieldState(farm, f)).toBe('ready');
    const h = harvest(farm, f);
    expect(h.ok).toBe(true);
    expect(count(farm, 'wheat')).toBe(CROP.wheat!.yield);
    expect(fieldState(farm, f)).toBe('empty');
  });

  it('only plants crops that are in season, unlocked and affordable', () => {
    const farm = newFarm(1);
    const f = fields(farm)[0]!;
    expect(cantPlant(farm, f, CROP.pumpkin!, isWater)).toMatch(/level/);
    farm.xp = 1e9;
    expect(cantPlant(farm, f, CROP.pumpkin!, isWater)).toMatch(/doesn’t grow in spring/);
    expect(cantPlant(farm, f, CROP.rice!, isWater)).toMatch(/doesn’t grow|wet/);
    farm.coins = 0;
    expect(cantPlant(farm, f, CROP.wheat!, isWater)).toMatch(/cost/);
  });

  it('gives stars for care: watering, compost, rotation and a legume before', () => {
    const farm = newFarm(2);
    const f = fields(farm)[0]!;
    plant(farm, f, 'wheat', isWater);
    expect(care(farm, f).stars).toBe(1);
    expect(water(farm, f).ok).toBe(true);
    expect(care(farm, f).stars).toBe(2);
    grow(farm, 3);
    harvest(farm, f);
    // clover after wheat: rotation; then wheat after clover: rotation + nitrogen
    plant(farm, f, 'clover', isWater);
    expect(f.rotation).toBe(true);
    grow(farm, 2);
    harvest(farm, f);
    plant(farm, f, 'wheat', isWater);
    expect(f.rotation && f.boost).toBe(true);
    water(farm, f);
    expect(care(farm, f).stars).toBe(3);
    grow(farm, 3);
    const h = harvest(farm, f);
    expect(h.ok && h.stars).toBe(3);
    expect(h.ok && h.amount).toBe(CROP.wheat!.yield + 1); // nitrogen adds one
  });

  it('compost makes a crop grow faster and costs a bag', () => {
    const farm = newFarm(3);
    const f = fields(farm)[0]!;
    expect(plant(farm, f, 'strawberry', isWater).ok).toBe(true);
    expect(fertilize(farm, f).ok).toBe(false);
    add(farm, 'fertilizer', 1, 1);
    const before = f.readyAt - farm.t;
    expect(fertilize(farm, f).ok).toBe(true);
    expect(f.readyAt - farm.t).toBeCloseTo(before * (1 - TUNING.compostSpeed), 5);
    expect(count(farm, 'fertilizer')).toBe(0);
  });

  it('turns harvest scraps into compost in the bin', () => {
    const farm = newFarm(4);
    farm.scraps = TUNING.scrapsPerBag;
    advance(farm, 1);
    expect(farm.compostUntil).not.toBeNull();
    grow(farm, TUNING.compostMin + 0.1);
    expect(count(farm, 'fertilizer')).toBe(1);
  });

  it('rain waters every growing field', () => {
    const farm = newFarm(5);
    let day = 1;
    while (!rainyDay(farm.seed, day)) day++;
    const f = fields(farm)[0]!;
    farm.t = day * DAY_SEC + DAY_SEC * (TUNING.rainFrom - 0.02);
    farm.coins = 999;
    plant(farm, f, 'clover', isWater);
    expect(f.watered).toBe(false);
    advance(farm, DAY_SEC * 0.05);
    expect(f.watered).toBe(true);
  });

  it('ploughs new fields on open, empty, dry land only', () => {
    const farm = newFarm(6);
    expect(plow(farm, 46, 44).ok).toBe(true);
    expect(plow(farm, 46, 44).ok).toBe(false); // taken
    expect(plow(farm, 25, 45).ok).toBe(false); // the meadow isn't open
    expect(plow(farm, 51, 44).ok).toBe(false); // the river
  });

  it('keeps the harvest waiting when the barn is full', () => {
    const farm = newFarm(7);
    const f = fields(farm)[0]!;
    plant(farm, f, 'wheat', isWater);
    grow(farm, 3);
    add(farm, 'clover', 1, roomLeft(farm));
    expect(harvest(farm, f).ok).toBe(false);
    expect(fieldState(farm, f)).toBe('ready');
  });

  it('clears old clutter for scraps and coins', () => {
    const farm = newFarm(8);
    const junk = farm.objects.find(o => o.kind === 'debris' && o.x >= 34 && o.z >= 36)!;
    const r = clearDebris(farm, junk.id);
    expect(r.ok).toBe(true);
    expect(farm.objects.includes(junk)).toBe(false);
    const locked = farm.objects.find(o => o.kind === 'debris' && o.x < 30)!;
    expect(clearDebris(farm, locked.id).ok).toBe(false);
  });
});

describe('the market', () => {
  it('pays more for more stars, and less for crops in season', () => {
    const farm = newFarm(9);
    const p1 = priceOf(farm, 'wheat', 1), p3 = priceOf(farm, 'wheat', 3);
    expect(p3).toBeGreaterThan(p1);
    // pumpkins are out of season in spring: worth more than their base price
    expect(priceOf(farm, 'pumpkin', 1)).toBeGreaterThan(CROP.pumpkin!.price * TUNING.inSeason);
    add(farm, 'wheat', 1, 5);
    const coins = farm.coins;
    const r = sell(farm, 'wheat', 1, 5);
    expect(r.ok).toBe(true);
    expect(farm.coins).toBe(coins + p1 * 5);
    expect(sell(farm, 'wheat', 1, 1).ok).toBe(false);
  });

  it('never buys supplies like compost', () => {
    const farm = newFarm(10);
    add(farm, 'fertilizer', 1, 1);
    expect(sell(farm, 'fertilizer', 1, 1).ok).toBe(false);
  });
});

describe('kindness', () => {
  it('never lets you stay stuck: no coins, nothing growing, nothing to sell → free seeds', () => {
    const farm = newFarm(11);
    farm.coins = 0;
    expect(stuck(farm)).toBe(true);
    const events = advance(farm, 1);
    expect(events.some(e => e.type === 'safety-net')).toBe(true);
    expect(farm.freeSeeds).toBe(TUNING.safetySeeds);
    const f = fields(farm)[0]!;
    expect(plant(farm, f, 'clover', isWater).ok).toBe(true);
    expect(farm.coins).toBe(0);
  });

  it('recovers from every broke state: free seeds always lead back to coins', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const farm = newFarm(seed);
      farm.coins = seed % 3;
      farm.t += (seed % 4) * DAY_SEC * SEASON_DAYS; // any season, winter included
      advance(farm, 1);
      for (const f of fields(farm)) {
        const crop = CROPS.find(c => !cantPlant(farm, f, c, isWater));
        if (crop) plant(farm, f, crop.id, isWater);
      }
      grow(farm, 15);
      for (const f of fields(farm)) if (fieldState(farm, f) === 'ready') harvest(farm, f);
      for (const [id, s] of Object.entries(farm.inv)) for (const st of [1, 2, 3] as const) if (s[st - 1]) sell(farm, id, st, s[st - 1]);
      expect(farm.coins, `seed ${seed}`).toBeGreaterThan(0);
    }
  });

  it('“while you were away” only ever helps, and at most a little', () => {
    const farm = newFarm(12);
    const f = fields(farm)[0]!;
    expect(plant(farm, f, 'strawberry', isWater).ok).toBe(true);
    const t0 = farm.t, ready0 = f.readyAt;
    catchUp(farm, 99999);
    expect(farm.t).toBe(t0); // no seasons pass
    expect(ready0 - f.readyAt).toBeLessThanOrEqual(TUNING.awayCapMin * 60);
    expect(f.readyAt).toBeGreaterThanOrEqual(farm.t);
    expect(catchUp(farm, -50)).toBe(0);
  });
});
