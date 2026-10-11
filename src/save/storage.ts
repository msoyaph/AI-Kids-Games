// Safe localStorage wrapper: every access is try/catch'd, and if storage is unavailable
// (sandboxed iframe without same-origin, private mode, quota) we fall back to memory so the game still runs.

const memory = new Map<string, string>();
let available: boolean | null = null;

export function storageAvailable(): boolean {
  if (available !== null) return available;
  try {
    const k = 'calexcart.__probe'; // only ever touch our own prefix
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

/** 'ok' = in localStorage, 'memory' = storage unavailable so kept for this visit only, 'full' = quota exceeded. */
export type WriteStatus = 'ok' | 'memory' | 'full';

export function writeKeyStatus(key: string, value: string): WriteStatus {
  if (!storageAvailable()) {
    memory.set(key, value);
    return 'memory';
  }
  try {
    // setItem is atomic: on failure the previous value stays intact.
    window.localStorage.setItem(key, value);
    return 'ok';
  } catch {
    return 'full';
  }
}

/** Returns false only if the write failed because storage is full. */
export function writeKey(key: string, value: string): boolean {
  return writeKeyStatus(key, value) !== 'full';
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
