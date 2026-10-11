/**
 * Small, fast, seedable PRNG (sfc32). Every gameplay-affecting random roll goes through
 * an Rng instance so a run can be reproduced from its seed + inputs.
 */
export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;
  readonly seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    // splitmix32 to expand the seed into four state words
    let s = this.seed;
    const next = (): number => {
      s = (s + 0x9e3779b9) >>> 0;
      let z = s;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
      return (z ^ (z >>> 16)) >>> 0;
    };
    this.a = next();
    this.b = next();
    this.c = next();
    this.d = next();
    for (let i = 0; i < 12; i++) this.nextU32();
  }

  nextU32(): number {
    const t = (((this.a + this.b) >>> 0) + this.d) >>> 0;
    this.d = (this.d + 1) >>> 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) >>> 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.c = (this.c + t) >>> 0;
    return t;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    return this.nextU32() / 4294967296;
  }

  /** Uniform float in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Uniform integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)];
  }

  /** Picks an index from a weight list. Returns -1 if all weights are <= 0. */
  weightedIndex(weights: ArrayLike<number>, count = weights.length): number {
    let total = 0;
    for (let i = 0; i < count; i++) if (weights[i] > 0) total += weights[i];
    if (total <= 0) return -1;
    let r = this.next() * total;
    for (let i = 0; i < count; i++) {
      const w = weights[i];
      if (w <= 0) continue;
      r -= w;
      if (r < 0) return i;
    }
    for (let i = count - 1; i >= 0; i--) if (weights[i] > 0) return i;
    return -1;
  }

  /** Snapshot / restore internal state (useful for tests and replays). */
  getState(): [number, number, number, number] {
    return [this.a, this.b, this.c, this.d];
  }

  setState(s: [number, number, number, number]): void {
    [this.a, this.b, this.c, this.d] = s;
  }
}

export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}
