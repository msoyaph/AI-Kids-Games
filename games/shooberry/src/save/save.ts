// The save: progress (stars per level and Challenge), the Garden Party best, Daily results, what
// the player has seen (tips, book pages), their last seeds per level, and settings. Versioned with
// migrations (an old starter save still loads), kept under 100 KB, written through storage.ts
// under the game's prefix only. Saves are sacred: nothing here ever deletes progress except the
// player's own "start over" in Settings.
import { read, write } from './storage';

export interface Settings {
  music: number;
  sfx: number;
  autoCollect: boolean;
  /** Game speed when a level starts (1× or 2×). */
  speed: 1 | 2;
  /** Patterns on compost and on critters' shells and shields, for colourblind players. */
  patterns: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  readAloud: boolean;
  quality: 'auto' | 'low' | 'medium' | 'high';
}

export interface SaveData {
  v: 1;
  settings: Settings;
  /** Best stars per Adventure level id ("meadow-3") and per Challenge id. */
  stars: Record<string, number>;
  partyBest: number;
  /** Daily gardens: date → stars (the last 30 kept). */
  daily: Record<string, number>;
  seen: { tips: string[]; plants: string[]; critters: string[] };
  lastSeeds: Record<string, string[]>;
}

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'save';
/** Saves stay well under this (bytes of JSON). */
export const SAVE_BUDGET = 100_000;

export const DEFAULT_SETTINGS: Settings = { music: 0.6, sfx: 0.8, autoCollect: true, speed: 1, patterns: false, reducedMotion: false, largeText: false, readAloud: false, quality: 'auto' };

export const freshSave = (): SaveData => ({ v: 1, settings: { ...DEFAULT_SETTINGS }, stars: {}, partyBest: 0, daily: {}, seen: { tips: [], plants: [], critters: [] }, lastSeeds: {} });

const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 200) : []);
const record = (v: unknown, max = 9) => {
  const out: Record<string, number> = {};
  if (v && typeof v === 'object') for (const [k, n] of Object.entries(v as Record<string, unknown>).slice(0, 500)) if (typeof n === 'number' && Number.isFinite(n)) out[k] = Math.min(max, Math.max(0, Math.floor(n)));
  return out;
};

/** Upgrades any older save to the current version; anything unreadable becomes a fresh save. */
export function migrate(raw: unknown): SaveData {
  const fresh = freshSave();
  if (!raw || typeof raw !== 'object') return fresh;
  const d = raw as Record<string, unknown>;
  // the starter template's save ({ v: 2, best, plays, sound }) only carries the sound setting over
  if (d.v === 2 && 'sound' in d) return { ...fresh, settings: { ...fresh.settings, sfx: d.sound === false ? 0 : fresh.settings.sfx, music: d.sound === false ? 0 : fresh.settings.music } };
  if (d.v !== 1) return fresh;
  const s = (d.settings ?? {}) as Record<string, unknown>;
  const seen = (d.seen ?? {}) as Record<string, unknown>;
  const last: Record<string, string[]> = {};
  if (d.lastSeeds && typeof d.lastSeeds === 'object') for (const [k, v] of Object.entries(d.lastSeeds as Record<string, unknown>).slice(0, 120)) last[k] = strs(v).slice(0, 8);
  const daily = record(d.daily, 3);
  return {
    v: 1,
    settings: {
      music: num(s.music, 0, 1, fresh.settings.music), sfx: num(s.sfx, 0, 1, fresh.settings.sfx), autoCollect: s.autoCollect !== false, speed: s.speed === 2 ? 2 : 1,
      patterns: s.patterns === true, reducedMotion: s.reducedMotion === true, largeText: s.largeText === true, readAloud: s.readAloud === true,
      quality: s.quality === 'low' || s.quality === 'medium' || s.quality === 'high' ? s.quality : 'auto',
    },
    stars: record(d.stars, 3), partyBest: Math.floor(num(d.partyBest, 0, 9999, 0)),
    daily: Object.fromEntries(Object.entries(daily).sort().slice(-30)),
    seen: { tips: strs(seen.tips), plants: strs(seen.plants), critters: strs(seen.critters) },
    lastSeeds: last,
  };
}

export function load(): SaveData {
  const text = read(SAVE_KEY);
  if (!text) return freshSave();
  try { return migrate(JSON.parse(text)); } catch { return freshSave(); }
}

/** Writes the save; returns false if storage refused (full or blocked: the game keeps going). */
export function save(data: SaveData): boolean {
  const text = JSON.stringify(data);
  if (text.length > SAVE_BUDGET) return false;
  return write(SAVE_KEY, text);
}
