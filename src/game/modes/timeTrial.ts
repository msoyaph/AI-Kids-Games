import type { KartConfig } from '../../data/types';
import { findTrack } from '../../data/tracks/index';
import { RACERS } from '../../data/racers';
import { TrackModel } from '../../sim/track/trackModel';
import { World } from '../../sim/world';
import { RaceTracker } from '../../sim/race';
import { AiController } from '../../sim/ai/aiController';
import { ItemSystem } from '../../sim/items/itemSystem';
import { HazardSystem } from '../../sim/hazards';
import { GhostData, GhostRecorder, GF_BOOST, GF_DRIFT, GF_DRIFT_LEFT, GF_GLIDE } from '../../sim/ghost';
import { SIM_DT } from '../../core/loop';
import { hashString } from '../../core/rng';

export interface StaffGhost {
  data: GhostData;
  time: number;
  racerId: string;
  kart: KartConfig;
}

const cache = new Map<string, StaffGhost>();

/**
 * The "staff ghost" for a track: a deterministic run by an expert AI driver (Pro class, three turbo cans),
 * computed headlessly in a few milliseconds. Its time is the target for the "beat the staff" challenges.
 */
export function staffGhost(trackId: string): StaffGhost {
  const hit = cache.get(trackId);
  if (hit) return hit;
  const data = findTrack(trackId);
  const racer = RACERS[hashString(trackId) % RACERS.length];
  const kart: KartConfig = { ...racer.defaultKart, paint: 'cherry', decal: 'none' };
  const track = new TrackModel(data, false);
  const world = new World({ ground: track, speedClass: 'pro', seed: 4242, racers: [{ racerId: racer.id, kart, player: -1 }], countdownTime: 3 });
  world.events.enabled = false;
  const race = new RaceTracker(world, track, 3);
  race.placeGrid([0]);
  const ai = new AiController(world, track, { noRubberBand: true, skillBonus: { 0: 0.1 }, personality: { 0: 'balanced' } });
  const items = new ItemSystem(world, track, track, { set: 'all', boxes: [] });
  ai.attachItems(items);
  if (track.data.hazards?.length) new HazardSystem(world, track, items.hazards);
  const k = world.karts[0];
  items.give(k, 'turbo3');
  const rec = new GhostRecorder();
  let steps = 0;
  while (!k.finished && steps < 60 * 300) {
    world.step(SIM_DT);
    steps++;
    if (world.phase === 'race') {
      let f = 0;
      if (k.drifting) f |= GF_DRIFT | (k.driftDir < 0 ? GF_DRIFT_LEFT : 0);
      if (k.gliding) f |= GF_GLIDE;
      if (k.boosting) f |= GF_BOOST;
      rec.record(world.raceTime, k.x, k.y, k.z, k.yaw, f);
    }
  }
  const ghost = GhostData.decode(rec.encode())!;
  const out: StaffGhost = { data: ghost, time: k.finished ? k.finishTime : Infinity, racerId: racer.id, kart };
  cache.set(trackId, out);
  return out;
}
