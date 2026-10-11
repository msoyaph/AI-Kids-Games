import { S } from './services';

/** True when the device asks for less motion (Comfort mode follows it unless the player chose). */
export function prefersReducedMotion(): boolean {
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Comfort mode: fewer speed effects, no camera shake, smaller banking, shorter warps. */
export function comfortOn(): boolean {
  const c = S.settings?.comfort;
  return c === null || c === undefined ? prefersReducedMotion() : c;
}
