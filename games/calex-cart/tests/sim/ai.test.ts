import { describe, expect, it } from 'vitest';
import { TEST_LOOP } from '../../src/data/tracks/testLoop';
import { TrackModel } from '../../src/sim/track/trackModel';
import { World } from '../../src/sim/world';
import { RaceTracker } from '../../src/sim/race';
import { AiController } from '../../src/sim/ai/aiController';
import { SIM_DT } from '../../src/core/loop';
import type { SpeedClass } from '../../src/data/types';
import { CFG } from './helpers';

function aiRace(speedClass: SpeedClass, n = 8, seed = 11, mirror = false) {
  const track = new TrackModel(TEST_LOOP, mirror);
  const world = new World({
    ground: track,
    speedClass,
    seed,
    racers: Array.from({ length: n }, () => ({ racerId: 'calex', kart: CFG, player: -1 })),
    countdownTime: 3,
  });
  world.events.enabled = false;
  const race = new RaceTracker(world, track, 3);
  race.placeGrid(Array.from({ length: n }, (_, i) => i));
  const ai = new AiController(world, track, { noRubberBand: true });
  let steps = 0;
  while (world.phase !== 'done' && steps < 60 * 400) {
    world.step(SIM_DT);
    steps++;
  }
  return { world, race, ai, track };
}

describe('AI racers', () => {
  it('8 AI karts all finish 3 laps on Pro', () => {
    const { world, race } = aiRace('pro');
    expect(world.phase).toBe('done');
    const real = world.karts.filter((k) => k.finished && !k.projected);
    expect(real.length).toBe(8);
    expect(race.finishOrder.length).toBe(8);
    const falls = world.karts.reduce((a, k) => a + k.raceStats.falls, 0);
    expect(falls).toBeLessThanOrEqual(2);
  });

  it('AI drifts and earns mini-turbos', () => {
    const { world } = aiRace('champion');
    const turbos = world.karts.reduce((a, k) => a + k.raceStats.miniTurbos[0] + k.raceStats.miniTurbos[1] + k.raceStats.miniTurbos[2], 0);
    expect(turbos).toBeGreaterThanOrEqual(3);
  });

  it('higher speed classes finish faster', () => {
    const t = (c: SpeedClass) => {
      const { world } = aiRace(c, 4, 5);
      return Math.min(...world.karts.map((k) => k.finishTime));
    };
    const rookie = t('rookie');
    const pro = t('pro');
    const champ = t('champion');
    expect(rookie).toBeGreaterThan(pro);
    expect(pro).toBeGreaterThan(champ);
  });

  it('is deterministic for the same seed', () => {
    const a = aiRace('pro', 6, 99).world.karts.map((k) => k.finishTime.toFixed(4));
    const b = aiRace('pro', 6, 99).world.karts.map((k) => k.finishTime.toFixed(4));
    expect(a).toEqual(b);
  });
});
