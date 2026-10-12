import { describe, expect, it } from 'vitest';
import { TRACKS } from '../../src/data/tracks/index';
import { RACERS } from '../../src/data/racers';
import { runHeadlessRace } from '../../src/sim/headless';
import { stickResponse } from '../../src/input/touch/stick';
import type { AssistLevel } from '../../src/tuning/balance';

// A young touch player: moves the thumb in proportion to how much they want to turn, with a little thumb jitter.
// Joystick = that thumb offset goes through the glass stick's response curve (dead zone, gentle centre, full lock).
// Pads = the old ◀ ▶ pads (linear with a small dead zone). Assist works on whatever reaches the kart.
const R = 40;
const jitter = (t: number): number => 0.06 * Math.sin(t * 7.3) + 0.04 * Math.sin(t * 13.1 + 1);
const joystick = (s: number, t: number): number => stickResponse((s + jitter(t)) * R, R);
const pads = (s: number, t: number): number => {
  const v = s + jitter(t);
  return Math.abs(v) < 0.12 ? 0 : (v - Math.sign(v) * 0.12) / 0.88;
};

const entries = RACERS.slice(0, 4).map((r) => ({ racerId: r.id, kart: { ...r.defaultKart, paint: 'cherry', decal: 'none' } }));
const tracks = [...TRACKS.slice(0, 4), ...TRACKS.slice(-3)];

function drive(map: (s: number, t: number) => number, assist: AssistLevel): { falls: number; time: number; finished: number } {
  let falls = 0;
  let time = 0;
  let finished = 0;
  for (const t of tracks) {
    const r = runHeadlessRace({ trackId: t.id, speedClass: 'rookie', entries, seed: 5, items: false, human: { index: 0, skill: 0.35, style: { steerNoise: 0.25, steerMap: map }, assist } });
    falls += r.stats[0].falls;
    time += r.finishTimes[0];
    if (Number.isFinite(r.finishTimes[0]) && r.finishTimes[0] > 0) finished++;
  }
  return { falls, time: time / tracks.length, finished };
}

describe('glass joystick with every steering-assist level', () => {
  const stick = { off: drive(joystick, 'off'), light: drive(joystick, 'light'), full: drive(joystick, 'full') };
  const pad = { off: drive(pads, 'off'), light: drive(pads, 'light'), full: drive(pads, 'full') };
  it('finishes every race at every level', () => {
    for (const l of ['off', 'light', 'full'] as const) expect(stick[l].finished, l).toBe(tracks.length);
  });
  it('assist still catches falls with stick input (Full ≤ Light ≤ Off)', () => {
    expect(stick.light.falls).toBeLessThanOrEqual(stick.off.falls);
    expect(stick.full.falls).toBeLessThanOrEqual(stick.light.falls);
    expect(stick.full.falls).toBeLessThanOrEqual(1);
  });
  it('the stick is no slower than the old pads at any level', () => {
    for (const l of ['off', 'light', 'full'] as const) expect(stick[l].time, l).toBeLessThanOrEqual(pad[l].time * 1.02);
  });
});
