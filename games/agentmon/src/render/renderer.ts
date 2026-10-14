/**
 * The Pixi application (adapted from Cliff Valley): WebGL with a Canvas fallback, crisp nearest-
 * neighbour pixels, device-pixel sizing, integer zoom, and context-loss handling.
 */
import { Application, TextureSource } from 'pixi.js';

export interface RenderHost {
  app: Application;
  /** Device pixels. */
  width: number;
  height: number;
  dpr: number;
  /** Integer scale for 16-px tiles, from the screen's short side. */
  zoom: number;
  kind: 'webgl' | 'webgpu' | 'canvas';
  /** Drawing at 1× (no extra device pixels): `?low`, a software renderer, or a slow device. */
  lowQuality: boolean;
  /** Switch to 1× drawing (the frame-rate governor calls this when frames stay slow). */
  setLowQuality(): void;
  onResize: (() => void)[];
  onContextRestored: (() => void)[];
  resize(): void;
}

export async function createRenderer(parent: HTMLElement, lowQuality: boolean): Promise<RenderHost> {
  TextureSource.defaultOptions.scaleMode = 'nearest';
  const app = new Application();
  await app.init({
    preference: 'webgl',
    antialias: false,
    resolution: 1,
    autoDensity: false,
    background: 0x1f1a33,
    roundPixels: true,
    autoStart: false,
    sharedTicker: false,
    hello: false,
    preserveDrawingBuffer: false,
    width: 320,
    height: 240,
  });
  const canvas = app.canvas as HTMLCanvasElement;
  canvas.id = 'game';
  canvas.setAttribute('aria-hidden', 'true');
  parent.prepend(canvas);
  const name = app.renderer.name;
  // A software renderer (no GPU, as on CI runners and some old computers) draws every pixel on the
  // CPU: keep the canvas at 1× there.
  let software = false;
  try {
    const gl = (app.renderer as unknown as { gl?: WebGLRenderingContext }).gl;
    if (gl) {
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      software = /swiftshader|llvmpipe|softpipe|software/i.test(String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)));
    }
  } catch { software = false; }
  const host: RenderHost = {
    app,
    width: 320,
    height: 240,
    dpr: 1,
    zoom: 3,
    kind: name === 'webgl' ? 'webgl' : name === 'webgpu' ? 'webgpu' : 'canvas',
    lowQuality: lowQuality || software,
    setLowQuality() { if (!host.lowQuality) { host.lowQuality = true; host.resize(); } },
    onResize: [],
    onContextRestored: [],
    resize() {
      const cssW = Math.max(1, parent.clientWidth || window.innerWidth);
      const cssH = Math.max(1, parent.clientHeight || window.innerHeight);
      const dpr = Math.min(host.lowQuality ? 1 : 2, window.devicePixelRatio || 1);
      const w = Math.floor(cssW * dpr), h = Math.floor(cssH * dpr);
      host.dpr = dpr;
      host.width = w;
      host.height = h;
      app.renderer.resize(w, h);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      // about 11–15 tiles across the short side, in whole-pixel steps
      const minDim = Math.min(cssW, cssH);
      const desired = Math.max(28, Math.min(64, minDim / 11));
      host.zoom = Math.max(1, Math.round((desired * dpr) / 16));
      for (const f of host.onResize) f();
    },
  };
  host.resize();
  window.addEventListener('resize', () => host.resize());
  window.addEventListener('orientationchange', () => setTimeout(() => host.resize(), 200));
  canvas.addEventListener('webglcontextlost', e => e.preventDefault());
  canvas.addEventListener('webglcontextrestored', () => { for (const f of host.onContextRestored) f(); });
  return host;
}
