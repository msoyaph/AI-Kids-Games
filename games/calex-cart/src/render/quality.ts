// Device detection + adaptive quality. Auto mode lowers resolution first, then draw distance,
// shadows and particles when frame time stays high, and slowly recovers when there is headroom.

export type QualityLevel = 'low' | 'medium' | 'high';
export type QualitySetting = 'auto' | QualityLevel;

export interface QualityProfile {
  level: QualityLevel;
  /** Upper bound for devicePixelRatio. */
  maxDpr: number;
  /** Real shadow map for the local player's surroundings (otherwise blob shadows only). */
  shadowMap: boolean;
  shadowMapSize: number;
  /** Camera far plane / fog end, metres. */
  drawDistance: number;
  /** 0..1 fraction of scenery props drawn. */
  propDensity: number;
  /** Max simultaneous particles. */
  particleBudget: number;
  speedLines: boolean;
  /** Skid marks on the road. */
  skidmarks: boolean;
  /** Scenery LOD: full-detail props within this distance (m), simplified LOD1 out to propLodDist, then impostors. */
  propFullDist: number;
  propLodDist: number;
  /** Props with a bounding radius above this (m) never become impostors (big landmarks stay 3D). */
  propBigRadius: number;
}

export const PROFILES: Record<QualityLevel, QualityProfile> = {
  low: {
    level: 'low',
    maxDpr: 1,
    shadowMap: false,
    shadowMapSize: 0,
    drawDistance: 230,
    propDensity: 0.4,
    particleBudget: 300,
    speedLines: false,
    skidmarks: false,
    propFullDist: 0,
    propLodDist: 60,
    propBigRadius: 22,
  },
  medium: {
    level: 'medium',
    maxDpr: 1.5,
    shadowMap: false,
    shadowMapSize: 0,
    drawDistance: 420,
    propDensity: 0.75,
    particleBudget: 700,
    speedLines: true,
    skidmarks: true,
    propFullDist: 80,
    propLodDist: 170,
    propBigRadius: 12,
  },
  high: {
    level: 'high',
    maxDpr: 2,
    shadowMap: true,
    shadowMapSize: 1024,
    drawDistance: 600,
    propDensity: 1,
    particleBudget: 1400,
    speedLines: true,
    skidmarks: true,
    propFullDist: 150,
    propLodDist: 320,
    propBigRadius: 10,
  },
};

const ORDER: QualityLevel[] = ['low', 'medium', 'high'];

export interface DeviceInfo {
  touch: boolean;
  mobile: boolean;
  cores: number;
  memoryGb: number;
  gpu: string;
  weakGpu: boolean;
  recommended: QualityLevel;
}

const WEAK_GPU = /(swiftshader|llvmpipe|softpipe|mali-[2-4]\d\d|mali-t[6-7]|adreno \(tm\) [2-5]\d\d|powervr sgx|intel\(r\) hd graphics [2-5]\d{2,3}|gma)/i;

export function detectDevice(gl?: WebGLRenderingContext | WebGL2RenderingContext | null): DeviceInfo {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const ua = nav.userAgent || '';
  const mobile = touch && /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(ua) || (touch && Math.min(screen.width, screen.height) < 820);
  const cores = nav.hardwareConcurrency || 4;
  const memoryGb = nav.deviceMemory ?? (mobile ? 3 : 8);
  let gpu = '';
  if (gl) {
    try {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      gpu = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
    } catch {
      gpu = '';
    }
  }
  const weakGpu = WEAK_GPU.test(gpu);
  let recommended: QualityLevel;
  if (weakGpu || cores <= 2 || memoryGb <= 2) recommended = 'low';
  else if (mobile) recommended = cores >= 8 && memoryGb >= 6 ? 'medium' : 'low';
  else if (cores <= 4 || memoryGb <= 4) recommended = 'medium';
  else recommended = 'high';
  return { touch, mobile, cores, memoryGb, gpu, weakGpu, recommended };
}

export type QualityListener = (q: QualityManager) => void;

/**
 * Tracks frame time and adapts render scale / quality level.
 * - renderScale: multiplies the DPR (0.55..1).
 * - level: only changes automatically when setting === 'auto'.
 */
