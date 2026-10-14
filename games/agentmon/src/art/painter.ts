/**
 * The creature painter: every Agentmon is a small "recipe" of shapes drawn in a 32×32 design space.
 * The painter draws it at 32×32 (battle) or 16×16 (overworld and icons), shades it with light from
 * the top left, adds a soft coloured outline, and draws the face in the pose asked for (open eyes,
 * blinking, happy, dizzy, sleepy). Pure (no DOM): node scripts render review sheets from it.
 */
import { darken, INK, lighten, mix, PixelCanvas, T } from './pixelcanvas';

export type Eyes = 'open' | 'blink' | 'happy' | 'dizzy' | 'sleepy';
export interface Pose { eyes: Eyes; mouth?: 'smile' | 'open' | 'o' | 'flat' }
export const POSES: Record<string, Pose> = {
  idle: { eyes: 'open', mouth: 'smile' },
  blink: { eyes: 'blink', mouth: 'smile' },
  happy: { eyes: 'happy', mouth: 'open' },
  hit: { eyes: 'dizzy', mouth: 'o' },
  nap: { eyes: 'sleepy', mouth: 'flat' },
};

export const WHITE = 0xfffbf2;
export const BLUSH = 0xff9bb0;
export const TONGUE = 0xf0687e;

type Pt = readonly [number, number];

/**
 * Margin around a sprite, in canvas pixels. Some recipes reach up to 4 design pixels past the
 * 32×32 design space (a canopy, a tail); at 16 and 32 px that part is clipped, as in 1.0. A 64 px
 * battle sprite gets 5 design pixels on every side, so it shows whole with its full outline.
 */
export const spritePad = (size: number) => (size >= 64 ? 10 : 0);
/** Where the feet are, as a share of the texture's height (for bottom-anchored sprites). */
export const footAnchor = (texHeight: number) => (texHeight > 64 ? (texHeight - spritePad(64)) / texHeight : 1);

