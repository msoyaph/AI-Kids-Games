// Settings → Touch controls (pure: shared by the save code and the controls; everything lives in `calexcart.settings`).
import { CONTROL_IDS, applySaved, bestDefaultLayout, defaultLayout, hudRects, isPortrait, solveLayout, type ControlId, type Layout, type Rect, type SavedLayout, type TouchSize, type Viewport } from './layout';

export type TouchSteerMode = 'joystick' | 'buttons' | 'tilt';

export interface TouchConfig {
  /** Floating = the stick appears under your thumb in the left zone; fixed = it stays in one spot. */
  stick: 'floating' | 'fixed';
  size: TouchSize;
  /** 0.4 … 1 */
  opacity: number;
  leftHanded: boolean;
  highContrast: boolean;
  /** Settings → Edit layout: the player's own positions, one per orientation (missing = default layout). */
  layout?: { landscape?: SavedLayout; portrait?: SavedLayout };
}

export const DEFAULT_TOUCH_CONFIG: TouchConfig = { stick: 'floating', size: 'medium', opacity: 1, leftHanded: false, highContrast: false };

/** Fill in / repair a stored touch config (unknown or broken values fall back to the defaults). */
export function sanitizeTouchConfig(raw: unknown): TouchConfig {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof TouchConfig, unknown>>;
  const d = DEFAULT_TOUCH_CONFIG;
  const op = typeof r.opacity === 'number' && Number.isFinite(r.opacity) ? Math.min(1, Math.max(0.4, r.opacity)) : d.opacity;
  const out: TouchConfig = {
    stick: r.stick === 'fixed' || r.stick === 'floating' ? r.stick : d.stick,
    size: r.size === 'small' || r.size === 'medium' || r.size === 'large' ? r.size : d.size,
    opacity: op,
    leftHanded: typeof r.leftHanded === 'boolean' ? r.leftHanded : d.leftHanded,
    highContrast: typeof r.highContrast === 'boolean' ? r.highContrast : d.highContrast,
  };
  const lay = r.layout && typeof r.layout === 'object' ? (r.layout as Record<string, unknown>) : null;
  if (lay) {
    const L: NonNullable<TouchConfig['layout']> = {};
    for (const o of ['landscape', 'portrait'] as const) {
      const s = sanitizeSavedLayout(lay[o]);
      if (s) L[o] = s;
    }
    if (L.landscape || L.portrait) out.layout = L;
  }
  return out;
}

function sanitizeSavedLayout(raw: unknown): SavedLayout | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as { lefty?: unknown; controls?: Record<string, unknown> };
  const controls: SavedLayout['controls'] = {};
  const num = (v: unknown, lo: number, hi: number): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null);
  for (const id of CONTROL_IDS as ControlId[]) {
    const c = r.controls?.[id] as { x?: unknown; y?: unknown; s?: unknown } | undefined;
    if (!c) continue;
    const x = num(c.x, 0, 1);
    const y = num(c.y, 0, 1);
    const s = num(c.s, 0.8, 1.4);
    if (x !== null && y !== null && s !== null) controls[id] = { x, y, s };
  }
  return Object.keys(controls).length ? { lefty: r.lefty === true, controls } : undefined;
}

/** The layout a config produces on a viewport (the player's edited layout for that orientation, or the default),
 * made legal against `hud` — the same rule the live controls use. */
export function layoutFor(vp: Viewport, c: TouchConfig, hud: Rect[] = hudRects(vp, c.leftHanded)): Layout {
  const saved = c.layout?.[isPortrait(vp) ? 'portrait' : 'landscape'];
  if (saved) return solveLayout(applySaved(defaultLayout(vp, c.size, c.leftHanded), saved, vp, c.leftHanded), vp, hud).layout;
  return bestDefaultLayout(vp, c.size, c.leftHanded, hud);
}
