/**
 * The land as the renderer sees it, a little bigger than the town: countryside on the west, east and
 * south (low green hills further out) and the bay to the north, with a sandy beach along the curving
 * shore. The sim never sees any of this; town tiles stay flat at y = 0, so taps and placing work on a
 * plain grid. (The approach, one height function for the ground, the scenery and the people, follows
 * games/fieldlark/src/render/land.ts; the shapes are the town's own.)
 */
import { noise } from '../core/rng';
import { BEACH, H, inland, W, WATER_Y } from '../sim/map';

/** Tiles of countryside drawn around the town on every side. */
export const RING = 24;
/** The drawn world: x and z from WORLD0 to WORLD0 + SPAN. */
export const WORLD0 = -RING;
export const SPAN = Math.max(W, H) + 2 * RING;

/** How far a point is outside the town (0 inside). */
export function outside(x: number, z: number) {
  const dx = Math.max(0, -x, x - W), dz = Math.max(0, -z, z - H);
  return Math.hypot(dx, dz);
}

const smooth = (t: number) => t * t * (3 - 2 * t);
export function vnoise(x: number, z: number, seed: number) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = smooth(x - ix), fz = smooth(z - iz);
  const a = noise(ix, iz, seed), b = noise(ix + 1, iz, seed), c = noise(ix, iz + 1, seed), d = noise(ix + 1, iz + 1, seed);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

/** Rolling hills out in the countryside, rising slowly away from the town and never near the shore. */
export function hill(x: number, z: number): number {
  const d = outside(x, z);
  if (d <= 0) return 0;
  const amp = 0.6 + 2.6 * vnoise(x * 0.07, z * 0.07, 91) + 1.0 * vnoise(x * 0.16, z * 0.16, 92);
  const rise = smooth(Math.min(1, Math.max(0, (d - 2) / 16)));
  const shore = smooth(Math.min(1, Math.max(0, (inland(x, z) - BEACH - 2) / 8)));
  return rise * amp * shore;
}

/** The sea bed and the beach: the ground's height near the water. */
function shoreY(d: number): number {
  if (d >= BEACH) return 0;
  if (d >= 0) {
    // the beach slopes from the grass down into the shallows
    const t = d / BEACH;
    return (WATER_Y - 0.05) * (1 - smooth(t));
  }
  // out in the bay the bed drops away
  return WATER_Y - 0.05 - smooth(Math.min(1, -d / 3.5)) * 0.75;
}

/** The ground height anywhere (for the ground mesh, scenery and people). */
export function groundY(x: number, z: number): number {
  const d = inland(x, z);
  if (d < BEACH) return shoreY(d);
  return hill(x, z);
}

/** Tiles near the shore are cut finer, so the beach curves. */
export const nearShore = (x: number, z: number) => Math.abs(inland(x + 0.5, z + 0.5) - BEACH / 2) < BEACH + 1.2;
