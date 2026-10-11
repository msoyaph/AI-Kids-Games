/**
 * Procedural sprite atlas builder.
 *
 * Draw callbacks paint in *logical* units (one world pixel = one unit). The
 * builder scales the context so the art is rasterised at `scale` × logical
 * size, then shelf-packs everything into a few large canvas pages.
 */
export type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export interface SpriteRequest {
  name: string;
  /** Logical size. */
  w: number;
  h: number;
  /** Default anchor (0..1). */
  ax?: number;
  ay?: number;
  draw: DrawFn;
}

export interface FrameInfo {
  page: number;
  /** Logical-unit rectangle within the page (page logical size = pixels / scale). */
  x: number;
  y: number;
  w: number;
  h: number;
  ax: number;
  ay: number;
}

export interface BakedAtlas {
  scale: number;
  pages: HTMLCanvasElement[];
  frames: Map<string, FrameInfo>;
}

const PAD = 3; // logical pixels of transparent padding (prevents mip/filter bleeding)

export class AtlasBuilder {
  private requests: SpriteRequest[] = [];
  private names = new Set<string>();

  constructor(
    readonly scale: number,
    readonly pageSize: number,
  ) {}

  add(req: SpriteRequest): void {
    if (this.names.has(req.name)) throw new Error(`Duplicate sprite name: ${req.name}`);
    this.names.add(req.name);
    this.requests.push(req);
  }

  get count(): number {
    return this.requests.length;
  }

  /**
   * Packs and paints all sprites. Yields to the browser periodically so the
   * loading bar can animate; `onProgress` receives 0..1.
   */
  async bake(onProgress?: (p: number) => void): Promise<BakedAtlas> {
    const s = this.scale;
    const pagePx = this.pageSize;
    const pageLogical = Math.floor(pagePx / s);
    const sorted = this.requests.slice().sort((a, b) => b.h - a.h || b.w - a.w);

    // --- shelf pack (logical units) ---
    interface Placed {
      req: SpriteRequest;
      page: number;
      x: number;
      y: number;
    }
    const placed: Placed[] = [];
    let page = 0;
    let x = 0;
    let y = 0;
    let shelfH = 0;
    const pageHeights: number[] = [0];
    for (const req of sorted) {
      const w = Math.ceil(req.w) + PAD * 2;
      const h = Math.ceil(req.h) + PAD * 2;
      if (w > pageLogical || h > pageLogical) throw new Error(`Sprite too large for atlas: ${req.name}`);
      if (x + w > pageLogical) {
        x = 0;
        y += shelfH;
        shelfH = 0;
      }
      if (y + h > pageLogical) {
        page++;
        pageHeights.push(0);
        x = 0;
        y = 0;
        shelfH = 0;
      }
      placed.push({ req, page, x: x + PAD, y: y + PAD });
      x += w;
      shelfH = Math.max(shelfH, h);
      pageHeights[page] = Math.max(pageHeights[page]!, y + h);
    }

    // --- allocate page canvases (trim height to a power of two for mipmaps) ---
    const pages: HTMLCanvasElement[] = [];
    const ctxs: CanvasRenderingContext2D[] = [];
    for (let p = 0; p <= page; p++) {
      const c = document.createElement('canvas');
      c.width = pagePx;
      let hPx = 64;
      while (hPx < Math.ceil(pageHeights[p]! * s)) hPx *= 2;
      c.height = Math.min(pagePx, hPx);
      const ctx = c.getContext('2d', { willReadFrequently: false });
      if (!ctx) throw new Error('2D canvas unavailable');
      pages.push(c);
      ctxs.push(ctx);
    }

    // --- paint ---
    const frames = new Map<string, FrameInfo>();
    let last = performance.now();
    for (let i = 0; i < placed.length; i++) {
      const pl = placed[i]!;
      const ctx = ctxs[pl.page]!;
      ctx.save();
      ctx.setTransform(s, 0, 0, s, pl.x * s, pl.y * s);
      ctx.beginPath();
      ctx.rect(-1, -1, pl.req.w + 2, pl.req.h + 2);
      ctx.clip();
      try {
        pl.req.draw(ctx, pl.req.w, pl.req.h);
      } catch (err) {
        console.warn(`Sprite ${pl.req.name} failed to draw`, err);
      }
      ctx.restore();
      frames.set(pl.req.name, {
        page: pl.page,
        x: pl.x,
        y: pl.y,
        w: pl.req.w,
        h: pl.req.h,
        ax: pl.req.ax ?? 0.5,
        ay: pl.req.ay ?? 0.5,
      });
      const now = performance.now();
      if (now - last > 12) {
        onProgress?.(i / placed.length);
        await nextFrame();
        last = performance.now();
      }
    }
    onProgress?.(1);
    return { scale: s, pages, frames };
  }
}

export function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function' && document.visibilityState === 'visible') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/** Copy one baked frame into its own small canvas (for DOM icons). */
export function frameToCanvas(atlas: BakedAtlas, name: string, sizePx?: number): HTMLCanvasElement {
  const f = atlas.frames.get(name);
  const c = document.createElement('canvas');
  if (!f) {
    c.width = c.height = 4;
    return c;
  }
  const s = atlas.scale;
  const srcW = Math.round(f.w * s);
  const srcH = Math.round(f.h * s);
  const k = sizePx ? sizePx / Math.max(srcW, srcH) : 1;
  c.width = Math.max(1, Math.round(srcW * k));
  c.height = Math.max(1, Math.round(srcH * k));
  const ctx = c.getContext('2d')!;
  ctx.drawImage(atlas.pages[f.page]!, Math.round(f.x * s), Math.round(f.y * s), srcW, srcH, 0, 0, c.width, c.height);
  return c;
}
