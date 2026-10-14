/**
 * The biggest farm a player could ever have (for the storage budget): every area open, every free
 * dry tile a field with a variety growing, greenhouses full, every helper, a full stand, every
 * contract, full ledger pages, every ribbon slot, every item in the barn at every star, long stats.
 */
import { BUILDINGS } from '../../src/data/buildings';
import { CROPS } from '../../src/data/crops';
import { DECOR } from '../../src/data/decor';
import { HELPER_NAMES } from '../../src/data/cast';
import { ITEMS } from '../../src/data/items';
import { BUSINESSES } from '../../src/data/businesses';
import { RECIPES } from '../../src/data/production';
import { VARIETIES } from '../../src/data/varieties';
import { TREES } from '../../src/data/orchard';
import { AREAS, AREA_IDS, tileAt } from '../../src/sim/map';
import { newField, tileKey, type Obj } from '../../src/sim/objects';
import { newFarm, type Farm } from '../../src/sim/state';
import { occupancy } from '../../src/sim/world';

export function maxFarm(seed = 99): Farm {
  const farm = newFarm(seed);
  farm.t = 987654.321;
  farm.xp = 123456789;
  farm.coins = 98765432;
  farm.unlocked = [...AREA_IDS];
  farm.story.chapter = 8;
  // a few big buildings first (they take room from fields)
  let id = 10000;
  const add = (o: Obj) => { farm.objects.push(o); };
  const occ = () => occupancy(farm);
  const big = BUILDINGS.filter(b => !b.fixed && b.w * b.d >= 4);
  let bx = 20;
  for (const b of big.slice(0, 6)) { add({ id: id++, kind: 'building', def: b.id, x: bx, z: 40, rot: 0, data: b.plots ? { plots: Array.from({ length: b.plots }, (_, i) => ({ crop: CROPS[i % CROPS.length]!.id, variety: null, plantedAt: 98765.4321, readyAt: 99999.123 })) } : { level: 3, queue: [{ recipe: 'bread', stars: 3, minutes: 4.25, startedAt: 98765.4321, endsAt: 99012.3456 }], shelf: [{ recipe: 'cake', stars: 2 }] } }); bx += 4; }
  for (let i = 0; i < 20; i++) add({ id: id++, kind: 'tree', def: TREES[i % TREES.length]!.id, x: 2 + i, z: 3, rot: 0, data: { readyAt: 99999.123456, picks: 9, compost: true } });
  const taken = occ();
  // every other free dry tile: a field with a variety growing, all care flags, rich soil
  for (const a of AREAS) for (let z = a.z0; z <= a.z1; z++) for (let x = a.x0; x <= a.x1; x++) {
    if (tileAt(x, z).water || taken.has(tileKey(x, z))) continue;
    const f = newField(id++, x, z, 0);
    const v = VARIETIES[(x + z) % VARIETIES.length]!;
    Object.assign(f, { crop: v.crop, variety: v.id, plantedAt: 987000.123456, readyAt: 987999.987654, watered: true, fertilized: true, rotation: true, boost: true, humus: true, last: 'legume', nit: 3, hum: 3, restSince: null });
    add(f);
  }
  farm.nextId = id;
  farm.paths = '4'.repeat(56 * 56).split('').map((c, i) => (i % 7 ? '0' : c)).join('');
  for (const it of Object.keys(ITEMS)) farm.inv[it] = [999, 999, 999];
  for (const d of DECOR) farm.storage[`decor:${d.id}`] = 99;
  for (let s = 0; s < 8; s++) farm.ledger.push({
    season: 100 + s,
    grown: Object.fromEntries(CROPS.map(c => [c.id, 12345])),
    made: Object.fromEntries(RECIPES.map(r => [r.id, 12345])),
    earned: 9876543, spent: 9876543,
    cropEarned: Object.fromEntries(CROPS.map(c => [c.id, 123456])),
    cropSpent: Object.fromEntries(CROPS.map(c => [c.id, 123456])),
  });
  for (const it of Object.keys(ITEMS)) { farm.stats[`harvest:${it}`] = 123456; farm.stats[`planted:${it}`] = 123456; farm.stats[`made:${it}`] = 123456; }
  farm.story.base = { ...farm.stats };
  farm.discovered = VARIETIES.filter(v => !v.heirloom).map(v => v.id);
  farm.ideas = 999;
  farm.ribbons = Array.from({ length: 48 }, (_, i) => ({ season: 100 + i, cat: 'produce', place: 1 as const, grand: true }));
  farm.ribbonCount = [999, 999, 999, 999];
  farm.helpers = HELPER_NAMES.map((name, i) => ({ name, job: 'animals' as const, zone: 'all' as const, homes: Array.from({ length: 12 }, (_, k) => 10000 + k), machine: 10001, recipe: 'bread', done: { water: 9999, harvest: 9999, animals: 9999, workshop: 9999, deliver: 9999 }, task: { action: { type: 'water' as const, x: 12, z: 34 }, x: 12, z: 34 }, nextAt: 987654.321 + i, x: 12.5, z: 34.5 }));
  farm.stand.slots = Array.from({ length: 10 }, (_, i) => ({ item: VARIETIES[i]!.id, stars: 3 as const, n: 12, price: 1.6, keep: 12 }));
  farm.stand.days = Array.from({ length: 4 }, (_, d) => ({ day: 2000 + d, sold: Object.fromEntries(VARIETIES.slice(0, 10).map(v => [v.id, { n: 99, coins: 99999, price: 1.6, left: 12 }])) }));
  farm.contracts = BUSINESSES.map(b => ({ business: b.id, basket: [{ id: b.wants[0]!, n: 99 }, { id: b.wants[1]!, n: 99 }], drops: 5, done: 4, sent: 1, wantedAt: 987654.321, coinsPerDrop: 99999, bonus: 99999, round: 99 }));
  return farm;
}
