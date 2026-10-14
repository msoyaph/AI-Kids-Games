/** Every balance number in one place (tuned by the playthrough bot in phase 10). */

export const TUNING = {
  startCoins: 150,
  /** Coins to plough a new field. */
  fieldCost: 10,
  /** Price multiplier for 1, 2 and 3 stars. */
  starPrice: [1, 1.25, 1.6] as const,
  /** Care points needed for 2 and 3 stars. */
  starCare: [1, 3] as const,
  /** Compost makes a crop grow this much faster (share of the time left). */
  compostSpeed: 0.25,
  /** Rain: chance a day is rainy (not in winter), and when in the day it rains. */
  rainChance: 0.24,
  rainFrom: 0.3,
  rainTo: 0.55,
  /** Barn space by upgrade level, and coins for each upgrade. */
  barnCap: [80, 140, 220, 320, 450] as const,
  barnUpgrade: [0, 400, 1200, 3000, 7000] as const,
  /** Scraps from each harvested field; scraps per compost bag; minutes the bin takes per bag. */
  scrapsPerHarvest: 1,
  scrapsPerBag: 4,
  compostMin: 2,
  /** "While you were away": at most this many minutes of growing, and only for things growing. */
  awayCapMin: 10,
  /** Market prices: in season a little lower, out of season a little higher, plus a gentle daily wobble. */
  inSeason: 0.9,
  outOfSeason: 1.15,
  wobble: 0.06,
  /** The safety net: free plantings when there's no other way to get going. */
  safetySeeds: 6,
  /** XP to reach each level after 1 (grows gently). */
  xpCurve: { base: 30, growth: 1.32, cap: 40 },
};

/** Total XP needed to reach `level` (level 1 needs 0). */
export function xpForLevel(level: number): number {
  let total = 0;
  for (let l = 2; l <= level; l++) total += Math.round(TUNING.xpCurve.base * Math.pow(l - 1, TUNING.xpCurve.growth));
  return total;
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (level < TUNING.xpCurve.cap && xp >= xpForLevel(level + 1)) level++;
  return level;
}
