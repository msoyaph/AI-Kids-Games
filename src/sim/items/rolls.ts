import type { ItemId } from '../../data/types';
import { ITEMS, ITEM_SETS, type ItemSet } from '../../data/items';
import type { Rng } from '../../core/rng';

/**
 * Map a race position to a weight bucket: 0 = 1st, 1 = front pack, 2 = middle, 3 = back pack, 4 = last.
 * With very small fields we collapse gracefully.
 */
export function positionBucket(rank: number, total: number): number {
  if (total <= 1) return 2;
  if (rank <= 1) return 0;
  if (rank >= total) return 4;
  const p = (rank - 1) / (total - 1);
  if (p < 0.35) return 1;
  if (p < 0.67) return 2;
  return 3;
}

const scratch = new Float64Array(ITEMS.length);

/** Weights for every item at a bucket under an item set (zero for excluded items). */
export function itemWeights(bucket: number, set: ItemSet, out: Float64Array = scratch): Float64Array {
  const filter = ITEM_SETS[set].filter;
  for (let i = 0; i < ITEMS.length; i++) {
    const it = ITEMS[i];
    if (!filter(it)) {
      out[i] = 0;
      continue;
    }
    // Wild mix ignores position (except rocket dash stays a back-of-the-pack treat).
    if (set === 'wild') out[i] = it.id === 'rocketDash' ? (bucket >= 3 ? 10 : 0) : 10;
    else out[i] = it.weights[bucket];
  }
  return out;
}

/** Roll an item for a racer at `rank` of `total`. Deterministic for a given RNG state. */
export function rollItem(rng: Rng, rank: number, total: number, set: ItemSet = 'all', battle = false): ItemId {
  let bucket = positionBucket(rank, total);
  if (battle) bucket = 2;
  const w = itemWeights(bucket, set);
  if (battle) {
    // Rocket dash and paper planes make no sense in arenas.
    for (let i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === 'rocketDash' || ITEMS[i].id === 'cloud') w[i] = 0;
  }
  const idx = rng.weighted(w);
  return idx < 0 ? 'turbo' : ITEMS[idx].id;
}
