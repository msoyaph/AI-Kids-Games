/** Phase 9: soil health, the weather forecast, varieties and cross-breeding, and the four-class fair. */
import { describe, expect, it } from 'vitest';
import { CROP } from '../../src/data/crops';
import { ITEMS } from '../../src/data/items';
import { VARIETIES, VARIETY } from '../../src/data/varieties';
import { buyAndPlace } from '../../src/sim/build';
import { DAY_SEC, dayIndex, SEASON_DAYS } from '../../src/sim/clock';
import { care, clearDebris, fertilize, harvest, plant, plow } from '../../src/sim/fields';
import { dayEvent, forecast, hayTied, HAY_XP, spawnMushrooms, tieHay } from '../../src/sim/forecast';
import { add, count } from '../../src/sim/inventory';
import { tileAt } from '../../src/sim/map';
import { sell } from '../../src/sim/market';
import type { FieldObj } from '../../src/sim/objects';
import { SOIL_START, soilAfterHarvest } from '../../src/sim/soil';
import { newFarm, type Farm } from '../../src/sim/state';
import { advance } from '../../src/sim/tick';
import { crossOf, varietyChoice } from '../../src/sim/varieties';
import { rainyDay, snowing } from '../../src/sim/weather';
import { categoryOf, depthOf, enterFair, judge } from '../../src/sim/fair';
import { decodeFarm } from '../../src/save/save';
import { ledgerNow } from '../../src/sim/world';

const isWater = (x: number, z: number) => x >= 0 && z >= 0 && x < 56 && z < 56 && tileAt(x, z).water;
const fields = (farm: Farm) => farm.objects.filter((o): o is FieldObj => o.kind === 'field');
const ripen = (farm: Farm, f: FieldObj) => { farm.t = Math.max(farm.t, f.readyAt); };
const hive = (farm: Farm, x: number, z: number) => { const r = buyAndPlace(farm, { kind: 'building', def: 'beehive' }, { x, z, rot: 0 }); if (!r.ok) throw new Error(r.why); return r.obj; };

/** Plenty of coins and every level open. */
const rich = (farm: Farm) => { farm.coins = 50000; farm.xp = 1e7; return farm; };

describe('soil health', () => {
  it('starts tired, and hungry crops use nitrogen while clover feeds the soil', () => {
    const farm = newFarm(1);
    farm.coins = 1000;
    const f = fields(farm)[0]!;
    expect([f.nit, f.hum]).toEqual([SOIL_START.nit, SOIL_START.hum]);
    plant(farm, f, 'wheat', isWater);
    expect(f.boost || f.humus).toBe(false);
    ripen(farm, f);
    harvest(farm, f);
    expect(f.nit).toBe(0); // wheat is hungry
    plant(farm, f, 'clover', isWater);
    ripen(farm, f);
    harvest(farm, f);
    expect([f.nit, f.hum]).toEqual([2, 2]);
    plant(farm, f, 'wheat', isWater);
    expect(f.boost && f.humus).toBe(true);
    expect(care(farm, f).points).toBeGreaterThanOrEqual(3); // rotation, nitrogen, humus
  });

  it('compost adds humus; the same family twice uses some; a season of rest pays some back', () => {
    const farm = rich(newFarm(2));
    const f = fields(farm)[0]!;
    plant(farm, f, 'onion', isWater);
    add(farm, 'fertilizer', 1, 2);
    fertilize(farm, f);
    expect(f.hum).toBe(2);
    ripen(farm, f);
    harvest(farm, f);
    expect(f.nit).toBe(1); // onions are light feeders
    farm.t += 60;
    plant(farm, f, 'onion', isWater); // same family again
    ripen(farm, f);
    harvest(farm, f);
    expect(f.hum).toBe(1);
    farm.t += DAY_SEC * SEASON_DAYS;
    expect(plant(farm, f, 'wheat', isWater).ok).toBe(true);
    expect(f.hum).toBe(2);
  });

  it('never goes below empty or above full', () => {
    const f = newFarm(3).objects.find((o): o is FieldObj => o.kind === 'field')!;
    for (let i = 0; i < 6; i++) soilAfterHarvest(f, CROP.wheat!, 0);
    expect(f.nit).toBe(0);
    for (let i = 0; i < 6; i++) soilAfterHarvest(f, CROP.clover!, 0);
    expect([f.nit, f.hum]).toEqual([3, 3]);
  });

  it('gives a newly ploughed field tired soil too', () => {
    const farm = newFarm(4);
    const r = plow(farm, 41, 38);
    expect(r.ok && [r.field.nit, r.field.hum]).toEqual([1, 1]);
  });
});

