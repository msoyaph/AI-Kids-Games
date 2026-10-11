// Recipes + workbench crafting.
import { RECIPE_BY_ID, item } from '../data/registry';
import type { RecipeDef } from '../data/types';
import type { Game } from './game';
import { countItem, give, removeItem, stat } from './inventory';

export function knowsRecipe(g: Game, id: string): boolean {
  return g.state.recipes.includes(id);
}

export function learnRecipe(g: Game, id: string, source = 'misc', quiet = false): boolean {
  const r = RECIPE_BY_ID[id];
  if (!r || knowsRecipe(g, id)) return false;
  g.state.recipes.push(id);
  g.state.catalog.seen[`recipe:${id}`] = g.state.clock.day;
  g.emit('recipeLearned', { id, source });
  if (!quiet) {
    g.toast(`New recipe: ${item(r.result).name}!`, 'good', r.result);
    g.emit('sfx', { name: 'learn' });
  }
  return true;
}

export interface Missing {
  id: string;
  need: number;
  have: number;
}

export function ingredientStatus(g: Game, r: RecipeDef): Missing[] {
  return r.ingredients.map((ing) => ({ id: ing.id, need: ing.qty, have: countItem(g, ing.id) }));
}

export function canCraft(g: Game, r: RecipeDef): boolean {
  return ingredientStatus(g, r).every((m) => m.have >= m.need);
}

/** Craft a known recipe. Returns false if missing ingredients or unknown. */
export function craft(g: Game, recipeId: string): boolean {
  const r = RECIPE_BY_ID[recipeId];
  if (!r || !knowsRecipe(g, recipeId) || !canCraft(g, r)) return false;
  for (const ing of r.ingredients) removeItem(g, ing.id, ing.qty, 'craft');
  give(g, r.result, r.qty ?? 1, 'craft');
  stat(g, 'crafted');
  const cat = item(r.result).cat;
  g.emit('crafted', { recipe: r.id, item: r.result, category: cat });
  g.emit('sfx', { name: 'craft' });
  return true;
}

/** How many times you could craft this right now (ingredients only). */
export function maxCraftable(g: Game, r: RecipeDef): number {
  let n = 99;
  for (const ing of r.ingredients) n = Math.min(n, Math.floor(countItem(g, ing.id) / ing.qty));
  return Math.max(0, n);
}

/** Craft up to `times` in a row; returns how many were made. */
export function craftMany(g: Game, recipeId: string, times: number): number {
  let made = 0;
  for (let k = 0; k < times; k++) {
    if (!craft(g, recipeId)) break;
    made++;
  }
  return made;
}
