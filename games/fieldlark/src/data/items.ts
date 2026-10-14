/**
 * Everything that can sit in the barn: crops, orchard fruit, animal products, made goods and farm
 * supplies. Crops are listed from src/data/crops.ts; later phases add fruit, animal products and goods
 * here. Every item has a base price (one star) and a colour for its icon.
 */
import { ANIMALS } from './animals';
import { CROPS } from './crops';
import { TREES } from './orchard';
import { VARIETIES, VARIETY_PRICE } from './varieties';
import { RECIPE, RECIPES } from './production';

export type ItemKind = 'crop' | 'fruit' | 'animal' | 'good' | 'supply';

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  /** Coins for one at one star (before the season's market price). */
  price: number;
  color: number;
  /** Supplies (fertilizer) are used on the farm, never sold or entered at the fair. */
  sellable: boolean;
  /** For crops: the seasons they grow in (prices are a bit lower then). */
  seasons?: string[];
  /** For a crop variety: the ordinary crop it is a kind of. */
  base?: string;
}

const items: ItemDef[] = [
  ...CROPS.map(c => ({ id: c.id, name: c.name, kind: 'crop' as const, price: c.price, color: c.color.crop, sellable: true, seasons: c.seasons })),
  ...VARIETIES.map(v => { const c = CROPS.find(x => x.id === v.crop)!; return { id: v.id, name: v.name, kind: 'crop' as const, price: Math.round(c.price * VARIETY_PRICE), color: v.color, sellable: true, seasons: c.seasons, base: c.id }; }),
  ...TREES.map(t => ({ id: t.fruit, name: t.fruitName, kind: 'fruit' as const, price: t.price, color: t.color.fruit, sellable: true, seasons: t.seasons })),
  ...ANIMALS.filter(a => a.product).map(a => ({ id: a.product!, name: a.productName, kind: 'animal' as const, price: a.price, color: a.color.body === 0xffffff ? 0xf6f0e4 : a.id === 'bee' ? 0xf2b33a : a.color.body, sellable: true })),
  { id: 'mushroom', name: 'Mushrooms', kind: 'fruit', price: 9, color: 0xb98a5a, sellable: true },
  { id: 'fertilizer', name: 'Compost', kind: 'supply', price: 0, color: 0x7d5a3d, sellable: false },
];

// Made goods are worth their ingredients plus a fair share for the time and the work.
const raw = new Map(items.map(i => [i.id, i.price]));
const goodPrice = (id: string, seen = new Set<string>()): number => {
  const known = raw.get(id);
  if (known !== undefined) return known;
  const rec = RECIPE[id];
  if (!rec || seen.has(id)) throw new Error(`no price for ${id}`);
  seen.add(id);
  const inputs = Object.entries(rec.inputs).reduce((sum, [k, n]) => sum + goodPrice(k, seen) * n, 0);
  const price = Math.round(inputs * 1.3 + rec.minutes * 2);
  raw.set(id, price);
  return price;
};
for (const rec of RECIPES) items.push({ id: rec.id, name: rec.name, kind: 'good', price: goodPrice(rec.id), color: rec.color, sellable: true });

export const ITEMS: Record<string, ItemDef> = {};
for (const i of items) {
  if (ITEMS[i.id]) throw new Error(`duplicate item id ${i.id}`);
  ITEMS[i.id] = i;
}

export const itemDef = (id: string): ItemDef => {
  const d = ITEMS[id];
  if (!d) throw new Error(`unknown item ${id}`);
  return d;
};
