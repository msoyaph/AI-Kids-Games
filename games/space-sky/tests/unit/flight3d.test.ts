import { describe, expect, it } from 'vitest';
import { STARTER_LOADOUT } from '../../src/data/parts';
import { makeEvents, resetEvents } from '../../src/systems/flight';
import {
  emptyWorld3, forward, landableNear3, makeBody3, makeShip3, scannableNear3, shipSpeed3, stepFlight3, TUNE3,
  type Steer3, type World3,
} from '../../src/systems/flight3d';
import { buildFlight } from '../../src/systems/flightWorld';
import { tuning } from '../../src/systems/difficulty';
import { flightParams } from '../../src/systems/rocketStats';
import { liftLayout, SLAB } from '../../src/systems/world3d';

const DT = 1 / 60;
const P = flightParams(STARTER_LOADOUT, 'normal');
const PE = flightParams(STARTER_LOADOUT, 'easy');
const T = TUNE3.normal;
const IDLE: Steer3 = { x: 0, y: 0, boost: false, boostPressed: false };

function run(world: World3, ship = makeShip3(0, 0, 0, 0, P), input: Steer3 = IDLE, seconds = 1, p = P, t = T) {
  const ev = makeEvents();
  const log = { coins: 0, fuel: 0, bumps: 0, sling: null as string | null, gates: [] as number[], boosted: false, comet: false };
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    resetEvents(ev);
    stepFlight3(ship, world, input, p, t, DT, ev);
    log.coins += ev.coins;
    log.fuel += ev.fuel;
    if (ev.bumped) log.bumps++;
    if (ev.slingshot) log.sling = ev.slingshot;
    if (ev.gate >= 0) log.gates.push(ev.gate);
    if (ev.boosted) log.boosted = true;
    if (ev.cometRide) log.comet = true;
    for (const v of [ship.x, ship.y, ship.h, ship.vx, ship.vy, ship.vh, ship.yaw, ship.pitch]) expect(Number.isFinite(v)).toBe(true);
  }
  return { ship, log };
}

describe('3D flight: moving and steering', () => {
  it('flies forward by itself at cruise speed', () => {
    const { ship } = run(emptyWorld3(), undefined, IDLE, 3);
    expect(ship.x).toBeGreaterThan(400);
    expect(Math.abs(ship.y)).toBeLessThan(1);
    expect(shipSpeed3(ship)).toBeGreaterThan(P.maxSpeed * T.cruise * 0.9);
    expect(shipSpeed3(ship)).toBeLessThanOrEqual(P.maxSpeed * 1.02);
  });

  it('turns right/left and climbs/dives with the stick, and levels out by itself', () => {
    const right = run(emptyWorld3(), undefined, { ...IDLE, x: 1 }, 0.6).ship;
    expect(right.yaw).toBeGreaterThan(0.5);
    expect(right.y).toBeGreaterThan(0);
    const up = run(emptyWorld3(), undefined, { ...IDLE, y: -1 }, 0.6).ship;
    expect(up.pitch).toBeGreaterThan(0.4);
    expect(up.h).toBeGreaterThan(20);
    run(emptyWorld3(), up, IDLE, 3);
    expect(Math.abs(up.pitch)).toBeLessThan(0.15);
  });

  it('never pitches past the limit and never rolls the camera horizon', () => {
    const { ship } = run(emptyWorld3(), undefined, { ...IDLE, y: -1 }, 5);
    expect(ship.pitch).toBeLessThanOrEqual(T.maxPitch + 1e-6);
    expect(Math.abs(ship.bank)).toBeLessThan(0.5);
  });

  it('burns a little fuel while cruising and coasts to a stop when empty', () => {
    const s = makeShip3(0, 0, 0, 0, P);
    run(emptyWorld3(), s, IDLE, 2);
    expect(s.fuel).toBeLessThan(P.maxFuel);
    expect(s.fuel).toBeGreaterThan(P.maxFuel - P.fuelPerSec * 3);
    s.fuel = 0;
    run(emptyWorld3(), s, IDLE, 8);
    expect(shipSpeed3(s)).toBeLessThan(P.maxSpeed * 0.1);
    expect(s.thrust).toBe(0);
  });

  it('boosts with the same fuel cost and cooldown as 2D', () => {
    const s = makeShip3(0, 0, 0, 0, P);
    run(emptyWorld3(), s, IDLE, 2);
    const before = s.fuel;
    const { log } = run(emptyWorld3(), s, { ...IDLE, boost: true, boostPressed: true }, 0.8);
    expect(log.boosted).toBe(true);
    expect(before - s.fuel).toBeGreaterThan(P.boostFuel * 0.9);
    expect(shipSpeed3(s)).toBeGreaterThan(P.maxSpeed * 1.1);
    const again = run(emptyWorld3(), s, { ...IDLE, boost: true, boostPressed: true }, 0.2);
    expect(again.log.boosted).toBe(false);
  });

  it('turns back at the edge of the play area', () => {
    const w = emptyWorld3();
    w.bounds = { x0: -500, y0: -500, x1: 500, y1: 500, h0: -300, h1: 300 };
    const { ship } = run(w, undefined, IDLE, 12);
    expect(Math.abs(ship.x)).toBeLessThan(1100);
    expect(Math.abs(ship.h)).toBeLessThan(700);
  });
});

