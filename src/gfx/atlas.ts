import { CanvasSource, Rectangle, Texture } from 'pixi.js';
import { makeCanvas, type Ctx } from './canvas';

export interface SpriteDef {
  name: string;
  /** Logical size. */
  w: number;
  h: number;
  /** Default anchor (0..1). */
  ax?: number;
  ay?: number;
  draw: (ctx: Ctx, w: number, h: number) => void;
}

interface Placed {
  def: SpriteDef;
  page: number;
  px: number;
  py: number;
  pw: number;
  ph: number;
}

/**
 * Bakes many procedurally drawn sprites into a few large canvases ("pages") and
 * returns Pixi textures that point into them. Packing is done in physical pixels so
 * the result stays crisp at any bake resolution.
 */
export class AtlasBuilder {
  private defs: SpriteDef[] = [];
  readonly pages: HTMLCanvasElement[] = [];

  constructor(
    private readonly res: number,
    private readonly pageSize = 2048,
    private readonly pad = 2,
  ) {}

  add(def: SpriteDef): this {
    this.defs.push(def);
    return this;
  }

  addAll(defs: SpriteDef[]): this {
    for (const d of defs) this.add(d);
    return this;
  }

  get size(): number {
    return this.defs.length;
  }

  private pack(): { placed: Placed[]; pageHeights: number[] } {
    const sorted = this.defs.slice().sort((a, b) => b.h - a.h);
    const placed: Placed[] = [];
    const pageHeights: number[] = [];
    let page = 0;
    let x = 0;
    let y = 0;
    let shelfH = 0;
    const max = this.pageSize;
    for (const def of sorted) {
      const pw = Math.min(max, Math.ceil(def.w * this.res) + this.pad * 2);
      const ph = Math.min(max, Math.ceil(def.h * this.res) + this.pad * 2);
      if (x + pw > max) {
        x = 0;
        y += shelfH;
        shelfH = 0;
      }
      if (y + ph > max) {
        pageHeights[page] = y;
        page++;
        x = 0;
        y = 0;
        shelfH = 0;
      }
      placed.push({ def, page, px: x, py: y, pw, ph });
      x += pw;
      shelfH = Math.max(shelfH, ph);
      pageHeights[page] = Math.max(pageHeights[page] ?? 0, y + shelfH);
    }
    return { placed, pageHeights };
  }

  /** Draws everything and returns textures by name. Yields to the browser to keep the loader animating. */
  async build(onProgress?: (p: number) => void): Promise<Record<string, Texture>> {
    const { placed, pageHeights } = this.pack();
    const ctxs: Ctx[] = [];
    for (let i = 0; i < pageHeights.length; i++) {
      // Round height up to a multiple of 4 to keep GPUs happy without wasting a full page.
      const h = Math.min(this.pageSize, Math.ceil((pageHeights[i] + 1) / 4) * 4);
      const canvas = makeCanvas(this.pageSize, h);
      this.pages.push(canvas);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('2D canvas not available');
      ctxs.push(ctx);
    }
    let last = performance.now();
    for (let i = 0; i < placed.length; i++) {
      const p = placed[i];
      const ctx = ctxs[p.page];
      ctx.save();
      ctx.beginPath();
      ctx.rect(p.px, p.py, p.pw, p.ph);
      ctx.clip();
      ctx.setTransform(this.res, 0, 0, this.res, p.px + this.pad, p.py + this.pad);
      try {
        p.def.draw(ctx, p.def.w, p.def.h);
      } catch (err) {
        console.warn('Sprite failed to draw', p.def.name, err);
      }
      ctx.restore();
      const now = performance.now();
      if (now - last > 12) {
        onProgress?.(i / placed.length);
        await nextFrame();
        last = performance.now();
      }
    }
    onProgress?.(1);
    const sources = this.pages.map(
      (canvas) => new CanvasSource({ resource: canvas, resolution: this.res, autoGenerateMipmaps: false, scaleMode: 'linear' }),
    );
    const out: Record<string, Texture> = {};
    for (const p of placed) {
      const r = this.res;
      out[p.def.name] = new Texture({
        source: sources[p.page],
        frame: new Rectangle((p.px + this.pad) / r, (p.py + this.pad) / r, p.def.w, p.def.h),
        defaultAnchor: { x: p.def.ax ?? 0.5, y: p.def.ay ?? 0.5 },
        label: p.def.name,
      });
    }
    return out;
  }
}

export function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function' && document.visibilityState === 'visible') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
}

/** Bakes a single sprite into its own texture (for things that change, like the player's rocket). */
export function bakeSingle(w: number, h: number, res: number, draw: (ctx: Ctx, w: number, h: number) => void, ax = 0.5, ay = 0.5): Texture {
  const canvas = makeCanvas(w * res, h * res);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(res, 0, 0, res, 0, 0);
  draw(ctx, w, h);
  const source = new CanvasSource({ resource: canvas, resolution: res, scaleMode: 'linear' });
  return new Texture({ source, defaultAnchor: { x: ax, y: ay } });
}

/** Redraws an existing single-sprite texture in place (keeps sprites pointing at it valid). */
export function rebakeSingle(tex: Texture, draw: (ctx: Ctx, w: number, h: number) => void): void {
  const source = tex.source as CanvasSource;
  const canvas = source.resource as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  const res = source.resolution;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(res, 0, 0, res, 0, 0);
  draw(ctx, source.width, source.height);
  source.update();
}

/** Draws a sprite to a standalone canvas element for use in the DOM UI (portraits, previews). */
export function drawToCanvas(w: number, h: number, draw: (ctx: Ctx, w: number, h: number) => void, res = Math.min(2, window.devicePixelRatio || 1)): HTMLCanvasElement {
  const canvas = makeCanvas(w * res, h * res);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(res, 0, 0, res, 0, 0);
  draw(ctx, w, h);
  return canvas;
}

const urlCache = new Map<string, string>();
/** Cached data URL of a procedural drawing, for <img> tags in the DOM UI. */
export function drawToDataUrl(key: string, w: number, h: number, draw: (ctx: Ctx, w: number, h: number) => void): string {
  let url = urlCache.get(key);
  if (!url) {
    url = drawToCanvas(w, h, draw).toDataURL('image/png');
    urlCache.set(key, url);
  }
  return url;
}
