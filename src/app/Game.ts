import type { Application, Container } from 'pixi.js';
import { R3 } from '../r3/R3';
import type { QualitySetting } from '../systems/quality';
import { h } from '../ui/dom';
import type { BaseScene } from './BaseScene';
import { FLAGS } from './flags';
import { FixedLoop } from './loop';
import type { Scene } from './Scene';
import type { Scene3D } from './Scene3D';
import { computeStage, type StageMetrics } from './stage';

export type SceneFactory = (params: Record<string, unknown>) => BaseScene;

export interface SafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Owns the renderers (Three.js for 3D scenes, Pixi only for screens not yet ported), the DOM UI
 * layer, the fixed-timestep loop and scene switching.
 */
export class Game {
  r3!: R3;
  private pixi: Application | null = null;
  private pixiWorld: Container | null = null;
  private pixiLoading: Promise<void> | null = null;
  metrics: StageMetrics;
  /** Logical safe-area insets (notches, home bar). */
  safe: SafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  readonly uiRoot: HTMLElement;
  readonly screenLayer: HTMLElement;
  readonly hudLayer: HTMLElement;
  readonly overlayLayer: HTMLElement;
  readonly topLayer: HTMLElement;
  readonly curtain: HTMLElement;
  readonly loop: FixedLoop;
  current: BaseScene | null = null;
  private currentParams: Record<string, unknown> = {};
  private factories = new Map<string, SceneFactory>();
  private switching = false;
  private hidden = false;
  private running = false;
  private raf = 0;
  private lastNow = 0;
  /** Real seconds since start (for UI animations independent of game pause). */
  time = 0;
  /** Listeners run every logic step even while scenes are frozen (input polling etc). */
  readonly preStep: Array<(dt: number) => void> = [];
  readonly postStep: Array<(dt: number) => void> = [];
  readonly onResize: Array<(m: StageMetrics) => void> = [];
  readonly onSceneChange: Array<(name: string) => void> = [];
  readonly onVisibility: Array<(visible: boolean) => void> = [];
  private fpsEl: HTMLElement | null = null;
  private fpsFrames = 0;
  private fpsTime = 0;

  constructor(private readonly host: HTMLElement) {
    this.metrics = computeStage(window.innerWidth, window.innerHeight, window.devicePixelRatio);
    this.uiRoot = h('div', { id: 'ui' });
    this.screenLayer = h('div', { class: 'layer layer-screen' });
    this.hudLayer = h('div', { class: 'layer layer-hud' });
    this.overlayLayer = h('div', { class: 'layer layer-overlay' });
    this.topLayer = h('div', { class: 'layer layer-top' });
    this.curtain = h('div', { class: 'curtain' });
    this.uiRoot.append(this.screenLayer, this.hudLayer, this.overlayLayer, this.topLayer, this.curtain);
    this.loop = new FixedLoop(
      60,
      (dt) => this.step(dt),
      (a) => this.renderFrame(a),
    );
  }

  init(quality: QualitySetting): void {
    this.r3 = new R3(quality, FLAGS.quality);
    this.host.append(this.r3.canvas, this.uiRoot);
    this.r3.onRestore.push(() => this.reloadScene());
    const onResize = () => this.resize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', () => setTimeout(onResize, 120));
    window.visualViewport?.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', () => this.setVisible(document.visibilityState === 'visible'));
    window.addEventListener('pagehide', () => this.setVisible(false));
    window.addEventListener('pageshow', () => this.setVisible(document.visibilityState === 'visible'));
    if (FLAGS.fps) {
      this.fpsEl = h('div', { class: 'fps', 'data-testid': 'fps' }, '--');
      document.body.append(this.fpsEl);
    }
    this.resize();
  }

  /** Pixi is only created the first time a not-yet-ported 2D scene is shown. */
  private ensurePixi(): Promise<void> {
    if (this.pixi) return Promise.resolve();
    if (!this.pixiLoading) {
      this.pixiLoading = (async () => {
        const { Application, Container } = await import('pixi.js');
        const app = new Application();
        await app.init({
          preference: ['webgl', 'canvas'],
          width: window.innerWidth,
          height: window.innerHeight,
          resolution: this.metrics.resolution,
          autoDensity: true,
          antialias: false,
          backgroundColor: 0x140d3a,
          powerPreference: 'high-performance',
          autoStart: false,
          sharedTicker: false,
          hello: false,
        });
        const canvas = app.canvas as HTMLCanvasElement;
        canvas.id = 'stage';
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.display = 'none';
        this.host.insertBefore(canvas, this.uiRoot);
        this.pixiWorld = new Container();
        app.stage.addChild(this.pixiWorld);
        this.pixi = app;
        this.resize();
      })();
    }
    return this.pixiLoading;
  }

  register(name: string, factory: SceneFactory): void {
    this.factories.set(name, factory);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastNow = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private readonly frame = (now: number): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    const ms = Math.max(0, now - this.lastNow);
    this.lastNow = now;
    const dt = ms / 1000;
    this.time += Math.min(dt, 0.25);
    this.loop.tick(dt);
    const s = this.current;
    if (s) {
      if (s.kind === '3d') {
        const s3 = s as Scene3D;
        s3.time += Math.min(dt, 0.25);
        this.r3.render(s3.world, s3.camera, dt);
      } else this.pixi?.render();
    }
    if (!this.switching) this.r3.sampleFrame(ms, Math.min(dt, 0.25));
    this.countFps(dt);
  };

