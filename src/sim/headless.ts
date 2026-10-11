import type { KartConfig, Personality, SpeedClass } from '../data/types';
import { findTrack } from '../data/tracks/index';
import { TrackModel } from './track/trackModel';
import { World } from './world';
import { RaceTracker } from './race';
import { AiController } from './ai/aiController';
import { ItemSystem } from './items/itemSystem';
import { HazardSystem } from './hazards';
import type { KartRaceStats } from './kart';
import { SIM_DT } from '../core/loop';

export interface HeadlessEntry {
  racerId: string;
  kart: KartConfig;
}

export interface HeadlessOptions {
  trackId: string;
  mirror?: boolean;
  speedClass: SpeedClass;
  entries: HeadlessEntry[];
  seed: number;
  items?: boolean;
  /** Same personality for everyone (fair comparisons). */
  personality?: Personality;
  /** Force every AI to this skill (0..1) by adjusting the bonus. */
  equalSkill?: boolean;
  rubberBand?: boolean;
  laps?: number;
  gridOrder?: number[];
}

export interface HeadlessResult {
  ranks: number[];
  finishTimes: number[];
  bestLaps: number[];
  projected: boolean[];
  stats: KartRaceStats[];
  winnerTime: number;
}

/** Run a whole AI-only race headlessly (no rendering). Deterministic for a given seed. */
export function runHeadlessRace(o: HeadlessOptions): HeadlessResult {
  const track = new TrackModel(findTrack(o.trackId), o.mirror ?? false);
  const world = new World({ ground: track, speedClass: o.speedClass, seed: o.seed, racers: o.entries.map((e) => ({ racerId: e.racerId, kart: e.kart, player: -1 })), countdownTime: 3 });
  world.events.enabled = false;
  const race = new RaceTracker(world, track, o.laps ?? 3);
  race.placeGrid(o.gridOrder ?? o.entries.map((_, i) => i));
  const personality: Record<number, Personality> = {};
  if (o.personality) o.entries.forEach((_, i) => (personality[i] = o.personality!));
  const ai = new AiController(world, track, { noRubberBand: !o.rubberBand, personality });
  if (o.equalSkill) {
    // remove per-kart random skill variance: rebuild drivers with identical skill
    for (const d of ai.drivers) (d as unknown as { skill: number }).skill = 0.7;
  }
  if (o.items !== false) {
    const items = new ItemSystem(world, track, track, { set: 'all' });
    ai.attachItems(items);
    if (track.data.hazards?.length) new HazardSystem(world, track, items.hazards);
  } else if (track.data.hazards?.length) new HazardSystem(world, track, ai.hazards);
  let steps = 0;
  while (world.phase !== 'done' && steps < 60 * 480) {
    world.step(SIM_DT);
    steps++;
  }
  if (world.phase !== 'done') race.finishRemaining();
  return {
    ranks: world.karts.map((k) => k.rank),
    finishTimes: world.karts.map((k) => k.finishTime),
    bestLaps: world.karts.map((k) => k.bestLap),
    projected: world.karts.map((k) => k.projected),
    stats: world.karts.map((k) => k.raceStats),
    winnerTime: Math.min(...world.karts.map((k) => k.finishTime)),
  };
}
