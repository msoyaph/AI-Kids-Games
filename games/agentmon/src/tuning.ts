/**
 * Every balance number in one place. The balance simulation (tests/sim/balance.test.ts), the
 * level-curve check and the pacing model read these, so retuning means editing only this file.
 */
import type { Difficulty, StatusId, TraitId } from './core/types';

export const TUNING = {
  elements: {
    /** Strong-against hits. */
    strong: 1.5,
    /** Hits into an element that is strong against the move's element. */
    weak: 0.67,
    /** Same-element bonus: an Agentmon using a move of its own element. */
    sameElement: 1.2,
  },

  stats: {
    maxLevel: 50,
    /** stat = floor(base * statScale * level / 50) + statFlat (energy adds level + energyFlat). */
    statScale: 2,
    statFlat: 5,
    energyFlat: 10,
    /** Personalities give one stat a small lift (never a drop: every friend is good). */
    personalityLift: 0.08,
  },

  damage: {
    /** Divisor in the bump formula: lower = harder hits. */
    divisor: 22,
    flat: 2,
    /** Seeded spread so bumps aren't all identical. */
    spreadMin: 0.85,
    spreadMax: 1.15,
    /** Boost stages −2…+2 → multiplier. */
    boost: { [-2]: 0.6, [-1]: 0.8, 0: 1, 1: 1.25, 2: 1.5 } as Record<number, number>,
    /** Every bump drains at least this much (so tiny Agentmon still make progress). */
    minimum: 1,
  },

  energy: {
    /** Rest restores this share of max energy and uses the turn. */
    rest: 0.25,
    /** A move needs this much energy left over after its cost (never self-tucker). */
    keepAfterCost: 1,
    /** After a battle, awake friends catch their breath: this share of max energy. */
    afterBattle: 0.05,
  },

  status: {
    /** Turns each status lasts: Sleepy counts skipped turns; the others count down at each turn's end. */
    turns: { sleepy: 2, dizzy: 3, soaked: 3, toasty: 3, chilly: 3 } as Record<StatusId, number>,
    /** Dizzy: chance each turn to wobble and lose the action (never self-damage). */
    dizzyWobble: 0.33,
    /** Soaked: speed multiplier, and extra taken from Volt moves. */
    soakedSpeed: 0.75,
    soakedVoltTaken: 1.25,
    /** Toasty: share of max energy lost at the end of each turn. */
    toastyDrain: 0.05,
    /** Chilly: move costs multiplied. */
    chillyCost: 1.5,
  },

  traits: {
    cozyRest: 0.1,
    thriftyCost: 0.8,
    sturdyStrongTaken: 0.85,
    speedySpeed: 1.1,
    braveBelow: 0.33,
    bravePower: 1.2,
    friendlyArc: 1.2,
    friendlyXp: 1.1,
    guardianLight: 0.5,
  } satisfies Record<string, number>,

  xp: {
    /** Total experience needed to reach a level: round(levelCurve * level³). */
    levelCurve: 0.62,
    /** Yield multiplier for Keeper and trainer battles. */
    trainerBonus: 1.5,
    /** Shared experience (setting on): team members who didn't spar get this share. */
    benchShare: 0.75,
    /** Catch-up: Agentmon below the team's average level get this much more. */
    catchUp: 0.5,
    /** Friendship gained after each battle together. */
    friendshipPerBattle: 2,
  },

  befriend: {
    /** Befriend appears when the wild one's energy is at or below this share. */
    threshold: 0.4,
    /** Spark Ring: the glowing arc in degrees before modifiers, and its limits. */
    arcBase: 46,
    arcMin: 22,
    arcMax: 150,
    /** Tiredness: arc × (tiredBase + tiredness), tiredness = 1 − energy share. */
    tiredBase: 0.55,
    favoriteSnack: 1.6,
    otherSnack: 1.15,
    /** Spark speed in turns per second; a favorite snack slows it. */
    sparkSpeed: 0.5,
    snackSlow: 0.85,
    sparks: 3,
    /** Hits needed to fill the heart; near misses (inside 1.6× the arc) count half. */
    need: 2,
    nearFactor: 1.6,
    /** Mood: the arc for happy / calm / grumpy wild Agentmon. */
    mood: { happy: 1.2, calm: 1, grumpy: 0.85 } as Record<'happy' | 'calm' | 'grumpy', number>,
    /** Interest: how many missed tries before a wild one wanders off. */
    interest: 3,
  },

  difficulty: {
    easy: { wildLevel: -2, keeperLevel: -3, keeperExtra: 0, ai: 'easy', arc: 1.3, spark: 0.85 },
    normal: { wildLevel: 0, keeperLevel: 0, keeperExtra: 0, ai: 'normal', arc: 1, spark: 1 },
    hard: { wildLevel: 2, keeperLevel: 3, keeperExtra: 1, ai: 'hard', arc: 0.85, spark: 1.15 },
  } satisfies Record<Difficulty, { wildLevel: number; keeperLevel: number; keeperExtra: number; ai: Difficulty; arc: number; spark: number }>,

  ai: {
    /** Easy: chance to pick any sensible option instead of the best. */
    easyRandom: 0.45,
    /** Normal: options within this share of the best score are picked among at random. */
    normalTie: 0.06,
    /** How much the AI dislikes spending energy (score per share of max energy spent). */
    costWeight: 0.6,
    /** Rest is attractive below this energy share. */
    restBelow: 0.35,
    /** Hard: switch out when the foe is strong against us and a teammate resists it. */
    hardSwitch: true,
  },

  economy: {
    /** Coins after a wild spar (× foe level) and a trainer spar (× level × team size). */
    wildCoins: 3,
    trainerCoins: 8,
  },

  /** The species traits that make one status impossible. */
  statusProof: { calm: 'dizzy', warm: 'chilly', waterproof: 'soaked', fireproof: 'toasty', wakeful: 'sleepy' } as Partial<Record<TraitId, StatusId>>,
} as const;

export type Tuning = typeof TUNING;