export class Painter {
  readonly pc: PixelCanvas;
  /** Scale from the 32×32 design space. */
  readonly s: number;
  /** The margin (canvas pixels) on every side. */
  readonly pad: number;
  /** Pixels belonging to the face (never shaded or recoloured). */
  private face = new Set<number>();
  constructor(size: 32 | 16 | 48 | 64) {
    this.pad = spritePad(size);
    this.pc = new PixelCanvas(size + 2 * this.pad, size + 2 * this.pad);
    this.s = size / 32;
  }
  get small() { return this.s < 1; }
  /** A length from design units to canvas pixels. */
  private sx(v: number) { return v * this.s; }
  /** A position from design units to canvas pixels (inside the margin). */
  private px(v: number) { return v * this.s + this.pad; }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: number): this {
    this.pc.ellipse(this.px(cx), this.px(cy), Math.max(0.6, this.sx(rx)), Math.max(0.6, this.sx(ry)), c);
    return this;
  }
  circle(cx: number, cy: number, r: number, c: number): this {
    return this.ellipse(cx, cy, r, r, c);
  }
  poly(pts: readonly Pt[], c: number): this {
    this.pc.poly(pts.map(([x, y]) => [this.px(x), this.px(y)] as const), c);
    return this;
  }
  rect(x: number, y: number, w: number, h: number, c: number): this {
    const X = Math.floor(this.px(x)), Y = Math.floor(this.px(y));
    this.pc.rect(X, Y, Math.max(1, Math.round(this.sx(w))), Math.max(1, Math.round(this.sx(h))), c);
    return this;
  }
  /** A line one design pixel wide (a 2×2 brush at 64). */
  line(x0: number, y0: number, x1: number, y1: number, c: number): this {
    const k = Math.max(1, Math.round(this.s));
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) this.pc.line(this.px(x0) + i, this.px(y0) + j, this.px(x1) + i, this.px(y1) + j, c);
    return this;
  }
  /** A thick line (a limb, a stem, a tail) drawn as overlapping dots. */
  stroke(pts: readonly Pt[], r: number, c: number): this {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, ay] = pts[i]!, [bx, by] = pts[i + 1]!;
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 2));
      for (let k = 0; k <= steps; k++) this.circle(ax + ((bx - ax) * k) / steps, ay + ((by - ay) * k) / steps, r, c);
    }
    return this;
  }
  /** One design pixel: a canvas pixel at 16 and 32, a 2×2 block at 64. */
  dot(x: number, y: number, c: number): this {
    const k = Math.max(1, Math.round(this.s)), X = Math.floor(this.px(x)), Y = Math.floor(this.px(y));
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) this.pc.set(X + i, Y + j, c);
    return this;
  }
  /** Paint over already-filled pixels only (patterns, bellies). */
  paintEllipse(cx: number, cy: number, rx: number, ry: number, c: number): this {
    const tmp = new PixelCanvas(this.pc.w, this.pc.h).ellipse(this.px(cx), this.px(cy), Math.max(0.6, this.sx(rx)), Math.max(0.6, this.sx(ry)), c);
    for (let i = 0; i < tmp.px.length; i++) if (tmp.px[i] !== T && this.pc.px[i] !== T) this.pc.px[i] = c;
    return this;
  }
  paintPoly(pts: readonly Pt[], c: number): this {
    const tmp = new PixelCanvas(this.pc.w, this.pc.h).poly(pts.map(([x, y]) => [this.px(x), this.px(y)] as const), c);
    for (let i = 0; i < tmp.px.length; i++) if (tmp.px[i] !== T && this.pc.px[i] !== T) this.pc.px[i] = c;
    return this;
  }

  /**
   * Soft shading on the body: a light rim where the top-left edge meets the air, a darker rim on
   * the bottom-right, and a gentle shadow band along the bottom. Call after the body, before the face.
   */
  shade(strength = 1): this {
    const { w, h, px } = this.pc;
    const src = px.slice();
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? T : src[y * w + x]!);
    // rims are one design pixel wide at every size (2 canvas pixels at 64), so 32 and 64 match
    const k = Math.max(1, Math.round(this.s));
    const air = (x: number, y: number, dx: number, dy: number, from: number, to: number) => {
      for (let j = from; j <= to; j++) if (at(x + dx * j, y + dy * j) === T) return true;
      return false;
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = src[y * w + x]!;
      if (c === T) continue;
      if (air(x, y, 0, 1, 1, k) || air(x, y, 1, 0, 1, k)) px[y * w + x] = darken(c, 0.22 * strength);
      else if (!this.small && air(x, y, 0, 1, k + 1, 2 * k)) px[y * w + x] = darken(c, 0.1 * strength);
      else if (air(x, y, 0, -1, 1, k) || air(x, y, -1, 0, 1, k)) px[y * w + x] = lighten(c, 0.38 * strength);
      else if (!this.small && [...Array(k)].some((_, j) => { const u = at(x, y - 1 - j); return u !== c && u !== T; })) px[y * w + x] = lighten(c, 0.12 * strength);
    }
    return this;
  }

  /** One face pixel at canvas pixel (x, y). */
  private faceRaw(x: number, y: number, c: number) {
    const X = Math.floor(x), Y = Math.floor(y);
    if (X < 0 || Y < 0 || X >= this.pc.w || Y >= this.pc.h) return;
    this.pc.set(X, Y, c);
    this.face.add(Y * this.pc.w + X);
  }

  /** One face pixel at design (x, y): a single pixel at 32, a 2×2 block at 64 (faces scale with the body). */
  private faceSet(x: number, y: number, c: number) {
    if (this.s <= 1) return this.faceRaw(this.px(x), this.px(y), c);
    const k = Math.round(this.s), X = Math.floor(x) * k + this.pad, Y = Math.floor(y) * k + this.pad;
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) this.faceRaw(X + i, Y + j, c);
  }

  /**
   * One eye at design (x, y) = its top-left, `size` 2 (small) – 4 (big), in a pose. At 16 px the
   * eye becomes a 1×2 (or 2×2) dot so the face still reads.
   */
  eye(x: number, y: number, size: number, eyes: Eyes, iris = INK, flip = false): this {
    if (this.small) {
      const X = this.px(x), Y = this.px(y);
      const w = size >= 4 ? 2 : 1;
      if (eyes === 'open') { for (let i = 0; i < w; i++) { this.faceRaw(X + i, Y, iris); this.faceRaw(X + i, Y + 1, iris); } }
      else this.faceRaw(X, Y + 1, INK);
      return this;
    }
    const X = x, Y = y;
    const w = size, h = size + 1;
    if (eyes === 'open') {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const corner = (i === 0 || i === w - 1) && (j === 0 || j === h - 1) && size >= 3;
        if (!corner) this.faceSet(X + i, Y + j, iris === INK ? INK : (j >= h - 2 ? iris : INK));
      }
      this.faceSet(X + (flip ? w - 1 : 0) + (size >= 3 ? (flip ? -0 : 0) : 0), Y + (size >= 3 ? 1 : 0), WHITE);
      if (size >= 4) this.faceSet(X + (flip ? w - 2 : 1), Y + 1, WHITE);
      if (size >= 3) this.faceSet(X + (flip ? 0 : w - 1), Y + h - 2, mix(WHITE, iris, 0.4));
    } else if (eyes === 'blink' || eyes === 'sleepy') {
      const yy = Y + h - 2;
      for (let i = 0; i < w; i++) this.faceSet(X + i, yy, INK);
      if (eyes === 'sleepy' && w >= 3) { this.faceSet(X, yy - 1, INK); this.faceSet(X + w - 1, yy - 1, INK); }
    } else if (eyes === 'happy') {
      // ^ shapes
      const yy = Y + Math.floor(h / 2);
      for (let i = 0; i < w; i++) {
        const lift = w >= 3 ? (i === 0 || i === w - 1 ? 1 : 0) : i === 0 ? 1 : 0;
        this.faceSet(X + i, yy + lift, INK);
      }
      if (w >= 3) this.faceSet(X + Math.floor(w / 2), yy - 1 + (w % 2 ? 0 : 1), INK);
    } else if (eyes === 'dizzy') {
      // little swirls (not crosses: nobody gets hurt)
      const cx = X + Math.floor(w / 2), cy = Y + Math.floor(h / 2);
      for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]] as const) this.faceSet(cx + dx, cy + dy, INK);
      this.faceSet(cx, cy, WHITE);
    }
    return this;
  }

  /** A pair of eyes: left eye at (x, y), right eye `gap` design-pixels further right. */
  eyes(x: number, y: number, gap: number, size: number, pose: Pose, iris = INK): this {
    this.eye(x, y, size, pose.eyes, iris);
    this.eye(x + gap, y, size, pose.eyes, iris, true);
    return this;
  }

  mouth(x: number, y: number, pose: Pose, wide = 2): this {
    const kind = pose.mouth ?? 'smile';
    if (this.small) { if (kind !== 'flat') this.faceRaw(this.px(x), this.px(y), INK); return this; }
    const X = x, Y = y;
    if (kind === 'smile') {
      this.faceSet(X - 1, Y - 1, INK);
      for (let i = 0; i < wide; i++) this.faceSet(X + i, Y, INK);
      this.faceSet(X + wide, Y - 1, INK);
    } else if (kind === 'open') {
      for (let i = 0; i < wide + 1; i++) this.faceSet(X - 1 + i, Y - 1, INK);
      for (let i = 0; i < wide; i++) this.faceSet(X + i, Y, TONGUE);
      this.faceSet(X - 1, Y, INK);
      this.faceSet(X + wide, Y, INK);
      for (let i = 0; i < wide; i++) this.faceSet(X + i, Y + 1, INK);
    } else if (kind === 'o') {
      this.faceSet(X, Y - 1, INK); this.faceSet(X + 1, Y - 1, INK); this.faceSet(X, Y, INK); this.faceSet(X + 1, Y, INK);
    } else {
      for (let i = 0; i < wide; i++) this.faceSet(X + i, Y, INK);
    }
    return this;
  }

  blush(x: number, y: number, w = 2): this {
    if (this.small) return this;
    const X = x, Y = y;
    for (let i = 0; i < w; i++) this.faceSet(X + i, Y, BLUSH);
    return this;
  }

  /** Small sparkle highlights (shine on crystals, water drops). */
  shine(x: number, y: number): this {
    if (this.small) return this;
    this.faceSet(x, y, WHITE);
    return this;
  }

  /** Finish: a soft coloured outline (darker shade of whatever it touches), one design pixel wide. */
  finish(): PixelCanvas {
    this.pc.outline(INK, true);
    for (let i = 1; i < Math.round(this.s); i++) this.pc.thicken();
    return this.pc;
  }

  /** Where the face was drawn (canvas pixels), or null: accessories use it to find the head. */
  faceBounds(): { x0: number; y0: number; x1: number; y1: number } | null {
    if (!this.face.size) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (const i of this.face) {
      const x = i % this.pc.w, y = Math.floor(i / this.pc.w);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    return { x0, y0, x1, y1 };
  }

  /** For shimmer variants: recolour the body but never the face. */
  recolor(f: (c: number) => number): this {
    for (let i = 0; i < this.pc.px.length; i++) if (this.pc.px[i] !== T && !this.face.has(i)) this.pc.px[i] = f(this.pc.px[i]!);
    return this;
  }
}
