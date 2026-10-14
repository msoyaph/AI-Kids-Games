// Adapted from games/fieldlark/src/save/settings.ts: adds Creative mode's unlock and the last slot.
/**
 * Settings, kept apart from the towns in `<prefix>settings` (adapted from Agentmon's settings model:
 * every field is checked on load, so an old or damaged value just falls back to its default).
 */
import { readJson, writeJson } from './storage';

export type QualitySetting = 'auto' | 'low' | 'medium' | 'high';

export interface Settings {
  v: 1;
  /** 0 normal, 1 big, 2 bigger. */
  textSize: 0 | 1 | 2;
  /** Read dialogue and tips aloud as they appear (the 🔊 buttons always work). */
  readAloud: boolean;
  reducedMotion: boolean;
  /** Patterns on the maps (dots, stripes, cross-hatch), so nothing depends on colour alone. */
  colorblind: boolean;
  /** Gentle hints when nothing has moved forward for a while. */
  hints: boolean;
  volume: { master: number; music: number; sfx: number };
  quality: QualitySetting;
  /** Phones held sideways: the tool rail goes on the left instead of the right. */
  leftHanded: boolean;
  /** Creative mode opens once any town has finished chapter 1 (it is for every slot). */
  creative: boolean;
  /** The slot played last (1–3), for "Continue". */
  lastSlot: number;
}

export function defaultSettings(): Settings {
  let reduced = false;
  try { reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* no media queries */ }
  return { v: 1, textSize: 0, readAloud: false, reducedMotion: reduced, colorblind: false, hints: true, volume: { master: 0.8, music: 0.6, sfx: 0.8 }, quality: 'auto', leftHanded: false, creative: false, lastSlot: 0 };
}

const clamp01 = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : d);

export function sanitizeSettings(raw: unknown): Settings {
  const d = defaultSettings();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<Settings>;
  const vol = (r.volume ?? {}) as Partial<Settings['volume']>;
  return {
    v: 1,
    textSize: r.textSize === 1 || r.textSize === 2 ? r.textSize : 0,
    readAloud: r.readAloud === true,
    reducedMotion: typeof r.reducedMotion === 'boolean' ? r.reducedMotion : d.reducedMotion,
    colorblind: r.colorblind === true,
    hints: r.hints !== false,
    volume: { master: clamp01(vol.master, d.volume.master), music: clamp01(vol.music, d.volume.music), sfx: clamp01(vol.sfx, d.volume.sfx) },
    quality: r.quality === 'low' || r.quality === 'medium' || r.quality === 'high' ? r.quality : 'auto',
    leftHanded: r.leftHanded === true,
    creative: r.creative === true,
    lastSlot: typeof r.lastSlot === 'number' && r.lastSlot >= 1 && r.lastSlot <= 3 ? Math.round(r.lastSlot) : 0,
  };
}

export const loadSettings = () => sanitizeSettings(readJson('settings'));
export const saveSettings = (s: Settings) => writeJson('settings', s);
