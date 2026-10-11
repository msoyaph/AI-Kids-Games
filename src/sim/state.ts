// The complete, JSON-serializable game state. Everything persistent lives here.
import { generateIsland } from '../world/worldgen';
import { WORLD_SIZE } from '../world/types';

export const SAVE_VERSION = 3;

export type ObjKind =
  | 'tree'
  | 'pine'
  | 'palm'
  | 'fruitTree'
  | 'sapling'
  | 'rock'
  | 'flower'
  | 'weed'
  | 'item'
  | 'dig'
  | 'hole'
  | 'deco';

export interface TileObj {
  k: ObjKind;
  /** variant / species / fruit index / flower (species*16+color) */
  v?: number;
  /** item id: dropped item, buried item (dig), furniture (deco), sapling kind */
  item?: string;
  /** quantity of a dropped item */
  q?: number;
  /** fruit currently hanging (trees) */
  f?: number;
  /** growth stage (saplings, planted flowers) */
  g?: number;
  /** watered today */
  w?: number;
  /** resource hits taken today (trees: wood, rocks: stones) */
  c?: number;
  /** branch shaken today */
  b?: number;
  /** rotation (deco) */
  r?: number;
  /** day planted */
  pd?: number;
  /** buried in this tile was an extra (e.g. lost item owner id) */
  tag?: string;
}

export type StructType =
  | 'hall'
  | 'shop'
  | 'shopCart'
  | 'museum'
  | 'museumTent'
  | 'home'
  | 'villagerHome'
  | 'plot'
  | 'workbench'
  | 'lighthouse'
  | 'dock'
  | 'bridge'
  | 'ramp'
  | 'plazaLantern'
  | 'noticeBoard'
  | 'construction';

export interface Structure {
  id: number;
  type: StructType;
  x: number;
  z: number;
  w: number;
  d: number;
  level: number;
  /** uphill direction for ramps / span axis for bridges (0=N,1=E,2=S,3=W) */
  dir?: number;
  /** villager id for homes/plots */
  owner?: string;
  /** construction finishes at the start of this day */
  readyDay?: number;
  /** what a construction site becomes */
  becomes?: StructType;
  /** cosmetic variant */
  v?: number;
}

export interface Appearance {
  skin: number;
  hair: number;
  hairColor: number;
  eyes: number;
  mouth: number;
  blush: boolean;
  outfit: number;
}

export interface InvSlot {
  id: string;
  qty: number;
  /** remaining durability for tools */
  dur?: number;
}

/** Where the player is: the island, or inside a room ('home', 'museum', 'shop', 'hall', 'villager:<id>'). */
export type Location = 'island' | 'home' | 'museum' | 'shop' | 'hall' | `villager:${string}`;

/** Position inside a room (saved so a save made indoors resumes indoors). */
export interface IndoorPos {
  x: number;
  z: number;
  facing: number;
  /** island spot to return to when leaving */
  ret: { x: number; z: number; facing: number };
}

export interface PlayerState {
  name: string;
  look: Appearance;
  x: number;
  z: number;
  level: number;
  facing: number;
  inv: (InvSlot | null)[];
  invSize: number;
  /** inventory slot index of the equipped tool, -1 = none */
  equipped: number;
  glints: number;
  lumens: number;
  location: Location;
  /** set while indoors */
  indoor?: IndoorPos;
}

export interface PlacedFurniture {
  uid: number;
  id: string;
  x: number;
  z: number;
  rot: number;
}

export interface HomeState {
  /** -1 = no home yet, 0 tent, 1 small house, 2 big house */
  level: number;
  loan: number;
  loanTotal: number;
  upgradeReadyDay: number;
  furniture: PlacedFurniture[];
  nextUid: number;
  wallpaper: string;
  flooring: string;
  storage: InvSlot[];
}

export type WeatherT = 'sunny' | 'cloudy' | 'rain' | 'rainbow';

export interface VillagerRequest {
  kind: 'deliver' | 'lost' | 'catch';
  target: string;
  qty: number;
  day: number;
  accepted: boolean;
  done: boolean;
  /** tile index where a lost item was dropped */
  lostTile?: number;
  reward: number;
}

export interface VillagerState {
  movedIn: boolean;
  homeId: number;
  friendship: number;
  talkedDay: number;
  giftDay: number;
  giftsToday: number;
  request?: VillagerRequest;
  rewardsGiven: number;
  metDay: number;
  /** furniture the player gave them, most recent first (shown in their home) */
  gifts?: string[];
}

