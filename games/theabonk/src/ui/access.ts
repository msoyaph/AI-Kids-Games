import type { AccessSettings } from '../meta/save';

/** Reduced motion in effect: 'auto' follows the system setting. */
export function reducedMotionOn(a: AccessSettings): boolean {
  if (a.reducedMotion !== 'auto') return a.reducedMotion === 'on';
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Page-level classes the stylesheet keys off (interface size, contrast, motion, colours). */
export function applyAccessClasses(a: AccessSettings, reduced: boolean): void {
  const c = document.documentElement.classList;
  c.toggle('reduced-motion', reduced);
  c.toggle('large-text', a.largeText);
  c.toggle('high-contrast', a.highContrast);
  c.toggle('colorblind', a.colorblind);
}

/** Calls `fn` when the system reduced-motion preference changes (for 'auto'). */
export function watchReducedMotion(fn: () => void): void {
  try {
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', fn);
  } catch {
    /* old browsers / no matchMedia */
  }
}
