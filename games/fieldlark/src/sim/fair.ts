/**
 * The seasonal fair in Larkford: it opens on the last day of every season (from the first autumn on;
 * the story opens it earlier in chapter 5). There are four classes:
 *
 * - Biggest produce: your best crop, fruit or animal product. Three stars on healthy soil may grow a
 *   giant one!
 * - Best-made goods: stars, and how many steps went into making it.
 * - Best new variety: a variety you found by crossing.
 * - Prettiest farm: the judge walks round your farm (no entry needed).
 *
 * The three neighbour farms enter every class, and get a little better through the year. Every class
 * gives a ribbon: gold, silver, bronze, or "thank you for coming". Ribbons hang on the ribbon wall
 * and pay coins; top-three ribbons also bring a Lab idea. Entries are shown, not eaten: they all come
 * home to the barn.
 */
import { noise } from '../core/rng';
import { NEIGHBORS } from '../data/cast';
import { ITEMS } from '../data/items';
import { RECIPE } from '../data/production';
import { VARIETY } from '../data/varieties';
import { dayOfSeason, SEASON_DAYS, seasonCount, seasonName, seasonOf } from './clock';
import { beauty } from './decorate';
import { bestStars, type Stars } from './inventory';
import { SOIL_GOOD } from './soil';
import type { Farm, Ribbon } from './state';
import { bump, earn } from './world';

export type FairCategory = 'produce' | 'made' | 'variety' | 'pretty';
/** The classes you enter something in (the prettiest farm needs no entry). */
export const ENTRY_CATS = ['produce', 'made', 'variety'] as const;
export type EntryCategory = (typeof ENTRY_CATS)[number];

export const CAT_NAME: Record<FairCategory, string> = {
  produce: 'Biggest produce', made: 'Best-made goods', variety: 'Best new variety', pretty: 'Prettiest farm',
};

export const categoryOf = (id: string): EntryCategory | null => {
  const d = ITEMS[id];
  if (!d) return null;
  if (d.base) return VARIETY[id] && !VARIETY[id]!.heirloom ? 'variety' : 'produce';
  return d.kind === 'crop' || d.kind === 'fruit' || d.kind === 'animal' ? 'produce' : d.kind === 'good' ? 'made' : null;
};

export interface Entry { id: string; stars: Stars }
export interface CatResult {
  cat: FairCategory;
  entry: Entry | null;
  /** A giant one (biggest produce only). */
  giant: boolean;
  scores: { who: string; score: number; you: boolean }[];
  place: 1 | 2 | 3 | 4;
  coins: number;
}
export interface FairResult {
  season: number;
  name: string;
  grand: boolean;
  cats: CatResult[];
  /** The best place in any class. */
  place: number;
  coins: number;
  ideas: number;
  prize: string | null;
  /** The first ribbon ever: a ribbon wall for the yard (Build → Decorate). */
  wall: boolean;
}

/** Is the fair open right now? (The last day of each season, from the first autumn; the story opens it earlier with chapter 5.) */
export function fairOpen(farm: Farm): boolean {
  if (dayOfSeason(farm.t) !== SEASON_DAYS) return false;
  if (seasonCount(farm.t) < 2 && !farm.flags.fairEarly) return false;
  return farm.flags[`fair:${seasonCount(farm.t)}`] === undefined;
}

export const fairName = (farm: Farm, grand = false) => (grand ? 'Grand Harvest Fair' : `${seasonName(seasonOf(farm.t))} Fair`);

/** How many steps of making went into a good (flour 1, bread 2…). */
export function depthOf(id: string): number {
  const r = RECIPE[id];
  if (!r) return 0;
  return 1 + Math.max(0, ...Object.keys(r.inputs).map(depthOf));
}

/** Does any field have healthy soil (rich in both nitrogen and humus)? */
const healthySoil = (farm: Farm) => farm.objects.some(o => o.kind === 'field' && o.nit >= SOIL_GOOD && o.hum >= SOIL_GOOD);

export function entryScore(cat: EntryCategory, e: Entry, giant = false): number {
  const d = ITEMS[e.id];
  if (!d) return 0;
  const base = e.stars * 12;
  if (cat === 'produce') return base + Math.min(12, Math.round(d.price / 6)) + (giant ? 10 : 0);
  if (cat === 'made') return base + depthOf(e.id) * 4 + Math.min(8, Math.round(d.price / 20));
  return base + 16;
}

const prettyScore = (farm: Farm) => Math.min(70, 20 + Math.round(beauty(farm).score / 2));

