import { describe, expect, it } from 'vitest';
import { AREAS, areaAt, H, levelAt, RIVER_X0, tileAt, topY, W, WATER_Y } from '../../src/sim/map';

describe('the farm map', () => {
  it('never steps more than one terrace level between neighbours, diagonals too (so no edge hides a tile’s middle)', () => {
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      for (const [nx, nz] of [[x + 1, z], [x, z + 1], [x + 1, z + 1], [x - 1, z + 1]] as const) {
        if (nx < 0 || nx >= W || nz >= H) continue;
        expect(Math.abs(levelAt(x, z) - levelAt(nx, nz)), `${x},${z} → ${nx},${nz}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('has six farm areas that do not overlap, each big enough to farm', () => {
    const seen = new Map<string, string>();
    for (const a of AREAS) {
      expect((a.x1 - a.x0 + 1) * (a.z1 - a.z0 + 1)).toBeGreaterThanOrEqual(200);
      for (let z = a.z0; z <= a.z1; z++) for (let x = a.x0; x <= a.x1; x++) {
        expect(seen.has(`${x},${z}`)).toBe(false);
        seen.set(`${x},${z}`, a.id);
      }
    }
    expect(AREAS.map(a => a.id).sort()).toEqual(['hilltop', 'home', 'meadow', 'orchard', 'pond', 'riverside']);
  });

  it('puts the home plot beside the river, where the boat docks', () => {
    const home = AREAS.find(a => a.id === 'home')!;
    expect(home.x1 + 1).toBe(RIVER_X0);
    for (let z = home.z0; z <= home.z1; z++) expect(tileAt(RIVER_X0, z).water).toBe(true);
  });

  it('has a pond of water inside the Duck Pond area, with land all around it', () => {
    let water = 0;
    for (let z = 0; z < H; z++) for (let x = 0; x < 20; x++) if (tileAt(x, z).water) { water++; expect(areaAt(x, z)).toBe('pond'); }
    expect(water).toBeGreaterThan(40);
  });

  it('meets taps on water at the surface and on land at the terrace top', () => {
    expect(topY(RIVER_X0, 10)).toBe(WATER_Y);
    expect(topY(40, 40)).toBe(0);
    expect(topY(25, 25)).toBe(0.5);
    expect(topY(25, 5)).toBe(1);
  });
});
