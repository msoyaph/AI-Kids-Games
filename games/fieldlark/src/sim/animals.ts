/**
 * Animals in their homes. Each animal works on one product at a time, and a finished product
 * waits for you (it never spoils). Feeding makes the rest of the product come twice as fast, and
 * feeding and brushing each make the animal happier: content → happy → delighted, for one, two or
 * three stars. Unfed animals are still fine: they just take longer and give a one-star product.
 * Bees need no care: honey gets more stars with more flowers near the hive. Bees also help
 * flowering crops and fruit trees near their hive (see `beesNear`).
 */
import { ANIMAL, ANIMAL_NAMES, animalForHome } from '../data/animals';
import { BUILDING } from '../data/buildings';
import { CROP } from '../data/crops';
import { TREE } from '../data/orchard';
import { add, roomLeft, take, type Stars } from './inventory';
import type { BuildingObj, Obj, OtherObj } from './objects';
import type { Farm } from './state';
import { bump, ledgerNow, levelOf, spend } from './world';

export interface AnimalState {
  name: string;
  /** When the product it's working on is done. */
  readyAt: number;
  fed: boolean;
  brushed: boolean;
}

/** A finish time that never comes. */
export const NEVER = 1e12;

/** How far bees fly to help flowers (tiles, in a square around the hive). */
export const BEE_RANGE = 5;

export const isHome = (o: Obj): o is BuildingObj => o.kind === 'building' && !!BUILDING[o.def]?.holds;

export function animalsIn(home: OtherObj): AnimalState[] {
  const data = (home.data ??= {});
  if (!Array.isArray(data.animals)) data.animals = [];
  return data.animals as AnimalState[];
}

export const happiness = (a: AnimalState) => (a.fed ? 1 : 0) + (a.brushed ? 1 : 0);
export const happinessWord = (a: AnimalState) => ['content', 'happy', 'delighted'][happiness(a)]!;
export const isReady = (farm: Farm, a: AnimalState) => farm.t >= a.readyAt;

function startProduct(farm: Farm, home: OtherObj, a: AnimalState) {
  const def = animalForHome(home.def)!;
  a.fed = false;
  a.brushed = false;
  // (the dog makes nothing: a far-off finish keeps saves plain JSON, unlike Infinity)
  a.readyAt = def.everyMin > 0 ? farm.t + def.everyMin * 60 * 2 : NEVER;
}

export type Result<T = object> = ({ ok: true } & T) | { ok: false; why: string };

/** Adds a new animal to a home (bees come with their hive; the dog with its kennel). */
export function buyAnimal(farm: Farm, home: OtherObj, free = false): Result<{ name: string }> {
  const def = animalForHome(home.def);
  const b = BUILDING[home.def];
  if (!def || !b) return { ok: false, why: 'Animals can’t live here.' };
  const list = animalsIn(home);
  if (list.length >= (b.cap ?? 0)) return { ok: false, why: `The ${b.name.toLowerCase()} is full.` };
  if (!free && levelOf(farm) < def.level) return { ok: false, why: `${def.plural} come at farm level ${def.level}.` };
  if (!free && !spend(farm, def.cost)) return { ok: false, why: `A new ${def.name.toLowerCase()} costs ${def.cost} coins.` };
  const names = ANIMAL_NAMES[def.id] ?? [def.name];
  const used = new Set(farm.objects.filter(isHome).flatMap(h => animalsIn(h).map(a => a.name)));
  const name = names.find(n => !used.has(n)) ?? `${names[0]} ${list.length + 1}`;
  const a: AnimalState = { name, readyAt: 0, fed: false, brushed: false };
  startProduct(farm, home, a);
  list.push(a);
  return { ok: true, name };
}

/** The first feed in the barn this animal likes, or null. */
export function feedFor(farm: Farm, animalId: string): string | null {
  return ANIMAL[animalId]?.feeds.find(f => (farm.inv[f]?.reduce((s, n) => s + n, 0) ?? 0) > 0) ?? null;
}

