// ONE place for every gameplay-balance number. Physics constants that define how a kart *moves* stay in
// `src/sim/tuning.ts` (TUNING); everything that decides who *wins* lives here so playtest data can be mapped
// straight onto it (`npm run analyze-playtests` suggests edits to these fields — it never applies them).
//
// Pure data: imported by the headless sim, so no three.js / DOM here.
import type { ItemId, SpeedClass, Stats, WeightClass } from '../data/types';

/** Steering-assist levels a player can pick (Auto resolves per input device). */
export type AssistLevel = 'off' | 'light' | 'full';
export type AssistSetting = 'auto' | AssistLevel;

export interface ClassBalance {
  name: string;
  /** Multiplies top speed (acceleration scales with its square root). */
  speedScale: number;
  /** Mean AI skill 0..1 in this class. */
  aiSkill: number;
  /** Catch-up: max speed bonus for AI far *behind* the best human (0.07 = +7 %). */
  rubberBack: number;
  /** Catch-up: max speed cut for AI far *ahead* of the best human. */
  rubberFront: number;
}

export interface AssistLevelBalance {
  /** Always-on pull toward the racing line (0 = none, 1 = full autopilot steering). */
  lineBlend: number;
  /** Pull when heading toward a wall edge / drop edge. */
  wallBlend: number;
  dropBlend: number;
  /** Start the edge pull this many metres from a wall / drop. */
  wallMargin: number;
  dropMargin: number;
  /** Assist strength multiplier while drifting (so drifts still feel player-driven). */
  driftMul: number;
  /** Fraction of the racing-line offset used as the target (1 = exact line, 0 = road centre). */
  lineFollow: number;
  /** Soft invisible rail on drop edges (metres inside the edge); 0 = off. Never on shortcuts/gaps/gliders. */
  edgeGuard: number;
}

