import { angleDiff, clamp, distToSegment2 } from '../core/mathx';
import type { FlightParams } from './rocketStats';

/**
 * Kid-friendly 2D space flight. Pure logic, no rendering.
 *
 * Steering is "screen-relative": push the stick toward where you want to go and the rocket
 * accelerates that way. There is gentle drag so the rocket slows down by itself, a speed limit,
 * planet gravity (with slingshots), soft asteroid bumps and comet-tail speed rides.
 */

export interface SteerInput {
  x: number;
  y: number;
  boost: boolean;
  boostPressed: boolean;
  action: boolean;
}

export interface Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  px: number;
  py: number;
  pangle: number;
  fuel: number;
  shield: number;
  thrust: number;
  boostTime: number;
  boostCooldown: number;
  bumpTime: number;
  cometTime: number;
  slingTime: number;
  /** Set when steering is disabled (cutscenes, tow). */
  locked: boolean;
}

export interface FBody {
  id: string;
  x: number;
  y: number;
  r: number;
  /** Gravity strength (0 = none). */
  pull: number;
  landable: boolean;
  /** Can be scanned for missions. */
  scannable: boolean;
  // Slingshot tracking.
  slingIn: boolean;
  slingAngle: number;
  slingSwept: number;
}

export interface Coin { x: number; y: number; alive: boolean; pulled: boolean; value: number }
export interface FuelCell { x: number; y: number; alive: boolean; pulled: boolean }
export interface Asteroid { x: number; y: number; vx: number; vy: number; r: number; rot: number; vr: number; kind: number; px: number; py: number }
export interface Comet { x: number; y: number; vx: number; vy: number; len: number; width: number; px: number; py: number }
export interface Gate { x: number; y: number; r: number; passed: boolean }
export interface Haul { x: number; y: number; alive: boolean; kind: string }
export interface Glimmer { x: number; y: number; alive: boolean; baseX: number; baseY: number; phase: number }

export interface FlightWorld {
  bodies: FBody[];
  coins: Coin[];
  fuels: FuelCell[];
  asteroids: Asteroid[];
  comets: Comet[];
  gates: Gate[];
  hauls: Haul[];
  glimmers: Glimmer[];
  /** Index of the next gate to pass (gates must be flown in order). */
  nextGate: number;
  bounds: { x0: number; y0: number; x1: number; y1: number };
  /** Direction of the Sun (comet tails point away from it). */
  sunDirX: number;
  sunDirY: number;
  /** Constant push (Neptune winds). */
  windX: number;
  windY: number;
  /** Assist target for Easy mode steering. */
  targetX: number;
  targetY: number;
  hasTarget: boolean;
  time: number;
}

/** Things that happened during one step (counters reset each step, no allocation). */
export interface FlightEvents {
  coins: number;
  fuel: number;
  bumped: boolean;
  cometRide: boolean;
  slingshot: string | null;
  gate: number;
  haul: string | null;
  glimmer: number;
  boosted: boolean;
}

export function makeEvents(): FlightEvents {
  return { coins: 0, fuel: 0, bumped: false, cometRide: false, slingshot: null, gate: -1, haul: null, glimmer: 0, boosted: false };
}

export function resetEvents(e: FlightEvents): void {
  e.coins = 0;
  e.fuel = 0;
  e.bumped = false;
  e.cometRide = false;
  e.slingshot = null;
  e.gate = -1;
  e.haul = null;
  e.glimmer = 0;
  e.boosted = false;
}

export function makeShip(x: number, y: number, p: FlightParams): Ship {
  return {
    x, y, vx: 0, vy: 0, angle: -Math.PI / 2, px: x, py: y, pangle: -Math.PI / 2,
    fuel: p.maxFuel, shield: p.maxShield, thrust: 0, boostTime: 0, boostCooldown: 0, bumpTime: 0, cometTime: 0, slingTime: 0, locked: false,
  };
}

