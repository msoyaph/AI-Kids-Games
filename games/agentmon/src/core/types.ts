/**
 * The shared vocabulary of the game rules. Everything here is plain data (JSON-safe), so the
 * rules, the save codec, the simulations and the renderer all speak the same language.
 */

export const ELEMENTS = ['flare', 'tide', 'leaf', 'stone', 'gust', 'frost', 'volt', 'glow'] as const;
export type Element = (typeof ELEMENTS)[number];
/** Plain moves belong to no element: they are neither strong nor weak against anything. */
export type MoveElement = Element | 'plain';

export const STATUSES = ['sleepy', 'dizzy', 'soaked', 'toasty', 'chilly'] as const;
export type StatusId = (typeof STATUSES)[number];

export type BoostStat = 'power' | 'guard' | 'speed';
export type Difficulty = 'easy' | 'normal' | 'hard';
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

export interface BaseStats {
  energy: number;
  power: number;
  guard: number;
  speed: number;
}

/** A species trait: a small, always-on passive, explained in one plain sentence. */
export type TraitId =
  | 'cozy' // Rest restores a little more energy
  | 'thrifty' // moves cost a little less energy
  | 'sturdy' // takes a little less from strong-against hits
  | 'speedy' // a little faster
  | 'cheerful' // shakes off statuses a turn sooner
  | 'brave' // a bit more power when low on energy
  | 'calm' // can't get Dizzy
  | 'warm' // can't get Chilly
  | 'waterproof' // can't get Soaked
  | 'fireproof' // can't get Toasty
  | 'wakeful' // can't get Sleepy
  | 'friendly' // easier to befriend; shares a bit more experience
  | 'guardian'; // the guardians' trait: steady and kind (all of the small boosts above, lightly)

export type PersonalityId = 'cheerful' | 'brave' | 'calm' | 'curious' | 'shy' | 'playful' | 'sleepy' | 'proud';
export const PERSONALITIES: readonly PersonalityId[] = ['cheerful', 'brave', 'calm', 'curious', 'shy', 'playful', 'sleepy', 'proud'];

export type SnackId = 'berry-bun' | 'crunch-seed' | 'honey-drop' | 'sea-crisp' | 'sun-pepper' | 'frost-mint' | 'spark-fizz' | 'moon-melon';

export interface Species {
  /** Stable number in the Field Guide (1–77) and in saves. Never renumber. */
  num: number;
  id: string;
  name: string;
  family: string;
  /** 1–3 growth stages; guardians are stage 1 with `guardian: true`. */
  stage: 1 | 2 | 3;
  element: Element;
  base: BaseStats;
  /** Grows into `to` at `level` (asked first; the player may wait). */
  grows?: { to: string; level: number };
  /** Moves learned by level, in order. Level 1 moves are known from the start. */
  learnset: [level: number, move: string][];
  trait: TraitId;
  favoriteSnack: SnackId;
  /** 0.6 (shy) – 1.4 (very friendly): scales the befriending arc. */
  friendliness: number;
  /** Experience a tuckered-out one gives (before level scaling). */
  xpYield: number;
  guardian?: boolean;
  /** A short plain-language line for the Field Guide. */
  blurb: string;
  /** The real thing it is inspired by, and the key of its fact in data/facts.ts. */
  inspiration: string;
  fact: string;
}

export type MoveKind = 'attack' | 'buff' | 'shield' | 'status' | 'heal';

export type MoveEffect =
  | { type: 'status'; status: StatusId; chance: number; target: 'foe' }
  | { type: 'boost'; stat: BoostStat; stages: number; target: 'self' | 'foe' }
  | { type: 'shield'; amount: number }
  | { type: 'restore'; amount: number }
  | { type: 'cleanse' };

export interface Move {
  /** Stable number in saves. Never renumber; add new moves at the end. */
  n: number;
  id: string;
  name: string;
  element: MoveElement;
  kind: MoveKind;
  /** 0 for moves that don't bump. */
  power: number;
  /** Energy cost as a share of the user's max energy (0–0.2). 0 = free. */
  cost: number;
  /** Goes before normal moves (shields and quick bumps). */
  priority?: number;
  effects?: MoveEffect[];
  /** One plain sentence for the tooltip. */
  desc: string;
}

/** A befriended (or wild, or Keeper) Agentmon. JSON-safe; the save codec packs it. */
export interface Creature {
  /** Unique within a save (0 for wild and Keeper creatures). */
  uid: number;
  species: string;
  /** Index into data/names.ts, or -1 to use the species name. */
  nick: number;
  level: number;
  /** Total experience. */
  xp: number;
  /** Current energy (0 = tuckered out; restored at Rest Stops and after battle naps). */
  energy: number;
  moves: string[];
  personality: PersonalityId;
  shimmer: boolean;
  /** 0–255, grows with petting, snacks and battles together. */
  friendship: number;
  /** Equipped gear item id, if any. */
  gear?: string;
  /** Map index where it was befriended (Field Guide notes). */
  met: number;
  /** "Not yet" was chosen for growing at this level; asked again next level. */
  holdGrowth?: boolean;
}

/** Lookup tables the rules need, injected so tests can use small fixtures. */
export interface Dex {
  species: Record<string, Species>;
  moves: Record<string, Move>;
}

export type ItemKind = 'snack' | 'berry' | 'gear' | 'key';

export interface Item {
  /** Stable number in saves. Never renumber. */
  n: number;
  id: string;
  name: string;
  kind: ItemKind;
  price: number;
  desc: string;
  /** Berries: restore this share of max energy, and/or clear a status. */
  restore?: number;
  cleanse?: boolean;
  /** Berries that wake a tuckered-out friend outside battle (with `restore`). */
  revive?: boolean;
  /** Gear: a small boost while equipped. */
  gear?: { element?: Element; moveBoost?: number; restBoost?: number; speed?: number; guard?: number };
}

/** Everything the battle rules look up. */
export interface BattleDex extends Dex {
  items: Record<string, Item>;
}
