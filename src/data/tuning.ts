/**
 * TUNING — every balance number in the game lives in this one typed file.
 *
 * Identity, visuals and text keys stay in towers.ts / enemies.ts / etc.; those
 * modules read their numbers from here. After changing anything below, run
 *   npm test && npm run sim && npm run sim -- --casual
 * (the balance suites in tests/unit/balance enforce the win/star targets).
 */
import type { Difficulty } from './difficulty';
import type { EnemyId } from './enemies';
import type { ProjectileStyle, TowerId, TowerStats } from './towers';

// ------------------------------------------------------------------ helpers

/** Fields that grow with the damage multiplier as a tower levels up. */
const DAMAGE_LIKE: (keyof TowerStats)[] = ['damage', 'burnDps', 'poisonDps', 'zoneDps'];

/**
 * Build 4 levels from a base stat block. `dmg` multiplies damage-like fields,
 * range grows a little each level, and `tweaks` override anything per level
 * (overrides carry forward to later levels).
 */
export function makeLevels(
  base: Omit<TowerStats, 'cost'>,
  costs: readonly [number, number, number, number],
  dmg: readonly [number, number, number, number],
  tweaks: Partial<TowerStats>[] = [],
  rangeStep = 0.15,
): TowerStats[] {
  const out: TowerStats[] = [];
  let acc: Partial<TowerStats> = {};
  for (let i = 0; i < 4; i++) {
    acc = { ...acc, ...(tweaks[i] ?? {}) };
    const lv: TowerStats = { ...base, ...acc, cost: costs[i]!, range: (acc.range ?? base.range) + rangeStep * i };
    for (const key of DAMAGE_LIKE) {
      const v = (lv[key] as number | undefined) ?? undefined;
      if (v !== undefined && !(key in acc)) (lv[key] as number) = Math.round(v * dmg[i]! * 10) / 10;
    }
    out.push(lv);
  }
  return out;
}

// ------------------------------------------------------------------ types

export interface DifficultyTuning {
  lives: number;
  /** Creature health multiplier (reached by wave `waves.hpRampWaves + 1`). */
  hp: number;
  /** Health multiplier on wave 1; ramps toward `hp` so early waves stay fair. */
  hpEarly: number;
  /** Creature speed multiplier. */
  speed: number;
  /** Multiplier on the map's starting gold. */
  startCoins: number;
  /** Multiplier on gold from creatures. */
  coins: number;
  /** Multiplier on the wait between waves. */
  breather: number;
  /** Interest paid on saved gold at the end of each wave. */
  interest: number;
}

export interface EnemyTuning {
  /** Hit points at wave-1 strength (every creature, bosses too, is scaled by the wave health curve). */
  hp: number;
  /** Tiles per second. */
  speed: number;
  /** Fraction of damage blocked, 0..0.8. */
  armor: number;
  coins: number;
  /** Lives lost if it reaches the castle. */
  lives: number;
  /** Radius in tiles (hit size; also used for splash hits). */
  radius: number;
  heal?: { radius: number; pct: number; interval: number };
  split?: { into: EnemyId; count: number };
  /** Multiplier on stun duration and pushback (bosses resist). */
  ccResist?: number;
  /** Changes element every N seconds. */
  shiftElement?: number;
}

// ------------------------------------------------------------------ tower stats

const BASIC_COST = [20, 25, 45, 80] as const;
const ELEMENT_COST = [60, 70, 120, 200] as const;
const COMBO_COST = [150, 160, 260, 420] as const;
const BASIC_DMG = [1, 2, 3.7, 6.5] as const;
const ELEMENT_DMG = [1, 2, 3.8, 7] as const;
const COMBO_DMG = [1, 1.9, 3.5, 6.2] as const;

