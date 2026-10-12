import { clamp } from '../core/mathx';

/**
 * Forgiving landing minigame (side view). Slow down with the thrust button and touch down
 * gently on the glowing pad. Too fast or off the pad just bounces you back up to try again.
 * On Easy (or after a few tries on Normal) an autopilot keeps the descent slow.
 */

export interface LandingState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  px: number;
  py: number;
  thrusting: boolean;
  attempts: number;
  assist: boolean;
  done: boolean;
  perfect: boolean;
  /** Last touchdown result, for messages. */
  last: 'none' | 'fast' | 'miss' | 'ok' | 'perfect';
  tilt: number;
}

export interface LandingConfig {
  /** Gravity (units/s²). */
  gravity: number;
  thrust: number;
  side: number;
  groundY: number;
  padX: number;
  padW: number;
  safeSpeed: number;
  worldW: number;
  /** Failed attempts before the autopilot switches on (Normal). */
  assistAfter: number;
}

export function landingGravity(gravityG: number): number {
  // Keep it gentle: low gravity worlds feel floaty, big ones a bit heavier.
  return 150 + 120 * clamp(Math.sqrt(gravityG), 0.2, 1.2);
}

export function makeLanding(_cfg: LandingConfig, assist: boolean, startX: number): LandingState {
  return { x: startX, y: 90, vx: 0, vy: 40, px: startX, py: 90, thrusting: false, attempts: 0, assist, done: false, perfect: false, last: 'none', tilt: 0 };
}

export interface LandingInput {
  x: number;
  thrust: boolean;
}

/** Returns true on the step the rocket lands successfully. */
export function stepLanding(s: LandingState, cfg: LandingConfig, input: LandingInput, dt: number): boolean {
  s.px = s.x;
  s.py = s.y;
  if (s.done) return false;
  let thrust = input.thrust;
  let side = input.x;
  if (s.assist) {
    // Autopilot: keep falling slowly, and drift gently toward the pad.
    const height = cfg.groundY - s.y;
    const targetVy = height > 200 ? cfg.safeSpeed * 0.75 : cfg.safeSpeed * 0.4;
    if (s.vy > targetVy) thrust = true;
    const dx = cfg.padX - s.x;
    if (Math.abs(side) < 0.2) side = clamp(dx / 200, -0.6, 0.6);
  }
  s.thrusting = thrust;
  let ay = cfg.gravity;
  if (thrust) ay -= cfg.thrust;
  s.vy += ay * dt;
  s.vy = clamp(s.vy, -260, 420);
  s.vx += side * cfg.side * dt;
  s.vx *= Math.exp(-1.6 * dt);
  s.vx = clamp(s.vx, -260, 260);
  s.x = clamp(s.x + s.vx * dt, 60, cfg.worldW - 60);
  s.y += s.vy * dt;
  if (s.y < 40) {
    s.y = 40;
    if (s.vy < 0) s.vy = 0;
  }
  s.tilt = clamp(s.vx / 260, -1, 1) * 0.35;
  if (s.y >= cfg.groundY) {
    s.y = cfg.groundY;
    const onPad = Math.abs(s.x - cfg.padX) <= cfg.padW / 2;
    if (s.vy > cfg.safeSpeed) {
      s.last = 'fast';
      bounce(s, cfg);
    } else if (!onPad) {
      s.last = 'miss';
      bounce(s, cfg);
    } else {
      s.done = true;
      s.perfect = s.vy <= cfg.safeSpeed * 0.5 && Math.abs(s.x - cfg.padX) <= cfg.padW * 0.22;
      s.last = s.perfect ? 'perfect' : 'ok';
      s.vy = 0;
      s.vx = 0;
      return true;
    }
  }
  return false;
}

function bounce(s: LandingState, cfg: LandingConfig): void {
  s.attempts++;
  s.vy = -Math.max(140, Math.abs(s.vy) * 0.5);
  s.vx *= 0.5;
  s.y = cfg.groundY - 2;
  if (!s.assist && s.attempts >= cfg.assistAfter) s.assist = true;
}
