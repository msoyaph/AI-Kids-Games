/**
 * The whole farm as plain JSON: this object is what gets saved. Systems in src/sim/ are functions
 * over it; they never touch the DOM, the real clock or Math.random.
 */
import { startObjects } from '../data/start';
import { TUNING } from '../data/tuning';
import { START_T } from './clock';
import type { Stack } from './inventory';
import type { AreaId } from './map';
import type { Obj } from './objects';
import type { BoatState, Order } from './orders';
import type { NeighborState, Coop } from './neighbors';
import { newStory, type StoryState } from './story';

export interface CameraSave {
  /** Where the camera looks, in tile units. */
  x: number;
  z: number;
  /** 0..7: the view is turned in 45° steps. */
  yawStep: number;
  /** Pixels per tile at the middle of the screen. */
  zoom: number;
}

/** One season's numbers for the Farm Ledger. */
export interface LedgerSeason {
  /** Seasons since the farm began (0 = the first spring). */
  season: number;
  grown: Record<string, number>;
  made: Record<string, number>;
  earned: number;
  spent: number;
  /** Coins earned per crop (sales of that crop), for "profit per crop". */
  cropEarned: Record<string, number>;
  cropSpent: Record<string, number>;
}

export interface Farm {
  /** Save format version (src/save/save.ts migrates older ones). */
  v: number;
  seed: number;
  /** The farm's own random stream (src/core/rng.ts). */
  rng: number;
  /** Seconds of play so far: the farm clock (src/sim/clock.ts). */
  t: number;
  coins: number;
  xp: number;
  unlocked: AreaId[];
  cam: CameraSave;
  /** One-time things that happened (tips seen, story beats), by name. */
  flags: Record<string, number>;
  objects: Obj[];
  nextId: number;
  /** The barn: item id → counts at 1, 2 and 3 stars. */
  inv: Record<string, Stack>;
  barnLevel: number;
  /** Harvest leftovers waiting for the compost bin. */
  scraps: number;
  /** When the compost bin finishes the bag it is making (null: idle). */
  compostUntil: number | null;
  /** Free plantings from the safety net. */
  freeSeeds: number;
  ledger: LedgerSeason[];
  /** Paths painted on the ground: one character per tile ('0' none, '1' dirt, '2' stone, '3' brick). */
  paths: string;
  /** Things put away in build mode, by `kind:def`, to place again for free. */
  storage: Record<string, number>;
  /** The town order board, and when the next empty slot fills. */
  orders: Order[];
  nextOrderAt: number | null;
  orderSeq: number;
  boat: BoatState;
  neighbors: Record<string, NeighborState>;
  coop: Coop | null;
  /** Lifetime counters: `harvest`, `harvest:wheat`, `orders`, `made:bread`… (see `bump`). */
  stats: Record<string, number>;
  story: StoryState;
  /** Crop varieties found by crossing (src/sim/varieties.ts). */
  discovered: string[];
  /** Ideas for the Farm Lab: earned from levels, contracts, fair ribbons and new varieties. */
  ideas: number;
  /** Fair ribbons, newest last (the ribbon wall), and how many of each there are in all. */
  ribbons: Ribbon[];
  ribbonCount: [gold: number, silver: number, bronze: number, thanks: number];
}

/** A ribbon from a fair: which fair (by season), which category, and the place (1–4; 4 is "thank you for coming"). */
export interface Ribbon { season: number; cat: string; place: 1 | 2 | 3 | 4; grand?: boolean }

/** A new farm's camera. Zoom 0 means "not set yet": the game frames the farmhouse and fields for the screen. */
export const HOME_VIEW: CameraSave = { x: 37.5, z: 38.5, yawStep: 0, zoom: 0 };

export function newFarm(seed: number): Farm {
  const objects = startObjects();
  return {
    v: 1,
    seed: seed >>> 0,
    rng: (seed ^ 0x9e3779b9) >>> 0,
    t: START_T,
    coins: TUNING.startCoins,
    xp: 0,
    unlocked: ['home'],
    cam: { ...HOME_VIEW },
    flags: {},
    objects,
    nextId: Math.max(0, ...objects.map(o => o.id)) + 1,
    inv: {},
    barnLevel: 0,
    scraps: 0,
    compostUntil: null,
    freeSeeds: 0,
    ledger: [],
    paths: '0'.repeat(56 * 56),
    storage: {},
    orders: [],
    nextOrderAt: null,
    orderSeq: 0,
    boat: { crates: [], cargo: [], backAt: null, trips: 0 },
    neighbors: {},
    coop: null,
    stats: {},
    story: newStory(),
    discovered: [],
    ideas: 0,
    ribbons: [],
    ribbonCount: [0, 0, 0, 0],
  };
}