export function emptyWorld(): FlightWorld {
  return {
    bodies: [], coins: [], fuels: [], asteroids: [], comets: [], gates: [], hauls: [], glimmers: [], nextGate: 0,
    bounds: { x0: -2000, y0: -1500, x1: 2000, y1: 1500 }, sunDirX: -1, sunDirY: 0, windX: 0, windY: 0,
    targetX: 0, targetY: 0, hasTarget: false, time: 0,
  };
}

export function makeBody(id: string, x: number, y: number, r: number, pull: number, landable: boolean, scannable = false): FBody {
  return { id, x, y, r, pull, landable, scannable, slingIn: false, slingAngle: 0, slingSwept: 0 };
}

/** Surface gravity (units/s²) of a body with pull = 1. Falls off with distance squared. */
export const SURFACE_G = 380;
export const SLING_MIN_SWEEP = 1.35; // radians (~77°): a real swoop, not just flying past
export const COMET_BOOST = 1.45;

/** Advance the ship one fixed step. Mutates ship/world and writes what happened into ev. */
export function stepFlight(ship: Ship, world: FlightWorld, input: SteerInput, p: FlightParams, dt: number, ev: FlightEvents): void {
  ship.px = ship.x;
  ship.py = ship.y;
  ship.pangle = ship.angle;
  world.time += dt;

  let ix = ship.locked ? 0 : input.x;
  let iy = ship.locked ? 0 : input.y;
  let mag = Math.sqrt(ix * ix + iy * iy);
  if (mag > 1) {
    ix /= mag;
    iy /= mag;
    mag = 1;
  }
  const hasFuel = ship.fuel > 0;

  // Easy-mode assist: bend steering a little toward the target.
  if (p.assist > 0 && world.hasTarget && mag > 0.2) {
    const tx = world.targetX - ship.x;
    const ty = world.targetY - ship.y;
    const td = Math.sqrt(tx * tx + ty * ty);
    if (td > 1) {
      const dot = (ix * tx + iy * ty) / (mag * td);
      if (dot > 0.3) {
        ix = ix * (1 - p.assist) + (tx / td) * mag * p.assist;
        iy = iy * (1 - p.assist) + (ty / td) * mag * p.assist;
      }
    }
  }

  // Boost.
  ship.boostCooldown = Math.max(0, ship.boostCooldown - dt);
  if (!ship.locked && input.boostPressed && ship.boostTime <= 0 && ship.boostCooldown <= 0 && ship.fuel > p.boostFuel * 0.5) {
    ship.boostTime = p.boostTime;
    ship.boostCooldown = p.boostTime + p.boostCooldown;
    ship.fuel = Math.max(0, ship.fuel - p.boostFuel);
    ev.boosted = true;
  }
  const boosting = ship.boostTime > 0;
  if (boosting) ship.boostTime = Math.max(0, ship.boostTime - dt);

  // Current speed limit.
  let max = p.maxSpeed;
  if (boosting) max *= p.boostSpeed;
  if (ship.cometTime > 0) max *= COMET_BOOST;
  if (ship.slingTime > 0) max *= 1.4;

  // Thrust.
  let ax = 0;
  let ay = 0;
  let thrust = hasFuel && mag > 0.12 ? mag : 0;
  if (boosting && thrust === 0 && hasFuel) {
    // Boost with no stick pushes the way the rocket faces.
    ix = Math.cos(ship.angle);
    iy = Math.sin(ship.angle);
    mag = 1;
    thrust = 1;
  }
  if (thrust > 0) {
    const acc = p.accel * (boosting ? p.boostAccel : 1);
    ax += (ix / (mag || 1)) * acc * thrust;
    ay += (iy / (mag || 1)) * acc * thrust;
    // At the speed limit, thrust can still steer but not add more speed.
    const sp0 = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    if (sp0 > max * 0.97) {
      const along = (ax * ship.vx + ay * ship.vy) / sp0;
      if (along > 0) {
        ax -= (along * ship.vx) / sp0;
        ay -= (along * ship.vy) / sp0;
      }
    }
    const target = Math.atan2(iy, ix);
    const diff = angleDiff(ship.angle, target);
    ship.angle += clamp(diff, -p.turnRate * dt, p.turnRate * dt);
    ship.fuel = Math.max(0, ship.fuel - p.fuelPerSec * thrust * dt);
  } else if (!ship.locked) {
    // Drift: nose slowly follows velocity.
    const sp2 = ship.vx * ship.vx + ship.vy * ship.vy;
    if (sp2 > 400) {
      const target = Math.atan2(ship.vy, ship.vx);
      ship.angle += angleDiff(ship.angle, target) * Math.min(1, 2 * dt);
    }
  }
  ship.thrust = thrust;

  // Gravity + slingshots.
  for (let i = 0; i < world.bodies.length; i++) {
    const b = world.bodies[i];
    if (b.pull <= 0) continue;
    const dx = b.x - ship.x;
    const dy = b.y - ship.y;
    const d2 = dx * dx + dy * dy;
    const d = Math.sqrt(d2);
    const influence = b.r * 4.5;
    if (d < influence && d > 1) {
      const minD = b.r * 1.1;
      const g = (SURFACE_G * b.pull * b.r * b.r) / Math.max(d2, minD * minD);
      // Fade out at the edge of the influence so there is no sudden tug.
      const fade = clamp((influence - d) / (b.r * 1.5), 0, 1);
      ax += (dx / d) * g * fade;
      ay += (dy / d) * g * fade;
    }
    // Slingshot: swoop through the ring around a big planet without stopping.
    const inBand = d > b.r * 1.15 && d < b.r * 2.6;
    const ang = Math.atan2(-dy, -dx);
    if (inBand && b.pull >= 0.7) {
      if (!b.slingIn) {
        b.slingIn = true;
        b.slingAngle = ang;
        b.slingSwept = 0;
      } else {
        b.slingSwept += Math.abs(angleDiff(b.slingAngle, ang));
        b.slingAngle = ang;
      }
    } else if (b.slingIn) {
      b.slingIn = false;
      const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
      if (b.slingSwept >= SLING_MIN_SWEEP && speed > p.maxSpeed * 0.55 && d >= b.r * 2.6) {
        ship.slingTime = 2.2;
        ship.vx *= 1.35;
        ship.vy *= 1.35;
        ev.slingshot = b.id;
      }
      b.slingSwept = 0;
    }
  }

  ax += world.windX;
  ay += world.windY;

  // Soft walls at the edge of the sector.
  const B = world.bounds;
  const wall = 900;
  if (ship.x < B.x0) ax += (B.x0 - ship.x) * 4 + wall;
  if (ship.x > B.x1) ax -= (ship.x - B.x1) * 4 + wall;
  if (ship.y < B.y0) ay += (B.y0 - ship.y) * 4 + wall;
  if (ship.y > B.y1) ay -= (ship.y - B.y1) * 4 + wall;

  ship.vx += ax * dt;
  ship.vy += ay * dt;

  // Drag (stronger when not thrusting so kids can stop easily).
  const drag = p.damping * (thrust > 0 ? 0.35 : 1);
  const k = Math.exp(-drag * dt);
  ship.vx *= k;
  ship.vy *= k;

  ship.cometTime = Math.max(0, ship.cometTime - dt);
  ship.slingTime = Math.max(0, ship.slingTime - dt);
  ship.bumpTime = Math.max(0, ship.bumpTime - dt);

  // Speed limit (soft: extra speed from gravity or a finished boost bleeds off smoothly).
  const sp = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
  if (sp > max) {
    const target = sp + (max - sp) * Math.min(1, 5 * dt);
    ship.vx *= target / sp;
    ship.vy *= target / sp;
  }

  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;

  // Planets are solid but soft: you bounce gently off the atmosphere.
  for (let i = 0; i < world.bodies.length; i++) {
    const b = world.bodies[i];
    const dx = ship.x - b.x;
    const dy = ship.y - b.y;
    const minD = b.r + p.shipRadius * 0.6;
    const d2 = dx * dx + dy * dy;
    if (d2 < minD * minD && b.r > 0) {
      const d = Math.sqrt(d2) || 1;
      const nx = dx / d;
      const ny = dy / d;
      ship.x = b.x + nx * minD;
      ship.y = b.y + ny * minD;
      const vn = ship.vx * nx + ship.vy * ny;
      if (vn < 0) {
        // Soft atmosphere: a tiny bounce and some friction, so you settle near the planet.
        ship.vx -= 1.25 * vn * nx;
        ship.vy -= 1.25 * vn * ny;
        ship.vx *= 0.92;
        ship.vy *= 0.92;
      }
    }
  }

  stepAsteroids(ship, world, p, dt, ev);
  stepComets(ship, world, dt, ev);
  stepPickups(ship, world, p, dt, ev);
}

