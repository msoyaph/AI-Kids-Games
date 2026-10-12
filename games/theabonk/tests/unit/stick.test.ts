import { describe, expect, it } from 'vitest';
import { STICK_CURVE, STICK_DEAD, STICK_FULL, stickReading, stickResponse } from '../../src/input/stick';

const T = 40; // travel radius, px

describe('touch joystick response', () => {
  it('a resting thumb inside the dead zone reads zero', () => {
    const r = stickResponse(T * STICK_DEAD * 0.9, 0, T, stickReading());
    expect(r.mag).toBe(0);
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
  });

  it('full speed at (and past) the rim, in any direction', () => {
    for (let a = 0; a < 360; a += 15) {
      const rad = (a * Math.PI) / 180;
      const r = stickResponse(Math.sin(rad) * T * 1.4, -Math.cos(rad) * T * 1.4, T, stickReading());
      expect(r.mag).toBeCloseTo(1, 6);
      expect(Math.hypot(r.x, r.y)).toBeCloseTo(1, 6);
      // direction is exact (analog through 360°)
      expect(r.x).toBeCloseTo(Math.sin(rad), 6);
      expect(r.y).toBeCloseTo(Math.cos(rad), 6);
      expect(((r.ang % 360) + 360) % 360).toBeCloseTo(a, 6);
    }
    expect(stickResponse(0, -T * STICK_FULL, T, stickReading()).mag).toBeCloseTo(1, 6);
  });

  it('a gentle curve: finer near the centre, monotonic to the rim', () => {
    let prev = 0;
    for (let k = 0; k <= 20; k++) {
      const m = stickResponse(0, -(T * k) / 20, T, stickReading()).mag;
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
    const half = stickResponse(0, -T * 0.5, T, stickReading()).mag;
    const lin = (0.5 - STICK_DEAD) / (STICK_FULL - STICK_DEAD);
    expect(half).toBeCloseTo(Math.pow(lin, STICK_CURVE), 6);
    expect(half).toBeLessThan(lin);
  });

  it('screen up is forward (+y), screen right is +x', () => {
    const up = stickResponse(0, -T, T, stickReading());
    expect(up.y).toBeCloseTo(1);
    const right = stickResponse(T, 0, T, stickReading());
    expect(right.x).toBeCloseTo(1);
    expect(right.ang).toBeCloseTo(90);
  });
});
