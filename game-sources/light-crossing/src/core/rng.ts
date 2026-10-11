// Seeded random number generation. Everything that must be reproducible
// (world generation, daily rolls, spawns) goes through these helpers.

/** FNV-1a 32-bit string hash. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mix several integers into one well-distributed uint32. */
export function hashInts(...xs: number[]): number {
  let h = 0x9e3779b9;
  for (const x of xs) {
    h ^= Math.imul((x | 0) ^ 0x85ebca6b, 0xc2b2ae35);
    h = Math.imul((h << 13) | (h >>> 19), 5) + 0xe6546b64;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Deterministic float in [0,1) from integer coordinates + seed. */
export function hash01(...xs: number[]): number {
  return hashInts(...xs) / 4294967296;
}

function splitmix32(a: number): () => number {
  return () => {
    a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return (t ^ (t >>> 15)) >>> 0;
  };
}

/** Small fast PRNG (sfc32) with convenience helpers. */
export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed: number | string) {
    const s = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
    const sm = splitmix32(s);
    this.a = sm();
    this.b = sm();
    this.c = sm();
    this.d = sm();
    for (let i = 0; i < 12; i++) this.nextU32();
  }

  nextU32(): number {
    const t = (((this.a + this.b) | 0) + this.d) | 0;
    this.d = (this.d + 1) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.c = (this.c + t) | 0;
    return t >>> 0;
  }

  /** Float in [0,1). */
  next(): number {
    return this.nextU32() / 4294967296;
  }

  /** Float in [min,max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Integer in [min,max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('Rng.pick on empty array');
    return arr[Math.floor(this.next() * arr.length)]!;
  }

  /** Pick using a weight function; returns undefined for empty / all-zero weights. */
  weighted<T>(arr: readonly T[], weight: (t: T) => number): T | undefined {
    let total = 0;
    for (const t of arr) total += Math.max(0, weight(t));
    if (total <= 0) return undefined;
    let r = this.next() * total;
    for (const t of arr) {
      r -= Math.max(0, weight(t));
      if (r < 0) return t;
    }
    return arr[arr.length - 1];
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const tmp = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = tmp;
    }
    return arr;
  }

  /** Independent child stream, stable for a given label. */
  fork(label: string | number): Rng {
    const l = typeof label === 'string' ? hashString(label) : label;
    return new Rng(hashInts(this.a, this.b, this.c, this.d, l));
  }

  getState(): [number, number, number, number] {
    return [this.a, this.b, this.c, this.d];
  }

  setState(s: [number, number, number, number]): void {
    [this.a, this.b, this.c, this.d] = s;
  }
}

/** Convenience: an Rng for a named purpose on a specific day. */
export function dayRng(seed: number, day: number, purpose: string): Rng {
  return new Rng(hashInts(seed, day, hashString(purpose)));
}
