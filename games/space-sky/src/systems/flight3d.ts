import { clamp } from '../core/mathx';
import { COMET_BOOST, SLING_MIN_SWEEP, SURFACE_G, type FlightEvents } from './flight';
import type { FlightParams } from './rocketStats';

/**
 * Kid-friendly 3D space flight. Pure logic, no rendering.
 *
 * It keeps every rule of the 2D flight (flight.ts): the same rocket stats, fuel and boost costs,
 * gravity formula, slingshot test, bumps, comet rides, pickups and events. What changes is
 * steering: the rocket flies forward by itself and the stick turns its nose left/right and
 * up/down (a chase camera follows behind). The flat 2D layout is the (x, y) plane and `h` is height.
 */

export interface Steer3 {
  /** -1..1 turn left/right. */
  x: number;
  /** -1..1 stick up/down (up is negative, like the screen). */
  y: number;
  boost: boolean;
  boostPressed: boolean;
}

export interface Ship3 {
  x: number;
  y: number;
  h: number;
  vx: number;
  vy: number;
  vh: number;
  px: number;
  py: number;
  ph: number;
  /** Heading: yaw in the plane (0 = +x, toward +y is positive) and pitch (up positive). */
  yaw: number;
  pitch: number;
  pyaw: number;
  ppitch: number;
  /** Cosmetic bank (roll) from turning, radians. */
  bank: number;
  pbank: number;
  fuel: number;
  shield: number;
  /** 0..1 engine power this step (for flames and sound). */
  thrust: number;
  boostTime: number;
  boostCooldown: number;
  bumpTime: number;
  cometTime: number;
  slingTime: number;
  locked: boolean;
  /** True while the soft edge of the play area is turning the rocket back. */
  outside: boolean;
}

export interface Body3 {
  id: string;
  x: number;
  y: number;
  h: number;
  r: number;
  pull: number;
  landable: boolean;
  scannable: boolean;
  slingIn: boolean;
  slingSwept: number;
  /** Last relative direction (for measuring the swept angle in 3D). */
  sx: number;
  sy: number;
  sh: number;
}

export interface Coin3 { x: number; y: number; h: number; alive: boolean; pulled: boolean; value: number }
export interface Fuel3 { x: number; y: number; h: number; alive: boolean; pulled: boolean }
export interface Asteroid3 { x: number; y: number; h: number; vx: number; vy: number; vh: number; r: number; rot: number; vr: number; kind: number; px: number; py: number; ph: number }
export interface Comet3 { x: number; y: number; h: number; vx: number; vy: number; len: number; width: number; px: number; py: number }
/** A hoop: center, radius and the direction you fly through it. */
export interface Gate3 { x: number; y: number; h: number; r: number; nx: number; ny: number; nh: number; passed: boolean; side: number }
export interface Haul3 { x: number; y: number; h: number; alive: boolean; kind: string }
export interface Glimmer3 { x: number; y: number; h: number; alive: boolean; baseX: number; baseY: number; baseH: number; phase: number }

export interface World3 {
  bodies: Body3[];
  coins: Coin3[];
  fuels: Fuel3[];
  asteroids: Asteroid3[];
  comets: Comet3[];
  gates: Gate3[];
  hauls: Haul3[];
  glimmers: Glimmer3[];
  nextGate: number;
  bounds: { x0: number; y0: number; x1: number; y1: number; h0: number; h1: number };
  /** Direction toward the Sun (unit vector); comet tails point away from it. */
  sunX: number;
  sunY: number;
  sunH: number;
  windX: number;
  windY: number;
  /** Where the arrow points (for Easy aim assist and the slow-down near objectives). */
  targetX: number;
  targetY: number;
  targetH: number;
  targetR: number;
  /** The target is a planet or moon (Easy may circle it so Land/Scan stays available). */
  targetOrbit: boolean;
  hasTarget: boolean;
  time: number;
}

