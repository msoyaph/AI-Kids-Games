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

/** The interface's root font size for a screen (ui/styles.css :root), times Larger text. */
export function uiRem(w: number, h: number, uiScale = 1): number {
  return (8 + 0.009 * Math.min(w, h)) * uiScale;
}

/**
 * The bottom-centre HUD (level badge, health and XP bars): 28rem wide (at most half the
 * screen), about 4.8rem tall above the bottom inset. Controls stay out of it.
 */
export function bottomHudBand(w: number, h: number, safe: Insets, rem: number): Rect {
  const half = Math.min(14 * rem, 0.25 * w) + 8;
  return { l: w / 2 - half, r: w / 2 + half, t: h - Math.max(0.6 * rem, safe.b) - 4.8 * rem, b: h };
}

/**
 * Default positions (centres): the stick low on the left, Jump low on the right with Slide
 * tucked below-left of it (one thumb rolls between them), Pause in the top-right corner.
 * The stick and Slide rise above the bottom HUD band when a big size would reach into it.
 * Left-handed mirrors the stick and buttons; Pause stays top-right (top-left is the HUD).
 * `rem` = the interface's root font size (uiRem; bigger with Larger text).
 */
export function defaultLayout(w: number, h: number, size: GlassSize, safe: Insets, leftHanded = false, rem = uiRem(w, h)): GlassLayout {
  const b = stickBase(w, h, size);
  const s = buttonSizes(b);
  const stick = { x: safe.l + b * 0.8, y: h - safe.b - b * 0.72 };
  const jump = { x: w - safe.r - s.jump / 2 - b * 0.24, y: h - safe.b - s.jump / 2 - b * 0.42 };
  const slide = { x: jump.x - s.jump / 2 - s.slide / 2 - b * 0.12, y: h - safe.b - s.slide / 2 - b * 0.14 };
  const pause = { x: w - safe.r - 10 - s.pause / 2, y: safe.t + 10 + s.pause / 2 };
  const band = bottomHudBand(w, h, safe, rem);
  for (const [c, d] of [[stick, b], [slide, s.slide]] as const) {
    if (coversRect({ x: c.x, y: c.y, d }, band)) c.y = Math.min(c.y, band.t - d / 2 - 6);
  }
  if (leftHanded) {
    for (const p of [stick, jump, slide]) p.x = w - p.x;
  }
  return { stick, jump, slide, pause };
}

export type ControlId = 'stick' | 'jump' | 'slide' | 'pause';
export const CONTROL_IDS: readonly ControlId[] = ['stick', 'jump', 'slide', 'pause'];

/** A player-moved control (see meta/save.ts TouchLayoutItem): corner anchor + offset in short-side units. */
export interface LayoutItem {
  ax: 0 | 1;
  ay: 0 | 1;
  dx: number;
  dy: number;
  s: number;
}

export type CustomLayout = Partial<Record<ControlId, LayoutItem>>;

/** A placed control: centre and diameter, CSS px. */
export interface Placed {
  x: number;
  y: number;
  d: number;
}

export type Placement = Record<ControlId, Placed>;

/** Smallest / largest size a control can be scaled to in Edit layout. */
export const MIN_ITEM_SCALE = 0.8;
export const MAX_ITEM_SCALE = 1.25;
/** Touch targets never go below this (CSS px). */
export const MIN_TARGET = 48;

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/**
 * Where every control goes on this screen: the default layout, the player's moved / resized
 * controls on top (stored right-handed), kept fully inside the safe area, then mirrored for
 * left-handed play (Pause stays in the top-right corner).
 */
export function resolveLayout(w: number, h: number, size: GlassSize, safe: Insets, leftHanded: boolean, custom: CustomLayout = {}, rem = uiRem(w, h)): Placement {
  const base = stickBase(w, h, size);
  const bs = buttonSizes(base);
  const def = defaultLayout(w, h, size, safe, false, rem);
  const diam: Record<ControlId, number> = { stick: base, jump: bs.jump, slide: bs.slide, pause: bs.pause };
  const short = Math.min(w, h);
  const out = {} as Placement;
  for (const id of CONTROL_IDS) {
    const it = custom[id];
    let { x, y } = def[id];
    let d = diam[id];
    if (it) {
      d = Math.max(MIN_TARGET, d * clamp(it.s, MIN_ITEM_SCALE, MAX_ITEM_SCALE));
      x = it.ax ? w - safe.r - it.dx * short : safe.l + it.dx * short;
      y = it.ay ? h - safe.b - it.dy * short : safe.t + it.dy * short;
    }
    const r = d / 2;
    x = clamp(x, safe.l + r, Math.max(safe.l + r, w - safe.r - r));
    y = clamp(y, safe.t + r, Math.max(safe.t + r, h - safe.b - r));
    if (leftHanded && id !== 'pause') x = w - x;
    out[id] = { x, y, d };
  }
  return out;
}

/** Store a placed control (screen px, already un-mirrored) as a corner-anchored layout item. */
export function toLayoutItem(p: Placed, scale: number, w: number, h: number, safe: Insets): LayoutItem {
  const short = Math.min(w, h);
  const ax: 0 | 1 = p.x > w / 2 ? 1 : 0;
  const ay: 0 | 1 = p.y > h / 2 ? 1 : 0;
  return {
    ax,
    ay,
    dx: Math.max(0, (ax ? w - safe.r - p.x : p.x - safe.l) / short),
    dy: Math.max(0, (ay ? h - safe.b - p.y : p.y - safe.t) / short),
    s: clamp(scale, MIN_ITEM_SCALE, MAX_ITEM_SCALE),
  };
}

export interface Rect {
  l: number;
  t: number;
  r: number;
  b: number;
}

/** Two controls overlap (with a little breathing room between them). */
export function controlsOverlap(a: Placed, b: Placed, margin = 6): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < (a.d + b.d) / 2 + margin;
}

/** A control covers part of a HUD rectangle (timer, boss bar, health…). */
export function coversRect(c: Placed, r: Rect, margin = 4): boolean {
  const nx = clamp(c.x, r.l, r.r);
  const ny = clamp(c.y, r.t, r.b);
  return Math.hypot(c.x - nx, c.y - ny) < c.d / 2 + margin;
}

/** Fully inside the screen's safe area. */
export function insideSafe(c: Placed, w: number, h: number, safe: Insets): boolean {
  const r = c.d / 2;
  return c.x - r >= safe.l - 0.5 && c.x + r <= w - safe.r + 0.5 && c.y - r >= safe.t - 0.5 && c.y + r <= h - safe.b + 0.5;
}

/** Controls that break a layout rule (off-screen, overlapping another, or over the HUD). */
export function layoutProblems(p: Placement, hud: readonly Rect[], w: number, h: number, safe: Insets): ControlId[] {
  const bad = new Set<ControlId>();
  for (const id of CONTROL_IDS) {
    const c = p[id];
    if (!insideSafe(c, w, h, safe) || hud.some((r) => coversRect(c, r))) bad.add(id);
    for (const other of CONTROL_IDS) if (other !== id && controlsOverlap(c, p[other])) bad.add(id);
  }
  return CONTROL_IDS.filter((id) => bad.has(id));
}
