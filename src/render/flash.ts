/**
 * Flash safety. Every blinking / pulsing visual goes through these helpers, which never
 * exceed MAX_FLASH_HZ (3 flashes a second — the photosensitivity guideline). With reduced
 * motion on, blinks hold steady instead.
 */

export const MAX_FLASH_HZ = 3;

/** Every registered flashing effect and its rate (Hz). A unit test samples each one. */
export const FLASH_EFFECTS = {
  /** Player invulnerability after a hit. */
  iframes: 2.5,
  /** Fusewick about to explode. */
  fuse: 3,
  /** Boss slam / icicle warning circles. */
  slamWarn: 2.5,
  /** Elite glow (smooth pulse). */
  elite: 0.95,
  /** Red hurt vignette (at most this often). */
  hurtVignette: 2.5,
  /** Touch stick rim flash when Thea is hurt (at most this often). */
  stickHurt: 2.5,
} as const;

export type FlashEffect = keyof typeof FLASH_EFFECTS;

let steady = false;

/** Reduced motion: blinks hold steady (on) and pulses sit at their midpoint. */
export function setFlashSteady(on: boolean): void {
  steady = on;
}

export function flashSteady(): boolean {
  return steady;
}

function hz(effect: FlashEffect): number {
  return Math.min(FLASH_EFFECTS[effect], MAX_FLASH_HZ);
}

/** Square wave: 1 for the first half of each cycle, 0 for the second. */
export function blink(time: number, effect: FlashEffect): number {
  if (steady) return 1;
  return (time * hz(effect)) % 1 < 0.5 ? 1 : 0;
}

/** Smooth 0..1 pulse at the effect's rate. */
export function pulse(time: number, effect: FlashEffect): number {
  if (steady) return 0.5;
  return 0.5 + 0.5 * Math.sin(time * hz(effect) * Math.PI * 2);
}

/** Minimum seconds between two flashes of an effect (rate limiter for event-driven flashes). */
export function minInterval(effect: FlashEffect): number {
  return 1 / hz(effect);
}
