/**
 * Safe localStorage wrapper. Every access is try/caught; when storage is blocked
 * (sandboxed iframe without same-origin, private mode) we fall back to memory so the
 * game still runs. A full storage area is reported, never thrown, and because
 * setItem is atomic per key the previous save stays intact.
 */
export const PREFIX = 'cliffvalley.';

export type WriteResult = { ok: true } | { ok: false; reason: 'quota' | 'blocked' | 'error' };

const memory = new Map<string, string>();
let mode: 'local' | 'memory' | null = null;

function ls(): Storage | null {
  try {
    const s = window.localStorage;
    if (!s) return null;
    const k = PREFIX + '__probe';
    s.setItem(k, '1');
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}

export function storageMode(): 'local' | 'memory' {
  if (mode) return mode;
  mode = typeof window !== 'undefined' && ls() ? 'local' : 'memory';
  return mode;
}

export function read(key: string): string | null {
  const k = PREFIX + key;
  if (storageMode() === 'memory') return memory.get(k) ?? null;
  try {
    return window.localStorage.getItem(k);
  } catch {
    return memory.get(k) ?? null;
  }
}

export function write(key: string, value: string): WriteResult {
  const k = PREFIX + key;
  if (storageMode() === 'memory') {
    memory.set(k, value);
    return { ok: true };
  }
  try {
    window.localStorage.setItem(k, value);
    return { ok: true };
  } catch (e) {
    const name = (e as { name?: string })?.name ?? '';
    const code = (e as { code?: number })?.code;
    if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || code === 22 || code === 1014) return { ok: false, reason: 'quota' };
    if (name === 'SecurityError') return { ok: false, reason: 'blocked' };
    return { ok: false, reason: 'error' };
  }
}

export function remove(key: string): void {
  const k = PREFIX + key;
  memory.delete(k);
  if (storageMode() === 'memory') return;
  try {
    window.localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

/** All of our keys with their sizes in bytes (UTF-16: 2 bytes/char). */
export function usage(): { key: string; bytes: number }[] {
  const out: { key: string; bytes: number }[] = [];
  if (storageMode() === 'memory') {
    for (const [k, v] of memory) out.push({ key: k, bytes: (k.length + v.length) * 2 });
    return out;
  }
  try {
    const s = window.localStorage;
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      out.push({ key: k, bytes: (k.length + (s.getItem(k)?.length ?? 0)) * 2 });
    }
  } catch {
    /* ignore */
  }
  return out;
}

/** Test helper: force memory mode (used by unit tests running in node). */
export function useMemoryStorage(): void {
  mode = 'memory';
  memory.clear();
}
