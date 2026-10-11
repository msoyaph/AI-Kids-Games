import { describe, expect, it } from 'vitest';
import { ALL_MAP_IDS, getMapDef } from '../../src/data/maps';
import { Sim } from '../../src/sim';
import { TER_INFO } from '../../src/sim/terrain';

describe('maps', () => {
  const ctx = { houseLevel: 0 };
  it('every map builds and every warp leads somewhere walkable', () => {
    const sim = Sim.newGame({ name: 'a', farm: 'b', pet: 'dog', petName: 'c', seed: 1 });
    for (const lvl of [0, 1, 2]) sim.state.buildings.houseLevel = lvl;
    sim.state.buildings.houseLevel = 0;
    for (const id of ALL_MAP_IDS()) {
      const def = getMapDef(id, ctx);
      expect(def.w * def.h).toBe(def.ground.length);
      const loc = sim.loc(id);
      for (const w of loc.warps) {
        if (!ALL_MAP_IDS().includes(w.to)) continue; // future areas
        const dest = getMapDef(w.to, ctx);
        const i = w.ty * dest.w + w.tx;
        expect(w.tx >= 0 && w.ty >= 0 && w.tx < dest.w && w.ty < dest.h, `${id} → ${w.to} (${w.tx},${w.ty}) in bounds`).toBe(true);
        expect(TER_INFO[dest.ground[i]].walk, `${id} → ${w.to} (${w.tx},${w.ty}) walkable`).toBe(true);
        const destLoc = sim.loc(w.to);
        expect(destLoc.blocked(w.tx, w.ty), `${id} → ${w.to} (${w.tx},${w.ty}) not blocked`).toBe(false);
        expect(destLoc.warpAtTile(w.tx, w.ty), `${id} → ${w.to} arrival is not itself a warp`).toBeNull();
      }
    }
  });
});
