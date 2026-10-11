import type { QualitySetting } from '../quality';
import { readJson, writeKey } from './storage';

/** Device-wide settings (shared by all save slots). Difficulty lives in each save slot. */
export interface Settings {
  music: number;
  sfx: number;
  readAloud: boolean;
  tips: boolean;
  lastSlot: number;
  /** Graphics quality: Auto (adaptive) or a fixed tier. */
  quality: QualitySetting;
  /** Comfort mode (fewer speed effects, no shake). null = follow the device's reduce-motion setting. */
  comfort: boolean | null;
  /** Flip up/down steering in flight. */
  flipY: boolean;
}

const QUALITY: QualitySetting[] = ['auto', 'low', 'medium', 'high'];

const KEY = 'spacesky.settings';

export function defaultSettings(): Settings {
  return { music: 0.6, sfx: 0.8, readAloud: false, tips: true, lastSlot: -1, quality: 'auto', comfort: null, flipY: false };
}

export function loadSettings(): Settings {
  const raw = readJson<Partial<Settings>>(KEY);
  const d = defaultSettings();
  if (!raw || typeof raw !== 'object') return d;
  return {
    music: typeof raw.music === 'number' ? Math.min(1, Math.max(0, raw.music)) : d.music,
    sfx: typeof raw.sfx === 'number' ? Math.min(1, Math.max(0, raw.sfx)) : d.sfx,
    readAloud: typeof raw.readAloud === 'boolean' ? raw.readAloud : d.readAloud,
    tips: typeof raw.tips === 'boolean' ? raw.tips : d.tips,
    lastSlot: typeof raw.lastSlot === 'number' ? raw.lastSlot : d.lastSlot,
    quality: QUALITY.includes(raw.quality as QualitySetting) ? (raw.quality as QualitySetting) : d.quality,
    comfort: typeof raw.comfort === 'boolean' ? raw.comfort : d.comfort,
    flipY: typeof raw.flipY === 'boolean' ? raw.flipY : d.flipY,
  };
}

export function saveSettings(s: Settings): void {
  writeKey(KEY, JSON.stringify(s));
}
