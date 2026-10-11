import type { SpeedClass, SpeedClassData, Stats, WeightClass } from '../data/types';
import { clamp } from '../core/math';

/** Global physics tuning. Units: metres, seconds, radians. */
export const TUNING = {
  baseTopSpeed: 26,
  gravity: 34,
  kartRadius: 1.0,
  reverseSpeed: 9,
  brakeDecel: 26,
  coastDecel: 5,
  /** Excess speed bleed when above the current top speed (e.g. after a boost). */
  overspeedDecay: 9,
  /** Speed needed to start a drift. */
  driftMinSpeed: 9,
  driftHopVel: 4.2,
  /** Seconds of charge for each spark tier (blue, orange, pink). */
  driftTiers: [0.85, 1.75, 2.9] as const,
  /** Mini-turbo seconds by tier. */
  miniTurboTime: [0, 0.7, 1.15, 1.75] as const,
  boostSpeedMul: 1.3,
  boostAccel: 45,
  boostPadTime: 1.1,
  trickBoostTime: 0.75,
  startBoostTime: 1.4,
  turboCanisterTime: 1.5,
  /** Air control as fraction of ground steering. */
  airSteer: 0.35,
  gliderGravity: 7,
  gliderMaxFall: 4.5,
  gliderSteer: 0.75,
  waterGravity: 0.62,
  waterDrag: 0.92,
  lowGravScale: 0.45,
  /** Max height the kart can step up onto while driving. */
  stepUp: 0.9,
  /** Max height difference that still counts as following the ground. */
  snapDown: 0.55,
  /** Falling this far below the last ground (or killY) triggers a drone respawn. */
  fallDistance: 18,
  /** Seconds airborne with no ground below before respawn. */
  maxVoidTime: 1.6,
  respawnFallTime: 0.55,
  respawnCarryTime: 1.15,
  spinTime: 1.05,
  tumbleTime: 1.35,
  gooTime: 2.2,
  hitInvulnTime: 1.4,
  wallRestitution: 0.35,
  kartRestitution: 0.55,
} as const;

export const SPEED_CLASSES: Record<SpeedClass, SpeedClassData> = {
  rookie: { id: 'rookie', name: 'Rookie', speedScale: 0.82, aiSkill: 0.35, rubberBack: 0.08, rubberFront: 0.06 },
  pro: { id: 'pro', name: 'Pro', speedScale: 1.0, aiSkill: 0.65, rubberBack: 0.07, rubberFront: 0.035 },
  champion: { id: 'champion', name: 'Champion', speedScale: 1.16, aiSkill: 0.92, rubberBack: 0.06, rubberFront: 0.02 },
};

export const WEIGHT_BASE: Record<WeightClass, Stats> = {
  light: { speed: 3, accel: 7, handling: 7, weight: 2, traction: 6 },
  medium: { speed: 5, accel: 5, handling: 5, weight: 5, traction: 5 },
  heavy: { speed: 7, accel: 3, handling: 3, weight: 8, traction: 4 },
};

export interface KartParams {
  topSpeed: number;
  accel: number;
  turnRate: number;
  mass: number;
  grip: number;
  driftGrip: number;
  offroadMul: number;
  miniTurboMul: number;
}

export function combineStats(base: Stats, ...mods: Array<Partial<Stats>>): Stats {
  const out: Stats = { ...base };
  for (const m of mods) {
    out.speed += m.speed ?? 0;
    out.accel += m.accel ?? 0;
    out.handling += m.handling ?? 0;
    out.weight += m.weight ?? 0;
    out.traction += m.traction ?? 0;
  }
  out.speed = clamp(out.speed, 0, 10);
  out.accel = clamp(out.accel, 0, 10);
  out.handling = clamp(out.handling, 0, 10);
  out.weight = clamp(out.weight, 0, 10);
  out.traction = clamp(out.traction, 0, 10);
  return out;
}

/** Map 0..10 stat bars to physical parameters. Kept gentle so skill matters more than setup. */
export function deriveParams(stats: Stats, speedScale: number): KartParams {
  return {
    topSpeed: TUNING.baseTopSpeed * speedScale * (0.95 + 0.01 * stats.speed),
    accel: (11 + 1.25 * stats.accel) * Math.sqrt(speedScale),
    turnRate: 1.8 + 0.07 * stats.handling,
    mass: 1 + 0.08 * stats.weight,
    grip: 7.5 + 0.5 * stats.traction,
    driftGrip: 2.2 + 0.12 * stats.traction,
    offroadMul: 0.5 + 0.028 * stats.traction,
    miniTurboMul: 1 + 0.01 * (stats.accel + stats.handling - 10),
  };
}
