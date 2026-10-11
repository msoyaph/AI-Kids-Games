/**
 * Graphics quality tiers and the adaptive frame-time governor. Pure logic (no Three.js, no DOM)
 * so it can be unit tested; the renderer reads the profile and applies it.
 */

export type QualityTier = 'low' | 'medium' | 'high';
export type QualitySetting = 'auto' | QualityTier;

export const TIERS: QualityTier[] = ['low', 'medium', 'high'];

export interface QualityProfile {
  tier: QualityTier;
  /** Upper bound for the device pixel ratio. */
  maxDpr: number;
  /** Lowest render scale the governor may use inside this tier (multiplies the pixel ratio). */
  minScale: number;
  /** Post-processing (bloom, tone mapping pass, grade). Low renders straight to the screen. */
  post: boolean;
  /** Bloom mip levels (0 = no bloom). */
  bloomLevels: number;
  /** Bloom resolution scale. */
  bloomScale: number;
  /**
   * MSAA samples for the post-processing render target. Kept at 0: multisampled targets corrupted
   * frames (black tiles) on ANGLE-Metal with many draw calls, so every post tier uses FXAA instead.
   */
  msaa: number;
  /** Cheap FXAA inside the final effect pass (used when there is no MSAA). */
  fxaa: boolean;
  /** Cube-map face size for baked planet surfaces and the sky. */
  bakeSize: number;
  skySize: number;
  /** Noise octaves in procedural surface bakes. */
  octaves: number;
  /** Separate cloud layers on Earth, Venus... */
  clouds: boolean;
  /** Ring shadows on Saturn / planet shadow on rings. */
  ringShadows: boolean;
  /** Sphere segments for big planets. */
  sphereSegments: number;
  asteroids: number;
  asteroidLods: number;
  particles: number;
  /** Dust streaks that stream past in flight. */
  dust: number;
  stars: number;
  /** Real (soft) shadow maps; only the hub uses them. */
  shadows: boolean;
}

export const PROFILES: Record<QualityTier, QualityProfile> = {
  low: {
    tier: 'low', maxDpr: 1, minScale: 0.6, post: false, bloomLevels: 0, bloomScale: 0.5, msaa: 0, fxaa: false,
    bakeSize: 128, skySize: 256, octaves: 2, clouds: false, ringShadows: false, sphereSegments: 40,
    asteroids: 120, asteroidLods: 1, particles: 300, dust: 60, stars: 1400, shadows: false,
  },
  medium: {
    tier: 'medium', maxDpr: 1.5, minScale: 0.75, post: true, bloomLevels: 4, bloomScale: 0.5, msaa: 0, fxaa: true,
    bakeSize: 256, skySize: 512, octaves: 4, clouds: true, ringShadows: true, sphereSegments: 64,
    asteroids: 260, asteroidLods: 2, particles: 700, dust: 150, stars: 2600, shadows: false,
  },
  high: {
    tier: 'high', maxDpr: 2, minScale: 0.85, post: true, bloomLevels: 6, bloomScale: 0.5, msaa: 0, fxaa: true,
    bakeSize: 512, skySize: 1024, octaves: 6, clouds: true, ringShadows: true, sphereSegments: 96,
    asteroids: 400, asteroidLods: 3, particles: 1500, dust: 300, stars: 4000, shadows: true,
  },
};

export interface DeviceSignals {
  touch: boolean;
  mobile: boolean;
  cores: number;
  memoryGb: number;
  gpu: string;
}

const WEAK_GPU = /(swiftshader|llvmpipe|softpipe|mali-[2-4]\d\d|mali-t[6-8]|adreno \(tm\) [2-5]\d\d|powervr|intel\(r\) hd graphics [2-5]\d{2,3}|gma)/i;

export function isWeakGpu(gpu: string): boolean {
  return WEAK_GPU.test(gpu);
}

/** Best-guess starting tier from cheap device signals. The governor refines it when quality is Auto. */
export function recommendTier(d: DeviceSignals): QualityTier {
  if (isWeakGpu(d.gpu) || d.cores <= 2 || d.memoryGb <= 2) return 'low';
  if (d.mobile) return d.cores >= 6 || d.memoryGb >= 4 ? 'medium' : 'low';
  if (d.cores <= 4 && d.memoryGb <= 4) return 'medium';
  return 'high';
}

export function tierIndex(t: QualityTier): number {
  return TIERS.indexOf(t);
}

