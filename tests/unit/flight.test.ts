import { describe, expect, it } from 'vitest';
import { STARTER_LOADOUT } from '../../src/data/parts';
import {
  emptyWorld, landableNear, makeBody, makeEvents, makeShip, resetEvents, shipSpeed, stepFlight,
  type FlightWorld, type SteerInput,
} from '../../src/systems/flight';
import { buildFlight, nearestBase, routeLength } from '../../src/systems/flightWorld';
import { tuning } from '../../src/systems/difficulty';
import { flightParams, statStars, toStars } from '../../src/systems/rocketStats';

const DT = 1 / 60;
const NONE: SteerInput = { x: 0, y: 0, boost: false, boostPressed: false, action: false };
const RIGHT: SteerInput = { x: 1, y: 0, boost: false, boostPressed: false, action: false };

function run(world: FlightWorld, ship: ReturnType<typeof makeShip>, input: SteerInput, seconds: number, p = flightParams(STARTER_LOADOUT, 'normal')) {
  const ev = makeEvents();
  const total = makeEvents();
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    resetEvents(ev);
    stepFlight(ship, world, input, p, DT, ev);
    total.coins += ev.coins;
    total.fuel += ev.fuel;
    total.bumped ||= ev.bumped;
    total.cometRide ||= ev.cometRide;
    total.slingshot ??= ev.slingshot;
    if (ev.gate >= 0) total.gate = ev.gate;
  }
  return total;
}

describe('rocket stats', () => {
  it('turns stat totals into 1-5 stars', () => {
    expect(toStars(0)).toBe(1);
    expect(toStars(2)).toBe(2);
    expect(toStars(99)).toBe(5);
    const s = statStars(STARTER_LOADOUT);
    expect(s.speed).toBeGreaterThanOrEqual(1);
    expect(s.fuel).toBeGreaterThanOrEqual(1);
  });

  it('better parts make a faster rocket', () => {
    const base = flightParams(STARTER_LOADOUT, 'normal');
    const fast = flightParams({ ...STARTER_LOADOUT, engine: 'eng_turbo', nose: 'nose_needle' }, 'normal');
    expect(fast.maxSpeed).toBeGreaterThan(base.maxSpeed);
  });

  it('Easy uses less fuel and bumps hurt less', () => {
    const e = flightParams(STARTER_LOADOUT, 'easy');
    const n = flightParams(STARTER_LOADOUT, 'normal');
    expect(e.fuelPerSec).toBeLessThan(n.fuelPerSec);
    expect(e.bumpShield).toBeLessThan(n.bumpShield);
    expect(e.magnetRadius).toBeGreaterThan(n.magnetRadius);
  });
});

