// The rules' data shapes. Pure TypeScript: no DOM, no three.js (tests/unit/purity.test.ts).
import type { WorldId } from '../data/roster';

export type PlantId = string;
export type CritterId = string;
export type Special = 'sprinkler' | 'water' | 'hot' | 'gap' | 'updraft' | 'lantern';

/** One spawn in a wave: a critter in a lane (-1: the rules pick one), `delay` s after the wave starts. */
export interface Spawn { critter: CritterId; lane: number; delay: number }
export interface WaveSpec { spawns: Spawn[]; /** A big wave, marked with a picnic flag. */ flag?: boolean }

/** A level as the rules see it (made by data/levels.ts, data/challenges.ts and the Daily). */
export interface LevelSpec {
  id: string;
  name: string;
  world: WorldId;
  startCompost: number;
  /** How many cards the player may take in. */
  seedSlots: number;
  waves: WaveSpec[];
  /** Special tiles, keyed "lane,col". */
  specials?: Record<string, Special>;
  dusk?: boolean;
  /** Worms surface (true unless a challenge turns them off). */
  worms?: boolean;
  umbrellas?: boolean;
  /** Plants already in the garden, and whether new planting is allowed. */
  prePlanted?: { plant: PlantId; lane: number; col: number }[];
  noPlanting?: boolean;
  /** The cards are fixed (no choosing). */
  fixedSeeds?: PlantId[];
  /** The snack cart: only the lane the cart is in can lose a snack; it moves every `cartEvery` s. */
  cartEvery?: number;
  /** Pinecone Curling: no plants; cards slide pinecones down a lane. */
  curling?: boolean;
  /** Garden Party: endless, waves made on the fly. */
  endless?: boolean;
  /** Critter speed multiplier (a challenge twist). */
  speed?: number;
}

export interface Plant {
  id: number;
  kind: PlantId;
  lane: number;
  col: number;
  health: number;
  max: number;
  /** Seconds until it acts again. */
  wait: number;
  bornAt: number;
  /** Last time it acted (fired, made compost, chimed): for the renderer's animations. */
  actedAt: number;
}

export type Mood = 'walk' | 'nibble' | 'shooed' | 'flee' | 'under' | 'hop';

export interface Critter {
  id: number;
  kind: CritterId;
  boss: boolean;
  lane: number;
  /** Where it is along the lane (tiles; 0 is the left edge of the first column). */
  x: number;
  /** Changing lanes: where it's heading (lure, burrow) and the fraction of the way there. */
  toLane: number;
  laneT: number;
  patience: number;
  max: number;
  armour: number;
  shield: number;
  /** Slow factor and until when; held (tangled, lantern, yawning) until when. */
  slow: number;
  slowUntil: number;
  heldUntil: number;
  hopsLeft: number;
  nextHop: number;
  /** A hop in the air: from x, to x, start time. */
  hopFrom: number;
  hopTo: number;
  hopAt: number;
  /** Diggers: underground until popping up at digTo. */
  under: boolean;
  /** Borrowing magpie: the plant it carries. */
  carrying: PlantId | null;
  /** Where (x) a borrowing magpie lets its plant go. */
  dropAt: number;
  mood: Mood;
  moodAt: number;
  /** Next boss trick. */
  nextTrick: number;
  /** Running home with a snack (it leaves the board, nothing else happens). */
  withSnack: boolean;
  /** Swarm members share the first member's id; a swarm takes one snack together. */
  group: number;
  /** A Nasturtium has already called it over (it won't be called twice). */
  lured: boolean;
  /** Waited at a lantern already (moths wait once). */
  waited: boolean;
  /** Boss charge: faster until this time. */
  rushUntil: number;
}

export type ShotKind = 'berry' | 'pod' | 'floss' | 'dart' | 'leaf' | 'samara' | 'disc' | 'chime' | 'seeds' | 'pinecone';

