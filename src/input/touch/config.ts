// Settings → Touch controls (pure: shared by the save code and the controls; everything lives in `calexcart.settings`).
import type { TouchSize } from './layout';

export type TouchSteerMode = 'joystick' | 'buttons' | 'tilt';

export interface TouchConfig {
  /** Floating = the stick appears under your thumb in the left zone; fixed = it stays in one spot. */
  stick: 'floating' | 'fixed';
  size: TouchSize;
  /** 0.4 … 1 */
  opacity: number;
  leftHanded: boolean;
  highContrast: boolean;
}

export const DEFAULT_TOUCH_CONFIG: TouchConfig = { stick: 'floating', size: 'medium', opacity: 1, leftHanded: false, highContrast: false };

/** Fill in / repair a stored touch config (unknown or broken values fall back to the defaults). */
export function sanitizeTouchConfig(raw: unknown): TouchConfig {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof TouchConfig, unknown>>;
  const d = DEFAULT_TOUCH_CONFIG;
  const op = typeof r.opacity === 'number' && Number.isFinite(r.opacity) ? Math.min(1, Math.max(0.4, r.opacity)) : d.opacity;
  return {
    stick: r.stick === 'fixed' || r.stick === 'floating' ? r.stick : d.stick,
    size: r.size === 'small' || r.size === 'medium' || r.size === 'large' ? r.size : d.size,
    opacity: op,
    leftHanded: typeof r.leftHanded === 'boolean' ? r.leftHanded : d.leftHanded,
    highContrast: typeof r.highContrast === 'boolean' ? r.highContrast : d.highContrast,
  };
}
