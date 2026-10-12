import { Rng } from '../core/rng';
import { BODY_BY_ID } from '../data/bodies';
import { COURSE_BY_ID } from '../data/races';
import type { FlightExtras, FlightLayout, SystemPlacement } from './flightWorld';
import { emptyWorld3, makeBody3, type Body3, type World3 } from './flight3d';

/**
 * Lifts a 2D flight layout (flightWorld.buildFlight: same seeds, route lengths, coin trails, fuel spacing,
 * gates, bases) into 3D: the 2D map becomes the (x, y) plane and everything gets a height `h`.
 * Deterministic for a given seed.
 */
export interface Layout3 {
  world: World3;
  startX: number;
  startY: number;
  startH: number;
  startYaw: number;
  systems: SystemPlacement[];
  bases: string[];
  routeLength: number;
  sticker: { id: string; x: number; y: number; h: number } | null;
  courseStart: { x: number; y: number; h: number; yaw: number } | null;
}

/** Half-height of the flying slab (how far up/down you can go). */
export const SLAB = 900;

export function liftLayout(l: FlightLayout, seed: string, extras: FlightExtras = {}): Layout3 {
  const rng = new Rng(`${seed}:3d`);
  const w = emptyWorld3();
  const src = l.world;
  const s1 = rng.range(0, 6.28);
  const s2 = rng.range(0, 6.28);

  // Bodies: main bodies sit on the plane; moons and small objects float above or below it.
  const mains = new Set<string>();
  for (const sp of l.systems) {
    const sysMain = src.bodies.find((b) => Math.abs(b.x - sp.cx) < 1 && Math.abs(b.y - sp.cy) < 1);
    if (sysMain) mains.add(sysMain.id);
  }
  for (const b of src.bodies) {
    const real = !!BODY_BY_ID[b.id];
    let h = 0;
    if (!mains.has(b.id)) h = real ? rng.range(-220, 220) : rng.range(-260, 260);
    w.bodies.push(makeBody3(b.id, b.x, b.y, h, b.r, b.pull, b.landable, b.scannable));
  }
  const near = (x: number, y: number): Body3 | null => {
    let best: Body3 | null = null;
    let bd = Infinity;
    for (const b of w.bodies) {
      const d = Math.hypot(x - b.x, y - b.y) - b.r;
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    return best && bd < 420 ? best : null;
  };
  /** Smooth height field: coin trails become gentle 3D waves; things near a body share its height. */
  const field = (x: number, y: number): number => {
    let h = 230 * Math.sin(x * 0.0019 + s1) + 140 * Math.sin(y * 0.0027 + s2);
    const b = near(x, y);
    if (b) {
      const d = Math.hypot(x - b.x, y - b.y) - b.r;
      const k = Math.max(0, Math.min(1, 1 - d / 420));
      h = h * (1 - k) + b.h * k;
    }
    return h;
  };

  for (const c of src.coins) w.coins.push({ x: c.x, y: c.y, h: field(c.x, c.y), alive: c.alive, pulled: false, value: c.value });
  for (const f of src.fuels) w.fuels.push({ x: f.x, y: f.y, h: field(f.x, f.y) + 40, alive: f.alive, pulled: false });
  for (const a of src.asteroids) {
    w.asteroids.push({ x: a.x, y: a.y, h: rng.range(-650, 650), vx: a.vx, vy: a.vy, vh: rng.range(-8, 8), r: a.r, rot: a.rot, vr: a.vr, kind: a.kind, px: a.x, py: a.y, ph: 0 });
  }
  for (const a of w.asteroids) a.ph = a.h;
  for (const c of src.comets) w.comets.push({ x: c.x, y: c.y, h: rng.range(-250, 250), vx: c.vx, vy: c.vy, len: c.len, width: c.width, px: c.x, py: c.y });

  // Ring ice (Saturn): the 2D layout squashed the ring into an ellipse; in 3D it lies flat in the ring plane.
  const haulAround = extras.hauls ? w.bodies.find((b) => b.id === extras.hauls!.around) : null;
  const ringed = haulAround && BODY_BY_ID[haulAround.id]?.look.rings;
  for (const it of src.hauls) {
    const x = it.x;
    let y = it.y;
    let h = field(x, y);
    if (haulAround) {
      if (ringed) {
        y = haulAround.y + (it.y - haulAround.y) / 0.35;
        h = haulAround.h + rng.range(-12, 12);
      } else h = haulAround.h + rng.range(-120, 120);
    }
    w.hauls.push({ x, y, h, alive: it.alive, kind: it.kind });
  }
  for (const g of src.glimmers) {
    const h = field(g.x, g.y) + rng.range(-120, 120);
    w.glimmers.push({ x: g.x, y: g.y, h, alive: g.alive, baseX: g.baseX, baseY: g.baseY, baseH: h, phase: g.phase });
  }

  // Gates: hoops facing the way you fly through them.
  let courseStart: Layout3['courseStart'] = null;
  const course = extras.course ? COURSE_BY_ID[extras.course] : undefined;
  if (src.gates.length) {
    const heights = course?.heights ?? src.gates.map((_, i) => 90 * Math.sin(i * 0.9));
    const sh = course?.startH ?? 0;
    const start = l.courseStart ?? { x: l.startX, y: l.startY };
    let px = start.x;
    let py = start.y;
    let ph = sh;
    src.gates.forEach((g, i) => {
      const h = heights[i] ?? 0;
      let nx = g.x - px;
      let ny = g.y - py;
      let nh = h - ph;
      const len = Math.hypot(nx, ny, nh) || 1;
      nx /= len;
      ny /= len;
      nh /= len;
      w.gates.push({ x: g.x, y: g.y, h, r: g.r, nx, ny, nh, passed: false, side: -1 });
      px = g.x;
      py = g.y;
      ph = h;
    });
    if (l.courseStart) {
      const g0 = w.gates[0];
      courseStart = { x: l.courseStart.x, y: l.courseStart.y, h: sh, yaw: Math.atan2(g0.y - l.courseStart.y, g0.x - l.courseStart.x) };
    }
  }

  // Play area: the 2D bounds plus a slab above and below the plane.
  w.bounds = { x0: src.bounds.x0, y0: src.bounds.y0, x1: src.bounds.x1, y1: src.bounds.y1, h0: -SLAB, h1: SLAB };
  // The Sun is far to one side (left or right of the route) and a little above.
  const sl = Math.hypot(src.sunDirX, src.sunDirY, 0.18) || 1;
  w.sunX = src.sunDirX / sl;
  w.sunY = src.sunDirY / sl;
  w.sunH = 0.18 / sl;
  w.windX = src.windX;
  w.windY = src.windY;

  let sticker: Layout3['sticker'] = null;
  if (l.sticker) sticker = { id: l.sticker.id, x: l.sticker.x, y: l.sticker.y, h: field(l.sticker.x, l.sticker.y) + 60 };

  return {
    world: w,
    startX: l.startX,
    startY: l.startY,
    startH: 0,
    startYaw: 0,
    systems: l.systems,
    bases: l.bases,
    routeLength: l.routeLength,
    sticker,
    courseStart,
  };
}

/** Nearest base body to a point (Tuggy tows you there). */
export function nearestBase3(l: Layout3, x: number, y: number, h: number): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const id of l.bases) {
    const b = l.world.bodies.find((q) => q.id === id);
    if (!b) continue;
    const d = Math.hypot(b.x - x, b.y - y, b.h - h);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}
