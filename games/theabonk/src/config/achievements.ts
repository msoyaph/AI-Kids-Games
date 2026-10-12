/** Lifetime + best-run statistics an achievement can test. */
export interface AchievementContext {
  totalKills: number;
  bestTime: number;
  highestLevel: number;
  bossKills: Record<string, number>;
  evolutions: number;
  shrinesBroken: number;
  topSpeed: number;
  wins: number;
  totalGold: number;
  winsByMap: Record<string, number>;
  winsByDifficulty: Record<string, number>;
  /** Highest Hard tier won (-1 = none, 0 = plain Hard). */
  bestHardTier: number;
  bossKillsNormalPlus: Record<string, number>;
  slideDistance: number;
  banishes: number;
  dailyRuns: number;
  /** Collection entries discovered / total. */
  collected: number;
  collectable: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  check: (c: AchievementContext) => boolean;
  /** Progress readout 0..1 for the achievements screen. */
  progress: (c: AchievementContext) => number;
  reward: { gold?: number; character?: string; weapon?: string };
}

const tierWin = (t: number): AchievementDef => ({
  id: `tier${t}`,
  name: `Tier ${t} Cleared`,
  description: `Win on Hard, Tier ${t}.`,
  check: (c) => c.bestHardTier >= t,
  progress: (c) => (c.bestHardTier >= t ? 1 : 0),
  reward: { gold: 150 + t * 100 },
});

const frac = (v: number, t: number): number => Math.min(1, v / t);

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'kills1000', name: 'Bonk-a-Thousand', description: 'Defeat 1,000 Gloom in total.',
    check: (c) => c.totalKills >= 1000, progress: (c) => frac(c.totalKills, 1000), reward: { character: 'pip' },
  },
  {
    id: 'survive10', name: 'Still Standing', description: 'Survive 10 minutes in a single run.',
    check: (c) => c.bestTime >= 600, progress: (c) => frac(c.bestTime, 600), reward: { character: 'brindle' },
  },
  {
    id: 'beatGrumblecap', name: 'Cap Toppled', description: 'Defeat Grumblecap.',
    check: (c) => (c.bossKills.grumblecap ?? 0) > 0, progress: (c) => frac(c.bossKills.grumblecap ?? 0, 1), reward: { weapon: 'frostFan' },
  },
  {
    id: 'level25', name: 'Well Studied', description: 'Reach level 25 in a single run.',
    check: (c) => c.highestLevel >= 25, progress: (c) => frac(c.highestLevel, 25), reward: { weapon: 'wispBees' },
  },
  {
    id: 'firstEvolve', name: 'Transmutation', description: 'Evolve a weapon.',
    check: (c) => c.evolutions >= 1, progress: (c) => frac(c.evolutions, 1), reward: { gold: 100 },
  },
  {
    id: 'shrines10', name: 'Shrine Smasher', description: 'Break 10 shrines in total.',
    check: (c) => c.shrinesBroken >= 10, progress: (c) => frac(c.shrinesBroken, 10), reward: { gold: 100 },
  },
  {
    id: 'speed25', name: 'Slippery Slope', description: 'Reach a speed of 25 by sliding and jumping.',
    check: (c) => c.topSpeed >= 25, progress: (c) => frac(c.topSpeed, 25), reward: { gold: 80 },
  },
  {
    id: 'beatClockjaw', name: 'Unwound', description: 'Defeat Clockjaw.',
    check: (c) => (c.bossKills.clockjaw ?? 0) > 0, progress: (c) => frac(c.bossKills.clockjaw ?? 0, 1), reward: { gold: 200 },
  },
  {
    id: 'win', name: 'Dawnbringer', description: 'Win a run.',
    check: (c) => c.wins >= 1, progress: (c) => frac(c.wins, 1), reward: { gold: 300 },
  },
  {
    id: 'kills10000', name: 'Gloombane', description: 'Defeat 10,000 Gloom in total.',
    check: (c) => c.totalKills >= 10000, progress: (c) => frac(c.totalKills, 10000), reward: { gold: 500 },
  },
  {
    id: 'gold2000', name: 'Magpie', description: 'Earn 2,000 gold in total.',
    check: (c) => c.totalGold >= 2000, progress: (c) => frac(c.totalGold, 2000), reward: { gold: 150 },
  },
  // ── upgrade: heroes ──
  {
    id: 'slide3k', name: 'Slip ’n’ Slide', description: 'Slide 3,000 m in total.',
    check: (c) => c.slideDistance >= 3000, progress: (c) => frac(c.slideDistance, 3000), reward: { character: 'ottie' },
  },
  {
    id: 'clockjawNormal', name: 'Gears Stripped', description: 'Defeat Clockjaw on Normal or harder.',
    check: (c) => (c.bossKillsNormalPlus.clockjaw ?? 0) + (c.bossKillsNormalPlus.clockjawFrost ?? 0) > 0,
    progress: (c) => frac((c.bossKillsNormalPlus.clockjaw ?? 0) + (c.bossKillsNormalPlus.clockjawFrost ?? 0), 1), reward: { character: 'bramble' },
  },
  {
    id: 'level40', name: 'Star Pupil', description: 'Reach level 40 in a single run.',
    check: (c) => c.highestLevel >= 40, progress: (c) => frac(c.highestLevel, 40), reward: { character: 'nova' },
  },
  // ── upgrade: maps, difficulty, daily, collection ──
  {
    id: 'rimewoodWin', name: 'The Thaw', description: 'Win a run in the Rimewood.',
    check: (c) => (c.winsByMap.rimewood ?? 0) > 0, progress: (c) => frac(c.winsByMap.rimewood ?? 0, 1), reward: { gold: 400 },
  },
  {
    id: 'oldRime', name: 'Antlers Shattered', description: 'Defeat Old Rime, the Frost Stag.',
    check: (c) => (c.bossKills.oldRime ?? 0) > 0, progress: (c) => frac(c.bossKills.oldRime ?? 0, 1), reward: { gold: 300 },
  },
  {
    id: 'hardWin', name: 'Hard as Nails', description: 'Win a run on Hard (unlocks Hard tiers).',
    check: (c) => (c.winsByDifficulty.hard ?? 0) > 0, progress: (c) => frac(c.winsByDifficulty.hard ?? 0, 1), reward: { gold: 500 },
  },
  tierWin(1),
  tierWin(2),
  tierWin(3),
  tierWin(4),
  tierWin(5),
  {
    id: 'daily', name: 'Daily Bonker', description: 'Play a daily run.',
    check: (c) => c.dailyRuns >= 1, progress: (c) => frac(c.dailyRuns, 1), reward: { gold: 100 },
  },
  {
    id: 'banish', name: 'Not Today', description: 'Banish an offer at a level-up.',
    check: (c) => c.banishes >= 1, progress: (c) => frac(c.banishes, 1), reward: { gold: 50 },
  },
  {
    id: 'collect25', name: 'Naturalist', description: 'Discover 25 entries in the collection.',
    check: (c) => c.collected >= 25, progress: (c) => frac(c.collected, 25), reward: { gold: 150 },
  },
  {
    id: 'collectAll', name: 'Encyclopedist', description: 'Discover every entry in the collection.',
    check: (c) => c.collectable > 0 && c.collected >= c.collectable, progress: (c) => frac(c.collected, Math.max(1, c.collectable)), reward: { gold: 1000 },
  },
];

export const ACHIEVEMENT_INDEX: Record<string, number> = {};
ACHIEVEMENTS.forEach((a, i) => (ACHIEVEMENT_INDEX[a.id] = i));
