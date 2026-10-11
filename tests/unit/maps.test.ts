import { describe, expect, it } from 'vitest';
import { ALL_MAPS, CAMPAIGN_MAPS } from '../../src/data/maps';
import { WORLDS, mapsOfWorld } from '../../src/data/worlds';
import { FlowField, UNREACHABLE } from '../../src/sim/flowField';
import { Grid, F_BUILD, F_WALK } from '../../src/sim/grid';

describe('maps', () => {
  it('has 18 campaign maps in 6 worlds of 3', () => {
    expect(CAMPAIGN_MAPS).toHaveLength(18);
    expect(WORLDS).toHaveLength(6);
    for (const w of WORLDS) expect(mapsOfWorld(w.id)).toHaveLength(3);
    expect(new Set(ALL_MAPS.map((m) => m.id)).size).toBe(ALL_MAPS.length);
  });

  it.each(ALL_MAPS.map((m) => [m.id, m] as const))('%s is valid', (_id, map) => {
    const widths = new Set(map.grid.map((r) => r.length));
    expect(widths.size).toBe(1);
    const g = new Grid(map);
    expect(g.goals.length).toBe(4 * g.castles.length); // 2×2 castles
    expect(g.castles.length).toBeGreaterThanOrEqual(1);
    expect(g.castles.length).toBeLessThanOrEqual(2);
    const f = new FlowField(g);
    // every terrain state the map can reach must connect every spawn
    const phases = map.events?.bridgeWaves?.length ? [0, 1] : [0];
    const shifts = map.events?.shiftWave !== undefined ? [false, true] : [false];
    for (const p of phases)
      for (const sh of shifts) {
        g.applyTerrain(p, sh);
        f.compute();
        for (const s of g.spawns) expect(f.dist[s], `${map.id} phase ${p} shifted ${sh}`).toBeLessThan(UNREACHABLE);
      }
    g.applyTerrain(0, false);
    f.compute();
    // gates come in pairs and the sky lane ends next to a castle
    for (const tp of g.teleports) expect(tp.from).not.toBe(tp.to);
    if (g.skyPath.length) {
      const last = g.skyPath[g.skyPath.length - 1]!;
      const c = g.nearestCastle(g.cellX(last) + 0.5, g.cellY(last) + 0.5);
      expect(Math.hypot(c.x - g.cellX(last) - 0.5, c.y - g.cellY(last) - 0.5)).toBeLessThan(2.5);
    }
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
