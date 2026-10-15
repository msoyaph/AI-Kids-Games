// Quality tiers (Low / Medium / High) and the Auto governor that moves between them by frame time.
// Adapted from Light Crossing (games/light-crossing/src/render/quality.ts). Low is for phones and
// software WebGL: no shadow map (soft blob shadows instead), pixel ratio 1, fewer decorations.

export type QualityTier = 'low' | 'medium' | 'high';
export const TIERS: QualityTier[] = ['low', 'medium', 'high'];

export interface QualitySpec {
  /** Highest device pixel ratio used. */
  pixelRatio: number;
  shadows: boolean;
  shadowMap: number;
  /** Share of wild decorations drawn (grass tufts, flowers, pebbles), 0..1. */
  decor: number;
  /** Ambient particles (petals, leaves, rain drops) multiplier. */
  particles: number;
  /** Rim light on models. */
  rim: boolean;
  /** Post-processing: tone mapping and the colour grade in a pass (Low tone-maps directly). */
  post: boolean;
  /** Bloom mip levels (0: none). */
  bloom: number;
  /** Screen-space ambient occlusion (High; Low and Medium use AO baked into vertex colours). */
  ssao: boolean;
  /** The miniature look: soft blur towards the top and bottom of the screen. */
  tiltShift: boolean;
  /** Grass tufts and wildflowers around the view. */
  grass: number;
}

export const QUALITY: Record<QualityTier, QualitySpec> = {
  low: { pixelRatio: 1, shadows: false, shadowMap: 1024, decor: 0.45, particles: 0.4, rim: false, post: false, bloom: 0, ssao: false, tiltShift: false, grass: 700 },
  medium: { pixelRatio: 1.5, shadows: true, shadowMap: 2048, decor: 0.8, particles: 0.75, rim: true, post: true, bloom: 4, ssao: false, tiltShift: false, grass: 2400 },
  high: { pixelRatio: 2, shadows: true, shadowMap: 2048, decor: 1, particles: 1, rim: true, post: true, bloom: 5, ssao: true, tiltShift: true, grass: 5200 },
};

/** A sensible first guess for Auto, from what the browser tells us about the device. */
export function guessTier(
  nav: { hardwareConcurrency?: number; userAgent?: string; maxTouchPoints?: number } = typeof navigator !== 'undefined' ? navigator : {},
  scr: { width: number; height: number } | null = typeof screen !== 'undefined' ? screen : null,
): QualityTier {
  const ua = nav.userAgent ?? '';
  const touch = (nav.maxTouchPoints ?? 0) > 1 || /iPad|iPhone|Android|Mobile/i.test(ua);
  const cores = nav.hardwareConcurrency ?? 4;
  // phones (short side under 600 CSS px) start on Low: small screens, tight memory, warm hands
  const phone = /iPhone|iPod/i.test(ua) || (touch && !!scr && Math.min(scr.width, scr.height) < 600);
  if (phone) return 'low';
  if (touch) return cores >= 8 ? 'medium' : 'low';
  return cores >= 8 ? 'high' : 'medium';
}

/** Tier forced by the URL (?quality=low), for CI and testing on devices. */
export function urlTier(search = typeof location !== 'undefined' ? location.search : ''): QualityTier | null {
  try {
    const q = new URLSearchParams(search).get('quality');
    return q === 'low' || q === 'medium' || q === 'high' ? q : null;
  } catch {
    return null;
  }
}

/** Software renderers (CI's SwiftShader, llvmpipe) always get Low. */
export const isSoftwareRenderer = (renderer: string) => /swiftshader|llvmpipe|software|basic render/i.test(renderer);

/**
 * Auto mode: drop a tier when frames stay slow, climb back when they stay fast.
 * 2.5 s under 42 fps to drop, 10 s over 57 fps to climb, never above the tier it started at.
 */
export class Governor {
  tier: QualityTier;
  private slow = 0;
  private fast = 0;
  private ceiling: QualityTier;
  /** Seconds to ignore after a change (shader warm-up). */
  private settle = 0;

  constructor(start: QualityTier) {
    this.tier = start;
    this.ceiling = start;
  }

  /** Feed one frame's real duration (seconds). Returns the new tier when it changes. */
  sample(frameSec: number): QualityTier | null {
    if (this.settle > 0) { this.settle -= frameSec; return null; }
    if (frameSec > 0.25) return null; // tab switches and loading hitches
    if (frameSec > 1 / 42) { this.slow += frameSec; this.fast = 0; }
    else if (frameSec < 1 / 57) { this.fast += frameSec; this.slow = Math.max(0, this.slow - frameSec * 0.5); }
    else { this.slow = Math.max(0, this.slow - frameSec * 0.5); this.fast = 0; }
    const k = TIERS.indexOf(this.tier);
    if (this.slow > 2.5 && k > 0) return this.set(TIERS[k - 1]!);
    if (this.fast > 10 && k < TIERS.indexOf(this.ceiling)) return this.set(TIERS[k + 1]!);
    return null;
  }

  private set(t: QualityTier): QualityTier {
    this.tier = t;
    this.slow = 0;
    this.fast = 0;
    this.settle = 1.5;
    return t;
  }
}