export interface Tune3 {
  /** Cruise speed as a fraction of max speed. */
  cruise: number;
  /** Cruise near the objective (slow down so kids can land, scan or collect). */
  nearCruise: number;
  /** How quickly velocity follows the nose (1/s). */
  grip: number;
  /** Turn rates (rad/s). */
  yawRate: number;
  pitchRate: number;
  maxPitch: number;
  /** How fast pitch returns to level with the stick centered (1/s). Easy is stronger. */
  level: number;
  /** Fuel burned while cruising, as a fraction of fuelPerSec. */
  cruiseBurn: number;
  /** Easy: orbit-hug so the Land button stays up near the objective. */
  orbitAssist: boolean;
  /** Planet pull multiplier (races halve it so hoops near Saturn stay flyable). */
  gravity?: number;
  /** Slingshot boosts (off in races: no surprise speed-ups next to a hoop). */
  slings?: boolean;
}

/** Racing handling: nimbler turns, no slow-down near hoops, gentler gravity, no slingshots. */
export function raceTune(base: Tune3): Tune3 {
  return { ...base, yawRate: base.yawRate * 1.45, pitchRate: base.pitchRate * 1.45, nearCruise: base.cruise, orbitAssist: false, gravity: 0.5, slings: false };
}

export const TUNE3: Record<'easy' | 'normal', Tune3> = {
  easy: { cruise: 0.74, nearCruise: 0.48, grip: 2.6, yawRate: 1.55, pitchRate: 1.15, maxPitch: 0.9, level: 1.8, cruiseBurn: 0.55, orbitAssist: true },
  normal: { cruise: 0.8, nearCruise: 0.55, grip: 2.2, yawRate: 1.7, pitchRate: 1.25, maxPitch: 0.95, level: 0.7, cruiseBurn: 0.6, orbitAssist: false },
};

export function makeShip3(x: number, y: number, h: number, yaw: number, p: FlightParams): Ship3 {
  return {
    x, y, h, vx: 0, vy: 0, vh: 0, px: x, py: y, ph: h, yaw, pitch: 0, pyaw: yaw, ppitch: 0, bank: 0, pbank: 0,
    fuel: p.maxFuel, shield: p.maxShield, thrust: 0, boostTime: 0, boostCooldown: 0, bumpTime: 0, cometTime: 0, slingTime: 0,
    locked: false, outside: false,
  };
}

export function emptyWorld3(): World3 {
  return {
    bodies: [], coins: [], fuels: [], asteroids: [], comets: [], gates: [], hauls: [], glimmers: [], nextGate: 0,
    bounds: { x0: -3000, y0: -3000, x1: 3000, y1: 3000, h0: -900, h1: 900 },
    sunX: -1, sunY: 0, sunH: 0, windX: 0, windY: 0,
    targetX: 0, targetY: 0, targetH: 0, targetR: 0, targetOrbit: false, hasTarget: false, time: 0,
  };
}

export function makeBody3(id: string, x: number, y: number, h: number, r: number, pull: number, landable: boolean, scannable = false): Body3 {
  return { id, x, y, h, r, pull, landable, scannable, slingIn: false, slingSwept: 0, sx: 0, sy: 0, sh: 0 };
}

export function shipSpeed3(s: Ship3): number {
  return Math.sqrt(s.vx * s.vx + s.vy * s.vy + s.vh * s.vh);
}

/** Forward direction of the nose. */
export function forward(s: Ship3, out: { x: number; y: number; h: number }): { x: number; y: number; h: number } {
  const cp = Math.cos(s.pitch);
  out.x = Math.cos(s.yaw) * cp;
  out.y = Math.sin(s.yaw) * cp;
  out.h = Math.sin(s.pitch);
  return out;
}

const fwd = { x: 0, y: 0, h: 0 };

function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/** Turn the nose toward a direction (yaw/pitch) at limited rates. */
function steerToward(s: Ship3, dx: number, dy: number, dh: number, strength: number, t: Tune3, dt: number): void {
  const len = Math.hypot(dx, dy, dh) || 1;
  const wantYaw = Math.atan2(dy, dx);
  const wantPitch = clamp(Math.asin(clamp(dh / len, -1, 1)), -t.maxPitch, t.maxPitch);
  const dyaw = wrapAngle(wantYaw - s.yaw);
  s.yaw += clamp(dyaw, -1, 1) * t.yawRate * strength * dt * 1.6;
  s.pitch += clamp(wantPitch - s.pitch, -1, 1) * t.pitchRate * strength * dt * 1.6;
}

