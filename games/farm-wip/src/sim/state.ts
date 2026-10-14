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
}

export const HOME_VIEW: CameraSave = { x: 42, z: 45, yawStep: 0, zoom: 38 };

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
  };
}
