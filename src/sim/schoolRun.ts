// Headless Driving School runs (tests + medal calibration): an AI driver takes a lesson.
import { findLesson, type LessonId, type LessonMedal } from '../data/school';
import { findTrack } from '../data/tracks/index';
import { TrackModel } from './track/trackModel';
import { World } from './world';
import { RaceTracker } from './race';
import { AiController } from './ai/aiController';
import type { DriverStyle } from './ai/aiDriver';
import { ItemSystem } from './items/itemSystem';
import { LessonSim } from './school';
import { SIM_DT } from '../core/loop';

export function lessonLaps(id: LessonId): number {
  return id === 'drifting' ? 99 : 1;
}

export function runLesson(id: LessonId, skill: number, seed = 3, style?: DriverStyle): { score: number; medal: LessonMedal | null; sim: LessonSim } {
  const lesson = findLesson(id);
  const track = new TrackModel(findTrack(lesson.track), false);
  const world = new World({ ground: track, speedClass: 'rookie', seed, racers: [{ racerId: 'calex', kart: { body: 'zoomster', wheels: 'standard', glider: 'kite', paint: 'cherry', decal: 'none' }, player: -1 }], countdownTime: 3 });
  world.events.enabled = false;
  const race = new RaceTracker(world, track, lessonLaps(id));
  race.placeGrid([0]);
  const ai = new AiController(world, track, { noRubberBand: true, skill: { 0: skill }, personality: { 0: 'balanced' }, style: style ? { 0: style } : undefined });
  const items = new ItemSystem(world, track, track, { set: 'all', boxes: [] });
  ai.attachItems(items);
  const sim = new LessonSim(lesson, world, track, race, items);
  const k = world.karts[0];
  // the items lesson needs a thrower: roll a ball whenever a target is straight ahead
  if (id === 'items') {
    world.preStep.push(() => {
      const fx = Math.sin(k.yaw);
      const fz = Math.cos(k.yaw);
      let aim = false;
      for (const t of sim.targets) {
        if (t.popped) continue;
        const dx = t.x - k.x;
        const dz = t.z - k.z;
        const along = dx * fx + dz * fz;
        const side = Math.abs(dx * -fz + dz * fx);
        if (along > 8 && along < 30 && side < 1.2) aim = true;
      }
      k.input.item = aim && k.item === 'bumperBall' ? !k.input.item : false;
      k.input.aimBack = false;
    });
  }
  let steps = 0;
  while (!sim.done && steps < 60 * (lesson.timeLimit + 30)) {
    world.step(SIM_DT);
    steps++;
  }
  return { score: sim.score, medal: sim.medal, sim };
}
