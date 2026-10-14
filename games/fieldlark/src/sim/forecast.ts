/**
 * The weather forecast: each day has at most one gentle event, known days ahead (the date pill shows
 * today and the next two days). Every event only ever helps; getting ready for one helps a little
 * more, and not getting ready loses nothing.
 *
 * - Rain waters every growing crop (src/sim/weather.ts decides which days).
 * - A sunny spell makes crops grow 15% faster all day.
 * - A windy day: tie down the hay the day before (or that morning) for happier animals and some XP.
 * - A misty morning brings mushrooms to forage at the edges of your land.
 * - Snow: winter crafting earns a little extra XP.
 * - A warm summer night brings fireflies.
 */
import { noise } from '../core/rng';
import { dayIndex, DAY_SEC, SEASON_DAYS, seasonOf, type Season } from './clock';
import { AREAS, tileAt } from './map';
import type { Farm } from './state';
import { rainyDay } from './weather';
import { newId, occupancy } from './world';
import { tileKey } from './objects';

export type DayEvent = 'rain' | 'sunny' | 'windy' | 'misty' | 'snow' | 'warmnight';

export const EVENT_INFO: Record<DayEvent, { name: string; text: string; icon: string }> = {
  rain: { name: 'Rain', text: 'Rain will water every growing crop.', icon: 'rain' },
  sunny: { name: 'Sunny spell', text: 'Crops grow a little faster all day.', icon: 'summer' },
  windy: { name: 'Windy day', text: 'Tie down the hay first for happier animals.', icon: 'wind' },
  misty: { name: 'Misty morning', text: 'Mushrooms pop up at the edges of your land.', icon: 'mist' },
  snow: { name: 'Snow', text: 'A cosy day for the workshops: crafting earns extra XP.', icon: 'winter' },
  warmnight: { name: 'Warm night', text: 'Fireflies will dance over the fields tonight.', icon: 'firefly' },
};

/** Chances of each event on a day without rain, by season (checked in this order). */
const ODDS: Record<Season, [DayEvent, number][]> = {
  spring: [['sunny', 0.12], ['windy', 0.1], ['misty', 0.1]],
  summer: [['sunny', 0.2], ['windy', 0.08], ['warmnight', 0.15]],
  autumn: [['windy', 0.15], ['misty', 0.15], ['sunny', 0.06]],
  winter: [['misty', 0.15], ['sunny', 0.1]],
};

/** A sunny spell's extra growing: crops grow this much faster. */
export const SUNNY_BOOST = 0.15;
/** XP for tying down the hay before a windy day, and for each good made on a snowy day. */
export const HAY_XP = 15, SNOW_XP = 2;

/** The event on a given day (from the farm's seed, so it is the same after a reload). */
export function dayEvent(seed: number, day: number): DayEvent | null {
  if (day <= 0) return null;
  if (rainyDay(seed, day)) return 'rain';
  const season = seasonOf(day * DAY_SEC + 1);
  if (season === 'winter' && noise(seed, day, 912) < 0.4) return 'snow';
  let r = noise(seed, day, 913);
  for (const [e, p] of ODDS[season]) { if (r < p) return e; r -= p; }
  return null;
}

/** Today and the next days: [day, event] pairs. */
export function forecast(farm: Farm, days = 3): { day: number; event: DayEvent | null }[] {
  const d0 = dayIndex(farm.t);
  return Array.from({ length: days }, (_, i) => ({ day: d0 + i, event: dayEvent(farm.seed, d0 + i) }));
}

export const todaysEvent = (farm: Farm) => dayEvent(farm.seed, dayIndex(farm.t));

/** Is the first snow of this winter today? (For a cheerful hello.) */
export function firstSnow(seed: number, day: number): boolean {
  if (dayEvent(seed, day) !== 'snow') return false;
  const start = day - (day % SEASON_DAYS);
  for (let d = start; d < day; d++) if (dayEvent(seed, d) === 'snow') return false;
  return true;
}

/** Tie down the hay for a windy day coming up (today or within two days). */
export function tieHay(farm: Farm, day: number): boolean {
  const d0 = dayIndex(farm.t);
  if (day < d0 || day > d0 + 2 || dayEvent(farm.seed, day) !== 'windy') return false;
  farm.flags[`hay:${day}`] = 1;
  return true;
}
export const hayTied = (farm: Farm, day: number) => !!farm.flags[`hay:${day}`];

/** Mushrooms after a misty morning: up to three clumps on free land near the edges of open areas. */
export function spawnMushrooms(farm: Farm, day: number): number {
  const have = farm.objects.filter(o => o.kind === 'debris' && o.def === 'mushrooms').length;
  if (have >= 3) return 0;
  const occ = occupancy(farm);
  const spots: [number, number, number][] = [];
  for (const a of AREAS) {
    if (!farm.unlocked.includes(a.id)) continue;
    for (let z = a.z0; z <= a.z1; z++) for (let x = a.x0; x <= a.x1; x++) {
      const edge = Math.min(x - a.x0, a.x1 - x, z - a.z0, a.z1 - z);
      if (edge > 1 || tileAt(x, z).water || occ.has(tileKey(x, z))) continue;
      spots.push([noise(farm.seed, day, x, z, 914), x, z]);
    }
  }
  spots.sort((p, q) => p[0] - q[0]);
  const n = Math.min(3 - have, spots.length);
  for (let i = 0; i < n; i++) {
    const [, x, z] = spots[i]!;
    farm.objects.push({ id: newId(farm), kind: 'debris', def: 'mushrooms', x, z, rot: 0 });
  }
  return n;
}

/** Forget getting-ready notes for days that have passed. */
export function tidyHay(farm: Farm) {
  const d0 = dayIndex(farm.t);
  for (const k of Object.keys(farm.flags)) if (k.startsWith('hay:') && Number(k.slice(4)) < d0) delete farm.flags[k];
}
