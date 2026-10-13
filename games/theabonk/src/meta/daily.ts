import { CHARACTERS } from '../config/characters';
import { MAPS, type MapId } from '../config/maps';

/**
 * Daily run: the UTC date picks the seed, the map and the hero, so everyone gets the same
 * run on the same day. Played on Normal with no shop bonuses or unlocked weapons; the day's
 * hero and map are playable even if not yet unlocked.
 */
export interface DailySpec {
  date: string;
  seed: number;
  map: MapId;
  hero: string;
}

/** Today's date in UTC as YYYY-MM-DD. */
export function utcDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // final avalanche so neighbouring dates differ in every field
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

export function dailySpec(date: string): DailySpec {
  const h = fnv(`theabonk-daily:${date}`);
  return {
    date,
    seed: h % 1_000_000_007,
    map: MAPS[(h >>> 8) % MAPS.length].id,
    hero: CHARACTERS[(h >>> 16) % CHARACTERS.length].id,
  };
}
