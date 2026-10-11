import { describe, expect, it } from 'vitest';
import { ALL_MAPS, CAMPAIGN_MAPS } from '../../src/data/maps';
import { WORLDS, mapsOfWorld } from '../../src/data/worlds';
import { FlowField, UNREACHABLE } from '../../src/sim/flowField';
import { Grid, F_BUILD, F_WALK } from '../../src/sim/grid';

describe('maps', () => {
  it('has 12 campaign maps in 4 worlds of 3', () => {
    expect(CAMPAIGN_MAPS).toHaveLength(12);
    for (const w of WORLDS) expect(mapsOfWorld(w.id)).toHaveLength(3);
    expect(new Set(ALL_MAPS.map((m) => m.id)).size).toBe(ALL_MAPS.length);
  });

  it.each(ALL_MAPS.map((m) => [m.id, m] as const))('%s is valid', (_id, map) => {
    const widths = new Set(map.grid.map((r) => r.length));
    expect(widths.size).toBe(1);
    const g = new Grid(map);
    expect(g.goals.length).toBe(4); // 2×2 castle
    const f = new FlowField(g);
    f.compute();
    for (const s of g.spawns) expect(f.dist[s]).toBeLessThan(UNREACHABLE);
    // enough room to build
    let buildable = 0;
    for (let i = 0; i < g.flags.length; i++) if (g.flags[i]! & F_BUILD) buildable++;
    expect(buildable).toBeGreaterThan(40);
    // path maps: creatures only walk on roads
    if (map.style === 'path') {
      for (let i = 0; i < g.flags.length; i++) expect((g.flags[i]! & F_WALK) && (g.flags[i]! & F_BUILD)).toBeFalsy();
    }
    expect(map.story.length).toBeGreaterThan(10);
  });
});
