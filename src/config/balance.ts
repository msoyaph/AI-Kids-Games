import type { PlayerStats } from './types';

/** Global tuning constants. */
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

/** Spawning geometry. */
export const SPAWN = {
  minDist: 46,
  maxDist: 58,
  /** Enemies further than this from the player are recycled in front of them. */
  recycleDist: 88,
} as const;

/** Player movement (base values, modified per character). */
export const MOVE = {
  walkSpeed: 7.2,
  groundAccel: 70,
  groundFriction: 55,
  overspeedFriction: 9,
  airAccel: 14,
  gravity: 26,
  jumpSpeed: 9.5,
  coyoteTime: 0.12,
  jumpBuffer: 0.12,
  slideMinSpeed: 3,
  slideBoost: 3.5,
  slideFriction: 2.2,
  slideSlopeAccel: 34,
  slideSteer: 2.2,
  slideBoostCooldown: 0.6,
  bhopBoost: 0.6,
  maxSpeed: 34,
  stepHeight: 0.65,
  radius: 0.6,
  height: 1.7,
} as const;

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
export const PLAYER_IFRAMES = 0.4;
export const MAX_COOLDOWN_REDUCTION = 0.6;

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  if (level <= 1) return 5;
  if (level < 20) return 6 + (level - 1) * 6;
  if (level < 40) return 120 + (level - 20) * 10;
  return 320 + (level - 40) * 14;
}

/** Enemy stat scaling over run time (minutes). */
export function enemyHpScale(minutes: number): number {
  return 1 + minutes * 0.2 + minutes * minutes * 0.012;
}

export function enemyDamageScale(minutes: number): number {
  return 1 + minutes * 0.06;
}

export const GEM_TIERS = [
  { min: 0, color: 0x5ee6ff, scale: 0.85 },
  { min: 5, color: 0x6dff8a, scale: 1.0 },
  { min: 20, color: 0xff6bd6, scale: 1.2 },
  { min: 80, color: 0xffd34d, scale: 1.45 },
] as const;

export function gemTier(value: number): number {
  let t = 0;
  for (let i = 0; i < GEM_TIERS.length; i++) if (value >= GEM_TIERS[i].min) t = i;
  return t;
}

/** Drop chances (before luck). */
export const DROPS = {
  coinChance: 0.025,
  heartChance: 0.006,
  magnetChance: 0.0015,
  heartHeal: 30,
  coinValue: 1,
  eliteGold: 10,
  bossGold: 60,
} as const;
