import {
  ACESFilmicToneMapping,
  NoToneMapping,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  type Camera,
  type Texture,
} from 'three';
import {
  pixelRatioFor,
  PROFILES,
  QualityGovernor,
  type QualityProfile,
  type QualitySetting,
  type QualityTier,
} from '../systems/quality';
import { detectDevice, type DeviceInfo } from './device';
import { makeEnvironment } from './env';
import { PostChain } from './post';

export interface RenderStats {
  calls: number;
  triangles: number;
  points: number;
  geometries: number;
  textures: number;
  programs: number;
}

function probeDevice(): DeviceInfo {
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = document.createElement('canvas').getContext('webgl2');
  } catch {
    gl = null;
  }
  const info = detectDevice(gl);
  try {
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    /* ignore */
  }
  return info;
}

/**
 * Owns the Three.js WebGL2 renderer, the quality tier and adaptive governor, the post-processing
 * chain and the shared environment map. Scenes hand it their Scene + Camera every frame.
 */
export class R3 {
  readonly renderer: WebGLRenderer;
  readonly canvas: HTMLCanvasElement;
  readonly device: DeviceInfo;
  readonly governor: QualityGovernor;
  setting: QualitySetting;
  env: Texture;
  lost = false;
  /** Called after the tier or render scale changed (scenes may rebuild instance counts...). */
  readonly onProfile: Array<(p: QualityProfile) => void> = [];
  /** Called after a lost WebGL context comes back. */
  readonly onRestore: Array<() => void> = [];
  private post: PostChain | null = null;
  private postTier: QualityTier | null = null;
  private cssW = 1;
  private cssH = 1;
  private readonly forced: QualityTier | null;
  private readonly emptyScene = new Scene();
  private readonly emptyCam = new PerspectiveCamera();

  constructor(setting: QualitySetting, forced: QualityTier | null = null) {
    this.device = probeDevice();
    this.forced = forced;
    this.setting = setting;
    const start = this.startTier();
    const canvas = document.createElement('canvas');
    canvas.id = 'stage3';
    canvas.setAttribute('aria-hidden', 'true');
    this.canvas = canvas;
    this.renderer = new WebGLRenderer({
      canvas,
      // Low renders straight to the screen, so it gets the browser's MSAA; the others antialias in post.
      antialias: start === 'low',
      alpha: false,
      depth: true,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    const r = this.renderer;
    r.outputColorSpace = SRGBColorSpace;
    r.toneMappingExposure = 1;
    r.shadowMap.type = PCFSoftShadowMap;
    r.info.autoReset = false;
    r.setClearColor(0x140d3a, 1);
    this.governor = new QualityGovernor(start, this.isAuto(), this.ceiling());
    this.env = makeEnvironment(r);
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
      showLostOverlay(true);
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.lost = false;
      this.env = makeEnvironment(r);
      this.post?.dispose();
      this.post = null;
      this.postTier = null;
      this.applyProfile();
      showLostOverlay(false);
      for (const fn of this.onRestore) fn();
    });
    this.applyProfile();
  }

  private isAuto(): boolean {
    return !this.forced && this.setting === 'auto';
  }

  private startTier(): QualityTier {
    if (this.forced) return this.forced;
    return this.setting === 'auto' ? this.device.recommended : this.setting;
  }

  private ceiling(): QualityTier {
    return this.startTier();
  }

  get profile(): QualityProfile {
    return PROFILES[this.governor.tier];
  }

  get tier(): QualityTier {
    return this.governor.tier;
  }

  /** Player changed the Quality setting. */
  setQuality(setting: QualitySetting): void {
    this.setting = setting;
    this.governor.reset(this.startTier(), this.isAuto(), this.ceiling());
    this.applyProfile();
  }

  private applyProfile(): void {
    const p = this.profile;
    const r = this.renderer;
    r.toneMapping = p.post ? NoToneMapping : ACESFilmicToneMapping;
    r.shadowMap.enabled = p.shadows;
    if (p.post) {
      if (!this.post || this.postTier !== p.tier) {
        this.post?.dispose();
        this.post = new PostChain(r, p, this.emptyScene, this.emptyCam);
        this.postTier = p.tier;
      }
    } else if (this.post) {
      this.post.dispose();
      this.post = null;
      this.postTier = null;
    }
    this.resize(this.cssW, this.cssH);
    for (const fn of this.onProfile) fn(p);
  }

  get pixelRatio(): number {
    return pixelRatioFor(this.profile, window.devicePixelRatio || 1, this.governor.scale);
  }

  resize(cssW: number, cssH: number): void {
    this.cssW = Math.max(1, Math.round(cssW));
    this.cssH = Math.max(1, Math.round(cssH));
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.cssW, this.cssH, true);
    this.post?.setSize(this.cssW, this.cssH);
  }

  /** Feed the real frame time; adapts render scale / tier when needed. */
  sampleFrame(frameMs: number, dt: number): void {
    const change = this.governor.sample(frameMs, dt);
    if (change === 'scale') this.resize(this.cssW, this.cssH);
    else if (change === 'tier') this.applyProfile();
  }

  render(scene: Scene, camera: Camera, dt: number): void {
    if (this.lost) return;
    this.renderer.info.reset();
    if (this.post) this.post.render(scene, camera, dt);
    else this.renderer.render(scene, camera);
  }

  /** Compiles every shader a scene needs (behind a loading screen or a fade) to avoid hitches. */
  async compile(scene: Scene, camera: Camera): Promise<void> {
    if (this.lost) return;
    try {
      await this.renderer.compileAsync(scene, camera);
    } catch (err) {
      console.warn('Shader warm-up failed', err);
    }
  }

  stats(): RenderStats {
    const i = this.renderer.info;
    return {
      calls: i.render.calls,
      triangles: i.render.triangles,
      points: i.render.points,
      geometries: i.memory.geometries,
      textures: i.memory.textures,
      programs: i.programs?.length ?? 0,
    };
  }
}

let lostEl: HTMLElement | null = null;
function showLostOverlay(on: boolean): void {
  if (!on) {
    lostEl?.remove();
    lostEl = null;
    return;
  }
  if (lostEl) return;
  lostEl = document.createElement('div');
  lostEl.className = 'gl-lost';
  lostEl.setAttribute('role', 'alert');
  lostEl.innerHTML = '<div class="gl-lost-box"><div class="gl-lost-emoji">😴</div><div>Oops! The screen took a little nap.</div><button type="button">Tap to keep playing</button></div>';
  lostEl.querySelector('button')?.addEventListener('click', () => location.reload());
  document.body.append(lostEl);
}
