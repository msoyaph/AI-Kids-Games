/**
 * localStorage wrapper. Every call is wrapped in try/catch: storage can be missing, full,
 * or blocked (private mode, sandboxed iframes). When it fails we keep data in memory so the
 * game still works for this visit.
 */
const memory = new Map<string, string>();
let available: boolean | null = null;

export function storageAvailable(): boolean {
  if (available !== null) return available;
  try {
    const k = '__spacesky_probe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    available = true;
  } catch {
    available = false;
  }
  return available;
}

export function readKey(key: string): string | null {
  try {
    if (storageAvailable()) return window.localStorage.getItem(key);
  } catch {
    /* fall through */
  }
  return memory.get(key) ?? null;
}

export function writeKey(key: string, value: string): boolean {
  memory.set(key, value);
  try {
    if (storageAvailable()) {
      window.localStorage.setItem(key, value);
      return true;
    }
  } catch {
    /* quota or blocked */
  }
  return false;
}

export function removeKey(key: string): void {
  memory.delete(key);
  try {
    if (storageAvailable()) window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function readJson<T>(key: string): T | null {
  const raw = readKey(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
