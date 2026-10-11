import { h } from './dom';
import type { TouchControls } from '../input/touch';
import {
  CONTROL_IDS,
  controlsOverlap,
  coversRect,
  insideSafe,
  MAX_ITEM_SCALE,
  MIN_ITEM_SCALE,
  MIN_TARGET,
  resolveLayout,
  toLayoutItem,
  type ControlId,
  type CustomLayout,
  type GlassSize,
  type Placed,
  type Placement,
  type Rect,
} from '../input/glassLayout';

const LABELS: Record<ControlId, string> = { stick: 'the stick', jump: 'Jump', slide: 'Slide', pause: 'Pause' };

/** Rectangles the controls keep clear of: the live HUD, plus room for the boss bar and wind warnings. */
export function hudRects(): Rect[] {
  const out: Rect[] = [];
  for (const sel of ['.hud-tl', '.hud-tc', '.hud-tr', '.hud-bc']) {
    const r = document.querySelector(sel)?.getBoundingClientRect();
    if (r && r.width > 0) out.push({ l: r.left, t: r.top, r: r.right, b: r.bottom });
  }
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 12;
  const tc = document.querySelector('.hud-tc')?.getBoundingClientRect();
  const half = Math.min(16 * rem, innerWidth * 0.3);
  out.push({ l: innerWidth / 2 - half, t: 0, r: innerWidth / 2 + half, b: (tc && tc.height > 0 ? tc.bottom : 4 * rem) + 4.5 * rem });
  return out;
}

export interface LayoutEditorOptions {
  touch: TouchControls;
  size: GlassSize;
  leftHanded: boolean;
  layout: CustomLayout;
  /** The new layout, or null when cancelled. */
  onDone: (layout: CustomLayout | null) => void;
}

/**
 * Edit layout: drag the glass controls to move them, pull the round handle (or use
 * Smaller / Bigger) to resize. A control can't leave the safe area, overlap another or cover
 * the HUD — it stays at its last good spot and says why. Positions are saved per screen
 * corner (right-handed; mirrored for left-handed play).
 */