/**
 * One fixed step. `assist` comes from the difficulty tuning (Easy 0.35, Normal 0); `flipY` flips up/down.
 */
export function stepFlight3(ship: Ship3, w: World3, input: Steer3, p: FlightParams, t: Tune3, dt: number, ev: FlightEvents, flipY = false): void {
  ship.px = ship.x;
  ship.py = ship.y;
  ship.ph = ship.h;
  ship.pyaw = ship.yaw;
  ship.ppitch = ship.pitch;
  ship.pbank = ship.bank;
  w.time += dt;

  let ix = ship.locked ? 0 : clamp(input.x, -1, 1);
  let iy = ship.locked ? 0 : clamp(input.y, -1, 1) * (flipY ? -1 : 1);
  const mag = Math.hypot(ix, iy);
  if (mag > 1) {
    ix /= mag;
    iy /= mag;
  }

  // Boost: same timer, cooldown and fuel cost as 2D.
  if (ship.boostCooldown > 0) ship.boostCooldown -= dt;
  if (ship.boostTime > 0) ship.boostTime -= dt;
  if (!ship.locked && input.boostPressed && ship.boostTime <= 0 && ship.boostCooldown <= 0 && ship.fuel > p.boostFuel * 0.5) {
    ship.boostTime = p.boostTime;
    ship.boostCooldown = p.boostTime + p.boostCooldown;
    ship.fuel = Math.max(0, ship.fuel - p.boostFuel);
    ev.boosted = true;
  }
  const boosting = ship.boostTime > 0;

  // Steering: the stick turns the nose.
  ship.yaw += ix * t.yawRate * dt;
  ship.pitch += -iy * t.pitchRate * dt;
  // Automatic leveling when the stick is centered vertically (stronger on Easy).
  if (Math.abs(iy) < 0.15) ship.pitch -= ship.pitch * Math.min(1, t.level * dt);

  // Distance to the objective (for slow-down and assists).
  let tdx = 0;
  let tdy = 0;
  let tdh = 0;
  let tDist = Infinity;
  if (w.hasTarget) {
    tdx = w.targetX - ship.x;
    tdy = w.targetY - ship.y;
    tdh = w.targetH - ship.h;
    tDist = Math.hypot(tdx, tdy, tdh) - w.targetR;
  }
  // Easy aim assist: nudge the nose toward the objective when the stick is idle or roughly agrees.
  if (p.assist > 0 && w.hasTarget && !ship.locked) {
    forward(ship, fwd);
    const len = tDist + w.targetR || 1;
    const agree = (fwd.x * tdx + fwd.y * tdy + fwd.h * tdh) / len;
    const idle = mag < 0.2;
    if (idle || agree > 0.3) {
      if (t.orbitAssist && w.targetOrbit && w.targetR > 30 && tDist < 520) {
        // Near a planet: circle it instead of diving in, so the Land/Scan button stays available.
        const r = Math.hypot(tdx, tdy, tdh) || 1;
        const ox = -tdy / r;
        const oy = tdx / r;
        const side = Math.sign(ox * fwd.x + oy * fwd.y) || 1;
        const pullIn = clamp((tDist - 110) / 300, -0.6, 0.6);
        steerToward(ship, ox * side + (tdx / r) * pullIn, oy * side + (tdy / r) * pullIn, tdh / r, p.assist * (idle ? 1.6 : 0.8), t, dt);
      } else steerToward(ship, tdx, tdy, tdh, p.assist * (idle ? 1 : 0.5), t, dt);
    }
  }

  // The soft edge of the play area turns the rocket back toward the middle.
  const b = w.bounds;
  ship.outside = ship.x < b.x0 || ship.x > b.x1 || ship.y < b.y0 || ship.y > b.y1 || ship.h < b.h0 || ship.h > b.h1;
  if (ship.outside) {
    const cx = (b.x0 + b.x1) / 2;
    const cy = (b.y0 + b.y1) / 2;
    const ch = (b.h0 + b.h1) / 2;
    steerToward(ship, cx - ship.x, cy - ship.y, ch - ship.h, 1.4, t, dt);
  }
  ship.pitch = clamp(ship.pitch, -t.maxPitch, t.maxPitch);
  ship.yaw = wrapAngle(ship.yaw);
  // Cosmetic bank into turns (the camera never rolls).
  const turn = ix + wrapAngle(ship.yaw - ship.pyaw) / Math.max(dt, 1e-4) / (t.yawRate * 2);
  ship.bank += (clamp(turn, -1, 1) * 0.45 - ship.bank) * Math.min(1, dt * 5);

  // Speed: cruise forward by itself; slow down near the objective; boost, comet and slingshot speed you up.
  let max = p.maxSpeed;
  if (boosting) max *= p.boostSpeed;
  if (ship.cometTime > 0) max *= COMET_BOOST;
  if (ship.slingTime > 0) max *= 1.4;
  const near = tDist < 600;
  const cruiseFrac = boosting || ship.cometTime > 0 || ship.slingTime > 0 ? 1 : near ? t.nearCruise : t.cruise;
  const hasFuel = ship.fuel > 0;
  const wantSpeed = hasFuel ? max * cruiseFrac : 0;
  ship.thrust = hasFuel ? (boosting ? 1 : cruiseFrac) : 0;
  if (hasFuel) ship.fuel = Math.max(0, ship.fuel - p.fuelPerSec * t.cruiseBurn * (boosting ? 1.4 : 1) * dt);
  forward(ship, fwd);
  // Velocity follows the nose (grip); with no fuel the rocket slowly coasts to a stop.
  const k = Math.min(1, (hasFuel ? t.grip * (boosting ? p.boostAccel : 1) : 0.45) * dt);
  ship.vx += (fwd.x * wantSpeed - ship.vx) * k;
  ship.vy += (fwd.y * wantSpeed - ship.vy) * k;
  ship.vh += (fwd.h * wantSpeed - ship.vh) * k;

  // Gravity (same formula as 2D) and slingshots.
  for (let i = 0; i < w.bodies.length; i++) {
    const body = w.bodies[i];
    if (body.pull <= 0) continue;
    const dx = body.x - ship.x;
    const dy = body.y - ship.y;
    const dh = body.h - ship.h;
    const d2 = dx * dx + dy * dy + dh * dh;
    const d = Math.sqrt(d2) || 1;
    const infl = body.r * 4.5;
    if (d < infl) {
      const g = (SURFACE_G * body.pull * body.r * body.r) / Math.max(d2, (body.r * 1.1) ** 2);
      const fade = clamp((infl - d) / (body.r * 1.5), 0, 1);
      // Auto-forward fights gravity, so it is a bit stronger here than in 2D to still be felt.
      const ga = g * fade * 1.35 * (t.gravity ?? 1) * dt;
      ship.vx += (dx / d) * ga;
      ship.vy += (dy / d) * ga;
      ship.vh += (dh / d) * ga;
    }
    if (body.pull >= 0.7 && t.slings !== false) {
      const inBand = d > body.r * 1.15 && d < body.r * 2.6;
      const rx = -dx / d;
      const ry = -dy / d;
      const rh = -dh / d;
      if (inBand) {
        if (body.slingIn) {
          const dot = clamp(rx * body.sx + ry * body.sy + rh * body.sh, -1, 1);
          body.slingSwept += Math.acos(dot);
        } else {
          body.slingIn = true;
          body.slingSwept = 0;
        }
        body.sx = rx;
        body.sy = ry;
        body.sh = rh;
      } else if (body.slingIn) {
        body.slingIn = false;
        const speed = shipSpeed3(ship);
        if (body.slingSwept >= SLING_MIN_SWEEP && speed > p.maxSpeed * 0.55 && d >= body.r * 2.6) {
          ship.slingTime = 2.2;
          ship.vx *= 1.35;
          ship.vy *= 1.35;
          ship.vh *= 1.35;
          ev.slingshot = body.id;
        }
        body.slingSwept = 0;
      }
    }
  }

  // Wind (Neptune).
  ship.vx += w.windX * dt;
  ship.vy += w.windY * dt;

  if (ship.cometTime > 0) ship.cometTime -= dt;
  if (ship.slingTime > 0) ship.slingTime -= dt;
  if (ship.bumpTime > 0) ship.bumpTime -= dt;

  // Soft speed cap.
  const sp = shipSpeed3(ship);
  if (sp > max) {
    const s = 1 - Math.min(1, ((sp - max) / sp) * 5 * dt);
    ship.vx *= s;
    ship.vy *= s;
    ship.vh *= s;
  }
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  ship.h += ship.vh * dt;

  collideBodies(ship, w, p);
  stepAsteroids3(ship, w, p, dt, ev);
  stepComets3(ship, w, p, dt, ev);
  stepPickups3(ship, w, p, dt, ev);
  stepGates3(ship, w, ev);
}