  /** Switch scenes with a quick fade. */
  async go(name: string, params: Record<string, unknown> = {}, fade = true): Promise<void> {
    const factory = this.factories.get(name);
    if (!factory) throw new Error(`Unknown scene ${name}`);
    if (this.switching) return;
    this.switching = true;
    try {
      if (fade && this.current) {
        this.curtain.classList.add('on');
        await wait(220);
      }
      const old = this.current;
      if (old) {
        old.exit();
        if (old.kind === '2d') this.pixiWorld?.removeChild((old as Scene).root);
        old.destroy();
      }
      this.current = null;
      const scene = factory(params);
      if (scene.kind === '2d') {
        await this.ensurePixi();
        this.pixiWorld!.addChild((scene as Scene).root);
      }
      this.showCanvas(scene.kind);
      this.screenLayer.appendChild(scene.ui);
      this.current = scene;
      this.currentParams = params;
      scene.resize(this.metrics.width, this.metrics.height);
      await scene.enter();
      if (scene.kind === '3d') {
        const s3 = scene as Scene3D;
        await this.r3.compile(s3.world, s3.camera);
      }
      this.loop.reset();
      this.lastNow = performance.now();
      this.r3.governor.settle(1.5);
      for (const fn of this.onSceneChange) fn(name);
    } catch (err) {
      console.error('Scene switch failed', name, err);
    } finally {
      this.switching = false;
      this.curtain.classList.remove('on');
    }
  }

  /** Rebuild the current scene (after the GPU context comes back). */
  private reloadScene(): void {
    const name = this.sceneName;
    if (name) void this.go(name, this.currentParams, false);
  }

  private showCanvas(kind: '2d' | '3d'): void {
    this.r3.canvas.style.display = kind === '3d' ? 'block' : 'none';
    const pc = this.pixi?.canvas as HTMLCanvasElement | undefined;
    if (pc) pc.style.display = kind === '2d' ? 'block' : 'none';
  }

  get isSwitching(): boolean {
    return this.switching;
  }

  get sceneName(): string {
    return this.current?.name ?? '';
  }

  private step(dt: number): void {
    for (const fn of this.preStep) fn(dt);
    const s = this.current;
    if (s && !s.frozen && !this.switching) s.update(dt);
    for (const fn of this.postStep) fn(dt);
  }

  private renderFrame(alpha: number): void {
    this.current?.render(alpha);
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const m = computeStage(w, h, window.devicePixelRatio);
    this.metrics = m;
    this.safe = readSafeInsets(m.scale);
    this.r3?.resize(w, h);
    if (this.pixi?.renderer) {
      this.pixi.renderer.resize(w, h, m.resolution);
      this.pixi.stage.scale.set(m.scale);
    }
    const st = this.uiRoot.style;
    st.width = `${m.width}px`;
    st.height = `${m.height}px`;
    st.transform = `scale(${m.scale})`;
    st.setProperty('--safe-t', `${this.safe.top}px`);
    st.setProperty('--safe-r', `${this.safe.right}px`);
    st.setProperty('--safe-b', `${this.safe.bottom}px`);
    st.setProperty('--safe-l', `${this.safe.left}px`);
    document.body.classList.toggle('portrait', m.portrait);
    this.current?.resize(m.width, m.height);
    for (const fn of this.onResize) fn(m);
    // A resize clears the canvas; repaint once even if the loop is paused (hidden tab).
    if (this.hidden) this.renderOnce();
  }

  /** Draws one frame without advancing game logic (hidden tabs, debugging, screenshots). */
  renderOnce(): void {
    const s = this.current;
    if (!s) return;
    s.render(0);
    if (s.kind === '3d') {
      const s3 = s as Scene3D;
      this.r3.render(s3.world, s3.camera, 1 / 60);
    } else this.pixi?.render();
  }

  /** Debug/test helper: advance logic and render for a number of frames, even while hidden. */
  advance(frames = 1, dt = 1 / 60): void {
    for (let i = 0; i < frames; i++) {
      this.time += dt;
      const s = this.current;
      if (s?.kind === '3d') (s as Scene3D).time += dt;
      this.loop.tick(dt);
    }
    this.renderOnce();
  }

  private setVisible(visible: boolean): void {
    if (visible === !this.hidden) return;
    this.hidden = !visible;
    if (visible) {
      this.loop.reset();
      this.start();
      this.r3?.governor.settle(1.5);
    } else this.stop();
    for (const fn of this.onVisibility) fn(visible);
  }

  get isHidden(): boolean {
    return this.hidden;
  }

  private countFps(dt: number): void {
    if (!this.fpsEl) return;
    this.fpsFrames++;
    this.fpsTime += dt;
    if (this.fpsTime >= 0.5) {
      const fps = Math.round(this.fpsFrames / this.fpsTime);
      const kind = this.current?.kind ?? '-';
      if (kind === '3d') {
        const st = this.r3.stats();
        const g = this.r3.governor;
        this.fpsEl.textContent = `${fps} fps · ${g.tier} ×${g.scale.toFixed(2)} @${this.r3.pixelRatio.toFixed(2)} · ${st.calls} calls · ${Math.round(st.triangles / 1000)}k tris · ${st.geometries}g ${st.textures}t`;
      } else this.fpsEl.textContent = `${fps} fps · pixi`;
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
  }
}

export function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

let probe: HTMLElement | null = null;
function readSafeInsets(scale: number): SafeInsets {
  if (!probe) {
    probe = h('div', {
      style: 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);',
    });
    document.body.append(probe);
  }
  const cs = getComputedStyle(probe);
  const px = (v: string) => (parseFloat(v) || 0) / scale;
  return { top: px(cs.paddingTop), right: px(cs.paddingRight), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft) };
}
