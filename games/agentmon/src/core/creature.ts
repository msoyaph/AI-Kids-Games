/**
 * Creature rules outside battle: stats from level, experience and levels, learning moves, growing
 * into the next stage, and making new creatures (wild, Keeper, or a new friend).
 */
import { TUNING } from '../tuning';
import { Rng } from './rng';
import { PERSONALITIES, type BaseStats, type Creature, type Dex, type PersonalityId, type Species } from './types';

export type StatBlock = BaseStats;

/** Which stat each personality lifts a little. */
export const PERSONALITY_STAT: Record<PersonalityId, keyof BaseStats> = {
  cheerful: 'energy', brave: 'power', calm: 'guard', curious: 'speed',
  shy: 'guard', playful: 'speed', sleepy: 'energy', proud: 'power',
};

export function statsFor(species: Species, level: number, personality: PersonalityId): StatBlock {
  const { statScale, statFlat, energyFlat, personalityLift } = TUNING.stats;
  const calc = (base: number) => Math.floor((base * statScale * level) / 50) + statFlat;
  const out: StatBlock = {
    energy: Math.floor((species.base.energy * statScale * level) / 50) + level + energyFlat,
    power: calc(species.base.power),
    guard: calc(species.base.guard),
    speed: calc(species.base.speed),
  };
  const lifted = PERSONALITY_STAT[personality];
  out[lifted] = Math.floor(out[lifted] * (1 + personalityLift));
  return out;
}

export function stats(dex: Dex, c: Creature): StatBlock {
  return statsFor(speciesOf(dex, c), c.level, c.personality);
}

export function speciesOf(dex: Dex, c: Creature | string): Species {
  const id = typeof c === 'string' ? c : c.species;
  const s = dex.species[id];
  if (!s) throw new Error(`unknown species ${id}`);
  return s;
}

export const maxEnergy = (dex: Dex, c: Creature) => stats(dex, c).energy;

/** Total experience needed to reach `level`. */
export function xpForLevel(level: number): number {
  return level <= 1 ? 0 : Math.round(TUNING.xp.levelCurve * level ** 3);
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (level < TUNING.stats.maxLevel && xp >= xpForLevel(level + 1)) level++;
  return level;
}

export const isFree = (dex: Dex, move: string) => (dex.moves[move]?.cost ?? 1) <= 0;

/**
 * The moves a species knows at a level: the last four it would have learned, always keeping one
 * free move (every Agentmon can always do something, however tired).
 */
export function movesAtLevel(dex: Dex, species: Species, level: number): string[] {
  const learned = [...new Set(species.learnset.filter(([at]) => at <= level).map(([, id]) => id))];
  const four = learned.slice(-4);
  if (!four.some(m => isFree(dex, m))) {
    const free = [...learned].reverse().find(m => isFree(dex, m));
    if (free) four[0] = free;
  }
  return four;
}

/**
 * A sensible set of four for wild and Keeper Agentmon (and the suggested swap in the game's
 * "learn a new move" screen): a free move, the strongest move of its own element, the best move
 * of another element, and one helper (status, boost, shield or comfort) or another bump.
 */
export function bestMoveset(dex: Dex, species: Species, level: number): string[] {
  const known = [...new Set(species.learnset.filter(([at]) => at <= level).map(([, id]) => id))].map(id => dex.moves[id]!).filter(Boolean);
  const pick: string[] = [];
  const take = (m: { id: string } | undefined) => { if (m && !pick.includes(m.id) && pick.length < 4) pick.push(m.id); };
  const attackScore = (m: (typeof known)[number]) => m.power * (m.element === species.element ? 1.2 : 1) * (1 - m.cost * 1.5) + (m.priority ? 5 : 0);
  const attacks = known.filter(m => m.power > 0 && m.cost > 0).sort((a, b) => attackScore(b) - attackScore(a));
  const free = known.filter(m => m.power > 0 && m.cost <= 0).sort((a, b) => attackScore(b) - attackScore(a));
  take(free[0]);
  take(attacks.find(m => m.element === species.element));
  take(attacks.find(m => m.element !== species.element));
  const helpers = known.filter(m => m.power === 0).sort((a, b) => b.cost - a.cost || b.n - a.n);
  take(helpers.find(m => m.effects?.some(e => e.type === 'status' || e.type === 'boost')) ?? helpers[0]);
  for (const m of attacks) take(m);
  for (const m of known) take(m);
  return pick;
}

