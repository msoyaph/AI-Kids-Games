import { describe, expect, it } from 'vitest';
import { World } from '../../src/sim/world';
import { ArenaModel } from '../../src/sim/arena';
import { ARENAS, findArena } from '../../src/data/arenas';
import { ItemSystem } from '../../src/sim/items/itemSystem';
import { BattleAi } from '../../src/sim/ai/battleDriver';
import { CoinRushRules } from '../../src/sim/coinRush';
import { RACERS } from '../../src/data/racers';
import { SIM_DT } from '../../src/core/loop';
import { makeGroundHit } from '../../src/sim/ground';

function play(arenaId: string, seed: number, count = 6, seconds = 60, idlePlayer = false): { rules: CoinRushRules; world: World; travel: number[] } {
  const arena = new ArenaModel(findArena(arenaId));
  const world = new World({ ground: arena, speedClass: 'pro', seed, racers: RACERS.slice(0, count).map((r, i) => ({ racerId: r.id, kart: { ...r.defaultKart, paint: 'cherry', decal: 'none' }, player: idlePlayer && i === 0 ? 0 : -1 })), countdownTime: 3 });
  world.events.enabled = false;
  const items = new ItemSystem(world, arena, null, { set: 'all', battle: true, boxes: arena.data.itemBoxes.map((b) => ({ x: b.x, y: (b.y ?? 0) + 1.1, z: b.z })) });
  const rules = new CoinRushRules(world, arena, items, seconds);
  rules.placeStart();
  new BattleAi(world, arena, items, rules.coins);
  const travel = world.karts.map(() => 0);
  let steps = 0;
  while (world.phase !== 'done' && steps < 60 * (seconds + 30)) {
    const before = world.karts.map((k) => [k.x, k.z]);
    world.step(SIM_DT);
    world.karts.forEach((k, i) => (travel[i] += Math.hypot(k.x - before[i][0], k.z - before[i][1])));
    steps++;
  }
  return { rules, world, travel };
}

describe('Coin Rush', () => {
  it('Coin Carnival exists, is open from the start and is a proper arena', () => {
    const a = ARENAS.find((x) => x.id === 'coin-carnival');
    expect(a?.unlocked).toBe(true);
    expect(a?.music).toBe('battle5');
  });

  it('AI racers collect coins, the match ends on time and ranks by coins', () => {
    const { rules, world } = play('coin-carnival', 5);
    expect(world.phase).toBe('done');
    expect(rules.timeLeft).toBe(0);
    const total = world.karts.reduce((a, k) => a + k.raceStats.coins, 0);
    expect(total).toBeGreaterThan(20);
    const order = rules.standings();
    for (let i = 1; i < order.length; i++) expect(order[i - 1].score).toBeGreaterThanOrEqual(order[i].score);
    expect(order[0].rank).toBe(1);
    // nobody ends with negative coins, and every kart grabbed at least one
    for (const k of world.karts) {
      expect(k.score).toBeGreaterThanOrEqual(0);
      expect(k.raceStats.coins).toBeGreaterThan(0);
    }
  });

  it('works in every arena (deterministic)', () => {
    for (const a of ARENAS) {
      const r1 = play(a.id, 9);
      const r2 = play(a.id, 9);
      expect(r1.world.karts.map((k) => k.score)).toEqual(r2.world.karts.map((k) => k.score));
      expect(r1.world.karts.reduce((s, k) => s + k.raceStats.coins, 0), a.id).toBeGreaterThan(5);
    }
  });

  it('every AI racer keeps collecting (no circling a coin, no getting wedged) in every arena', () => {
    // a 2-minute match like the game's, the player's kart sitting idle; 4 and 8 karts
    for (const a of ARENAS) {
      for (const [count, seed] of [[4, 1], [8, 7]]) {
        const { world, travel } = play(a.id, seed, count, 120, true);
        for (const k of world.karts.slice(1)) {
          expect(k.raceStats.coins, `${a.id} ${count} karts: ${k.racerId} coins`).toBeGreaterThanOrEqual(6);
          expect(travel[k.index], `${a.id}: ${k.racerId} distance driven`).toBeGreaterThan(600);
        }
      }
    }
  });
});

describe('arena walls', () => {
  it('a kart bumped inside a raised platform or under a ramp end is pushed back out', () => {
    const arena = new ArenaModel(findArena('gumdrop-garden'));
    const hit = makeGroundHit();
    const hint = { ribbon: 0, sample: 0 };
    // just inside the centre platform's edge, at floor level: a wall pushing outwards, not an unreachable floor
    const g = arena.query(9.6, 0, 7.8, hint, hit);
    expect(g.wallHit).toBe(true);
    expect(g.wallNx).toBe(1);
    expect(g.height).toBe(0);
    // on top of the platform it is a floor
    const top = arena.query(5, 2.5, 5, hint, hit);
    expect(top.wallHit).toBe(false);
    expect(top.height).toBeCloseTo(2.4, 5);
    // the tall end of a jump ramp from behind is a wall; its low end is drivable
    const ramp = arena.data.ramps[0];
    expect(arena.query(ramp.x, 0, ramp.z + 7.6, hint, hit).wallHit).toBe(true);
    expect(arena.query(ramp.x, 0, ramp.z + 0.5, hint, hit).wallHit).toBe(false);
  });

  it('coins only appear where a kart can drive: never inside obstacles, on ramps or on unreachable tops', () => {
    for (const a of ARENAS) {
      const { rules } = play(a.id, 3, 4, 10);
      const arena = new ArenaModel(a);
      const hit = makeGroundHit();
      const hint = { ribbon: 0, sample: 0 };
      const spots = (rules as unknown as { spots: Array<{ x: number; y: number; z: number }> }).spots;
      expect(spots.length, a.id).toBeGreaterThan(200);
      for (const p of spots) {
        const g = arena.query(p.x, p.y + 0.5, p.z, hint, hit);
        expect(g.wallHit, `${a.id} spot ${p.x},${p.z}`).toBe(false);
        expect(Math.abs(g.height - p.y), `${a.id} spot ${p.x},${p.z} height`).toBeLessThan(0.01);
      }
    }
  });
});
