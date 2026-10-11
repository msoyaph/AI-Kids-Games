// Analog joystick maths (pure: no DOM, unit-tested).

/** Feel of the glass joystick. Ratios are of the knob's travel radius. */
export const STICK = {
  /** No steering until the thumb has moved this far (stops drift from a resting thumb). */
  deadZone: 0.08,
  /** Full lock is reached before the very edge, so kids don't have to push to the rim. */
  fullLock: 0.9,
  /** > 1 = gentle near the centre for small corrections, quick toward the edge. */
  exponent: 1.5,
};

/**
 * Steering (−1 … 1) for a horizontal knob offset `dx` (px) on a stick whose knob can travel `radius` px.
 * Only the horizontal axis steers; the vertical axis is ignored.
 */
export function stickResponse(dx: number, radius: number, o = STICK): number {
  if (!(radius > 0)) return 0;
  const r = Math.min(1, Math.abs(dx) / radius);
  if (r <= o.deadZone) return 0;
  if (r >= o.fullLock) return Math.sign(dx);
  const t = (r - o.deadZone) / (o.fullLock - o.deadZone);
  return Math.sign(dx) * Math.pow(t, o.exponent);
}

/** Clamp a knob offset to the travel circle; returns the clamped offset. */
export function clampKnob(dx: number, dy: number, radius: number): { x: number; y: number } {
  const d = Math.hypot(dx, dy);
  if (d <= radius || d === 0) return { x: dx, y: dy };
  const k = radius / d;
  return { x: dx * k, y: dy * k };
}

/**
 * Where a floating stick's base appears for a thumb that lands at (x, y): under the thumb, but pulled in so the
 * whole base stays inside `bounds` (the safe area).
 */
export function floatingOrigin(x: number, y: number, baseRadius: number, bounds: { left: number; top: number; right: number; bottom: number }): { x: number; y: number } {
  const cx = Math.min(Math.max(x, bounds.left + baseRadius), bounds.right - baseRadius);
  const cy = Math.min(Math.max(y, bounds.top + baseRadius), bounds.bottom - baseRadius);
  return { x: cx, y: cy };
}
