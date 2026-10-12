// Seeded, deterministic RNG (sfc32). All sim randomness flows through this so races replay exactly.

export function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export class Rng {
  private a = 0;
  private b = 0;
  private c = 0;
  private d = 0;

  constructor(seed: number | string = 1) {
    this.reseed(seed);
  }

  reseed(seed: number | string): void {
    const s = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
    this.a = 0x9e3779b9;
    this.b = 0x243f6a88;
    this.c = 0xb7e15162;
    this.d = s ^ 0xdeadbeef;
    for (let i = 0; i < 15; i++) this.nextU32();
  }

  /** Snapshot for replays/debugging. */
  getState(): [number, number, number, number] {
    return [this.a, this.b, this.c, this.d];
  }

  setState(st: readonly [number, number, number, number]): void {
    [this.a, this.b, this.c, this.d] = st;
  }

  nextU32(): number {
    this.a >>>= 0;
    this.b >>>= 0;
    this.c >>>= 0;
    this.d >>>= 0;
    let t = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    t = (t + this.d) | 0;
    this.c = (this.c + t) | 0;
    return t >>> 0;
  }

  /** [0, 1) */
  next(): number {
    return this.nextU32() / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(minInclusive: number, maxInclusive: number): number {
    return minInclusive + Math.floor(this.next() * (maxInclusive - minInclusive + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** Pick an index by non-negative weights. Returns -1 if all weights are zero. */
  weighted(weights: ArrayLike<number>): number {
    let total = 0;
    for (let i = 0; i < weights.length; i++) total += Math.max(0, weights[i]);
    if (total <= 0) return -1;
    let r = this.next() * total;
    for (let i = 0; i < weights.length; i++) {
      const w = Math.max(0, weights[i]);
      if (r < w) return i;
      r -= w;
    }
    return weights.length - 1;
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }
}
