/**
 * Shared content types. All game content (planets, missions, parts, facts...) is plain
 * typed data so a parent, teacher or designer can read and change it without touching logic.
 */

export type Difficulty = 'easy' | 'normal';

// ---------------------------------------------------------------- Rocket parts

export type StatKey = 'speed' | 'fuel' | 'cargo' | 'shield';
export const STAT_KEYS: readonly StatKey[] = ['speed', 'fuel', 'cargo', 'shield'];

export type PartSlot = 'nose' | 'body' | 'engine' | 'fins' | 'tank' | 'cargo' | 'lights' | 'paint';
export const PART_SLOTS: readonly PartSlot[] = ['nose', 'body', 'engine', 'fins', 'tank', 'cargo', 'lights', 'paint'];

/** How an item becomes available to buy (or is given for free). */
export type Unlock =
  | { kind: 'start' }
  | { kind: 'chapter'; chapter: number }
  | { kind: 'mission'; mission: string }
  | { kind: 'badge'; badge: string };

export interface PaintColors {
  main: string;
  accent: string;
  trim: string;
  window: string;
  /** Optional rainbow stripe style. */
  pattern?: 'stripes' | 'rainbow' | 'stars' | 'none';
}

export interface PartDef {
  id: string;
  slot: PartSlot;
  name: string;
  /** One short sentence for kids. */
  desc: string;
  /** Visual style key used by the procedural rocket drawer. */
  style: string;
  stats: Partial<Record<StatKey, number>>;
  price: number;
  unlock: Unlock;
  /** Paint only. */
  colors?: PaintColors;
  /** Engines only: flame colors (outer, inner). */
  flame?: [string, string];
}

export interface RocketLoadout {
  nose: string;
  body: string;
  engine: string;
  fins: string;
  tank: string;
  cargo: string;
  lights: string;
  paint: string;
  /** Up to two sticker ids from the sticker book. */
  stickers: string[];
}

// ---------------------------------------------------------------- Shop (outfits, decorations)

export interface OutfitDef {
  id: string;
  name: string;
  desc: string;
  price: number;
  unlock: Unlock;
  /** Visual: suit pattern / accessory key. */
  style: string;
}

export interface DecorDef {
  id: string;
  name: string;
  desc: string;
  price: number;
  unlock: Unlock;
  style: string;
}

// ---------------------------------------------------------------- Astronaut look

export interface AstronautLook {
  name: string;
  suit: string;
  accent: string;
  helmet: string;
  skin: string;
  hair: string;
  hairStyle: string;
  face: string;
  outfit: string;
}
