/**
 * The town market. Prices move a little with the seasons: a crop is cheapest while it is in season
 * (everyone has some), and worth more when it's out of season (only farms that stored some can sell
 * it). A small daily wobble keeps the board alive. That teaches when to sell and when to store.
 */
import { noise } from '../core/rng';
import { itemDef } from '../data/items';
import { TUNING } from '../data/tuning';
import { dayIndex, seasonOf, type Season } from './clock';
import { take, type Stars } from './inventory';
import type { Farm } from './state';
import { bump, earn } from './world';

/** The market's season factor for an item: under 1 in season, over 1 out of season. */
export function seasonFactor(id: string, season: Season): number {
  const d = itemDef(id);
  if (!d.seasons) return 1;
  return d.seasons.includes(season) ? TUNING.inSeason : TUNING.outOfSeason;
}

/** Today's market factor for an item: its season factor times a gentle daily wobble. */
export function marketFactor(farm: Farm, id: string): number {
  const wobble = 1 + (noise(farm.seed, dayIndex(farm.t), id.length * 131 + id.charCodeAt(0)) * 2 - 1) * TUNING.wobble;
  return seasonFactor(id, seasonOf(farm.t)) * wobble;
}

/** Price for one, at a star level, today. More stars always pay at least a coin more. */
export function priceOf(farm: Farm, id: string, stars: Stars = 1): number {
  const d = itemDef(id);
  if (!d.sellable) return 0;
  const base = d.price * marketFactor(farm, id);
  const p1 = Math.max(1, Math.round(base));
  if (stars === 1) return p1;
  const p2 = Math.max(p1 + 1, Math.round(base * TUNING.starPrice[1]));
  if (stars === 2) return p2;
  return Math.max(p2 + 1, Math.round(base * TUNING.starPrice[2]));
}

/** Is today a good day to sell this (clearly above its usual price)? */
export function goodTimeToSell(farm: Farm, id: string): boolean {
  return marketFactor(farm, id) > 1.02;
}

export function sell(farm: Farm, id: string, stars: Stars, n: number): { ok: true; coins: number } | { ok: false; why: string } {
  const d = itemDef(id);
  if (!d.sellable) return { ok: false, why: `${d.name} is for using on the farm.` };
  const each = priceOf(farm, id, stars);
  if (!take(farm, id, n, stars)) return { ok: false, why: 'You don’t have that many.' };
  const coins = each * n;
  earn(farm, coins, d.kind === 'crop' ? id : undefined);
  bump(farm, 'sold', n);
  return { ok: true, coins };
}
