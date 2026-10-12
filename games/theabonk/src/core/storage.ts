/**
 * localStorage wrapper that never throws. In a sandboxed iframe (opaque origin) or with
 * storage disabled, merely touching `window.localStorage` throws a SecurityError — in that
 * case we transparently fall back to an in-memory map so the game still runs.
 */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): boolean;
  remove(key: string): void;
  readonly persistent: boolean;
}

export class MemoryStore implements KeyValueStore {
  private map = new Map<string, string>();
  readonly persistent = false;
  get(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  set(key: string, value: string): boolean {
    this.map.set(key, value);
    return true;
  }
  remove(key: string): void {
    this.map.delete(key);
  }
}

export class SafeLocalStore implements KeyValueStore {
  private fallback = new MemoryStore();
  private ls: Storage | null;
  readonly persistent: boolean;

  constructor() {
    this.ls = SafeLocalStore.probe();
    this.persistent = this.ls !== null;
  }

  private static probe(): Storage | null {
    try {
      if (typeof window === 'undefined') return null;
      const ls = window.localStorage;
      const k = '__theabonk_probe__';
      ls.setItem(k, '1');
      ls.removeItem(k);
      return ls;
    } catch {
      return null;
    }
  }

  get(key: string): string | null {
    if (this.ls) {
      try {
        return this.ls.getItem(key);
      } catch {
        /* fall through */
      }
    }
    return this.fallback.get(key);
  }

  set(key: string, value: string): boolean {
    this.fallback.set(key, value);
    if (this.ls) {
      try {
        this.ls.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  remove(key: string): void {
    this.fallback.remove(key);
    if (this.ls) {
      try {
        this.ls.removeItem(key);
      } catch {
        /* ignore */
      }
    }
  }
}
