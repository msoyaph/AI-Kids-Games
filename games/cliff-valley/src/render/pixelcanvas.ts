/**
 * PixelCanvas: a tiny CPU pixel buffer used to author all art in code.
 * Colors are 0xRRGGBB numbers; -1 (or TRANSPARENT) means empty.
 * Sprites are drawn with primitives / palette-indexed rows, then baked into atlases.
 */
import { Rng } from '../core/rng';

export const T = -1; // transparent

export class PixelCanvas {
  readonly w: number;
  readonly h: number;
  /** -1 = transparent, otherwise 0xRRGGBB */
  readonly px: Int32Array;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.px = new Int32Array(w * h).fill(T);
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return T;
    return this.px[y * this.w + x];
  }
  set(x: number, y: number, c: number): void {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = c;
  }
  /** Set only if the pixel is currently filled. */
  paint(x: number, y: number, c: number): void {
    if (this.get(x, y) !== T) this.set(x, y, c);
  }
  fill(c: number): this {
    this.px.fill(c);
    return this;
  }
  rect(x: number, y: number, w: number, h: number, c: number): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }
  hline(x0: number, x1: number, y: number, c: number): this {
    for (let x = x0; x <= x1; x++) this.set(x, y, c);
    return this;
  }
  vline(x: number, y0: number, y1: number, c: number): this {
    for (let y = y0; y <= y1; y++) this.set(x, y, c);
    return this;
  }
  line(x0: number, y0: number, x1: number, y1: number, c: number): this {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }
  /** Filled ellipse centered at (cx, cy) with radii rx, ry (half-pixel friendly). */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: number): this {
    const x0 = Math.floor(cx - rx), x1 = Math.ceil(cx + rx);
    const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1.0) this.set(x, y, c);
      }
    }
    return this;
  }
  circle(cx: number, cy: number, r: number, c: number): this {
    return this.ellipse(cx, cy, r, r, c);
  }
  /** Draw rows of characters using a char→color map. '.' and ' ' are transparent. */
  rows(rows: readonly string[], map: Record<string, number>, ox = 0, oy = 0): this {
    for (let y = 0; y < rows.length; y++) {
      const r = rows[y];
      for (let x = 0; x < r.length; x++) {
        const ch = r[x];
        if (ch === '.' || ch === ' ') continue;
        const c = map[ch];
        if (c === undefined) continue;
        this.set(ox + x, oy + y, c);
      }
    }
    return this;
  }
  /** Add a 1px outline of color c around all filled pixels (4-neighbour). */
  outline(c: number, diagonal = false): this {
    const src = this.px.slice();
    const w = this.w, h = this.h;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (src[y * w + x] !== T) continue;
        let hit = false;
        for (let k = 0; k < (diagonal ? 8 : 4) && !hit; k++) {
          const dx = [0, -1, 1, 0, -1, 1, -1, 1][k];
          const dy = [-1, 0, 0, 1, -1, -1, 1, 1][k];
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h && src[ny * w + nx] !== T) hit = true;
        }
        if (hit) this.px[y * w + x] = c;
      }
    }
    return this;
  }
  /** Replace exact color a with b. */
  swap(a: number, b: number): this {
    for (let i = 0; i < this.px.length; i++) if (this.px[i] === a) this.px[i] = b;
    return this;
  }
  /** Apply a full color mapping (palette swap). */
  remap(map: Map<number, number>): this {
    for (let i = 0; i < this.px.length; i++) {
      const v = map.get(this.px[i]);
      if (v !== undefined) this.px[i] = v;
    }
    return this;
  }
  /** Sprinkle noise pixels of color c on filled pixels matching `on` (or any filled if on undefined). */
  speckle(rng: Rng, c: number, density: number, on?: number, x0 = 0, y0 = 0, x1 = this.w, y1 = this.h): this {
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const v = this.get(x, y);
        if (v === T) continue;
        if (on !== undefined && v !== on) continue;
        if (rng.next() < density) this.set(x, y, c);
      }
    return this;
  }
  /** Copy another canvas onto this one (transparent pixels skipped). */
  blit(src: PixelCanvas, dx: number, dy: number, flipX = false): this {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const c = src.px[y * src.w + (flipX ? src.w - 1 - x : x)];
        if (c !== T) this.set(dx + x, dy + y, c);
      }
    return this;
  }
  clone(): PixelCanvas {
    const p = new PixelCanvas(this.w, this.h);
    p.px.set(this.px);
    return p;
  }
  flipped(): PixelCanvas {
    const p = new PixelCanvas(this.w, this.h);
    p.blit(this, 0, 0, true);
    return p;
  }
  /** Shift whole image by dx, dy (pixels moved off-canvas are lost). */
  shifted(dx: number, dy: number): PixelCanvas {
    const p = new PixelCanvas(this.w, this.h);
    p.blit(this, dx, dy);
    return p;
  }
  /** Darken/lighten pixels on the bottom/right edge of each shape for a soft shading. */
  shadeEdges(dark: (c: number) => number, light: (c: number) => number): this {
    const src = this.px.slice();
    const w = this.w, h = this.h;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const c = src[y * w + x];
        if (c === T) continue;
        const below = y + 1 < h ? src[(y + 1) * w + x] : T;
        const right = x + 1 < w ? src[y * w + x + 1] : T;
        const above = y > 0 ? src[(y - 1) * w + x] : T;
        const left = x > 0 ? src[y * w + x - 1] : T;
        if (below === T || right === T) this.px[y * w + x] = dark(c);
        else if (above === T || left === T) this.px[y * w + x] = light(c);
      }
    return this;
  }
}

/** Color helpers on 0xRRGGBB values. */
export function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
export const darken = (c: number, t = 0.25): number => mix(c, 0x14101c, t);
export const lighten = (c: number, t = 0.25): number => mix(c, 0xfffbea, t);
export const hex = (c: number): string => '#' + c.toString(16).padStart(6, '0');
