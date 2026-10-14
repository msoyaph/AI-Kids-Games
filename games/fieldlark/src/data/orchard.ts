/**
 * Orchard trees and berry bushes: plant once, pick again and again. Each fruits in its own seasons
 * and rests the rest of the year (fruit already ripe stays on the branch). Trees that flowers need
 * insects for give more when a beehive is near; nut trees and figs don't need bees (see the facts).
 */
import type { Season } from '../sim/clock';

export interface TreeDef {
  id: string;
  name: string;
  /** The fruit's item id. */
  fruit: string;
  fruitName: string;
  kind: 'tree' | 'bush';
  /** Coins for a young tree or bush. */
  cost: number;
  level: number;
  /** Minutes of play until the first fruit, and between pickings after that. */
  firstMin: number;
  againMin: number;
  yield: number;
  /** Coins for one fruit at one star. */
  price: number;
  /** Seasons it fruits in. */
  seasons: Season[];
  /** Bees help it fruit. */
  bees: boolean;
  color: { leaf: number; fruit: number; blossom: number };
}

export const TREES: readonly TreeDef[] = [
  { id: 'plum', name: 'Plum Tree', fruit: 'plum', fruitName: 'Plums', kind: 'tree', cost: 120, level: 6, firstMin: 10, againMin: 6, yield: 4, price: 9, seasons: ['summer', 'autumn'], bees: true, color: { leaf: 0x5aa64a, fruit: 0x7a3e8c, blossom: 0xffffff } },
  { id: 'apricot', name: 'Apricot Tree', fruit: 'apricot', fruitName: 'Apricots', kind: 'tree', cost: 140, level: 8, firstMin: 10, againMin: 6, yield: 4, price: 10, seasons: ['spring', 'summer'], bees: true, color: { leaf: 0x5fb04f, fruit: 0xf4a542, blossom: 0xffd6e0 } },
  { id: 'lemon', name: 'Lemon Tree', fruit: 'lemon', fruitName: 'Lemons', kind: 'tree', cost: 160, level: 10, firstMin: 12, againMin: 7, yield: 5, price: 8, seasons: ['spring', 'summer', 'autumn', 'winter'], bees: true, color: { leaf: 0x3f8f3a, fruit: 0xffe14d, blossom: 0xffffff } },
  { id: 'fig', name: 'Fig Tree', fruit: 'fig', fruitName: 'Figs', kind: 'tree', cost: 170, level: 12, firstMin: 12, againMin: 7, yield: 4, price: 12, seasons: ['summer', 'autumn'], bees: false, color: { leaf: 0x4f9e48, fruit: 0x6b3a5a, blossom: 0x9fd07a } },
  { id: 'almond', name: 'Almond Tree', fruit: 'almond', fruitName: 'Almonds', kind: 'tree', cost: 200, level: 15, firstMin: 14, againMin: 8, yield: 6, price: 9, seasons: ['summer', 'autumn'], bees: true, color: { leaf: 0x6fb05a, fruit: 0xc49a6c, blossom: 0xffe0ec } },
  { id: 'walnut', name: 'Walnut Tree', fruit: 'walnut', fruitName: 'Walnuts', kind: 'tree', cost: 220, level: 18, firstMin: 16, againMin: 9, yield: 6, price: 10, seasons: ['autumn'], bees: false, color: { leaf: 0x4f8f3a, fruit: 0x8a6a3e, blossom: 0xb9d98a } },
  { id: 'raspberry', name: 'Raspberry Bush', fruit: 'raspberry', fruitName: 'Raspberries', kind: 'bush', cost: 60, level: 5, firstMin: 6, againMin: 4, yield: 4, price: 6, seasons: ['summer', 'autumn'], bees: true, color: { leaf: 0x4f9e48, fruit: 0xe0405a, blossom: 0xffffff } },
  { id: 'gooseberry', name: 'Gooseberry Bush', fruit: 'gooseberry', fruitName: 'Gooseberries', kind: 'bush', cost: 70, level: 9, firstMin: 6, againMin: 4, yield: 4, price: 6, seasons: ['spring', 'summer'], bees: true, color: { leaf: 0x5aa64a, fruit: 0xb8d86a, blossom: 0xf2e6c9 } },
  { id: 'blackcurrant', name: 'Blackcurrant Bush', fruit: 'blackcurrant', fruitName: 'Blackcurrants', kind: 'bush', cost: 80, level: 11, firstMin: 7, againMin: 4, yield: 5, price: 6, seasons: ['summer'], bees: true, color: { leaf: 0x3f8f3a, fruit: 0x2f2a4a, blossom: 0xe8d6f0 } },
  { id: 'hazelnut', name: 'Hazel Bush', fruit: 'hazelnut', fruitName: 'Hazelnuts', kind: 'bush', cost: 90, level: 14, firstMin: 9, againMin: 6, yield: 5, price: 7, seasons: ['autumn', 'winter'], bees: false, color: { leaf: 0x6a9e48, fruit: 0xa9784a, blossom: 0xe6d36a } },
];

export const TREE: Record<string, TreeDef> = Object.fromEntries(TREES.map(t => [t.id, t]));
