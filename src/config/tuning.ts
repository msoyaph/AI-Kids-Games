import { ENEMIES } from './enemies';

/**
 * TheaBonk's single source of feel + balance tuning.
 *
 * - `TUNING_DEFAULTS` (generated block below) holds the shipping values. Edit them by hand
 *   or write them from the in-game panel (`?tune=1` → Export) with
 *   `npm run apply-tuning -- exported.json`.
 * - Each run gets its own copy (`world.tuning`), so the live panel only ever affects the run
 *   being played — headless simulations and tests always use these defaults.
 * - `TUNING_RANGES` bounds every value (panel sliders + apply-tuning validation).
 */
export interface Tuning {
  /** Player movement (before per-hero multipliers). */
  movement: {
    /** Base run speed, units/s. */
    walkSpeed: number;
    /** Acceleration toward the stick direction while walking. */
    groundAccel: number;
    /** Deceleration with no input. */
    groundFriction: number;
    /** How fast speed above walking speed bleeds off when not sliding. */
    overspeedFriction: number;
    /** Steering acceleration while airborne. */
    airAccel: number;
    gravity: number;
    /** Upward speed of a jump. */
    jumpSpeed: number;
    /** Grace period to still jump after leaving a ledge. */
    coyoteTime: number;
    /** A jump pressed slightly before landing still counts. */
    jumpBuffer: number;
    /** Minimum speed to start a slide from a standstill input. */
    slideMinSpeed: number;
    /** Burst of speed when a slide starts (fades out at high speed). */
    slideBoost: number;
    /** Speed lost per second while sliding on flat ground. */
    slideFriction: number;
    /** Downhill acceleration while sliding. */
    slideSlopeAccel: number;
    /** Max turn rate while sliding, rad/s. */
    slideSteer: number;
    /** Minimum time between two slide boosts. */
    slideBoostCooldown: number;
    /** Extra speed for jumping out of a slide (bunny hop). */
    bhopBoost: number;
    /** Hard cap on horizontal speed. */
    maxSpeed: number;
    /** Highest ledge you can walk up without jumping. */
    stepHeight: number;
    /** Ice: multiplier on walking acceleration / friction (low = slippery). */
    iceGrip: number;
    /** Ice: multiplier on slide friction (low = slides go further). */
    iceSlide: number;
    /** Snowdrifts: multiplier on walking speed. */
    snowSpeed: number;
    /** Snowdrifts: multiplier on slide friction. */
    snowSlide: number;
    /** Fraction of walking speed lost while chilled by frost attacks. */
    chillSlow: number;
  };
  /** Third-person camera (render-only, never affects the simulation). */
  camera: {
    distance: number;
    /** Camera height above the player's feet before pitch is applied. */
    height: number;
    /** Starting pitch, radians. */
    pitch: number;
    /** Base field of view, degrees. */
    fov: number;
    /** Max extra field of view at high speed, degrees. */
    fovKickMax: number;
    /** Speed at which the field-of-view kick starts. */
    fovKickStart: number;
    /** Degrees of field of view per unit of speed above the start. */
    fovKickPerSpeed: number;
    /** Horizontal follow sharpness (higher = tighter). */
    followSharpness: number;
    /** Extra distance per unit of speed. */
    speedPullback: number;
  };
  /** Warning (telegraph) durations — how long players get to react. */
  telegraphs: {
    /** Multiplier on every charger's wind-up (Ramhorn 0.75 s base). */
    chargerWindupMult: number;
    /** Multiplier on the Fusewick fuse (0.75 s base). */
    fuseMult: number;
    /** Grumblecap's stomp warning, seconds. */
    grumblecapStompFuse: number;
    /** Multiplier on Clockjaw's charge wind-up (1.1 s base). */
    bossWindupMult: number;
    /** Gloam Regent's slam-trap warning, seconds. */
    regentSlamFuse: number;
    /** Multiplier on every boss shockwave ring's expansion speed. */
    shockwaveSpeedMult: number;
    /** Old Rime's ice-spike line warning (first spike), seconds. */
    rimeSpikeFuse: number;
  };
  /** Enemy movement speed multipliers. */
  enemies: {
    speedMult: number;
    /** Per enemy id. */
    perType: Record<string, number>;
  };
  /** Wave spawning. */
  spawns: {
    /** Multiplier on every wave segment's spawn rate. */
    rateMult: number;
    /** Multiplier on the "spawn faster below this many" threshold. */
    minAliveMult: number;
    /** Multiplier on the per-segment cap of alive enemies. */
    maxAliveMult: number;
    /** Off-screen spawn ring, units from the player. */
    minDist: number;
    maxDist: number;
    /** Enemies further than this are moved back in front of the player. */
    recycleDist: number;
  };
  /** Experience curve: XP needed to go from level L to L+1. */
  xp: {
    /** Level 1 → 2. */
    first: number;
    /** Levels 2–19: earlyBase + (L-1) × earlyStep. */
    earlyBase: number;
    earlyStep: number;
    /** Levels 20–39: midBase + (L-20) × midStep. */
    midBase: number;
    midStep: number;
    /** Levels 40+: lateBase + (L-40) × lateStep. */
    lateBase: number;
    lateStep: number;
  };
  /** Survival / drops / scaling. */
  combat: {
    /** Invulnerability after taking a hit, seconds. */
    playerIframes: number;
    /** Fraction of max HP restored on each level-up. */
    levelHeal: number;
    /** Drop chances per regular kill (before luck). */
    heartChance: number;
    coinChance: number;
    magnetChance: number;
    /** HP restored by a Warm Bun. */
    heartHeal: number;
    /** Enemy HP multiplier = 1 + m × hpPerMinute + m² × hpPerMinute2. */
    hpPerMinute: number;
    hpPerMinute2: number;
    /** Enemy damage multiplier = 1 + m × damagePerMinute. */
    damagePerMinute: number;
  };
}

