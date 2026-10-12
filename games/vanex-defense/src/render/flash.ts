/**
 * Flash safety (WCAG 2.3.1 "three flashes"): nothing on screen may flash more
 * than 3 times in any one-second window.
 *
 * - Big bright bursts (meteor, boss phase, terrain shift…) ask a shared
 *   `FlashLimiter`; when the budget is used up they play dimmed instead.
 * - Repeating effects (telegraphs, beams) use `pulse()`, a smooth sine at a
 *   capped rate, never a hard on/off toggle.
 * - Per-object hit tints are spaced at least `MIN_FLASH_GAP` apart.
 */
export const MAX_FLASHES_PER_SECOND = 3;
/** Seconds between two hit flashes on the same object (≤ 3 per second). */
export const MIN_FLASH_GAP = 0.34;
/** Fastest allowed repeating pulse (Hz). */
export const MAX_PULSE_HZ = 2;

export class FlashLimiter {
  /** Times (s) of the most recent allowed flashes, as a ring. */
  private readonly ring: Float64Array;
  private head = 0;
  allowed = 0;
  dimmed = 0;

  constructor(readonly perSecond = MAX_FLASHES_PER_SECOND) {
    this.ring = new Float64Array(perSecond).fill(-Infinity);
  }

  /** True if a full-brightness flash may play at time `now` (seconds). */
  allow(now: number): boolean {
    // the oldest of the last N flashes must be a full second ago
    if (now - this.ring[this.head]! < 1) {
      this.dimmed++;
      return false;
    }
    this.ring[this.head] = now;
    this.head = (this.head + 1) % this.perSecond;
    this.allowed++;
    return true;
  }

  reset(): void {
    this.ring.fill(-Infinity);
    this.head = 0;
  }
}

/** Smooth 0..1 pulse at `hz` (capped at MAX_PULSE_HZ). */
export function pulse(t: number, hz: number): number {
  const f = Math.min(hz, MAX_PULSE_HZ);
  return 0.5 - 0.5 * Math.cos(t * f * Math.PI * 2);
}

/** Blend two 0xRRGGBB colours (k = 0 → a, 1 → b). */
export function mixColor(a: number, b: number, k: number): number {
  const r = ((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * k;
  const g = ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * k;
  const bl = (a & 255) + ((b & 255) - (a & 255)) * k;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}
