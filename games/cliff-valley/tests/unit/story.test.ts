import { describe, expect, it } from 'vitest';
import { Sim } from '../../src/sim';
import { BOARDS } from '../../src/data/boards';
import { tryItem } from '../../src/data/items';
import { boardDone, donate, donatable, finaleReady, finaleToday, placeHeartstone } from '../../src/sim/story';
import { festivalToday, judgeEntry } from '../../src/sim/festivals';
import { npcs, resetNpcs } from '../../src/sim/npcs';
import { shopOpen } from '../../src/sim/shops';
import { getMapDef } from '../../src/data/maps';
import { Ter } from '../../src/sim/terrain';

const mk = () => Sim.newGame({ name: 'Pip', farm: 'Daisy', pet: 'dog', petName: 'Rex', seed: 51 });

/** Fill a board using the first `need` options of each bundle. */
function fillBoard(sim: Sim, id: string): void {
  const bd = BOARDS.find((b) => b.id === id)!;
  for (const b of bd.bundles) {
    for (let k = 0; k < b.need; k++) {
      const o = b.options[k];
      const item = o.items?.[0] ?? (o.prefix ? o.prefix[0] + 'strawberry' : o.cat === 'food' ? 'pancakes' : o.cat === 'fruit' ? 'strawberry' : 'radish');
      sim.p.inv[20] = { id: item, n: o.n, q: o.q ?? 0 };
      const can = donatable(sim, id, b.id).find(([oi]) => oi === k);
      expect(can, `${id}.${b.id} option ${k} (${item})`).toBeDefined();
      expect(donate(sim, id, b.id, k, can![1]).ok).toBe(true);
    }
  }
}

describe('story', () => {
  it('every board option names real items', () => {
    for (const bd of BOARDS)
      for (const b of bd.bundles) {
        expect(b.need).toBeLessThanOrEqual(b.options.length);
        for (const o of b.options) for (const id of o.items ?? []) expect(tryItem(id), `${bd.id}.${b.id}: ${id}`).toBeDefined();
      }
  });

  it('completing a board repairs the valley the next morning', () => {
    const sim = mk();
    sim.p.inv = new Array(36).fill(null);
    fillBoard(sim, 'forage');
    expect(boardDone(sim, 'forage')).toBe(true);
    expect(sim.state.story.done).not.toContain('forage');
    sim.sleep();
    expect(sim.state.story.done).toContain('forage');
    expect(sim.state.flags['board.forage']).toBe(1);
    const mt = sim.loc('mountain');
    expect(mt.ter(9, 16)).toBe(Ter.BRIDGE);
  });

  it('the greenhouse, pier, train and mine lift open after their boards', () => {
    const sim = mk();
    sim.p.inv = new Array(36).fill(null);
    for (const id of ['crops', 'fish', 'animal', 'minerals']) fillBoard(sim, id);
    sim.sleep();
    expect(sim.loc('farm').warps.some((w) => w.to === 'greenhouse')).toBe(true);
    const beach = getMapDef('beach', sim.mapCtx());
    expect(beach.waterZones?.some((z) => z.zone === 'pier')).toBe(true);
    expect(sim.loc('town').def.triggers.some((t) => t.arg === 'cart')).toBe(true);
  });

  it('the finale waits for every board + the Heartstone, then happens on Winter 10', () => {
    const sim = mk();
    sim.p.inv = new Array(36).fill(null);
    for (const b of BOARDS) fillBoard(sim, b.id);
    sim.sleep();
    expect(finaleReady(sim)).toBe(false);
    sim.state.story.heartstone = 1;
    sim.p.inv[0] = { id: 'heartstone', n: 1, q: 0 };
    expect(placeHeartstone(sim)).toBe(true);
    expect(finaleReady(sim)).toBe(true);
    sim.sleep();
    expect(finaleToday(sim)).toBe(false); // too early in the year
    sim.state.day = 38;
    sim.sleep();
    expect(sim.state.day).toBe(39);
    expect(finaleToday(sim)).toBe(true);
  });

  it('if not ready by year end, the finale happens later (no soft-lock)', () => {
    const sim = mk();
    sim.state.day = 45;
    sim.p.inv = new Array(36).fill(null);
    for (const b of BOARDS) fillBoard(sim, b.id);
    sim.state.story.heartstone = 2;
    sim.sleep();
    sim.sleep();
    expect(finaleToday(sim)).toBe(true);
  });

  it('festival days gather villagers and close shops', () => {
    const sim = mk();
    sim.state.day = 7; // Spring 8: Sprout Fair
    sim.state.min = 12 * 60;
    expect(festivalToday(sim)?.id).toBe('sprout');
    resetNpcs(sim);
    const atTown = npcs(sim).list.filter((n) => n.loc === 'town').length;
    expect(atTown).toBeGreaterThan(10);
    expect(shopOpen(sim, 'store').open).toBe(false);
    expect(judgeEntry(sim, 'pumpkin', 2).place).toBeLessThanOrEqual(4);
  });
});