const TOWER_LEVELS: Record<TowerId, TowerStats[]> = {
  // basic
  arrow: makeLevels({ damage: 8, range: 3.2, rate: 1.5 }, BASIC_COST, BASIC_DMG, [{}, {}, { rate: 1.7 }, { rate: 1.9 }]),
  cannon: makeLevels({ damage: 16, range: 2.8, rate: 0.8, splash: 0.9 }, [35, 40, 70, 120], BASIC_DMG, [{}, {}, { splash: 1.05 }, { splash: 1.2 }]),

  // element
  flame: makeLevels(
    { damage: 20, range: 3.0, rate: 0.9, splash: 1.0, burnDps: 6, burnTime: 2 },
    ELEMENT_COST,
    ELEMENT_DMG,
    [{}, {}, { splash: 1.15 }, { splash: 1.3 }],
  ),
  bubble: makeLevels(
    { damage: 14, range: 3.0, rate: 1.2, slow: 0.35, slowTime: 2 },
    ELEMENT_COST,
    ELEMENT_DMG,
    [{}, { slow: 0.4 }, { slow: 0.45, splash: 0.6 }, { slow: 0.5, splash: 0.8 }],
  ),
  thorn: makeLevels(
    { damage: 8, range: 3.2, rate: 1.1, poisonDps: 10, poisonTime: 4, poisonStacks: 3 },
    ELEMENT_COST,
    ELEMENT_DMG,
    [{}, {}, { poisonStacks: 4 }, { poisonStacks: 5 }],
  ),
  prism: makeLevels({ damage: 16, range: 3.4, rate: 1.0, chain: 2, chainFalloff: 0.8 }, ELEMENT_COST, ELEMENT_DMG, [{}, { chain: 3 }, { chain: 3 }, { chain: 4 }]),
  shade: makeLevels(
    { damage: 30, range: 3.6, rate: 0.7, armorBreak: 0.2, armorBreakTime: 3, critChance: 0.2, critMult: 2 },
    ELEMENT_COST,
    ELEMENT_DMG,
    [{}, {}, { armorBreak: 0.25 }, { armorBreak: 0.3, critChance: 0.25 }],
  ),
  rumble: makeLevels(
    { damage: 20, range: 1.8, rate: 0.6, stunChance: 0.2, stunTime: 0.6 },
    ELEMENT_COST,
    ELEMENT_DMG,
    [{}, {}, { stunChance: 0.25 }, { stunChance: 0.3, stunTime: 0.8 }],
    0.1,
  ),

  // combos
  steam: makeLevels(
    { damage: 18, range: 3.2, rate: 0.6, splash: 1.0, zoneDps: 16, zoneTime: 3, zoneRadius: 1.2, zoneSlow: 0.4 },
    COMBO_COST,
    COMBO_DMG,
    [{}, {}, { zoneSlow: 0.45, zoneRadius: 1.35 }, { zoneSlow: 0.5, zoneRadius: 1.5 }],
  ),
  wildfire: makeLevels(
    { damage: 26, range: 3.2, rate: 0.9, splash: 1.2, burnDps: 12, burnTime: 3, poisonDps: 10, poisonTime: 4, poisonStacks: 3 },
    COMBO_COST,
    COMBO_DMG,
  ),
  solar: makeLevels({ damage: 90, range: 4.2, rate: 0.35, splash: 1.8, burnDps: 10, burnTime: 2 }, COMBO_COST, COMBO_DMG),
  wisp: makeLevels(
    { damage: 24, range: 3.4, rate: 1.1, shots: 2, burnDps: 8, burnTime: 2, armorBreak: 0.15, armorBreakTime: 3 },
    COMBO_COST,
    COMBO_DMG,
    [{}, {}, { shots: 3 }, { shots: 3 }],
  ),
  magma: makeLevels({ damage: 48, range: 4.6, rate: 0.45, splash: 1.3, zoneDps: 20, zoneTime: 3, zoneRadius: 1.0 }, COMBO_COST, COMBO_DMG),
  raingarden: makeLevels(
    { damage: 12, range: 3.0, rate: 1.2, slow: 0.2, slowTime: 1.5, auraRadius: 2.2, auraRate: 0.2 },
    COMBO_COST,
    COMBO_DMG,
    [{}, { auraRate: 0.25 }, { auraRate: 0.3 }, { auraRate: 0.35, auraRadius: 2.5 }],
  ),
  rainbow: makeLevels(
    { damage: 22, range: 3.6, rate: 1.0, chain: 5, chainFalloff: 0.9, slow: 0.15, slowTime: 1 },
    COMBO_COST,
    COMBO_DMG,
    [{}, {}, { chain: 6 }, { chain: 7 }],
  ),
  whirlpool: makeLevels(
    { damage: 18, range: 2.0, rate: 0.5, pushback: 0.6, slow: 0.5, slowTime: 1.5 },
    COMBO_COST,
    COMBO_DMG,
    [{}, {}, { pushback: 0.75 }, { pushback: 0.9 }],
    0.1,
  ),
  quicksand: makeLevels(
    { damage: 14, range: 2.2, rate: 0.8, slow: 0.55, slowTime: 2, stunChance: 0.1, stunTime: 0.8 },
    COMBO_COST,
    COMBO_DMG,
    [{}, {}, { slow: 0.6 }, { slow: 0.65, stunChance: 0.15 }],
    0.1,
  ),
  sunflower: makeLevels(
    { damage: 22, range: 3.2, rate: 1.2, auraRadius: 2.6, auraCoins: 0.5 },
    COMBO_COST,
    COMBO_DMG,
    [{}, {}, { auraCoins: 0.6 }, { auraCoins: 0.75 }],
  ),
  nightshade: makeLevels(
    { damage: 14, range: 3.4, rate: 0.9, poisonDps: 28, poisonTime: 5, poisonStacks: 4, poisonSpread: 2 },
    COMBO_COST,
    COMBO_DMG,
    [{}, {}, { poisonSpread: 3 }, { poisonSpread: 3, poisonStacks: 5 }],
  ),
  ironbark: makeLevels(
    { damage: 68, range: 3.2, rate: 0.6, armorBreak: 0.3, armorBreakTime: 5, stunChance: 0.15, stunTime: 0.8 },
    COMBO_COST,
    COMBO_DMG,
  ),
  eclipse: makeLevels(
    { damage: 34, range: 3.8, rate: 1, beamRamp: 3, beamRampTime: 3 },
    COMBO_COST,
    COMBO_DMG,
    [{}, {}, { beamRamp: 3.5 }, { beamRamp: 4 }],
  ),
  crystal: makeLevels(
    { damage: 30, range: 3.8, rate: 1.0, shots: 3, critChance: 0.25, critMult: 2.5 },
    COMBO_COST,
    COMBO_DMG,
    [{}, {}, { shots: 4 }, { shots: 4, critChance: 0.3 }],
  ),
  gravity: makeLevels(
    { damage: 34, range: 2.0, rate: 0.33, stunChance: 1, stunTime: 0.9, slow: 0.3, slowTime: 2 },
    COMBO_COST,
    COMBO_DMG,
    [{}, {}, { stunTime: 1.0 }, { stunTime: 1.2 }],
    0.12,
  ),
};