export type TuningGroup = keyof Tuning;
export type TuningOverrides = { [G in TuningGroup]?: Partial<Tuning[G]> };

/** [min, max, step] for each value. */
export type Range = readonly [number, number, number];

const perTypeRange: Range = [0.25, 3, 0.05];

export const TUNING_RANGES: { [G in TuningGroup]: { [K in keyof Tuning[G]]: Tuning[G][K] extends number ? Range : Range } } = {
  movement: {
    walkSpeed: [3, 14, 0.1],
    groundAccel: [10, 200, 1],
    groundFriction: [5, 200, 1],
    overspeedFriction: [0, 40, 0.5],
    airAccel: [0, 60, 0.5],
    gravity: [8, 60, 0.5],
    jumpSpeed: [3, 20, 0.1],
    coyoteTime: [0, 0.4, 0.01],
    jumpBuffer: [0, 0.4, 0.01],
    slideMinSpeed: [0, 10, 0.1],
    slideBoost: [0, 12, 0.1],
    slideFriction: [0, 12, 0.1],
    slideSlopeAccel: [0, 80, 1],
    slideSteer: [0.2, 8, 0.1],
    slideBoostCooldown: [0, 3, 0.05],
    bhopBoost: [0, 4, 0.05],
    maxSpeed: [10, 60, 0.5],
    stepHeight: [0.1, 1.5, 0.05],
    iceGrip: [0.05, 1, 0.01],
    iceSlide: [0.05, 1, 0.01],
    snowSpeed: [0.3, 1, 0.01],
    snowSlide: [1, 5, 0.05],
    chillSlow: [0, 0.8, 0.01],
  },
  camera: {
    distance: [5, 24, 0.25],
    height: [0, 5, 0.05],
    pitch: [0.08, 1.25, 0.01],
    fov: [40, 95, 1],
    fovKickMax: [0, 30, 0.5],
    fovKickStart: [0, 30, 0.5],
    fovKickPerSpeed: [0, 3, 0.05],
    followSharpness: [2, 40, 0.5],
    speedPullback: [0, 0.5, 0.01],
  },
  telegraphs: {
    chargerWindupMult: [0.3, 3, 0.05],
    fuseMult: [0.3, 3, 0.05],
    grumblecapStompFuse: [0.3, 3, 0.05],
    bossWindupMult: [0.3, 3, 0.05],
    regentSlamFuse: [0.3, 3, 0.05],
    shockwaveSpeedMult: [0.3, 2, 0.05],
    rimeSpikeFuse: [0.3, 3, 0.05],
  },
  enemies: {
    speedMult: [0.25, 3, 0.05],
    perType: perTypeRange,
  },
  spawns: {
    rateMult: [0, 5, 0.05],
    minAliveMult: [0, 5, 0.05],
    maxAliveMult: [0.1, 5, 0.05],
    minDist: [20, 90, 1],
    maxDist: [25, 110, 1],
    recycleDist: [40, 200, 1],
  },
  xp: {
    first: [1, 50, 1],
    earlyBase: [1, 100, 1],
    earlyStep: [0, 50, 0.5],
    midBase: [10, 1000, 1],
    midStep: [0, 100, 0.5],
    lateBase: [10, 3000, 1],
    lateStep: [0, 200, 0.5],
  },
  combat: {
    playerIframes: [0.05, 2, 0.05],
    levelHeal: [0, 0.5, 0.01],
    heartChance: [0, 0.1, 0.001],
    coinChance: [0, 0.3, 0.001],
    magnetChance: [0, 0.05, 0.0005],
    heartHeal: [0, 200, 1],
    hpPerMinute: [0, 2, 0.01],
    hpPerMinute2: [0, 0.2, 0.001],
    damagePerMinute: [0, 1, 0.005],
  },
};

