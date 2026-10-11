// Merges every content file into lookup tables. Adding content = adding data to a file
// imported here; nothing else needs to change.
import { BUGS } from './bugs';
import { FISH } from './fish';
import { FOSSILS } from './fossils';
import { FURNITURE, SURFACES } from './furniture';
import { FLOWER_ITEMS, FRUIT_ITEMS, LOST_ITEMS, MATERIALS, MISC_ITEMS, SAPLING_ITEMS, SEED_ITEMS, TOOLS } from './items';
import { RECIPES } from './recipes';
import type { BugDef, FishDef, FossilDef, ItemDef, RecipeDef } from './types';

export const ITEMS: Record<string, ItemDef> = {};
const add = (d: ItemDef) => {
  if (ITEMS[d.id]) throw new Error(`Duplicate item id ${d.id}`);
  ITEMS[d.id] = d;
};

for (const list of [MATERIALS, TOOLS, FRUIT_ITEMS, FLOWER_ITEMS, SEED_ITEMS, SAPLING_ITEMS, MISC_ITEMS, LOST_ITEMS]) list.forEach(add);

const fishTags = (f: FishDef) => (f.where.includes('sea') ? ['sea'] : ['nature']);
for (const f of FISH)
  add({
    id: f.id,
    name: f.name,
    cat: 'fish',
    price: f.price,
    stack: 5,
    desc: f.desc,
    icon: { s: f.shape, c: f.colors[0], c2: f.colors[1], c3: f.colors[2] },
    tags: fishTags(f),
    rarity: f.rarity,
  });
for (const b of BUGS)
  add({
    id: b.id,
    name: b.name,
    cat: 'bug',
    price: b.price,
    stack: 5,
    desc: b.desc,
    icon: { s: b.shape, c: b.colors[0], c2: b.colors[1], c3: b.colors[2] },
    tags: ['nature', b.shape === 'spider' ? 'spooky' : 'cute'],
    rarity: b.rarity,
  });
for (const f of FOSSILS)
  add({
    id: f.id,
    name: f.name,
    cat: 'fossil',
    price: f.price,
    stack: 5,
    desc: f.desc,
    icon: { s: f.shape, c: f.colors[0], c2: f.colors[1] },
    tags: ['science', 'retro'],
  });
for (const f of FURNITURE)
  add({
    id: f.id,
    name: f.name,
    cat: 'furniture',
    price: f.price,
    stack: 1,
    desc: f.desc,
    icon: { s: 'furniture', c: f.furn.color, c2: f.furn.color2 },
    tags: f.tags,
    furn: f.furn,
  });
for (const s of SURFACES)
  add({
    id: s.id,
    name: s.name,
    cat: s.kind,
    price: s.price,
    stack: 1,
    desc: s.kind === 'wallpaper' ? 'Wallpaper for your home.' : 'Flooring for your home.',
    icon: { s: s.kind === 'wallpaper' ? 'wall' : 'floor', c: s.c, c2: s.c2 },
    surface: { c: s.c, c2: s.c2, pattern: s.pattern },
    tags: ['cozy'],
  });

export const FISH_BY_ID: Record<string, FishDef> = Object.fromEntries(FISH.map((f) => [f.id, f]));
export const BUG_BY_ID: Record<string, BugDef> = Object.fromEntries(BUGS.map((b) => [b.id, b]));
export const FOSSIL_BY_ID: Record<string, FossilDef> = Object.fromEntries(FOSSILS.map((f) => [f.id, f]));
export const RECIPE_BY_ID: Record<string, RecipeDef> = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
export const FURNITURE_SHOP = FURNITURE.filter((f) => f.buy > 0);
export const SURFACE_SHOP = SURFACES.filter((s) => s.buy > 0);
export const BUY_PRICE: Record<string, number> = Object.fromEntries([
  ...FURNITURE.filter((f) => f.buy > 0).map((f) => [f.id, f.buy] as const),
  ...SURFACES.filter((s) => s.buy > 0).map((s) => [s.id, s.buy] as const),
]);

export { FISH, BUGS, FOSSILS, FURNITURE, SURFACES, RECIPES };

const MISSING: ItemDef = { id: '?', name: 'Unknown', cat: 'misc', price: 0, stack: 1, desc: '', icon: { s: 'mystery', c: 0xcccccc } };

export function item(id: string): ItemDef {
  return ITEMS[id] ?? { ...MISSING, id, name: id };
}

export function hasItemDef(id: string): boolean {
  return id in ITEMS;
}
