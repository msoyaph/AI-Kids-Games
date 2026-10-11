/**
 * Texture atlas baking: PixelCanvas sprites are packed (shelf packer, grouped by height)
 * into 2048² pages, with 1px extruded padding to avoid bleeding, then uploaded once as
 * nearest-neighbour Pixi textures.
 */
import { CanvasSource, Rectangle, Texture } from 'pixi.js';
import { PixelCanvas, T } from './pixelcanvas';

const PAGE = 2048;
const PAD = 1;

interface Shelf {
  y: number;
  h: number;
  x: number;
}
interface Page {
  buf: Uint32Array;
  shelves: Shelf[];
  nextY: number;
}
interface Entry {
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export class Atlas {
  private pages: Page[] = [];
  private entries = new Map<string, Entry>();
  private textures = new Map<string, Texture>();
  private sources: CanvasSource[] = [];
  private canvases: HTMLCanvasElement[] = [];
  /** Raw sprites kept for DOM icon sheets. */
  readonly raw = new Map<string, PixelCanvas>();

  has(name: string): boolean {
    return this.entries.has(name);
  }

  add(name: string, pc: PixelCanvas, keepRaw = false): void {
    if (this.entries.has(name)) throw new Error(`atlas: duplicate sprite ${name}`);
    const w = pc.w + PAD * 2, h = pc.h + PAD * 2;
    let placed: { page: number; x: number; y: number } | null = null;
    for (let p = 0; p < this.pages.length && !placed; p++) placed = this.alloc(p, w, h);
    if (!placed) {
      this.pages.push({ buf: new Uint32Array(PAGE * PAGE), shelves: [], nextY: 0 });
      placed = this.alloc(this.pages.length - 1, w, h);
      if (!placed) throw new Error(`atlas: sprite ${name} too large`);
    }
    const page = this.pages[placed.page];
    const ox = placed.x + PAD, oy = placed.y + PAD;
    // write pixels + extrude edges into the padding
    for (let y = -PAD; y < pc.h + PAD; y++) {
      const sy = Math.min(pc.h - 1, Math.max(0, y));
      for (let x = -PAD; x < pc.w + PAD; x++) {
        const sx = Math.min(pc.w - 1, Math.max(0, x));
        const c = pc.px[sy * pc.w + sx];
        page.buf[(oy + y) * PAGE + (ox + x)] = c === T ? 0 : 0xff000000 | ((c & 0xff) << 16) | (c & 0xff00) | ((c >> 16) & 0xff);
      }
    }
    this.entries.set(name, { page: placed.page, x: ox, y: oy, w: pc.w, h: pc.h });
    if (keepRaw) this.raw.set(name, pc);
  }

  private alloc(p: number, w: number, h: number): { page: number; x: number; y: number } | null {
    const page = this.pages[p];
    for (const s of page.shelves) {
      if (s.h === h && s.x + w <= PAGE) {
        const x = s.x;
        s.x += w;
        return { page: p, x, y: s.y };
      }
    }
    if (page.nextY + h > PAGE) return null;
    const s: Shelf = { y: page.nextY, h, x: w };
    page.shelves.push(s);
    page.nextY += h;
    return { page: p, x: 0, y: s.y };
  }

  /** Upload pages to the GPU and create textures for every entry. */
  bake(): void {
    for (let p = 0; p < this.pages.length; p++) {
      const page = this.pages[p];
      const usedH = Math.min(PAGE, nextPow2(page.nextY));
      const canvas = document.createElement('canvas');
      canvas.width = PAGE;
      canvas.height = usedH;
      const ctx = canvas.getContext('2d')!;
      const img = ctx.createImageData(PAGE, usedH);
      new Uint32Array(img.data.buffer).set(page.buf.subarray(0, PAGE * usedH));
      ctx.putImageData(img, 0, 0);
      const source = new CanvasSource({ resource: canvas, scaleMode: 'nearest', autoGenerateMipmaps: false });
      this.sources.push(source);
      this.canvases.push(canvas);
      page.buf = new Uint32Array(0); // free CPU copy
    }
    for (const [name, e] of this.entries) {
      this.textures.set(name, new Texture({ source: this.sources[e.page], frame: new Rectangle(e.x, e.y, e.w, e.h) }));
    }
  }

  /** Re-upload after a WebGL context restore. */
  reupload(): void {
    for (const s of this.sources) s.update();
  }

  tex(name: string): Texture {
    const t = this.textures.get(name);
    if (!t) {
      if (import.meta.env?.DEV) console.warn('missing sprite', name);
      return Texture.EMPTY;
    }
    return t;
  }

  tryTex(name: string): Texture | null {
    return this.textures.get(name) ?? null;
  }

  stats(): { pages: number; sprites: number } {
    return { pages: this.sources.length || this.pages.length, sprites: this.entries.size };
  }
}

function nextPow2(v: number): number {
  let p = 1;
  while (p < v) p <<= 1;
  return Math.max(p, 64);
}

/** Bake a set of raw sprites into a single DOM-friendly sheet (data URL) for UI icons. */
export function makeIconSheet(sprites: Map<string, PixelCanvas>, cell = 16): { url: string; index: Map<string, number>; cols: number; rows: number } {
  const names = [...sprites.keys()];
  const cols = 32;
  const rows = Math.max(1, Math.ceil(names.length / cols));
  const canvas = document.createElement('canvas');
  canvas.width = cols * cell;
  canvas.height = rows * cell;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(canvas.width, canvas.height);
  const buf = new Uint32Array(img.data.buffer);
  const index = new Map<string, number>();
  names.forEach((n, i) => {
    index.set(n, i);
    const pc = sprites.get(n)!;
    const ox = (i % cols) * cell + Math.floor((cell - pc.w) / 2);
    const oy = Math.floor(i / cols) * cell + Math.floor((cell - pc.h) / 2);
    for (let y = 0; y < pc.h; y++)
      for (let x = 0; x < pc.w; x++) {
        const c = pc.px[y * pc.w + x];
        if (c === T) continue;
        buf[(oy + y) * canvas.width + ox + x] = 0xff000000 | ((c & 0xff) << 16) | (c & 0xff00) | ((c >> 16) & 0xff);
      }
  });
  ctx.putImageData(img, 0, 0);
  return { url: canvas.toDataURL('image/png'), index, cols, rows };
}
