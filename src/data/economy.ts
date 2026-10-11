// Economy tuning knobs (prices, loans, pocket upgrades). Tuned by scripts/pacing.ts.
export interface HomeTier {
  level: number;
  name: string;
  /** loan taken on when ordering this upgrade (0 = free) */
  cost: number;
  /** interior room size in tiles */
  room: { w: number; d: number };
}

export const HOME_TIERS: HomeTier[] = [
  { level: 0, name: 'Canvas Tent', cost: 0, room: { w: 6, d: 5 } },
  { level: 1, name: 'Cozy Cottage', cost: 15000, room: { w: 8, d: 7 } },
  { level: 2, name: 'Lantern House', cost: 48000, room: { w: 10, d: 8 } },
];

/** Buy price multiplier over sell price when no explicit price exists. */
export const BUY_MULT = 4;
export const SEED_PRICE = 80;
export const SAPLING_PRICE = 600;
export const FLIMSY_TOOL_PRICE = 250;
/** a daily "hot item" sells for this multiple */
export const HOT_ITEM_MULT = 2;

/** Pocket upgrades at the Lumen Exchange. */
export const POCKET_UPGRADES = [
  { size: 30, lumens: 1500 },
  { size: 40, lumens: 3500 },
];
