/** Pixi application setup: WebGL with Canvas fallback, device-pixel sizing, context loss. */
import { Application, TextureSource } from 'pixi.js';

export interface RenderHost {
  app: Application;
  /** device pixels */
  width: number;
  height: number;
  dpr: number;
  zoom: number;
  kind: 'webgl' | 'webgpu' | 'canvas';
  onResize: (() => void)[];
  onContextLost: (() => void)[];
  onContextRestored: (() => void)[];
  /** user zoom preference: -1 smaller, 0 auto, +1 bigger */
  zoomBias: number;
  resize(): void;
}

export async function createRenderer(parent: HTMLElement, lowQuality: boolean): Promise<RenderHost> {
  TextureSource.defaultOptions.scaleMode = 'nearest';
  const app = new Application();
  await app.init({
    preference: ['webgl', 'canvas'],
    antialias: false,
    resolution: 1,
    autoDensity: false,
    background: 0x101018,
    roundPixels: true,
    autoStart: false,
    sharedTicker: false,
    hello: false,
    preserveDrawingBuffer: false,
    width: 320,
    height: 240,
  });
  const canvas = app.canvas as HTMLCanvasElement;
  canvas.setAttribute('aria-label', 'Cliff Valley game');
  parent.appendChild(canvas);
  const kind = app.renderer.name === 'webgl' ? 'webgl' : app.renderer.name === 'webgpu' ? 'webgpu' : 'canvas';

  const host: RenderHost = {
    app,
    width: 320,
    height: 240,
    dpr: 1,
    zoom: 2,
    kind,
    onResize: [],
    onContextLost: [],
    onContextRestored: [],
    zoomBias: 0,
    resize() {
      const cssW = Math.max(1, parent.clientWidth || window.innerWidth);
      const cssH = Math.max(1, parent.clientHeight || window.innerHeight);
      const maxDpr = lowQuality ? 1 : 2;
      const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
      const w = Math.floor(cssW * dpr), h = Math.floor(cssH * dpr);
      host.dpr = dpr;
      host.width = w;
      host.height = h;
      app.renderer.resize(w, h);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      // integer zoom from a desired on-screen tile size in CSS px
      const minDim = Math.min(cssW, cssH);
      const desired = Math.max(30, Math.min(60, minDim / 12)) * (1 + host.zoomBias * 0.25);
      host.zoom = Math.max(1, Math.round((desired * dpr) / 16));
      for (const f of host.onResize) f();
    },
  };
  host.resize();
  window.addEventListener('resize', () => host.resize());
  window.addEventListener('orientationchange', () => setTimeout(() => host.resize(), 200));

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    for (const f of host.onContextLost) f();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    for (const f of host.onContextRestored) f();
  });
  return host;
}
