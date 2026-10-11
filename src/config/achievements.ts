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
];

export const ACHIEVEMENT_INDEX: Record<string, number> = {};
ACHIEVEMENTS.forEach((a, i) => (ACHIEVEMENT_INDEX[a.id] = i));
