// "Add to Home" (Home's hero) puts Ai Kids Games on a phone or tablet's Home Screen. Chromium
// browsers (Chrome, Edge, Samsung Internet) hand over their own install prompt with
// beforeinstallprompt, which can fire before Home has loaded, so main.tsx imports this module at
// startup to keep it. Safari and the others have no prompt: the button shows the steps in the
// browser's own menu instead. Nothing is stored or sent anywhere.
import { useSyncExternalStore } from 'react';
import { standaloneDisplay, touchFirst } from './fullscreen';

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

let pending: InstallPrompt | null = null;
let installed = false;
const listeners = new Set<() => void>();
const changed = () => { for (const listener of listeners) listener(); };
if (typeof window !== 'undefined') {
  // Keep the prompt for the button, instead of a browser banner nobody asked for.
  window.addEventListener('beforeinstallprompt',event => { event.preventDefault(); pending = event as InstallPrompt; changed(); });
  window.addEventListener('appinstalled',() => { pending = null; installed = true; changed(); });
}

/** iPhone or iPad (iPadOS Safari says it is a Mac, but a Mac has no touch points). */
export const appleTouch = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

export type InstallWay = 'prompt' | 'apple' | 'menu';

/**
 * How this device adds the site to its Home Screen, or null when the button shouldn't show:
 * opened from the Home Screen already, just installed, or a computer (phones and tablets only).
 */
export function installWay(): InstallWay | null {
  if (installed || standaloneDisplay() || !touchFirst()) return null;
  if (pending) return 'prompt';
  return appleTouch() ? 'apple' : 'menu';
}

export const useInstallWay = () => useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },installWay,() => null);

/** Shows the browser's own install prompt. Each prompt can be shown once. */
export async function promptInstall() {
  const event = pending;
  if (!event) return;
  pending = null;
  await event.prompt();
  if ((await event.userChoice).outcome === 'accepted') installed = true;
  changed();
}
