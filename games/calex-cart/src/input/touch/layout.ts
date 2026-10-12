// Where the glass touch controls go (pure: no DOM, unit-tested). All numbers are CSS px of the viewport.

export type ControlId = 'stick' | 'drift' | 'item' | 'brake' | 'accel' | 'look' | 'pause';
export const CONTROL_IDS: ControlId[] = ['stick', 'drift', 'item', 'brake', 'accel', 'look', 'pause'];
export type TouchSize = 'small' | 'medium' | 'large';

/** A player-edited layout: centre as a fraction of the screen, size as a multiple of the default size. Made with
 * `lefty` handedness (switching hands mirrors it). */
export interface SavedLayout {
  lefty: boolean;
  controls: Partial<Record<ControlId, { x: number; y: number; s: number }>>;
}

/** Resize range in the layout editor. */
export const SCALE_MIN = 0.8;
export const SCALE_MAX = 1.4;
/** Controls that stay put when switching hands (they sit by the HUD, which doesn't move). */
const UNMIRRORED: ControlId[] = ['look', 'pause'];

/** A control: centre + visual diameter. */
export interface Slot {
  x: number;
  y: number;
  d: number;
}
export type Layout = Record<ControlId, Slot>;

export interface Insets {
  l: number;
  t: number;
  r: number;
  b: number;
}

