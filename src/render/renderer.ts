import * as THREE from 'three';
import { QualityManager, detectDevice } from './quality';

export interface ViewRect {
  /** Normalised 0..1 rect, origin bottom-left (WebGL convention). */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RenderView {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  rect: ViewRect;
}

/**
 * Owns the WebGLRenderer. Handles resize, adaptive DPR and multi-viewport (split-screen) rendering.
 */
export class GameRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly quality: QualityManager;
  width = 1;
  height = 1;
  /** True while the browser has taken the WebGL context away (GPU reset, memory pressure, tab switch on iOS…). */
  contextLost = false;
  private resizeListeners: Array<(w: number, h: number) => void> = [];
  private lostListeners: Array<() => void> = [];
  private restoredListeners: Array<() => void> = [];

  constructor(readonly canvas: HTMLCanvasElement) {
    // Probe the GPU before choosing antialias (cannot be changed after context creation).
    const probe = document.createElement('canvas').getContext('webgl');
    const device = detectDevice(probe);
    this.quality = new QualityManager(device);
    const antialias = device.recommended === 'high' && (window.devicePixelRatio || 1) < 2;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = true;
    this.renderer.setClearColor(0x87d0ff, 1);
    this.renderer.info.autoReset = false;
    this.quality.onChange(() => this.applyQuality());
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault(); // allow the browser to restore it
      this.contextLost = true;
      for (const l of this.lostListeners) l();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.contextLost = false;
      // three.js re-creates its GL state and re-uploads buffers lazily; render targets need redrawing
      for (const l of this.restoredListeners) l();
    });
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(this.onResize).observe(canvas.parentElement ?? canvas);
    this.onResize();
    this.applyQuality();
  }

  get isTouch(): boolean {
    return this.quality.device.touch;
  }

  onResize = (): void => {
    const el = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(1, el.clientWidth || window.innerWidth);
    const h = Math.max(1, el.clientHeight || window.innerHeight);
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    for (const l of this.resizeListeners) l(w, h);
  };

  onResizeEvent(fn: (w: number, h: number) => void): void {
    this.resizeListeners.push(fn);
  }

  onContextLost(fn: () => void): () => void {
    this.lostListeners.push(fn);
    return () => (this.lostListeners = this.lostListeners.filter((f) => f !== fn));
  }

  onContextRestored(fn: () => void): () => void {
    this.restoredListeners.push(fn);
    return () => (this.restoredListeners = this.restoredListeners.filter((f) => f !== fn));
  }

  applyQuality(): void {
    const pr = this.quality.pixelRatio();
    if (Math.abs(this.renderer.getPixelRatio() - pr) > 0.01) {
      this.renderer.setPixelRatio(pr);
      this.renderer.setSize(this.width, this.height, false);
    }
    this.renderer.shadowMap.enabled = this.quality.profile.shadowMap;
  }

  /** Render one or more viewports. Cameras' aspect ratios are updated to match their rects. */
  render(views: readonly RenderView[]): void {
    const r = this.renderer;
    r.info.reset();
    if (views.length === 1 && views[0].rect.w === 1 && views[0].rect.h === 1) {
      const v = views[0];
      const aspect = this.width / this.height;
      if (Math.abs(v.camera.aspect - aspect) > 1e-4) {
        v.camera.aspect = aspect;
        v.camera.updateProjectionMatrix();
      }
      r.setScissorTest(false);
      r.setViewport(0, 0, this.width, this.height);
      r.render(v.scene, v.camera);
      return;
    }
    r.setScissorTest(true);
    for (const v of views) {
      const x = Math.round(v.rect.x * this.width);
      const y = Math.round(v.rect.y * this.height);
      const w = Math.round(v.rect.w * this.width);
      const h = Math.round(v.rect.h * this.height);
      const aspect = w / Math.max(1, h);
      if (Math.abs(v.camera.aspect - aspect) > 1e-4) {
        v.camera.aspect = aspect;
        v.camera.updateProjectionMatrix();
      }
      r.setViewport(x, y, w, h);
      r.setScissor(x, y, w, h);
      r.render(v.scene, v.camera);
    }
    r.setScissorTest(false);
  }

  /** Render a single sub-viewport (split-screen). `first` resets per-frame stats. */
  renderSub(v: RenderView, first: boolean): void {
    const r = this.renderer;
    if (first) r.info.reset();
    const x = Math.round(v.rect.x * this.width);
    const y = Math.round(v.rect.y * this.height);
    const w = Math.round(v.rect.w * this.width);
    const h = Math.round(v.rect.h * this.height);
    const aspect = w / Math.max(1, h);
    if (Math.abs(v.camera.aspect - aspect) > 1e-4) {
      v.camera.aspect = aspect;
      v.camera.updateProjectionMatrix();
    }
    r.setScissorTest(true);
    r.setViewport(x, y, w, h);
    r.setScissor(x, y, w, h);
    r.render(v.scene, v.camera);
    r.setScissorTest(false);
  }

  /** Draw calls / triangles of the last frame, for the debug overlay. */
  stats(): { calls: number; triangles: number } {
    const info = this.renderer.info.render;
    return { calls: info.calls, triangles: info.triangles };
  }
}
