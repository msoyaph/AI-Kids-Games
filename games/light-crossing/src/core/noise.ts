import { hash01 } from './rng';

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Seeded 2D value noise in [-1,1]. */
export function valueNoise2(seed: number, x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const v00 = hash01(seed, xi, yi);
  const v10 = hash01(seed, xi + 1, yi);
  const v01 = hash01(seed, xi, yi + 1);
  const v11 = hash01(seed, xi + 1, yi + 1);
  const a = v00 + (v10 - v00) * xf;
  const b = v01 + (v11 - v01) * xf;
  return (a + (b - a) * yf) * 2 - 1;
}

/** Seeded 1D value noise in [-1,1]. */
export function valueNoise1(seed: number, x: number): number {
  const xi = Math.floor(x);
  const t = smooth(x - xi);
  const a = hash01(seed, xi, 7);
  const b = hash01(seed, xi + 1, 7);
  return (a + (b - a) * t) * 2 - 1;
}

/** Fractal value noise, roughly in [-1,1]. */
export function fbm2(seed: number, x: number, y: number, octaves = 4): number {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise2(seed + o * 1013, x * freq, y * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

export function fbm1(seed: number, x: number, octaves = 3): number {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise1(seed + o * 733, x * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}
