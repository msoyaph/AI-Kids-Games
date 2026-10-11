import { Application, Container } from 'pixi.js';
import { h } from '../ui/dom';
import { FixedLoop } from './loop';
import type { Scene } from './Scene';
import { computeStage, type StageMetrics } from './stage';

export type SceneFactory = (params: Record<string, unknown>) => Scene;

export interface SafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Owns the Pixi application, the DOM UI layer, the fixed-timestep loop and scene switching.
 */
export class Game {
  app!: Application;
  metrics: StageMetrics;
  /** Logical safe-area insets (notches, home bar). */
  safe: SafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  readonly world = new Container();
  readonly fxLayer = new Container();
  readonly uiRoot: HTMLElement;
  readonly screenLayer: HTMLElement;
  readonly hudLayer: HTMLElement;
  readonly overlayLayer: HTMLElement;
  readonly topLayer: HTMLElement;
  readonly curtain: HTMLElement;
  readonly loop: FixedLoop;
  current: Scene | null = null;
  private factories = new Map<string, SceneFactory>();
  private switching = false;
  private hidden = false;
  /** Real seconds since start (for UI animations independent of game pause). */
  time = 0;
  /** Listeners run every logic step even while scenes are frozen (input polling etc). */
  readonly preStep: Array<(dt: number) => void> = [];
  readonly postStep: Array<(dt: number) => void> = [];
  readonly onResize: Array<(m: StageMetrics) => void> = [];
  readonly onSceneChange: Array<(name: string) => void> = [];
  readonly onVisibility: Array<(visible: boolean) => void> = [];
  rendererName = 'webgl';
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

  async init(): Promise<void> {
    const m = this.metrics;
    this.app = new Application();
    await this.app.init({
      preference: ['webgl', 'canvas'],
      width: window.innerWidth,
      height: window.innerHeight,
      resolution: m.resolution,
      autoDensity: true,
      antialias: false,
      backgroundColor: 0x140d3a,
      powerPreference: 'high-performance',
      autoStart: false,
      sharedTicker: false,
      hello: false,
    });
    this.rendererName = this.app.renderer.name;
    const canvas = this.app.canvas as HTMLCanvasElement;
    canvas.id = 'stage';
    canvas.setAttribute('aria-hidden', 'true');
    this.host.append(canvas, this.uiRoot);
    this.app.stage.addChild(this.world, this.fxLayer);
    this.app.ticker.add((t) => {
      const dt = t.deltaMS / 1000;
      this.time += Math.min(dt, 0.25);
      this.loop.tick(dt);
      this.app.render();
      this.countFps(dt);
    });

    const onResize = () => this.resize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', () => setTimeout(onResize, 120));
    window.visualViewport?.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', () => this.setVisible(document.visibilityState === 'visible'));
    window.addEventListener('pagehide', () => this.setVisible(false));
    window.addEventListener('pageshow', () => this.setVisible(document.visibilityState === 'visible'));
    if (new URLSearchParams(location.search).has('fps')) {
      this.fpsEl = h('div', { class: 'fps' }, '--');
      document.body.append(this.fpsEl);
    }
    this.resize();
  }

  register(name: string, factory: SceneFactory): void {
    this.factories.set(name, factory);
  }

  start(): void {
    this.app.ticker.start();
  }

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
        this.world.removeChild(old.root);
        old.destroy();
      }
      this.current = null;
      const scene = factory(params);
      this.world.addChild(scene.root);
      this.screenLayer.appendChild(scene.ui);
      this.current = scene;
      scene.resize(this.metrics.width, this.metrics.height);
      await scene.enter();
      this.loop.reset();
      for (const fn of this.onSceneChange) fn(name);
    } catch (err) {
      console.error('Scene switch failed', name, err);
    } finally {
      this.switching = false;
      this.curtain.classList.remove('on');
    }
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
    if (this.app?.renderer) {
      this.app.renderer.resize(w, h, m.resolution);
      this.app.stage.scale.set(m.scale);
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
  }

  private setVisible(visible: boolean): void {
    if (visible === !this.hidden) return;
    this.hidden = !visible;
    if (!this.app) return;
    if (visible) {
      this.loop.reset();
      this.app.ticker.start();
    } else {
      this.app.ticker.stop();
    }
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
      this.fpsEl.textContent = `${Math.round(this.fpsFrames / this.fpsTime)} fps · ${this.rendererName}`;
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