export interface NewCreature {
  species: string;
  level: number;
  personality?: PersonalityId;
  shimmer?: boolean;
  uid?: number;
  nick?: number;
  met?: number;
}

export function makeCreature(dex: Dex, opts: NewCreature, rng: Rng): Creature {
  const species = speciesOf(dex, opts.species);
  const level = Math.max(1, Math.min(TUNING.stats.maxLevel, Math.round(opts.level)));
  const personality = opts.personality ?? rng.pick(PERSONALITIES);
  const c: Creature = {
    uid: opts.uid ?? 0,
    species: species.id,
    nick: opts.nick ?? -1,
    level,
    xp: xpForLevel(level),
    energy: 0,
    moves: bestMoveset(dex, species, level),
    personality,
    shimmer: opts.shimmer ?? false,
    friendship: 0,
    met: opts.met ?? 0,
  };
  c.energy = statsFor(species, level, personality).energy;
  return c;
}

export interface LevelUpReport {
  from: number;
  to: number;
  /** Moves this creature could learn on the way (new ones, in order). */
  newMoves: string[];
  /** Ready to grow into this species (the player is asked). */
  canGrow?: string;
}

/**
 * Add experience. Levels rise, energy rises with max energy, new moves fill empty slots
 * automatically; moves that would need a swap are reported in `newMoves` for the player to choose.
 */
export function gainXp(dex: Dex, c: Creature, amount: number): LevelUpReport {
  const species = speciesOf(dex, c);
  const before = c.level;
  const maxBefore = maxEnergy(dex, c);
  c.xp = Math.min(xpForLevel(TUNING.stats.maxLevel), c.xp + Math.max(0, Math.floor(amount)));
  c.level = levelForXp(c.xp);
  const newMoves: string[] = [];
  if (c.level > before) {
    c.holdGrowth = false;
    for (const [at, id] of species.learnset) {
      if (at > before && at <= c.level && !c.moves.includes(id)) {
        if (c.moves.length < 4) c.moves.push(id);
        else newMoves.push(id);
      }
    }
    if (c.energy > 0) c.energy += maxEnergy(dex, c) - maxBefore;
  }
  const report: LevelUpReport = { from: before, to: c.level, newMoves };
  const grow = growthTarget(dex, c);
  if (grow && c.level > before) report.canGrow = grow;
  return report;
}

/** The species this creature can grow into now, if any (and not held back this level). */
export function growthTarget(dex: Dex, c: Creature): string | undefined {
  const g = speciesOf(dex, c).grows;
  if (!g || c.level < g.level || c.holdGrowth) return undefined;
  return g.to;
}

/** Grow into the next stage: keeps level, experience, moves, nickname and friendship. */
export function grow(dex: Dex, c: Creature): string[] {
  const to = growthTarget(dex, c);
  if (!to) return [];
  const ratio = c.energy / Math.max(1, maxEnergy(dex, c));
  c.species = to;
  c.energy = Math.max(c.energy > 0 ? 1 : 0, Math.round(maxEnergy(dex, c) * ratio));
  // A move the new stage learns at its current level or below that it doesn't know yet.
  const species = speciesOf(dex, c);
  const fresh = species.learnset.filter(([at, id]) => at <= c.level && !c.moves.includes(id)).map(([, id]) => id);
  const learned: string[] = [];
  for (const id of fresh.slice(-1)) {
    if (c.moves.length < 4) { c.moves.push(id); learned.push(id); }
  }
  return learned;
}

/** Can `slot` be swapped for `move`? Never swap away the last free move. */
export function canSwap(dex: Dex, c: Creature, move: string, slot: number): boolean {
  if (c.moves.includes(move) || slot < 0 || slot >= 4) return false;
  const after = c.moves.map((m, i) => (i === slot ? move : m));
  return after.some(m => isFree(dex, m));
}

/** Replace move `slot` with `move` (the player picked which to swap). Returns false if not allowed. */
export function learnMove(dex: Dex, c: Creature, move: string, slot: number): boolean {
  if (!canSwap(dex, c, move, slot)) return false;
  c.moves[slot] = move;
  return true;
}

export const heal = (dex: Dex, c: Creature) => { c.energy = maxEnergy(dex, c); };
