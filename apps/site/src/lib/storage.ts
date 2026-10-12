export const FAVORITES_KEY = 'aikg:favorites';
export const RECENT_KEY = 'aikg:recent';
export const LEGACY_FAVORITES_KEY = 'aikidsgames.favorites';
export const LEGACY_RECENT_KEY = 'aikidsgames.recent';
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void; }
export function deviceStorage(): StorageLike | undefined { try { return window.localStorage; } catch { return undefined; } }
function parseList(raw: string | null, validSlugs: readonly string[]): string[] {
  try {
    const parsed: unknown = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && validSlugs.includes(item)) : [];
  } catch { return []; }
}
export function readList(key: string, storage: StorageLike | undefined, validSlugs: readonly string[]): string[] {
  try {
    if (!storage) return [];
    const legacy = key === FAVORITES_KEY ? LEGACY_FAVORITES_KEY : key === RECENT_KEY ? LEGACY_RECENT_KEY : undefined;
    const oldRaw = legacy ? storage.getItem(legacy) : null;
    const next = [...new Set([...parseList(storage.getItem(key),validSlugs),...parseList(oldRaw,validSlugs)])].slice(0,key === RECENT_KEY ? 10 : validSlugs.length);
    // Keep legacy data if writing fails, so a later visit can retry the migration.
    if (legacy && oldRaw !== null && writeList(key,next,storage)) {
      try { storage.removeItem(legacy); } catch { /* New copy is already durable. */ }
    }
    return next;
  } catch { return []; }
}
export function writeList(key: string, slugs: readonly string[], storage: StorageLike | undefined): boolean {
  try { if (!storage) return false; storage.setItem(key,JSON.stringify(slugs)); return true; } catch { return false; }
}
export function addRecent(slugs: readonly string[], slug: string) { return [slug,...slugs.filter(item => item !== slug)].slice(0,10); }
