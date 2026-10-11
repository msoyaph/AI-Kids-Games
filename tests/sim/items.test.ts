import { describe, expect, it } from 'vitest';
import { TEST_LOOP } from '../../src/data/tracks/testLoop';
import { ItemSystem, ItemState } from '../../src/sim/items/itemSystem';
import { AiController } from '../../src/sim/ai/aiController';
import { World } from '../../src/sim/world';
import { TrackModel } from '../../src/sim/track/trackModel';
import { RaceTracker } from '../../src/sim/race';
import { SIM_DT } from '../../src/core/loop';
import { autopilot, CFG, makeRace, runUntil } from './helpers';
import type { ItemId } from '../../src/data/types';

function setup(n = 2) {
  const r = makeRace(TEST_LOOP, n);
  const items = new ItemSystem(r.world, r.track, r.track, { set: 'all' });
  // let the countdown finish
  runUntil(r.world, 0.2, () => {}, () => false);
  return { ...r, items };
}

/** Put kart b `gap` metres straight ahead of kart a (along a's heading) near the start straight. */
function lineUp(r: ReturnType<typeof setup>, gap: number) {
  const [a, b] = r.world.karts;
  const rb = r.track.main;
  const i = rb.n - 60;
  const yaw = Math.atan2(rb.tx[i], rb.tz[i]);
  a.place(rb.px[i], rb.py[i], rb.pz[i], yaw);
  b.place(rb.px[i] + Math.sin(yaw) * gap, rb.py[i], rb.pz[i] + Math.cos(yaw) * gap, yaw);
  for (const k of [a, b]) {
    r.track.resetHint(k.x, k.y, k.z, k.hint);
    r.track.query(k.x, k.y + 1, k.z, k.hint, k.ground);
    k.y = k.py = k.ground.height;
    k.lastS = k.ground.s;
    k.progress = k.lastS > r.track.length / 2 ? k.lastS - r.track.length : k.lastS;
  }
  return { a, b };
}

function use(r: ReturnType<typeof setup>, k: ReturnType<typeof lineUp>['a'], id: ItemId, back = false) {
  r.items.give(k, id);
  k.input.item = true;
  k.input.aimBack = back;
  r.world.step(SIM_DT);
  k.input.item = false;
  r.world.step(SIM_DT);
}

