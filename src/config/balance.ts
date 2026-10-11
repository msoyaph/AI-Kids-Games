import { TUNING_DEFAULTS, xpToNextWith } from './tuning';
import type { PlayerStats } from './types';

/** Structural constants. Feel / balance values live in config/tuning.ts. */
export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;

/** Map is a square from -MAP_HALF to +MAP_HALF on x and z. */
export const MAP_HALF = 150;

export const RUN_LENGTH = 20 * 60;
export const BOSS_TIMES = [5 * 60, 10 * 60, 15 * 60] as const;

export const WEAPON_SLOTS = 6;
export const PASSIVE_SLOTS = 6;

export const CAPS = {
  enemies: 1600,
  projectiles: 1600,
  enemyProjectiles: 700,
  gems: 1800,
  pickups: 256,
  hazards: 192,
} as const;

/** Player body (collision), not a feel value. Movement tuning lives in config/tuning.ts. */
export const PLAYER_RADIUS = 0.6;
export const PLAYER_HEIGHT = 1.7;

/** Base player stats before character / shop / passive modifiers. */
export const BASE_STATS: PlayerStats = {
  maxHp: 100,
  regen: 0,
  armor: 0,
  moveSpeed: 0,
  might: 0,
  cooldown: 0,
  area: 0,
  amount: 0,
  duration: 0,
  projSpeed: 0,
  magnet: 3.2,
  luck: 0,
  growth: 0,
  greed: 0,
  revival: 0,
  crit: 0.05,
  reroll: 0,
};

export const CRIT_MULT = 2;
export const MAX_COOLDOWN_REDUCTION = 0.6;

/** XP needed to go from `level` to `level + 1` with the shipping tuning (see tuning.ts). */
export function xpToNext(level: number): number {
  return xpToNextWith(level, TUNING_DEFAULTS.xp);
}

export const GEM_TIERS = [
  { min: 0, color: 0x5ee6ff, scale: 0.75 },
  { min: 5, color: 0x6dff8a, scale: 0.9 },
  { min: 20, color: 0xff6bd6, scale: 1.05 },
  { min: 80, color: 0xffd34d, scale: 1.25 },
] as const;

export function gemTier(value: number): number {
  let t = 0;
  for (let i = 0; i < GEM_TIERS.length; i++) if (value >= GEM_TIERS[i].min) t = i;
  return t;
}

/** Gold drop values (drop *chances* are tuning: tuning.combat). */
export const DROPS = {
  coinValue: 1,
  eliteGold: 10,
  bossGold: 60,
} as const;