/** Effective device pixel ratio for a profile and governor scale. */
export function pixelRatioFor(p: QualityProfile, dpr: number, scale: number): number {
  return Math.max(0.5, Math.min(dpr || 1, p.maxDpr) * scale);
}

export type GovernorChange = 'scale' | 'tier' | null;

/**
 * Watches frame times and nudges quality down quickly and back up slowly.
 * Order of steps: render scale first (cheap, invisible-ish), then the tier.
 * In a fixed tier (the player picked Low/Medium/High) only the render scale moves.
 */
export class QualityGovernor {
  tier: QualityTier;
  scale = 1;
  /** Highest tier Auto may climb back to. */
  ceiling: QualityTier;
  /** Whether the governor may change tiers (Auto quality). */
  adaptiveTier: boolean;
  /** Smoothed frame time (ms). */
  avgMs = 16.7;
  enabled = true;
  private slow = 0;
  private fast = 0;
  private verySlow = 0;
  private cooldown = 1.5;
  /** Seconds during which climbing back to a tier we just left is blocked (no ping-pong). */
  private upBlock = 0;

  constructor(tier: QualityTier, adaptiveTier: boolean, ceiling: QualityTier = tier) {
    this.tier = tier;
    this.adaptiveTier = adaptiveTier;
    this.ceiling = ceiling;
  }

  get profile(): QualityProfile {
    return PROFILES[this.tier];
  }

  reset(tier: QualityTier, adaptiveTier: boolean, ceiling: QualityTier = tier): void {
    this.tier = tier;
    this.adaptiveTier = adaptiveTier;
    this.ceiling = ceiling;
    this.scale = 1;
    this.settle(1.5);
    this.upBlock = 0;
    this.avgMs = 16.7;
  }

  /** Ignore the next few frames (scene switch, shader compile...). */
  settle(seconds = 1): void {
    this.slow = this.fast = this.verySlow = 0;
    this.cooldown = Math.max(this.cooldown, seconds);
  }

  get fps(): number {
    return 1000 / this.avgMs;
  }

  /** Feed one frame. Returns what changed so the renderer can apply it. */
  sample(frameMs: number, dt: number): GovernorChange {
    if (!(frameMs > 0) || frameMs > 250) return null;
    this.avgMs += (frameMs - this.avgMs) * 0.06;
    if (this.upBlock > 0) this.upBlock -= dt;
    if (!this.enabled) return null;
    if (this.cooldown > 0) {
      this.cooldown -= dt;
      return null;
    }
    const ms = this.avgMs;
    this.verySlow = ms > 34 ? this.verySlow + dt : 0;
    if (ms > 19.5) {
      this.slow += dt;
      this.fast = 0;
    } else if (ms < 17.4) {
      this.fast += dt;
      this.slow = 0;
    } else {
      this.slow = Math.max(0, this.slow - dt);
      this.fast = Math.max(0, this.fast - dt);
    }
    // Way too slow (under 30 fps): skip straight to a cheaper tier if we can.
    if (this.verySlow > 1 && this.adaptiveTier && this.tier !== 'low') {
      this.stepTier(-1);
      return 'tier';
    }
    if (this.slow > 2) {
      const p = this.profile;
      if (this.scale > p.minScale + 0.001) {
        this.scale = Math.max(p.minScale, this.scale - 0.1);
        this.settle(1.5);
        return 'scale';
      }
      if (this.adaptiveTier && this.tier !== 'low') {
        this.stepTier(-1);
        return 'tier';
      }
      this.settle(3);
      return null;
    }
    if (this.fast > 8) {
      if (this.scale < 1) {
        this.scale = Math.min(1, this.scale + 0.1);
        this.settle(3);
        return 'scale';
      }
      if (this.adaptiveTier && tierIndex(this.tier) < tierIndex(this.ceiling) && this.upBlock <= 0) {
        this.stepTier(1);
        return 'tier';
      }
      this.fast = 0;
    }
    return null;
  }

  private stepTier(dir: 1 | -1): void {
    const i = Math.max(0, Math.min(TIERS.length - 1, tierIndex(this.tier) + dir));
    this.tier = TIERS[i];
    // Start a higher tier at its lowest scale so we don't overshoot; a lower tier at full scale.
    this.scale = dir > 0 ? PROFILES[this.tier].minScale : 1;
    if (dir < 0) this.upBlock = 30;
    this.settle(dir > 0 ? 4 : 2);
  }
}
