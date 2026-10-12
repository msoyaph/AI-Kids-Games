/**
 * Crops: content (names, seasons, looks). Balance numbers live in tuning.ts (CROP_BALANCE).
 * Registering a crop also registers its seed packet and produce items.
 */
import { CROP_BALANCE, PRICES, SAPLING_PRICES } from '../tuning';
import { registerItem } from './items';

export type CropShape = 'root' | 'leafy' | 'bush' | 'tall' | 'vine' | 'ground' | 'flower' | 'grain';
export type ProduceShape = 'round' | 'long' | 'leafy' | 'berry' | 'cluster' | 'pod' | 'corn' | 'grain' | 'flower' | 'melon' | 'pumpkin' | 'sprouts' | 'strawberry' | 'cauli';

export interface CropDef {
  id: string;
  name: string;
  seedName: string;
  seasons: number[];
  plant: CropShape;
  produce: ProduceShape;
  /** main, dark, light colors of the produce */
  color: [number, number, number];
  leaf?: number;
  trellis?: boolean;
  giant?: boolean;
  fruit?: boolean;
  desc: string;
}

const c = (
  id: string,
  name: string,
  seasons: number[],
  plant: CropShape,
  produce: ProduceShape,
  color: [number, number, number],
  desc: string,
  extra: Partial<CropDef> = {},
): CropDef => ({ id, name, seedName: `${name} Seeds`, seasons, plant, produce, color, desc, ...extra });

export const CROPS: CropDef[] = [
  c('radish', 'Radish', [0], 'root', 'round', [0xd2434a, 0x96293a, 0xf07868], 'A peppery little root. Ready super fast!'),
  c('lettuce', 'Lettuce', [0], 'leafy', 'leafy', [0x86c25a, 0x3e7c3c, 0xb8e07c], 'Crunchy leaves for salads.'),
  c('carrot', 'Carrot', [0], 'root', 'long', [0xe4862e, 0xb4571e, 0xf6b146], 'Bunnies love these. So do people!'),
  c('potato', 'Potato', [0], 'root', 'round', [0xb7844f, 0x8f603d, 0xdcae72], 'A lumpy, tasty spud. Sometimes you dig up two!'),
  c('strawberry', 'Strawberry', [0], 'bush', 'strawberry', [0xd2434a, 0x96293a, 0xf07868], 'Sweet red berries. Keeps growing more!', { fruit: true }),
  c('peas', 'Snap Peas', [0], 'vine', 'pod', [0x5c9e48, 0x2c5a37, 0x86c25a], 'Grows up a trellis. Pop the pods!', { trellis: true }),
  c('cauliflower', 'Cauliflower', [0], 'ground', 'cauli', [0xf3efe6, 0xd8d0c0, 0xffffff], 'A big fluffy cloud of a veggie. Sometimes grows GIANT!', { giant: true }),
  c('tulip', 'Tulip', [0], 'flower', 'flower', [0xee8ab6, 0xbf5688, 0xffc6dc], 'A cheerful spring flower.'),
  c('tomato', 'Tomato', [1], 'bush', 'round', [0xd2434a, 0x96293a, 0xf07868], 'Juicy and red. Keeps on growing!'),
  c('corn', 'Corn', [1, 2], 'tall', 'corn', [0xf5d34a, 0xe4862e, 0xfbe97a], 'Tall and golden. Grows in summer AND autumn.'),
  c('blueberry', 'Blueberry', [1], 'bush', 'berry', [0x4f7fe0, 0x2f4fa8, 0x8fb6f5], 'Little blue berries in bunches.', { fruit: true }),
  c('melon', 'Melon', [1], 'ground', 'melon', [0x5c9e48, 0x2c5a37, 0xb8e07c], 'A huge, sweet summer treat. Can grow GIANT!', { giant: true, fruit: true }),
  c('sunflower', 'Sunflower', [1, 2], 'tall', 'flower', [0xf5d34a, 0xb4571e, 0xfbe97a], 'Turns its face to the sun. Its seeds make oil.'),
  c('hotpepper', 'Hot Pepper', [1], 'bush', 'long', [0xd2434a, 0x96293a, 0xf07868], 'Spicy! Grows new peppers quickly.'),
  c('greenbean', 'Green Bean', [1], 'vine', 'pod', [0x3e7c3c, 0x1d3a2b, 0x86c25a], 'Climbs a trellis all summer.', { trellis: true }),
  c('wheat', 'Wheat', [1, 2], 'grain', 'grain', [0xe6c98f, 0xb08c55, 0xf4e2b4], 'Golden grain. Mill it into flour or cut it for hay.'),
  c('pumpkin', 'Pumpkin', [2], 'ground', 'pumpkin', [0xe4862e, 0xb4571e, 0xf6b146], 'Big, round and orange. Can grow GIANT!', { giant: true }),
  c('cranberry', 'Cranberry', [2], 'bush', 'berry', [0xd2434a, 0x96293a, 0xf07868], 'Tart red berries — lots of them!', { fruit: true }),
  c('grape', 'Grapes', [2], 'vine', 'cluster', [0x9873be, 0x664788, 0xc8a7e8], 'Bunches of grapes on a trellis.', { trellis: true, fruit: true }),
  c('eggplant', 'Eggplant', [2], 'bush', 'long', [0x664788, 0x3a2853, 0x9873be], 'Shiny and purple. Grows back fast.'),
  c('yam', 'Sweet Potato', [2], 'root', 'long', [0xbf5688, 0x96293a, 0xee8ab6], 'Sweet and filling. A cozy autumn food.'),
  c('beet', 'Beet', [2], 'root', 'round', [0x96293a, 0x5a1e2a, 0xd2434a], 'Deep red and earthy.'),
  c('broccoli', 'Broccoli', [2], 'leafy', 'leafy', [0x3e7c3c, 0x1d3a2b, 0x5c9e48], 'Looks like a tiny tree!'),
  c('kale', 'Kale', [3], 'leafy', 'leafy', [0x2c5a37, 0x1d3a2b, 0x5c9e48], 'Tough enough to grow in the snow.'),
  c('spinach', 'Spinach', [3], 'leafy', 'leafy', [0x3e7c3c, 0x2c5a37, 0x86c25a], 'Leafy and strong. Grows in winter!'),
  c('brussels', 'Brussels Sprouts', [3], 'tall', 'sprouts', [0x86c25a, 0x3e7c3c, 0xb8e07c], 'Mini cabbages on a stalk. Grows back in winter.'),
];

