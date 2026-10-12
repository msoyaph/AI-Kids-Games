import { describe, expect, it } from 'vitest';
import { mapById } from '../../src/data/maps';
import { Ev } from '../../src/sim/events';
import { DT, Game } from '../../src/sim/Game';
import { UNREACHABLE } from '../../src/sim/flowField';

const game = (id: string): Game => {
  const g = new Game({ map: mapById(id)!, difficulty: 'normal', mode: 'campaign', seed: 4, startCoins: 100_000 });
  return g;
};
const run = (g: Game, s: number): void => {
  for (let i = 0; i < s / DT && g.state === 'playing'; i++) g.step();
};

describe('teleporter gates (Gatefall Causeway, Rift Core)', () => {
  it('route through the gate and walkers come out at its partner', () => {
    const g = game('w5m1');
    const tp = g.grid.teleports[0]!;
    expect(g.flow.next[tp.from]).toBe(tp.to);
    g.sendNextWave();
    let jumps = 0;
    for (let i = 0; i < 40 / DT && jumps === 0; i++) {
      g.step();
      g.events.drain((e) => {
        if (e.type === Ev.Teleport) {
          jumps++;
          expect(Math.floor(e.x2)).toBe(g.grid.cellX(tp.to));
          expect(Math.floor(e.y2)).toBe(g.grid.cellY(tp.to));
        }
      });
    }
    expect(jumps).toBeGreaterThan(0);
  });

  it('Rift Core chains two gates', () => {
    const g = game('w6m3');
    expect(g.grid.teleports).toHaveLength(2);
    for (const s of g.grid.spawns) expect(g.flow.dist[s]!).toBeLessThan(UNREACHABLE);
  });
});

describe('drawbridges (Drawbridge Foundry)', () => {
  it('flip on schedule and the route moves', () => {
    const g = game('w5m2');
    expect(g.grid.bridgePhase).toBe(0);
    const before = g.currentPaths([])[0]!.slice();
    let flips = 0;
    for (let w = 0; w < 6; w++) {
      g.sendNextWave();
      g.events.drain((e) => (flips += e.type === Ev.Terrain ? 1 : 0));
    }
    expect(flips).toBe(1);
    expect(g.grid.bridgePhase).toBe(1);
    const after = g.currentPaths([])[0]!;
    expect(after).not.toEqual(before);
  });

  it('never lets you block a bridge you will need later', () => {
    const g = game('w5m2');
    // the lower bridge is up now; sealing its landing must still be refused
    const lower = g.grid.dynamic.find((d) => d.kind === 'bridgeB')!.cell;
    const landing = lower - 1; // the plate just west of the bridge
    const cx = g.grid.cellX(landing);
    const cy = g.grid.cellY(landing);
    // wall the whole column west of the chasm except the landing row …
    for (let y = 1; y <= 10; y++) if (y !== cy) g.build('arrow', cx, y);
    // … then the landing itself would cut the phase-1 route
    expect(g.canBuild('arrow', cx, cy)).toEqual({ ok: false, reason: 'path' });
  });
});

describe('sky lane (Sky Lane)', () => {
  it('flyers follow the lane from the sky portal', () => {
    const g = game('w5m3');
    const sky = g.grid.skyPath;
    expect(sky.length).toBeGreaterThan(10);
    g.sendNextWave();
    const f = g.debugSpawn('puffbat')!;
    expect(Math.floor(f.x)).toBe(g.grid.cellX(sky[0]!));
    expect(Math.floor(f.y)).toBe(g.grid.cellY(sky[0]!));
    f.hp = f.maxHp = 1e9;
    let maxLane = 0;
    for (let i = 0; i < 6 / DT; i++) {
      g.step();
      maxLane = Math.max(maxLane, f.lane);
      // never strays from the lane row/column by more than a tile
      if (f.alive && f.lane < sky.length) {
        const c = sky[Math.max(0, f.lane - 1)]!;
        expect(Math.abs(f.y - (g.grid.cellY(c) + 0.5))).toBeLessThan(1.6);
      }
    }
    expect(maxLane).toBeGreaterThan(3);
  });
});

describe('twin citadels and shifting ground', () => {
  it('Twin Bastions has two castles and flyers head for the nearer one', () => {
    const g = game('w6m1');
    expect(g.grid.castles).toHaveLength(2);
    g.sendNextWave();
    const f = g.debugSpawn('puffbat')!;
    const near = g.grid.nearestCastle(f.x, f.y);
    expect(f.wx).toBeCloseTo(near.x, 5);
    expect(f.wy).toBeCloseTo(near.y, 5);
  });

  it('Shifting Ground seals the centre and opens the rubble at wave 20', () => {
    const g = game('w6m2');
    const u = g.grid.dynamic.find((d) => d.kind === 'unstable')!.cell;
    const r = g.grid.dynamic.find((d) => d.kind === 'rubble')!.cell;
    expect(g.grid.isOpen(u)).toBe(true);
    expect(g.grid.isOpen(r)).toBe(false);
    for (let w = 0; w < 20; w++) g.sendNextWave();
    expect(g.grid.shifted).toBe(true);
    expect(g.grid.isOpen(u)).toBe(false);
    expect(g.grid.isOpen(r)).toBe(true);
    expect(g.grid.isBuildable(r)).toBe(true);
    for (const s of g.grid.spawns) expect(g.flow.dist[s]!).toBeLessThan(UNREACHABLE);
    run(g, 1);
  });
});
