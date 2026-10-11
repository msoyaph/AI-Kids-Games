import { Rng } from '../core/rng';
import { BODY_BY_ID, SYSTEM_BY_ID, type SystemId } from '../data/bodies';
import { COURSE_BY_ID } from '../data/races';
import type { DiffTuning } from './difficulty';
import { emptyWorld, makeBody, type FlightWorld } from './flight';

/** Extra things a mission asks to place in space. */
export interface FlightExtras {
  /** Small scannable objects (e.g. satellites, beeping asteroids). */
  scanObjects?: { prefix: string; count: number; around: string; radius: number };
  /** Ring course id. */
  course?: string;
  /** Collectible haul items (e.g. ring ice chunks). */
  hauls?: { kind: string; count: number; around: string; radius: number };
  /** Lost glimmers to gather. */
  glimmers?: { count: number; around: string; radius: number };
  /** A hidden space sticker floating near this body. */
  sticker?: { id: string; near: string };
}

export interface FlightSetup {
  from: SystemId;
  to: SystemId;
  /** Body the rocket launches from (defaults to the main body of `from`). */
  startBody?: string;
  seed: string;
  tuning: DiffTuning;
  extras?: FlightExtras;
}

export interface SystemPlacement {
  id: SystemId;
  cx: number;
  cy: number;
}

export interface FlightLayout {
  world: FlightWorld;
  startX: number;
  startY: number;
  systems: SystemPlacement[];
  /** Bodies with a base (where Tuggy can tow you), by body id. */
  bases: string[];
  routeLength: number;
  sticker: { id: string; x: number; y: number } | null;
  /** Where race/training gates start. */
  courseStart: { x: number; y: number } | null;
}

/** Trip length between two systems (not to scale!). Easy trips are a bit shorter. */
export function routeLength(from: SystemId, to: SystemId, scale = 1): number {
  if (from === to) return 0;
  const d = Math.abs(SYSTEM_BY_ID[from].order - SYSTEM_BY_ID[to].order);
  return Math.round((5200 + 1500 * Math.min(d, 4)) * scale);
}

