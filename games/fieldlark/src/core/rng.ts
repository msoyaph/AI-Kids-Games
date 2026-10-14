/**
 * Seeded randomness. The sim never calls Math.random: every roll comes from a seed kept in the
 * save, so a farm replays the same way in tests, in the playthrough bot and after a reload.
 */

/** mulberry32: one step of a 32-bit generator. Returns [value in 0..1, next state]. */
export function next(state: number): [number, number] {
  const s = (state + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

/** A small stateful generator for code that owns its own stream (map decoration, models). */
export class Rng {
  constructor(public state: number) {}
  float(): number { const [v, s] = next(this.state); this.state = s; return v; }
  range(min: number, max: number): number { return min + (max - min) * this.float(); }
  int(min: number, maxInclusive: number): number { return min + Math.floor(this.float() * (maxInclusive - min + 1)); }
  pick<T>(items: readonly T[]): T { return items[Math.floor(this.float() * items.length)]!; }
  chance(p: number): boolean { return this.float() < p; }
}

/** A stable hash of integers, for per-tile or per-day streams that don't depend on call order. */
export function hashInts(...values: number[]): number {
  let h = 0x811c9dc5;
  for (const v of values) {
    h ^= v | 0;
    h = Math.imul(h, 0x01000193) >>> 0;
    h ^= h >>> 13;
  }
  return h >>> 0;
}

/** A value in 0..1 from integers: the same inputs always give the same value. */
export const noise = (...values: number[]) => next(hashInts(...values))[0];
