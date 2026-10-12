/**
 * Fullscreen for the play page: the standard API plus Safari's webkit-prefixed one (iPad Safari
 * before 16.4), Android orientation locking, and the iPhone / Home Screen checks. Everything is
 * feature-detected; nothing here throws.
 */
type PrefixedDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type PrefixedElement = HTMLElement & { webkitRequestFullscreen?: (options?: unknown) => Promise<void> | void };
type LockableOrientation = ScreenOrientation & { lock?: (orientation: string) => Promise<void> };

const doc = () => document as PrefixedDocument;

/** The browser can make a page element fullscreen (iPhone Safari can't, so the button hides there). */
export function fullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const d = doc(), probe = document.documentElement as PrefixedElement;
  const standard = d.fullscreenEnabled === true && typeof probe.requestFullscreen === 'function';
  const prefixed = d.webkitFullscreenEnabled === true && typeof probe.webkitRequestFullscreen === 'function';
  return standard || prefixed;
}

export function fullscreenElement(): Element | null {
  const d = doc();
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

export async function enterFullscreen(element: HTMLElement): Promise<void> {
  const el = element as PrefixedElement;
  if (typeof el.requestFullscreen === 'function' && doc().fullscreenEnabled) await el.requestFullscreen({ navigationUI: 'hide' });
  else if (typeof el.webkitRequestFullscreen === 'function') await el.webkitRequestFullscreen();
  else throw new Error('Fullscreen is not supported');
}

export async function exitFullscreen(): Promise<void> {
  const d = doc();
  if (d.fullscreenElement && typeof d.exitFullscreen === 'function') await d.exitFullscreen();
  else if (d.webkitFullscreenElement && typeof d.webkitExitFullscreen === 'function') await d.webkitExitFullscreen();
}

/** Calls `change` whenever fullscreen starts or ends, however it ends (Esc, swipe, back gesture). */
export function onFullscreenChange(change: () => void): () => void {
  document.addEventListener('fullscreenchange',change);
  document.addEventListener('webkitfullscreenchange',change);
  return () => { document.removeEventListener('fullscreenchange',change); document.removeEventListener('webkitfullscreenchange',change); };
}

export const isAndroid = () => typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

/**
 * On Android, hold the game's orientation while fullscreen (the browser only allows it then).
 * Resolves true if the lock took; any refusal is fine — the game shows its own rotate prompt.
 */
export async function lockOrientation(orientation: 'any' | 'landscape' | 'portrait'): Promise<boolean> {
  if (orientation === 'any' || !isAndroid()) return false;
  try {
    const o = screen.orientation as LockableOrientation | undefined;
    if (!o || typeof o.lock !== 'function') return false;
    await o.lock(orientation);
    return true;
  } catch { return false; }
}

export function unlockOrientation(): void {
  try { screen.orientation?.unlock?.(); } catch { /* not locked, or not supported */ }
}

/** Opened from the Home Screen (iOS web app or an installed app), not in a browser tab. */
export function standaloneDisplay(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || (typeof matchMedia === 'function' && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches));
}

/** iPhone / iPod Safari (or another iPhone browser): no element fullscreen, Home Screen web apps instead. */
export function iPhoneSafari(): boolean {
  return typeof navigator !== 'undefined' && /iPhone|iPod/i.test(navigator.userAgent) && 'standalone' in navigator && !fullscreenSupported();
}

/** A finger is the primary pointer (phones and tablets). */
export const touchFirst = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
