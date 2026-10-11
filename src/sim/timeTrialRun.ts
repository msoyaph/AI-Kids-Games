// Headless single-kart Time Trial runs: staff ghosts, the "strong bot" and Pro-AI references for balance tests.
import type { KartConfig, Personality } from '../data/types';
import { findTrack } from '../data/tracks/index';
import { RACERS } from '../data/racers';
import { TrackModel } from './track/trackModel';
import { World } from './world';
import { RaceTracker } from './race';
import { AiController } from './ai/aiController';
import type { DriverStyle } from './ai/aiDriver';
import { ItemSystem } from './items/itemSystem';
import { HazardSystem } from './hazards';
import { GhostRecorder, GF_BOOST, GF_DRIFT, GF_DRIFT_LEFT, GF_GLIDE } from './ghost';
import { SIM_DT } from '../core/loop';
import { hashString } from '../core/rng';
import { BALANCE } from '../tuning/balance';

export interface TimeTrialRunOptions {
  trackId: string;
  skill: number;
  seed: number;
  style?: DriverStyle;
  personality?: Personality;
  mirror?: boolean;
  /** Record a ghost (encoded string in the result). */
  record?: boolean;
  racerId?: string;
  kart?: KartConfig;
}

export interface TimeTrialRunResult {
  time: number;
  ghost?: string;
  racerId: string;
  kart: KartConfig;
  falls: number;
  shortcuts: number;
  stats: import('./kart').KartRaceStats;
}

/** The racer/kart used for a track's staff ghost (and its balance references), picked from the track id. */
export function staffRacer(trackId: string): { racerId: string; kart: KartConfig } {
  const racer = RACERS[hashString(trackId) % RACERS.length];
  return { racerId: racer.id, kart: { ...racer.defaultKart, paint: 'cherry', decal: 'none' } };
}

/** The expert style used by both the strong bot (pace 1) and the staff ghost (calibrated pace). */
export function expertStyle(paceMul = 1): DriverStyle {
  return { rocketStart: true, targetTier: 3, shortcutChance: 1, turboPlan: true, paceMul };
}

/** One 3-lap Time Trial (three Turbo Cans, no rivals, no rubber band). Deterministic for a seed. */
export function runTimeTrial(o: TimeTrialRunOptions): TimeTrialRunResult {
  const who = o.racerId && o.kart ? { racerId: o.racerId, kart: o.kart } : staffRacer(o.trackId);
  const track = new TrackModel(findTrack(o.trackId), o.mirror ?? false);
  const world = new World({ ground: track, speedClass: 'pro', seed: o.seed, racers: [{ racerId: who.racerId, kart: who.kart, player: -1 }], countdownTime: 3 });
  world.events.enabled = false;
  const race = new RaceTracker(world, track, 3);
  race.placeGrid([0]);
  const ai = new AiController(world, track, {
    noRubberBand: true,
    skill: { 0: o.skill },
    personality: { 0: o.personality ?? 'balanced' },
    style: o.style ? { 0: o.style } : undefined,
  });
  const items = new ItemSystem(world, track, track, { set: 'all', boxes: [] });
  ai.attachItems(items);
  if (track.data.hazards?.length) new HazardSystem(world, track, items.hazards);
  const k = world.karts[0];
  items.give(k, 'turbo3');
  const rec = o.record ? new GhostRecorder() : null;
  let steps = 0;
  while (!k.finished && steps < 60 * 300) {
    world.step(SIM_DT);
    steps++;
    if (rec && world.phase === 'race') {
      let f = 0;
      if (k.drifting) f |= GF_DRIFT | (k.driftDir < 0 ? GF_DRIFT_LEFT : 0);
      if (k.gliding) f |= GF_GLIDE;
      if (k.boosting) f |= GF_BOOST;
      rec.record(world.raceTime, k.x, k.y, k.z, k.yaw, f);
    }
  }
  return {
    time: k.finished ? k.finishTime : Infinity,
    ghost: rec?.encode(),
    racerId: who.racerId,
    kart: who.kart,
    falls: k.raceStats.falls,
    shortcuts: k.raceStats.shortcuts,
    stats: k.raceStats,
  };
}

/** Staff ghost pace multiplier and seed for a track (calibrated by `npm run calibrate-staff`). */
export function staffSetup(trackId: string): { pace: number; seed: number } {
  return BALANCE.staff.tracks[trackId] ?? { pace: BALANCE.staff.defaultPace, seed: BALANCE.staff.seed };
}

/** Reference times used to place staff ghosts: best strong-bot and best Pro-AI run over the same seeds. */
export function staffReferences(trackId: string): { strong: number; strongSeed: number; proBest: number; target: number } {
  let strong = Infinity;
  let strongSeed = BALANCE.staff.seed;
  let proBest = Infinity;
  for (let i = 0; i < BALANCE.staff.proSeeds; i++) {
    const seed = 101 + i * 17;
    const st = runTimeTrial({ trackId, skill: 1, seed, style: expertStyle(1) }).time;
    if (st < strong) {
      strong = st;
      strongSeed = seed;
    }
    proBest = Math.min(proBest, runTimeTrial({ trackId, skill: BALANCE.classes.pro.aiSkill, seed }).time);
  }
  return { strong, strongSeed, proBest, target: strong + BALANCE.staff.gapFraction * (proBest - strong) };
}
