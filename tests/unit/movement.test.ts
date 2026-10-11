import { describe, expect, it } from 'vitest';
import { DT, MOVE } from '../../src/config/balance';
import { updatePlayer, walkSpeed } from '../../src/sim/player';
import { createWorld, emptyInput, type SimInput, type World } from '../../src/sim/world';

function flatWorld(): World {
  const w = createWorld({ seed: 42, characterId: 'thea' });
  // Replace terrain height with a flat plane for deterministic physics checks.
  const t = w.terrain as unknown as { height: (x: number, z: number) => number; gradient: (x: number, z: number, o: Float32Array) => void; resolveColliders: (x: number, z: number, r: number, o: Float32Array) => boolean };
  t.height = () => 0;
  t.gradient = (_x, _z, o) => {
    o[0] = 0;
    o[1] = 0;
  };
  t.resolveColliders = (x, z, _r, o) => {
    o[0] = x;
    o[1] = z;
    return false;
  };
  w.player.y = 0;
  return w;
}

function run(w: World, input: SimInput, seconds: number): void {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) {
    updatePlayer(w, input);
    input.jump = false;
  }
}

const speed = (w: World): number => Math.hypot(w.player.vx, w.player.vz);

describe('player movement', () => {
  it('accelerates to walk speed and stops with friction', () => {
    const w = flatWorld();
    const input = { ...emptyInput(), moveZ: 1 };
    run(w, input, 1);
    expect(speed(w)).toBeCloseTo(walkSpeed(w), 1);
    run(w, emptyInput(), 1);
    expect(speed(w)).toBeLessThan(0.01);
  });

  it('slide start gives a speed boost above walking', () => {
    const w = flatWorld();
    const input = { ...emptyInput(), moveZ: 1 };
    run(w, input, 1);
    const walk = speed(w);
    input.slide = true;
    run(w, input, DT);
    expect(w.player.sliding).toBe(true);
    expect(speed(w)).toBeGreaterThan(walk + 2);
  });

  it('jump leaves the ground, lands again, and preserves horizontal momentum', () => {
    const w = flatWorld();
    const input = { ...emptyInput(), moveZ: 1, slide: true };
    run(w, input, 0.5);
    const before = speed(w);
    input.jump = true;
    run(w, input, DT);
    expect(w.player.onGround).toBe(false);
    expect(w.player.vy).toBeGreaterThan(0);
    run(w, input, 0.2);
    // air has no friction: speed preserved (slide-jump even adds a little)
    expect(speed(w)).toBeGreaterThanOrEqual(before - 0.5);
    run(w, input, 1.5);
    expect(w.player.onGround).toBe(true);
    expect(w.player.y).toBeCloseTo(0, 3);
  });

  it('spamming slide cannot accelerate forever on flat ground', () => {
    const w = flatWorld();
    const input = { ...emptyInput(), moveZ: 1 };
    for (let k = 0; k < 40; k++) {
      input.slide = true;
      run(w, input, 0.3);
      input.slide = false;
      run(w, input, 0.05);
    }
    expect(speed(w)).toBeLessThan(walkSpeed(w) * 2.5);
  });

  it('never exceeds the global max speed', () => {
    const w = flatWorld();
    w.player.vx = 100;
    run(w, { ...emptyInput(), moveX: 1 }, DT);
    expect(speed(w)).toBeLessThanOrEqual(MOVE.maxSpeed + 1e-6);
  });

  it('a kicker ramp launches a fast player into the air', () => {
    const w = flatWorld();
    // ramp along +z from z=0..8 rising to 2.5, then a drop back to 0
    const t = w.terrain as unknown as { height: (x: number, z: number) => number };
    t.height = (_x, z) => (z > 0 && z < 8 ? (z / 8) * 2.5 : 0);
    w.player.z = -6;
    w.player.vz = 18;
    const input = { ...emptyInput(), moveZ: 1, slide: true };
    w.player.sliding = true;
    let maxAir = 0;
    for (let i = 0; i < 120; i++) {
      updatePlayer(w, input);
      if (!w.player.onGround) maxAir = Math.max(maxAir, w.player.y - t.height(w.player.x, w.player.z));
    }
    expect(maxAir).toBeGreaterThan(1);
  });
});