export function layoutEditor(o: LayoutEditorOptions): HTMLElement {
  const t = o.touch;
  const w = innerWidth;
  const hgt = innerHeight;
  const safe = t.safeInsets();
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 12;
  const defaults = resolveLayout(w, hgt, o.size, safe, o.leftHanded, {}, rem);
  let p: Placement = resolveLayout(w, hgt, o.size, safe, o.leftHanded, o.layout, rem);
  const hud = hudRects();
  let selected: ControlId | null = null;

  const ring = h('div', { class: 'le-ring hidden' });
  const handle = h('div', { class: 'le-handle hidden', 'aria-hidden': 'true' });
  const status = h('div', { class: 'le-status' }, 'Drag the controls to move them. Pull the round handle to resize.');
  const smaller = h('button', { class: 'btn small', disabled: true, onclick: () => resizeBy(-0.08) }, 'Smaller');
  const bigger = h('button', { class: 'btn small', disabled: true, onclick: () => resizeBy(0.08) }, 'Bigger');
  const surface = h('div', { class: 'le-surface' });
  const panel = h(
    'div',
    { class: 'panel le-panel' },
    h('div', { class: 'title small' }, 'Edit layout'),
    status,
    h('div', { class: 'row' }, smaller, bigger),
    h(
      'div',
      { class: 'row' },
      h('button', { class: 'btn ghost small', onclick: () => {
        p = resolveLayout(w, hgt, o.size, safe, o.leftHanded, {}, rem);
        select(null);
        show();
        say('Back to the default layout.');
      } }, 'Reset to default'),
      h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => o.onDone(toCustom()) }, 'Done'),
    ),
  );
  const el = h('div', { class: 'layout-editor' }, surface, ring, handle, panel);

  function say(text: string, bad = false): void {
    status.textContent = text;
    status.classList.toggle('bad', bad);
  }

  /** Why a spot is no good (or null if it's fine). */
  function problem(id: ControlId, c: Placed): string | null {
    if (!insideSafe(c, w, hgt, safe)) return 'That would go off the screen.';
    for (const other of CONTROL_IDS) if (other !== id && controlsOverlap(c, p[other])) return `That would overlap ${LABELS[other]}.`;
    if (hud.some((r) => coversRect(c, r))) return 'That would cover the timer, health or warnings.';
    return null;
  }

  function show(): void {
    t.showPlacement(p);
    if (!selected) return;
    const c = p[selected];
    ring.style.cssText = `left:${c.x}px;top:${c.y}px;width:${c.d + 12}px;height:${c.d + 12}px`;
    const a = Math.PI / 4;
    handle.style.cssText = `left:${c.x + Math.cos(a) * (c.d / 2 + 6)}px;top:${c.y + Math.sin(a) * (c.d / 2 + 6)}px`;
  }

  function select(id: ControlId | null): void {
    selected = id;
    ring.classList.toggle('hidden', !id);
    handle.classList.toggle('hidden', !id);
    smaller.disabled = bigger.disabled = !id;
    show();
  }

  /** Try a new spot / size for the selected control; keep the last good one otherwise. */
  function attempt(c: Placed): boolean {
    if (!selected) return false;
    const why = problem(selected, c);
    ring.classList.toggle('bad', !!why);
    if (why) {
      say(why, true);
      return false;
    }
    p = { ...p, [selected]: c };
    say(`Moving ${LABELS[selected]}.`);
    show();
    return true;
  }

  function sizeLimits(id: ControlId): [number, number] {
    const base = defaults[id].d;
    return [Math.max(MIN_TARGET, base * MIN_ITEM_SCALE), Math.max(MIN_TARGET, base * MAX_ITEM_SCALE)];
  }

  function resizeBy(k: number): void {
    if (!selected) return;
    const c = p[selected];
    const [lo, hi] = sizeLimits(selected);
    const d = Math.max(lo, Math.min(hi, c.d * (1 + k)));
    if (attempt({ ...c, d })) say(d >= hi - 0.5 ? 'That is as big as it goes.' : d <= lo + 0.5 ? 'That is as small as it goes.' : 'Resized.');
  }

  /** The layout to save: right-handed corner anchors for everything that moved or resized. */
  function toCustom(): CustomLayout {
    const out: CustomLayout = {};
    for (const id of CONTROL_IDS) {
      const c = p[id];
      const d = defaults[id];
      if (Math.abs(c.x - d.x) < 1 && Math.abs(c.y - d.y) < 1 && Math.abs(c.d - d.d) < 1) continue;
      const x = o.leftHanded && id !== 'pause' ? w - c.x : c.x;
      out[id] = toLayoutItem({ x, y: c.y, d: c.d }, c.d / d.d, w, hgt, safe);
    }
    return out;
  }

  // ── dragging ──
  let drag: { id: number; mode: 'move' | 'resize'; ox: number; oy: number } | null = null;
  const hit = (x: number, y: number): ControlId | null => {
    // buttons sit on top of the stick
    for (const id of ['pause', 'jump', 'slide', 'stick'] as const) {
      const c = p[id];
      if (Math.hypot(x - c.x, y - c.y) <= c.d / 2 + 8) return id;
    }
    return null;
  };
  surface.addEventListener('pointerdown', (e) => {
    if (drag) return;
    e.preventDefault();
    // a finger that strays over the panel keeps reporting to the surface
    try {
      surface.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic events */
    }
    if (selected) {
      const r = handle.getBoundingClientRect();
      if (Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) <= 28) {
        drag = { id: e.pointerId, mode: 'resize', ox: 0, oy: 0 };
        return;
      }
    }
    const id = hit(e.clientX, e.clientY);
    select(id);
    if (!id) {
      say('Tap a control to pick it up.');
      return;
    }
    drag = { id: e.pointerId, mode: 'move', ox: e.clientX - p[id].x, oy: e.clientY - p[id].y };
    say(`Moving ${LABELS[id]}.`);
  });
  const move = (e: PointerEvent): void => {
    if (!drag || e.pointerId !== drag.id || !selected) return;
    const c = p[selected];
    if (drag.mode === 'move') attempt({ x: e.clientX - drag.ox, y: e.clientY - drag.oy, d: c.d });
    else {
      const [lo, hi] = sizeLimits(selected);
      const d = Math.max(lo, Math.min(hi, (Math.hypot(e.clientX - c.x, e.clientY - c.y) - 6) * 2));
      attempt({ ...c, d });
    }
  };
  const end = (e: PointerEvent): void => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    ring.classList.remove('bad');
  };
  surface.addEventListener('pointermove', move);
  surface.addEventListener('pointerup', end);
  surface.addEventListener('pointercancel', end);
  surface.addEventListener('lostpointercapture', end);

  show();
  return el;
}
