/** Player settings, persisted separately from save slots. */
import { read, write } from '../core/storage';

export interface Settings {
  music: number;
  sfx: number;
  /** 0 small, 1 normal, 2 large, 3 extra large */
  textSize: number;
  readAloud: boolean;
  reducedMotion: boolean;
  screenShake: boolean;
  joystick: boolean;
  leftHanded: boolean;
  quality: 'auto' | 'high' | 'low';
  showFps: boolean;
  zoom: number;
  lastSlot: number;
  hints: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  music: 0.6,
  sfx: 0.8,
  textSize: 1,
  readAloud: false,
  reducedMotion: false,
  screenShake: true,
  joystick: false,
  leftHanded: false,
  quality: 'auto',
  showFps: false,
  zoom: 0,
  lastSlot: 0,
  hints: true,
};

export const TEXT_SCALES = [0.9, 1, 1.15, 1.32];

export function loadSettings(): Settings {
  const s = { ...DEFAULT_SETTINGS };
  try {
    const raw = read('settings');
    if (raw) Object.assign(s, JSON.parse(raw));
  } catch {
    /* defaults */
  }
  if (typeof matchMedia !== 'undefined' && read('settings') === null) {
    try {
      s.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      /* ignore */
    }
  }
  return s;
}

export function saveSettings(s: Settings): void {
  write('settings', JSON.stringify(s));
}

export function applySettingsToDom(s: Settings): void {
  document.documentElement.style.setProperty('--text-scale', String(TEXT_SCALES[s.textSize] ?? 1));
  document.body.classList.toggle('reduced-motion', s.reducedMotion);
}