function stepAsteroids(ship: Ship, world: FlightWorld, p: FlightParams, dt: number, ev: FlightEvents): void {
  const sr = p.shipRadius * 0.8;
  for (let i = 0; i < world.asteroids.length; i++) {
    const a = world.asteroids[i];
    a.px = a.x;
    a.py = a.y;
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.rot += a.vr * dt;
    // Wrap asteroids inside the sector bounds (no interpolation across the jump).
    const B = world.bounds;
    let wrapped = true;
    if (a.x < B.x0 - 200) a.x = B.x1 + 150;
    else if (a.x > B.x1 + 200) a.x = B.x0 - 150;
    else if (a.y < B.y0 - 200) a.y = B.y1 + 150;
    else if (a.y > B.y1 + 200) a.y = B.y0 - 150;
    else wrapped = false;
    if (wrapped) {
      a.px = a.x;
      a.py = a.y;
    }
    const dx = ship.x - a.x;
    const dy = ship.y - a.y;
    const minD = a.r + sr;
    const d2 = dx * dx + dy * dy;
    if (d2 < minD * minD) {
      const d = Math.sqrt(d2) || 1;
      const nx = dx / d;
      const ny = dy / d;
      ship.x = a.x + nx * minD;
      ship.y = a.y + ny * minD;
      const rvx = ship.vx - a.vx;
      const rvy = ship.vy - a.vy;
      const vn = rvx * nx + rvy * ny;
      if (vn < 0) {
        ship.vx -= 1.6 * vn * nx;
        ship.vy -= 1.6 * vn * ny;
        a.vx += vn * nx * 0.25;
        a.vy += vn * ny * 0.25;
      }
      // Always give a little push so the ship never sticks.
      ship.vx += nx * 60;
      ship.vy += ny * 60;
      if (ship.bumpTime <= 0) {
        ship.bumpTime = 1.2;
        ship.shield = Math.max(0, ship.shield - p.bumpShield);
        ship.fuel = Math.max(0, ship.fuel - p.bumpFuel);
        ev.bumped = true;
      }
    }
  }
}

