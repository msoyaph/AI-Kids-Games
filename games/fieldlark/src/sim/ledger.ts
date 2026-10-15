/**
 * The Farm Ledger's numbers: each season's coins in and out, what was grown and made, and "profit
 * per crop", which teaches planning. Quick crops pay a little, often; slow crops pay more each time
 * and leave you free to do other things while they grow.
 */
import { CROPS, profitPerMinute, type CropDef } from '../data/crops';
import { SEASONS, seasonName } from './clock';
import type { Farm, LedgerSeason } from './state';
import { levelOf } from './world';

/** "Spring, year 1" for a ledger page. */
export function pageLabel(season: number, short = false): string {
  const name = seasonName(SEASONS[season % 4]!);
  const year = Math.floor(season / 4) + 1;
  return short ? `${name.slice(0, 3)} ${year}` : `${name}, year ${year}`;
}

/** Coins a field of this crop makes for each minute it grows (one star, ordinary price, after the seeds). */
export const coinsPerMinute = profitPerMinute;
/** Coins one harvest of this crop makes after the seeds (one star, ordinary price). */
export const coinsPerHarvest = (c: CropDef) => c.price * c.yield - c.seed;

export interface CropLine {
  crop: CropDef;
  perMinute: number;
  perHarvest: number;
  /** How many you have grown, ever. */
  grown: number;
  /** Coins from selling it and spent on its seeds, on the pages the ledger keeps. */
  earned: number;
  spent: number;
}

/** Every crop the farm can grow now (and any it grew before), best coins per minute first. */
export function cropLines(farm: Farm): CropLine[] {
  const level = levelOf(farm);
  const sum = (pick: (p: LedgerSeason) => Record<string, number>, id: string) => farm.ledger.reduce((s, p) => s + (pick(p)[id] ?? 0), 0);
  return CROPS
    .filter(c => c.level <= level || (farm.stats[`harvest:${c.id}`] ?? 0) > 0)
    .map(c => ({
      crop: c,
      perMinute: coinsPerMinute(c),
      perHarvest: coinsPerHarvest(c),
      grown: farm.stats[`harvest:${c.id}`] ?? 0,
      earned: sum(p => p.cropEarned, c.id),
      spent: sum(p => p.cropSpent, c.id),
    }))
    .sort((a, b) => b.perMinute - a.perMinute || a.crop.name.localeCompare(b.crop.name));
}

/** The biggest few entries of a page's counts ("grown" or "made"), largest first. */
export function topOf(counts: Record<string, number>, n = 5): [string, number][] {
  return Object.entries(counts).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
}

/** The ledger's pages, oldest first, with the current season always there (even if nothing happened yet). */
export function pages(farm: Farm, current: number): LedgerSeason[] {
  const list = [...farm.ledger];
  if (!list.length || list.at(-1)!.season !== current) list.push({ season: current, grown: {}, made: {}, earned: 0, spent: 0, cropEarned: {}, cropSpent: {} });
  return list.slice(-8);
}
