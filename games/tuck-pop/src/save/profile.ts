/**
 * The player's profile (key `tuckpop.save`): settings, best scores, stats, helpers, Adventure
 * stars, unlocked themes and Daily bests. Versioned: `MIGRATIONS[v]` upgrades version v to v+1,
 * then `sanitize` clamps every field, so an old or damaged save always loads. A save from a newer
 * version than this code is read but never overwritten (an old cached copy of the game can't wipe
 * newer progress). Writes over 50 KB are refused; Daily history trims first.
 */
import { THEMES, type ThemeId } from '../data/themes';
import type { Difficulty } from '../sim/game';
import { TUNING } from '../tuning';
import { read, write } from './storage';

export const PROFILE_VERSION = 1;
export const PROFILE_KEY = 'save';
export const MAX_BYTES = 50_000;
const TRIM_BYTES = 8_000;

export type Motion = 'auto' | 'less' | 'full';
export interface Settings {
  sound: boolean; music: boolean; volume: number; haptics: boolean; shake: boolean;
  motion: Motion; symbols: boolean; contrast: boolean; text: 0 | 1 | 2; readAloud: boolean;
  theme: ThemeId; difficulty: Difficulty;
}
export interface Profile {
  v: number;
  settings: Settings;
  best: { easy: number; normal: number; relax: number };
  stats: { games: number; lines: number; placed: number; clears: number; bestStreak: number; dailies: number };
  /** Helper supply, and Classic points counted toward the next earned helper. */
  helpers: { undo: number; shuffle: number; single: number; progress: number };
  /** Adventure stars, one character per level ('0'–'3'). */
  adv: string;
  themes: ThemeId[];
  /** Daily bests: [yyyymmdd, best score], newest last, at most 30. */
  daily: [number, number][];
  /** Tips already shown (bit flags). */
  tips: number;
}

export const LEVELS = 60;
export const defaults = (): Profile => ({
  v: PROFILE_VERSION,
  settings: { sound: true, music: true, volume: 0.8, haptics: true, shake: true, motion: 'auto', symbols: false, contrast: false, text: 0, readAloud: false, theme: 'classic', difficulty: 'easy' },
  best: { easy: 0, normal: 0, relax: 0 },
  stats: { games: 0, lines: 0, placed: 0, clears: 0, bestStreak: 0, dailies: 0 },
  helpers: { ...TUNING.helpers.start, progress: 0 },
  adv: '0'.repeat(LEVELS),
  themes: ['classic'],
  daily: [],
  tips: 0,
});

/** MIGRATIONS[v] turns a version-v save into version v+1. (Version 1 is the first release.) */
export const MIGRATIONS: Record<number, (old: Record<string, unknown>) => Record<string, unknown>> = {};

const int = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.floor(v))) : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const THEME_IDS = THEMES.map(t => t.id) as string[];

/** Clamps every field of any object into a valid profile (missing fields get defaults). */
export function sanitize(raw: unknown): Profile {
  const d = defaults(), r = obj(raw), s = obj(r.settings), b = obj(r.best), st = obj(r.stats), h = obj(r.helpers);
  const cap = TUNING.helpers.cap, BIG = 1e9;
  const themes = Array.isArray(r.themes) ? [...new Set(r.themes.filter((t): t is ThemeId => typeof t === 'string' && THEME_IDS.includes(t)))] : [];
  if (!themes.includes('classic')) themes.unshift('classic');
  const theme = typeof s.theme === 'string' && themes.includes(s.theme as ThemeId) ? (s.theme as ThemeId) : 'classic';
  const adv = typeof r.adv === 'string' ? r.adv.replace(/[^0-3]/g, '0').padEnd(LEVELS, '0').slice(0, LEVELS) : d.adv;
  const daily = Array.isArray(r.daily) ? r.daily.filter((e): e is [number, number] => Array.isArray(e) && e.length === 2 && Number.isInteger(e[0]) && e[0] >= 20260101 && e[0] <= 99991231 && typeof e[1] === 'number').map(([day, best]) => [day, int(best, 0, BIG, 0)] as [number, number]).slice(-30) : [];
  return {
    v: PROFILE_VERSION,
    settings: {
      sound: bool(s.sound, true), music: bool(s.music, true), volume: typeof s.volume === 'number' && s.volume >= 0 && s.volume <= 1 ? s.volume : 0.8,
      haptics: bool(s.haptics, true), shake: bool(s.shake, true), motion: s.motion === 'less' || s.motion === 'full' ? s.motion : 'auto',
      symbols: bool(s.symbols, false), contrast: bool(s.contrast, false), text: s.text === 1 || s.text === 2 ? s.text : 0, readAloud: bool(s.readAloud, false),
      theme, difficulty: s.difficulty === 'normal' ? 'normal' : 'easy',
    },
    best: { easy: int(b.easy, 0, BIG, 0), normal: int(b.normal, 0, BIG, 0), relax: int(b.relax, 0, BIG, 0) },
    stats: { games: int(st.games, 0, BIG, 0), lines: int(st.lines, 0, BIG, 0), placed: int(st.placed, 0, BIG, 0), clears: int(st.clears, 0, BIG, 0), bestStreak: int(st.bestStreak, 0, BIG, 0), dailies: int(st.dailies, 0, BIG, 0) },
    helpers: { undo: int(h.undo, 0, cap, d.helpers.undo), shuffle: int(h.shuffle, 0, cap, d.helpers.shuffle), single: int(h.single, 0, cap, d.helpers.single), progress: int(h.progress, 0, BIG, 0) },
    adv, themes, daily, tips: int(r.tips, 0, 2 ** 30, 0),
  };
}

export interface Loaded { profile: Profile; readOnly: boolean }

/** Upgrades and cleans any stored value. `readOnly` when it came from a newer version of the game. */
export function migrate(raw: unknown): Loaded {
  let r = obj(raw);
  const v = typeof r.v === 'number' ? r.v : 0;
  if (v > PROFILE_VERSION) return { profile: sanitize(r), readOnly: true };
  for (let k = Math.max(0, v); k < PROFILE_VERSION; k++) if (MIGRATIONS[k]) r = MIGRATIONS[k]!(r);
  return { profile: sanitize(r), readOnly: false };
}

export function load(): Loaded {
  const text = read(PROFILE_KEY);
  if (!text) return { profile: defaults(), readOnly: false };
  try { return migrate(JSON.parse(text)); } catch { return { profile: defaults(), readOnly: false }; }
}

/** The JSON to store, trimmed to stay small. Null if it would still be over 50 KB. */
export function serialize(p: Profile): string | null {
  let text = JSON.stringify(p);
  if (text.length > TRIM_BYTES && p.daily.length > 14) text = JSON.stringify({ ...p, daily: p.daily.slice(-14) });
  return text.length > MAX_BYTES ? null : text;
}

/** Saves unless this copy is read-only; false when it couldn't (too big, or storage full). */
export function save(p: Profile, readOnly = false): boolean {
  if (readOnly) return false;
  const text = serialize(p);
  return text !== null && write(PROFILE_KEY, text);
}
