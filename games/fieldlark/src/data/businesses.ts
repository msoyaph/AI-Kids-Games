/**
 * Larkford's businesses, which sign contracts with the farm: a few baskets of the same things, one at
 * a time, for a better price than the order board. Each opens with a chapter of the story.
 */
import { CAFE, FABRIC_SHOP } from './cast';

export type BusinessId = 'bakery' | 'school' | 'cafe' | 'fabric';

export interface Business {
  id: BusinessId;
  name: string;
  /** Who runs it (an id in src/data/cast.ts). */
  owner: string;
  /** The chapter (0-based) from which it signs contracts. */
  chapter: number;
  /** What it uses, in the order a farm can usually make them. */
  wants: string[];
  /** What the owner says when a contract is finished. */
  thanks: string;
}

export const BUSINESSES: readonly Business[] = [
  { id: 'bakery', name: 'Larkford Bakery', owner: 'tomasz', chapter: 2, wants: ['wheat', 'egg', 'flour', 'oats', 'sugar', 'butter', 'oatflakes', 'strawberryjam'], thanks: 'The whole town smells of fresh bread. Thank you, keeper!' },
  { id: 'school', name: 'Larkford School', owner: 'amara', chapter: 4, wants: ['cabbage', 'strawberry', 'egg', 'turnip', 'cucumber', 'milk', 'veggiesoup', 'yogurt', 'plum'], thanks: 'The children cleared their plates every day. Thank you!' },
  { id: 'cafe', name: CAFE, owner: 'rosa', chapter: 5, wants: ['honey', 'milk', 'lemonade', 'chamomiletea', 'cake', 'strawberryjam', 'jamtarts'], thanks: 'My café has never been so busy. Thank you so much!' },
  { id: 'fabric', name: FABRIC_SHOP, owner: 'hollis', chapter: 6, wants: ['wool', 'cotton', 'flax', 'yarn', 'cottoncloth', 'linen', 'lavender'], thanks: 'Such lovely threads! My shelves are full of colour again.' },
];

export const BUSINESS: Record<BusinessId, Business> = Object.fromEntries(BUSINESSES.map(b => [b.id, b])) as Record<BusinessId, Business>;