describe('3D flight: things in space', () => {
  it('bumps asteroids gently: a little shield and fuel, and you end up outside the rock', () => {
    const w = emptyWorld3();
    w.asteroids.push({ x: 160, y: 0, h: 0, vx: 0, vy: 0, vh: 0, r: 40, rot: 0, vr: 0, kind: 0, px: 160, py: 0, ph: 0 });
    const s = makeShip3(0, 0, 0, 0, P);
    s.vx = 300;
    const { log } = run(w, s, IDLE, 1.2);
    expect(log.bumps).toBe(1);
    expect(s.shield).toBe(P.maxShield - P.bumpShield);
    const a = w.asteroids[0];
    expect(Math.hypot(s.x - a.x, s.y - a.y, s.h - a.h)).toBeGreaterThan(a.r);
  });

  it('collects coins with the magnet and fuel cells, in 3D', () => {
    const w = emptyWorld3();
    w.coins.push({ x: 200, y: 0, h: P.magnetRadius - 10, alive: true, pulled: false, value: 1 });
    w.coins.push({ x: 200, y: 0, h: 5000, alive: true, pulled: false, value: 1 });
    w.fuels.push({ x: 300, y: 0, h: 0, alive: true, pulled: false });
    const s = makeShip3(0, 0, 0, 0, P);
    s.fuel = 30;
    const { log } = run(w, s, IDLE, 1.6);
    expect(log.coins).toBe(1);
    expect(log.fuel).toBe(1);
    expect(s.fuel).toBeGreaterThan(30);
  });

  it('feels planet gravity, never goes inside a planet, and can land nearby', () => {
    const w = emptyWorld3();
    w.bodies.push(makeBody3('mars', 600, 0, 0, 170, 0.8, true));
    const s = makeShip3(0, 0, 0, 0, P);
    for (let i = 0; i < 300; i++) {
      run(w, s, IDLE, DT);
      const b = w.bodies[0];
      expect(Math.hypot(s.x - b.x, s.y - b.y, s.h - b.h)).toBeGreaterThan(b.r);
    }
    s.x = 600 - 170 - 100;
    s.y = 0;
    s.h = 0;
    expect(landableNear3(s, w)?.id).toBe('mars');
    w.bodies.push(makeBody3('phobos', 0, 3000, 0, 34, 0, false, true));
    s.x = 0;
    s.y = 3000 - 34 - 200;
    expect(scannableNear3(s, w)?.id).toBe('phobos');
  });

  it('slingshots around a big planet when you swing around it', () => {
    const w = emptyWorld3();
    w.bodies.push(makeBody3('jupiter', 0, 0, 0, 200, 1.2, false));
    // Start beside Jupiter flying past it, and keep turning around it.
    const s = makeShip3(0, -340, 0, 0, P);
    s.vx = P.maxSpeed * 0.8;
    const a = run(w, s, { ...IDLE, x: 0.62 }, 2.6);
    const b = run(w, s, IDLE, 4);
    expect(a.log.sling ?? b.log.sling).toBe('jupiter');
  });

  it('rides comet tails (which point away from the Sun)', () => {
    const w = emptyWorld3();
    w.sunX = -1;
    w.sunY = 0;
    w.sunH = 0;
    w.comets.push({ x: 0, y: 0, h: 0, vx: 0, vy: 0, len: 800, width: 70, px: 0, py: 0 });
    const s = makeShip3(300, 10, 0, Math.PI / 2, P);
    const { log } = run(w, s, IDLE, 0.1);
    expect(log.comet).toBe(true);
  });

  it('counts hoops only in order, and only when you fly through them', () => {
    const w = emptyWorld3();
    w.gates.push({ x: 600, y: 0, h: 0, r: 100, nx: 1, ny: 0, nh: 0, passed: false, side: -1 });
    w.gates.push({ x: 1400, y: 0, h: 300, r: 100, nx: 1, ny: 0, nh: 0, passed: false, side: -1 });
    const { log, ship } = run(w, undefined, IDLE, 5);
    expect(log.gates).toEqual([0]);
    expect(ship.x).toBeGreaterThan(1400);
    // Second hoop is up high: going straight under it does not count.
    expect(w.nextGate).toBe(1);
  });

  it('Easy aim assist turns you toward the objective when you let go', () => {
    const w = emptyWorld3();
    w.hasTarget = true;
    w.targetX = -2000;
    w.targetY = 0;
    w.targetH = 300;
    w.targetR = 0;
    const s = makeShip3(0, 0, 0, 0, PE);
    run(w, s, IDLE, 6, PE, TUNE3.easy);
    const f = forward(s, { x: 0, y: 0, h: 0 });
    expect(f.x).toBeLessThan(-0.5);
  });
});