/** Bounce softly off planets and turn the nose away. */
function collideBodies(ship: Ship3, w: World3, p: FlightParams): void {
  for (let i = 0; i < w.bodies.length; i++) {
    const b = w.bodies[i];
    if (b.pull <= 0 && b.r < 60) continue;
    const dx = ship.x - b.x;
    const dy = ship.y - b.y;
    const dh = ship.h - b.h;
    const d = Math.hypot(dx, dy, dh) || 1;
    const min = b.r + p.shipRadius * 0.6;
    if (d >= min) continue;
    const nx = dx / d;
    const ny = dy / d;
    const nh = dh / d;
    ship.x = b.x + nx * min;
    ship.y = b.y + ny * min;
    ship.h = b.h + nh * min;
    const vn = ship.vx * nx + ship.vy * ny + ship.vh * nh;
    if (vn < 0) {
      ship.vx -= 1.25 * vn * nx;
      ship.vy -= 1.25 * vn * ny;
      ship.vh -= 1.25 * vn * nh;
      ship.vx *= 0.92;
      ship.vy *= 0.92;
      ship.vh *= 0.92;
    }
    // Point the nose along the surface so auto-forward does not push back in.
    forward(ship, fwd);
    const fn = fwd.x * nx + fwd.y * ny + fwd.h * nh;
    if (fn < 0.15) {
      const tx = fwd.x - nx * (fn - 0.15);
      const ty = fwd.y - ny * (fn - 0.15);
      const th = fwd.h - nh * (fn - 0.15);
      ship.yaw = Math.atan2(ty, tx);
      ship.pitch = clamp(Math.atan2(th, Math.hypot(tx, ty)), -0.9, 0.9);
    }
  }
}

