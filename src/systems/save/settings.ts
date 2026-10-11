import { readJson, writeKey } from './storage';

/** Device-wide settings (shared by all save slots). Difficulty lives in each save slot. */
export interface Settings {
  music: number;
  sfx: number;
  readAloud: boolean;
  tips: boolean;
  lastSlot: number;
}

const KEY = 'spacesky.settings';

export function defaultSettings(): Settings {
  return { music: 0.6, sfx: 0.8, readAloud: false, tips: true, lastSlot: -1 };
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
  };
}

export function saveSettings(s: Settings): void {
  writeKey(KEY, JSON.stringify(s));
}