describe('lifting a 2D layout into 3D', () => {
  const setup = (seed: string, course?: string) => buildFlight({ from: 'earth', to: 'mars', seed, tuning: tuning('normal'), extras: course ? { course } : {} });
  it('is deterministic and keeps everything inside the flying slab', () => {
    const a = liftLayout(setup('x'), 'x');
    const b = liftLayout(setup('x'), 'x');
    expect(a.world.coins.map((c) => c.h)).toEqual(b.world.coins.map((c) => c.h));
    for (const c of a.world.coins) expect(Math.abs(c.h)).toBeLessThan(SLAB);
    for (const r of a.world.asteroids) expect(Math.abs(r.h)).toBeLessThan(SLAB);
    expect(a.world.coins.length).toBeGreaterThan(40);
    expect(a.routeLength).toBeGreaterThan(5000);
  });
  it('gives race hoops heights and a facing direction', () => {
    const l = buildFlight({ from: 'saturn', to: 'saturn', seed: 'r', tuning: tuning('normal'), extras: { course: 'race_ripple' } });
    const a = liftLayout(l, 'r', { course: 'race_ripple' });
    expect(a.world.gates.length).toBe(11);
    expect(a.courseStart).not.toBeNull();
    for (const g of a.world.gates) expect(Math.hypot(g.nx, g.ny, g.nh)).toBeCloseTo(1, 5);
    expect(new Set(a.world.gates.map((g) => Math.sign(g.h))).size).toBeGreaterThan(1);
  });
  it('lays Saturn ring ice flat in the ring plane', () => {
    const extras = { hauls: { kind: 'ice', count: 6, around: 'saturn', radius: 260 } };
    const l = buildFlight({ from: 'saturn', to: 'saturn', seed: 'h', tuning: tuning('normal'), extras });
    const a = liftLayout(l, 'h', extras);
    const sat = a.world.bodies.find((b) => b.id === 'saturn')!;
    for (const it of a.world.hauls) {
      expect(Math.abs(it.h - sat.h)).toBeLessThan(20);
      const d = Math.hypot(it.x - sat.x, it.y - sat.y);
      expect(d).toBeGreaterThan(sat.r * 1.4);
    }
  });
});
