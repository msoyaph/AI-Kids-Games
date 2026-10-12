import { describe, expect, it } from 'vitest';
import { TEST_LOOP } from '../../src/data/tracks/testLoop';
import { TrackModel, F_GAP } from '../../src/sim/track/trackModel';
import { makeGroundHit } from '../../src/sim/ground';
import { autopilot, makeRace, runUntil } from './helpers';
import { SIM_DT } from '../../src/core/loop';

describe('track model', () => {
  const track = new TrackModel(TEST_LOOP);

  it('bakes evenly spaced samples around a closed loop', () => {
    const rb = track.main;
    expect(rb.n).toBeGreaterThan(500);
    expect(Math.abs(rb.ds - 1)).toBeLessThan(0.05);
    // consecutive samples are ~ds apart
    for (let i = 0; i < rb.n; i++) {
      const j = rb.idx(i + 1);
      const d = Math.hypot(rb.px[j] - rb.px[i], rb.py[j] - rb.py[i], rb.pz[j] - rb.pz[i]);
      expect(d).toBeGreaterThan(rb.ds * 0.8);
      expect(d).toBeLessThan(rb.ds * 1.25);
    }
  });

  it('starts at the configured start u', () => {
    expect(Math.abs(track.main.u[0] - (TEST_LOOP.start ?? 0))).toBeLessThan(0.02);
  });

  it('ground query finds the road surface and reports lateral offset', () => {
    const rb = track.main;
    const i = 100;
    const hit = makeGroundHit();
    const hint = { ribbon: 0, sample: 90 };
    const d = 3;
    track.query(rb.px[i] + rb.rx[i] * d, rb.py[i] + 1, rb.pz[i] + rb.rz[i] * d, hint, hit);
    expect(hit.hit).toBe(true);
    expect(hit.surface).toBe('road');
    expect(Math.abs(hit.d - d)).toBeLessThan(0.1);
    expect(Math.abs(hit.s - i * rb.ds)).toBeLessThan(1.5);
  });

  it('flags gaps and reports no ground there', () => {
    const rb = track.main;
    let gi = -1;
    for (let i = 0; i < rb.n; i++) if (rb.flags[i] & F_GAP) gi = i;
    expect(gi).toBeGreaterThan(0);
    const hit = makeGroundHit();
    const hint = { ribbon: 0, sample: gi };
    track.query(rb.px[gi], rb.py[gi] + 1, rb.pz[gi], hint, hit);
    expect(hit.hit).toBe(false);
  });

  it('walls push back beyond the shoulder', () => {
    const rb = track.main;
    const i = 50;
    const hit = makeGroundHit();
    const far = rb.hw[i] + rb.shR[i] + 2;
    track.query(rb.px[i] + rb.rx[i] * far, rb.py[i] + 1, rb.pz[i] + rb.rz[i] * far, { ribbon: 0, sample: i }, hit);
    expect(hit.wallHit).toBe(true);
    expect(hit.wallDepth).toBeGreaterThan(0);
  });

  it('racing line stays on the road', () => {
    const rb = track.main;
    for (let i = 0; i < rb.n; i++) expect(Math.abs(track.line[i])).toBeLessThanOrEqual(rb.hw[i]);
  });

  it('mirror flips the layout horizontally', () => {
    const m = new TrackModel(TEST_LOOP, true);
    expect(Math.abs(m.length - track.length)).toBeLessThan(1);
    expect(m.main.px[10]).toBeCloseTo(-track.main.px[10], 3);
  });
});

describe('laps and positions', () => {
  it('an autopilot completes 3 laps (including the glider gap)', () => {
    const { world, track, race } = makeRace(TEST_LOOP, 1);
    const k = world.karts[0];
    const t = runUntil(world, 240, () => autopilot(k, track), () => k.finished);
    expect(t).toBeGreaterThan(0);
    expect(k.lapTimes.length).toBe(3);
    expect(race.finishOrder).toEqual([0]);
    expect(k.raceStats.falls).toBe(0);
  });

  it('also completes the mirrored track', () => {
    const { world, track } = makeRace(TEST_LOOP, 1, true);
    const k = world.karts[0];
    const t = runUntil(world, 240, () => autopilot(k, track), () => k.finished);
    expect(t).toBeGreaterThan(0);
  });

  it('driving backwards over the line does not count a lap', () => {
    const { world, track } = makeRace(TEST_LOOP, 1);
    const k = world.karts[0];
    // turn around and drive backwards for a while
    runUntil(world, 0.2, () => {}, () => false);
    k.yaw += Math.PI;
    runUntil(
      world,
      40,
      () => {
        autopilot(k, track);
        // aim at a point behind instead
        const rb = track.main;
        const j = rb.idx(k.hint.sample - 12);
        const want = Math.atan2(rb.px[j] - k.x, rb.pz[j] - k.z);
        let err = want - k.yaw;
        while (err > Math.PI) err -= Math.PI * 2;
        while (err < -Math.PI) err += Math.PI * 2;
        k.input.steer = Math.max(-1, Math.min(1, -err * 2));
      },
      () => false,
    );
    expect(k.lapsDone).toBe(0);
    expect(k.progress).toBeLessThan(0);
  });

  it('ranks follow progress', () => {
    const { world, track, race } = makeRace(TEST_LOOP, 3);
    const [a, b, c] = world.karts;
    runUntil(
      world,
      20,
      () => {
        autopilot(a, track);
        autopilot(b, track);
        b.input.throttle = 0.6;
        c.input.throttle = 0;
      },
      () => false,
    );
    expect(a.rank).toBeLessThan(b.rank);
    expect(b.rank).toBeLessThan(c.rank);
    expect(race.standings[0]).toBe(a);
  });

  it('falling off a drop edge respawns without gaining progress', () => {
    const { world, track } = makeRace(TEST_LOOP, 1);
    const k = world.karts[0];
    // drive normally until we reach the drop-edge section, then steer hard off it
    let fellAt = -1;
    let progressAtFall = 0;
    runUntil(
      world,
      60,
      () => {
        autopilot(k, track);
        const u = track.main.u[k.hint.sample];
        if (u > 4.65 && u < 4.9) k.input.steer = 1;
        if (k.raceStats.falls > 0 && fellAt < 0) {
          fellAt = world.raceTime;
          progressAtFall = k.progress;
        }
      },
      () => fellAt > 0 && world.raceTime > fellAt + 3,
    );
    expect(k.raceStats.falls).toBeGreaterThan(0);
    expect(k.progress).toBeLessThanOrEqual(progressAtFall + 60 * SIM_DT * 30);
    expect(k.grounded).toBe(true);
  });
});
