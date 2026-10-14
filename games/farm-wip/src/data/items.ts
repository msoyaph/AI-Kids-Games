/**
 * Everything that can sit in the barn: crops, orchard fruit, animal products, made goods and farm
 * supplies. Crops are listed from src/data/crops.ts; later phases add fruit, animal products and goods
 * here. Every item has a base price (one star) and a colour for its icon.
 */
import { CROPS } from './crops';

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
}

const items: ItemDef[] = [
  ...CROPS.map(c => ({ id: c.id, name: c.name, kind: 'crop' as const, price: c.price, color: c.color.crop, sellable: true, seasons: c.seasons })),
  { id: 'fertilizer', name: 'Compost', kind: 'supply', price: 0, color: 0x7d5a3d, sellable: false },
];

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
