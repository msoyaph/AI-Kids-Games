import { STARTER_LOADOUT } from '../data/parts';
import { SYSTEM_BY_ID, type SystemId } from '../data/bodies';
import type { Difficulty, RocketLoadout } from '../data/types';
import { tuning } from './difficulty';
import { makeEvents, resetEvents } from './flight';
import { forward, makeShip3, raceTune, stepFlight3, TUNE3, type Ship3, type Steer3, type World3 } from './flight3d';
import { buildFlight } from './flightWorld';
import { flightParams } from './rocketStats';
import { liftLayout } from './world3d';

/**
 * A simple autopilot for tests and pacing: it steers toward a point the way a careful kid would
 * (with some wobble), boosts on long straights, and reports how long a trip or race took.
 */
export interface BotStyle {
  /** How hard it steers (1 = crisp, 0.5 = lazy). */
  skill: number;
  /** Uses boost when lined up. */
  boosts: boolean;
  /** Random wobble in the stick. */
  wobble: number;
}

export const CAREFUL_KID: BotStyle = { skill: 0.75, boosts: false, wobble: 0.25 };
export const ACE: BotStyle = { skill: 1, boosts: true, wobble: 0 };

const DT = 1 / 60;

function steerTo(s: Ship3, tx: number, ty: number, th: number, style: BotStyle, t: number, out: Steer3): number {
  const dx = tx - s.x;
  const dy = ty - s.y;
  const dh = th - s.h;
  const wantYaw = Math.atan2(dy, dx);
  const wantPitch = Math.atan2(dh, Math.hypot(dx, dy));
  const dyaw = Math.atan2(Math.sin(wantYaw - s.yaw), Math.cos(wantYaw - s.yaw));
  const dp = wantPitch - s.pitch;
  const wob = style.wobble * Math.sin(t * 1.7) * Math.sin(t * 0.63);
  out.x = Math.max(-1, Math.min(1, dyaw * 2.6 * style.skill + wob));
  out.y = Math.max(-1, Math.min(1, -dp * 2.6 * style.skill));
  return Math.abs(dyaw) + Math.abs(dp);
}

export interface TripResult {
  seconds: number;
  arrived: boolean;
  minFuelFrac: number;
  bumps: number;
  coins: number;
}

/** Fly from one system to another until the destination's landing prompt shows. */
export function botTrip(from: SystemId, to: SystemId, diff: Difficulty, style: BotStyle = CAREFUL_KID, loadout: RocketLoadout = STARTER_LOADOUT, seed = 'bot'): TripResult {
  const tune = tuning(diff);
  const flat = buildFlight({ from, to, seed, tuning: tune });
  const l = liftLayout(flat, seed);
  const w: World3 = l.world;
  const p = flightParams(loadout, diff);
  const t3 = TUNE3[diff === 'easy' ? 'easy' : 'normal'];
  const s = makeShip3(l.startX, l.startY, l.startH, l.startYaw, p);
  const dest = w.bodies.find((b) => b.id === SYSTEM_BY_ID[to].main)!;
  w.hasTarget = true;
  w.targetX = dest.x;
  w.targetY = dest.y;
  w.targetH = dest.h;
  w.targetR = dest.r;
  w.targetOrbit = true;
  const ev = makeEvents();
  const input: Steer3 = { x: 0, y: 0, boost: false, boostPressed: false };
  let time = 0;
  let minFuel = 1;
  let bumps = 0;
  let coins = 0;
  while (time < 240) {
    const err = steerTo(s, dest.x, dest.y, dest.h, style, time, input);
    input.boostPressed = style.boosts && err < 0.15 && Math.hypot(dest.x - s.x, dest.y - s.y) > 2500 && Math.floor(time * 2) % 5 === 0;
    resetEvents(ev);
    stepFlight3(s, w, input, p, t3, DT, ev);
    if (ev.bumped) bumps++;
    coins += ev.coins;
    time += DT;
    minFuel = Math.min(minFuel, s.fuel / p.maxFuel);
    if (s.fuel <= 0) return { seconds: time, arrived: false, minFuelFrac: 0, bumps, coins };
    // Arrived: close enough to land (or, for gas giants, to look around and scan).
    if (Math.hypot(dest.x - s.x, dest.y - s.y, dest.h - s.h) - dest.r < 200) return { seconds: time, arrived: true, minFuelFrac: minFuel, bumps, coins };
  }
  return { seconds: time, arrived: false, minFuelFrac: minFuel, bumps, coins };
}

/** Fly a race course through every hoop; returns the race clock (starts at the first hoop) or null. */
export function botRace(course: string, system: SystemId, diff: Difficulty, style: BotStyle = ACE, loadout: RocketLoadout = STARTER_LOADOUT): number | null {
  const tune = tuning(diff);
  const extras = { course };
  const flat = buildFlight({ from: system, to: system, seed: `race:${course}`, tuning: tune, extras });
  const l = liftLayout(flat, `race:${course}`, extras);
  const w = l.world;
  // Race courses are clear of hazards in the game too (no asteroids near hoops).
  const p = flightParams(loadout, diff);
  const t3 = raceTune(TUNE3[diff === 'easy' ? 'easy' : 'normal']);
  const cs = l.courseStart!;
  const s = makeShip3(cs.x, cs.y, cs.h, cs.yaw, p);
  const ev = makeEvents();
  const input: Steer3 = { x: 0, y: 0, boost: false, boostPressed: false };
  let time = 0;
  let clock = 0;
  let running = false;
  const fwd = { x: 0, y: 0, h: 0 };
  while (time < 200) {
    const g = w.gates[w.nextGate];
    if (!g) return clock;
    // Aim a little before the hoop along its facing so you fly straight through it.
    const lead = Math.min(140, Math.hypot(g.x - s.x, g.y - s.y, g.h - s.h) * 0.4);
    const err = steerTo(s, g.x - g.nx * lead, g.y - g.ny * lead, g.h - g.nh * lead, style, time, input);
    forward(s, fwd);
    // Boost only on straight bits: lined up, far from the hoop, and the next hoop is roughly ahead too.
    const n2 = w.gates[w.nextGate + 1];
    const straight = !n2 || (n2.x - g.x) * g.nx + (n2.y - g.y) * g.ny + (n2.h - g.h) * g.nh > 0.8 * Math.hypot(n2.x - g.x, n2.y - g.y, n2.h - g.h);
    input.boostPressed = style.boosts && err < 0.2 && straight && Math.hypot(g.x - s.x, g.y - s.y) > 260;
    w.hasTarget = false;
    resetEvents(ev);
    stepFlight3(s, w, input, p, t3, DT, ev);
    time += DT;
    if (running) clock += DT;
    if (ev.gate === 0) running = true;
  }
  return null;
}
