import { describe, expect, it } from 'vitest';
import { canOrderUpgrade, canPlace, orderUpgrade, payLoan, pitchTent, placeFromPockets, sleep, storeFurniture, moveFurniture } from '../src/sim/housing';
import { enterInterior, exitInterior, interiorRT, stepInterior } from '../src/sim/interior';
import { give, money, countItem } from '../src/sim/inventory';
import { HOME_TIERS } from '../src/data/economy';
import { placeOutdoor, pickUpOutdoor, decorAnchor } from '../src/sim/decor';
import { makeGame, faceTile } from './helpers';

describe('housing', () => {
  it('pitches a tent, then upgrades overnight via a loan', () => {
    const g = makeGame(100);
    expect(canOrderUpgrade(g).ok).toBe(false);
    pitchTent(g);
    expect(g.state.home.level).toBe(0);
    expect(g.state.world.structures.some((s) => s.type === 'home')).toBe(true);
    expect(orderUpgrade(g)).toBe(true);
    expect(g.state.home.loan).toBe(HOME_TIERS[1]!.cost);
    expect(canOrderUpgrade(g).ok).toBe(false);
    sleep(g);
    expect(g.state.home.level).toBe(1);
    expect(canOrderUpgrade(g).reason).toMatch(/loan/i);
    money(g, 5000);
    expect(payLoan(g, 99999)).toBe(5000);
    expect(g.state.home.loan).toBe(HOME_TIERS[1]!.cost - 5000);
    money(g, HOME_TIERS[1]!.cost);
    payLoan(g, HOME_TIERS[1]!.cost);
    expect(g.state.home.loan).toBe(0);
    expect(canOrderUpgrade(g).ok).toBe(true);
  });

  it('sleeping advances to the next morning and rolls the day', () => {
    const g = makeGame(101);
    g.state.clock.minute = 22 * 60;
    const day = g.state.clock.day;
    sleep(g);
    expect(g.state.clock.day).toBe(day + 1);
    expect(g.state.clock.minute).toBe(6 * 60);
    expect(g.state.world.rolledDay).toBe(day + 1);
  });

  it('places furniture on the grid without overlaps, rugs layer underneath', () => {
    const g = makeGame(102);
    pitchTent(g);
    give(g, 'furn_plank_table');
    give(g, 'furn_woven_rug');
    give(g, 'furn_driftwood_stool');
    const slot = (id: string) => g.state.player.inv.findIndex((s) => s?.id === id);
    expect(canPlace(g, 'furn_plank_table', -1, 0, 0)).toBe(false);
    expect(canPlace(g, 'furn_plank_table', 0, 0, 0)).toBe(false); // bed
    expect(placeFromPockets(g, slot('furn_plank_table'), 2, 2, 0)).toBe(true);
    expect(canPlace(g, 'furn_driftwood_stool', 3, 2, 0)).toBe(false);
    expect(placeFromPockets(g, slot('furn_woven_rug'), 2, 2, 0)).toBe(true);
    expect(placeFromPockets(g, slot('furn_driftwood_stool'), 4, 2, 0)).toBe(true);
    const table = g.state.home.furniture.find((f) => f.id === 'furn_plank_table')!;
    expect(moveFurniture(g, table.uid, 1, 3, 1)).toBe(true);
    expect(storeFurniture(g, table.uid)).toBe(true);
    expect(g.state.home.storage.some((s) => s.id === 'furn_plank_table')).toBe(true);
  });

  it('can walk inside and leave through the door', () => {
    const g = makeGame(103);
    pitchTent(g);
    enterInterior(g, 'home');
    expect(g.state.player.location).toBe('home');
    const rt = interiorRT(g)!;
    for (let k = 0; k < 60; k++) stepInterior(g, 0, -1, false, 1 / 60);
    expect(rt.z).toBeLessThan(rt.room.d - 1);
    for (let k = 0; k < 200 && g.state.player.location === 'home'; k++) stepInterior(g, 0, 1, false, 1 / 60);
    expect(g.state.player.location).toBe('island');
    enterInterior(g, 'museum');
    exitInterior(g);
    expect(g.state.player.location).toBe('island');
  });
});

describe('outdoor decorations', () => {
  it('places and picks up multi-tile decorations', () => {
    const g = makeGame(104);
    give(g, 'furn_mossback_bench');
    const N = g.world.size;
    let ok = false;
    for (let i = 0; i < N * N && !ok; i++) {
      if (g.world.ground(i) !== 2 || g.world.obj(i) || g.world.structure(i) || g.world.region(i) !== 1) continue;
      if (!faceTile(g, i)) continue;
      const slot = g.state.player.inv.findIndex((s) => s?.id === 'furn_mossback_bench');
      ok = placeOutdoor(g, slot);
      if (ok) {
        expect(countItem(g, 'furn_mossback_bench')).toBe(0);
        const decos = Object.entries(g.state.world.objects).filter(([, o]) => o.k === 'deco');
        expect(decos.length).toBeGreaterThanOrEqual(1);
        const anchor = decorAnchor(g, +decos[0]![0]);
        expect(pickUpOutdoor(g, anchor)).toBe(true);
        expect(countItem(g, 'furn_mossback_bench')).toBe(1);
        expect(Object.values(g.state.world.objects).some((o) => o.k === 'deco')).toBe(false);
      }
    }
    expect(ok).toBe(true);
  });
});
