import { describe, expect, it } from 'vitest';
import { makeGame } from './helpers';
import { computeBridge, computeRamp } from '../src/sim/build';
import type { Placement } from '../src/sim/placement';
import { Region } from '../src/world/types';
import type { Game } from '../src/sim/game';
import { breedResult } from '../src/data/gardening';
import { dailyGarden } from '../src/sim/gardening';

function anyValid(g: Game, region: number, compute: (g: Game, p: Placement) => void, needLevel?: number): boolean {
  const w = g.world;
  const pl: Placement = { kind: 'ramp', rect: null, extra: null, valid: false, reason: '', compute };
  for (let i = 0; i < w.size * w.size; i++) {
    if (w.region(i) !== region || !w.standable(i)) continue;
    for (const f of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      g.state.player.x = (i % w.size) + 0.5;
      g.state.player.z = ((i / w.size) | 0) + 0.5;
      g.state.player.level = w.height(i);
      g.state.player.facing = f;
      compute(g, pl);
      if (pl.valid && (needLevel === undefined || pl.level === needLevel)) return true;
    }
  }
  return false;
}

describe('every island supports the story', () => {
  for (const seed of [1, 7, 42, 99, 123, 777, 2024, 31337, 4242, 90210]) {
    it(`seed ${seed}: a bridge site and ramp sites exist`, () => {
      const g = makeGame(seed);
      expect(anyValid(g, Region.West, computeBridge)).toBe(true);
      expect(anyValid(g, Region.West, computeRamp)).toBe(true);
      expect(anyValid(g, Region.Plateau, computeRamp, 1)).toBe(true);
    });
  }
});

describe('flower breeding', () => {
  it('watered neighbouring flowers eventually produce a hybrid', () => {
    expect(breedResult(0, 2)?.child).toBe(4);
    const g = makeGame(55);
    const w = g.world;
    // find a 3x3 patch of free grass
    let base = -1;
    for (let i = 0; i < w.size * w.size && base < 0; i++) {
      const x = i % w.size, z = (i / w.size) | 0;
      let ok = true;
      for (let dz = 0; dz < 3 && ok; dz++) for (let dx = 0; dx < 4 && ok; dx++) {
        if (!w.inb(x + dx, z + dz)) ok = false;
        else {
          const j = w.idx(x + dx, z + dz);
          if (w.ground(j) !== 2 || w.obj(j) || w.structure(j) || w.height(j) !== 0) ok = false;
        }
      }
      if (ok) base = i;
    }
    const a = base + w.size, b = base + w.size + 1;
    let bred = 0;
    g.bus.on('flowerBred', () => bred++);
    for (let d = 0; d < 30 && !bred; d++) {
      g.state.world.objects[a] = { k: 'flower', v: 0 * 16 + 0, g: 3, w: 1 };
      g.state.world.objects[b] = { k: 'flower', v: 0 * 16 + 2, g: 3, w: 1 };
      g.state.clock.day += 1;
      dailyGarden(g);
    }
    expect(bred).toBeGreaterThan(0);
  });
});
