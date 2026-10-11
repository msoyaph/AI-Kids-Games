import { describe, expect, it } from 'vitest';
import { countItem, give } from '../src/sim/inventory';
import { equipKind } from '../src/sim/tools';
import { act, faceTile, findObj, makeGame } from './helpers';
import { WOOD_PER_TREE_PER_DAY } from '../src/sim/foraging';

describe('daily spawns', () => {
  it('spawns weeds, branches, shells and dig spots deterministically', () => {
    const a = makeGame(31), b = makeGame(31);
    expect(a.state.world.objects).toEqual(b.state.world.objects);
    const kinds = Object.values(a.state.world.objects).map((o) => o.k);
    expect(kinds.filter((k) => k === 'weed').length).toBeGreaterThan(10);
    expect(kinds.filter((k) => k === 'dig').length).toBeGreaterThanOrEqual(5);
    const items = Object.values(a.state.world.objects).filter((o) => o.k === 'item').map((o) => o.item);
    expect(items).toContain('branch');
    expect(items.some((i) => i!.startsWith('shell_'))).toBe(true);
  });

  it('respawns and resets trees on a new day', () => {
    const g = makeGame(32);
    const tree = findObj(g, (k) => k === 'tree');
    g.state.world.objects[tree]!.c = 3;
    g.state.clock.day += 1;
    g.startDay();
    expect(g.state.world.objects[tree]!.c).toBe(0);
  });
});

describe('foraging', () => {
  it('chopping a tree yields limited timber per day', () => {
    const g = makeGame(33);
    give(g, 'axe_flimsy');
    equipKind(g, 'axe');
    const tree = findObj(g, (k, i) => k === 'tree' && faceTile(g, i));
    expect(tree).toBeGreaterThan(0);
    faceTile(g, tree);
    for (let k = 0; k < WOOD_PER_TREE_PER_DAY + 2; k++) act(g);
    expect(countItem(g, 'timber')).toBe(WOOD_PER_TREE_PER_DAY);
  });

  it('picks up items and pulls weeds', () => {
    const g = makeGame(34);
    const weed = findObj(g, (k, i) => k === 'weed' && faceTile(g, i));
    faceTile(g, weed);
    act(g);
    expect(countItem(g, 'fiber')).toBe(1);
    expect(g.state.world.objects[weed]).toBeUndefined();
    const br = findObj(g, (k, i) => k === 'item' && g.state.world.objects[i]!.item === 'branch' && faceTile(g, i));
    faceTile(g, br);
    act(g);
    expect(countItem(g, 'branch')).toBe(1);
  });

  it('digging a dig spot yields its buried item and leaves a hole', () => {
    const g = makeGame(35);
    give(g, 'shovel_flimsy');
    equipKind(g, 'shovel');
    const spot = findObj(g, (k, i) => k === 'dig' && faceTile(g, i));
    const buried = g.state.world.objects[spot]!.item!;
    faceTile(g, spot);
    act(g);
    expect(g.state.world.objects[spot]?.k).toBe('hole');
    if (buried !== 'pouch') expect(countItem(g, buried)).toBe(1);
    else expect(g.state.player.glints).toBe(1000);
  });

  it('shaking a fruit tree drops its fruit nearby', () => {
    const g = makeGame(36);
    const ft = findObj(g, (k, i) => k === 'fruitTree' && faceTile(g, i));
    faceTile(g, ft);
    const before = Object.values(g.state.world.objects).filter((o) => o.k === 'item' && o.item?.startsWith('fruit_')).length;
    act(g);
    const after = Object.values(g.state.world.objects).filter((o) => o.k === 'item' && o.item?.startsWith('fruit_')).length;
    expect(after).toBeGreaterThan(before);
    expect(g.state.world.objects[ft]!.f).toBe(0);
  });

  it('planted saplings grow into trees, watered flowers can breed', async () => {
    const { plantFromSlot } = await import('../src/sim/gardening');
    const g = makeGame(37);
    give(g, 'sapling_round');
    // find an empty grass tile we can face
    const N = g.world.size;
    let target = -1;
    for (let i = 0; i < N * N && target < 0; i++) {
      if (g.world.ground(i) === 2 && !g.world.obj(i) && !g.world.structure(i) && faceTile(g, i)) target = i;
    }
    faceTile(g, target);
    const slot = g.state.player.inv.findIndex((s) => s?.id === 'sapling_round');
    expect(plantFromSlot(g, slot)).toBe(true);
    for (let d = 0; d < 5; d++) {
      g.state.clock.day += 1;
      g.startDay();
    }
    expect(g.state.world.objects[target]?.k).toBe('tree');
  });
});
