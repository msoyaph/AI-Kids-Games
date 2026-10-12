import type { Settings } from './save';

/** Text size choices (multiplier for every UI font size). */
export const TEXT_SCALES = [1, 1.15, 1.3] as const;

const media = (q: string): MediaQueryList | null => {
  try {
    return globalThis.matchMedia?.(q) ?? null;
  } catch {
    return null;
  }
};

/** Reduced motion: the player's choice, or the system setting when 'auto'. */
export function motionReduced(s: Pick<Settings, 'reducedMotion'>): boolean {
  if (s.reducedMotion === 'on') return true;
  if (s.reducedMotion === 'off') return false;
  return !!media('(prefers-reduced-motion: reduce)')?.matches;
}

/**
 * Apply display-accessibility settings to the page: `--ts` scales every UI
 * font size, `.hc` switches to the high-contrast palette, `.rm` stops
 * decorative animation (CSS) — the renderer reads `motionReduced()` itself.
 */
export function applyA11y(s: Settings): void {
  const root = document.documentElement;
  const ts = TEXT_SCALES.includes(s.textScale as (typeof TEXT_SCALES)[number]) ? s.textScale : 1;
  root.style.setProperty('--ts', String(ts));
  root.classList.toggle('large-text', ts > 1);
  root.classList.toggle('hc', !!s.highContrast);
  root.classList.toggle('rm', motionReduced(s));
}

/** Re-apply when the system's reduced-motion preference changes (for 'auto'). */
export function watchSystemMotion(onChange: () => void): () => void {
  const m = media('(prefers-reduced-motion: reduce)');
  if (!m) return () => {};
  m.addEventListener?.('change', onChange);
  return () => m.removeEventListener?.('change', onChange);
}
