import { describe, expect, it } from 'vitest';
import { World } from '../../src/sim/world';
import { ArenaModel } from '../../src/sim/arena';
import { ARENAS, findArena } from '../../src/data/arenas';
import { ItemSystem } from '../../src/sim/items/itemSystem';
import { BattleAi } from '../../src/sim/ai/battleDriver';
import { CoinRushRules } from '../../src/sim/coinRush';
import { RACERS } from '../../src/data/racers';
import { SIM_DT } from '../../src/core/loop';

function play(arenaId: string, seed: number): { rules: CoinRushRules; world: World } {
  const arena = new ArenaModel(findArena(arenaId));
  const world = new World({ ground: arena, speedClass: 'pro', seed, racers: RACERS.slice(0, 6).map((r) => ({ racerId: r.id, kart: { ...r.defaultKart, paint: 'cherry', decal: 'none' }, player: -1 })), countdownTime: 3 });
  world.events.enabled = false;
  const items = new ItemSystem(world, arena, null, { set: 'all', battle: true, boxes: arena.data.itemBoxes.map((b) => ({ x: b.x, y: (b.y ?? 0) + 1.1, z: b.z })) });
  const rules = new CoinRushRules(world, arena, items, 60);
  rules.placeStart();
  new BattleAi(world, arena, items, rules.coins);
  let steps = 0;
  while (world.phase !== 'done' && steps < 60 * 90) {
    world.step(SIM_DT);
    steps++;
  }
  return { rules, world };
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
});
