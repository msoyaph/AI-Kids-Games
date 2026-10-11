import 'pixi.js/unsafe-eval';
import { Application, Container } from 'pixi.js';

/**
 * Owns the Pixi application: renderer selection (WebGL → Canvas fallback),
 * DPR-aware resolution and responsive resizing.
 */
export class Stage {
  readonly app = new Application();
  readonly root = new Container();
  resolution = 1;
  maxTextureSize = 2048;
  private resizeHandlers: ((w: number, h: number) => void)[] = [];
  private pendingResize = 0;

  async init(host: HTMLElement, resolution: number): Promise<void> {
    this.resolution = resolution;
    await this.app.init({
      preference: ['webgl', 'canvas'],
      resolution,
      autoDensity: true,
      antialias: false,
      backgroundColor: 0x1b1446,
      width: Math.max(1, host.clientWidth || innerWidth),
      height: Math.max(1, host.clientHeight || innerHeight),
      preserveDrawingBuffer: false,
      autoStart: false,
      sharedTicker: false,
      hello: false,
    });
    const canvas = this.app.canvas;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'none';
    canvas.setAttribute('aria-label', 'Game board');
    host.appendChild(canvas);
    this.app.stage.addChild(this.root);
    this.app.ticker.maxFPS = 60;

    const r = this.app.renderer as unknown as { gl?: WebGLRenderingContext };
    if (r.gl) {
      try {
        this.maxTextureSize = r.gl.getParameter(r.gl.MAX_TEXTURE_SIZE) as number;
      } catch {
        /* keep default */
      }
    }

    const onResize = (): void => {
      cancelAnimationFrame(this.pendingResize);
      this.pendingResize = requestAnimationFrame(() => this.resize());
    };
    addEventListener('resize', onResize);
    addEventListener('orientationchange', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    this.resize();
  }

  get rendererName(): string {
    const t = this.app.renderer.type;
    return t === 1 ? 'webgl' : t === 2 ? 'webgpu' : 'canvas';
  }

  get width(): number {
    return this.app.screen.width;
  }

  get height(): number {
    return this.app.screen.height;
  }

  onResize(fn: (w: number, h: number) => void): void {
    this.resizeHandlers.push(fn);
  }

  setResolution(res: number): void {
    if (Math.abs(res - this.resolution) < 0.01) return;
    this.resolution = res;
    this.resize();
  }

  resize(): void {
    const host = this.app.canvas.parentElement;
    const w = Math.max(1, host?.clientWidth || innerWidth);
    const h = Math.max(1, host?.clientHeight || innerHeight);
    this.app.renderer.resize(w, h, this.resolution);
    for (const fn of this.resizeHandlers) fn(w, h);
    this.requestRender();
  }

  private renderQueued = false;

  /**
   * Render one frame on demand while the ticker is stopped (menus, pause).
   * Must run inside rAF or some browsers never present the WebGL frame.
   */
  requestRender(): void {
    if (this.renderQueued || this.app.ticker.started) return;
    this.renderQueued = true;
    requestAnimationFrame(() => {
      this.renderQueued = false;
      this.app.renderer.render(this.app.stage);
    });
  }
}