describe('flight physics', () => {
  it('accelerates toward the stick and respects the speed limit', () => {
    const p = flightParams(STARTER_LOADOUT, 'normal');
    const w = emptyWorld();
    const ship = makeShip(0, 0, p);
    run(w, ship, RIGHT, 4, p);
    expect(ship.vx).toBeGreaterThan(p.maxSpeed * 0.8);
    expect(shipSpeed(ship)).toBeLessThanOrEqual(p.maxSpeed * 1.02);
    expect(Math.abs(ship.vy)).toBeLessThan(1);
  });

  it('drag slows the rocket down when you let go', () => {
    const p = flightParams(STARTER_LOADOUT, 'normal');
    const w = emptyWorld();
    const ship = makeShip(0, 0, p);
    run(w, ship, RIGHT, 2, p);
    const fast = shipSpeed(ship);
    run(w, ship, NONE, 3, p);
    expect(shipSpeed(ship)).toBeLessThan(fast * 0.2);
  });

  it('uses fuel only while thrusting and cannot thrust when empty', () => {
    const p = flightParams(STARTER_LOADOUT, 'normal');
    const w = emptyWorld();
    const ship = makeShip(0, 0, p);
    run(w, ship, NONE, 2, p);
    expect(ship.fuel).toBe(p.maxFuel);
    run(w, ship, RIGHT, 2, p);
    expect(ship.fuel).toBeLessThan(p.maxFuel);
    ship.fuel = 0;
    ship.vx = ship.vy = 0;
    run(w, ship, RIGHT, 1, p);
    expect(shipSpeed(ship)).toBeLessThan(1);
  });

  it('boost costs fuel, goes faster than normal max and has a cooldown', () => {
    const p = flightParams(STARTER_LOADOUT, 'normal');
    const w = emptyWorld();
    const ship = makeShip(0, 0, p);
    run(w, ship, RIGHT, 3, p);
    const before = ship.fuel;
    const ev = makeEvents();
    stepFlight(ship, w, { ...RIGHT, boost: true, boostPressed: true }, p, DT, ev);
    expect(ev.boosted).toBe(true);
    expect(ship.fuel).toBeLessThan(before - p.boostFuel + 0.5);
    run(w, ship, { ...RIGHT, boost: true }, 0.8, p);
    expect(shipSpeed(ship)).toBeGreaterThan(p.maxSpeed * 1.1);
    resetEvents(ev);
    stepFlight(ship, w, { ...RIGHT, boostPressed: true }, p, DT, ev);
    expect(ev.boosted).toBe(false);
  });

  it('asteroid bumps are soft: small shield and fuel loss, then a moment of safety', () => {
    const p = flightParams(STARTER_LOADOUT, 'normal');
    const w = emptyWorld();
    w.asteroids.push({ x: 120, y: 0, px: 120, py: 0, vx: 0, vy: 0, r: 40, rot: 0, vr: 0, kind: 0 });
    const ship = makeShip(0, 0, p);
    const ev = run(w, ship, RIGHT, 1.0, p);
    expect(ev.bumped).toBe(true);
    expect(ship.shield).toBe(p.maxShield - p.bumpShield);
    expect(ship.fuel).toBeLessThan(p.maxFuel);
    // Ship never ends up inside the rock.
    const a = w.asteroids[0];
    expect(Math.hypot(ship.x - a.x, ship.y - a.y)).toBeGreaterThan(a.r);
  });

  it('collects coins with the magnet and refuels from fuel cells', () => {
    const p = flightParams(STARTER_LOADOUT, 'normal');
    const w = emptyWorld();
    w.coins.push({ x: 0, y: p.magnetRadius - 5, alive: true, pulled: false, value: 1 });
    w.coins.push({ x: 0, y: -5000, alive: true, pulled: false, value: 1 });
    w.fuels.push({ x: 60, y: 0, alive: true, pulled: false });
    const ship = makeShip(0, 0, p);
    ship.fuel = 10;
    const ev = run(w, ship, NONE, 1, p);
    expect(ev.coins).toBe(1);
    expect(w.coins[1].alive).toBe(true);
    expect(ev.fuel).toBe(1);
    expect(ship.fuel).toBeGreaterThan(10);
  });

  it('gravity pulls toward planets but you cannot crash into them', () => {
    const p = flightParams(STARTER_LOADOUT, 'normal');
    const w = emptyWorld();
    w.bodies.push(makeBody('mars', 0, 0, 170, 0.8, true));
    const ship = makeShip(400, 0, p);
    run(w, ship, NONE, 0.3, p);
    expect(ship.vx).toBeLessThan(0);
    run(w, ship, NONE, 5, p);
    expect(Math.hypot(ship.x, ship.y)).toBeGreaterThanOrEqual(170);
    expect(landableNear(ship, w)?.id).toBe('mars');
  });

  it('a fast swoop close past a big planet gives a slingshot boost', () => {
    const p = flightParams(STARTER_LOADOUT, 'normal');
    const w = emptyWorld();
    w.bodies.push(makeBody('jupiter', 0, 0, 200, 1.2, false));
    const ship = makeShip(-700, 330, p);
    ship.vx = p.maxSpeed;
    const ev = run(w, ship, RIGHT, 4, p);
    expect(ev.slingshot).toBe('jupiter');
  });

  it('flying past far away is not a slingshot', () => {
    const p = flightParams(STARTER_LOADOUT, 'normal');
    const w = emptyWorld();
    w.bodies.push(makeBody('jupiter', 0, 0, 200, 1.2, false));
    const ship = makeShip(-700, 480, p);
    ship.vx = p.maxSpeed;
    const ev = run(w, ship, { x: 1, y: 0.15, boost: false, boostPressed: false, action: false }, 4, p);
    expect(ev.slingshot).toBeNull();
  });

  it('riding inside a comet tail gives a comet ride', () => {
    const p = flightParams(STARTER_LOADOUT, 'normal');
    const w = emptyWorld();
    w.sunDirX = -1;
    // Tail points away from the Sun (+x), so a ship at x=+300 is inside the tail.
    w.comets.push({ x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, len: 800, width: 70 });
    const ship = makeShip(300, 10, p);
    const ev = run(w, ship, NONE, 0.1, p);
    expect(ev.cometRide).toBe(true);
    expect(ship.cometTime).toBeGreaterThan(0);
  });

  it('gates count only in order', () => {
    const p = flightParams(STARTER_LOADOUT, 'normal');
    const w = emptyWorld();
    w.gates.push({ x: 600, y: 0, r: 100, passed: false }, { x: 200, y: 0, r: 100, passed: false });
    const ship = makeShip(0, 0, p);
    run(w, ship, RIGHT, 0.6, p);
    expect(w.gates[1].passed).toBe(false);
    run(w, ship, RIGHT, 2, p);
    expect(w.gates[0].passed).toBe(true);
    expect(w.nextGate).toBe(1);
  });
});

