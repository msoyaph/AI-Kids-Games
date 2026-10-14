/**
 * Varieties and cross-breeding. Heirloom seeds are sold from chapter 4. A new variety is found when a
 * flowering crop is picked while a field right next to it (not diagonal) grows the same crop of the
 * other parent kind, with a beehive nearby: the bees carried pollen between them. Each such picking
 * has a 20% chance (25% on healthy soil) to find the seeds, rolled from the farm's own random stream,
 * and every miss makes the next try 10% likelier, so nobody waits forever.
 */
import type { CropDef } from '../data/crops';
import { CROSS_CHANCE, CROSS_CHANCE_HEALTHY, VARIETIES, VARIETY, VARIETY_SEED, type VarietyDef } from '../data/varieties';
import type { FieldObj } from './objects';
import type { Farm } from './state';
import { bump, objAt, roll } from './world';

/** Heirloom seeds are in the seed shop from chapter 4 on. */
export const heirloomsOpen = (farm: Farm) => farm.story.chapter >= 3;

/** The varieties of a crop you can plant now (the ordinary kind is always there too). */
export function varietyChoice(farm: Farm, crop: string): VarietyDef[] {
  return VARIETIES.filter(v => v.crop === crop && (v.heirloom ? heirloomsOpen(farm) : farm.discovered.includes(v.id)));
}

/** All the varieties of a crop, for the Farm Book. */
export const varietiesOf = (crop: string) => VARIETIES.filter(v => v.crop === crop);

export const seedPrice = (crop: CropDef, variety: string | null) => (variety ? Math.round(crop.seed * VARIETY_SEED) : crop.seed);

/** The name of what grows in a field: "White Pumpkin" or just "Pumpkin". */
export const varietyName = (variety: string | null, fallback: string) => (variety ? VARIETY[variety]?.name ?? fallback : fallback);

const same = (a: [string, string], b: [string, string]) => (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);

/** What a pair of kinds side by side could make (not found yet), if anything. */
export function crossOf(farm: Farm, crop: string, a: string, b: string): VarietyDef | null {
  if (a === b) return null;
  return VARIETIES.find(v => v.crop === crop && v.parents && same(v.parents, [a, b]) && !farm.discovered.includes(v.id)) ?? null;
}

/** The fields right next to this one that grow the same crop. */
function sameCropNeighbours(farm: Farm, f: FieldObj): FieldObj[] {
  const out: FieldObj[] = [];
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const o = objAt(farm, f.x + dx, f.z + dz);
    if (o?.kind === 'field' && o.crop === f.crop) out.push(o);
  }
  return out;
}

/**
 * Called as a field is picked (before it is cleared): did the bees make something new? Returns the
 * new variety's id, or null.
 */
export function crossAtHarvest(farm: Farm, f: FieldObj, bees: boolean): string | null {
  if (!f.crop || !bees) return null;
  const mine = f.variety ?? f.crop;
  for (const n of sameCropNeighbours(farm, f)) {
    const found = crossOf(farm, f.crop, mine, n.variety ?? n.crop!);
    if (!found) continue;
    const tries = farm.flags.crossTries ?? 0;
    const chance = (f.boost && f.humus ? CROSS_CHANCE_HEALTHY : CROSS_CHANCE) + 0.1 * tries;
    if (roll(farm) >= chance) { farm.flags.crossTries = tries + 1; return null; }
    farm.flags.crossTries = 0;
    farm.discovered.push(found.id);
    farm.ideas += 1;
    bump(farm, 'bred');
    return found.id;
  }
  return null;
}
