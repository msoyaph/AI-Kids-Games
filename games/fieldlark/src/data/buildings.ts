import { MACHINES } from './production';

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
  /** Animal homes: which animal lives here and how many fit. */
  holds?: string;
  cap?: number;
  /** Must touch water (the duck house). */
  needsWater?: boolean;
  /** How tall it is (for tap picking). */
  height?: number;
  /** Greenhouses: how many beds inside. */
  plots?: number;
  /** Only in the Shop once the story or the Farm Lab gets there. */
  needs?: { chapter?: number; flag?: string; why: string };
}

export const BUILDINGS: readonly BuildingDef[] = [
  { id: 'cottage', name: 'Keeper’s Cottage', w: 3, d: 3, cost: 0, fixed: true, level: 1, height: 2.4 },
  { id: 'dock', name: 'Boat Dock', w: 2, d: 3, cost: 0, fixed: true, level: 1, height: 0.4 },
  { id: 'board', name: 'Order Board', w: 1, d: 1, cost: 0, fixed: true, level: 1, height: 1.4 },
  { id: 'compost', name: 'Compost Bin', w: 1, d: 1, cost: 40, level: 1, height: 0.6 },
  { id: 'kennel', name: 'Dog Kennel', w: 1, d: 1, cost: 0, level: 1, holds: 'dog', cap: 1, height: 0.8 },
  { id: 'coop', name: 'Chicken Coop', w: 2, d: 2, cost: 150, level: 3, holds: 'chicken', cap: 6, height: 1.3 },
  { id: 'cowbarn', name: 'Cow Barn', w: 3, d: 3, cost: 420, level: 5, holds: 'cow', cap: 4, height: 2.0 },
  { id: 'beehive', name: 'Beehive', w: 1, d: 1, cost: 220, level: 6, holds: 'bee', cap: 1, height: 0.9 },
  { id: 'sheepshed', name: 'Sheep Shed', w: 3, d: 2, cost: 360, level: 7, holds: 'sheep', cap: 5, height: 1.5 },
  { id: 'goatpen', name: 'Goat Pen', w: 2, d: 2, cost: 300, level: 9, holds: 'goat', cap: 4, height: 1.3 },
  { id: 'greenhouse', name: 'Little Greenhouse', w: 2, d: 2, cost: 600, level: 1, plots: 4, height: 1.7, needs: { chapter: 5, why: 'Greenhouses come in chapter 6.' } },
  { id: 'greenhouse_m', name: 'Glasshouse', w: 3, d: 3, cost: 1400, level: 1, plots: 8, height: 2.1, needs: { chapter: 5, flag: 'lab:medium', why: 'Try “Glasshouse” in the Farm Lab.' } },
  { id: 'greenhouse_l', name: 'Big Glasshouse', w: 4, d: 3, cost: 2600, level: 1, plots: 12, height: 2.3, needs: { chapter: 5, flag: 'lab:large', why: 'Try “Big glasshouse” in the Farm Lab.' } },
  { id: 'duckhouse', name: 'Duck House', w: 2, d: 2, cost: 260, level: 11, holds: 'duck', cap: 6, needsWater: true, height: 1.1 },
];

// the workshops (src/data/production.ts) are buildings too
for (const m of MACHINES) (BUILDINGS as BuildingDef[]).push({ id: m.id, name: m.name, w: m.w, d: m.d, cost: m.cost, level: m.level, height: m.id === 'mill' ? 3.2 : 1.8 });

export const BUILDING: Record<string, BuildingDef> = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));

/** Old clutter on a sleepy farm: tap to clear it. Scraps go to the compost bin. */
export const DEBRIS: Record<string, { name: string; scraps: number; coins: number; gives?: { id: string; n: number } }> = {
  weeds: { name: 'Weeds', scraps: 1, coins: 0 },
  stone: { name: 'Stone', scraps: 0, coins: 3 },
  log: { name: 'Old log', scraps: 2, coins: 1 },
  // after a misty morning (src/sim/forecast.ts)
  mushrooms: { name: 'Mushrooms', scraps: 0, coins: 0, gives: { id: 'mushroom', n: 3 } },
};