describe('flight world generation', () => {
  const t = tuning('normal');
  it('is deterministic for a seed', () => {
    const a = buildFlight({ from: 'earth', to: 'mars', seed: 'x', tuning: t });
    const b = buildFlight({ from: 'earth', to: 'mars', seed: 'x', tuning: t });
    expect(a.world.asteroids.map((q) => q.x)).toEqual(b.world.asteroids.map((q) => q.x));
    expect(a.world.coins.length).toBe(b.world.coins.length);
  });

  it('keeps the launch area clear and places fuel along the way', () => {
    const l = buildFlight({ from: 'earth', to: 'jupiter', seed: 'y', tuning: t });
    for (const a of l.world.asteroids) expect(Math.hypot(a.x - l.startX, a.y - l.startY)).toBeGreaterThan(400);
    expect(l.world.fuels.length).toBeGreaterThan(3);
    expect(l.world.coins.length).toBeGreaterThan(40);
    expect(l.routeLength).toBe(routeLength('earth', 'jupiter'));
  });

  it('Easy has fewer and slower asteroids', () => {
    const e = buildFlight({ from: 'mars', to: 'belt', seed: 'z', tuning: tuning('easy') });
    const n = buildFlight({ from: 'mars', to: 'belt', seed: 'z', tuning: t });
    expect(e.world.asteroids.length).toBeLessThan(n.world.asteroids.length);
  });

  it('finds the nearest base for Tuggy', () => {
    const l = buildFlight({ from: 'earth', to: 'mars', seed: 'b', tuning: t });
    expect(nearestBase(l, l.startX, l.startY)).toBe('earth');
    const mars = l.world.bodies.find((q) => q.id === 'mars')!;
    expect(nearestBase(l, mars.x - 100, mars.y)).toBe('mars');
  });

  it('places mission extras: gates, scan objects, glimmers', () => {
    const l = buildFlight({ from: 'earth', to: 'earth', seed: 'c', tuning: t, extras: { course: 'training', scanObjects: { prefix: 'sat', count: 3, around: 'earth', radius: 300 }, glimmers: { count: 4, around: 'moon', radius: 200 } } });
    expect(l.world.gates.length).toBeGreaterThan(3);
    expect(l.world.bodies.filter((b) => b.id.startsWith('sat:')).length).toBe(3);
    expect(l.world.glimmers.length).toBe(4);
    expect(l.courseStart).not.toBeNull();
  });
});
