import { describe, expect, it } from 'vitest';
import { pickTile, type Project } from '../src/input/tapmove';
import { pitchTent } from '../src/sim/housing';
import { makeGame } from './helpers';

// A camera like the game's: looking north from the south and above, so a tile's depth is short on screen
// and anything standing up hides the ground just behind it.
const project: Project = (x, y, z) => ({ x: x * 40, y: z * 12 - y * 36, visible: true });

describe('tap picking', () => {
  it('a tap on the workbench picks the workbench, not the ground hidden behind it', () => {
    const g = makeGame(31);
    pitchTent(g);
    const bench = g.state.world.structures.find((s) => s.type === 'workbench')!;
    const w = g.world;
    g.state.player.x = bench.x + 0.5;
    g.state.player.z = bench.z + 3.5;
    const y = w.surfaceY(bench.x + 0.5, bench.z + 0.5);
    for (const lift of [0.15, 0.3, 0.45, 0.6]) {
      const s = project(bench.x + 0.5, y + lift, bench.z + 0.5);
      const pick = pickTile(g, project, s.x, s.y);
      expect(pick?.tile, `lift ${lift}`).toBe(w.idx(bench.x, bench.z));
    }
    // the ground in front of it is still the ground
    const f = project(bench.x + 0.5, w.surfaceY(bench.x + 0.5, bench.z + 1.5), bench.z + 1.5);
    expect(pickTile(g, project, f.x, f.y)?.tile).toBe(w.idx(bench.x, bench.z + 1));
  });
});
