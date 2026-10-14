/** Orchards and animals: always fine on their own, better with care, and bees that help. */
import { describe, expect, it } from 'vitest';
import { ANIMAL } from '../../src/data/animals';
import { TREE } from '../../src/data/orchard';
import { xpForLevel } from '../../src/data/tuning';
import { decodeFarm, encodeFarm } from '../../src/save/save';
import { animalsIn, brushAll, buyAnimal, collect, feedAll, hiveNear, isHome, isReady, productStars } from '../../src/sim/animals';
import { buyAndPlace, placeCheck } from '../../src/sim/build';
import { DAY_SEC, SEASON_DAYS } from '../../src/sim/clock';
import { care, fieldState, harvest, plant } from '../../src/sim/fields';
import { add, count } from '../../src/sim/inventory';
import { tileAt } from '../../src/sim/map';
import type { FieldObj, OtherObj } from '../../src/sim/objects';
import { newFarm, type Farm } from '../../src/sim/state';
import { advance, stuck } from '../../src/sim/tick';
import { pickTree, treeCare, treeRipe, treeState } from '../../src/sim/trees';

const isWater = (x: number, z: number) => x >= 0 && z >= 0 && x < 56 && z < 56 && tileAt(x, z).water;
const grow = (farm: Farm, minutes: number) => { for (let i = 0; i < minutes * 60; i++) advance(farm, 1); };
const rich = (seed = 1) => { const f = newFarm(seed); f.xp = xpForLevel(20); f.coins = 100000; f.objects = f.objects.filter(o => o.kind !== 'debris'); return f; };
const place = (farm: Farm, kind: 'building' | 'tree', def: string, x: number, z: number) => {
  const r = buyAndPlace(farm, { kind, def }, { x, z, rot: 0 });
  if (!r.ok) throw new Error(r.why);
  return r.obj;
};

describe('animals', () => {
  it('starts with the farm dog, who is always fine', () => {
    const farm = newFarm(1);
    const kennel = farm.objects.find(o => o.kind === 'building' && o.def === 'kennel') as OtherObj;
    expect(animalsIn(kennel).map(a => a.name)).toEqual(['Rufus']);
    grow(farm, 30);
    expect(isReady(farm, animalsIn(kennel)[0]!)).toBe(false);
  });

  it('chickens lay eggs on their own, faster when fed, better when fed and brushed', () => {
    const farm = rich();
    const coop = place(farm, 'building', 'coop', 44, 38);
    expect(buyAnimal(farm, coop).ok).toBe(true);
    const hen = animalsIn(coop)[0]!;
    // unfed: twice the time, one star
    grow(farm, ANIMAL.chicken!.everyMin);
    expect(isReady(farm, hen)).toBe(false);
    grow(farm, ANIMAL.chicken!.everyMin);
    expect(isReady(farm, hen)).toBe(true);
    expect(productStars(farm, coop, hen)).toBe(1);
    const c = collect(farm, coop);
    expect(c.ok && c.total).toBe(1);
    expect(count(farm, 'egg', 1)).toBe(1);
    // fed and brushed: half the time left, three stars
    expect(feedAll(farm, coop).ok).toBe(false); // no feed yet
    add(farm, 'wheat', 1, 3);
    expect(feedAll(farm, coop).ok).toBe(true);
    expect(brushAll(farm, coop).ok).toBe(true);
    grow(farm, ANIMAL.chicken!.everyMin + 0.05);
    expect(isReady(farm, hen)).toBe(true);
    expect(productStars(farm, coop, hen)).toBe(3);
    collect(farm, coop);
    expect(count(farm, 'egg', 3)).toBe(1);
  });

  it('never takes more animals than a home holds, and asks for the level', () => {
    const farm = rich();
    const coop = place(farm, 'building', 'coop', 44, 38);
    for (let i = 0; i < 6; i++) expect(buyAnimal(farm, coop).ok).toBe(true);
    expect(buyAnimal(farm, coop).ok).toBe(false);
    expect(new Set(animalsIn(coop).map(a => a.name)).size).toBe(6);
    const poor = newFarm(2);
    poor.coins = 99999;
    expect(buyAndPlace(poor, { kind: 'building', def: 'coop' }, { x: 44, z: 38, rot: 0 }).ok).toBe(false); // level 3
  });

  it('a duck house must touch water', () => {
    const farm = rich();
    farm.unlocked.push('pond', 'riverside');
    expect(placeCheck(farm, { kind: 'building', def: 'duckhouse' }, { x: 44, z: 38, rot: 0 }).ok).toBe(false);
    expect(placeCheck(farm, { kind: 'building', def: 'duckhouse' }, { x: 48, z: 30, rot: 0 }).ok).toBe(true);
  });

  it('bees help flowering crops near their hive: a care point and one more to pick', () => {
    const farm = rich();
    const f = farm.objects.find((o): o is FieldObj => o.kind === 'field')!;
    expect(hiveNear(farm, f.x, f.z)).toBe(false);
    place(farm, 'building', 'beehive', f.x + 3, f.z + 3);
    expect(hiveNear(farm, f.x, f.z)).toBe(true);
    plant(farm, f, 'strawberry', isWater);
    expect(care(farm, f).bees).toBe(true);
    grow(farm, 3.1);
    const h = harvest(farm, f);
    expect(h.ok && h.amount).toBe(5); // 4 + 1 from the bees
  });

  it('honey gets better with more flowers near the hive', () => {
    const farm = rich();
    const hive = place(farm, 'building', 'beehive', 46, 38);
    const bees = animalsIn(hive)[0]!;
    expect(productStars(farm, hive, bees)).toBe(1);
    for (const [x, z] of [[44, 38], [44, 39], [45, 39], [46, 40], [47, 40], [44, 41], [45, 41], [46, 41]]) place(farm, 'tree', 'raspberry', x!, z!);
    expect(productStars(farm, hive, bees)).toBe(3);
  });
});

