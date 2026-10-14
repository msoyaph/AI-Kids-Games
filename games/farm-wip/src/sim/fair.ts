/**
 * The seasonal fair in Larkford: it opens on the last day of every season (from the first autumn on).
 * Enter up to three things (one grown, one from an animal, one made), and the judge looks at their
 * stars, what they are, and how lovely your farm is. Neighbours enter too. Everyone who enters gets
 * a "thanks for coming" ribbon and some coins; the best get rosettes, coins and Fair Set pieces.
 * Entries are shown, not eaten: they all come home to your barn.
 */
import { noise } from '../core/rng';
import { NEIGHBORS } from '../data/cast';
import { ITEMS } from '../data/items';
import { dayOfSeason, SEASON_DAYS, seasonCount, seasonName, seasonOf } from './clock';
import { beauty } from './decorate';
import { bestStars, type Stars } from './inventory';
import type { Farm } from './state';
import { bump, earn } from './world';

export type FairCategory = 'grown' | 'animal' | 'made';
export const categoryOf = (id: string): FairCategory | null => {
  const k = ITEMS[id]?.kind;
  return k === 'crop' || k === 'fruit' ? 'grown' : k === 'animal' ? 'animal' : k === 'good' ? 'made' : null;
};

export interface Entry { id: string; stars: Stars }
export interface FairResult {
  season: number;
  name: string;
  grand: boolean;
  scores: { who: string; score: number; you: boolean }[];
  place: number;
  coins: number;
  prize: string | null;
}

/** Is the fair open right now? (The last day of each season, from the first autumn; the story opens it earlier with chapter 5.) */
export function fairOpen(farm: Farm): boolean {
  if (dayOfSeason(farm.t) !== SEASON_DAYS) return false;
  if (seasonCount(farm.t) < 2 && !farm.flags.fairEarly) return false;
  return farm.flags[`fair:${seasonCount(farm.t)}`] === undefined;
}

export const fairName = (farm: Farm, grand = false) => (grand ? 'Grand Harvest Fair' : `${seasonName(seasonOf(farm.t))} Fair`);

function entryScore(e: Entry): number {
  const d = ITEMS[e.id];
  if (!d) return 0;
  return e.stars * 12 + Math.min(12, Math.round(d.price / 6));
}

const PRIZES = ['bunting', 'ribbonarch', 'prizestand'];

/** Judge the entries (one per category, the best stars held of each). */
export function judge(farm: Farm, entries: Entry[], grand = false): FairResult {
  const ok = entries.filter((e, i) => categoryOf(e.id) && bestStars(farm, e.id) >= e.stars && entries.findIndex(x => categoryOf(x.id) === categoryOf(e.id)) === i).slice(0, 3);
  const cats = new Set(ok.map(e => categoryOf(e.id)));
  const b = beauty(farm).score;
  const mine = ok.reduce((s, e) => s + entryScore(e), 0) + Math.min(10, Math.floor(b / 15)) + (cats.size === 3 ? 6 : 0);
  const season = seasonCount(farm.t);
  const scores = NEIGHBORS.map((n, i) => ({ who: n.who, score: Math.round(30 + season * 3 + noise(farm.seed, season, i, 77) * 20 + (grand ? 10 : 0)), you: false }));
  scores.push({ who: 'You', score: mine, you: true });
  scores.sort((a, b2) => b2.score - a.score || (a.you ? -1 : 1));
  const place = scores.findIndex(s => s.you) + 1;
  const coins = ok.length ? [0, 250, 140, 80, 30][place]! * (grand ? 2 : 1) : 0;
  const prize = place <= 2 && ok.length ? PRIZES[Math.min(PRIZES.length - 1, Math.floor(noise(farm.seed, season, 5) * PRIZES.length))]! : null;
  return { season, name: fairName(farm, grand), grand, scores, place, coins, prize };
}

/** Enter the fair: judge, pay out, hand out prize decorations. Entries stay in the barn. */
export function enterFair(farm: Farm, entries: Entry[], grand = false): FairResult | null {
  if (!grand && !fairOpen(farm)) return null;
  const r = judge(farm, entries, grand);
  earn(farm, r.coins);
  farm.xp += 20 + (4 - Math.min(4, r.place)) * 10;
  if (r.prize) farm.storage[`decor:${r.prize}`] = (farm.storage[`decor:${r.prize}`] ?? 0) + 1;
  if (r.place <= 3) farm.flags['set:fair'] = 1;
  if (!grand) farm.flags[`fair:${r.season}`] = r.place;
  bump(farm, 'fairs');
  if (r.place === 1) bump(farm, 'rosettes');
  return r;
}

/** The best entry the barn has for each category (for the "choose for me" button). */
export function bestEntries(farm: Farm): Entry[] {
  const best: Partial<Record<FairCategory, Entry & { score: number }>> = {};
  for (const id of Object.keys(farm.inv)) {
    const cat = categoryOf(id);
    const stars = bestStars(farm, id);
    if (!cat || !stars) continue;
    const e = { id, stars: stars as Stars };
    const score = entryScore(e);
    if (!best[cat] || score > best[cat]!.score) best[cat] = { ...e, score };
  }
  return (['grown', 'animal', 'made'] as FairCategory[]).flatMap(c => (best[c] ? [{ id: best[c]!.id, stars: best[c]!.stars }] : []));
}

/** Days of play until the next fair opens (0 = today). */
export function daysToFair(farm: Farm): number {
  return (SEASON_DAYS - dayOfSeason(farm.t)) % SEASON_DAYS;
}