// @tuning-values-begin — generated by `npm run apply-tuning`; edit values, keep the shape.
export const TUNING_DEFAULTS: Tuning = {
  movement: {
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
    iceGrip: 0.18,
    iceSlide: 0.3,
    snowSpeed: 0.78,
    snowSlide: 2,
    chillSlow: 0.3,
  },
  camera: {
    distance: 11.5,
    height: 1.4,
    pitch: 0.5,
    fov: 62,
    fovKickMax: 14,
    fovKickStart: 8,
    fovKickPerSpeed: 0.7,
    followSharpness: 18,
    speedPullback: 0.12,
  },
  telegraphs: {
    chargerWindupMult: 1,
    fuseMult: 1,
    grumblecapStompFuse: 1.1,
    bossWindupMult: 1,
    regentSlamFuse: 1.1,
    shockwaveSpeedMult: 1,
    rimeSpikeFuse: 0.95,
  },
  enemies: {
    speedMult: 1,
    perType: {
      gloomling: 1,
      gnatlet: 1,
      boulderback: 1,
      spitcap: 1,
      ramhorn: 1,
      blobbin: 1,
      blobbit: 1,
      fusewick: 1,
      grumblecap: 1,
      clockjaw: 1,
      gloamRegent: 1,
      frostling: 1,
      snowRoller: 1,
      icicap: 1,
      grumblecapFrost: 1,
      clockjawFrost: 1,
      oldRime: 1,
    },
  },
  spawns: {
    rateMult: 1,
    minAliveMult: 1,
    maxAliveMult: 1,
    minDist: 46,
    maxDist: 58,
    recycleDist: 88,
  },
  xp: {
    first: 5,
    earlyBase: 6,
    earlyStep: 6,
    midBase: 120,
    midStep: 10,
    lateBase: 320,
    lateStep: 14,
  },
  combat: {
    playerIframes: 0.6,
    levelHeal: 0.05,
    heartChance: 0.009,
    coinChance: 0.025,
    magnetChance: 0.0015,
    heartHeal: 30,
    hpPerMinute: 0.2,
    hpPerMinute2: 0.02,
    damagePerMinute: 0.06,
  },
};
// @tuning-values-end

/** Deep copy (plain data only). */
export function cloneTuning(t: Tuning = TUNING_DEFAULTS): Tuning {
  return JSON.parse(JSON.stringify(t)) as Tuning;
}

