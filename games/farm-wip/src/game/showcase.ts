/**
 * A staged, grown-up farm for the capture route (?scene=showcase) and the website's previews: fields
 * of different crops, an orchard, animals, workshops, paths, fences and flowers, the boat at the dock.
 * Built in memory with the real rules; it is never saved.
 */
import { xpForLevel } from '../data/tuning';
import { buyAnimal } from '../sim/animals';
import { buyAndPlace } from '../sim/build';
import { DAY_SEC } from '../sim/clock';
import { paintPath, placeDecor } from '../sim/decorate';
import { plant, plow } from '../sim/fields';
import { add } from '../sim/inventory';
import { areaAt, tileAt } from '../sim/map';
import type { FieldObj } from '../sim/objects';
import { newFarm, type Farm } from '../sim/state';
import { startJob } from '../sim/production';
import { advance } from '../sim/tick';

const isWater = (x: number, z: number) => x >= 0 && z >= 0 && x < 56 && z < 56 && tileAt(x, z).water;

export function showcaseFarm(seed = 7): Farm {
  const farm = newFarm(seed);
  farm.xp = xpForLevel(14);
  farm.coins = 200000;
  farm.unlocked = ['home', 'meadow', 'orchard'];
  // a tidy farm: no clutter left on the open land
  farm.objects = farm.objects.filter(o => o.kind !== 'debris' || !farm.unlocked.includes(areaAt(o.x, o.z) ?? 'hilltop'));
  farm.t = DAY_SEC * 6 * 1 + DAY_SEC * 0.04; // summer, early: the staging below adds about five minutes
  const place = (def: string, x: number, z: number, rot: 0 | 1 | 2 | 3 = 0) => { const r = buyAndPlace(farm, { kind: 'building', def }, { x, z, rot }); return r.ok ? r.obj : null; };
  const coop = place('coop', 44, 37);
  if (coop) for (let i = 0; i < 5; i++) buyAnimal(farm, coop);
  const barn = place('cowbarn', 41, 37);
  if (barn) for (let i = 0; i < 3; i++) buyAnimal(farm, barn);
  place('beehive', 45, 47);
  const mill = place('mill', 38, 49);
  const bakery = place('bakery', 35, 49);
  place('sheepshed', 46, 50);
  // fields: a few rows of different crops at different stages
  const rows: [number, string][] = [[46, 'wheat'], [47, 'strawberry'], [48, 'cucumber']];
  for (const [z, crop] of rows) for (let x = 40; x <= 44; x++) {
    let f = farm.objects.find((o): o is FieldObj => o.kind === 'field' && o.x === x && o.z === z);
    if (!f) { const r = plow(farm, x, z); f = r.ok ? r.field : undefined; }
    if (f && !f.crop) plant(farm, f, crop, isWater);
  }
  // the orchard on the meadow's edge, and the meadow's first fields
  for (const [i, t] of ['plum', 'apricot', 'raspberry', 'lemon', 'gooseberry', 'plum'].entries()) buyAndPlace(farm, { kind: 'tree', def: t }, { x: 26 + (i % 3) * 2, z: 38 + Math.floor(i / 3) * 2, rot: 0 });
  for (let x = 20; x <= 25; x++) for (const z of [45, 46]) { const r = plow(farm, x, z); if (r.ok) plant(farm, r.field, x % 2 ? 'oats' : 'onion', isWater); }
  // paths, a fence and flowers
  for (let x = 34; x <= 47; x++) paintPath(farm, x, 44, 2);
  for (let z = 40; z <= 43; z++) paintPath(farm, 40, z, 2);
  for (let x = 40; x <= 44; x++) placeDecor(farm, 'picket', { x, z: 45, rot: 0 });
  for (const [x, z, d] of [[39, 45, 'flowers_sun'], [45, 45, 'flowers_rose'], [46, 45, 'flowers_sky'], [44, 43, 'bench'], [39, 43, 'lamp'], [47, 43, 'scarecrow'], [48, 47, 'haybale']] as const) placeDecor(farm, d, { x, z, rot: 0 });
  // things growing and being made
  for (let i = 0; i < 90; i++) advance(farm, 2);
  add(farm, 'wheat', 2, 12);
  if (mill) { startJob(farm, mill, 'flour'); startJob(farm, mill, 'flour'); }
  add(farm, 'flour', 2, 4);
  if (bakery) startJob(farm, bakery, 'bread');
  for (let i = 0; i < 30; i++) advance(farm, 4);
  farm.cam = { x: 41, z: 44, yawStep: 0, zoom: 30 };
  return farm;
}