/** Feed every hungry animal in a home that isn't fed yet (one feed each, while feed lasts). */
export function feedAll(farm: Farm, home: OtherObj): Result<{ fed: number; feed: string | null }> {
  const def = animalForHome(home.def);
  if (!def || def.feeds.length === 0) return { ok: false, why: def?.id === 'bee' ? 'Bees find their own food in flowers.' : 'Nothing to feed here.' };
  let fed = 0, used: string | null = null;
  for (const a of animalsIn(home)) {
    if (a.fed || isReady(farm, a)) continue;
    const feed = feedFor(farm, def.id);
    if (!feed || !take(farm, feed, 1)) break;
    used = feed;
    a.fed = true;
    a.readyAt = farm.t + (a.readyAt - farm.t) / 2;
    fed++;
    bump(farm, 'fed');
  }
  if (!fed) {
    const hungry = animalsIn(home).some(a => !a.fed && !isReady(farm, a));
    return { ok: false, why: hungry ? `${def.plural} eat ${def.feeds.map(f => CROP[f]?.name ?? f).join(' or ')}. Grow some first!` : `The ${def.plural.toLowerCase()} are all fed.` };
  }
  return { ok: true, fed, feed: used };
}

/** Brush every animal that isn't brushed yet (free, and they love it). */
export function brushAll(farm: Farm, home: OtherObj): Result<{ brushed: number }> {
  const def = animalForHome(home.def);
  if (!def || def.id === 'bee') return { ok: false, why: 'Bees don’t need brushing!' };
  let brushed = 0;
  for (const a of animalsIn(home)) {
    if (a.brushed || isReady(farm, a) || def.id === 'dog') continue;
    a.brushed = true;
    brushed++;
    bump(farm, 'brushed');
  }
  return brushed ? { ok: true, brushed } : { ok: false, why: 'Everyone is brushed and shiny.' };
}

/** How many flowers are near a tile: flowering crops, fruit trees bees love, and flower beds. */
export function flowersNear(farm: Farm, x: number, z: number, range = BEE_RANGE): number {
  let n = 0;
  for (const o of farm.objects) {
    if (Math.abs(o.x - x) > range || Math.abs(o.z - z) > range) continue;
    if (o.kind === 'field' && o.crop && CROP[o.crop]?.flowers) n++;
    else if (o.kind === 'tree' && TREE[o.def]?.bees) n++;
    else if (o.kind === 'decor' && o.def.startsWith('flowers')) n++;
  }
  return n;
}

/** Stars for a home's next products: from care, or for bees, from flowers nearby. */
export function productStars(farm: Farm, home: OtherObj, a: AnimalState): Stars {
  if (home.def === 'beehive') {
    const f = flowersNear(farm, home.x, home.z);
    return f >= 8 ? 3 : f >= 3 ? 2 : 1;
  }
  return (1 + happiness(a)) as Stars;
}

/** Collect every finished product in a home. Unfinished ones keep going. */
export function collect(farm: Farm, home: OtherObj): Result<{ product: string; got: { stars: Stars; n: number }[]; total: number }> {
  const def = animalForHome(home.def);
  if (!def?.product) return { ok: false, why: 'Nothing to collect here.' };
  const ready = animalsIn(home).filter(a => isReady(farm, a));
  if (!ready.length) return { ok: false, why: 'Nothing is ready yet.' };
  const got = new Map<Stars, number>();
  let total = 0;
  for (const a of ready) {
    if (roomLeft(farm) < 1) break;
    const stars = productStars(farm, home, a);
    add(farm, def.product, stars, 1);
    bump(farm, 'collect');
    bump(farm, `collect:${def.product}`);
    if (stars === 3) bump(farm, 'stars3');
    const page = ledgerNow(farm);
    page.grown[def.product] = (page.grown[def.product] ?? 0) + 1;
    got.set(stars, (got.get(stars) ?? 0) + 1);
    total++;
    farm.xp += Math.max(1, Math.round(def.everyMin));
    startProduct(farm, home, a);
  }
  if (!total) return { ok: false, why: 'The barn is full! Sell or use some things to make room.' };
  return { ok: true, product: def.product, got: [...got].map(([stars, n]) => ({ stars, n })), total };
}

/** Is a beehive close enough to help this tile's flowers? */
export function hiveNear(farm: Farm, x: number, z: number): boolean {
  return farm.objects.some(o => o.kind === 'building' && o.def === 'beehive' && animalsIn(o as OtherObj).length > 0 && Math.abs(o.x - x) <= BEE_RANGE && Math.abs(o.z - z) <= BEE_RANGE);
}

/** For "while you were away": finished sooner, never later. */
export function animalsCatchUp(farm: Farm, seconds: number) {
  for (const o of farm.objects) {
    if (!isHome(o)) continue;
    for (const a of animalsIn(o)) if (a.readyAt > farm.t && a.readyAt < NEVER) a.readyAt = Math.max(farm.t, a.readyAt - seconds);
  }
}