function stepComets(ship: Ship, world: FlightWorld, dt: number, ev: FlightEvents): void {
  for (let i = 0; i < world.comets.length; i++) {
    const c = world.comets[i];
    c.px = c.x;
    c.py = c.y;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    const B = world.bounds;
    if (c.x < B.x0 - 1200 || c.x > B.x1 + 1200 || c.y < B.y0 - 1200 || c.y > B.y1 + 1200) {
      // Send it back across the sector.
      c.x = c.vx > 0 ? B.x0 - 1000 : B.x1 + 1000;
      c.px = c.x;
    }
    // Tail points away from the Sun.
    const tx = c.x - world.sunDirX * c.len;
    const ty = c.y - world.sunDirY * c.len;
    const d2 = distToSegment2(ship.x, ship.y, c.x, c.y, tx, ty);
    if (d2 < c.width * c.width) {
      if (ship.cometTime <= 0.05) ev.cometRide = true;
      ship.cometTime = 0.6;
      // Gentle push along the comet's motion.
      const sp = Math.sqrt(c.vx * c.vx + c.vy * c.vy) || 1;
      ship.vx += (c.vx / sp) * 500 * dt;
      ship.vy += (c.vy / sp) * 500 * dt;
    }
  }
}

function pull(ship: Ship, item: { x: number; y: number }, dt: number): void {
  const dx = ship.x - item.x;
  const dy = ship.y - item.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const sp = 520 + (ship.vx * ship.vx + ship.vy * ship.vy) ** 0.5;
  const step = Math.min(d, sp * dt);
  item.x += (dx / d) * step;
  item.y += (dy / d) * step;
}

