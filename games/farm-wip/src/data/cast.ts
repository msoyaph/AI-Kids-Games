/**
 * The people: a mentor, townsfolk who place orders, and three neighbour farms. All made up, with
 * plain names (each web-checked; see the IP log in CLAUDE.md). The town is Larkford, a little river
 * town downstream; the farm's boat is the Little Lark.
 */

export const TOWN = 'Larkford';
export const BOAT = 'the Little Lark';
/** The boat's name at the start of a sentence. */
export const BOAT_TITLE = 'The Little Lark';

export interface Person {
  id: string;
  name: string;
  role: string;
  /** What they like to order, by item kind or id. */
  likes: string[];
  color: { coat: number; hair: number; skin: number };
}

export const PEOPLE: readonly Person[] = [
  { id: 'hattie', name: 'Hattie', role: 'the farm’s old keeper, now a beekeeper', likes: ['honey', 'chamomiletea', 'lavender', 'sachet'], color: { coat: 0x7cbf8a, hair: 0xe8e4dc, skin: 0xe9b48f } },
  { id: 'tomasz', name: 'Tomasz', role: 'the baker', likes: ['wheat', 'flour', 'egg', 'sugar', 'butter', 'oats', 'bread', 'cake'], color: { coat: 0xffffff, hair: 0x5a3d2a, skin: 0xf0c8a0 } },
  { id: 'amara', name: 'Amara', role: 'the school cook', likes: ['crop', 'egg', 'milk', 'cheese', 'veggiesoup', 'omelette', 'yogurt'], color: { coat: 0xf0a040, hair: 0x2a2220, skin: 0x8a5a3b } },
  { id: 'silas', name: 'Silas', role: 'the ferry keeper, captain of the Little Lark', likes: ['fruit', 'animal', 'good'], color: { coat: 0x3f6fa8, hair: 0x9a9a9a, skin: 0xd9a07a } },
  { id: 'wendell', name: 'Wendell', role: 'the librarian', likes: ['jam', 'juice', 'honey', 'good'], color: { coat: 0x8a6ab8, hair: 0x3d3a35, skin: 0xc98f6a } },
  { id: 'penrose', name: 'Mrs. Penrose', role: 'the Harvest Fair judge', likes: ['good', 'fruit'], color: { coat: 0xd9534a, hair: 0xb0b0b8, skin: 0xf2c9a8 } },
];

export const PERSON: Record<string, Person> = Object.fromEntries(PEOPLE.map(p => [p.id, p]));

export interface Neighbor {
  id: string;
  farm: string;
  who: string;
  /** How they talk (used by their lines in src/data/dialogue.ts). */
  personality: string;
  /** What they have plenty of (they trade it away) and what they're often short of. */
  gives: string[];
  wants: string[];
  color: { coat: number; hair: number; skin: number };
}

export const NEIGHBORS: readonly Neighbor[] = [
  { id: 'ingrid', farm: 'Plumridge Orchard', who: 'Ingrid', personality: 'tidy and precise, loves a neat row of trees', gives: ['plum', 'apricot', 'almond', 'honey'], wants: ['wheat', 'flour', 'egg', 'cabbage', 'sugar'], color: { coat: 0x6fa8d6, hair: 0xf2d38c, skin: 0xf6d2b8 } },
  { id: 'femi', farm: 'Nannyberry Farm', who: 'Femi and family', personality: 'cheerful, goat-mad, always laughing', gives: ['goatmilk', 'goatcheese', 'egg', 'cabbage'], wants: ['clover', 'oats', 'strawberry', 'bread'], color: { coat: 0xf0a040, hair: 0x1f1a18, skin: 0x7a4a2e } },
  { id: 'lu', farm: 'Reedmere', who: 'Mr. Lu', personality: 'calm and kind, knows the river and its birds', gives: ['rice', 'duckegg', 'cucumber', 'lemon'], wants: ['wool', 'milk', 'pumpkin', 'onion'], color: { coat: 0x5aa67a, hair: 0x4a4a4a, skin: 0xe2b98a } },
];

export const NEIGHBOR: Record<string, Neighbor> = Object.fromEntries(NEIGHBORS.map(n => [n.id, n]));
