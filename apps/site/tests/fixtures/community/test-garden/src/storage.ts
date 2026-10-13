/**
 * Safe, namespaced localStorage. The game shares the website's origin with other games, so:
 * - every key starts with GAME.storagePrefix, and nothing else is ever read, written or removed
 *   (no localStorage.clear(), no looping over other keys);
 * - every call is wrapped in try/catch, and when storage is blocked (private mode, a sandbox
 *   without same-origin) the game keeps working from memory and says progress won't be kept;
 * - saves carry a version and old versions are migrated, so players never lose progress.
 */
import { GAME } from './config';

export interface Save { v: 2; best: number; plays: number; sound: boolean }
export const SAVE_VERSION = 2;
export const SAVE_KEY = 'save';
const DEFAULT: Save = { v: 2, best: 0, plays: 0, sound: true };

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

/** Upgrade any older save to the current version. v1 only stored { best }. */
export function migrate(raw: unknown): Save {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT };
  const data = raw as Record<string, unknown>;
  const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0);
  if (data.v === undefined || data.v === 1) return { ...DEFAULT, best: num(data.best) };
  return { v: 2, best: num(data.best), plays: num(data.plays), sound: data.sound !== false };
}

export function load(): Save {
  const text = read(SAVE_KEY);
  if (!text) return { ...DEFAULT };
  try { return migrate(JSON.parse(text)); } catch { return { ...DEFAULT }; }
}

export const save = (data: Save) => write(SAVE_KEY, JSON.stringify(data));

/** Test helper: forget the cached storage check (tests swap globalThis.localStorage). */
export function resetForTests() { backing = undefined; memory.clear(); }
