import { describe, expect, it } from 'vitest';
import { BUGS, FISH, FOSSILS, FURNITURE, ITEMS, RECIPES, SURFACES, hasItemDef } from '../src/data/registry';
import { FURN_MODELS_CHECK } from './fixtures';

describe('content data', () => {
  it('meets the content minimums', () => {
    expect(FISH.length).toBeGreaterThanOrEqual(30);
    expect(BUGS.length).toBeGreaterThanOrEqual(30);
    expect(FOSSILS.length).toBeGreaterThanOrEqual(15);
    expect(RECIPES.length).toBeGreaterThanOrEqual(40);
    expect(FURNITURE.length).toBeGreaterThanOrEqual(40);
    expect(SURFACES.length).toBeGreaterThanOrEqual(10);
  });

  it('every recipe references existing items', () => {
    for (const r of RECIPES) {
      expect(hasItemDef(r.result), r.id).toBe(true);
      for (const ing of r.ingredients) expect(hasItemDef(ing.id), `${r.id} -> ${ing.id}`).toBe(true);
      expect(r.id).toBe(`r_${r.result}`);
    }
  });

  it('items have sane fields', () => {
    for (const d of Object.values(ITEMS)) {
      expect(d.name.length, d.id).toBeGreaterThan(0);
      expect(d.stack, d.id).toBeGreaterThan(0);
      expect(d.price, d.id).toBeGreaterThanOrEqual(0);
      if (d.furn) {
        expect(FURN_MODELS_CHECK).toContain(d.furn.model);
        expect(d.furn.w).toBeGreaterThan(0);
        expect(d.furn.d).toBeGreaterThan(0);
      }
    }
  });

  it('defaults for a new home exist', () => {
    expect(hasItemDef('wall_canvas')).toBe(true);
    expect(hasItemDef('floor_grass')).toBe(true);
  });
});