export interface Shot {
  id: number;
  kind: ShotKind;
  lane: number;
  x: number;
  /** Straight shots: tiles a second. Lobs: from, to and timing. */
  speed: number;
  power: number;
  pierce: boolean;
  /** Critters a piercing shot has already shooed (so it hits each once). */
  hit: number[];
  lob: { fromX: number; toX: number; at: number; len: number; target: number; splash: number } | null;
  /** Hits flyers (lobs, chimes). */
  air: boolean;
  /** Pinecone: tiles it still glides. */
  glide: number;
}

export interface Pickup {
  id: number;
  lane: number;
  x: number;
  worth: number;
  bornAt: number;
  /** Where it came from (for the renderer: a worm, a plant, a critter's leaves). */
  from: 'worm' | 'plant' | 'leaves';
}

export interface Card { plant: PlantId; wait: number }

export type GameEvent =
  | { type: 'plant'; plant: PlantId; lane: number; col: number }
  | { type: 'fire'; plant: number; shot: ShotKind; lane: number; x: number }
  | { type: 'hit'; critter: number; lane: number; x: number; power: number; blocked?: boolean }
  | { type: 'shoo'; critter: number; kind: CritterId; lane: number; x: number }
  | { type: 'wilt'; plant: PlantId; lane: number; col: number }
  | { type: 'dig'; plant: PlantId; lane: number; col: number }
  | { type: 'produce'; plant: number; lane: number; col: number }
  | { type: 'pickup'; pickup: number; lane: number; x: number; from: Pickup['from'] }
  | { type: 'collect'; pickup: number; worth: number; lane: number; x: number }
  | { type: 'umbrella'; lane: number }
  | { type: 'snack'; lane: number; left: number }
  | { type: 'wave'; index: number; flag: boolean; final: boolean }
  | { type: 'molehill'; lane: number; x: number }
  | { type: 'swap'; lane: number; col: number; plant: PlantId; to: 'pebble' | 'borrow' }
  | { type: 'drop'; lane: number; col: number; plant: PlantId }
  | { type: 'push'; lane: number; x: number }
  | { type: 'boss'; critter: number; trick: string }
  | { type: 'won' | 'lost' };

/** A tile's soil: free, a plant, or a pebble a packrat left (tap to clear). */
export type Ground = { kind: 'free' } | { kind: 'plant'; plant: Plant } | { kind: 'pebble' };

export interface GameState {
  spec: LevelSpec;
  seed: number;
  rnd: () => number;
  /** Seconds since the level started. */
  t: number;
  compost: number;
  snacks: number;
  umbrellas: boolean[];
  /** grid[lane][col]. */
  grid: Ground[][];
  critters: Critter[];
  shots: Shot[];
  pickups: Pickup[];
  cards: Card[];
  /** The waves: the next to start, when, and the spawns still to come. */
  wave: number;
  nextWaveAt: number;
  pending: { at: number; critter: CritterId; lane: number }[];
  /** How much of the level's critters have come in (0–1), for the wave bar. */
  progress: number;
  totalPoints: number;
  spawnedPoints: number;
  nextWormAt: number;
  /** The snack cart's lane (cart challenge). */
  cartLane: number;
  nextCartAt: number;
  autoCollect: boolean;
  result: null | 'won' | 'lost';
  events: GameEvent[];
  /** Counts for tests, bots and the pacing report. */
  stats: { planted: number; shooed: number; wilted: number; collected: number; snacksLost: number; umbrellasUsed: number; bySpecies: Record<string, number> };
  nextId: number;
}

/** What a player (or bot) can do. */
export type Command =
  | { type: 'plant'; card: number; lane: number; col: number }
  | { type: 'collect'; pickup: number }
  | { type: 'collectAll' }
  | { type: 'clear'; lane: number; col: number }
  /** The trowel: dig up a plant to make room (no compost back). */
  | { type: 'dig'; lane: number; col: number };
