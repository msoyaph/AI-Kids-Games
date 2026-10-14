// Procedural animation: every plant's idle bounce and action, every critter's walk, flap, nibble,
// recoil and run home, as part poses with squash and stretch. Pure numbers (no three.js), written
// into reused pose arrays. Reduced motion keeps things still apart from the actions that carry
// meaning (a flick, a plant popping in, a critter shooed or running home), kept short and small.
import { MOTION, wave } from './fx';
import { POSE_SIZE, rest, type Pose } from './models/types';

export type CritterMood = 'walk' | 'nibble' | 'shooed' | 'flee';

const set = (p: Pose, part: number, dx: number, dy: number, dz: number, rx: number, ry: number, rz: number, sx = 1, sy = 1, sz = 1) => {
  const o = part * POSE_SIZE;
  if (o >= p.length) return;
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

/** A branch's flick: wind back, snap forward, settle (radians), by time since acting. */
export function flick(since: number) {
  if (since < 0 || since > 0.6) return 0;
  if (since < 0.22) return 0.6 * (since / 0.22);
  if (since < 0.3) return 0.6 - 1.05 * ((since - 0.22) / 0.08);
  return -0.45 * Math.exp(-(since - 0.3) * 9) * Math.cos((since - 0.3) * 30);
}

/** Every plant: an idle bounce, and on acting a squash (and its moving part's own action). */
export function posePlant(id: string, p: Pose, t: number, phase: number, sinceAct: number, _sinceMade: number, reduced: boolean) {
  rest(p);
  const b = reduced ? 0 : wave(MOTION.idleBounceHz, t, phase), sway = reduced ? 0 : wave(MOTION.swayHz, t, phase);
  const kick = boing(sinceAct, 0.4, id === 'comfrey' || id === 'yarrow' ? 0.22 : 0.12);
  const sy = (1 + b * 0.035) * kick, sx = (1 - b * 0.02) * (2 - kick);
  set(p, 0, 0, 0, 0, 0, 0, sway * 0.03, sx, sy, sx);
  switch (id) {
    case 'rowan': set(p, 1, 0, 0, 0, 0, 0, sway * 0.05 + flick(sinceAct)); break;
    case 'wisteria': set(p, 1, 0, 0, 0, 0, 0, flick(sinceAct) * 0.8); break;
    case 'comfrey': set(p, 1, 0, (kick - 1) * 0.3, 0, 0, 0, sway * 0.1 + (1 - kick) * 1.2); break;
    case 'maple': set(p, 1, 0, 0, 0, 0, reduced ? 0 : t * 1.5 + phase, 0); break;
    case 'borage': { const a = reduced ? 0 : t * 1.6 + phase; set(p, 1, Math.cos(a) * 0.05, Math.sin(a * 2) * 0.05, 0, 0, a, 0); break; }
  }
}

/** Every critter: a walk bob, wing flaps for flyers, nibbling, a recoil when shooed, a fast run home. */
export function poseCritter(id: string, p: Pose, t: number, phase: number, mood: CritterMood, since: number, reduced: boolean) {
  rest(p);
  const speed = mood === 'flee' ? 2.2 : 1;
  const step = reduced ? 0 : wave(MOTION.walkBobHz * speed, t, phase);
  const hit = mood === 'shooed' ? boing(since, 0.35, 0.25) : 1;
  const recoil = mood === 'shooed' ? Math.max(0, 1 - since / 0.35) * 0.35 : 0;
  const chomp = mood === 'nibble' && !reduced ? Math.max(0, wave(2.2, t, phase)) : 0;
  const flap = reduced ? 0.3 : wave(MOTION.flapHz * speed, t, phase);
  switch (id) {
    case 'snail': case 'grand-snail':
      set(p, 0, 0, 0, 0, 0, 0, -recoil + chomp * 0.18, (1 + step * 0.07) * (2 - hit), (1 - step * 0.04) * hit, 1);
      set(p, 1, step * 0.015, Math.abs(step) * 0.02, 0, 0, 0, step * 0.05 - recoil * 0.5);
      return;
    case 'magpie': case 'seagull': case 'owlet': case 'moths': case 'captain-gull':
      set(p, 0, 0, reduced ? 0 : -flap * 0.03, 0, 0, 0, (reduced ? 0 : wave(0.5, t, phase) * 0.06) - recoil, 2 - hit, hit, 1);
      set(p, 1, 0, 0, 0, -flap * 0.8, 0, 0);
      set(p, 2, 0, 0, 0, flap * 0.8, 0, 0);
      return;
    case 'kite-crow':
      set(p, 0, 0, reduced ? 0 : -flap * 0.02, 0, 0, 0, -recoil, 2 - hit, hit, 1);
      set(p, 1, 0, 0, 0, 0, 0, reduced ? 0 : wave(0.6, t, phase) * 0.15);
      return;
    case 'frog':
      set(p, 0, 0, Math.abs(step) * 0.04, 0, 0, 0, -recoil + chomp * 0.2, 2 - hit, hit * (1 + Math.abs(step) * 0.04), 1);
      set(p, 1, 0, Math.abs(step) * 0.04, 0, 0, 0, step * 0.06);
      return;
    default:
      // walkers (and the bosses built on them): a bouncy waddle
      set(p, 0, 0, Math.abs(step) * (reduced ? 0 : 0.03), 0, 0, 0, (reduced ? 0 : step * 0.06) - recoil + chomp * 0.22, (2 - hit) * (1 - Math.abs(step) * 0.03), hit * (1 + Math.abs(step) * 0.04), 1);
      for (let i = 1; i < 4; i++) set(p, i, 0, Math.abs(step) * (reduced ? 0 : 0.03), 0, 0, 0, (reduced ? 0 : step * 0.06) - recoil + chomp * 0.22, (2 - hit) * (1 - Math.abs(step) * 0.03), hit * (1 + Math.abs(step) * 0.04), 1);
  }
}

/** When, after it fires, a berry leaves a branch (seconds). */
export const FLICK_RELEASE = 0.26;
