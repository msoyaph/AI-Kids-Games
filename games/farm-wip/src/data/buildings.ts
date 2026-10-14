/**
 * Buildings and other placed things, by id: size on the grid, what they cost, and whether they can be
 * moved. Production buildings (mill, bakery…) and animal homes join this list in later phases.
 */

export interface BuildingDef {
  id: string;
  name: string;
  /** Footprint before rotation (tiles). */
  w: number;
  d: number;
  cost: number;
  /** Fixed things (the cottage, the dock) stay where they are. */
  fixed?: boolean;
  /** Farm level that unlocks it in the build menu. */
  level: number;
}

export const BUILDINGS: readonly BuildingDef[] = [
  { id: 'cottage', name: 'Keeper’s Cottage', w: 3, d: 3, cost: 0, fixed: true, level: 1 },
  { id: 'dock', name: 'Boat Dock', w: 2, d: 3, cost: 0, fixed: true, level: 1 },
  { id: 'compost', name: 'Compost Bin', w: 1, d: 1, cost: 40, level: 1 },
];

export const BUILDING: Record<string, BuildingDef> = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));

/** Old clutter on a sleepy farm: tap to clear it. Scraps go to the compost bin. */
export const DEBRIS: Record<string, { name: string; scraps: number; coins: number }> = {
  weeds: { name: 'Weeds', scraps: 1, coins: 0 },
  stone: { name: 'Stone', scraps: 0, coins: 3 },
  log: { name: 'Old log', scraps: 2, coins: 1 },
};
