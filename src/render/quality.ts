export type QualityTier = 'low' | 'medium' | 'high';
export type QualitySetting = 'auto' | QualityTier;

export interface QualityProfile {
  tier: QualityTier;
  /** Max renderer resolution (multiplied against devicePixelRatio, capped at 2). */
  maxResolution: number;
  /** Max simultaneously-live particles. */
  particles: number;
  /** Additive glow sprites ("bloom") on projectiles and special attacks. */
  glow: boolean;
  /** Animated water sparkles / swaying grass tufts. */
  ambient: boolean;
  /** Max floating text labels alive at once. */
  floatingText: number;
}

export const QUALITY_PROFILES: Record<QualityTier, QualityProfile> = {
  low: { tier: 'low', maxResolution: 1, particles: 140, glow: false, ambient: false, floatingText: 16 },
  medium: { tier: 'medium', maxResolution: 1.5, particles: 380, glow: true, ambient: true, floatingText: 32 },
  high: { tier: 'high', maxResolution: 2, particles: 900, glow: true, ambient: true, floatingText: 48 },
};

export const TIER_ORDER: QualityTier[] = ['low', 'medium', 'high'];

interface NavigatorExtras {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  connection?: { saveData?: boolean };
}

export function isTouchDevice(): boolean {
  try {
    return matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  } catch {
    return false;
  }
}

/**
 * Best-guess starting tier from cheap device signals. The FPS governor
 * refines it at runtime when quality is set to Auto.
 */
export function detectDeviceTier(): QualityTier {
  const nav = navigator as Navigator & NavigatorExtras;
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  const touch = isTouchDevice();
  if (nav.connection?.saveData) return 'low';
  if (mem <= 2 || cores <= 2) return 'low';
  if (touch) {
    if (mem >= 6 && cores >= 8) return 'high';
    return 'medium';
  }
  if (cores <= 4 && mem <= 4) return 'medium';
  return 'high';
}

/** Scale at which procedural art is baked into the atlases. */
export function detectBakeScale(tier: QualityTier): number {
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  if (tier === 'low') return dpr > 1.2 ? 1.5 : 1;
  return dpr > 1.2 ? 2 : 1.25;
}

export function renderResolution(profile: QualityProfile, scaleDown = 1): number {
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  return Math.max(0.75, Math.min(dpr, 2, profile.maxResolution) * scaleDown);
}

/**
 * Watches frame times and nudges quality down (fast) or up (slowly) while
 * Auto quality is enabled. Pure logic; the caller applies the result.
 */
export class FpsGovernor {
  private samples = new Float32Array(90);
  private idx = 0;
  private filled = 0;
  private lowTime = 0;
  private highTime = 0;
  private cooldown = 0;
  /** Extra resolution multiplier applied inside a tier (1 → 0.7). */
  resScale = 1;

  constructor(public tier: QualityTier) {}

  reset(tier: QualityTier): void {
    this.tier = tier;
    this.resScale = 1;
    this.lowTime = 0;
    this.highTime = 0;
    this.filled = 0;
    this.cooldown = 2;
  }

  get averageFps(): number {
    if (this.filled === 0) return 60;
    let sum = 0;
    for (let i = 0; i < this.filled; i++) sum += this.samples[i]!;
    return 1000 / (sum / this.filled);
  }

  /**
   * Feed one frame (ms). Returns 'down' / 'up' when the caller should change
   * tier or resolution, otherwise null.
   */
  sample(frameMs: number, dtSeconds: number): 'down' | 'up' | null {
    // Ignore hitches from tab switches / GC spikes larger than 250ms.
    if (frameMs > 250) return null;
    this.samples[this.idx] = frameMs;
    this.idx = (this.idx + 1) % this.samples.length;
    if (this.filled < this.samples.length) this.filled++;
    if (this.cooldown > 0) {
      this.cooldown -= dtSeconds;
      return null;
    }
    if (this.filled < 45) return null;
    const fps = this.averageFps;
    if (fps < 48) {
      this.lowTime += dtSeconds;
      this.highTime = 0;
    } else if (fps > 58) {
      this.highTime += dtSeconds;
      this.lowTime = 0;
    } else {
      this.lowTime = Math.max(0, this.lowTime - dtSeconds);
      this.highTime = Math.max(0, this.highTime - dtSeconds);
    }
    if (this.lowTime > 2.5) {
      this.lowTime = 0;
      this.cooldown = 3;
      this.filled = 0;
      if (this.resScale > 0.75) {
        this.resScale = Math.max(0.7, this.resScale - 0.15);
        return 'down';
      }
      const i = TIER_ORDER.indexOf(this.tier);
      if (i > 0) {
        this.tier = TIER_ORDER[i - 1]!;
        this.resScale = 1;
        return 'down';
      }
      return null;
    }
    if (this.highTime > 12) {
      this.highTime = 0;
      this.cooldown = 4;
      if (this.resScale < 1) {
        this.resScale = Math.min(1, this.resScale + 0.15);
        return 'up';
      }
      return null; // never auto-upgrade tiers: avoids oscillation on borderline devices
    }
    return null;
  }
}
