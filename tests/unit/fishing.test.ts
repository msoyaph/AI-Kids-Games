import { describe, expect, it } from 'vitest';
import { Sim } from '../../src/sim';
import { FISH, FORAGE } from '../../src/data/fish';
import { Reel, autoReel, biteable, landCatch, pickCatch, reelParams } from '../../src/sim/fishing';
import { placeItem, interactAt } from '../../src/sim/actions';
import { count } from '../../src/sim/inventory';
import { Rng } from '../../src/core/rng';

const mk = () => Sim.newGame({ name: 'Pip', farm: 'Daisy', pet: 'cat', petName: 'Mochi', seed: 31 });

describe('fishing & foraging', () => {
  it('has 30+ fish across every water type', () => {
    expect(FISH.length).toBeGreaterThanOrEqual(30);
    for (const z of ['river', 'lake', 'pond', 'ocean', 'pier', 'mine']) expect(FISH.some((f) => f.zones.includes(z as never)), z).toBe(true);
    for (let s = 0; s < 4; s++) expect(FISH.some((f) => f.seasons.includes(s) && f.zones.includes('river'))).toBe(true);
  });

  it('fish bite by season, weather and time of day', () => {
    const sim = mk();
    sim.state.weather = 'sun';
    sim.state.min = 10 * 60;
    const springDay = biteable(sim, 'river').map((f) => f.id);
    expect(springDay).toContain('sunfish');
    expect(springDay).not.toContain('catfish'); // rain only
    expect(springDay).not.toContain('bream'); // night only
    sim.state.weather = 'rain';
    expect(biteable(sim, 'river').map((f) => f.id)).toContain('catfish');
    sim.state.min = 21 * 60;
    expect(biteable(sim, 'river').map((f) => f.id)).toContain('bream');
    sim.state.day = 30; // winter
    sim.state.weather = 'snow';
    sim.state.min = 12 * 60;
    expect(biteable(sim, 'lake').map((f) => f.id)).toContain('crystalCarp');
  });

  it('there is always something to catch somewhere (or junk)', () => {
    const sim = mk();
    for (let day = 0; day < 40; day++) {
      sim.state.day = day;
      for (const min of [7 * 60, 13 * 60, 22 * 60]) {
        sim.state.min = min;
        const c = pickCatch(sim, 'river', new Rng(day * 100 + min));
        expect(c.id).toBeTruthy();
      }
    }
  });

  it('a steady player lands easy fish; the reel never loses items', () => {
    const sim = mk();
    sim.p.tools.rod = 0;
    let caught = 0;
    for (let i = 0; i < 20; i++) {
      const r = new Reel(reelParams(sim, 'chub'), i + 1);
      if (autoReel(r) === 'caught') caught++;
    }
    expect(caught).toBeGreaterThanOrEqual(18);
    const hard = new Reel(reelParams(sim, 'octopus'), 7);
    autoReel(hard);
    expect(hard.done).not.toBeNull();
    const before = sim.p.inv.filter(Boolean).length;
    landCatch(sim, { kind: 'fish', id: 'chub' }, true);
    expect(count(sim.p.inv, 'chub')).toBe(1);
    expect(sim.p.inv.filter(Boolean).length).toBe(before + 1);
    expect(sim.state.col.fish.chub).toBe(1);
  });

  it('crab pots catch something overnight', () => {
    const sim = mk();
    sim.warpTo('farm', 43, 34, 2);
    const farm = sim.here;
    // find a pond tile next to land
    let spot: [number, number] | null = null;
    for (let y = 28; y < 42 && !spot; y++) for (let x = 40; x < 60 && !spot; x++) {
      if (farm.isWater(x, y) && !farm.isWater(x - 1, y)) spot = [x, y];
    }
    expect(spot).not.toBeNull();
    sim.p.inv[12] = { id: 'crabPot', n: 1, q: 0 };
    sim.p.inv[13] = { id: 'bait', n: 3, q: 0 };
    expect(placeItem(sim, 'crabPot', spot![0], spot![1]).ok).toBe(true);
    interactAt(sim, spot![0], spot![1]); // bait it
    sim.sleep();
    sim.warpTo('farm', spot![0] - 1, spot![1], 2);
    const o = sim.loc('farm').obj(spot![0], spot![1])!;
    expect(o.out).toBeTruthy();
  });

  it('forage spawns each morning and can be picked', () => {
    const sim = mk();
    sim.sleep();
    const forest = sim.loc('forest');
    const f = [...forest.objs.entries()].find(([, o]) => o.k === 'forage');
    expect(f).toBeDefined();
    expect(FORAGE.length).toBeGreaterThanOrEqual(16);
    sim.warpTo('forest', 30, 2, 0);
    const [i] = f!;
    const r = interactAt(sim, i % forest.w, Math.floor(i / forest.w));
    expect(r.type).toBe('forage');
  });
});
