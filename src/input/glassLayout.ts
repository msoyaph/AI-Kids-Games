/**
 * Glass touch-control geometry: sizes and the default layout (pure functions, CSS px).
 * The stylesheet (ui/glass.css) uses the same formulas for sizes; the layout editor and the
 * controls place things through `defaultLayout` + the player's saved offsets.
 */

export type GlassSize = 's' | 'm' | 'l';

export const SIZE_SCALE: Record<GlassSize, number> = { s: 0.84, m: 1, l: 1.18 };

export interface Insets {
  l: number;
  r: number;
  t: number;
  b: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface GlassLayout {
  stick: Point;
  jump: Point;
  slide: Point;
  pause: Point;
}

/** Stick base diameter: 30% of the short side, 112–172 px, times the size step. */
export function stickBase(w: number, h: number, size: GlassSize): number {
  return Math.min(172, Math.max(112, 0.3 * Math.min(w, h))) * SIZE_SCALE[size];
}

/** Button diameters for a stick base (never under a 48 px touch target). */
export function buttonSizes(base: number): { jump: number; slide: number; pause: number } {
  return { jump: Math.max(56, base * 0.64), slide: Math.max(52, base * 0.52), pause: 48 };
}

/**
 * Default positions (centres): the stick low on the left, Jump low on the right with Slide
 * tucked below-left of it (one thumb rolls between them), Pause in the top-right corner.
 * Left-handed mirrors the stick and buttons; Pause stays top-right (top-left is the HUD).
 */
export function defaultLayout(w: number, h: number, size: GlassSize, safe: Insets, leftHanded = false): GlassLayout {
  const b = stickBase(w, h, size);
  const s = buttonSizes(b);
  const stick = { x: safe.l + b * 0.8, y: h - safe.b - b * 0.72 };
  const jump = { x: w - safe.r - s.jump / 2 - b * 0.24, y: h - safe.b - s.jump / 2 - b * 0.42 };
  const slide = { x: jump.x - s.jump / 2 - s.slide / 2 - b * 0.12, y: h - safe.b - s.slide / 2 - b * 0.14 };
  const pause = { x: w - safe.r - 10 - s.pause / 2, y: safe.t + 10 + s.pause / 2 };
  if (leftHanded) {
    for (const p of [stick, jump, slide]) p.x = w - p.x;
  }
  return { stick, jump, slide, pause };
}