describe('the forecast', () => {
  const seed = 99;
  const days = Array.from({ length: 4 * SEASON_DAYS * 4 }, (_, d) => d);

  it('has at most one gentle event a day, the same every time, and a calm first day', () => {
    expect(dayEvent(seed, 0)).toBeNull();
    for (const d of days) expect(dayEvent(seed, d)).toBe(dayEvent(seed, d));
    for (const d of days) if (rainyDay(seed, d)) expect(dayEvent(seed, d)).toBe('rain');
    for (const d of days) if (dayEvent(seed, d) === 'snow') expect(snowing(seed, d * DAY_SEC + DAY_SEC * 0.4)).toBe(true);
    const seen = new Set(days.map(d => dayEvent(seed, d)));
    for (const e of ['rain', 'sunny', 'windy', 'misty', 'snow', 'warmnight']) expect(seen.has(e as never), e).toBe(true);
  });

  it('shows today and the next two days', () => {
    const farm = newFarm(seed);
    farm.t = 10 * DAY_SEC + 5;
    expect(forecast(farm).map(f => f.day)).toEqual([10, 11, 12]);
  });

  it('makes crops grow faster on a sunny day', () => {
    const sunny = days.find(d => dayEvent(seed, d) === 'sunny')!;
    const calm = days.find(d => d > 0 && dayEvent(seed, d) === null && dayEvent(seed, d) !== 'rain')!;
    const grown = (day: number) => {
      const farm = newFarm(seed);
      farm.t = day * DAY_SEC + 10;
      const f = fields(farm)[0]!;
      f.crop = 'wheat'; f.plantedAt = farm.t; f.readyAt = farm.t + 1000;
      for (let i = 0; i < 100; i++) advance(farm, 1);
      return f.readyAt - farm.t;
    };
    expect(grown(sunny)).toBeLessThan(grown(calm) - 10);
  });

  it('rewards tying the hay down before a windy day, and asks nothing otherwise', () => {
    const windy = days.find(d => d > 1 && dayEvent(seed, d) === 'windy')!;
    const run = (tie: boolean) => {
      const farm = newFarm(seed);
      farm.t = (windy - 1) * DAY_SEC + DAY_SEC - 2;
      if (tie) expect(tieHay(farm, windy)).toBe(true);
      expect(tieHay(farm, windy + 5)).toBe(false); // too far ahead
      const xp = farm.xp;
      advance(farm, 4);
      return farm.xp - xp;
    };
    expect(run(true)).toBeGreaterThanOrEqual(HAY_XP);
    expect(run(false)).toBe(0);
  });

  it('brings at most three clumps of mushrooms after a misty morning, at the edges of open land', () => {
    const farm = newFarm(seed);
    expect(spawnMushrooms(farm, 5)).toBe(3);
    expect(spawnMushrooms(farm, 6)).toBe(0);
    const clumps = farm.objects.filter(o => o.def === 'mushrooms');
    expect(clumps).toHaveLength(3);
    const r = clearDebris(farm, clumps[0]!.id);
    expect(r.ok && r.got).toEqual({ id: 'mushroom', n: 3 });
    expect(count(farm, 'mushroom')).toBe(3);
    expect(farm.stats.cleared ?? 0).toBe(0); // foraging isn't clearing clutter
  });

  it('forgets old getting-ready notes', () => {
    const windy = days.find(d => d > 1 && dayEvent(seed, d) === 'windy')!;
    const farm = newFarm(seed);
    farm.t = windy * DAY_SEC + 5;
    tieHay(farm, windy);
    expect(hayTied(farm, windy)).toBe(true);
    farm.t = (windy + 1) * DAY_SEC - 1;
    advance(farm, 2);
    expect(Object.keys(farm.flags).some(k => k.startsWith('hay:'))).toBe(false);
  });
});