export function stepAsteroids3(ship: Ship3, w: World3, p: FlightParams, dt: number, ev: FlightEvents): void {
  const b = w.bounds;
  const rad = p.shipRadius;
  for (let i = 0; i < w.asteroids.length; i++) {
    const a = w.asteroids[i];
    a.px = a.x;
    a.py = a.y;
    a.ph = a.h;
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.h += a.vh * dt;
    a.rot += a.vr * dt;
    if (a.x < b.x0 - 200) a.x = a.px = b.x1 + 200;
    else if (a.x > b.x1 + 200) a.x = a.px = b.x0 - 200;
    if (a.y < b.y0 - 200) a.y = a.py = b.y1 + 200;
    else if (a.y > b.y1 + 200) a.y = a.py = b.y0 - 200;
    if (a.h < b.h0 - 200 || a.h > b.h1 + 200) a.vh = -a.vh;
    const dx = ship.x - a.x;
    const dy = ship.y - a.y;
    const dh = ship.h - a.h;
    const min = a.r + rad * 0.8;
    const d2 = dx * dx + dy * dy + dh * dh;
    if (d2 >= min * min) continue;
    const d = Math.sqrt(d2) || 1;
    const nx = dx / d;
    const ny = dy / d;
    const nh = dh / d;
    ship.x = a.x + nx * min;
    ship.y = a.y + ny * min;
    ship.h = a.h + nh * min;
    const vn = (ship.vx - a.vx) * nx + (ship.vy - a.vy) * ny + (ship.vh - a.vh) * nh;
    if (vn < 0) {
      ship.vx -= 1.6 * vn * nx;
      ship.vy -= 1.6 * vn * ny;
      ship.vh -= 1.6 * vn * nh;
      a.vx += 0.25 * vn * nx;
      a.vy += 0.25 * vn * ny;
      a.vh += 0.25 * vn * nh;
    }
    ship.vx += nx * 60;
    ship.vy += ny * 60;
    ship.vh += nh * 60;
    // Turn the nose away a little so you don't keep bumping the same rock.
    forward(ship, fwd);
    const fn = fwd.x * nx + fwd.y * ny + fwd.h * nh;
    if (fn < 0) {
      const tx = fwd.x - nx * fn * 1.4;
      const ty = fwd.y - ny * fn * 1.4;
      const th = fwd.h - nh * fn * 1.4;
      ship.yaw = Math.atan2(ty, tx);
      ship.pitch = clamp(Math.atan2(th, Math.hypot(tx, ty)), -0.9, 0.9);
    }
    if (ship.bumpTime <= 0) {
      ship.bumpTime = 1.2;
      ship.shield = Math.max(0, ship.shield - p.bumpShield);
      ship.fuel = Math.max(0, ship.fuel - p.bumpFuel);
      ev.bumped = true;
    }
  }
}

