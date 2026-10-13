/**
 * Safe, namespaced localStorage. The game shares the website's origin with other games, so:
 * - every key starts with GAME.storagePrefix, and nothing else is ever read, written or removed
 *   (no localStorage.clear(), no looping over other keys);
 * - every call is wrapped in try/catch, and when storage is blocked (private mode, a sandbox
 *   without same-origin) the game keeps working from memory and says progress won't be kept;
 * - saves carry a version and old versions are migrated, so players never lose progress
 *   (profile.ts and run.ts).
 */
import { GAME } from '../config';

const memory = new Map<string, string>();
let backing: Storage | null | undefined;

function storage(): Storage | null {
  if (backing !== undefined) return backing;
  try {
    const s = globalThis.localStorage;
    const probe = GAME.storagePrefix + '__probe';
    s.setItem(probe, '1');
    s.removeItem(probe);
    backing = s;
  } catch {
    backing = null;
  }
  return backing;
}

/** True when progress is kept between visits (false: memory only, for this visit). */
export const persistent = () => storage() !== null;

export function read(key: string): string | null {
  const k = GAME.storagePrefix + key;
  // What this visit wrote wins (a write that didn't reach full storage is still the latest).
  if (memory.has(k)) return memory.get(k)!;
  try { return storage()?.getItem(k) ?? null; } catch { return null; }
}

/** Returns false when the write failed (for example, storage is full); the old value stays on disk and the game goes on from memory. */
export function write(key: string, value: string): boolean {
  const k = GAME.storagePrefix + key;
  memory.set(k, value);
  try { storage()?.setItem(k, value); lastWriteFailed = false; return true; } catch { lastWriteFailed = true; return false; }
}

export function remove(key: string) {
  const k = GAME.storagePrefix + key;
  memory.delete(k);
  try { storage()?.removeItem(k); } catch { /* blocked: memory only */ }
}

let lastWriteFailed = false;
/** True after a write failed (for example, storage is full): the game says so once and keeps playing from memory. */
export const writeFailed = () => lastWriteFailed;

/** Test helper: forget the cached storage check (tests swap globalThis.localStorage). */
export function resetForTests() { backing = undefined; memory.clear(); lastWriteFailed = false; }