describe('orchards', () => {
  it('a tree fruits again and again, gets better with age, and rests out of season', () => {
    const farm = rich();
    const tree = place(farm, 'tree', 'apricot', 44, 38); // spring and summer
    const def = TREE.apricot!;
    grow(farm, def.firstMin + 0.1);
    expect(treeRipe(farm, tree)).toBe(true);
    for (let i = 0; i < 3; i++) {
      expect(pickTree(farm, tree).ok).toBe(true);
      grow(farm, def.againMin + 0.1);
    }
    expect(treeCare(farm, tree).established).toBe(true);
    expect(count(farm, 'apricot')).toBe(def.yield * 3);
    // autumn: it rests, and ripe fruit is still there afterwards
    pickTree(farm, tree);
    farm.t = DAY_SEC * SEASON_DAYS * 2 + 10; // autumn
    treeState(tree).readyAt = farm.t + 300; // part-way to its next fruit
    grow(farm, 10);
    expect(treeState(tree).readyAt - farm.t).toBeCloseTo(300, 3); // it waited
    expect(treeRipe(farm, tree)).toBe(false);
  });
});

describe('kindness and saves', () => {
  it('with animals or trees, nobody is stuck: they will always bring something to sell', () => {
    const farm = rich();
    const coop = place(farm, 'building', 'coop', 44, 38);
    buyAnimal(farm, coop);
    farm.coins = 0;
    expect(stuck(farm)).toBe(false);
  });

  it('animals and trees survive a save and a load', () => {
    const farm = rich();
    const coop = place(farm, 'building', 'coop', 44, 38);
    buyAnimal(farm, coop); buyAnimal(farm, coop);
    place(farm, 'tree', 'plum', 46, 38);
    const back = decodeFarm(JSON.parse(JSON.stringify(encodeFarm(farm))));
    expect(back.status).toBe('ok');
    const homes = back.farm.objects.filter(isHome);
    expect(homes.map(h => animalsIn(h).length).sort()).toEqual([1, 2]);
    expect(back.farm.objects.some(o => o.kind === 'tree' && o.def === 'plum')).toBe(true);
    // the dog's "never" stays a plain number in JSON
    expect(JSON.stringify(encodeFarm(farm))).not.toContain('null,"fed"');
    expect(fieldState(back.farm, back.farm.objects.find((o): o is FieldObj => o.kind === 'field')!)).toBe('empty');
  });
});
