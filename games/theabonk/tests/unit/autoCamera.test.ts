import { describe, expect, it } from 'vitest';
import { TUNING_DEFAULTS } from '../../src/config/tuning';
import { autoCameraTurn } from '../../src/render/autoCamera';

const T = TUNING_DEFAULTS.camera;
const dt = 1 / 60;
/** Velocity `speed` at `deg` degrees clockwise from the camera's forward, for yaw 0. */
const vel = (deg: number, speed = 7): [number, number] => {
  const r = (deg * Math.PI) / 180;
  // yaw 0: forward = (0, −1), right = (1, 0)
  return [Math.sin(r) * speed, -Math.cos(r) * speed];
};

describe('touch auto camera', () => {
  it('leaves the camera alone when Thea already heads straight ahead, stands still, or crawls', () => {
    expect(autoCameraTurn(0, ...vel(0), dt, T)).toBeCloseTo(0, 9);
    expect(autoCameraTurn(0, 0, 0, dt, T)).toBe(0);
    expect(autoCameraTurn(0, ...vel(45, T.autoCamMinSpeed * 0.9), dt, T)).toBe(0);
  });

  it('never turns while retreating toward the camera (kiting keeps the view)', () => {
    for (const deg of [130, 160, 180, -150]) expect(autoCameraTurn(0, ...vel(deg), dt, T)).toBe(0);
  });

  it('turns toward the movement, capped, and slower for sideways than for diagonal-forward', () => {
    const diag = autoCameraTurn(0, ...vel(45), dt, T);
    const side = autoCameraTurn(0, ...vel(90), dt, T);
    // moving to the camera's right means turning so forward swings right: yaw decreases
    expect(diag).toBeLessThan(0);
    expect(Math.abs(diag)).toBeLessThanOrEqual(T.autoCamRate * dt + 1e-12);
    expect(Math.abs(side)).toBeLessThan(Math.abs(diag));
    expect(autoCameraTurn(0, ...vel(-45), dt, T)).toBeCloseTo(-diag, 9);
  });

  it('settles in behind a steady heading', () => {
    let yaw = 0;
    const [vx, vz] = vel(50);
    for (let i = 0; i < 60 * 6; i++) yaw += autoCameraTurn(yaw, vx, vz, dt, T);
    const target = Math.atan2(-vx, -vz);
    expect(Math.abs(Math.atan2(Math.sin(target - yaw), Math.cos(target - yaw)))).toBeLessThan(0.02);
  });

  it('gain 0 (just after a camera drag) means no turn; reduced gain turns less', () => {
    expect(autoCameraTurn(0, ...vel(45), dt, T, 0)).toBe(0);
    expect(Math.abs(autoCameraTurn(0, ...vel(45), dt, T, 0.5))).toBeLessThan(Math.abs(autoCameraTurn(0, ...vel(45), dt, T, 1)));
  });
});