describe('varieties', () => {
  it('gives each of twelve crops one heirloom and one or two to find, all real items', () => {
    const crops = new Set(VARIETIES.map(v => v.crop));
    expect(crops.size).toBe(12);
    for (const c of crops) {
      const vs = VARIETIES.filter(v => v.crop === c);
      expect(vs.filter(v => v.heirloom), c).toHaveLength(1);
      expect(vs.filter(v => !v.heirloom).length, c).toBeGreaterThanOrEqual(1);
      expect(CROP[c]!.flowers, c).toBe(true);
    }
    for (const v of VARIETIES) {
      expect(ITEMS[v.id]?.base).toBe(v.crop);
      expect(ITEMS[v.id]!.price).toBeGreaterThan(CROP[v.crop]!.price);
      // every parent is the ordinary crop or another variety of it
      for (const p of v.parents ?? []) expect(p === v.crop || VARIETY[p]?.crop === v.crop, `${v.id} ← ${p}`).toBe(true);
    }
    expect(new Set(VARIETIES.map(v => v.name)).size).toBe(VARIETIES.length);
  });

  it('every variety can be found, step by step, from the crop and its heirloom', () => {
    const known = new Set<string>();
    for (const v of VARIETIES) if (v.heirloom) { known.add(v.id); known.add(v.crop); }
    for (let pass = 0; pass < 4; pass++) for (const v of VARIETIES) if (v.parents?.every(p => known.has(p))) known.add(v.id);
    for (const v of VARIETIES) expect(known.has(v.id), v.id).toBe(true);
  });

  it('sells heirloom seeds from chapter 4', () => {
    const farm = newFarm(5);
    expect(varietyChoice(farm, 'strawberry')).toHaveLength(0);
    farm.story.chapter = 3;
    expect(varietyChoice(farm, 'strawberry').map(v => v.id)).toEqual(['strawberry-white']);
  });

  const crossFarm = (withHive: boolean, diagonal = false) => {
    const farm = rich(newFarm(6));
    farm.story.chapter = 3;
    const [a, b] = diagonal ? [fields(farm)[0]!, fields(farm)[3]!] : [fields(farm)[0]!, fields(farm)[1]!];
    if (withHive) hive(farm, 41, 40);
    return { farm, a, b };
  };
  const tryCross = (farm: Farm, a: FieldObj, b: FieldObj, rounds: number) => {
    for (let i = 0; i < rounds && !farm.discovered.length; i++) {
      plant(farm, a, 'strawberry', isWater);
      if (!b.crop) plant(farm, b, 'strawberry', isWater, 'strawberry-white');
      ripen(farm, a);
      harvest(farm, a);
    }
  };

  it('finds a new variety when two kinds grow side by side near bees (and soon, even when unlucky)', () => {
    const { farm, a, b } = crossFarm(true);
    expect(crossOf(farm, 'strawberry', 'strawberry', 'strawberry-white')?.id).toBe('strawberry-yellow');
    tryCross(farm, a, b, 9);
    expect(farm.discovered).toEqual(['strawberry-yellow']);
    expect(farm.stats.bred).toBe(1);
    expect(farm.ideas).toBe(1);
    expect(varietyChoice(farm, 'strawberry').map(v => v.id)).toContain('strawberry-yellow');
  });

  it('needs the bees, and the fields must touch side by side', () => {
    for (const [hiveToo, diagonal] of [[false, false], [true, true]] as const) {
      const { farm, a, b } = crossFarm(hiveToo, diagonal);
      tryCross(farm, a, b, 12);
      expect(farm.discovered).toEqual([]);
    }
  });

  it('a variety is its own item, and sales count towards its crop in the ledger', () => {
    const farm = newFarm(7);
    farm.story.chapter = 3;
    farm.coins = 500;
    const f = fields(farm)[0]!;
    expect(plant(farm, f, 'strawberry', isWater, 'strawberry-white').ok).toBe(true);
    expect(farm.stats['planted-heirloom']).toBe(1);
    ripen(farm, f);
    const r = harvest(farm, f);
    expect(r.ok && r.item).toBe('strawberry-white');
    expect(count(farm, 'strawberry-white')).toBeGreaterThan(0);
    sell(farm, 'strawberry-white', 1, 1);
    expect(ledgerNow(farm).cropEarned.strawberry).toBeGreaterThan(0);
  });
});

