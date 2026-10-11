import type { Difficulty } from '../data/types';

/** Everything that changes between Easy and Normal. Easy is tuned so a 6-year-old can finish every mission. */
export interface DiffTuning {
  /** Fuel use multiplier. */
  fuelUse: number;
  /** Shield lost per asteroid bump. */
  bumpShield: number;
  /** Fuel lost per asteroid bump. */
  bumpFuel: number;
  /** Space "drag" so the rocket slows down by itself. Higher = easier to stop. */
  damping: number;
  /** Gentle auto-steer toward the target (0 = none). */
  assist: number;
  asteroidDensity: number;
  asteroidSpeed: number;
  /** Extra coin magnet radius. */
  magnetBonus: number;
  /** Seconds between gentle hints when the player seems stuck. */
  hintEvery: number;
  /** Landing: autopilot keeps the descent slow. */
  landingAssist: boolean;
  /** Landing: fastest safe touchdown speed. */
  landingSafeSpeed: number;
  /** Race medal times are multiplied by this. */
  raceTimeMult: number;
  /** Platformer: jetpack hover time (seconds). */
  hover: number;
  /** Platformer: grace time to jump after leaving a ledge. */
  coyote: number;
  /** Scan: seconds you need to hold the action button. */
  scanTime: number;
  /** Trips between planets are this much shorter or longer. */
  routeScale: number;
}

export const DIFFICULTY: Record<Difficulty, DiffTuning> = {
  easy: {
    fuelUse: 0.45,
    bumpShield: 0.5,
    bumpFuel: 2,
    damping: 1.5,
    assist: 0.35,
    asteroidDensity: 0.55,
    asteroidSpeed: 0.55,
    magnetBonus: 50,
    hintEvery: 45,
    landingAssist: true,
    landingSafeSpeed: 150,
    raceTimeMult: 1.6,
    hover: 1.6,
    coyote: 0.16,
    scanTime: 1.0,
    routeScale: 0.85,
  },
  normal: {
    fuelUse: 1,
    bumpShield: 1,
    bumpFuel: 5,
    damping: 0.85,
    assist: 0,
    asteroidDensity: 1,
    asteroidSpeed: 1,
    magnetBonus: 0,
    hintEvery: 100,
    landingAssist: false,
    landingSafeSpeed: 100,
    raceTimeMult: 1,
    hover: 0.9,
    coyote: 0.1,
    scanTime: 1.8,
    routeScale: 1,
  },
};

export function tuning(d: Difficulty): DiffTuning {
  return DIFFICULTY[d] ?? DIFFICULTY.easy;
}