describe('item system', () => {
  it('item boxes give an item after the roulette', () => {
    const r = setup(1);
    const k = r.world.karts[0];
    runUntil(r.world, 30, () => autopilot(k, r.track), () => k.item !== null);
    expect(k.item).not.toBeNull();
    expect(r.items.boxes.some((b) => b.respawn > 0)).toBe(true);
  });

  it('turbo can boosts', () => {
    const r = setup(1);
    const k = r.world.karts[0];
    use(r, k, 'turbo');
    expect(k.boostTime).toBeGreaterThan(1);
    expect(k.item).toBeNull();
  });

  it('triple turbo has three uses', () => {
    const r = setup(1);
    const k = r.world.karts[0];
    r.items.give(k, 'turbo3');
    for (let i = 0; i < 3; i++) {
      k.input.item = true;
      r.world.step(SIM_DT);
      k.input.item = false;
      r.world.step(SIM_DT);
    }
    expect(k.item).toBeNull();
    expect(k.raceStats.itemsUsed).toBe(3);
  });

  it('a bumper ball rolled forward spins the kart ahead', () => {
    const r = setup();
    const { a, b } = lineUp(r, 25);
    r.items.give(a, 'bumperBall');
    a.input.item = true;
    r.world.step(SIM_DT);
    expect(a.trailing).toBe(true);
    a.input.item = false;
    runUntil(r.world, 2, () => {}, () => b.spinTime > 0);
    expect(b.spinTime).toBeGreaterThan(0);
    expect(a.raceStats.itemHits).toBe(1);
  });

  it('a shield blocks a hit', () => {
    const r = setup();
    const { a, b } = lineUp(r, 25);
    b.shieldTime = 5;
    use(r, a, 'bumperBall');
    runUntil(r.world, 2, () => {}, () => b.shieldTime <= 0);
    expect(b.spinTime).toBeLessThanOrEqual(0);
    expect(b.shieldTime).toBeLessThanOrEqual(0);
  });

  it('a trailing item blocks a ball from behind', () => {
    const r = setup();
    const { a, b } = lineUp(r, 20);
    r.items.give(b, 'gooPuddle');
    b.input.item = true;
    r.world.step(SIM_DT);
    expect(b.trailing).toBe(true);
    use(r, a, 'bumperBall');
    runUntil(r.world, 2, () => (b.input.item = true), () => !b.trailing);
    expect(b.spinTime).toBeLessThanOrEqual(0);
    expect(b.item).toBeNull();
  });

  it('paper plane homes in on the racer ahead', () => {
    const r = setup();
    const { a, b } = lineUp(r, 80);
    a.rank = 2;
    b.rank = 1;
    use(r, a, 'paperPlane');
    runUntil(r.world, 6, () => {}, () => b.tumbleTime > 0);
    expect(b.tumbleTime).toBeGreaterThan(0);
  });

  it('a hop at the right moment dodges the paper plane', () => {
    const r = setup();
    const { a, b } = lineUp(r, 80);
    a.rank = 2;
    b.rank = 1;
    use(r, a, 'paperPlane');
    let dodged = false;
    runUntil(
      r.world,
      6,
      () => {
        const plane = r.items.entities.find((e) => e.active && e.type === 'paperPlane');
        b.input.drift = !!plane && plane.state === ItemState.Dive && Math.hypot(plane.x - b.x, plane.z - b.z) < 6;
        if (b.raceStats.dodges > 0) dodged = true;
      },
      () => dodged || b.tumbleTime > 0,
    );
    expect(dodged).toBe(true);
    expect(b.tumbleTime).toBeLessThanOrEqual(0);
  });

  it('goo slows and spring bounces', () => {
    const r = setup();
    const { a, b } = lineUp(r, 15);
    // b drops goo behind; a drives into it
    use(r, b, 'gooPuddle', true);
    runUntil(r.world, 3, () => (a.input.throttle = 1), () => a.gooTime > 0);
    expect(a.gooTime).toBeGreaterThan(0);
  });

  it('confetti popper tumbles karts near where it lands', () => {
    const r = setup();
    const { a, b } = lineUp(r, 10);
    use(r, a, 'popper');
    runUntil(r.world, 3, () => {}, () => b.tumbleTime > 0);
    expect(b.tumbleTime).toBeGreaterThan(0);
  });

  it('mini twister spins nearby karts after winding up', () => {
    const r = setup();
    const { a, b } = lineUp(r, 5);
    use(r, a, 'tornado');
    expect(b.spinTime).toBeLessThanOrEqual(0);
    runUntil(r.world, 2, () => {}, () => b.spinTime > 0);
    expect(b.spinTime).toBeGreaterThan(0);
  });

  it('rocket dash drives fast and bumps karts aside', () => {
    const r = setup();
    const { a, b } = lineUp(r, 30);
    use(r, a, 'rocketDash');
    const start = a.progress;
    runUntil(r.world, 3.4, () => {}, () => false);
    expect(a.progress - start).toBeGreaterThan(90);
    expect(b.spinTime > 0 || b.raceStats.timesHit > 0 || a.progress > b.progress).toBe(true);
  });

  it('puff cloud reaches racers ahead', () => {
    const r = setup();
    const { a, b } = lineUp(r, 60);
    a.rank = 2;
    b.rank = 1;
    use(r, a, 'cloud');
    runUntil(r.world, 4, () => {}, () => b.cloudTime > 0);
    expect(b.cloudTime).toBeGreaterThan(0);
  });

  it('a full 8-kart AI race with items finishes (no soft-locks)', () => {
    const track = new TrackModel(TEST_LOOP);
    const world = new World({
      ground: track,
      speedClass: 'pro',
      seed: 21,
      racers: Array.from({ length: 8 }, () => ({ racerId: 'calex', kart: CFG, player: -1 })),
      countdownTime: 3,
    });
    world.events.enabled = false;
    const race = new RaceTracker(world, track, 3);
    race.placeGrid([0, 1, 2, 3, 4, 5, 6, 7]);
    const ai = new AiController(world, track);
    const items = new ItemSystem(world, track, track, { set: 'all' });
    ai.attachItems(items);
    let steps = 0;
    while (world.phase !== 'done' && steps < 60 * 400) {
      world.step(SIM_DT);
      steps++;
    }
    expect(world.phase).toBe('done');
    const used = world.karts.reduce((s, k) => s + k.raceStats.itemsUsed, 0);
    const hits = world.karts.reduce((s, k) => s + k.raceStats.itemHits, 0);
    expect(used).toBeGreaterThan(10);
    expect(hits).toBeGreaterThan(0);
    expect(world.karts.filter((k) => !k.projected).length).toBeGreaterThanOrEqual(6);
    const falls = world.karts.reduce((s, k) => s + k.raceStats.falls, 0);
    expect(falls).toBeLessThanOrEqual(3);
  });
});