export function buildFlight(setup: FlightSetup): FlightLayout {
  const rng = new Rng(setup.seed);
  const world = emptyWorld();
  const from = SYSTEM_BY_ID[setup.from];
  const to = SYSTEM_BY_ID[setup.to];
  const L = routeLength(setup.from, setup.to, setup.tuning.routeScale ?? 1);
  const destY = L > 0 ? rng.range(-500, 500) : 0;
  const systems: SystemPlacement[] = [{ id: from.id, cx: 0, cy: 0 }];
  if (L > 0) systems.push({ id: to.id, cx: L, cy: destY });

  // Bodies.
  const bases: string[] = [];
  for (const sp of systems) {
    const sys = SYSTEM_BY_ID[sp.id];
    for (const bid of sys.bodies) {
      const def = BODY_BY_ID[bid];
      if (!def || def.radius <= 0) continue;
      const b = makeBody(def.id, sp.cx + def.offset[0], sp.cy + def.offset[1], def.radius, def.pull, def.landable, true);
      world.bodies.push(b);
      if (def.base) bases.push(def.id);
    }
  }

  // Bounds.
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const b of world.bodies) {
    minX = Math.min(minX, b.x - b.r);
    maxX = Math.max(maxX, b.x + b.r);
    minY = Math.min(minY, b.y - b.r);
    maxY = Math.max(maxY, b.y + b.r);
  }
  const pad = 900;
  world.bounds = { x0: minX - pad, y0: Math.min(minY, -900) - pad * 0.7, x1: maxX + pad, y1: Math.max(maxY, 900) + pad * 0.7 };

  // Comet tails point away from the Sun.
  const outward = L === 0 || to.order >= from.order;
  world.sunDirX = outward ? -1 : 1;
  world.sunDirY = 0;
  if (to.wind) {
    world.windX = 0;
    world.windY = to.wind * 0.5;
  }

  // Start position: just outside the launch body.
  const startDef = BODY_BY_ID[setup.startBody ?? from.main] ?? BODY_BY_ID[from.main];
  const startBody = world.bodies.find((b) => b.id === startDef.id) ?? world.bodies[0];
  const startX = startBody.x + startBody.r + 140;
  const startY = startBody.y;

  const keepOut = (x: number, y: number, extra: number): boolean => {
    if (Math.hypot(x - startX, y - startY) < 450) return true;
    for (const b of world.bodies) if (Math.hypot(x - b.x, y - b.y) < b.r + extra) return true;
    return false;
  };

  // --- Coins: fun trails along the trip and around bodies.
  const B = world.bounds;
  const pathY = (x: number) => (L > 0 ? (destY * Math.max(0, Math.min(1, x / L))) : 0);
  const addCoin = (x: number, y: number) => {
    if (!keepOut(x, y, 60)) world.coins.push({ x, y, alive: true, pulled: false, value: 1 });
  };
  const trailStart = L > 0 ? 500 : B.x0 + 300;
  const trailEnd = L > 0 ? L - 400 : B.x1 - 300;
  for (let x = trailStart; x < trailEnd; x += rng.range(420, 640)) {
    const y0 = pathY(x) + rng.range(-520, 520);
    const pattern = rng.int(0, 3);
    if (pattern === 0) {
      for (let i = 0; i < 6; i++) addCoin(x + i * 55, y0);
    } else if (pattern === 1) {
      for (let i = 0; i < 7; i++) addCoin(x + i * 50, y0 + Math.sin(i * 0.9) * 70);
    } else if (pattern === 2) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        addCoin(x + Math.cos(a) * 90, y0 + Math.sin(a) * 90);
      }
    } else {
      for (let i = 0; i < 5; i++) addCoin(x + i * 60, y0 - Math.abs(i - 2) * 50);
    }
  }
  // Coin rings around moons and small worlds.
  for (const b of world.bodies) {
    if (b.r > 200) continue;
    const n = 10;
    const rr = b.r + 120;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = b.x + Math.cos(a) * rr;
      const y = b.y + Math.sin(a) * rr;
      if (Math.hypot(x - startX, y - startY) > 200) world.coins.push({ x, y, alive: true, pulled: false, value: 1 });
    }
  }

  // --- Fuel cells: regular spacing so a careful pilot never runs dry.
  const fuelGap = 1200 * setup.tuning.fuelUse + 500;
  let up = true;
  for (let x = trailStart + 600; x < trailEnd; x += fuelGap) {
    const y = pathY(x) + (up ? -260 : 260) + rng.range(-120, 120);
    up = !up;
    if (!keepOut(x, y, 80)) world.fuels.push({ x, y, alive: true, pulled: false });
  }
  if (L === 0) {
    for (let i = 0; i < 4; i++) {
      const x = rng.range(B.x0 + 400, B.x1 - 400);
      const y = rng.range(B.y0 + 400, B.y1 - 400);
      if (!keepOut(x, y, 120)) world.fuels.push({ x, y, alive: true, pulled: false });
    }
  }

  // --- Asteroids.
  const hazard = L > 0 ? (from.asteroids + to.asteroids) / 2 : from.asteroids;
  const crossesBelt = L > 0 && Math.min(from.order, to.order) <= 4 && Math.max(from.order, to.order) >= 4;
  const area = (B.x1 - B.x0) * (B.y1 - B.y0);
  let count = Math.round((area / 1_000_000) * 2.2 * hazard * setup.tuning.asteroidDensity);
  if (crossesBelt || setup.to === 'belt' || setup.from === 'belt') count += Math.round(30 * setup.tuning.asteroidDensity);
  count = Math.min(count, 140);
  const beltX = crossesBelt && L > 0 ? (setup.to === 'belt' ? L * 0.6 : L * 0.5) : NaN;
  for (let i = 0; i < count; i++) {
    let x: number;
    let y: number;
    let tries = 0;
    do {
      if (!Number.isNaN(beltX) && i % 2 === 0) {
        x = beltX + rng.range(-900, 900);
        y = rng.range(B.y0 + 100, B.y1 - 100);
      } else {
        x = rng.range(B.x0 + 100, B.x1 - 100);
        y = rng.range(B.y0 + 100, B.y1 - 100);
      }
      tries++;
    } while (keepOut(x, y, 200) && tries < 20);
    if (tries >= 20) continue;
    const r = rng.range(22, 58);
    const sp = rng.range(10, 45) * setup.tuning.asteroidSpeed;
    const a = rng.range(0, Math.PI * 2);
    world.asteroids.push({ x, y, px: x, py: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r, rot: rng.range(0, 6.28), vr: rng.range(-0.6, 0.6), kind: rng.int(0, 5) });
  }

  // --- Comets: ride their tails for a speed boost.
  const cometCount = Math.max(1, Math.round(((L > 0 ? (from.comets + to.comets) / 2 : from.comets) * (1 + L / 6000)) * 1.5));
  for (let i = 0; i < cometCount; i++) {
    const x = rng.range(B.x0 + 600, B.x1 - 600);
    const y = rng.range(B.y0 + 300, B.y1 - 300);
    const sp = rng.range(160, 240);
    const dir = world.sunDirX > 0 ? -1 : 1;
    const ang = rng.range(-0.35, 0.35);
    world.comets.push({ x, y, px: x, py: y, vx: Math.cos(ang) * sp * dir, vy: Math.sin(ang) * sp, len: rng.range(600, 850), width: 70 });
  }

  // --- Mission extras.
  const ex = setup.extras ?? {};
  const bodyPos = (id: string): { x: number; y: number; r: number } => {
    const b = world.bodies.find((q) => q.id === id);
    if (b) return { x: b.x, y: b.y, r: b.r };
    const sys = systems.find((s) => s.id === id);
    return sys ? { x: sys.cx, y: sys.cy, r: 0 } : { x: startX + 600, y: startY, r: 0 };
  };
  if (ex.scanObjects) {
    const c = bodyPos(ex.scanObjects.around);
    for (let i = 0; i < ex.scanObjects.count; i++) {
      const a = (i / ex.scanObjects.count) * Math.PI * 2 + rng.range(-0.3, 0.3);
      const rr = c.r + ex.scanObjects.radius;
      world.bodies.push(makeBody(`${ex.scanObjects.prefix}:${i}`, c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr, 34, 0, false, true));
    }
  }
  if (ex.hauls) {
    const c = bodyPos(ex.hauls.around);
    for (let i = 0; i < ex.hauls.count; i++) {
      const a = rng.range(0, Math.PI * 2);
      const rr = c.r + ex.hauls.radius * rng.range(0.85, 1.15);
      world.hauls.push({ x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr * 0.35, alive: true, kind: ex.hauls.kind });
    }
  }
  if (ex.glimmers) {
    const c = bodyPos(ex.glimmers.around);
    for (let i = 0; i < ex.glimmers.count; i++) {
      const a = rng.range(0, Math.PI * 2);
      const rr = c.r + ex.glimmers.radius * rng.range(0.6, 1.3);
      const x = c.x + Math.cos(a) * rr;
      const y = c.y + Math.sin(a) * rr;
      world.glimmers.push({ x, y, baseX: x, baseY: y, alive: true, phase: rng.range(0, 6) });
    }
  }
  let courseStart: { x: number; y: number } | null = null;
  if (ex.course) {
    const course = COURSE_BY_ID[ex.course];
    if (course) {
      const sys = systems.find((s) => s.id === course.system) ?? systems[systems.length - 1];
      for (const [gx, gy] of course.gates) world.gates.push({ x: sys.cx + gx, y: sys.cy + gy, r: course.gateRadius, passed: false });
      courseStart = { x: sys.cx + course.start[0], y: sys.cy + course.start[1] };
      // Keep race lines clear of asteroids and coins clutter.
      world.asteroids = world.asteroids.filter((a) => !world.gates.some((g) => Math.hypot(a.x - g.x, a.y - g.y) < g.r + a.r + 160));
    }
  }
  let sticker: FlightLayout['sticker'] = null;
  if (ex.sticker) {
    const c = bodyPos(ex.sticker.near);
    const a = rng.range(0, Math.PI * 2);
    sticker = { id: ex.sticker.id, x: c.x + Math.cos(a) * (c.r + 420), y: c.y + Math.sin(a) * (c.r + 300) };
  }

  return { world, startX, startY, systems, bases, routeLength: L, sticker, courseStart };
}

/** Nearest base body to a point (Tuggy tows you there). */
export function nearestBase(layout: FlightLayout, x: number, y: number): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const id of layout.bases) {
    const b = layout.world.bodies.find((q) => q.id === id);
    if (!b) continue;
    const d = Math.hypot(b.x - x, b.y - y);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}
