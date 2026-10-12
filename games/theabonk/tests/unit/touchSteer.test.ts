import { describe, expect, it } from 'vitest';
import { TUNING_DEFAULTS } from '../../src/config/tuning';
import { STEER_CATCHUP, STEER_DEADBAND_DEG, TouchSteer } from '../../src/input/touchSteer';
import { autoCameraTurn } from '../../src/render/autoCamera';

const DT = 1 / 60;
const DEG = Math.PI / 180;

/** Thea's world heading for a stick angle read against `yaw` (CameraRig: forward = (−sin, −cos)). */
function heading(stickAng: number, yaw: number): number {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const mx = Math.sin(stickAng);
  const my = Math.cos(stickAng);
  return Math.atan2(-fz * mx + fx * my, fx * mx + fz * my);
}

/** Hold the stick at `ang` for `seconds` with the auto camera on; how far does the heading turn? */
function holdDiagonal(lock: boolean, ang = 45 * DEG, seconds = 8): number {
  const steer = new TouchSteer();
  let yaw = 0;
  const h0 = heading(ang, 0);
  let h = h0;
  let turned = 0;
  for (let k = 0; k < seconds * 60; k++) {
    steer.thumb(true, ang);
    const turn = autoCameraTurn(yaw, Math.sin(h) * 7, Math.cos(h) * 7, DT, TUNING_DEFAULTS.camera, 1);
    yaw += turn;
    steer.autoTurned(turn, lock, true);
    const next = heading(ang, steer.yaw(yaw));
    turned += Math.atan2(Math.sin(next - h), Math.cos(next - h));
    h = next;
  }
  return Math.abs(turned) / DEG;
}

describe('touch heading lock', () => {
  it('a held diagonal circles with the auto camera alone, and runs straight with the lock', () => {
    expect(holdDiagonal(false)).toBeGreaterThan(180);
    expect(holdDiagonal(true)).toBeLessThan(1);
    // off by default (touch survival matches keyboard without it); a tuning switch for playtests
    expect(TUNING_DEFAULTS.camera.autoCamHeadingLock).toBe(0);
  });

  it('the camera still settles in behind Thea while the heading holds', () => {
    const steer = new TouchSteer();
    let yaw = 0;
    const ang = 45 * DEG;
    const h = heading(ang, 0);
    for (let k = 0; k < 10 * 60; k++) {
      steer.thumb(true, ang);
      const turn = autoCameraTurn(yaw, Math.sin(h) * 7, Math.cos(h) * 7, DT, TUNING_DEFAULTS.camera, 1);
      yaw += turn;
      steer.autoTurned(turn, true, true);
    }
    // camera forward now points along Thea's heading
    expect(Math.abs(Math.atan2(Math.sin(heading(0, yaw) - h), Math.cos(heading(0, yaw) - h))) / DEG).toBeLessThan(3);
    expect(Math.abs(steer.offset) / DEG).toBeGreaterThan(40);
  });

  it('a deliberate thumb move re-reads the view; wobble does not', () => {
    const steer = new TouchSteer();
    steer.thumb(true, 0);
    steer.autoTurned(0.5, true, true);
    // jitter: ±3° around where it settled, for two seconds
    for (let k = 0; k < 120; k++) steer.thumb(true, (k % 2 ? 3 : -3) * DEG);
    expect(steer.offset).toBeCloseTo(0.5, 6);
    // a 15° swing from where it settled: the part past the deadband re-reads 1.5× that much of the turn
    for (let a = 3; a <= 15; a += 3) steer.thumb(true, a * DEG);
    const left = 0.5 - STEER_CATCHUP * (15 - STEER_DEADBAND_DEG) * DEG;
    expect(steer.offset).toBeCloseTo(left, 6);
    // a further 30° swing re-reads the rest
    for (let a = 18; a <= 45; a += 3) steer.thumb(true, a * DEG);
    expect(steer.offset).toBe(0);
  });

  it('lifting the thumb resets it; without the lock (or with no thumb) nothing is held', () => {
    const steer = new TouchSteer();
    steer.thumb(true, 1);
    steer.autoTurned(0.3, true, true);
    expect(steer.yaw(2)).toBeCloseTo(1.7, 6);
    steer.thumb(false, 0);
    expect(steer.offset).toBe(0);
    steer.autoTurned(0.3, false, true);
    steer.autoTurned(0.3, true, false);
    expect(steer.offset).toBe(0);
    expect(steer.yaw(2)).toBe(2);
  });
});
