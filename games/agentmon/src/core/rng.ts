/**
 * Seeded, deterministic RNG (mulberry32, as in Cliff Valley) whose state can be saved and restored,
 * plus hashing helpers. Every random roll in the game goes through one of these, so battles,
 * encounters and simulations replay exactly from a seed.
 */

export function hash32(...nums: number[]): number {
  let h = 0x811c9dc5 | 0;
  for (let i = 0; i < nums.length; i++) {
    let k = nums[i]! | 0;
    k = Math.imul(k ^ (k >>> 16), 0x85ebca6b);
    k = Math.imul(k ^ (k >>> 13), 0xc2b2ae35);
    k ^= k >>> 16;
    h = Math.imul(h ^ k, 0x01000193);
    h ^= h >>> 15;
  }
  return h >>> 0;
}

export function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0 || 0x9e3779b9;
  }
  /** The internal state, to save and later restore with `new Rng(0).restore(state)`. */
  get state(): number {
    return this.s;
  }
  restore(state: number): this {
    this.s = state >>> 0;
    return this;
  }
  /** Float in [0, 1). */
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** Integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
  /** Integer in [a, b] inclusive. */
  range(a: number, b: number): number {
    return a + Math.floor(this.next() * (b - a + 1));
  }
  /** Float in [a, b). */
  float(a: number, b: number): number {
    return a + this.next() * (b - a);
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]!;
  }
  /** Weighted pick: weights parallel to items. */
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    let total = 0;
    for (const w of weights) total += Math.max(0, w);
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= Math.max(0, weights[i]!);
      if (r < 0) return items[i]!;
    }
    return items[items.length - 1]!;
  }
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const t = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = t;
    }
    return arr;
  }
}

export function rngFor(...keys: number[]): Rng {
  return new Rng(hash32(...keys));
}
