import { describe, expect, it } from 'vitest';
import { Sim } from '../../src/sim';
import { canDescend, elevatorFloors, enterFloor } from '../../src/sim/mine';
import { bonk, combat, critterDamage } from '../../src/sim/critters';
import { findPath } from '../../src/core/pathfind';
import { TILE } from '../../src/core/math';
import { count } from '../../src/sim/inventory';
import { useTool } from '../../src/sim/tools';

const mk = (seed = 5) => Sim.newGame({ name: 'Pip', farm: 'Daisy', pet: 'dog', petName: 'Rex', seed });

describe('mine', () => {
  it('every floor has a reachable way down', () => {
    for (const seed of [1, 2, 3]) {
      const sim = mk(seed);
      sim.state.story.done.push('minerals');
      for (let f = 1; f < 40; f++) {
        enterFloor(sim, f);
        const loc = sim.here;
        const start = loc.def.points.start;
        let target: [number, number] | null = null;
        for (const [i, o] of loc.objs) if (o.k === 'ladder' || o.hid) target = [i % loc.w, Math.floor(i / loc.w)];
        expect(target, `seed ${seed} floor ${f} has a ladder`).not.toBeNull();
        // reachable when rocks are cleared: path over static terrain only
        const grid = { w: loc.w, h: loc.h, blocked: (x: number, y: number) => loc.staticBlocked(x, y) };
        expect(findPath(grid, start.x, start.y, target![0], target![1], 20000), `seed ${seed} floor ${f} ladder reachable`).not.toBeNull();
      }
    }
  });

  it('the Mine Lift gates floors below 20', () => {
    const sim = mk();
    enterFloor(sim, 20);
    expect(canDescend(sim).ok).toBe(false);
    sim.state.mine.elevator = 35;
    expect(elevatorFloors(sim).filter((f) => f.floor > 20).every((f) => f.locked)).toBe(true);
    sim.state.story.done.push('minerals');
    expect(canDescend(sim).ok).toBe(true);
    expect(elevatorFloors(sim).some((f) => f.floor === 25 && !f.locked)).toBe(true);
  });

  it('floor 40 holds the Heartstone', () => {
    const sim = mk();
    enterFloor(sim, 40);
    const found = [...sim.here.objs.values()].some((o) => o.k === 'heartstone');
    expect(found).toBe(true);
  });

  it('combat is mild: critters poof after a few bonks and never deal big damage', () => {
    const sim = mk();
    sim.p.tools.bonk = 0;
    enterFloor(sim, 12);
    const cb = combat(sim);
    expect(cb.critters.length).toBeGreaterThan(0);
    for (const c of cb.critters) expect(critterDamage(c)).toBeLessThanOrEqual(20);
    const c = cb.critters[0];
    sim.p.x = c.x;
    sim.p.y = c.y + 12;
    sim.p.dir = 3;
    let swings = 0;
    while (!c.dead && swings < 20) {
      c.x = sim.p.x;
      c.y = sim.p.y - 12;
      bonk(sim, 0, -1);
      swings++;
    }
    expect(c.dead).toBe(true);
    expect(swings).toBeLessThanOrEqual(8);
  });

  it('fainting never loses items or coins', () => {
    const sim = mk();
    enterFloor(sim, 2);
    sim.p.coins = 1234;
    const inv = JSON.stringify(sim.p.inv);
    let fainted = false;
    sim.ev.on('faint', () => (fainted = true));
    const cb = combat(sim);
    const c = cb.critters[0];
    sim.p.hp = 1;
    c.hidden = false;
    c.x = sim.p.x;
    c.y = sim.p.y;
    cb.invuln = 0;
    sim.update(0.05);
    expect(fainted).toBe(true);
    expect(sim.p.coins).toBe(1234);
    expect(JSON.stringify(sim.p.inv)).toBe(inv);
    void TILE;
  });
});

describe('quarry rocks', () => {
  it('give real items (layer clamps to earth outside the mine)', () => {
    const sim = Sim.newGame({ name: 'Q', farm: 'Q', pet: 'cat', petName: 'Q', seed: 5 });
    sim.state.story.done.push('forage');
    sim.refreshLoc('mountain');
    const q = sim.loc('quarry');
    sim.warpTo('quarry', 5, 5, 0);
    let broke = 0;
    for (let y = 0; y < q.h; y++)
      for (let x = 0; x < q.w; x++) {
        if (q.inb(x, y) && !q.obj(x, y) && !q.blocked(x, y) && broke < 20) {
          q.setObj(x, y, { k: 'rock', id: 'geode0', hp: 1 });
          useTool(sim, 'pick', x, y);
          broke++;
        }
      }
    expect(broke).toBe(20);
    expect(sim.p.inv.every((s) => !s || typeof s.id === 'string')).toBe(true);
    expect(count(sim.p.inv, 'geode')).toBeGreaterThan(0);
  });
});