export interface Viewport {
  w: number;
  h: number;
  safe: Insets;
  /** Settings → HUD size (the item box and minimap grow with it). */
  hudScale: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Every control's touch target is at least this big, whatever its size setting. */
export const MIN_TARGET = 48;
const SIZE_FACTOR: Record<TouchSize, number> = { small: 0.85, medium: 1, large: 1.18 };
/** Visual diameters at Medium on a 390 px-tall phone. */
const BASE: Record<ControlId, number> = { stick: 132, drift: 116, item: 92, brake: 66, accel: 66, look: 54, pause: 48 };
const EDGE = 14;

/**
 * HUD size used with touch controls: on short screens (phones in landscape) the HUD stops at 125 %, or the
 * position block, minimap and speed readout would leave the thumbs no room. Used by the HUD and the controls.
 */
export function touchHudScale(setting: number, viewportHeight: number): number {
  return viewportHeight < 500 ? Math.min(setting, 1.25) : setting;
}

export function isPortrait(vp: Viewport): boolean {
  return vp.h > vp.w;
}

/** Size unit: phones 1, tablets up to 1.14 (thumbs don't grow with the screen). */
export function unit(vp: Viewport): number {
  return Math.min(1.14, Math.max(1, Math.min(vp.w, vp.h) / 390));
}

export function diameters(vp: Viewport, size: TouchSize): Record<ControlId, number> {
  const k = unit(vp) * SIZE_FACTOR[size];
  const out = {} as Record<ControlId, number>;
  for (const id of CONTROL_IDS) out[id] = Math.round(BASE[id] * k);
  return out;
}

/** The touch target of a control (never smaller than MIN_TARGET). */
export function targetSize(d: number): number {
  return Math.max(MIN_TARGET, d);
}

/** Size of the race HUD's item box on touch screens (mirrors `.hud.touch .hud-item` in styles.css). */
function hudItemBox(vp: Viewport): number {
  return Math.min(84, Math.max(56, vp.h * 0.15)) * vp.hudScale;
}

/** The default layout: stick bottom-left (clear of the minimap), DRIFT under the right thumb, the rest around it. */
export function defaultLayout(vp: Viewport, size: TouchSize, leftHanded: boolean): Layout {
  const d = diameters(vp, size);
  const k = unit(vp) * SIZE_FACTOR[size];
  const { w, h, safe } = vp;
  const stick = { x: safe.l + EDGE + d.stick / 2 + 6, y: h - safe.b - EDGE - d.stick / 2 - 6, d: d.stick };
  const drift = { x: w - safe.r - EDGE - d.drift / 2 - 6, y: h - safe.b - EDGE - d.drift / 2 - 8, d: d.drift };
  const item = { x: drift.x - 108 * k, y: drift.y - 68 * k, d: d.item };
  const brake = { x: drift.x - 124 * k, y: drift.y + 26 * k, d: d.brake };
  const accel = { x: drift.x + 4 * k, y: drift.y - 112 * k, d: d.accel };
  // 👀 sits just left of the HUD item box; pause at top centre (neither moves for left-handed play: the HUD doesn't)
  const box = hudItemBox(vp);
  const look = { x: w - safe.r - 12 - box - 10 - d.look / 2, y: safe.t + 12 + d.look / 2, d: d.look };
  const pause = { x: w / 2, y: safe.t + 8 + d.pause / 2, d: d.pause };
  const L: Layout = { stick, drift, item, brake, accel, look, pause };
  if (leftHanded) for (const id of ['stick', 'drift', 'item', 'brake', 'accel'] as ControlId[]) L[id] = { ...L[id], x: w - L[id].x };
  return L;
}

/** The part of the screen where a floating stick appears under the thumb. */
export function stickZone(vp: Viewport, leftHanded: boolean): Rect {
  const top = vp.h * (isPortrait(vp) ? 0.5 : 0.3);
  const w = vp.w * 0.45;
  return { x: leftHanded ? vp.w - w : 0, y: top, w, h: vp.h - top };
}

/** Where the race HUD draws on touch screens (approximates the CSS; the editor shows these as no-go zones). */
export function hudRects(vp: Viewport, leftHanded = false): Rect[] {
  const { w, h, safe, hudScale: s } = vp;
  const box = hudItemBox(vp);
  const mapTop = safe.t + 10 + Math.min(150, Math.max(96, h * 0.3)) * s;
  return [
    { x: safe.l, y: safe.t, w: 150 * s, h: 104 * s }, // position, lap, time
    { x: w - safe.r - 12 - box, y: safe.t + 10, w: box, h: box }, // item box
    { x: leftHanded ? w - safe.r - 12 - 92 * s : safe.l + 12, y: mapTop, w: 92 * s, h: 92 * s }, // minimap (right side for left-handed play)
    { x: w / 2 - 75 * s, y: h - safe.b - 6 - 62 * s, w: 150 * s, h: 62 * s }, // speed + spark meter
  ];
}

/** Gap kept between controls, and between a control and the HUD. */
const GAP = 6;

function clampInto(s: Slot, r: number, vp: Viewport): Slot {
  const { w, h, safe } = vp;
  return {
    ...s,
    x: Math.min(Math.max(s.x, safe.l + r + 2), w - safe.r - r - 2),
    y: Math.min(Math.max(s.y, safe.t + r + 2), h - safe.b - r - 2),
  };
}

function touchesRect(s: Slot, r: number, rect: Rect): boolean {
  const nx = Math.min(Math.max(s.x, rect.x), rect.x + rect.w);
  const ny = Math.min(Math.max(s.y, rect.y), rect.y + rect.h);
  return (s.x - nx) ** 2 + (s.y - ny) ** 2 < (r + GAP) ** 2;
}

/**
 * Move a circle off a rectangle: the smallest of the four pushes (left/right/up/down) that still clears the
 * rectangle once kept on screen. (A short phone has no room under the minimap, so the stick moves sideways.)
 */
function pushOffRect(s: Slot, r: number, rect: Rect, vp: Viewport): Slot {
  if (!touchesRect(s, r, rect)) return s;
  const opts = [
    { x: rect.x - GAP - r, y: s.y },
    { x: rect.x + rect.w + GAP + r, y: s.y },
    { x: s.x, y: rect.y - GAP - r },
    { x: s.x, y: rect.y + rect.h + GAP + r },
  ]
    .map((p) => clampInto({ ...s, x: p.x, y: p.y }, r, vp))
    .sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y));
  return opts.find((c) => !touchesRect(c, r, rect)) ?? opts[0];
}

export interface SolveResult {
  layout: Layout;
  /** True when every control is inside the safe area, off the HUD and clear of the others. */
  ok: boolean;
}

/**
 * Make a layout legal: every control inside the safe area, off the HUD and not overlapping another control (touch
 * targets ≥ 48 px count). `pinned` controls (e.g. the one being dragged) are moved last-resort only.
 */
