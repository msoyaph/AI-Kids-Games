/**
 * Texture atlas baking (adapted from Cliff Valley): PixelCanvas sprites are packed (shelf packer)
 * into 2048² pages with 1 px extruded padding, then uploaded once as nearest-neighbour textures.
 * Sprites can also be added later (lazily); the page is re-uploaded on the next frame.
 */
import { CanvasSource, Rectangle, Texture } from 'pixi.js';
import { PixelCanvas, T } from '../art/pixelcanvas';

const PAGE = 2048;
const PAD = 1;

interface Shelf { y: number; h: number; x: number }
interface Page { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; source: CanvasSource; shelves: Shelf[]; nextY: number; dirty: boolean }

export class Atlas {
  private pages: Page[] = [];
  private textures = new Map<string, Texture>();

  has(name: string): boolean {
    return this.textures.has(name);
  }

  private newPage(): Page {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE;
    canvas.height = PAGE;
    const ctx = canvas.getContext('2d', { willReadFrequently: false })!;
    const source = new CanvasSource({ resource: canvas, scaleMode: 'nearest', autoGenerateMipmaps: false });
    const page: Page = { canvas, ctx, source, shelves: [], nextY: 0, dirty: true };
    this.pages.push(page);
    return page;
  }

  private alloc(page: Page, w: number, h: number): { x: number; y: number } | null {
    for (const s of page.shelves) if (s.h >= h && s.h <= h + 8 && s.x + w <= PAGE) { const x = s.x; s.x += w; return { x, y: s.y }; }
    if (page.nextY + h > PAGE) return null;
    const s: Shelf = { y: page.nextY, h, x: w };
    page.shelves.push(s);
    page.nextY += h;
    return { x: 0, y: s.y };
  }

  add(name: string, pc: PixelCanvas): Texture {
    const existing = this.textures.get(name);
    if (existing) return existing;
    const w = pc.w + PAD * 2, h = pc.h + PAD * 2;
    let page = this.pages[this.pages.length - 1];
    let spot = page ? this.alloc(page, w, h) : null;
    if (!spot) { page = this.newPage(); spot = this.alloc(page, w, h); }
    if (!spot || !page) throw new Error(`atlas: sprite ${name} too large`);
    const img = page.ctx.createImageData(w, h);
    const buf = new Uint32Array(img.data.buffer);
    for (let y = 0; y < h; y++) {
      const sy = Math.min(pc.h - 1, Math.max(0, y - PAD));
      for (let x = 0; x < w; x++) {
        const sx = Math.min(pc.w - 1, Math.max(0, x - PAD));
        const c = pc.px[sy * pc.w + sx]!;
        buf[y * w + x] = c === T ? 0 : 0xff000000 | ((c & 0xff) << 16) | (c & 0xff00) | ((c >> 16) & 0xff);
      }
    }
    page.ctx.putImageData(img, spot.x, spot.y);
    page.dirty = true;
    const tex = new Texture({ source: page.source, frame: new Rectangle(spot.x + PAD, spot.y + PAD, pc.w, pc.h) });
    this.textures.set(name, tex);
    return tex;
  }

  /** The texture for `name`, creating it with `make` on first use. */
  get(name: string, make: () => PixelCanvas): Texture {
    return this.textures.get(name) ?? this.add(name, make());
  }

  /** Upload pages changed since the last frame. */
  flush(): void {
    for (const p of this.pages) if (p.dirty) { p.source.update(); p.dirty = false; }
  }

  reupload(): void {
    for (const p of this.pages) p.source.update();
  }

  stats() {
    return { pages: this.pages.length, sprites: this.textures.size };
  }
}

/** A one-off texture for a big canvas (a baked map's ground), split into chunks ≤ 2048. */
export function bigTextures(pc: PixelCanvas, chunk = 1024): { x: number; y: number; tex: Texture }[] {
  const out: { x: number; y: number; tex: Texture }[] = [];
  for (let y0 = 0; y0 < pc.h; y0 += chunk) for (let x0 = 0; x0 < pc.w; x0 += chunk) {
    const w = Math.min(chunk, pc.w - x0), h = Math.min(chunk, pc.h - y0);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(w, h);
    const buf = new Uint32Array(img.data.buffer);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = pc.px[(y0 + y) * pc.w + x0 + x]!;
      buf[y * w + x] = c === T ? 0 : 0xff000000 | ((c & 0xff) << 16) | (c & 0xff00) | ((c >> 16) & 0xff);
    }
    ctx.putImageData(img, 0, 0);
    out.push({ x: x0, y: y0, tex: new Texture({ source: new CanvasSource({ resource: canvas, scaleMode: 'nearest', autoGenerateMipmaps: false }) }) });
  }
  return out;
}

/** A PixelCanvas as a data URL (for DOM icons and portraits). */
export function canvasUrl(pc: PixelCanvas, scale = 1): string {
  const canvas = document.createElement('canvas');
  canvas.width = pc.w * scale;
  canvas.height = pc.h * scale;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(canvas.width, canvas.height);
  const buf = new Uint32Array(img.data.buffer);
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    const c = pc.px[Math.floor(y / scale) * pc.w + Math.floor(x / scale)]!;
    buf[y * canvas.width + x] = c === T ? 0 : 0xff000000 | ((c & 0xff) << 16) | (c & 0xff00) | ((c >> 16) & 0xff);
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}
