export const FAVORITES_KEY = 'aikidsgames.favorites';
export const RECENT_KEY = 'aikidsgames.recent';
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void; }
export function deviceStorage(): StorageLike | undefined { try { return window.localStorage; } catch { return undefined; } }
export function readList(key: string, storage: StorageLike | undefined, validSlugs: readonly string[]): string[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(key) || '[]');
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((item): item is string => typeof item === 'string' && validSlugs.includes(item)))].slice(0, key === RECENT_KEY ? 10 : validSlugs.length);
  } catch { return []; }
}
export function writeList(key: string, slugs: readonly string[], storage: StorageLike | undefined): boolean {
  try { if (!storage) return false; storage.setItem(key,JSON.stringify(slugs)); return true; } catch { return false; }
}
export function addRecent(slugs: readonly string[], slug: string) { return [slug,...slugs.filter(item => item !== slug)].slice(0,10); }
