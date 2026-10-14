// Adapted from games/fieldlark/src/input/gestures.ts (the shared engine): only comments changed.
/**
 * Pointer gestures on the town canvas (touch, pen and mouse alike):
 * - tap: a quick press that barely moves;
 * - drag: one finger (or the mouse) moving; the handler decides whether that pans or paints a row;
 * - pinch and twist: two fingers zoom, and turning them turns the view in 45° steps;
 * - wheel (and trackpad pinch, which browsers send as ctrl+wheel): zoom at the cursor.
 */

export interface GestureHandler {
  tap(x: number, y: number, pointerType: string): void;
  dragStart(x: number, y: number, pointerType: string): void;
  dragMove(x: number, y: number): void;
  dragEnd(): void;
  /** Two fingers: `scale` since the last call, around the fingers' middle, plus the middle's move. */
  pinch(scale: number, cx: number, cy: number): void;
  /** Two fingers turned far enough: one 45° step (+1 turns the town clockwise on screen). */
  twist(direction: 1 | -1): void;
  wheel(deltaY: number, x: number, y: number): void;
  hover(x: number, y: number): void;
}

/** A press moving less than this (CSS px) is still a tap. */
export const TAP_SLOP = 10;
const TAP_MS = 600;
/** Two fingers turned this far make one 45° step. */
const TWIST_STEP = (32 * Math.PI) / 180;

interface Finger { id: number; x: number; y: number; sx: number; sy: number; t: number; type: string }

export function listenGestures(el: HTMLElement, h: GestureHandler): () => void {
  const fingers = new Map<number, Finger>();
  let dragging = false, multi = false;
  let lastSpan = 0, lastAngle = 0, twistAcc = 0;

  const local = (e: PointerEvent | WheelEvent) => {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const pair = () => {
    const [a, b] = [...fingers.values()];
    return { a: a!, b: b!, span: Math.hypot(b!.x - a!.x, b!.y - a!.y), angle: Math.atan2(b!.y - a!.y, b!.x - a!.x), cx: (a!.x + b!.x) / 2, cy: (a!.y + b!.y) / 2 };
  };

  const down = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const p = local(e);
    try { el.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    fingers.set(e.pointerId, { id: e.pointerId, x: p.x, y: p.y, sx: p.x, sy: p.y, t: performance.now(), type: e.pointerType });
    if (fingers.size === 2) {
      if (dragging) { h.dragEnd(); dragging = false; }
      multi = true;
      const q = pair();
      lastSpan = q.span; lastAngle = q.angle; twistAcc = 0;
    }
  };

  const move = (e: PointerEvent) => {
    const p = local(e);
    const f = fingers.get(e.pointerId);
    if (!f) { if (e.pointerType === 'mouse') h.hover(p.x, p.y); return; }
    f.x = p.x; f.y = p.y;
    if (fingers.size >= 2) {
      const q = pair();
      if (lastSpan > 0 && q.span > 0) h.pinch(q.span / lastSpan, q.cx, q.cy);
      let da = q.angle - lastAngle;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      twistAcc += da;
      // fingers turning clockwise on screen turn the town clockwise with them
      if (Math.abs(twistAcc) >= TWIST_STEP) { h.twist(twistAcc > 0 ? 1 : -1); twistAcc = 0; }
      lastSpan = q.span; lastAngle = q.angle;
      return;
    }
    if (multi) return; // one finger left after a pinch: wait for it to lift
    if (!dragging && Math.hypot(f.x - f.sx, f.y - f.sy) > TAP_SLOP) { dragging = true; h.dragStart(f.sx, f.sy, f.type); }
    if (dragging) h.dragMove(f.x, f.y);
  };

  const up = (e: PointerEvent) => {
    const f = fingers.get(e.pointerId);
    if (!f) return;
    fingers.delete(e.pointerId);
    if (dragging && fingers.size === 0) { h.dragEnd(); dragging = false; }
    else if (!multi && !dragging && e.type === 'pointerup' && performance.now() - f.t < TAP_MS && Math.hypot(f.x - f.sx, f.y - f.sy) <= TAP_SLOP) h.tap(f.x, f.y, f.type);
    if (fingers.size === 0) multi = false;
    if (fingers.size === 1) { const [g] = [...fingers.values()]; g!.sx = g!.x; g!.sy = g!.y; }
  };

  const wheel = (e: WheelEvent) => {
    e.preventDefault();
    const p = local(e);
    // lines and pages count as about 40 px each
    const k = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 400 : 1;
    h.wheel(e.deltaY * k * (e.ctrlKey ? 3 : 1), p.x, p.y);
  };

  // Safari's own pinch-zoom gestures would zoom the page instead of the town
  const stop = (e: Event) => e.preventDefault();

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', wheel, { passive: false });
  el.addEventListener('gesturestart', stop);
  el.addEventListener('contextmenu', stop);
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
    el.removeEventListener('wheel', wheel);
    el.removeEventListener('gesturestart', stop);
    el.removeEventListener('contextmenu', stop);
  };
}