export const BALANCE = {
  // ------------------------------------------------------------------ speed classes
  classes: {
    rookie: { name: 'Rookie', speedScale: 0.82, aiSkill: 0.35, rubberBack: 0.08, rubberFront: 0.06 },
    pro: { name: 'Pro', speedScale: 1.0, aiSkill: 0.65, rubberBack: 0.07, rubberFront: 0.035 },
    champion: { name: 'Champion', speedScale: 1.16, aiSkill: 0.92, rubberBack: 0.06, rubberFront: 0.02 },
  } satisfies Record<SpeedClass, ClassBalance>,

  // ------------------------------------------------------------------ catch-up (rubber band vs best human)
  catchUp: {
    /** Seconds after GO before catch-up fully applies (keeps the start fair). */
    rampSeconds: 10,
    /** Gap (m) behind the best human where help starts, and the extra gap where it reaches full strength. */
    behindStart: 15,
    behindRange: 140,
    /** Same for AI *ahead* of the best human (they ease off). */
    aheadStart: 20,
    aheadRange: 160,
  },

  // ------------------------------------------------------------------ stats → physics
  weightBase: {
    light: { speed: 3, accel: 7, handling: 7, weight: 2, traction: 6 },
    medium: { speed: 5, accel: 5, handling: 5, weight: 5, traction: 5 },
    heavy: { speed: 7, accel: 3, handling: 3, weight: 8, traction: 4 },
  } satisfies Record<WeightClass, Stats>,
  /** Each physics value = base + perStat × stat bar (0..10). Kept gentle so skill matters more than setup. */
  statMap: {
    topSpeed: { base: 0.975, perStat: 0.005 }, // × TUNING.baseTopSpeed × speedScale
    accel: { base: 11, perStat: 1.25 }, // × √speedScale
    turnRate: { base: 1.78, perStat: 0.085 },
    mass: { base: 1, perStat: 0.08 },
    grip: { base: 7.5, perStat: 0.5 },
    driftGrip: { base: 2.2, perStat: 0.12 },
    offroadMul: { base: 0.5, perStat: 0.028 },
    /** Mini-turbo strength: 1 + perStat × (accel + handling − 10). */
    miniTurbo: { perStat: 0.03 },
  },

  // ------------------------------------------------------------------ items
  items: {
    /** Position buckets: 1st, front pack (< cut[0]), middle (< cut[1]), back pack, last. */
    bucketCuts: [0.35, 0.67] as readonly [number, number],
    /** Roll weights per bucket [1st, front, middle, back, last]. */
    weights: {
      bumperBall: [26, 24, 18, 10, 5],
      paperPlane: [0, 7, 12, 14, 12],
      gooPuddle: [28, 18, 10, 5, 2],
      turbo: [8, 16, 18, 14, 9],
      turbo3: [0, 4, 10, 16, 15],
      magnet: [0, 4, 10, 14, 13],
      shield: [14, 11, 8, 6, 4],
      cloud: [0, 2, 6, 8, 8],
      tornado: [2, 6, 8, 8, 6],
      rocketDash: [0, 0, 0, 3, 14],
      springTrap: [16, 12, 6, 2, 1],
      popper: [0, 8, 10, 8, 6],
    } satisfies Record<ItemId, readonly [number, number, number, number, number]>,
  },

  // ------------------------------------------------------------------ AI drivers
  ai: {
    /** Per-kart random skill spread around the class mean. */
    skillSpread: 0.06,
    /** Fraction of top speed aimed for on straights: base + perSkill × skill. */
    paceBase: 0.9,
    pacePerSkill: 0.1,
    /** Spark tier targeted when drifting: ≥ tier3Skill → pink, ≥ tier2Skill → orange, else blue. */
    tier3Skill: 0.85,
    tier2Skill: 0.5,
    /** Chance to drift a qualifying corner = base + perSkill × skill (× personality). */
    driftChanceBase: 0.15,
    driftChancePerSkill: 0.85,
    /** A corner qualifies when its average curvature > 1/cornerRadius and it turns more than cornerTurn rad. */
    cornerRadius: 55,
    cornerTurn: 0.5,
    steerGainBase: 2.1,
    steerGainPerSkill: 0.8,
    /** Weaving amplitude for low-skill drivers: wobble × (1 − skill). */
    wobble: 0.12,
    /** Chance of pressing in the rocket-start window = base + perSkill × skill. */
    rocketStartBase: 0.25,
    rocketStartPerSkill: 0.6,
    /** Chance of a ramp trick = base + perSkill × skill. */
    trickBase: 0.25,
    trickPerSkill: 0.5,
    /** Shortcut chance = skill × personality bias × track aiUse, capped; × noBoostMul for off-road without a turbo. */
    shortcutMaxChance: 0.95,
    shortcutNoBoostMul: 0.35,
    /** Skill used when the AI drives a player's kart (victory lap, autopilot). */
    takeOverSkill: 0.8,
  },

  // ------------------------------------------------------------------ steering assist
  assist: {
    levels: {
      off: { lineBlend: 0, wallBlend: 0, dropBlend: 0, wallMargin: 0, dropMargin: 0, driftMul: 0, lineFollow: 0.6, edgeGuard: 0 },
      light: { lineBlend: 0.2, wallBlend: 0.55, dropBlend: 0.85, wallMargin: 1.2, dropMargin: 2.5, driftMul: 0.5, lineFollow: 0.6, edgeGuard: 0 },
      full: { lineBlend: 0.2, wallBlend: 0.55, dropBlend: 0.85, wallMargin: 1.2, dropMargin: 2.5, driftMul: 0.5, lineFollow: 0.6, edgeGuard: 0 },
    } satisfies Record<AssistLevel, AssistLevelBalance>,
    /** What "Auto" means for each input device. */
    defaults: { touch: 'light', keyboard: 'off', gamepad: 'off' } as Record<'touch' | 'keyboard' | 'gamepad', AssistLevel>,
  },

  // ------------------------------------------------------------------ Time Trial staff ghosts
  staff: {
    /** Skill bonus over the Pro class mean for the staff driver. */
    skillBonus: 0.1,
    seed: 4242,
    /** Per-track pace override (filled by `npm run calibrate-staff`). */
    pace: {} as Record<string, number>,
  },
};

export type Balance = typeof BALANCE;
