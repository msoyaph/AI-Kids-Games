// Procedural animation: each species' idle bounce, actions and moods as part poses, with squash and
// stretch. Pure numbers (no three.js), written into reused pose arrays. Reduced motion keeps things
// still apart from the actions that carry meaning (a berry flick, a plant popping in, a critter
// being shooed or running home), which it keeps short and small.
import { MOTION, wave } from './fx';
import { POSE_SIZE, rest, type Pose } from './models/types';

export type CritterMood = 'walk' | 'nibble' | 'shooed' | 'flee';

const set = (p: Pose, part: number, dx: number, dy: number, dz: number, rx: number, ry: number, rz: number, sx = 1, sy = 1, sz = 1) => {
  const o = part * POSE_SIZE;
  p[o] = dx; p[o + 1] = dy; p[o + 2] = dz; p[o + 3] = rx; p[o + 4] = ry; p[o + 5] = rz; p[o + 6] = sx; p[o + 7] = sy; p[o + 8] = sz;
};

/** Planting: a quick squash and stretch over 0.45 s ({ sx, sy } for the whole plant). */
export function plantSquash(age: number, out: { sx: number; sy: number }) {
  if (age >= 0.45) { out.sx = out.sy = 1; return out; }
  const k = Math.max(0, age) / 0.45;
  const sy = k < 0.5 ? 0.2 + 1.0 * (k / 0.5) : 1.2 - 0.2 * Math.sin(((k - 0.5) / 0.5) * Math.PI * 1.5) * (1 - (k - 0.5) * 2) - 0.2 * ((k - 0.5) / 0.5);
  out.sy = Math.max(0.2, sy);
  out.sx = 1 / Math.sqrt(out.sy);
  return out;
}

/** A one-off squash and stretch over `len` seconds: dips to (1 - depth) and springs back. */
export function boing(since: number, len = 0.4, depth = 0.18) {
  if (since < 0 || since > len) return 1;
  const k = since / len;
  return 1 - depth * Math.sin(k * Math.PI) * (1 - k) * 2 + depth * 0.4 * Math.sin(k * Math.PI * 2) * k;
}

/** The Rowan's flick: wind back, snap forward, settle (radians on the branch), by time since firing. */
export function flick(since: number) {
  if (since < 0 || since > 0.6) return 0;
  if (since < 0.22) return 0.6 * (since / 0.22);
  if (since < 0.3) return 0.6 - 1.05 * ((since - 0.22) / 0.08);
  return -0.45 * Math.exp(-(since - 0.3) * 9) * Math.cos((since - 0.3) * 30);
}

/** When, after it fires, a berry leaves the Rowan's branch (seconds). */
export const FLICK_RELEASE = 0.26;

export function posePlant(id: string, p: Pose, t: number, phase: number, sinceFire: number, sinceMade: number, reduced: boolean) {
  rest(p);
  // the idle bounce: a soft breathing squash, gentle sway
  const b = reduced ? 0 : wave(MOTION.idleBounceHz, t, phase), sway = reduced ? 0 : wave(MOTION.swayHz, t, phase);
  const idleY = 1 + b * 0.035, idleX = 1 - b * 0.02;
  if (id === 'comfrey') {
    // making compost: squash down, stretch up, the curl wiggles
    const make = boing(sinceMade, 0.5, 0.22);
    set(p, 0, 0, 0, 0, 0, 0, sway * 0.03, idleX * (2 - make), idleY * make, idleX * (2 - make));
    set(p, 1, 0, (make - 1) * 0.3, 0, 0, 0, sway * 0.1 + (1 - make) * 1.2);
  } else if (id === 'rowan') {
    const kick = boing(sinceFire - 0.22, 0.3, 0.1);
    set(p, 0, 0, 0, 0, 0, 0, sway * 0.03, idleX * (2 - kick), idleY * kick, idleX * (2 - kick));
    set(p, 1, 0, 0, 0, 0, 0, sway * 0.05 + flick(sinceFire));
  } else if (id === 'boxwood') {
    set(p, 0, 0, 0, 0, 0, 0, 0, idleX, idleY, idleX);
  }
}

export function poseCritter(id: string, p: Pose, t: number, phase: number, mood: CritterMood, since: number, reduced: boolean) {
  rest(p);
  const speed = mood === 'flee' ? 2.2 : 1;
  const step = reduced ? 0 : wave(MOTION.walkBobHz * speed, t, phase);
  // shooed: a quick recoil, squashed and leaning back
  const hit = mood === 'shooed' ? boing(since, 0.35, 0.25) : 1;
  const recoil = mood === 'shooed' ? Math.max(0, 1 - since / 0.35) * 0.35 : 0;
  // nibbling: the head dips forward again and again
  const chomp = mood === 'nibble' && !reduced ? Math.max(0, wave(2.2, t, phase)) : 0;
  if (id === 'snail') {
    set(p, 0, 0, 0, 0, 0, 0, -recoil + chomp * 0.18, (1 + step * 0.07) * (2 - hit), (1 - step * 0.04) * hit, 1);
    set(p, 1, step * 0.015, Math.abs(step) * 0.02, 0, 0, 0, step * 0.05 - recoil * 0.5);
  } else if (id === 'ant') {
    set(p, 0, 0, Math.abs(wave(MOTION.walkBobHz * 2 * speed, t, phase)) * (reduced ? 0 : 0.03), 0, 0, 0, (reduced ? 0 : step * 0.1) - recoil + chomp * 0.25, 2 - hit, hit, 1);
  } else if (id === 'magpie') {
    const flap = reduced ? 0.3 : wave(MOTION.flapHz * speed, t, phase);
    set(p, 0, 0, reduced ? 0 : -flap * 0.03, 0, 0, 0, (reduced ? 0 : wave(0.5, t, phase) * 0.06) - recoil, 2 - hit, hit, 1);
    set(p, 1, 0, 0, 0, -flap * 0.8, 0, 0);
    set(p, 2, 0, 0, 0, flap * 0.8, 0, 0);
  }
}
