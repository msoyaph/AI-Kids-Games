import type { SpeedClass, SpeedClassData, Stats, WeightClass } from '../data/types';
import { clamp } from '../core/math';
import { BALANCE } from '../tuning/balance';

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
  /** Drift yaw rate range as a fraction of the turn rate (stick fully outward … fully inward). */
  driftRateMin: 0.15,
  driftRateMax: 1.3,
  /** Fraction of the sideways slide speed a drift turns back into forward speed (arcade: drifts keep their pace). */
  driftSpeedKeep: 0.5,
  /** Seconds of charge for each spark tier (blue, orange, pink). */
  driftTiers: [0.7, 1.45, 2.4] as const,
  /** Mini-turbo seconds by tier. */
  miniTurboTime: [0, 0.9, 1.4, 2.1] as const,
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
};

/** Speed classes: the very same objects as `BALANCE.classes` (tagged with their id), so edits apply live. */
const classOf = (id: SpeedClass): SpeedClassData => Object.assign(BALANCE.classes[id], { id });
export const SPEED_CLASSES: Record<SpeedClass, SpeedClassData> = {
  rookie: classOf('rookie'),
  pro: classOf('pro'),
  champion: classOf('champion'),
};

export const WEIGHT_BASE: Record<WeightClass, Stats> = BALANCE.weightBase;

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

/** Map 0..10 stat bars to physical parameters (`BALANCE.statMap`). Kept gentle so skill matters more than setup. */
export function deriveParams(stats: Stats, speedScale: number): KartParams {
  const m = BALANCE.statMap;
  return {
    topSpeed: TUNING.baseTopSpeed * speedScale * (m.topSpeed.base + m.topSpeed.perStat * stats.speed),
    accel: (m.accel.base + m.accel.perStat * stats.accel) * Math.sqrt(speedScale),
    turnRate: m.turnRate.base + m.turnRate.perStat * stats.handling,
    mass: m.mass.base + m.mass.perStat * stats.weight,
    grip: m.grip.base + m.grip.perStat * stats.traction,
    driftGrip: m.driftGrip.base + m.driftGrip.perStat * stats.traction,
    offroadMul: m.offroadMul.base + m.offroadMul.perStat * stats.traction,
    miniTurboMul: 1 + m.miniTurbo.perStat * (stats.accel + stats.handling - 10),
  };
}
