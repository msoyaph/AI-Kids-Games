import type { GameEvent } from '../systems/events';
import type { SaveData } from '../systems/save/schema';

/**
 * Daily challenge templates. Each day three are picked with a seeded random number
 * generator (same day + same save slot = same challenges).
 */
export interface DailyTemplate {
  id: string;
  /** Text with {n} for the goal amount. */
  text: string;
  icon: string;
  /** Goal amounts for Easy and Normal. */
  goal: { easy: number; normal: number };
  reward: number;
  /** Can this challenge be done right now? */
  available: (s: SaveData) => boolean;
  /** How much an event counts. */
  count: (e: GameEvent) => number;
}

const unlocked = (sys: string, chapter: number) => (s: SaveData) => s.chapter >= chapter && s.visitedSystems.includes(sys);

export const DAILIES: DailyTemplate[] = [
  { id: 'coins_earth', text: 'Collect {n} star-coins near Earth', icon: 'coin', goal: { easy: 25, normal: 40 }, reward: 30, available: () => true, count: (e) => (e.type === 'coins' && e.system === 'earth' ? e.amount : 0) },
  { id: 'coins_belt', text: 'Collect {n} star-coins in the asteroid belt', icon: 'coin', goal: { easy: 30, normal: 50 }, reward: 45, available: unlocked('belt', 3), count: (e) => (e.type === 'coins' && e.system === 'belt' ? e.amount : 0) },
  { id: 'coins_any', text: 'Collect {n} star-coins anywhere', icon: 'coin', goal: { easy: 40, normal: 70 }, reward: 35, available: () => true, count: (e) => (e.type === 'coins' ? e.amount : 0) },
  { id: 'perfect', text: 'Make {n} perfect landings', icon: 'land', goal: { easy: 1, normal: 2 }, reward: 40, available: (s) => s.stats.landings >= 2, count: (e) => (e.type === 'land' && e.perfect ? 1 : 0) },
  { id: 'landings', text: 'Land on {n} different worlds', icon: 'land', goal: { easy: 2, normal: 3 }, reward: 35, available: (s) => s.chapter >= 2, count: (e) => (e.type === 'land' ? 1 : 0) },
  { id: 'comets', text: 'Ride {n} comet tails', icon: 'sparkle', goal: { easy: 1, normal: 3 }, reward: 35, available: (s) => s.stats.flights >= 2, count: (e) => (e.type === 'comet' ? 1 : 0) },
  { id: 'slingshots', text: 'Do {n} gravity slingshots', icon: 'planet', goal: { easy: 1, normal: 2 }, reward: 40, available: (s) => s.chapter >= 2, count: (e) => (e.type === 'slingshot' ? 1 : 0) },
  { id: 'fuel', text: 'Grab {n} fuel cells', icon: 'fuel', goal: { easy: 3, normal: 5 }, reward: 30, available: () => true, count: (e) => (e.type === 'fuel' ? 1 : 0) },
  { id: 'boosts', text: 'Boost {n} times', icon: 'boost', goal: { easy: 8, normal: 15 }, reward: 25, available: () => true, count: (e) => (e.type === 'boost' ? 1 : 0) },
  { id: 'scans', text: 'Scan {n} things in space', icon: 'scan', goal: { easy: 1, normal: 2 }, reward: 35, available: (s) => s.chapter >= 2, count: (e) => (e.type === 'scan' ? 1 : 0) },
  { id: 'samples', text: 'Collect {n} mission items', icon: 'sparkle', goal: { easy: 2, normal: 4 }, reward: 40, available: (s) => s.stats.samples >= 1, count: (e) => (e.type === 'collect' ? e.count : 0) },
  { id: 'puzzles', text: 'Solve {n} puzzle', icon: 'star', goal: { easy: 1, normal: 1 }, reward: 40, available: (s) => s.stats.puzzles >= 1, count: (e) => (e.type === 'solve' ? 1 : 0) },
  { id: 'race', text: 'Finish {n} race at Saturn', icon: 'trophy', goal: { easy: 1, normal: 1 }, reward: 50, available: (s) => !!s.flags.racesOpen, count: (e) => (e.type === 'race' ? 1 : 0) },
  { id: 'talks', text: 'Talk to {n} friends', icon: 'chat', goal: { easy: 2, normal: 3 }, reward: 25, available: () => true, count: (e) => (e.type === 'talk' ? 1 : 0) },
];

export const DAILY_BY_ID: Record<string, DailyTemplate> = Object.fromEntries(DAILIES.map((d) => [d.id, d]));

/** Bonus for finishing all three in one day. */
export const DAILY_BONUS = 30;