export interface TuningIssue {
  path: string;
  problem: string;
}

/**
 * Apply overrides onto a copy of `base`, validating names and ranges. Unknown keys and
 * out-of-range / non-numeric values are reported and skipped (never thrown).
 */
export function mergeTuning(base: Tuning, overrides: unknown, issues: TuningIssue[] = []): Tuning {
  const out = cloneTuning(base);
  if (!overrides || typeof overrides !== 'object') return out;
  for (const [g, vals] of Object.entries(overrides as Record<string, unknown>)) {
    if (!(g in TUNING_RANGES)) {
      issues.push({ path: g, problem: 'unknown group' });
      continue;
    }
    if (!vals || typeof vals !== 'object') continue;
    const group = out[g as TuningGroup] as unknown as Record<string, unknown>;
    const ranges = TUNING_RANGES[g as TuningGroup] as Record<string, Range>;
    for (const [k, v] of Object.entries(vals as Record<string, unknown>)) {
      if (!(k in ranges)) {
        issues.push({ path: `${g}.${k}`, problem: 'unknown value' });
        continue;
      }
      if (g === 'enemies' && k === 'perType') {
        if (!v || typeof v !== 'object') continue;
        const per = group.perType as Record<string, number>;
        for (const [id, m] of Object.entries(v as Record<string, unknown>)) {
          if (!(id in per)) issues.push({ path: `${g}.${k}.${id}`, problem: 'unknown enemy' });
          else if (typeof m !== 'number' || !Number.isFinite(m) || m < perTypeRange[0] || m > perTypeRange[1]) issues.push({ path: `${g}.${k}.${id}`, problem: `must be a number in [${perTypeRange[0]}, ${perTypeRange[1]}]` });
          else per[id] = m;
        }
        continue;
      }
      const [min, max] = ranges[k];
      if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) {
        issues.push({ path: `${g}.${k}`, problem: `must be a number in [${min}, ${max}]` });
        continue;
      }
      group[k] = v;
    }
  }
  return out;
}

/** Only the values that differ from `base` (what Export writes). */
export function diffTuning(base: Tuning, cur: Tuning): TuningOverrides {
  const out: Record<string, Record<string, unknown>> = {};
  for (const g of Object.keys(base) as TuningGroup[]) {
    const a = base[g] as unknown as Record<string, unknown>;
    const b = cur[g] as unknown as Record<string, unknown>;
    for (const k of Object.keys(a)) {
      if (g === 'enemies' && k === 'perType') {
        const pa = a[k] as Record<string, number>;
        const pb = b[k] as Record<string, number>;
        const d: Record<string, number> = {};
        for (const id of Object.keys(pa)) if (pa[id] !== pb[id]) d[id] = pb[id];
        if (Object.keys(d).length) (out[g] ??= {})[k] = d;
      } else if (a[k] !== b[k]) (out[g] ??= {})[k] = b[k];
    }
  }
  return out as TuningOverrides;
}

export const TUNING_EXPORT_FORMAT = 'theabonk-tuning';
export const TUNING_EXPORT_VERSION = 1;

export interface TuningExport {
  format: typeof TUNING_EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  values: TuningOverrides;
}

/** XP needed to go from `level` to `level + 1`. */
export function xpToNextWith(level: number, x: Tuning['xp']): number {
  if (level <= 1) return x.first;
  if (level < 20) return x.earlyBase + (level - 1) * x.earlyStep;
  if (level < 40) return x.midBase + (level - 20) * x.midStep;
  return x.lateBase + (level - 40) * x.lateStep;
}

export function enemyHpScaleWith(minutes: number, c: Tuning['combat']): number {
  return 1 + minutes * c.hpPerMinute + minutes * minutes * c.hpPerMinute2;
}

export function enemyDamageScaleWith(minutes: number, c: Tuning['combat']): number {
  return 1 + minutes * c.damagePerMinute;
}

/** Every enemy id must have a per-type multiplier (checked by tests). */
export const ENEMY_IDS: readonly string[] = ENEMIES.map((e) => e.id);
