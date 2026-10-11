import { describe, expect, it } from 'vitest';
import { generateIsland } from '../src/world/worldgen';
import { Ground, Region } from '../src/world/types';
import { newGameState } from '../src/sim/state';
import { World } from '../src/sim/world';
import { moveCircle } from '../src/sim/player';

const SEEDS = Array.from({ length: 24 }, (_, i) => i * 7919 + 13);

function reachable(w: World, from: number): Set<number> {
  const seen = new Set<number>([from]);
  const q = [from];
  while (q.length) {
    const j = q.pop()!;
    const x = j % w.size, z = (j / w.size) | 0;
    for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      if (!w.inb(x + dx!, z + dz!)) continue;
      const k = w.idx(x + dx!, z + dz!);
      if (seen.has(k) || w.blocked(j, k)) continue;
      seen.add(k);
      q.push(k);
    }
  }
  return seen;
}

describe('worldgen', () => {
  it('same seed yields the same island', () => {
    const a = generateIsland(777), b = generateIsland(777);
    expect(Buffer.from(a.ground)).toEqual(Buffer.from(b.ground));
    expect(Buffer.from(a.height)).toEqual(Buffer.from(b.height));
    expect(a.objects).toEqual(b.objects);
    expect(a.lots).toEqual(b.lots);
  });

  it('different seeds yield different islands', () => {
    const a = generateIsland(1), b = generateIsland(2);
    expect(Buffer.from(a.ground)).not.toEqual(Buffer.from(b.ground));
  });

  it.each(SEEDS)('seed %i has all required features', (seed) => {
    const g = generateIsland(seed);
    const count = (pred: (i: number) => boolean) => {
      let n = 0;
      for (let i = 0; i < g.size * g.size; i++) if (pred(i)) n++;
      return n;
    };
    expect(count((i) => g.ground[i] === Ground.River)).toBeGreaterThan(40);
    expect(count((i) => g.ground[i] === Ground.Pond)).toBeGreaterThan(10);
    expect(count((i) => g.ground[i] === Ground.Sand)).toBeGreaterThan(100);
    expect(count((i) => g.region[i] === Region.West)).toBeGreaterThan(800);
    expect(count((i) => g.region[i] === Region.NE)).toBeGreaterThan(150);
    expect(count((i) => g.region[i] === Region.SE)).toBeGreaterThan(150);
    expect(count((i) => g.region[i] === Region.Plateau)).toBeGreaterThan(300);
    expect(count((i) => g.region[i] === Region.Summit)).toBeGreaterThan(50);
    expect(g.objects.filter((o) => o.k === 'tree' || o.k === 'pine').length).toBeGreaterThan(60);
    expect(g.objects.filter((o) => o.k === 'fruitTree').length).toBeGreaterThanOrEqual(5);
    expect(g.objects.filter((o) => o.k === 'rock').length).toBeGreaterThanOrEqual(6);
    // lots are on West lowland, lighthouse on the summit
    for (const id of ['plaza', 'hall', 'shop', 'museum', 'home'] as const) {
      const r = g.lots[id];
      for (let z = r.z; z < r.z + r.d; z++)
        for (let x = r.x; x < r.x + r.w; x++) {
          expect(g.region[z * g.size + x]).toBe(Region.West);
          expect(g.height[z * g.size + x]).toBe(0);
        }
    }
    const lh = g.lots.lighthouse;
    expect(g.region[lh.z * g.size + lh.x]).toBe(Region.Summit);
  });

  it.each(SEEDS.slice(0, 10))('seed %i: town reachable from the dock, other regions are not', (seed) => {
    const st = newGameState(seed, 'Test');
    const w = new World(st);
    const start = w.idx(Math.floor(st.player.x), Math.floor(st.player.z));
    const r = reachable(w, start);
    const g = w.gen;
    // every lot door (tile south of lot centre) is reachable
    for (const id of ['hall', 'shop', 'museum', 'home'] as const) {
      const lot = g.lots[id];
      const door = w.idx(lot.x + Math.floor(lot.w / 2), lot.z + lot.d);
      expect(r.has(door), `${id} door`).toBe(true);
    }
    // without bridges/ramps the other regions are unreachable
    for (const k of r) {
      expect([Region.West, Region.None]).toContain(g.region[k]);
    }
  });
});

describe('player collision', () => {
  it('cannot walk into the sea or through trees', () => {
    const st = newGameState(13, 'T');
    const w = new World(st);
    const pos = { x: st.player.x, z: st.player.z };
    // walk south off the end of the dock
    moveCircle(w, pos, 0, 20);
    const t = w.idx(Math.floor(pos.x), Math.floor(pos.z));
    expect(w.isWater(t)).toBe(false);
    // find a tree with free tile west of it and walk east into it
    const tree = Object.entries(st.world.objects).find(([k, o]) => {
      const i = +k;
      return o.k === 'tree' && !w.blocked(i - 1, i - 1) && w.height(i) === 0 && !w.isWater(i - 1) && !w.obj(i - 1) && !w.structure(i - 1) && !w.obj(i - 2) && !w.isWater(i - 2);
    })!;
    const ti = +tree[0];
    const p2 = { x: (ti % w.size) - 1.5, z: Math.floor(ti / w.size) + 0.5 };
    moveCircle(w, p2, 3, 0);
    expect(p2.x).toBeLessThan((ti % w.size) - 0.2);
  });
});
