/**
 * PixelCanvas: a tiny CPU pixel buffer used to author all art in code (adapted from Cliff Valley).
 * Colors are 0xRRGGBB numbers; T (-1) means transparent. Sprites are drawn with primitives or
 * palette-indexed rows, then baked into texture atlases. Pure: no DOM, so node scripts can render
 * sprite sheets for review.
 */

export const T = -1;

export class PixelCanvas {
  readonly w: number;
  readonly h: number;
  readonly px: Int32Array;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.px = new Int32Array(w * h).fill(T);
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return T;
    return this.px[y * this.w + x]!;
  }
  set(x: number, y: number, c: number): this {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    this.px[y * this.w + x] = c;
    return this;
  }
  /** Set only where already filled. */
  paint(x: number, y: number, c: number): void {
    if (this.get(Math.floor(x), Math.floor(y)) !== T) this.set(x, y, c);
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
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, c);
    return this;
  }
  vline(x: number, y0: number, y1: number, c: number): this {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, c);
    return this;
  }
  line(x0: number, y0: number, x1: number, y1: number, c: number): this {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
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
  /** Filled ellipse centred at (cx, cy), radii rx, ry (half-pixel friendly). */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: number): this {
    if (rx <= 0 || ry <= 0) return this;
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
  /** Filled polygon (even-odd scanline fill, pixel centres). */
  poly(points: readonly (readonly [number, number])[], c: number): this {
    if (points.length < 3) return this;
    const ys = points.map(p => p[1]);
    const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y <= y1; y++) {
      const sy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i]!, [bx, by] = points[(i + 1) % points.length]!;
        if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) xs.push(ax + ((sy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k]! - 0.5); x <= Math.floor(xs[k + 1]! - 0.5); x++) this.set(x, y, c);
      }
    }
    return this;
  }
  /** Fill a polygon, but only over pixels that are already filled (stripes, patterns). */
  paintPoly(points: readonly (readonly [number, number])[], c: number): this {
    const tmp = new PixelCanvas(this.w, this.h).poly(points, c);
    for (let i = 0; i < tmp.px.length; i++) if (tmp.px[i] !== T && this.px[i] !== T) this.px[i] = c;
    return this;
  }
  /** Draw rows of characters using a char→color map. '.' and ' ' are transparent. */
  rows(rows: readonly string[], map: Record<string, number>, ox = 0, oy = 0): this {
    for (let y = 0; y < rows.length; y++) {
      const r = rows[y]!;
      for (let x = 0; x < r.length; x++) {
        const ch = r[x]!;
        if (ch === '.' || ch === ' ') continue;
        const c = map[ch];
        if (c === undefined) continue;
        this.set(ox + x, oy + y, c);
      }
    }
    return this;
  }
  /**
   * A 1px outline around the shape. With `tinted`, each outline pixel takes a dark shade of the
   * colour it touches (a soft "coloured line" look); otherwise colour `c`.
   */
  outline(c: number, tinted = false, diagonal = false): this {
    const src = this.px.slice();
    const w = this.w, h = this.h;
    const dirs = diagonal ? [[0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]] : [[0, -1], [-1, 0], [1, 0], [0, 1]];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (src[y * w + x] !== T) continue;
        let touch = T;
        for (const [dx, dy] of dirs) {
          const nx = x + dx!, ny = y + dy!;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h && src[ny * w + nx] !== T) { touch = src[ny * w + nx]!; break; }
        }
        if (touch !== T) this.px[y * w + x] = tinted ? mix(touch, c, 0.72) : c;
      }
    }
    return this;
  }
  /** Grow the outermost ring by one pixel: each empty pixel touching the edge copies its neighbour (a 2 px outline at 64). */
  thicken(): this {
    const src = this.px.slice();
    const w = this.w, h = this.h;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (src[y * w + x] !== T) continue;
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]] as const) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && src[ny * w + nx] !== T) { this.px[y * w + x] = src[ny * w + nx]!; break; }
      }
    }
    return this;
  }
  /** Replace exact colour a with b. */
  swap(a: number, b: number): this {
    for (let i = 0; i < this.px.length; i++) if (this.px[i] === a) this.px[i] = b;
    return this;
  }
  /** Apply a colour mapping function to every filled pixel. */
  mapColors(f: (c: number) => number): this {
    for (let i = 0; i < this.px.length; i++) if (this.px[i] !== T) this.px[i] = f(this.px[i]!);
    return this;
  }
  /** Copy another canvas onto this one (transparent pixels skipped). */
  blit(src: PixelCanvas, dx: number, dy: number, flipX = false): this {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const c = src.px[y * src.w + (flipX ? src.w - 1 - x : x)]!;
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
  /** Bounding box of filled pixels. */
  bounds(): { x0: number; y0: number; x1: number; y1: number } | null {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.px[y * this.w + x] !== T) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return x1 < 0 ? null : { x0, y0, x1, y1 };
  }
}

/** Colour helpers on 0xRRGGBB values. */
export function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
export const INK = 0x2a1f3d;
export const darken = (c: number, t = 0.25): number => mix(c, 0x241a36, t);
export const lighten = (c: number, t = 0.25): number => mix(c, 0xfffbec, t);
export const hex = (c: number): string => '#' + c.toString(16).padStart(6, '0');

/** Rotate a colour's hue by `deg` (keeps lightness and saturation): for shimmer variants. */
export function hueShift(c: number, deg: number): number {
  const r = ((c >> 16) & 255) / 255, g = ((c >> 8) & 255) / 255, b = (c & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return c;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = ((h * 60 + deg) % 360 + 360) % 360 / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const conv = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const R = Math.round(conv(h + 1 / 3) * 255), G = Math.round(conv(h) * 255), B = Math.round(conv(h - 1 / 3) * 255);
  return (R << 16) | (G << 8) | B;
}
