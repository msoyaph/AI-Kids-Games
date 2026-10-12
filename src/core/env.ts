/** Runtime environment probes (all exception-safe). */

export function inIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function urlParam(name: string): string | null {
  try {
    return new URLSearchParams(location.search).get(name);
  } catch {
    return null;
  }
}

/** True for keyboard events aimed at a text field the player is typing into. */
export function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t instanceof HTMLTextAreaElement) return true;
  if (t instanceof HTMLInputElement) return t.type === 'text' || t.type === 'number' || t.type === 'search';
  return t.isContentEditable;
}