/** Squared distance from a point to a 3D segment. */
export function distToSegment3Sq(px: number, py: number, ph: number, ax: number, ay: number, ah: number, bx: number, by: number, bh: number): number {
  const vx = bx - ax;
  const vy = by - ay;
  const vh = bh - ah;
  const l2 = vx * vx + vy * vy + vh * vh;
  let t = l2 > 0 ? ((px - ax) * vx + (py - ay) * vy + (ph - ah) * vh) / l2 : 0;
  t = clamp(t, 0, 1);
  const cx = ax + vx * t - px;
  const cy = ay + vy * t - py;
  const ch = ah + vh * t - ph;
  return cx * cx + cy * cy + ch * ch;
}

export function stepComets3(ship: Ship3, w: World3, _p: FlightParams, dt: number, ev: FlightEvents): void {
  const b = w.bounds;
  for (let i = 0; i < w.comets.length; i++) {
    const c = w.comets[i];
    c.px = c.x;
    c.py = c.y;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    if (c.x < b.x0 - 1200) c.x = c.px = b.x1 + 1100;
    else if (c.x > b.x1 + 1200) c.x = c.px = b.x0 - 1100;
    // The tail points away from the Sun.
    const tx = c.x - w.sunX * c.len;
    const ty = c.y - w.sunY * c.len;
    const th = c.h - w.sunH * c.len;
    const d2 = distToSegment3Sq(ship.x, ship.y, ship.h, c.x, c.y, c.h, tx, ty, th);
    if (d2 < c.width * c.width) {
      if (ship.cometTime <= 0) ev.cometRide = true;
      ship.cometTime = 0.6;
      const sp = Math.hypot(c.vx, c.vy) || 1;
      ship.vx += (c.vx / sp) * 500 * dt;
      ship.vy += (c.vy / sp) * 500 * dt;
    }
  }
}

