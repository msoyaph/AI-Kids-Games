/**
 * Fields and crops: plough, plant, water, add compost, harvest, and clearing old clutter.
 *
 * Care makes stars. A crop earns a care point for each of: being watered (by hand or by rain),
 * compost, crop rotation (a different family from last time on this field), soil rich in nitrogen,
 * soil rich in humus (src/sim/soil.ts), and bees (flowering crops near a hive).
 * 0 points → 1 star, 1–2 → 2 stars, 3 or more → 3 stars. Nitrogen and bees also add to the harvest.
 * Nothing is ever lost by waiting: a ready crop stays ready until it is picked.
 */
import { CROP, type CropDef } from '../data/crops';
import { DEBRIS } from '../data/buildings';
import { TUNING } from '../data/tuning';
import { seasonOf } from './clock';
import { add, roomLeft, take, type Stars } from './inventory';
import { hiveNear } from './animals';
import { areaAt } from './map';
import { canPlace, newField, type FieldObj } from './objects';
import { soilAfterHarvest, soilAtPlanting, soilCompost } from './soil';
import { crossAtHarvest, seedPrice, varietyChoice } from './varieties';
import type { Farm } from './state';
import { raining } from './weather';
import { bump, earn, ledgerNow, levelOf, newId, objAt, occupancy, spend } from './world';


export type FieldState = 'empty' | 'growing' | 'ready';

export function fieldState(farm: Farm, f: FieldObj): FieldState {
  if (!f.crop) return 'empty';
  return farm.t >= f.readyAt ? 'ready' : 'growing';
}

/** 0..1 through growing. */
export function growth(farm: Farm, f: FieldObj): number {
  if (!f.crop) return 0;
  const total = f.readyAt - f.plantedAt;
  return total <= 0 ? 1 : Math.min(1, Math.max(0, (farm.t - f.plantedAt) / total));
}

export const fieldAt = (farm: Farm, x: number, z: number) => {
  const o = objAt(farm, x, z);
  return o && o.kind === 'field' ? o : undefined;
};

/** Does this tile touch water (for rice)? */
export function wetTile(x: number, z: number, isWater: (x: number, z: number) => boolean): boolean {
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if ((dx || dz) && isWater(x + dx, z + dz)) return true;
  return false;
}

export type Fail = { ok: false; why: string };
export type Done<T = object> = { ok: true } & T;

export function plow(farm: Farm, x: number, z: number): Done<{ field: FieldObj }> | Fail {
  const place = canPlace(occupancy(farm), farm.unlocked, { x, z, rot: 0 }, { w: 1, d: 1 });
  if (!place.ok) return { ok: false, why: place.reason === 'locked' ? 'That land isn’t open yet.' : place.reason === 'taken' ? 'Something is already there.' : place.reason === 'water' ? 'Fields can’t go on water.' : 'Fields go on farm land.' };
  if (!spend(farm, TUNING.fieldCost)) return { ok: false, why: `A new field costs ${TUNING.fieldCost} coins.` };
  const field = newField(newId(farm), x, z, farm.t);
  farm.objects.push(field);
  bump(farm, 'ploughed');
  return { ok: true, field };
}

/** Why a crop can't be planted on this field right now (or null if it can). `variety` is a variety id or null. */
export function cantPlant(farm: Farm, f: FieldObj, crop: CropDef, isWater: (x: number, z: number) => boolean, variety: string | null = null): string | null {
  if (f.crop) return 'This field is already growing something.';
  if (levelOf(farm) < crop.level) return `${crop.name} seeds come at farm level ${crop.level}.`;
  const season = seasonOf(farm.t);
  if (!crop.seasons.includes(season)) return `${crop.name} doesn’t grow in ${season}.`;
  if (crop.wet && !wetTile(f.x, f.z, isWater)) return `${crop.name} needs a wet field right next to water.`;
  if (variety && !varietyChoice(farm, crop.id).some(c => c.id === variety)) return 'Those seeds aren’t ready yet.';
  const price = seedPrice(crop, variety);
  if (!(variety === null && freePlanting(farm, crop)) && farm.coins < price) return `Those seeds cost ${price} coins.`;
  return null;
}

export function plant(farm: Farm, f: FieldObj, cropId: string, isWater: (x: number, z: number) => boolean, variety: string | null = null): Done | Fail {
  const crop = CROP[cropId];
  if (!crop) return { ok: false, why: 'Unknown seeds.' };
  const why = cantPlant(farm, f, crop, isWater, variety);
  if (why) return { ok: false, why };
  const price = seedPrice(crop, variety);
  if (variety === null && freePlanting(farm, crop)) farm.freeSeeds--;
  else if (!spend(farm, price, crop.id)) return { ok: false, why: `Those seeds cost ${price} coins.` };
  f.crop = crop.id;
  f.variety = variety;
  f.plantedAt = farm.t;
  f.readyAt = farm.t + crop.growMin * 60;
  f.rotation = f.last !== null && f.last !== crop.family;
  soilAtPlanting(f, farm.t);
  f.watered = raining(farm.seed, farm.t);
  f.fertilized = false;
  bump(farm, 'planted');
  bump(farm, `planted:${crop.id}`);
  if (variety) bump(farm, 'planted-heirloom');
  if (f.rotation) bump(farm, 'rotation');
  return { ok: true };
}

