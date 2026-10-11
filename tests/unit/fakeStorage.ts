// A localStorage stand-in with an optional quota (counted like browsers do: UTF-16 bytes of keys + values).
export class FakeStorage {
  map = new Map<string, string>();
  constructor(public quotaBytes = Infinity) {}
  get length(): number {
    return this.map.size;
  }
  bytes(): number {
    let c = 0;
    for (const [k, v] of this.map) c += k.length + v.length;
    return c * 2;
  }
  key(i: number): string | null {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    const old = this.map.get(k);
    const next = this.bytes() - (old !== undefined ? (k.length + old.length) * 2 : 0) + (k.length + String(v).length) * 2;
    if (next > this.quotaBytes) {
      const e = new Error('QuotaExceededError');
      e.name = 'QuotaExceededError';
      throw e;
    }
    this.map.set(k, String(v));
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
  clear(): void {
    this.map.clear();
  }
}

/** Install a fake `window.localStorage` (call before importing src/save modules in a test file). */
export function installFakeStorage(store: FakeStorage): void {
  const g = globalThis as unknown as Record<string, unknown>;
  g.window = { localStorage: store, addEventListener: () => {} };
  g.document = { addEventListener: () => {}, hidden: false };
}