describe('the fair', () => {
  it('sorts things into classes', () => {
    expect(categoryOf('wheat')).toBe('produce');
    expect(categoryOf('egg')).toBe('produce');
    expect(categoryOf('bread')).toBe('made');
    expect(categoryOf('strawberry-yellow')).toBe('variety');
    expect(categoryOf('strawberry-white')).toBe('produce'); // heirlooms are bought, not bred
    expect(categoryOf('fertilizer')).toBeNull();
    expect(depthOf('flour')).toBe(1);
    expect(depthOf('bread')).toBe(2);
  });

  it('judges every class you enter, plus the prettiest farm, and hangs a ribbon for each', () => {
    const farm = newFarm(8);
    farm.t = 2 * SEASON_DAYS * DAY_SEC + (SEASON_DAYS - 1) * DAY_SEC + 10; // last day of the first autumn
    add(farm, 'pumpkin', 3, 1);
    add(farm, 'bread', 2, 1);
    add(farm, 'strawberry-yellow', 3, 2);
    const coins = farm.coins;
    const r = enterFair(farm, [{ id: 'pumpkin', stars: 3 }, { id: 'bread', stars: 2 }, { id: 'strawberry-yellow', stars: 3 }])!;
    expect(r.cats.map(c => c.cat)).toEqual(['produce', 'made', 'variety', 'pretty']);
    expect(farm.ribbons).toHaveLength(4);
    expect(farm.ribbonCount.reduce((a, b) => a + b, 0)).toBe(4);
    expect(farm.coins - coins).toBe(r.coins);
    expect(r.coins).toBeGreaterThanOrEqual(4 * 15); // even thank-you ribbons pay a little
    expect(farm.ideas).toBe(r.ideas);
    expect(r.wall && farm.flags['set:ribbons']).toBe(1);
    expect(count(farm, 'pumpkin')).toBe(1); // entries come home
    expect(enterFair(farm, [])).toBeNull(); // once a season
  });

  it('lets a well-cared-for entry win even late in the second year, and the Grand Fair pays double', () => {
    let wins = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const farm = newFarm(seed);
      farm.t = 7 * SEASON_DAYS * DAY_SEC + 10;
      add(farm, 'cake', 3, 1);
      const r = judge(farm, [{ id: 'cake', stars: 3 }]);
      if (r.cats[0]!.place === 1) wins++;
      const g = judge(farm, [{ id: 'cake', stars: 3 }], true);
      expect(g.cats[0]!.coins).toBe(2 * [0, 120, 70, 40, 15][g.cats[0]!.place]!);
    }
    expect(wins).toBeGreaterThan(5);
    expect(wins).toBeLessThan(30);
  });

  it('only judges what the barn really holds', () => {
    const farm = newFarm(9);
    const r = judge(farm, [{ id: 'cake', stars: 3 }]);
    expect(r.cats.map(c => c.cat)).toEqual(['pretty']);
  });
});

describe('saves from before phase 9', () => {
  it('turn a legume’s old yes/no into nitrogen, and keep the new things tidy', () => {
    const farm = newFarm(10);
    const raw = JSON.parse(JSON.stringify(farm));
    const f = raw.objects.find((o: { kind: string }) => o.kind === 'field');
    delete f.nit; delete f.hum; delete f.humus; delete f.variety; delete f.restSince;
    f.legumeLeft = true;
    delete raw.discovered; delete raw.ideas; delete raw.ribbons; delete raw.ribbonCount;
    const back = decodeFarm(raw).farm;
    const g = back.objects.find((o): o is FieldObj => o.kind === 'field')!;
    expect([g.nit, g.hum, g.variety]).toEqual([2, 1, null]);
    expect([back.discovered, back.ideas, back.ribbons, back.ribbonCount]).toEqual([[], 0, [], [0, 0, 0, 0]]);
    raw.discovered = ['strawberry-yellow', 'strawberry-white', 'nope', 'strawberry-yellow'];
    expect(decodeFarm(raw).farm.discovered).toEqual(['strawberry-yellow']);
  });
});

it('a day index helper sanity check', () => { expect(dayIndex(DAY_SEC * 3 + 1)).toBe(3); });
