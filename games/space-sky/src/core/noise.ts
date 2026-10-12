/**
 * Small, fast 3D value noise for CPU-side shape work (lumpy moons, asteroid rocks, terrain).
 * Deterministic for a given seed. Not used in hot loops.
 */
function hash3(x: number, y: number, z: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + seed * 974634971) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

const fade = (t: number) => t * t * (3 - 2 * t);

export function valueNoise3(x: number, y: number, z: number, seed = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = fade(x - xi);
  const yf = fade(y - yi);
  const zf = fade(z - zi);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, seed);
  const x00 = l(c(0, 0, 0), c(1, 0, 0), xf);
  const x10 = l(c(0, 1, 0), c(1, 1, 0), xf);
  const x01 = l(c(0, 0, 1), c(1, 0, 1), xf);
  const x11 = l(c(0, 1, 1), c(1, 1, 1), xf);
  return l(l(x00, x10, yf), l(x01, x11, yf), zf) * 2 - 1;
}

/** Fractal value noise in about [-1, 1]. */
export function fbm3(x: number, y: number, z: number, octaves = 4, seed = 0): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise3(x * f, y * f, z * f, seed + i * 17);
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}