export function solveLayout(input: Layout, vp: Viewport, hud: Rect[], pinned: ControlId[] = []): SolveResult {
  const L = {} as Layout;
  for (const id of CONTROL_IDS) L[id] = { ...input[id] };
  const rad = (id: ControlId): number => targetSize(L[id].d) / 2;
  for (let iter = 0; iter < 40; iter++) {
    let moved = false;
    for (const id of CONTROL_IDS) {
      const r = rad(id);
      let s = clampInto(L[id], r, vp);
      for (const rect of hud) s = pushOffRect(s, r, rect, vp);
      if (s.x !== L[id].x || s.y !== L[id].y) moved = true;
      L[id] = s;
    }
    for (let i = 0; i < CONTROL_IDS.length; i++) {
      for (let j = i + 1; j < CONTROL_IDS.length; j++) {
        const a = CONTROL_IDS[i];
        const b = CONTROL_IDS[j];
        const min = rad(a) + rad(b) + GAP;
        let dx = L[b].x - L[a].x;
        let dy = L[b].y - L[a].y;
        let dist = Math.hypot(dx, dy);
        if (dist >= min) continue;
        if (dist < 0.01) {
          dx = 1;
          dy = 0;
          dist = 1;
        }
        const push = min - dist;
        const ux = dx / dist;
        const uy = dy / dist;
        const pa = pinned.includes(a);
        const pb = pinned.includes(b);
        const fa = pa && !pb ? 0 : pb && !pa ? 1 : 0.5;
        L[a] = { ...L[a], x: L[a].x - ux * push * fa, y: L[a].y - uy * push * fa };
        L[b] = { ...L[b], x: L[b].x + ux * push * (1 - fa), y: L[b].y + uy * push * (1 - fa) };
        moved = true;
      }
    }
    if (!moved) break;
  }
  for (const id of CONTROL_IDS) L[id] = clampInto(L[id], rad(id), vp);
  return { layout: L, ok: layoutProblems(L, vp, hud).length === 0 };
}

/** What's wrong with a layout (empty = legal). Used by the solver, the editor and the tests. */
export function layoutProblems(L: Layout, vp: Viewport, hud: Rect[]): string[] {
  const out: string[] = [];
  const { w, h, safe } = vp;
  for (const id of CONTROL_IDS) {
    const s = L[id];
    const r = targetSize(s.d) / 2;
    if (s.x - r < safe.l - 0.5 || s.x + r > w - safe.r + 0.5 || s.y - r < safe.t - 0.5 || s.y + r > h - safe.b + 0.5) out.push(`${id} outside the safe area`);
    for (const rect of hud) {
      const nx = Math.min(Math.max(s.x, rect.x), rect.x + rect.w);
      const ny = Math.min(Math.max(s.y, rect.y), rect.y + rect.h);
      if ((s.x - nx) ** 2 + (s.y - ny) ** 2 < (r + 0.5) ** 2) out.push(`${id} covers the HUD`);
    }
  }
  for (let i = 0; i < CONTROL_IDS.length; i++) {
    for (let j = i + 1; j < CONTROL_IDS.length; j++) {
      const a = L[CONTROL_IDS[i]];
      const b = L[CONTROL_IDS[j]];
      if (Math.hypot(a.x - b.x, a.y - b.y) < targetSize(a.d) / 2 + targetSize(b.d) / 2 - 0.5) out.push(`${CONTROL_IDS[i]} overlaps ${CONTROL_IDS[j]}`);
    }
  }
  return out;
}

/**
 * The default layout for these settings, made legal. If a phone has no room for the chosen size (Large, or a big
 * HUD), the controls step down a size rather than cover the HUD or each other.
 */
export function bestDefaultLayout(vp: Viewport, size: TouchSize, leftHanded: boolean, hud: Rect[] = hudRects(vp, leftHanded)): Layout {
  const order: TouchSize[] = size === 'large' ? ['large', 'medium', 'small'] : size === 'medium' ? ['medium', 'small'] : ['small'];
  let last: SolveResult | null = null;
  for (const sz of order) {
    last = solveLayout(defaultLayout(vp, sz, leftHanded), vp, hud);
    if (last.ok) return last.layout;
  }
  return last!.layout;
}

/** Apply a saved (edited) layout on top of the default one; mirrors it if it was made for the other hand. */
export function applySaved(def: Layout, saved: SavedLayout | undefined, vp: Viewport, leftHanded: boolean): Layout {
  const L = { ...def };
  if (!saved) return L;
  const mirror = saved.lefty !== leftHanded;
  for (const id of CONTROL_IDS) {
    const c = saved.controls[id];
    if (!c) continue;
    const fx = mirror && !UNMIRRORED.includes(id) ? 1 - c.x : c.x;
    L[id] = { x: fx * vp.w, y: c.y * vp.h, d: Math.round(def[id].d * c.s) };
  }
  return L;
}

/** Turn an edited layout back into the saved form (fractions of the screen + size multiples). */
export function toSaved(L: Layout, def: Layout, vp: Viewport, leftHanded: boolean): SavedLayout {
  const controls: SavedLayout['controls'] = {};
  for (const id of CONTROL_IDS) {
    const s = Math.min(SCALE_MAX, Math.max(SCALE_MIN, L[id].d / def[id].d));
    controls[id] = { x: +(L[id].x / vp.w).toFixed(4), y: +(L[id].y / vp.h).toFixed(4), s: +s.toFixed(3) };
  }
  return { lefty: leftHanded, controls };
}