export interface MissionProgress {
  startedDay: number;
  counts: number[];
}

export interface ChallengeProgress {
  id: string;
  progress: number;
  done: boolean;
}

export interface TimedEventState {
  kind: 'tournament' | 'bugoff';
  timeLeft: number;
  score: number;
  catches: number;
}

export interface GameState {
  version: number;
  seed: number;
  createdAt: number;
  playSeconds: number;
  player: PlayerState;
  clock: { day: number; minute: number };
  weather: { day: number; today: WeatherT };
  world: {
    objects: Record<number, TileObj>;
    structures: Structure[];
    nextStructId: number;
    rolledDay: number;
  };
  home: HomeState;
  museum: { donated: string[] };
  catalog: { seen: Record<string, number>; owned: Record<string, number> };
  recipes: string[];
  villagers: Record<string, VillagerState>;
  quests: {
    active: Record<string, MissionProgress>;
    done: string[];
    tracked: string;
    chapter: number;
    finished: boolean;
    creditsSeen: boolean;
  };
  challenges: { day: number; list: ChallengeProgress[]; completedTotal: number };
  achievements: Record<string, number>;
  stats: Record<string, number>;
  events: { best: Record<string, number>; medals: Record<string, number>; active: TimedEventState | null };
  shop: { day: number; sold: string[] };
  flags: Record<string, number>;
  tips: Record<string, number>;
}

export const DEFAULT_LOOK: Appearance = {
  skin: 1,
  hair: 0,
  hairColor: 2,
  eyes: 0,
  mouth: 0,
  blush: true,
  outfit: 3,
};

export const INV_START = 20;
export const START_MINUTE = 8 * 60;

export function newGameState(seed: number, name: string, look: Appearance = DEFAULT_LOOK): GameState {
  const gen = generateIsland(seed);
  const objects: Record<number, TileObj> = {};
  for (const o of gen.objects) {
    const i = o.z * WORLD_SIZE + o.x;
    switch (o.k) {
      case 'fruitTree':
        objects[i] = { k: 'fruitTree', v: o.v, f: 3 };
        break;
      case 'palm':
        objects[i] = { k: 'palm', v: o.v, f: 2 };
        break;
      case 'flower':
        objects[i] = { k: 'flower', v: o.v, g: 3 };
        break;
      default:
        objects[i] = { k: o.k, v: o.v };
    }
  }
  const structures: Structure[] = [];
  let id = 1;
  const add = (s: Omit<Structure, 'id'>) => {
    structures.push({ id: id++, ...s });
  };
  const L = gen.lots;
  add({ type: 'hall', ...L.hall, level: 0 });
  add({ type: 'dock', ...L.dock, level: 0 });
  add({ type: 'lighthouse', ...L.lighthouse, level: 2 });
  const pcx = L.plaza.x + Math.floor(L.plaza.w / 2);
  const pcz = L.plaza.z + Math.floor(L.plaza.d / 2);
  add({ type: 'plazaLantern', x: pcx, z: pcz, w: 1, d: 1, level: 0 });
  add({ type: 'noticeBoard', x: L.plaza.x + 1, z: L.plaza.z, w: 2, d: 1, level: 0 });

  return {
    version: SAVE_VERSION,
    seed,
    createdAt: Date.now(),
    playSeconds: 0,
    player: {
      name,
      look: { ...look },
      x: gen.spawn.x,
      z: gen.spawn.z,
      level: 0,
      facing: Math.PI,
      inv: Array.from({ length: INV_START }, () => null),
      invSize: INV_START,
      equipped: -1,
      glints: 0,
      lumens: 0,
      location: 'island',
    },
    clock: { day: 1, minute: START_MINUTE },
    weather: { day: 0, today: 'sunny' },
    world: { objects, structures, nextStructId: id, rolledDay: 0 },
    home: {
      level: -1,
      loan: 0,
      loanTotal: 0,
      upgradeReadyDay: 0,
      furniture: [],
      nextUid: 1,
      wallpaper: 'wall_canvas',
      flooring: 'floor_grass',
      storage: [],
    },
    museum: { donated: [] },
    catalog: { seen: {}, owned: {} },
    recipes: [],
    villagers: {},
    quests: { active: {}, done: [], tracked: '', chapter: 1, finished: false, creditsSeen: false },
    challenges: { day: 0, list: [], completedTotal: 0 },
    achievements: {},
    stats: {},
    events: { best: {}, medals: {}, active: null },
    shop: { day: 0, sold: [] },
    flags: {},
    tips: {},
  };
}