// ------------------------------------------------------------------ enemy stats

const ENEMY_STATS: Record<EnemyId, EnemyTuning> = {
  gloop: { hp: 32, speed: 1.6, armor: 0, coins: 4, lives: 1, radius: 0.3 },
  minigloop: { hp: 14, speed: 1.9, armor: 0, coins: 1, lives: 1, radius: 0.2 },
  zoomkin: { hp: 20, speed: 2.9, armor: 0, coins: 3, lives: 1, radius: 0.26 },
  clankbot: { hp: 46, speed: 1.15, armor: 0.4, coins: 6, lives: 1, radius: 0.32 },
  puffbat: { hp: 24, speed: 1.85, armor: 0, coins: 4, lives: 1, radius: 0.28 },
  mendy: { hp: 40, speed: 1.3, armor: 0.1, coins: 7, lives: 1, radius: 0.3, heal: { radius: 2, pct: 0.06, interval: 1.6 } },
  splitblob: { hp: 52, speed: 1.35, armor: 0, coins: 5, lives: 2, radius: 0.36, split: { into: 'minigloop', count: 3 } },
  bubbleimp: { hp: 42, speed: 1.55, armor: 0, coins: 6, lives: 1, radius: 0.3 },
  // bosses
  kinggloop: { hp: 620, speed: 0.85, armor: 0.1, coins: 80, lives: 3, radius: 0.62, split: { into: 'gloop', count: 5 }, ccResist: 0.35 },
  bigclank: { hp: 520, speed: 0.75, armor: 0.5, coins: 150, lives: 4, radius: 0.6, ccResist: 0.3 },
  mamapuff: { hp: 430, speed: 0.95, armor: 0.15, coins: 180, lives: 4, radius: 0.62, split: { into: 'puffbat', count: 5 }, ccResist: 0.3 },
  grumbleking: {
    hp: 600,
    speed: 0.7,
    armor: 0.3,
    coins: 400,
    lives: 6,
    radius: 0.68,
    shiftElement: 6,
    heal: { radius: 2.4, pct: 0.03, interval: 2 },
    ccResist: 0.25,
  },
};

// ------------------------------------------------------------------ the table

