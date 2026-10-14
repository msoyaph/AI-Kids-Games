/**
 * A staged, grown-up farm for the capture route (?scene=showcase) and the website's previews: fields
 * of different crops, an orchard, animals, workshops, paths, fences and flowers, the boat at the dock.
 * Built in memory with the real rules; it is never saved.
 */
import { boxPoints } from '../render/camera';
import { objPoints } from './framing';
import { HOME_POND } from '../sim/map';
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
import { plantPlot } from '../sim/greenhouse';
import { assign, hire } from '../sim/helpers';
import { stock } from '../sim/stand';
import { digChannel } from '../sim/water';

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
  // late in the story: helpers at work, a greenhouse, water channels from the river, the stand stocked
  farm.story.chapter = 7;
  farm.story.introSeen = true;
  farm.flags.levelSeen = 14;
  farm.flags['set:ribbons'] = 1;
  const gh = place('greenhouse', 46, 39);
  if (gh) for (const [i, c] of ['strawberry', 'bellpepper', 'watermelon', 'cabbage'].entries()) plantPlot(farm, gh, i, c);
  for (let z = 37; z <= 41; z++) { const o = farm.objects.find(ob => ob.x === 49 && ob.z === z); if (!o) digChannel(farm, 49, z); }
  for (let z = 37; z <= 40; z++) { if (!farm.objects.some(o => o.x === 48 && o.z === z)) { const r = plow(farm, 48, z); if (r.ok) plant(farm, r.field, z % 2 ? 'bokchoy' : 'cabbage', isWater); } }
  placeDecor(farm, 'sprinkler', { x: 48, z: 41, rot: 0 });
  placeDecor(farm, 'ribbonwall', { x: 34, z: 42, rot: 0 });
  const cot = farm.objects.find(o => o.def === 'cottage')!;
  for (const job of ['water', 'animals', 'deliver'] as const) { if (hire(farm, { x: cot.x + 1, z: cot.z + 3 })) assign(farm, farm.helpers.length - 1, job, { homes: farm.objects.filter(o => o.def === 'coop' || o.def === 'cowbarn').map(o => o.id) }); }
  for (const [i, id] of ['strawberry', 'egg', 'honey', 'cabbage', 'bread', 'pumpkin'].entries()) { add(farm, id, 3, 8); stock(farm, i, id, 3, 6); }
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

/**
 * The style frame: one corner of the home plot to judge the look by. The cottage and its pond, a
 * chicken coop, fields at every growth stage, a fence, fruit trees and some flowers.
 */
export function styleFrameFarm(seed = 7): Farm {
  const farm = newFarm(seed);
  farm.xp = xpForLevel(12);
  farm.coins = 200000;
  // a level-12 farm has bought the land next door
  farm.unlocked = ['home', 'meadow', 'riverside'];
  farm.objects = farm.objects.filter(o => o.kind !== 'debris' || !(o.x >= 33 && o.x <= 46 && o.z >= 36 && o.z <= 50));
  farm.t = DAY_SEC * 6 + DAY_SEC * 0.18; // early summer morning
  const coop = buyAndPlace(farm, { kind: 'building', def: 'coop' }, { x: 40, z: 37, rot: 0 });
  if (coop.ok) for (let i = 0; i < 4; i++) buyAnimal(farm, coop.obj);
  // fields in a block below the yard, planted at different times so every stage shows
  const fieldTiles: [number, number][] = [];
  for (let z = 46; z <= 48; z++) for (let x = 39; x <= 43; x++) fieldTiles.push([x, z]);
  const fields: FieldObj[] = [];
  for (const [x, z] of fieldTiles) {
    let f = farm.objects.find((o): o is FieldObj => o.kind === 'field' && o.x === x && o.z === z);
    if (!f) { const r = plow(farm, x, z); f = r.ok ? r.field : undefined; }
    if (f) fields.push(f);
  }
  // the old fields beside the cottage, too
  const home = farm.objects.filter((o): o is FieldObj => o.kind === 'field' && o.x >= 38 && o.x <= 39 && o.z >= 37 && o.z <= 39);
  const plantRow = (z: number, crop: string) => { for (const f of fields) if (f.z === z && !f.crop) plant(farm, f, crop, isWater); };
  const plantHome = (z: number, crop: string) => { for (const f of home) if (f.z === z && !f.crop) plant(farm, f, crop, isWater); };
  plantRow(48, 'wheat');
  plantHome(37, 'wheat');
  for (let i = 0; i < 60; i++) advance(farm, 2); // wheat is ready by the end
  plantRow(47, 'strawberry');
  plantHome(38, 'strawberry');
  for (let i = 0; i < 40; i++) advance(farm, 2);
  plantRow(46, 'cucumber');
  for (let i = 0; i < 25; i++) advance(farm, 2);
  plantHome(39, 'clover'); // just planted: sprouts
  for (const f of [...fields.filter(f => f.z === 47).slice(0, 3), ...home.filter(f => f.z === 38)]) f.watered = true;
  // a fence with flowers, fruit trees, a bench by the pond
  for (let x = 38; x <= 44; x++) placeDecor(farm, 'picket', { x, z: 45, rot: 0 });
  for (const [x, z, d] of [[34, 40, 'flowers_sun'], [36, 40, 'flowers_rose'], [37, 40, 'flowers_sun'], [38, 43, 'bench'], [39, 41, 'lamp'], [44, 47, 'scarecrow'], [44, 46, 'haybale'], [42, 39, 'milkcans'], [38, 47, 'wheelbarrow'], [45, 44, 'barrel']] as const) placeDecor(farm, d, { x, z, rot: 0 });
  for (const [x, z, t] of [[43, 40, 'plum'], [44, 42, 'apricot'], [38, 42, 'raspberry'], [33, 42, 'gooseberry'], [33, 39, 'apricot'], [42, 43, 'plum']] as const) buyAndPlace(farm, { kind: 'tree', def: t }, { x, z, rot: 0 });
  // some trees are ready to pick (heavy with fruit), the others still blooming
  for (const o of farm.objects) if (o.kind === 'tree' && ((o.x === 43 && o.z === 40) || (o.x === 33 && o.z === 39) || (o.x === 38 && o.z === 42))) (o.data ??= {}).readyAt = farm.t - 1;
  // a little working corner by the coop and flowers round the pond
  for (const [x, z, d] of [[42, 38, 'haybale'], [34, 44, 'flowers_mix'], [39, 42, 'flowers_rose'], [43, 37, 'barrel'], [41, 41, 'well']] as const) placeDecor(farm, d, { x, z, rot: 0 });
  farm.cam = { x: 38.8, z: 42.6, yawStep: 0, zoom: 0 }; // framed for the screen in main.ts (styleFramePoints)
  return farm;
}

/**
 * What the style frame's camera shows at its starting zoom: the cottage, the coop and the fields beside
 * the cottage, and the near edge of the pond (close, like the starting view of a farm).
 */
export function styleFramePoints(farm: Farm) {
  const pts = farm.objects.filter(o => o.def === 'cottage' || o.def === 'coop' || (o.kind === 'field' && o.x <= 39 && o.z <= 39)).flatMap(objPoints);
  pts.push(...boxPoints(HOME_POND.cx - HOME_POND.rx * 0.6, HOME_POND.cz - HOME_POND.rz, HOME_POND.cx + HOME_POND.rx * 0.6, HOME_POND.cz - HOME_POND.rz * 0.2, 0, 0));
  return pts;
}
