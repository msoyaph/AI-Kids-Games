/**
 * The barn: items by star quality (1, 2 or 3 stars). Nothing in the barn ever spoils. The barn has
 * a size; when it is full, harvests wait in the field (they never spoil there either) until there
 * is room.
 */
import { TUNING } from '../data/tuning';
import type { Farm } from './state';

export type Stars = 1 | 2 | 3;
export type Stack = [number, number, number];

export const barnCap = (farm: Farm) => TUNING.barnCap[Math.min(farm.barnLevel, TUNING.barnCap.length - 1)]!;

export function count(farm: Farm, id: string, stars?: Stars): number {
  const s = farm.inv[id];
  if (!s) return 0;
  return stars ? s[stars - 1] : s[0] + s[1] + s[2];
}

/** Everything in the barn (supplies like compost count too: they take room). */
export function totalItems(farm: Farm): number {
  let n = 0;
  for (const s of Object.values(farm.inv)) n += s[0] + s[1] + s[2];
  return n;
}

export const roomLeft = (farm: Farm) => Math.max(0, barnCap(farm) - totalItems(farm));

export function add(farm: Farm, id: string, stars: Stars, n: number) {
  if (n <= 0) return;
  const s = (farm.inv[id] ??= [0, 0, 0]);
  s[stars - 1] += n;
}

/** Takes `n` of an item, best stars last unless `stars` says which. Returns false (and takes nothing) if there aren't enough. */
export function take(farm: Farm, id: string, n: number, stars?: Stars): boolean {
  const s = farm.inv[id];
  if (!s || n <= 0) return n <= 0;
  if (stars) {
    if (s[stars - 1] < n) return false;
    s[stars - 1] -= n;
  } else {
    if (s[0] + s[1] + s[2] < n) return false;
    let left = n;
    for (let i = 0; i < 3 && left > 0; i++) { const k = Math.min(s[i]!, left); s[i] -= k; left -= k; }
  }
  if (s[0] + s[1] + s[2] === 0) delete farm.inv[id];
  return true;
}

/** The best star level held of an item (0 if none). */
export function bestStars(farm: Farm, id: string): 0 | Stars {
  const s = farm.inv[id];
  if (!s) return 0;
  return s[2] ? 3 : s[1] ? 2 : s[0] ? 1 : 0;
}