export function stepPickups3(ship: Ship3, w: World3, p: FlightParams, dt: number, ev: FlightEvents): void {
  const grab = p.shipRadius + 18;
  const grab2 = grab * grab;
  const mag2 = p.magnetRadius * p.magnetRadius;
  const pullSpeed = 520 + shipSpeed3(ship);
  for (let i = 0; i < w.coins.length; i++) {
    const c = w.coins[i];
    if (!c.alive) continue;
    const dx = ship.x - c.x;
    const dy = ship.y - c.y;
    const dh = ship.h - c.h;
    const d2 = dx * dx + dy * dy + dh * dh;
    if (d2 < grab2) {
      c.alive = false;
      ev.coins += c.value;
      continue;
    }
    if (c.pulled || d2 < mag2) {
      c.pulled = true;
      const d = Math.sqrt(d2) || 1;
      const step = Math.min(d, pullSpeed * dt);
      c.x += (dx / d) * step;
      c.y += (dy / d) * step;
      c.h += (dh / d) * step;
    }
  }
  for (let i = 0; i < w.fuels.length; i++) {
    const f = w.fuels[i];
    if (!f.alive) continue;
    const dx = ship.x - f.x;
    const dy = ship.y - f.y;
    const dh = ship.h - f.h;
    const d2 = dx * dx + dy * dy + dh * dh;
    if (d2 < grab2) {
      f.alive = false;
      ship.fuel = Math.min(p.maxFuel, ship.fuel + p.maxFuel * 0.35);
      ship.shield = Math.min(p.maxShield, ship.shield + 1);
      ev.fuel++;
      continue;
    }
    if (f.pulled || d2 < mag2 * 0.6) {
      f.pulled = true;
      const d = Math.sqrt(d2) || 1;
      const step = Math.min(d, pullSpeed * dt);
      f.x += (dx / d) * step;
      f.y += (dy / d) * step;
      f.h += (dh / d) * step;
    }
  }
  for (let i = 0; i < w.hauls.length; i++) {
    const it = w.hauls[i];
    if (!it.alive) continue;
    const dx = ship.x - it.x;
    const dy = ship.y - it.y;
    const dh = ship.h - it.h;
    if (dx * dx + dy * dy + dh * dh < grab2 * 1.6) {
      it.alive = false;
      ev.haul = it.kind;
    }
  }
  for (let i = 0; i < w.glimmers.length; i++) {
    const g = w.glimmers[i];
    if (!g.alive) continue;
    g.x = g.baseX + Math.sin(w.time * 0.7 + g.phase) * 40;
    g.y = g.baseY + Math.cos(w.time * 0.9 + g.phase) * 30;
    g.h = g.baseH + Math.sin(w.time * 1.1 + g.phase * 2) * 25;
    const dx = ship.x - g.x;
    const dy = ship.y - g.y;
    const dh = ship.h - g.h;
    if (dx * dx + dy * dy + dh * dh < grab2 * 1.8) {
      g.alive = false;
      ev.glimmer++;
    }
  }
}

/** Gates (hoops) must be flown through in order: crossing the hoop's plane inside the ring counts. */
export function stepGates3(ship: Ship3, w: World3, ev: FlightEvents): void {
  const g = w.gates[w.nextGate];
  if (!g) return;
  const side = (ship.x - g.x) * g.nx + (ship.y - g.y) * g.ny + (ship.h - g.h) * g.nh;
  const prevSide = (ship.px - g.x) * g.nx + (ship.py - g.y) * g.ny + (ship.ph - g.h) * g.nh;
  let pass = false;
  if (prevSide < 0 && side >= 0) {
    // Where did we cross the plane?
    const t = prevSide / (prevSide - side);
    const cx = ship.px + (ship.x - ship.px) * t - g.x;
    const cy = ship.py + (ship.y - ship.py) * t - g.y;
    const ch = ship.ph + (ship.h - ship.ph) * t - g.h;
    if (cx * cx + cy * cy + ch * ch < (g.r * 1.08) ** 2) pass = true;
  }
  // Generous: flying right through the middle always counts, whichever way.
  const dx = ship.x - g.x;
  const dy = ship.y - g.y;
  const dh = ship.h - g.h;
  if (dx * dx + dy * dy + dh * dh < (g.r * 0.6) ** 2) pass = true;
  g.side = side;
  if (pass) {
    g.passed = true;
    ev.gate = w.nextGate;
    w.nextGate++;
  }
}

export function landableNear3(ship: Ship3, w: World3, margin = 190): Body3 | null {
  for (const b of w.bodies) {
    if (!b.landable) continue;
    if (Math.hypot(ship.x - b.x, ship.y - b.y, ship.h - b.h) - b.r < margin) return b;
  }
  return null;
}

export function scannableNear3(ship: Ship3, w: World3, margin = 280): Body3 | null {
  let best: Body3 | null = null;
  let bd = Infinity;
  for (const b of w.bodies) {
    if (!b.scannable) continue;
    const d = Math.hypot(ship.x - b.x, ship.y - b.y, ship.h - b.h) - b.r;
    if (d < margin && d < bd) {
      bd = d;
      best = b;
    }
  }
  return best;
}