export class QualityManager {
  setting: QualitySetting = 'auto';
  level: QualityLevel;
  renderScale = 1;
  splitScreen = false;
  /** Smoothed frame time in ms. */
  avgFrameMs = 16.7;
  fps = 60;
  private slowTime = 0;
  private fastTime = 0;
  private cooldown = 0;
  private listeners: QualityListener[] = [];
  private fpsAcc = 0;
  private fpsFrames = 0;
  /** Whether adaptation is active (only during races, not menus). */
  adaptive = false;

  constructor(readonly device: DeviceInfo) {
    this.level = device.recommended;
  }

  onChange(fn: QualityListener): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private emit(): void {
    for (const l of this.listeners) l(this);
  }

  setSetting(s: QualitySetting): void {
    this.setting = s;
    this.level = s === 'auto' ? this.device.recommended : s;
    this.renderScale = 1;
    this.slowTime = this.fastTime = 0;
    this.emit();
  }

  setSplitScreen(on: boolean): void {
    if (this.splitScreen === on) return;
    this.splitScreen = on;
    this.emit();
  }

  /** Effective profile, with split-screen reductions applied. */
  get profile(): QualityProfile {
    const base = PROFILES[this.level];
    if (!this.splitScreen) return base;
    return {
      ...base,
      maxDpr: Math.min(base.maxDpr, 1.25),
      shadowMap: false,
      drawDistance: base.drawDistance * 0.75,
      propDensity: base.propDensity * 0.7,
      propFullDist: base.propFullDist * 0.7,
      propLodDist: base.propLodDist * 0.75,
      particleBudget: Math.floor(base.particleBudget * 0.6),
      speedLines: base.speedLines && base.level === 'high',
    };
  }

  pixelRatio(): number {
    const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
    return Math.max(0.5, Math.min(dpr, this.profile.maxDpr) * this.renderScale);
  }

  /** Feed the real frame delta (seconds). Returns true if quality changed. */
  sample(frameDt: number): boolean {
    if (frameDt <= 0) return false;
    const ms = frameDt * 1000;
    this.avgFrameMs += (ms - this.avgFrameMs) * 0.05;
    this.fpsAcc += frameDt;
    this.fpsFrames++;
    if (this.fpsAcc >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsAcc);
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }
    if (!this.adaptive) return false;
    if (this.cooldown > 0) {
      this.cooldown -= frameDt;
      return false;
    }
    // Below ~52 fps sustained → degrade. Above ~58 fps with headroom for a while → recover.
    if (this.avgFrameMs > 19.2) {
      this.slowTime += frameDt;
      this.fastTime = 0;
    } else if (this.avgFrameMs < 17.4) {
      this.fastTime += frameDt;
      this.slowTime = 0;
    } else {
      this.slowTime = Math.max(0, this.slowTime - frameDt);
      this.fastTime = Math.max(0, this.fastTime - frameDt);
    }
    if (this.slowTime > 1.2) {
      this.slowTime = 0;
      return this.degrade();
    }
    if (this.fastTime > 6) {
      this.fastTime = 0;
      return this.recover();
    }
    return false;
  }

  private degrade(): boolean {
    this.cooldown = 1.5;
    if (this.renderScale > 0.8) {
      this.renderScale = Math.round((this.renderScale - 0.1) * 100) / 100;
      this.emit();
      return true;
    }
    if (this.setting === 'auto') {
      const i = ORDER.indexOf(this.level);
      if (i > 0) {
        this.level = ORDER[i - 1];
        this.renderScale = 1;
        this.emit();
        return true;
      }
    }
    if (this.renderScale > 0.55) {
      this.renderScale = Math.round((this.renderScale - 0.1) * 100) / 100;
      this.emit();
      return true;
    }
    return false;
  }

  private recover(): boolean {
    this.cooldown = 3;
    if (this.renderScale < 1) {
      this.renderScale = Math.min(1, Math.round((this.renderScale + 0.1) * 100) / 100);
      this.emit();
      return true;
    }
    // Only climb back up to the device's recommended tier, never above it automatically.
    if (this.setting === 'auto') {
      const i = ORDER.indexOf(this.level);
      const cap = ORDER.indexOf(this.device.recommended);
      if (i < cap) {
        this.level = ORDER[i + 1];
        this.renderScale = 0.8;
        this.emit();
        return true;
      }
    }
    return false;
  }
}
