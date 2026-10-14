/**
 * Soil health: every field has nitrogen (what plants build leaves from) and humus (old plant matter
 * that holds water and feeds soil life), each 0 to 3. The farm's old fields start tired: 1 of each.
 *
 * - Hungry crops (grains, squash, the cabbage family, garden fruit, fibre plants) use 1 nitrogen when
 *   picked. Beans and peas add 1. Clover adds 2 nitrogen and 1 humus.
 * - Compost adds 1 humus. Growing the same family twice in a row uses 1 humus; rotating keeps it.
 * - A field left empty for a whole season rests and gains 1 humus.
 * - When a crop is planted, nitrogen of 2 or more gives it a care point (and one more to pick), and
 *   humus of 2 or more gives another.
 *
 * Soil is never ruined: at 0 a field simply gives no bonus.
 */
import type { CropDef, CropFamily } from '../data/crops';
import { DAY_SEC, SEASON_DAYS } from './clock';
import type { FieldObj } from './objects';

export const SOIL_MAX = 3;
/** Nitrogen and humus of a newly ploughed field (and of the old fields on a new farm). */
export const SOIL_START = { nit: 1, hum: 1 } as const;
/** Enough for a care point. */
export const SOIL_GOOD = 2;
const SEASON_SEC = DAY_SEC * SEASON_DAYS;

/** Nitrogen a crop of each family leaves behind when it is picked (clover is special). */
export const NITROGEN: Record<CropFamily, number> = {
  grain: -1, squash: -1, brassica: -1, garden: -1, fibre: -1, legume: 1, allium: 0, root: 0, herb: 0,
};

const clamp = (n: number) => Math.max(0, Math.min(SOIL_MAX, n));

/** A hungry crop: it uses nitrogen. */
export const hungry = (c: CropDef) => NITROGEN[c.family] < 0;

/** At planting: what the soil gives this crop, and a season of rest pays back some humus. */
export function soilAtPlanting(f: FieldObj, t: number) {
  if (f.restSince !== null && t - f.restSince >= SEASON_SEC) f.hum = clamp(f.hum + 1);
  f.restSince = null;
  f.boost = f.nit >= SOIL_GOOD;
  f.humus = f.hum >= SOIL_GOOD;
}

/** At harvest: what the crop took from the soil and gave back. `f.last` is still the crop before it. */
export function soilAfterHarvest(f: FieldObj, crop: CropDef, t: number) {
  const clover = crop.id === 'clover';
  f.nit = clamp(f.nit + (clover ? 2 : NITROGEN[crop.family]));
  if (clover) f.hum = clamp(f.hum + 1);
  else if (f.last === crop.family) f.hum = clamp(f.hum - 1);
  f.restSince = t;
}

/** Compost feeds the soil too. */
export function soilCompost(f: FieldObj) {
  f.hum = clamp(f.hum + 1);
}

/** "●●○" style dots for a value, with words for screen readers elsewhere. */
export const soilDots = (n: number) => '●'.repeat(n) + '○'.repeat(SOIL_MAX - n);
export const soilWord = (n: number) => ['Very low', 'Low', 'Good', 'Rich'][n] ?? 'Good';
