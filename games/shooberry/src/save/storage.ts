/**
 * Safe, namespaced localStorage. The game shares the website's origin with other games, so:
 * - every key starts with GAME.storagePrefix, and nothing else is ever read, written or removed
 *   (no localStorage.clear(), no looping over other keys);
 * - every call is wrapped in try/catch, and when storage is blocked (private mode, a sandbox
 *   without same-origin) the game keeps working from memory and says progress won't be kept;
 * - saves carry a version and old versions are migrated (save.ts), so players never lose progress.
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
  try { return storage()?.getItem(k) ?? memory.get(k) ?? null; } catch { return memory.get(k) ?? null; }
}

/** Returns false when the write failed (for example, storage is full); the old value stays. */
export function write(key: string, value: string): boolean {
  const k = GAME.storagePrefix + key;
  memory.set(k, value);
  try { storage()?.setItem(k, value); return true; } catch { return false; }
}

/** Removes one of this game's own keys (the player's "start over"). */
export function remove(key: string) {
  const k = GAME.storagePrefix + key;
  memory.delete(k);
  try { storage()?.removeItem(k); } catch { /* storage blocked: the memory copy is gone */ }
}

/** Test helper: forget the cached storage check (tests swap globalThis.localStorage). */
export function resetForTests() { backing = undefined; memory.clear(); }
