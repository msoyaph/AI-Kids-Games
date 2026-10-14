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
  { id: 'rosa', name: 'Rosa', role: 'who runs The Lark’s Nest café', likes: ['juice', 'cake', 'milk', 'honey', 'fruit'], color: { coat: 0xe8706a, hair: 0x3a2418, skin: 0xd9a07a } },
  { id: 'hollis', name: 'Mr. Hollis', role: 'who keeps Bobbin & Thread, the fabric shop', likes: ['wool', 'cotton', 'flax', 'yarn', 'cloth', 'linen'], color: { coat: 0x4a5a70, hair: 0xd8d0c4, skin: 0xf0c8a0 } },
];

/** The farmhands: volunteers from Larkford who help on the community farm (names web-checked). */
export const HELPER_NAMES = ['Fen', 'Juno', 'Wren', 'Bea', 'Kit', 'Moss'] as const;
/** Each farmhand's shirt, trousers, hair, skin and hat band (the 3D farmhands and their portraits). */
export const HELPER_LOOK: readonly [shirt: number, pants: number, hair: number, skin: number, hat: number][] = [
  [0xf2b84b, 0x3f6fa8, 0x5a3a24, 0xf1c7a0, 0xd9534a],
  [0xe8706a, 0x6f8f4a, 0x2b1d14, 0x9a6a48, 0x4f8fd6],
  [0x7fc4d8, 0x8a5a3b, 0xd98a40, 0xe7b48c, 0x6fae5a],
  [0xa98bd8, 0x4a5a70, 0xcfc8bc, 0xc68c63, 0xf2b84b],
  [0x8fcf7a, 0x7a4a6a, 0x1f1a17, 0x6b4a34, 0xe8706a],
  [0xf29ab8, 0x3f7f86, 0xb8763f, 0xf3d2b4, 0x7fc4d8],
];
/** The town's businesses (contracts) and who runs them. */
export const CAFE = 'The Lark’s Nest';
export const FABRIC_SHOP = 'Bobbin & Thread';

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
