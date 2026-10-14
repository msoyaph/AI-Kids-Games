// Quality tiers (Low / Medium / High) and the Auto governor that moves between them by frame time.
// Adapted from farm-wip and Light Crossing (games/light-crossing/src/render/quality.ts), with Space
// Sky's weak-GPU check (games/space-sky/src/systems/quality.ts). Low is for phones and software
// WebGL: blob shadows, no post effects, pixel ratio 1, no multisampling.

export type QualityTier = 'low' | 'medium' | 'high';
export const TIERS: readonly QualityTier[] = ['low', 'medium', 'high'];

export interface QualitySpec {
  /** Highest device pixel ratio used. */
  pixelRatio: number;
  /** Shadow map (Medium: small and soft; High: sharper), or blob shadows when off. */
  shadowMap: number;
  bloom: boolean;
  /** Share of decorations drawn (grass tufts, flowers), 0..1. */
  decor: number;
  /** Rim light on models. */
  rim: boolean;
}

export const QUALITY: Record<QualityTier, QualitySpec> = {
  low: { pixelRatio: 1, shadowMap: 0, bloom: false, decor: 0.45, rim: false },
  medium: { pixelRatio: 1.5, shadowMap: 1024, bloom: false, decor: 0.75, rim: true },
  high: { pixelRatio: 2, shadowMap: 2048, bloom: true, decor: 1, rim: true },
};

/** Software renderers (CI's SwiftShader, llvmpipe) and very weak GPUs always get Low at 1×. */
export const isSoftwareRenderer = (renderer: string) => /swiftshader|llvmpipe|software|basic render|softpipe/i.test(renderer);

/** A sensible first guess for Auto, from what the browser tells us about the device. */
export function guessTier(
  nav: { hardwareConcurrency?: number; userAgent?: string; maxTouchPoints?: number } = typeof navigator !== 'undefined' ? navigator : {},
  scr: { width: number; height: number } | null = typeof screen !== 'undefined' ? screen : null,
  gpu = '',
): QualityTier {
  if (isSoftwareRenderer(gpu)) return 'low';
  const ua = nav.userAgent ?? '';
  const touch = (nav.maxTouchPoints ?? 0) > 1 || /iPad|iPhone|Android|Mobile/i.test(ua);
  const cores = nav.hardwareConcurrency ?? 4;
  // phones (short side under 500 CSS px) start on Low: small screens, tight memory, warm hands
  const phone = /iPhone|iPod/i.test(ua) || (touch && !!scr && Math.min(scr.width, scr.height) < 500);
  if (phone) return 'low';
  if (touch) return cores >= 8 ? 'medium' : 'low';
  return cores >= 8 ? 'high' : 'medium';
}

/** Tier forced by the URL (?quality=low), for CI, screenshots and testing on devices. */
export function urlTier(search = typeof location !== 'undefined' ? location.search : ''): QualityTier | null {
  try {
    const q = new URLSearchParams(search).get('quality');
    return q === 'low' || q === 'medium' || q === 'high' ? q : null;
  } catch {
    return null;
  }
}

/**
 * Auto mode: drop a tier when frames stay slow, climb back when they stay fast.
 * 2.5 s under 42 fps to drop, 10 s over 57 fps to climb, never above the tier it started at.
 */
export class Governor {
  tier: QualityTier;
  private slow = 0;
  private fast = 0;
  private readonly ceiling: QualityTier;
  /** Seconds to ignore after a change (shader warm-up). */
  private settle = 1.5;

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
