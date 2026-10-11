// Quality tiers (Low / Medium / High) and the Auto governor that moves between them by frame time.
// Low is meant for mid-range tablets: no shadows, pixel ratio 1, thinner grass, no foam.

export type QualityTier = 'low' | 'medium' | 'high';
export type QualitySetting = 'auto' | QualityTier;
export const TIERS: QualityTier[] = ['low', 'medium', 'high'];

export interface QualitySpec {
  /** max device pixel ratio used */
  pixelRatio: number;
  shadows: boolean;
  shadowMap: number;
  /** PCF filter radius (soft shadows on High) */
  shadowRadius: number;
  /** share of grass tufts drawn (0..1) */
  grass: number;
  /** shoreline foam + ambient ripples */
  foam: boolean;
  /** tree canopies sway in the wind */
  treeSway: boolean;
  /** ambient particles (petals, leaves, fireflies) multiplier */
  particles: number;
  /** fog end distance (nearer = less to draw) */
  fogFar: number;
}

export const QUALITY: Record<QualityTier, QualitySpec> = {
  low: { pixelRatio: 1, shadows: false, shadowMap: 1024, shadowRadius: 1, grass: 0.35, foam: false, treeSway: false, particles: 0.4, fogFar: 74 },
  medium: { pixelRatio: 1.25, shadows: true, shadowMap: 1536, shadowRadius: 2, grass: 0.75, foam: true, treeSway: true, particles: 0.8, fogFar: 86 },
  high: { pixelRatio: 2, shadows: true, shadowMap: 2048, shadowRadius: 4, grass: 1, foam: true, treeSway: true, particles: 1, fogFar: 96 },
};

/** A sensible first guess for Auto, from what the browser tells us about the device. */
export function guessTier(nav: { hardwareConcurrency?: number; userAgent?: string; maxTouchPoints?: number } = typeof navigator !== 'undefined' ? navigator : {}): QualityTier {
  const ua = nav.userAgent ?? '';
  const touch = (nav.maxTouchPoints ?? 0) > 1 || /iPad|iPhone|Android|Mobile/i.test(ua);
  const cores = nav.hardwareConcurrency ?? 4;
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

/**
 * Auto mode: drop a tier when frames stay slow, climb back when they stay fast.
 * Hysteresis keeps it from flickering: 2.5 s of < 42 fps to drop, 10 s of > 57 fps to climb,
 * and never above the tier it started at (so a hot-running tablet stays calm).
 */
export class Governor {
  tier: QualityTier;
  private slow = 0;
  private fast = 0;
  private ceiling: QualityTier;
  /** frames to ignore after a change (shader warm-up) */
  private settle = 0;

  constructor(start: QualityTier) {
    this.tier = start;
    this.ceiling = start;
  }

  /** Feed one frame's real duration (seconds). Returns the new tier when it changes. */
  sample(frameSec: number): QualityTier | null {
    if (this.settle > 0) {
      this.settle -= frameSec;
      return null;
    }
    // ignore hitches from tab switches and loading
    if (frameSec > 0.25) return null;
    if (frameSec > 1 / 42) {
      this.slow += frameSec;
      this.fast = 0;
    } else if (frameSec < 1 / 57) {
      this.fast += frameSec;
      this.slow = Math.max(0, this.slow - frameSec * 0.5);
    } else {
      this.slow = Math.max(0, this.slow - frameSec * 0.5);
      this.fast = 0;
    }
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
