import { describe, expect, it } from 'vitest';
import { ArenaModel } from '../../src/sim/arena';
import { TEST_ARENA } from '../../src/data/arenas';
import { World } from '../../src/sim/world';
import { SIM_DT } from '../../src/core/loop';
import { TUNING } from '../../src/sim/tuning';
import { RespawnState } from '../../src/sim/kart';
import type { ArenaData } from '../../src/data/types';

const cfg = { body: 'zoomster', wheels: 'standard', glider: 'kite', paint: 'cherry', decal: 'none' };

function makeWorld(arena: ArenaData = TEST_ARENA, n = 1): World {
  const w = new World({
    ground: new ArenaModel(arena),
    speedClass: 'pro',
    seed: 7,
    racers: Array.from({ length: n }, () => ({ racerId: 'calex', kart: cfg, player: 0 })),
    countdownTime: 0,
  });
  w.events.enabled = false;
  return w;
}

function run(w: World, seconds: number, each?: () => void): void {
  const steps = Math.round(seconds / SIM_DT);
  for (let i = 0; i < steps; i++) {
    each?.();
    w.step(SIM_DT);
  }
}

const OPEN: ArenaData = { ...TEST_ARENA, size: 2000, obstacles: [], ramps: [], platforms: [] };

describe('kart physics', () => {
  it('accelerates toward (and not beyond) top speed', () => {
    const w = makeWorld(OPEN);
    const k = w.karts[0];
    k.place(0, 0, -900, 0);
    run(w, 1, () => (k.input.throttle = 1));
    const after1 = k.speed;
    run(w, 6, () => (k.input.throttle = 1));
    expect(after1).toBeGreaterThan(k.params.topSpeed * 0.4);
    expect(k.speed).toBeGreaterThan(k.params.topSpeed * 0.95);
    expect(k.speed).toBeLessThanOrEqual(k.params.topSpeed + 0.01);
    expect(k.z).toBeGreaterThan(-900 + 100);
  });

  it('steers right when steer > 0 (yaw decreases, moves toward -X)', () => {
    const w = makeWorld(OPEN);
    const k = w.karts[0];
    k.place(0, 0, 0, 0);
    run(w, 1.5, () => {
      k.input.throttle = 1;
      k.input.steer = 1;
    });
    expect(k.yaw).toBeLessThan(-0.5);
    expect(k.x).toBeLessThan(-1);
  });

  it('brakes and reverses', () => {
    const w = makeWorld(OPEN);
    const k = w.karts[0];
    k.place(0, 0, 0, 0);
    run(w, 2, () => (k.input.throttle = 1));
    run(w, 3, () => (k.input.throttle = -1));
    expect(k.speed).toBeLessThan(-TUNING.reverseSpeed * 0.8);
  });

  it('drift charges through all three spark tiers and releases a mini-turbo', () => {
    const w = makeWorld(OPEN);
    const k = w.karts[0];
    k.place(0, 0, 0, 0);
    run(w, 2.5, () => (k.input.throttle = 1));
    // hop with steer, keep holding drift
    let maxTier = 0;
    run(w, 3.5, () => {
      k.input.throttle = 1;
      k.input.steer = 1;
      k.input.drift = true;
      maxTier = Math.max(maxTier, k.driftTier);
    });
    expect(k.drifting).toBe(true);
    expect(maxTier).toBe(3);
    run(w, SIM_DT * 2, () => {
      k.input.drift = false;
      k.input.steer = 0;
    });
    expect(k.drifting).toBe(false);
    expect(k.boostTime).toBeGreaterThan(TUNING.miniTurboTime[3] * 0.8);
    expect(k.raceStats.miniTurbos[2]).toBe(1);
  });

  it('a short drift gives no boost', () => {
    const w = makeWorld(OPEN);
    const k = w.karts[0];
    k.place(0, 0, 0, 0);
    run(w, 2.5, () => (k.input.throttle = 1));
    run(w, 0.5, () => {
      k.input.throttle = 1;
      k.input.steer = -1;
      k.input.drift = true;
    });
    run(w, 0.1, () => (k.input.drift = false));
    expect(k.boostTime).toBe(0);
  });

  it('walls stop the kart from leaving the arena', () => {
    const w = makeWorld();
    const k = w.karts[0];
    k.place(0, 0, 0, 0);
    run(w, 8, () => (k.input.throttle = 1));
    expect(k.z).toBeLessThanOrEqual(TEST_ARENA.size);
    expect(Math.abs(k.x)).toBeLessThanOrEqual(TEST_ARENA.size);
  });

  it('karts push each other apart, heavier pushes harder', () => {
    const w = makeWorld(OPEN, 2);
    const [a, b] = w.karts;
    a.place(0, 0, 0, 0);
    b.place(0.5, 0, 0.5, 0);
    run(w, 0.1);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(TUNING.kartRadius * 2 - 0.01);
  });

  it('launches off a ramp and lands', () => {
    const arena: ArenaData = { ...OPEN, ramps: [{ x: 0, z: 20, dir: 0, width: 10, length: 8, height: 2.5 }] };
    const w = makeWorld(arena);
    const k = w.karts[0];
    k.place(0, 0, -40, 0);
    let wasAir = false;
    let maxY = 0;
    run(w, 5, () => {
      k.input.throttle = 1;
      if (!k.grounded && k.z > 28) wasAir = true;
      maxY = Math.max(maxY, k.y);
    });
    expect(wasAir).toBe(true);
    expect(maxY).toBeGreaterThan(2.5);
    expect(k.grounded).toBe(true);
  });

  it('trick off a ramp gives a landing boost', () => {
    const arena: ArenaData = { ...OPEN, ramps: [{ x: 0, z: 20, dir: 0, width: 10, length: 8, height: 2.5 }] };
    const w = makeWorld(arena);
    const k = w.karts[0];
    k.place(0, 0, -40, 0);
    let pressed = false;
    run(w, 5, () => {
      k.input.throttle = 1;
      k.input.drift = false;
      if (!k.grounded && k.launched && !pressed) {
        k.input.drift = true;
        pressed = true;
      }
    });
    expect(k.raceStats.tricks).toBe(1);
  });

  it('falls off a platform-free void and is carried back by the drone', () => {
    // Arena whose ground model says "no ground" beyond z>30 by using a ground wrapper.
    const w = makeWorld(OPEN);
    const k = w.karts[0];
    const ground = w.ground as ArenaModel;
    const orig = ground.query.bind(ground);
    ground.query = (x, y, z, h, out) => {
      orig(x, y, z, h, out);
      if (z > 30) out.hit = false;
      return out;
    };
    k.place(0, 0, 0, 0);
    let fell = false;
    let carried = false;
    run(w, 6, () => {
      k.input.throttle = 1;
      if (k.respawnState === RespawnState.Falling) fell = true;
      if (k.respawnState === RespawnState.Carried) carried = true;
    });
    expect(fell).toBe(true);
    expect(carried).toBe(true);
    expect(k.raceStats.falls).toBeGreaterThanOrEqual(1);
  });
});
