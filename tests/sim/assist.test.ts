import { describe, expect, it } from 'vitest';
import { TRACKS } from '../../src/data/tracks/index';
import { RACERS } from '../../src/data/racers';
import { runHeadlessRace } from '../../src/sim/headless';
import type { AssistLevel } from '../../src/tuning/balance';

// A simulated beginner (low skill + wandering steering) on every track, Rookie, no items.
const entries = RACERS.slice(0, 4).map((r) => ({ racerId: r.id, kart: { ...r.defaultKart, paint: 'cherry', decal: 'none' } }));
function falls(level: AssistLevel): { falls: number; time: number } {
  let f = 0;
  let t = 0;
  for (const tr of TRACKS) {
    const r = runHeadlessRace({ trackId: tr.id, speedClass: 'rookie', entries, seed: 5, items: false, human: { index: 0, skill: 0.2, style: { steerNoise: 0.6 }, assist: level } });
    f += r.stats[0].falls;
    t += r.finishTimes[0];
  }
  return { falls: f, time: t / TRACKS.length };
}

describe('steering assist levels', () => {
  const off = falls('off');
  const light = falls('light');
  const full = falls('full');
  it('each level prevents more falls', () => {
    expect(light.falls).toBeLessThan(off.falls);
    expect(full.falls).toBeLessThanOrEqual(light.falls);
  });
  it('Full prevents most falls', () => {
    expect(full.falls).toBeLessThanOrEqual(Math.ceil(off.falls * 0.15));
  });
  it('assist never makes a beginner slower', () => {
    expect(light.time).toBeLessThan(off.time);
    expect(full.time).toBeLessThanOrEqual(light.time + 1);
  });
});
