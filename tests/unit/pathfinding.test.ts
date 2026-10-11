import { describe, expect, it } from 'vitest';
import type { MapDef } from '../../src/data/maps/types';
import { FlowField, UNREACHABLE } from '../../src/sim/flowField';
import { Game } from '../../src/sim/Game';
import { Grid } from '../../src/sim/grid';

function map(grid: string[], style: 'maze' | 'path' = 'maze'): MapDef {
  return { id: 'test', name: 'Test', world: 1, theme: 'meadow', style, story: '', grid, waves: 3, startCoins: 10000 };
}

const OPEN = map(['S.....CC', '......CC', '........', '........']);

describe('FlowField', () => {
  it('computes octile distances to the castle', () => {
    const g = new Grid(OPEN);
    const f = new FlowField(g);
    f.compute();
    expect(f.dist[g.idx(6, 0)]).toBe(0);
    expect(f.dist[g.idx(5, 0)]).toBe(1);
    expect(f.dist[g.idx(0, 0)]).toBe(6);
    expect(f.dist[g.idx(0, 3)]).toBeCloseTo(4 + 2 * Math.SQRT2, 5);
  });

  it('follows next pointers from spawn to castle', () => {
    const g = new Grid(OPEN);
    const f = new FlowField(g);
    f.compute();
    const path = f.pathFrom(g.spawns[0]!);
    expect(path[0]).toBe(g.spawns[0]);
    expect(f.dist[path[path.length - 1]!]).toBe(0);
    expect(path.length).toBe(7);
  });

  it('never cuts diagonally between two blocked corners', () => {
    const g = new Grid(map(['S#..', '#...', '...C']));
    const f = new FlowField(g);
    f.compute();
    // S is boxed in by two rocks touching only at a corner → unreachable
    expect(f.dist[g.spawns[0]!]).toBe(UNREACHABLE);
  });

  it('routes along fixed roads only', () => {
    const g = new Grid(map(['S==oo', 'oo=oo', 'oo===', 'oooCC'], 'path'));
    const f = new FlowField(g);
    f.compute();
    expect(f.spawnsConnected()).toBe(true);
    const path = f.pathFrom(g.spawns[0]!);
    for (const c of path) expect(g.flags[c]! & 1).toBeTruthy();
  });
});

describe('build path check', () => {
  it('blocks a placement that would seal the path', () => {
    const corridor = map(['T.T', 'S.C', 'T.T']);
    // cell (1,1) is the only link between spawn and castle
    const game = new Game({ map: corridor, difficulty: 'normal', mode: 'campaign', startCoins: 1000 });
    expect(game.canBuild('arrow', 1, 1)).toEqual({ ok: false, reason: 'path' });
    expect(game.canBuild('arrow', 1, 0).ok).toBe(true);
  });

  it('lengthens the path when towers are placed (mazing)', () => {
    const game = new Game({ map: map(['......', 'S....C', '......']), difficulty: 'normal', mode: 'campaign', startCoins: 1000 });
    const before = game.pathLength();
    expect(game.build('arrow', 2, 1)).not.toBeNull();
    expect(game.build('arrow', 2, 0)).not.toBeNull();
    expect(game.pathLength()).toBeGreaterThan(before);
    // the last gap cannot be closed
    expect(game.canBuild('arrow', 2, 2).reason).toBe('path');
  });

  it('refuses to trap a creature that is already walking', () => {
    const game = new Game({ map: map(['...#', 'S..C', '...#']), difficulty: 'normal', mode: 'campaign', startCoins: 1000 });
    // build a ring around (1,1) except one gap; a creature inside must keep a way out
    const e = game.debugSpawn('gloop')!;
    e.x = 1.5;
    e.y = 0.5;
    e.cell = game.grid.idx(1, 0);
    e.wcell = game.grid.idx(1, 0);
    e.wx = 1.5;
    e.wy = 0.5;
    expect(game.build('arrow', 0, 0)).not.toBeNull();
    expect(game.build('arrow', 2, 0)).not.toBeNull();
    // (1,1) is now the creature's only exit
    expect(game.canBuild('arrow', 1, 1).reason).toBe('path');
  });

  it('selling restores the shorter path', () => {
    const game = new Game({ map: map(['......', 'S....C', '......']), difficulty: 'normal', mode: 'campaign', startCoins: 1000 });
    const before = game.pathLength();
    const t = game.build('arrow', 2, 1)!;
    expect(game.pathLength()).toBeGreaterThan(before);
    game.sell(t);
    expect(game.pathLength()).toBeCloseTo(before, 6);
  });
});
