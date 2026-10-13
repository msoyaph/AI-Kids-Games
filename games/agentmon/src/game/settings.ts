/**
 * Settings (shared by all save slots, kept in agentmon.settings). Difficulty lives in each save,
 * because it changes the adventure (it can still be changed at any time from Settings).
 */
import { readJson, writeJson } from './store';

export interface Settings {
  v: 1;
  /** 0 normal, 1 big, 2 bigger. */
  textSize: 0 | 1 | 2;
  /** Read every line aloud automatically (the 🔊 button always works). */
  readAloud: boolean;
  textSpeed: 'slow' | 'normal' | 'fast';
  battleSpeed: 1 | 2;
  skipAnimations: boolean;
  hints: boolean;
  reducedMotion: boolean;
  colorblind: boolean;
  volume: { master: number; music: number; sfx: number; voice: number };
  befriendMode: 'spark' | 'mood';
  sharedXp: boolean;
  touchSize: 's' | 'm' | 'l';
  /** 1.1: morning, day, evening and night come and go with play time (off: always day). */
  dayCycle: boolean;
}

export function defaultSettings(): Settings {
  let reduced = false;
  try { reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* no media queries */ }
  return {
    v: 1, textSize: 0, readAloud: false, textSpeed: 'normal', battleSpeed: 1, skipAnimations: false, hints: true,
    reducedMotion: reduced, colorblind: false, volume: { master: 0.8, music: 0.7, sfx: 0.8, voice: 0.8 },
    befriendMode: 'spark', sharedXp: true, touchSize: 'm', dayCycle: true,
  };
}

const clamp01 = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : d);

export function loadSettings(): Settings {
  const d = defaultSettings();
  const raw = readJson<Partial<Settings>>('settings');
  if (!raw || typeof raw !== 'object') return d;
  const vol = (raw.volume ?? {}) as Partial<Settings['volume']>;
  return {
    v: 1,
    textSize: raw.textSize === 1 || raw.textSize === 2 ? raw.textSize : 0,
    readAloud: raw.readAloud === true,
    textSpeed: raw.textSpeed === 'slow' || raw.textSpeed === 'fast' ? raw.textSpeed : 'normal',
    battleSpeed: raw.battleSpeed === 2 ? 2 : 1,
    skipAnimations: raw.skipAnimations === true,
    hints: raw.hints !== false,
    reducedMotion: typeof raw.reducedMotion === 'boolean' ? raw.reducedMotion : d.reducedMotion,
    colorblind: raw.colorblind === true,
    volume: { master: clamp01(vol.master, d.volume.master), music: clamp01(vol.music, d.volume.music), sfx: clamp01(vol.sfx, d.volume.sfx), voice: clamp01(vol.voice, d.volume.voice) },
    befriendMode: raw.befriendMode === 'mood' ? 'mood' : 'spark',
    sharedXp: raw.sharedXp !== false,
    touchSize: raw.touchSize === 's' || raw.touchSize === 'l' ? raw.touchSize : 'm',
    dayCycle: raw.dayCycle !== false,
  };
}

export const saveSettings = (s: Settings) => writeJson('settings', s);

/** Apply the settings that live in CSS (text size, reduced motion, colourblind badges). */
export function applySettingsToDom(s: Settings): void {
  const root = document.documentElement;
  root.style.setProperty('--ui-scale', String([1, 1.18, 1.36][s.textSize]));
  root.classList.toggle('reduced-motion', s.reducedMotion);
  root.classList.toggle('colorblind', s.colorblind);
  root.dataset.touchSize = s.touchSize;
}
