/**
 * Befriending: the friendship mini-games' rules. No hidden dice: what you see decides it.
 *
 * Spark Ring: a spark sweeps around a heart ring; tap while it crosses the glowing arc. Each hit
 * fills a third of the heart (near misses fill half as much). Fill the heart enough and the wild
 * Agentmon joins you. The arc is bigger and the spark slower when the Agentmon is tired, when you
 * offer a snack (its favorite helps most), when its mood is good, and on Easy.
 *
 * Mood Match (no timing, an accessibility choice): the Agentmon shows a mood; pick the kind thing
 * that fits it. A right pick fills a full part of the heart; a "nice try" pick fills half.
 */
import { TUNING } from '../tuning';
import { maxEnergy, speciesOf } from './creature';
import { hash32, Rng } from './rng';
import type { Creature, Dex, Difficulty, PersonalityId, SnackId } from './types';
import type { Mood } from './battle/engine';

export interface SparkSetup {
  /** Glowing arc size in degrees, centred on `arcAt` (degrees clockwise from the top). */
  arc: number;
  arcAt: number[];
  /** Spark speed in turns per second. */
  speed: number;
  sparks: number;
  need: number;
}

export interface BefriendContext {
  foe: Creature;
  mood: Mood;
  snack?: SnackId;
  difficulty: Difficulty;
  /** Seed for where the arcs sit (one per spark). */
  seed: number;
  guardian?: boolean;
}

/** Tiredness 0 (full energy) – 1 (nearly tuckered out). */
export function tiredness(dex: Dex, foe: Creature): number {
  return Math.max(0, Math.min(1, 1 - foe.energy / Math.max(1, maxEnergy(dex, foe))));
}

export function arcSize(dex: Dex, ctx: BefriendContext): number {
  const t = TUNING.befriend;
  const species = speciesOf(dex, ctx.foe);
  let arc = t.arcBase * species.friendliness * (t.tiredBase + tiredness(dex, ctx.foe));
  if (ctx.snack) arc *= ctx.snack === species.favoriteSnack ? t.favoriteSnack : t.otherSnack;
  arc *= t.mood[ctx.mood];
  arc *= TUNING.difficulty[ctx.difficulty].arc;
  if (species.trait === 'friendly') arc *= TUNING.traits.friendlyArc;
  if (ctx.guardian) arc = Math.max(arc, 90);
  return Math.max(t.arcMin, Math.min(t.arcMax, arc));
}

export function sparkSetup(dex: Dex, ctx: BefriendContext): SparkSetup {
  const t = TUNING.befriend;
  const species = speciesOf(dex, ctx.foe);
  const rng = new Rng(hash32(ctx.seed, species.num));
  let speed = t.sparkSpeed * TUNING.difficulty[ctx.difficulty].spark;
  if (ctx.snack === species.favoriteSnack) speed *= t.snackSlow;
  return {
    arc: arcSize(dex, ctx),
    arcAt: Array.from({ length: t.sparks }, () => Math.round(rng.float(40, 320))),
    speed,
    sparks: t.sparks,
    need: t.need,
  };
}

/** Smallest angle between two directions, in degrees. */
export function angleGap(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 540) % 360 - 180);
  return d;
}

/** How much one tap fills the heart: 1 inside the arc, 0.5 for a near miss, 0 otherwise. */
export function tapFill(setup: SparkSetup, spark: number, angle: number): number {
  const centre = setup.arcAt[spark] ?? 0;
  const gap = angleGap(angle, centre);
  if (gap <= setup.arc / 2) return 1;
  if (gap <= (setup.arc * TUNING.befriend.nearFactor) / 2) return 0.5;
  return 0;
}

/** Where the spark is after `seconds`, starting at the top. */
export const sparkAngle = (setup: SparkSetup, seconds: number) => (seconds * setup.speed * 360) % 360;

/** Fill from a set of taps (one per spark; a spark that passes with no tap fills 0). */
export function sparkFill(setup: SparkSetup, taps: (number | null)[]): number {
  return taps.slice(0, setup.sparks).reduce<number>((sum, angle, i) => sum + (angle === null ? 0 : tapFill(setup, i, angle)), 0);
}

/** Chance a tap at a uniformly random moment lands inside the arc (for tests and the balance notes). */
export const blindHitChance = (setup: SparkSetup) => setup.arc / 360;

// ---- Mood Match -------------------------------------------------------------------------

export type MoodFace = 'playful' | 'sleepy' | 'hungry' | 'shy';
export type KindAction = 'play' | 'pet' | 'snack' | 'hum';
export const MOOD_FACES: readonly MoodFace[] = ['playful', 'sleepy', 'hungry', 'shy'];
export const KIND_ACTIONS: readonly KindAction[] = ['play', 'pet', 'snack', 'hum'];
export const MOOD_EMOJI: Record<MoodFace, string> = { playful: '😄', sleepy: '😴', hungry: '😋', shy: '🙈' };

/** The kind thing that fits each mood, and the one that's a "nice try". */
export const MOOD_FIT: Record<MoodFace, { best: KindAction; okay: KindAction }> = {
  playful: { best: 'play', okay: 'hum' },
  sleepy: { best: 'hum', okay: 'pet' },
  hungry: { best: 'snack', okay: 'pet' },
  shy: { best: 'pet', okay: 'hum' },
};

/** Personalities lean towards some moods (so kids can learn a creature's ways). */
const LEAN: Record<PersonalityId, MoodFace> = {
  cheerful: 'playful', brave: 'playful', calm: 'sleepy', curious: 'hungry', shy: 'shy', playful: 'playful', sleepy: 'sleepy', proud: 'shy',
};

/** The three moods shown, in order. Deterministic from the encounter seed. */
export function moodRounds(foe: Creature, seed: number): MoodFace[] {
  const rng = new Rng(hash32(seed, 77));
  return Array.from({ length: TUNING.befriend.sparks }, (_, i) => (i === 0 || rng.chance(0.5) ? LEAN[foe.personality] : rng.pick(MOOD_FACES)));
}

export function moodFill(face: MoodFace, pick: KindAction, snackOffered: boolean): number {
  const fit = MOOD_FIT[face];
  if (pick === fit.best) return pick === 'snack' && !snackOffered ? 0.5 : 1;
  if (pick === fit.okay) return 0.5;
  return 0;
}

export function moodMatchFill(rounds: MoodFace[], picks: KindAction[], snackOffered: boolean): number {
  return rounds.reduce((sum, face, i) => sum + (picks[i] ? moodFill(face, picks[i]!, snackOffered) : 0), 0);
}
