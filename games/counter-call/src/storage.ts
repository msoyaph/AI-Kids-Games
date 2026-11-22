/**
 * Safe, namespaced localStorage. The game shares the website's origin with other games, so:
 * - every key starts with GAME.storagePrefix, and nothing else is ever read, written or removed
 *   (no localStorage.clear(), no looping over other keys);
 * - every call is wrapped in try/catch, and when storage is blocked (private mode, a sandbox
 *   without same-origin) the game keeps working from memory and says progress won't be kept;
 * - saves carry a version and old versions are migrated, so players never lose progress.
 */
import { GAME } from './config';

/** Best result for one day. */
export interface DayRecord { stars: number; coins: number }
export interface Save {
  v: 2; sound: boolean; music: boolean; plays: number;
  /** Coins in the piggy bank: earned at the counter, spent in the shop. */
  coins: number;
  days: DayRecord[];
  /** Who the player plays as (a host id from the character registry). */
  host: string;
  /** Shop upgrade levels by id. */
  upgrades: Record<string, number>;
  /** Most friends served in one Endless Rush. */
  endlessBest: number;
}
export const SAVE_VERSION = 2;
export const SAVE_KEY = 'save';
const MAX_DAYS = 64;
export const defaultSave = (): Save => ({ v: 2, sound: true, music: true, plays: 0, coins: 0, days: [], host: 'minty', upgrades: {}, endlessBest: 0 });

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

/**
 * Clean up whatever was stored into a valid current save. Version 1 had no chosen host, shop
 * upgrades or Endless Rush best: they start at their defaults and everything else is kept.
 */
export function migrate(raw: unknown): Save {
  if (!raw || typeof raw !== 'object') return defaultSave();
  const data = raw as Record<string, unknown>;
  const num = (value: unknown, max = Number.MAX_SAFE_INTEGER) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.min(max, Math.floor(value)) : 0);
  const days: DayRecord[] = [];
  if (Array.isArray(data.days)) {
    for (const d of data.days.slice(0, MAX_DAYS)) {
      const rec = (d && typeof d === 'object' ? d : {}) as Record<string, unknown>;
      days.push({ stars: num(rec.stars, 3), coins: num(rec.coins) });
    }
  }
  const upgrades: Record<string, number> = {};
  if (data.upgrades && typeof data.upgrades === 'object' && !Array.isArray(data.upgrades)) {
    for (const [id, level] of Object.entries(data.upgrades as Record<string, unknown>).slice(0, 32)) if (/^[a-z]{1,16}$/.test(id) && num(level, 9) > 0) upgrades[id] = num(level, 9);
  }
  const host = typeof data.host === 'string' && /^[a-z]{1,24}$/.test(data.host) ? data.host : 'minty';
  return { v: 2, sound: data.sound !== false, music: data.music !== false, plays: num(data.plays), coins: num(data.coins), days, host, upgrades, endlessBest: num(data.endlessBest) };
}

export function load(): Save {
  const text = read(SAVE_KEY);
  if (!text) return defaultSave();
  try { return migrate(JSON.parse(text)); } catch { return defaultSave(); }
}

export const save = (data: Save) => write(SAVE_KEY, JSON.stringify(data));

/** A day is open when it is the first one, or the day before it earned at least one star. */
export const dayOpen = (data: Save, index: number) => index <= 0 || (data.days[index - 1]?.stars ?? 0) >= 1;

/** Record a finished day, keeping the best stars and coins. Returns a new save. */
export function recordDay(data: Save, index: number, starsEarned: number, coins: number): Save {
  const days = data.days.map(d => ({ ...d }));
  while (days.length <= index) days.push({ stars: 0, coins: 0 });
  days[index] = { stars: Math.max(days[index].stars, starsEarned), coins: Math.max(days[index].coins, coins) };
  return { ...data, days, plays: data.plays + 1, coins: data.coins + coins };
}

/** Record an Endless Rush, keeping the best number of friends served. Returns a new save. */
export const recordEndless = (data: Save, served: number, coins: number): Save => ({ ...data, plays: data.plays + 1, coins: data.coins + coins, endlessBest: Math.max(data.endlessBest, served) });

/** Endless Rush opens once day 3 has a star (so there are four foods to juggle). */
export const endlessOpen = (data: Save) => dayOpen(data, 3);

/** Test helper: forget the cached storage check (tests swap globalThis.localStorage). */
export function resetForTests() { backing = undefined; memory.clear(); }
