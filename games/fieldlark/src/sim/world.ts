/** Lookups over the farm: what is where, sizes, levels, and the ledger. */
import { next } from '../core/rng';
import { BUILDING } from '../data/buildings';
import { levelForXp } from '../data/tuning';
import { seasonCount } from './clock';
import { tileKey, tilesOf, type Obj, type Size } from './objects';
import type { Farm, LedgerSeason } from './state';

export function sizeOf(o: Obj): Size {
  if (o.kind === 'building') { const b = BUILDING[o.def]; return b ? { w: b.w, d: b.d } : { w: 1, d: 1 }; }
  return { w: 1, d: 1 };
}

/** Tile → object id, for every tile any object covers. */
export function occupancy(farm: Farm): Map<number, number> {
  const m = new Map<number, number>();
  for (const o of farm.objects) for (const [x, z] of tilesOf(o, sizeOf(o))) m.set(tileKey(x, z), o.id);
  return m;
}

export function objAt(farm: Farm, x: number, z: number): Obj | undefined {
  for (const o of farm.objects) {
    const s = sizeOf(o);
    const odd = o.rot % 2 === 1;
    const w = odd ? s.d : s.w, d = odd ? s.w : s.d;
    if (x >= o.x && x < o.x + w && z >= o.z && z < o.z + d) return o;
  }
  return undefined;
}

export const objById = (farm: Farm, id: number) => farm.objects.find(o => o.id === id);

export const levelOf = (farm: Farm) => levelForXp(farm.xp);

/** This season's ledger page (made on first use). */
export function ledgerNow(farm: Farm): LedgerSeason {
  const season = seasonCount(farm.t);
  let page = farm.ledger.at(-1);
  if (!page || page.season !== season) {
    page = { season, grown: {}, made: {}, earned: 0, spent: 0, cropEarned: {}, cropSpent: {} };
    farm.ledger.push(page);
    // keep two years of pages: plenty for the charts, and the save stays small
    if (farm.ledger.length > 8) farm.ledger.splice(0, farm.ledger.length - 8);
  }
  return page;
}

export function spend(farm: Farm, coins: number, forCrop?: string): boolean {
  if (coins < 0 || farm.coins < coins) return false;
  farm.coins -= coins;
  const page = ledgerNow(farm);
  page.spent += coins;
  if (forCrop) page.cropSpent[forCrop] = (page.cropSpent[forCrop] ?? 0) + coins;
  return true;
}

export function earn(farm: Farm, coins: number, fromCrop?: string) {
  if (coins <= 0) return;
  farm.coins += coins;
  const page = ledgerNow(farm);
  page.earned += coins;
  if (fromCrop) page.cropEarned[fromCrop] = (page.cropEarned[fromCrop] ?? 0) + coins;
}

export function newId(farm: Farm) { return farm.nextId++; }

/** Lifetime counters (harvests, deliveries, trades…) that story goals and the ledger read. */
export function bump(farm: Farm, key: string, n = 1) {
  if (n > 0) farm.stats[key] = (farm.stats[key] ?? 0) + n;
}

/** One roll from the farm's own random stream (kept in the save, so a farm replays the same way). */
export function roll(farm: Farm): number {
  const [v, s] = next(farm.rng);
  farm.rng = s;
  return v;
}