function stepPickups(ship: Ship, world: FlightWorld, p: FlightParams, dt: number, ev: FlightEvents): void {
  const grab = p.shipRadius + 18;
  const grab2 = grab * grab;
  const mag2 = p.magnetRadius * p.magnetRadius;
  for (let i = 0; i < world.coins.length; i++) {
    const c = world.coins[i];
    if (!c.alive) continue;
    const dx = ship.x - c.x;
    const dy = ship.y - c.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < mag2) c.pulled = true;
    if (c.pulled) pull(ship, c, dt);
    if (d2 < grab2) {
      c.alive = false;
      ev.coins += c.value;
    }
  }
  for (let i = 0; i < world.fuels.length; i++) {
    const f = world.fuels[i];
    if (!f.alive) continue;
    const dx = ship.x - f.x;
    const dy = ship.y - f.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < mag2 * 0.6) f.pulled = true;
    if (f.pulled) pull(ship, f, dt);
    if (d2 < grab2) {
      f.alive = false;
      ship.fuel = Math.min(p.maxFuel, ship.fuel + p.maxFuel * 0.35);
      ship.shield = Math.min(p.maxShield, ship.shield + 1);
      ev.fuel++;
    }
  }
  for (let i = 0; i < world.hauls.length; i++) {
    const hItem = world.hauls[i];
    if (!hItem.alive) continue;
    const dx = ship.x - hItem.x;
    const dy = ship.y - hItem.y;
    if (dx * dx + dy * dy < grab2 * 1.6) {
      hItem.alive = false;
      ev.haul = hItem.kind;
    }
  }
  for (let i = 0; i < world.glimmers.length; i++) {
    const g = world.glimmers[i];
    if (!g.alive) continue;
    g.phase += dt;
    g.x = g.baseX + Math.cos(g.phase * 0.9) * 40;
    g.y = g.baseY + Math.sin(g.phase * 1.3) * 30;
    const dx = ship.x - g.x;
    const dy = ship.y - g.y;
    if (dx * dx + dy * dy < grab2 * 1.8) {
      g.alive = false;
      ev.glimmer++;
    }
  }
  // Gates must be passed in order.
  if (world.nextGate < world.gates.length) {
    const g = world.gates[world.nextGate];
    const dx = ship.x - g.x;
    const dy = ship.y - g.y;
    if (dx * dx + dy * dy < g.r * g.r) {
      g.passed = true;
      ev.gate = world.nextGate;
      world.nextGate++;
    }
  }
}

/** Closest body you could land on, if you're close enough. */
export function landableNear(ship: Ship, world: FlightWorld, margin = 170): FBody | null {
  let best: FBody | null = null;
  let bestD = Infinity;
  for (const b of world.bodies) {
    if (!b.landable) continue;
    const d = Math.hypot(ship.x - b.x, ship.y - b.y) - b.r;
    if (d < margin && d < bestD) {
      best = b;
      bestD = d;
    }
  }
  return best;
}

/** Closest body within scan range (any body can be looked at, missions decide what counts). */
export function scannableNear(ship: Ship, world: FlightWorld, margin = 260): FBody | null {
  let best: FBody | null = null;
  let bestD = Infinity;
  for (const b of world.bodies) {
    if (!b.scannable) continue;
    const d = Math.hypot(ship.x - b.x, ship.y - b.y) - b.r;
    if (d < margin && d < bestD) {
      best = b;
      bestD = d;
    }
  }
  return best;
}

export function shipSpeed(ship: Ship): number {
  return Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
}
