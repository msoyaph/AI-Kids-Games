// Procedural animation: each species' idle, action and planting squash as part poses. Pure numbers
// (no three.js), written into reused pose arrays. Reduced motion keeps things still apart from the
// actions that carry meaning (a berry flick, a plant popping in).
import { MOTION, wave } from './fx';
import { POSE_SIZE, rest, type Pose } from './models/types';

const set = (p: Pose, part: number, dx: number, dy: number, dz: number, rx: number, ry: number, rz: number, sx = 1, sy = 1, sz = 1) => {
  const o = part * POSE_SIZE;
  p[o] = dx; p[o + 1] = dy; p[o + 2] = dz; p[o + 3] = rx; p[o + 4] = ry; p[o + 5] = rz; p[o + 6] = sx; p[o + 7] = sy; p[o + 8] = sz;
};

/** Planting: a quick squash and stretch over 0.45 s ({ sx, sy } for the whole plant). */
export function plantSquash(age: number, out: { sx: number; sy: number }) {
  if (age >= 0.45) { out.sx = out.sy = 1; return out; }
  const k = age / 0.45;
  // grows from the soil, overshoots tall, then settles wide-and-short before resting
  const sy = k < 0.5 ? 0.2 + 1.0 * (k / 0.5) : 1.2 - 0.2 * Math.sin(((k - 0.5) / 0.5) * Math.PI * 1.5) * (1 - (k - 0.5) * 2) - 0.2 * ((k - 0.5) / 0.5);
  out.sy = Math.max(0.2, sy);
  out.sx = 1 / Math.sqrt(out.sy);
  return out;
}

/** The Rowan's flick: wind back, snap forward, settle (radians on the branch), by time since firing. */
export function flick(since: number) {
  if (since < 0 || since > 0.6) return 0;
  if (since < 0.22) return 0.55 * (since / 0.22);
  if (since < 0.3) return 0.55 - 0.95 * ((since - 0.22) / 0.08);
  return -0.4 * Math.exp(-(since - 0.3) * 9) * Math.cos((since - 0.3) * 30);
}

/** When, after it fires, a berry leaves the Rowan's branch (seconds). */
export const FLICK_RELEASE = 0.26;

export function posePlant(id: string, p: Pose, t: number, phase: number, sinceFire: number, reduced: boolean) {
  rest(p);
  const sway = reduced ? 0 : wave(MOTION.swayHz, t, phase);
  if (id === 'comfrey') {
    set(p, 0, 0, 0, 0, 0, 0, sway * 0.025, 1 + sway * 0.01, 1 - sway * 0.01, 1);
    set(p, 1, 0, 0, 0, 0, 0, sway * 0.09 + (reduced ? 0 : wave(MOTION.swayHz * 1.7, t, phase) * 0.03));
  } else if (id === 'rowan') {
    set(p, 0, 0, 0, 0, 0, 0, sway * 0.03);
    set(p, 1, 0, 0, 0, 0, 0, sway * 0.04 + flick(sinceFire));
  } else if (id === 'boxwood') {
    const breathe = reduced ? 0 : wave(MOTION.swayHz * 0.8, t, phase);
    set(p, 0, 0, 0, 0, 0, 0, 0, 1 - breathe * 0.012, 1 + breathe * 0.018, 1 - breathe * 0.012);
  }
}

export function poseCritter(id: string, p: Pose, t: number, phase: number, reduced: boolean) {
  rest(p);
  const step = reduced ? 0 : wave(MOTION.walkBobHz, t, phase);
  if (id === 'snail') {
    set(p, 0, 0, 0, 0, 0, 0, 0, 1 + step * 0.06, 1 - step * 0.03, 1);
    set(p, 1, step * 0.012, Math.abs(step) * 0.012, 0, 0, 0, step * 0.04);
  } else if (id === 'ant') {
    set(p, 0, 0, Math.abs(wave(MOTION.walkBobHz * 2, t, phase)) * (reduced ? 0 : 0.012), 0, 0, 0, reduced ? 0 : step * 0.08);
  } else if (id === 'magpie') {
    const flap = reduced ? 0.3 : wave(MOTION.flapHz, t, phase);
    set(p, 0, 0, reduced ? 0 : -flap * 0.02, 0, 0, 0, reduced ? 0 : wave(0.5, t, phase) * 0.06);
    set(p, 1, 0, 0, 0, -flap * 0.75, 0, 0);
    set(p, 2, 0, 0, 0, flap * 0.75, 0, 0);
  }
}