export function water(farm: Farm, f: FieldObj): Done | Fail {
  if (fieldState(farm, f) !== 'growing') return { ok: false, why: 'Water growing crops.' };
  if (f.watered) return { ok: false, why: 'Already watered.' };
  f.watered = true;
  bump(farm, 'watered');
  return { ok: true };
}

export function fertilize(farm: Farm, f: FieldObj): Done | Fail {
  if (fieldState(farm, f) !== 'growing') return { ok: false, why: 'Compost helps growing crops.' };
  if (f.fertilized) return { ok: false, why: 'This crop already has compost.' };
  if (!take(farm, 'fertilizer', 1)) return { ok: false, why: 'No compost yet. The compost bin makes it from scraps.' };
  f.fertilized = true;
  soilCompost(f);
  f.readyAt = farm.t + (f.readyAt - farm.t) * (1 - TUNING.compostSpeed);
  bump(farm, 'composted');
  return { ok: true };
}

/** The care points a crop has earned so far, and what they add up to. */
export function care(farm: Farm, f: FieldObj) {
  const crop = f.crop ? CROP[f.crop] : undefined;
  const bees = !!crop?.flowers && hiveNear(farm, f.x, f.z);
  const points = (f.watered ? 1 : 0) + (f.fertilized ? 1 : 0) + (f.rotation ? 1 : 0) + (f.boost ? 1 : 0) + (f.humus ? 1 : 0) + (bees ? 1 : 0);
  const stars: Stars = points >= TUNING.starCare[1] ? 3 : points >= TUNING.starCare[0] ? 2 : 1;
  return { watered: f.watered, compost: f.fertilized, rotation: f.rotation, nitrogen: f.boost, humus: f.humus, bees, points, stars };
}

export function harvest(farm: Farm, f: FieldObj): Done<{ crop: string; item: string; stars: Stars; amount: number; xp: number; discovered: string | null }> | Fail {
  if (fieldState(farm, f) !== 'ready') return { ok: false, why: f.crop ? 'Not ready yet.' : 'Nothing is growing here.' };
  const crop = CROP[f.crop!]!;
  const c = care(farm, f);
  const amount = crop.yield + (c.bees ? 1 : 0) + (c.nitrogen ? 1 : 0);
  if (roomLeft(farm) < amount) return { ok: false, why: 'The barn is full! Sell or use some things to make room. The crop will wait.' };
  const item = f.variety ?? crop.id;
  add(farm, item, c.stars, amount);
  const discovered = crossAtHarvest(farm, f, c.bees);
  const xp = Math.max(1, Math.round(crop.growMin * 1.5));
  farm.xp += xp;
  farm.scraps += TUNING.scrapsPerHarvest;
  const page = ledgerNow(farm);
  page.grown[crop.id] = (page.grown[crop.id] ?? 0) + amount;
  bump(farm, 'harvest', amount);
  bump(farm, `harvest:${crop.id}`, amount);
  if (f.variety) bump(farm, `harvest:${f.variety}`, amount);
  if (c.stars === 3) bump(farm, 'stars3', amount);
  soilAfterHarvest(f, crop, farm.t);
  f.last = crop.family;
  f.crop = null;
  f.variety = null;
  f.watered = f.fertilized = f.rotation = f.boost = f.humus = false;
  return { ok: true, crop: crop.id, item, stars: c.stars, amount, xp, discovered };
}

/** Clear an old weed, stone or log (or forage mushrooms after a misty morning). */
export function clearDebris(farm: Farm, id: number): Done<{ scraps: number; coins: number; got: { id: string; n: number } | null }> | Fail {
  const i = farm.objects.findIndex(o => o.id === id && o.kind === 'debris');
  if (i < 0) return { ok: false, why: 'Nothing to clear.' };
  const o = farm.objects[i]!;
  const area = objAreaOpen(farm, o.x, o.z);
  if (!area) return { ok: false, why: 'That land isn’t open yet.' };
  const d = DEBRIS[o.def] ?? { scraps: 0, coins: 0 };
  if (d.gives && roomLeft(farm) < d.gives.n) return { ok: false, why: 'The barn is full! Make some room first.' };
  farm.objects.splice(i, 1);
  farm.scraps += d.scraps;
  earn(farm, d.coins);
  farm.xp += 1;
  if (d.gives) { add(farm, d.gives.id, 2, d.gives.n); bump(farm, 'foraged', d.gives.n); }
  else bump(farm, 'cleared');
  return { ok: true, scraps: d.scraps, coins: d.coins, got: d.gives ?? null };
}

const objAreaOpen = (farm: Farm, x: number, z: number) => { const a = areaAt(x, z); return !!a && farm.unlocked.includes(a); };

/** Free seeds from the safety net cover the cheapest seeds you could plant now. */
export const freePlanting = (farm: Farm, crop: CropDef) => farm.freeSeeds > 0 && crop.seed <= cheapestSeed(farm);

/** The cheapest seeds you could plant right now (for the safety net). */
export function cheapestSeed(farm: Farm): number {
  const season = seasonOf(farm.t), level = levelOf(farm);
  let best = Infinity;
  for (const c of Object.values(CROP)) if (c.level <= level && c.seasons.includes(season) && !c.wet) best = Math.min(best, c.seed);
  return best;
}
