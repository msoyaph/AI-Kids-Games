import { World } from '../../src/sim/world';
import { TrackModel } from '../../src/sim/track/trackModel';
import { RaceTracker } from '../../src/sim/race';
import type { Kart } from '../../src/sim/kart';
import type { TrackData } from '../../src/data/types';
import { SIM_DT } from '../../src/core/loop';
import { wrapAngle } from '../../src/core/math';

export const CFG = { body: 'zoomster', wheels: 'standard', glider: 'kite', paint: 'cherry', decal: 'none' };

export function makeRace(data: TrackData, n = 1, mirror = false): { world: World; track: TrackModel; race: RaceTracker } {
  const track = new TrackModel(data, mirror);
  const world = new World({
    ground: track,
    speedClass: 'pro',
    seed: 3,
    racers: Array.from({ length: n }, (_, i) => ({ racerId: 'calex', kart: CFG, player: i === 0 ? 0 : -1 })),
    countdownTime: 0.05,
  });
  world.events.enabled = false;
  const race = new RaceTracker(world, track, 3);
  race.placeGrid(Array.from({ length: n }, (_, i) => i));
  return { world, track, race };
}

/** Minimal pure-pursuit driver along the racing line (tests only). */
export function autopilot(k: Kart, track: TrackModel, lookahead = 12): void {
  const rb = track.main;
  const i = k.hint.sample;
  const j = rb.idx(i + Math.round((lookahead + Math.abs(k.speed) * 0.35) / rb.ds));
  const tx = rb.px[j] + rb.rx[j] * track.line[j];
  const tz = rb.pz[j] + rb.rz[j] * track.line[j];
  const want = Math.atan2(tx - k.x, tz - k.z);
  const err = wrapAngle(want - k.yaw);
  k.input.steer = Math.max(-1, Math.min(1, -err * 2.2));
  k.input.throttle = 1;
  k.input.drift = false;
}

export function runUntil(world: World, maxSeconds: number, each: () => void, done: () => boolean): number {
  const steps = Math.round(maxSeconds / SIM_DT);
  for (let s = 0; s < steps; s++) {
    each();
    world.step(SIM_DT);
    if (done()) return world.raceTime;
  }
  return -1;
}
