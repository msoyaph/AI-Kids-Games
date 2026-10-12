export const TILE = 16;

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const approach = (v: number, target: number, step: number): number =>
  v < target ? Math.min(target, v + step) : Math.max(target, v - step);

export type Dir = 0 | 1 | 2 | 3; // 0 down, 1 left, 2 right, 3 up
export const DIR_DX = [0, -1, 1, 0] as const;
export const DIR_DY = [1, 0, 0, -1] as const;

export function dirFromVec(dx: number, dy: number, fallback: Dir): Dir {
  if (dx === 0 && dy === 0) return fallback;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 1 : 2;
  return dy < 0 ? 3 : 0;
}

export const tileOf = (px: number): number => Math.floor(px / TILE);

export function chebyshev(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

/** Format game minutes (from midnight, may exceed 1440) as a friendly clock string. */
export function formatClock(min: number): string {
  const m = Math.floor(min) % 1440;
  let h = Math.floor(m / 60);
  const mm = Math.floor((m % 60) / 10) * 10;
  const am = h < 12;
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mm.toString().padStart(2, '0')} ${am ? 'am' : 'pm'}`;
}
