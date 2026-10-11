/** Debug: run an 8-AI race on a track and report where karts got stuck. npx tsx scripts/debugRace.ts <trackId> [mirror] */
import { findTrack } from '../src/data/tracks/index';
import { TrackModel } from '../src/sim/track/trackModel';
import { World } from '../src/sim/world';
import { RaceTracker } from '../src/sim/race';
import { AiController } from '../src/sim/ai/aiController';
import { ItemSystem } from '../src/sim/items/itemSystem';
import { HazardSystem } from '../src/sim/hazards';
import { SIM_DT } from '../src/core/loop';
import { RACERS } from '../src/data/racers';

const id = process.argv[2];
const mirror = process.argv[3] === 'mirror';
const t = new TrackModel(findTrack(id), mirror);
const world = new World({
  ground: t,
  speedClass: 'pro',
  seed: 7,
  racers: Array.from({ length: 8 }, (_, i) => ({ racerId: RACERS[i % RACERS.length].id, kart: { body: 'zoomster', wheels: 'standard', glider: 'kite', paint: 'cherry', decal: 'none' }, player: -1 })),
  countdownTime: 3,
});
world.events.enabled = false;
const race = new RaceTracker(world, t, 3);
race.placeGrid([0, 1, 2, 3, 4, 5, 6, 7]);
const ai = new AiController(world, t, { noRubberBand: true });
const items = new ItemSystem(world, t, t, { set: 'all' });
ai.attachItems(items);
new HazardSystem(world, t, items.hazards);
const lastProg = world.karts.map(() => 0);
const stuckAt = world.karts.map(() => 0);
let steps = 0;
while (world.phase !== 'done' && steps < 60 * 420) {
  world.step(SIM_DT);
  steps++;
  if (steps % 120 === 0) {
    for (const k of world.karts) {
      if (!k.finished && Math.abs(k.progress - lastProg[k.index]) < 5) {
        stuckAt[k.index]++;
        if (stuckAt[k.index] === 2) console.log(`t=${world.raceTime.toFixed(1)} kart ${k.index} stuck at u=${t.main.u[k.hint.sample].toFixed(2)} s=${k.ground.s.toFixed(0)} d=${k.ground.d.toFixed(1)} y=${k.y.toFixed(1)} ground=${k.ground.height.toFixed(1)} hit=${k.ground.hit} wall=${k.ground.wallHit} ribbon=${k.ground.ribbon} speed=${k.speed.toFixed(1)} prog=${k.progress.toFixed(0)}`);
      } else stuckAt[k.index] = 0;
      lastProg[k.index] = k.progress;
    }
  }
}
for (const k of world.karts) console.log(`kart ${k.index} finished=${k.finished} projected=${k.projected} laps=${k.lapsDone} prog=${k.progress.toFixed(0)} falls=${k.raceStats.falls} sc=${k.raceStats.shortcuts}`);
