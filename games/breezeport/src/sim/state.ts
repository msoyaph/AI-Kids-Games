/**
 * The town as data: what the save holds. Roads and zones are per-tile arrays; everything standing on
 * the land is a Thing. Citizens, cars and their trips are never saved: they are worked out from the
 * homes, the jobs and the roads (sim/citizens.ts, sim/traffic.ts).
 *
 * Pure: no DOM, no Date, no Math.random.
 */
import { H, W, type AreaId } from './map';

export const SAVE_VERSION = 1;

/** Turns: 0 faces south (+z), 1 west, 2 north, 3 east (models face south before turning). */
export type Rot = 0 | 1 | 2 | 3;

/** Road kinds (per tile). */
export const ROAD = { none: 0, street: 1 } as const;
/** Road flags (per tile, bits). */
export const RFLAG = { bike: 1, tram: 2 } as const;
/** Zones the player paints (per tile). */
export const ZONE = { none: 0, home: 1, shop: 2, work: 3, park: 4 } as const;
export type ZoneKind = (typeof ZONE)[keyof typeof ZONE];
/** How a tile's ground is finished: paths and plazas the player lays (zones bring their own lawns). */
export const FINISH = { wild: 0, lawn: 1, paving: 2, gravel: 3, sand: 4 } as const;
export type Finish = (typeof FINISH)[keyof typeof FINISH];

export interface Thing {
  id: number;
  def: string;
  x: number;
  z: number;
  rot: Rot;
  /** Which paint or look (an index into the def's looks). */
  look: number;
  /** 1–3 for buildings that grow; 1 for everything else. */
  level: number;
  /** Coins waiting in this building's bubble (shops and workplaces). */
  pay: number;
  /** Town time it was built (scaffolding shows for a while; 0 = always there). */
  born: number;
  /** Solar panels on the roof (homes, shops and workplaces). */
  solar?: boolean;
}

export interface Route {
  id: number;
  /** Bus stop thing ids, in the order the bus visits them (a loop). */
  stops: number[];
  color: number;
}

export interface CameraSave { x: number; z: number; yawStep: number; zoom: number }

export interface DayRecord { day: number; income: number; upkeep: number; coins: number; pop: number; happy: number }

export interface Town {
  v: number;
  seed: number;
  /** The sim's own random stream (seeded; saved, so a town replays the same way). */
  rng: number;
  /** Seconds of play. */
  t: number;
  mode: 'story' | 'creative';
  name: string;
  coins: number;
  roads: Uint8Array;
  rflags: Uint8Array;
  zones: Uint8Array;
  finish: Uint8Array;
  things: Thing[];
  nextId: number;
  routes: Route[];
  unlocked: AreaId[];
  story: { chapter: number; done: string[]; creditsSeen: boolean };
  /** Lifetime counters the goals read (roads laid, homes built, coins collected…). */
  stats: Record<string, number>;
  /** The last days, for City Hall's charts (newest last, at most 12). */
  history: DayRecord[];
  flags: Record<string, number>;
  cam: CameraSave;
  /** Not saved: goes up whenever roads, zones or things change (the renderer and the simulations rebuild then). */
  version?: number;
}

export function emptyTown(seed: number): Town {
  return {
    v: SAVE_VERSION, seed, rng: seed >>> 0, t: 0, mode: 'story', name: 'Breezeport', coins: 0,
    roads: new Uint8Array(W * H), rflags: new Uint8Array(W * H), zones: new Uint8Array(W * H), finish: new Uint8Array(W * H),
    things: [], nextId: 1, routes: [], unlocked: ['harbor'],
    story: { chapter: 0, done: [], creditsSeen: false }, stats: {}, history: [], flags: {},
    cam: { x: 40, z: 14, yawStep: 0, zoom: 0 }, version: 1,
  };
}

/** Mark the town changed (roads, zones or things). */
export const touch = (town: Town) => { town.version = (town.version ?? 0) + 1; };

/** Add a thing and give it an id. */
export function addThing(town: Town, t: Omit<Thing, 'id' | 'look' | 'level' | 'pay' | 'born'> & Partial<Thing>): Thing {
  const thing: Thing = { look: 0, level: 1, pay: 0, born: 0, ...t, id: town.nextId++ };
  town.things.push(thing);
  touch(town);
  return thing;
}

/** Count a lifetime stat. */
export function bump(town: Town, stat: string, by = 1) { town.stats[stat] = (town.stats[stat] ?? 0) + by; }