/** The neighbours' scores in a class: a little better as the seasons go by, and their best at the Grand Fair. */
function neighbourScore(farm: Farm, season: number, cat: FairCategory, i: number, grand: boolean) {
  return Math.round(28 + Math.min(season, 8) * 1.5 + noise(farm.seed, season, i, ENTRY_CATS.indexOf(cat as EntryCategory) + 77) * 16 + (grand ? 3 : 0));
}

const PRIZES = ['bunting', 'ribbonarch', 'prizestand'];
const RIBBON_COINS = [0, 120, 70, 40, 15];

/** Judge the entries (one per class, at stars the barn really holds). */
export function judge(farm: Farm, entries: Entry[], grand = false): FairResult {
  const season = seasonCount(farm.t);
  const chosen: Partial<Record<EntryCategory, Entry>> = {};
  for (const e of entries) {
    const cat = categoryOf(e.id);
    if (cat && !chosen[cat] && bestStars(farm, e.id) >= e.stars && e.stars >= 1) chosen[cat] = e;
  }
  const cats: CatResult[] = [];
  const classes: FairCategory[] = [...ENTRY_CATS.filter(c => chosen[c]), 'pretty'];
  for (const cat of classes) {
    const entry = cat === 'pretty' ? null : chosen[cat]!;
    const giant = cat === 'produce' && entry!.stars === 3 && healthySoil(farm) && noise(farm.seed, season, 31) < 0.5;
    const mine = cat === 'pretty' ? prettyScore(farm) : entryScore(cat, entry!, giant);
    const scores = NEIGHBORS.map((n, i) => ({ who: n.who, score: neighbourScore(farm, season, cat, i, grand), you: false }));
    scores.push({ who: 'You', score: mine, you: true });
    // a tie goes to you
    scores.sort((a, b) => b.score - a.score || (a.you ? -1 : 1));
    const place = Math.min(4, scores.findIndex(s => s.you) + 1) as CatResult['place'];
    cats.push({ cat, entry, giant, scores, place, coins: RIBBON_COINS[place]! * (grand ? 2 : 1) });
  }
  const best = Math.min(...cats.map(c => c.place));
  const gold = cats.some(c => c.place === 1);
  const prize = gold ? PRIZES[Math.min(PRIZES.length - 1, Math.floor(noise(farm.seed, season, 5) * PRIZES.length))]! : null;
  return {
    season, name: fairName(farm, grand), grand, cats, place: best,
    coins: cats.reduce((s, c) => s + c.coins, 0),
    ideas: cats.filter(c => c.place <= 3).length,
    prize, wall: farm.ribbonCount.every(n => n === 0),
  };
}

/** Enter the fair: judge, hang the ribbons, pay out, hand out prize decorations. Entries stay in the barn. */
export function enterFair(farm: Farm, entries: Entry[], grand = false, keep = 48): FairResult | null {
  if (!grand && !fairOpen(farm)) return null;
  const r = judge(farm, entries, grand);
  earn(farm, r.coins);
  farm.ideas += r.ideas;
  farm.xp += 20 + (4 - Math.min(4, r.place)) * 10;
  for (const c of r.cats) {
    const ribbon: Ribbon = { season: r.season, cat: c.cat, place: c.place, ...(grand ? { grand: true } : {}) };
    farm.ribbons.push(ribbon);
    farm.ribbonCount[c.place - 1]++;
    if (c.place === 1) bump(farm, 'rosettes');
  }
  if (farm.ribbons.length > keep) farm.ribbons.splice(0, farm.ribbons.length - keep);
  if (r.prize) farm.storage[`decor:${r.prize}`] = (farm.storage[`decor:${r.prize}`] ?? 0) + 1;
  if (r.wall) farm.flags['set:ribbons'] = 1;
  if (r.place <= 3) farm.flags['set:fair'] = 1;
  if (!grand) farm.flags[`fair:${r.season}`] = r.place;
  bump(farm, 'fairs');
  return r;
}

/** The best thing the barn has for each class (for "choose for me"). */
export function bestEntries(farm: Farm): Entry[] {
  const best: Partial<Record<EntryCategory, Entry & { score: number }>> = {};
  for (const id of Object.keys(farm.inv)) {
    const cat = categoryOf(id);
    const stars = bestStars(farm, id);
    if (!cat || !stars) continue;
    const e = { id, stars: stars as Stars };
    const score = entryScore(cat, e);
    if (!best[cat] || score > best[cat]!.score) best[cat] = { ...e, score };
  }
  return ENTRY_CATS.flatMap(c => (best[c] ? [{ id: best[c]!.id, stars: best[c]!.stars }] : []));
}

/** Days of play until the next fair opens (0 = today). */
export function daysToFair(farm: Farm): number {
  return (SEASON_DAYS - dayOfSeason(farm.t)) % SEASON_DAYS;
}
