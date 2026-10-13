/**
 * The whole adventure's state in memory: where the player is, the team, the Agent Base, the bag,
 * story flags and quests, the Field Guide. The save codec turns this into a compact JSON save.
 */
import type { Creature, Difficulty } from './types';

export type Dir = 0 | 1 | 2 | 3; // down, left, right, up

/** The player's look, chosen at the start from lists (no free typing anywhere). */
export interface Look {
  skin: number;
  hair: number;
  hairColor: number;
  outfit: number;
}

export interface GameState {
  slot: number;
  createdAt: number;
  playMs: number;
  /** Index into data/names.ts player names. */
  name: number;
  look: Look;
  map: string;
  x: number;
  y: number;
  dir: Dir;
  /** The last Rest Stop: where you wake up after a lost spar. */
  rest: { map: string; x: number; y: number };
  difficulty: Difficulty;
  coins: number;
  team: Creature[];
  base: Creature[];
  nextUid: number;
  bag: Record<string, number>;
  flags: Set<string>;
  vars: Record<string, number>;
  /** Field Guide, by species num: seen, befriended, research stars (0–3), shimmer seen. */
  guide: { seen: Set<number>; friends: Set<number>; stars: Record<number, number>; shimmer: Set<number> };
  /** Quest id → stage (−1 = done). */
  quests: Record<string, number>;
  tutorials: Set<string>;
  tower: { best: number; bestTurns: number };
  stats: { battles: number; wins: number; befriends: number; steps: number; puzzles: number };
  /** World RNG state (encounter spawns, shimmer surprises). */
  rng: number;
  starter: string;
}

export const TEAM_MAX = 6;
export const BASE_MAX = 240;

export interface NewGameOptions {
  slot: number;
  name: number;
  look: Look;
  difficulty: Difficulty;
  seed: number;
  start: { map: string; x: number; y: number };
  now?: number;
}

export function newGameState(o: NewGameOptions): GameState {
  return {
    slot: o.slot,
    createdAt: o.now ?? 0,
    playMs: 0,
    name: o.name,
    look: { ...o.look },
    map: o.start.map,
    x: o.start.x,
    y: o.start.y,
    dir: 0,
    rest: { ...o.start },
    difficulty: o.difficulty,
    coins: 100,
    team: [],
    base: [],
    nextUid: 1,
    bag: {},
    flags: new Set(),
    vars: {},
    guide: { seen: new Set(), friends: new Set(), stars: {}, shimmer: new Set() },
    quests: {},
    tutorials: new Set(),
    tower: { best: 0, bestTurns: 0 },
    stats: { battles: 0, wins: 0, befriends: 0, steps: 0, puzzles: 0 },
    rng: o.seed >>> 0,
    starter: '',
  };
}

/** Add a new friend: to the team if there's room, else to the Agent Base. Returns where it went. */
export function addFriend(s: GameState, c: Creature): 'team' | 'base' | 'full' {
  c.uid = s.nextUid++;
  if (s.team.length < TEAM_MAX) { s.team.push(c); return 'team'; }
  if (s.base.length < BASE_MAX) { s.base.push(c); return 'base'; }
  return 'full';
}

export const bagCount = (s: GameState, item: string) => s.bag[item] ?? 0;

export function addItem(s: GameState, item: string, count = 1): void {
  s.bag[item] = Math.max(0, Math.min(999, bagCount(s, item) + count));
  if (s.bag[item] === 0) delete s.bag[item];
}

export function useItem(s: GameState, item: string): boolean {
  if (bagCount(s, item) <= 0) return false;
  addItem(s, item, -1);
  return true;
}

/**
 * The story flags, plus a few live facts that scripts and maps can ask about by name:
 *   item:<id>:<n>  you carry at least n of that item     friend:<id>  a friend of that species
 *   family:<id>    a friend from that species' family    guide:<n>    n kinds befriended
 *   beacons:<n>    n Beacons relit
 */
export function storyFlags(s: GameState, species: Record<string, { family: string } | undefined>): { has(flag: string): boolean } {
  const friends = () => [...s.team, ...s.base];
  return {
    has(flag: string): boolean {
      if (s.flags.has(flag)) return true;
      const [kind, a = '', b] = flag.split(':');
      switch (kind) {
        case 'item': return (s.bag[a] ?? 0) >= Number(b ?? 1);
        case 'friend': return friends().some(c => c.species === a);
        case 'family': { const f = species[a]?.family; return !!f && friends().some(c => species[c.species]?.family === f); }
        case 'guide': return s.guide.friends.size >= Number(a);
        case 'beacons': return [...s.flags].filter(x => /^beacon-[a-z]+$/.test(x)).length >= Number(a);
        default: return false;
      }
    },
  };
}
