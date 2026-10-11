/** Shared runtime/save types for the simulation. Kept JSON-friendly with short keys. */

export interface ItemStack {
  id: string;
  n: number;
  /** quality 0 normal, 1 silver star, 2 gold star, 3 sparkle star */
  q: number;
}

export type ObjKind =
  | 'weed'
  | 'stone'
  | 'twig'
  | 'stump'
  | 'log'
  | 'boulder'
  | 'part'
  | 'tree'
  | 'fruitTree'
  | 'crop'
  | 'giant'
  | 'forage'
  | 'spot'
  | 'machine'
  | 'chest'
  | 'sprinkler'
  | 'scarecrow'
  | 'fence'
  | 'gate'
  | 'path'
  | 'deco'
  | 'crabpot'
  | 'bush'
  | 'rock'
  | 'ore'
  | 'gem'
  | 'ladder'
  | 'box'
  | 'ice'
  | 'mineChest'
  | 'heartstone'
  | 'torch'
  | 'beehouse'
  | 'grass';

export interface Tapper {
  id: string;
  /** minutes remaining */
  t: number;
  out: ItemStack | null;
}

export interface WorldObject {
  k: ObjKind;
  id: string;
  hp?: number;
  /** growth days / stage */
  g?: number;
  /** regrow countdown / fruit timer */
  rg?: number;
  /** count (fruit on tree, berries) or misc */
  n?: number;
  /** machine input id */
  inp?: string;
  /** machine/crabpot output */
  out?: ItemStack | null;
  /** minutes remaining on a machine */
  t?: number;
  /** chest contents */
  items?: (ItemStack | null)[];
  /** chest color label index */
  col?: number;
  /** multi-tile part → anchor tile index */
  ref?: number;
  /** gate open */
  open?: boolean;
  /** mine rock hides the ladder */
  hid?: boolean;
  /** tapper attached to a tree */
  tap?: Tapper;
  /** crop: withered (out of season) */
  dead?: boolean;
  /** crop: watered-days counter for quality */
  wd?: number;
  /** crop placed by fertilizer quality boost */
  fq?: number;
  /** crabpot bait */
  bait?: boolean;
}

export const SOIL_TILLED = 1;
export const SOIL_WATERED = 2;
/** fertilizer stored in bits 2-3: 1 basic (quality), 2 deluxe (quality+), 3 speedy */
export const SOIL_FERT_SHIFT = 2;
export const SOIL_FERT_MASK = 0b1100;