export const TUNING = {
  economy: {
    /** Starting gold when a map doesn't set its own. */
    startCoins: 160,
    /** Element cores at the start of a run. */
    startCrystals: 1,
    /** Element cores are awarded after clearing these waves. */
    crystalWaves: [5, 10, 15, 20, 25] as readonly number[],
    sellRefund: 0.75,
    /** Early-call bonus = ceil(secondsLeft × perSecond × (1 + wave × perWave)). */
    earlyBonus: { perSecond: 0.6, perWave: 0.04 },
    /** Wave-clear bonus = base + wave × perWave. */
    waveClear: { base: 8, perWave: 2 },
    /** Interest is capped at base + wave × perWave. */
    interestCap: { base: 10, perWave: 2 },
    /** Seconds between waves (after the last spawn) = base × difficulty.breather (+ boss). */
    breather: { base: 11, boss: 6 },
  },

  combat: {
    /** Element wheel multipliers. */
    strongMult: 1.6,
    weakMult: 0.6,
    /** Damage taken through an elemental ward by the wrong element. */
    wardMult: 0.25,
    /** Splash damage to targets other than the one aimed at. */
    splashFalloff: 0.7,
    /** Bosses feel only this much of a slow. */
    bossSlowMult: 0.6,
    /** Seconds of stun immunity after a stun ends. */
    stunImmunity: { normal: 1.0, boss: 2.5 },
    /** Default effect values when a tower doesn't set them. */
    defaults: { slowTime: 1.5, burnTime: 2, poisonTime: 3, armorBreakTime: 3, stunTime: 0.6, critMult: 2, chainFalloff: 0.8, beamRamp: 2, beamRampTime: 3, zoneTime: 3, zoneRadius: 1 },
    /** Chain lightning looks for its next target this far away (tiles). */
    chainRadius: 2.4,
    /** Poison spread on defeat. */
    poisonSpread: { radius: 1.6, time: 3 },
    /** Lingering fields tick this often (seconds). */
    zoneTick: 0.25,
    /** Mortar shells: flight time (s) and how far ahead they aim (× target speed). */
    mortar: { flight: 0.9, lead: 0.5 },
    /** A shifting boss heals itself by this share of what it heals others. */
    shiftSelfHeal: 0.25,
    /** Children of a split pause this long before walking. */
    splitPause: 0.35,
    /** First shot delay after building (s). */
    buildCooldown: 0.2,
  },

  /** Projectile travel speed, tiles per second. */
  projectileSpeed: {
    arrow: 13,
    cannonball: 8.5,
    fireball: 8,
    bubble: 7.5,
    thorn: 11,
    shadowOrb: 8,
    steamPuff: 6.5,
    seed: 8,
    wisp: 7.5,
    lava: 0,
    drop: 10,
    sunSeed: 10,
    shard: 13,
    poisonOrb: 8,
    bark: 10,
    flare: 6,
  } satisfies Record<ProjectileStyle, number>,

  waves: {
    /** Campaign map length unless the map overrides it. */
    length: 40,
    /** Health curve: 1 + linear×k + quad×k² (k = wave − 1); endless grows by `endlessGrowth` per wave after `endlessAfter`. */
    hp: { linear: 0.12, quad: 0.0125, endlessGrowth: 1.035, endlessAfter: 40 },
    /** Gold per creature grows by this much per wave. */
    coinsPerWave: 0.09,
    /** Creatures per wave ≈ base + wave × perWave (each wave type scales this). */
    count: { base: 8, perWave: 0.45 },
    /** Seconds between spawns: max(min, base − wave × perWave). */
    gap: { base: 0.95, perWave: 0.012, min: 0.38 },
    /** Chance a creature carries an element: min(max, base + cycle × perCycle). */
    elementChance: { base: 0.3, perCycle: 0.2, max: 0.9 },
    /** Chance an elemental creature uses one of the map's favoured elements. */
    favoredChance: 0.6,
    /** Difficulty health ramps from hpEarly to hp over this many waves. */
    hpRampWaves: 19,
  },

  difficulties: {
    easy: { lives: 30, hp: 0.6, hpEarly: 0.6, speed: 0.9, startCoins: 1.5, coins: 1.2, breather: 1.5, interest: 0.05 },
    normal: { lives: 20, hp: 1, hpEarly: 1, speed: 1, startCoins: 1, coins: 1, breather: 1, interest: 0.04 },
    hard: { lives: 10, hp: 1.3, hpEarly: 1.05, speed: 1.0, startCoins: 1, coins: 0.95, breather: 0.85, interest: 0.03 },
  } satisfies Record<Difficulty, DifficultyTuning>,

  /** Stars from the share of lives kept. */
  stars: { three: 0.8, two: 0.4 },

  towers: TOWER_LEVELS,
  enemies: ENEMY_STATS,
} as const;
