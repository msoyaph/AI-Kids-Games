/**
 * Touch joystick response (pure): a small dead zone so a resting thumb never creeps, a gentle
 * curve for fine control near the centre, and full speed a little before the rim so pushing
 * to the edge always means full speed. Direction stays fully analog through 360°.
 */

/** Share of the travel that reads as zero. */
export const STICK_DEAD = 0.1;
/** Deflection (share of the travel) that already reads as full speed. */
export const STICK_FULL = 0.9;
/** Response exponent (> 1 = finer near the centre). */
export const STICK_CURVE = 1.25;

export interface StickReading {
  /** Analog move, x = right, y = forward (screen up), each −1..1; |(x, y)| = mag. */
  x: number;
  y: number;
  /** 0..1 after dead zone and curve. */
  mag: number;
  /** Raw deflection 0..1 (knob position), before the curve. */
  raw: number;
  /** Push direction, degrees clockwise from screen up. */
  ang: number;
}

export function stickReading(): StickReading {
  return { x: 0, y: 0, mag: 0, raw: 0, ang: 0 };
}

/** Read a knob offset (dx, dy in CSS px, y down) against the knob's travel radius. */
export function stickResponse(dx: number, dy: number, travel: number, out: StickReading): StickReading {
  const l = Math.hypot(dx, dy);
  out.raw = Math.min(1, l / travel);
  out.ang = l > 0 ? (Math.atan2(dx, -dy) * 180) / Math.PI : out.ang;
  const r = Math.min(1, Math.max(0, (out.raw - STICK_DEAD) / (STICK_FULL - STICK_DEAD)));
  if (r <= 0) {
    out.x = out.y = out.mag = 0;
    return out;
  }
  const m = Math.pow(r, STICK_CURVE);
  out.mag = m;
  out.x = (dx / l) * m;
  out.y = (-dy / l) * m;
  return out;
}
