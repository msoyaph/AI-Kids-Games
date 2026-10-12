/**
 * Item registry. Content files (crops, fish, minerals, recipes…) register their items here,
 * so adding content is adding data. Prices live in content tables / tuning.
 */
export type ItemCat =
  | 'tool'
  | 'seed'
  | 'crop'
  | 'fruit'
  | 'flower'
  | 'forage'
  | 'fish'
  | 'crab'
  | 'mineral'
  | 'gem'
  | 'ore'
  | 'bar'
  | 'geode'
  | 'artifact'
  | 'resource'
  | 'animal'
  | 'artisan'
  | 'food'
  | 'ingredient'
  | 'placeable'
  | 'machine'
  | 'fertilizer'
  | 'bait'
  | 'junk'
  | 'special'
  | 'sapling'
  | 'ammo';

export interface ItemDef {
  id: string;
  name: string;
  cat: ItemCat;
  /** sell price (0 = can't sell) */
  price: number;
  desc: string;
  /** energy restored when eaten (0 / undefined = not edible) */
  energy?: number;
  /** max stack (default 99; tools 1) */
  stack?: number;
  /** icon sprite name (default item.{id}) */
  icon?: string;
  /** buff when eaten */
  buff?: { id: string; minutes: number; speed?: number; luck?: number; farming?: number; fishing?: number; mining?: number; foraging?: number; defense?: number };
  /** can be gifted (default true except tools/special) */
  giftable?: boolean;
  /** placed into the world (machines, chests, sprinklers…) */
  place?: string;
  /** season(s) the item is associated with (for seeds/forage) */
  seasons?: number[];
  /** quality applies (crops, forage, animal products, fish) */
  quality?: boolean;
}

export const ITEMS: Record<string, ItemDef> = {};

export function registerItem(def: ItemDef): ItemDef {
  if (ITEMS[def.id]) throw new Error(`duplicate item ${def.id}`);
  ITEMS[def.id] = def;
  return def;
}

export function item(id: string): ItemDef {
  const d = ITEMS[id];
  if (!d) throw new Error(`unknown item ${id}`);
  return d;
}

export function tryItem(id: string): ItemDef | undefined {
  return ITEMS[id];
}

export const maxStack = (id: string): number => ITEMS[id]?.stack ?? 99;

// ── Tools ─────────────────────────────────────────────────
export const TOOLS = ['hoe', 'can', 'axe', 'pick', 'scythe', 'rod', 'bonk', 'sling'] as const;
export type ToolKind = (typeof TOOLS)[number];

const TOOL_INFO: Record<ToolKind, [string, string]> = {
  hoe: ['Hoe', 'Digs soil so you can plant seeds. Also digs up wiggly dig spots.'],
  can: ['Watering Can', 'Waters crops. Refill it at a pond, river or well.'],
  axe: ['Axe', 'Chops trees, twigs and stumps for wood.'],
  pick: ['Pickaxe', 'Breaks stones and rocks. Great in the mine!'],
  scythe: ['Scythe', 'Cuts weeds and grass. Uses no energy!'],
  rod: ['Fishing Rod', 'Hold to cast, then reel in fish when they bite.'],
  bonk: ['Bonk Stick', 'A soft, puffy stick that bounces cave critters away.'],
  sling: ['Slingshot', 'Flings pebbles at critters from far away.'],
};

for (const t of TOOLS) {
  registerItem({ id: `tool.${t}`, name: TOOL_INFO[t][0], cat: 'tool', price: 0, desc: TOOL_INFO[t][1], stack: 1, giftable: false });
}

export const isTool = (id: string): boolean => id.startsWith('tool.');
export const toolKind = (id: string): ToolKind => id.slice(5) as ToolKind;

/** Tool upgrade tier names (0 = basic). */
export const TIER_NAMES = ['Basic', 'Copper', 'Iron', 'Gold'];
