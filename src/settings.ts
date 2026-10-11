// Global (not per-save) player settings.
import { DEFAULT_CAMERA, type CameraSettings } from './render/camera';

export interface Settings {
  master: number;
  music: number;
  sfx: number;
  textSpeed: 'slow' | 'normal' | 'fast' | 'instant';
  camera: CameraSettings;
  curve: number;
  shadows: boolean;
  touch: 'auto' | 'on' | 'off';
  tips: boolean;
  reduceMotion: boolean;
  /** playtest recording (hidden toggle; also ?playtest=1) */
  playtest: boolean;
  /** read dialogue, tips and missions out loud (browser speech) */
  readAloud: boolean;
  /** text size multiplier for reading surfaces */
  textSize: number;
  /** graphics quality; 'auto' adapts to the device */
  quality: 'auto' | 'low' | 'medium' | 'high';
}

export const DEFAULT_SETTINGS: Settings = {
  master: 0.8,
  music: 0.6,
  sfx: 0.8,
  textSpeed: 'normal',
  camera: { ...DEFAULT_CAMERA },
  curve: 1,
  shadows: true,
  touch: 'auto',
  tips: true,
  reduceMotion: false,
  playtest: false,
  readAloud: false,
  textSize: 1,
  quality: 'auto',
};

export const TEXT_CPS: Record<Settings['textSpeed'], number> = { slow: 28, normal: 55, fast: 110, instant: 100000 };
