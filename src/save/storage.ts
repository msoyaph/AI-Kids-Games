// Safe localStorage wrapper: every access is try/catch'd, and if storage is unavailable
// (sandboxed iframe without same-origin, private mode, quota) we fall back to memory so the game still runs.

const memory = new Map<string, string>();
let available: boolean | null = null;

export function storageAvailable(): boolean {
  if (available !== null) return available;
  try {
    const k = '__calex_probe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    available = true;
  } catch {
    available = false;
  }
  return available;
}

export function readKey(key: string): string | null {
  if (storageAvailable()) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      /* fall through */
    }
  }
  return memory.get(key) ?? null;
}

/** Returns false if the write failed (e.g. quota). */
export function writeKey(key: string, value: string): boolean {
  memory.set(key, value);
  if (!storageAvailable()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  memory.delete(key);
  if (!storageAvailable()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