export const CROP: Record<string, CropDef> = {};
for (const cd of CROPS) CROP[cd.id] = cd;

export const SEASON_LABEL = ['Spring', 'Summer', 'Autumn', 'Winter'];
const seasonsText = (s: number[]) => s.map((x) => SEASON_LABEL[x]).join(' & ');

for (const cd of CROPS) {
  const b = CROP_BALANCE[cd.id];
  if (!b) throw new Error(`missing CROP_BALANCE for ${cd.id}`);
  const regrow = b.regrow ? ` Keeps producing every ${b.regrow} days.` : '';
  registerItem({
    id: `seed.${cd.id}`,
    name: cd.seedName,
    cat: 'seed',
    price: Math.floor(b.seed / 2),
    desc: `Plant in ${seasonsText(cd.seasons)}. Ready in ${b.days} days.${regrow}${cd.trellis ? ' Grows on a trellis.' : ''}`,
    seasons: cd.seasons,
    giftable: false,
  });
  registerItem({
    id: cd.id,
    name: cd.name,
    cat: cd.produce === 'flower' ? 'flower' : cd.fruit ? 'fruit' : 'crop',
    price: b.sell,
    desc: cd.desc,
    energy: cd.produce === 'flower' ? 0 : Math.round(8 + b.sell / 8),
    quality: true,
    seasons: cd.seasons,
  });
}

// ── Trees ─────────────────────────────────────────────────
export interface FruitTreeDef {
  id: string;
  name: string;
  season: number;
  color: [number, number, number];
}

export const FRUIT_TREES: FruitTreeDef[] = [
  { id: 'cherry', name: 'Cherry', season: 0, color: [0xd2434a, 0x96293a, 0xf07868] },
  { id: 'peach', name: 'Peach', season: 1, color: [0xf6a070, 0xe07050, 0xffd0a8] },
  { id: 'orange', name: 'Orange', season: 1, color: [0xe4862e, 0xb4571e, 0xf6b146] },
  { id: 'apple', name: 'Apple', season: 2, color: [0xd2434a, 0x96293a, 0xf07868] },
  { id: 'pear', name: 'Pear', season: 2, color: [0xb8d050, 0x7a9a30, 0xe0f080] },
];
export const FRUIT_TREE: Record<string, FruitTreeDef> = {};
for (const t of FRUIT_TREES) {
  FRUIT_TREE[t.id] = t;
  registerItem({ id: `sapling.${t.id}`, name: `${t.name} Sapling`, cat: 'sapling', price: Math.floor(SAPLING_PRICES[t.id] / 2), desc: `Plant on your farm. After ${10} days it gives ${t.name.toLowerCase()}s every ${SEASON_LABEL[t.season].toLowerCase()} day.`, giftable: false });
  registerItem({ id: t.id, name: t.name, cat: 'fruit', price: PRICES[t.id], desc: `A fresh ${t.name.toLowerCase()} from your own tree.`, energy: 20, quality: true });
}

/** Wild trees (oak/maple/pine) and their seeds/tapper products. */
export const WILD_TREES = {
  oak: { seed: 'acorn', tap: 'oakResin', name: 'Oak' },
  maple: { seed: 'mapleSeed', tap: 'mapleSyrup', name: 'Maple' },
  pine: { seed: 'pineCone', tap: 'pineTar', name: 'Pine' },
} as const;
export type WildTree = keyof typeof WILD_TREES;
