import { describe, expect, it } from 'vitest';
import { makeGame, faceTile } from './helpers';
import { craftItem, deliverAll, donateSome, expectDone, nextDay, placePlot, setHour, talk } from './story';
import { orderUpgrade, payLoan } from '../src/sim/housing';
import { buy, dailyStock } from '../src/sim/economy';
import { give, money, countItem } from '../src/sim/inventory';
import { FISH, BUGS, FOSSILS } from '../src/data/registry';
import { assessFossil } from '../src/sim/museum';
import { enterInterior, exitInterior } from '../src/sim/interior';
import { confirmPlacement, placementRT } from '../src/sim/placement';
import { startBuildPlacement } from '../src/sim/build';
import { equipKind } from '../src/sim/tools';
import { ladderTarget } from '../src/sim/player';
import { inspectLighthouse } from '../src/sim/structures';
import { finishContest, startContest } from '../src/sim/challenges';
import { placeOutdoor } from '../src/sim/decor';
import { plantFromSlot } from '../src/sim/gardening';
import { ratingBreakdown } from '../src/sim/rating';
import { reachableComponents, invalidateReach, residents } from '../src/sim/villagers';
import { Region } from '../src/world/types';
import type { Game } from '../src/sim/game';

/** Scan positions/facings until a placement mode becomes valid, then confirm. */
function placeBuildAnywhere(g: Game, kind: 'bridge' | 'ramp', region = Region.West): void {
  money(g, 5000);
  give(g, kind === 'bridge' ? 'timber' : 'stone', 10);
  expect(startBuildPlacement(g, kind)).toBe(true);
  const pl = placementRT(g)!;
  const w = g.world;
  for (let i = 0; i < w.size * w.size; i++) {
    if (w.region(i) !== region || !w.standable(i)) continue;
    for (const f of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      g.state.player.x = (i % w.size) + 0.5;
      g.state.player.z = ((i / w.size) | 0) + 0.5;
      g.state.player.level = w.height(i);
      g.state.player.facing = f;
      pl.compute(g, pl);
      if (pl.valid) {
        expect(confirmPlacement(g)).toBe(true);
        return;
      }
    }
  }
  throw new Error('no valid ' + kind + ' spot');
}

function goToRegion(g: Game, region: number): void {
  const w = g.world;
  for (let i = 0; i < w.size * w.size; i++)
    if (w.region(i) === region && w.standable(i)) {
      g.state.player.x = (i % w.size) + 0.5;
      g.state.player.z = ((i / w.size) | 0) + 0.5;
      g.state.player.level = w.height(i);
      g.update(0.1, null);
      return;
    }
}

function freeGrassNear(g: Game, cx: number, cz: number, r: number, used: Set<number>): number {
  const w = g.world;
  for (let d = 2; d <= r; d++)
    for (let z = cz - d; z <= cz + d; z++)
      for (let x = cx - d; x <= cx + d; x++) {
        if (!w.inb(x, z)) continue;
        const i = w.idx(x, z);
        if (used.has(i) || w.ground(i) !== 2 && w.ground(i) !== 3 || w.obj(i) || w.structure(i)) continue;
        if (!faceTile(g, i)) continue;
        used.add(i);
        return i;
      }
  return -1;
}

describe('full game playthrough', () => {
  it('reaches the festival ending from a new game', { timeout: 120000 }, () => {
    const g = makeGame(2026);
    // ---------------- Chapter 1
    talk(g, 'pemberly');
    deliverAll(g, 'pemberly');
    for (const r of ['r_net_flimsy', 'r_rod_flimsy', 'r_axe_flimsy', 'r_shovel_flimsy']) craftItem(g, r);
    for (let k = 0; k < 2; k++) {
      g.emit('fishCaught', { id: FISH[0]!.id, size: 2, where: 'river', rarity: 1 });
      g.emit('bugCaught', { id: BUGS[0]!.id, rarity: 1 });
    }
    g.state.stats.digSpots = 2;
    g.emit('woodChopped', { id: 'timber', qty: 5 });
    g.update(1, null);
    setHour(g, 18);
    talk(g, 'pemberly');
    nextDay(g);
    expectDone(g, 'm1_evening');
    // ---------------- Chapter 2
    talk(g, 'fennimore');
    g.emit('itemSold', { id: 'x', qty: 1, total: 2500, category: 'material' });
    deliverAll(g, 'fennimore');
    talk(g, 'pemberly');
    money(g, 1000);
    orderUpgrade(g);
    nextDay(g);
    money(g, 3000);
    payLoan(g, 3000);
    buy(g, dailyStock(g, 'shop')[0]!);
    placePlot(g, 'tansy');
    placePlot(g, 'rusk');
    for (const r of ['r_furn_driftwood_stool', 'r_furn_wick_lantern', 'r_furn_woven_rug']) craftItem(g, r);
    deliverAll(g, 'pemberly');
    nextDay(g);
    talk(g, 'tansy');
    talk(g, 'rusk');
    g.update(1, null);
    expectDone(g, 'm2_greet');
    expectDone(g, 'm2_open');
    // ---------------- Chapter 3
    while (g.state.clock.day < 7) nextDay(g);
    talk(g, 'vesper');
    donateSome(g, [...FISH.slice(0, 10).map((f) => f.id), ...BUGS.slice(0, 6).map((b) => b.id)]);
    g.update(1, null);
    talk(g, 'vesper');
    expectDone(g, 'm3_museum');
    // bridge
    placeBuildAnywhere(g, 'bridge');
    nextDay(g);
    expect(g.state.world.structures.some((s) => s.type === 'bridge')).toBe(true);
    invalidateReach();
    const { comp, ids } = reachableComponents(g);
    const east = [...Array(g.world.size * g.world.size).keys()].filter((i) => g.world.region(i) === Region.NE || g.world.region(i) === Region.SE);
    expect(east.some((i) => ids.has(comp[i]!))).toBe(true); // walkable across the new bridge
    goToRegion(g, Region.NE);
    goToRegion(g, Region.SE);
    g.update(1, null);
    expectDone(g, 'm3_bridge');
    // museum opening
    enterInterior(g, 'museum');
    exitInterior(g);
    give(g, 'fossil_unknown');
    assessFossil(g);
    g.update(1, null);
    expectDone(g, 'm3_open');
    // ladder + ramp
    craftItem(g, 'r_ladder');
    equipKind(g, 'ladder');
    let climbed = false;
    const w = g.world;
    for (let i = 0; i < w.size * w.size && !climbed; i++) {
      if (w.region(i) !== Region.West || !w.standable(i)) continue;
      for (const f of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        g.state.player.x = (i % w.size) + 0.5;
        g.state.player.z = ((i / w.size) | 0) + 0.5;
        g.state.player.level = 0;
        g.state.player.facing = f;
        const t = ladderTarget(w, g.state.player);
        if (t !== null && w.height(t) === 1) {
          g.act();
          for (let k = 0; k < 120 && g.action; k++) g.update(1 / 60, null);
          climbed = g.state.player.level === 1;
          break;
        }
      }
    }
    expect(climbed).toBe(true);
    placeBuildAnywhere(g, 'ramp', Region.West);
    nextDay(g);
    g.update(1, null);
    expectDone(g, 'm3_ladder');
    // summit + lighthouse
    goToRegion(g, Region.Summit);
    g.update(1, null);
    inspectLighthouse(g);
    g.update(1, null);
    talk(g, 'pemberly');
    expectDone(g, 'm3_summit');
    expect(countItem(g, 'lens')).toBe(1);
    // arrivals
    placePlot(g, 'bellamy');
    placePlot(g, 'juno');
    craftItem(g, 'r_furn_wick_lantern');
    craftItem(g, 'r_furn_wick_lantern');
    deliverAll(g, 'pemberly');
    nextDay(g);
    expectDone(g, 'm3_arrivals');
    expect(g.state.player.invSize).toBe(30);
    // ---------------- Chapter 4
    while (g.state.clock.day < 10) nextDay(g);
    expect(g.state.quests.chapter).toBe(4);
    placePlot(g, 'percival');
    placePlot(g, 'kip');
    craftItem(g, 'r_furn_mossback_bench');
    deliverAll(g, 'pemberly');
    nextDay(g);
    expectDone(g, 'm4_more');
    expect(residents(g).length).toBe(6);
    // Tansy's pie
    expect(talk(g, 'tansy')).toBe(true); // starts the mission
    deliverAll(g, 'tansy');
    deliverAll(g, 'tansy');
    expect(countItem(g, 'pie')).toBe(1);
    deliverAll(g, 'rusk');
    talk(g, 'tansy');
    expectDone(g, 'm4_tansy');
    // Rusk's bloom
    talk(g, 'rusk');
    expect(countItem(g, 'seed_bell_red')).toBeGreaterThanOrEqual(2);
    const used = new Set<number>();
    const lots = g.world.gen.lots;
    for (const seed of ['seed_bell_red', 'seed_bell_red', 'seed_bell_white', 'seed_bell_white']) {
      freeGrassNear(g, lots.home.x, lots.home.z, 12, used);
      const slot = g.state.player.inv.findIndex((s) => s?.id === seed);
      expect(plantFromSlot(g, slot)).toBe(true);
    }
    g.emit('flowerBred', { color: 'pink', species: 0 });
    talk(g, 'rusk');
    expectDone(g, 'm4_rusk');
    // Bellamy's fossil
    talk(g, 'bellamy');
    deliverAll(g, 'bellamy');
    talk(g, 'vesper');
    talk(g, 'bellamy');
    expectDone(g, 'm4_bellamy');
    // contests
    talk(g, 'juno');
    expect(startContest(g, 'tournament')).toBe(true);
    const bigFish = FISH.find((f) => f.size >= 5)!;
    for (let k = 0; k < 4; k++) g.emit('fishCaught', { id: bigFish.id, size: bigFish.size, where: 'sea', rarity: bigFish.rarity });
    finishContest(g);
    expectDone(g, 'm4_tourney');
    talk(g, 'kip');
    expect(startContest(g, 'bugoff')).toBe(true);
    const rareBug = BUGS.find((b) => b.rarity >= 3)!;
    for (let k = 0; k < 3; k++) g.emit('bugCaught', { id: rareBug.id, rarity: rareBug.rarity });
    finishContest(g);
    expectDone(g, 'm4_bugoff');
    // plaza makeover: 5 decorations + 6 flowers near the plaza
    const pcx = lots.plaza.x + Math.floor(lots.plaza.w / 2), pcz = lots.plaza.z + Math.floor(lots.plaza.d / 2);
    for (let k = 0; k < 6; k++) {
      give(g, 'furn_wick_lantern');
      let ok = false;
      for (let tries = 0; tries < 40 && !ok; tries++) {
        freeGrassNear(g, pcx, pcz, 7, used);
        const slot = g.state.player.inv.findIndex((s) => s?.id === 'furn_wick_lantern');
        ok = placeOutdoor(g, slot);
      }
      expect(ok).toBe(true);
    }
    for (let k = 0; k < 8; k++) {
      give(g, 'flower_sun_yellow');
      freeGrassNear(g, pcx, pcz, 7, used);
      const slot = g.state.player.inv.findIndex((s) => s?.id === 'flower_sun_yellow');
      expect(plantFromSlot(g, slot)).toBe(true);
    }
    g.update(1, null);
    expectDone(g, 'm4_plaza');
    // ---------------- Chapter 5
    while (g.state.clock.day < 15) nextDay(g);
    expect(g.state.quests.chapter).toBe(5);
    placePlot(g, 'mochi');
    placePlot(g, 'marlowe');
    craftItem(g, 'r_furn_wick_lantern');
    craftItem(g, 'r_furn_wick_lantern');
    deliverAll(g, 'pemberly');
    nextDay(g);
    expect(residents(g).length).toBe(8);
    // raise the island glow: museum, decorations, flowers, home, weeds
    donateSome(g, [...FISH.map((f) => f.id), ...BUGS.map((b) => b.id), ...FOSSILS.map((f) => f.id)]);
    for (let k = 0; k < 4; k++) {
      give(g, 'furn_tidecurl_fountain');
      let ok = false;
      for (let tries = 0; tries < 60 && !ok; tries++) {
        freeGrassNear(g, lots.museum.x, lots.museum.z + 6, 16, used);
        const slot = g.state.player.inv.findIndex((s) => s?.id === 'furn_tidecurl_fountain');
        ok = placeOutdoor(g, slot);
      }
    }
    for (const key of Object.keys(g.state.world.objects)) if (g.state.world.objects[+key]!.k === 'weed') delete g.state.world.objects[+key];
    money(g, 200000);
    payLoan(g, 999999);
    orderUpgrade(g);
    nextDay(g);
    for (const key of Object.keys(g.state.world.objects)) if (g.state.world.objects[+key]!.k === 'weed') delete g.state.world.objects[+key];
    g.update(1, null);
    const rb = ratingBreakdown(g);
    expect(rb.stars, JSON.stringify(rb)).toBe(5);
    expectDone(g, 'm5_glow3');
    expectDone(g, 'm5_glow5');
    // lens + lanterns
    talk(g, 'vesper');
    give(g, 'glowstone', 2);
    deliverAll(g, 'vesper');
    expect(countItem(g, 'lens_polished')).toBe(1);
    for (let k = 0; k < 3; k++) craftItem(g, 'r_lantern_kit');
    deliverAll(g, 'pemberly');
    expectDone(g, 'm5_lanterns');
    // the festival
    let finale = false;
    g.bus.on('finale', () => (finale = true));
    setHour(g, 12);
    talk(g, 'pemberly');
    expect(finale).toBe(false);
    setHour(g, 20);
    talk(g, 'pemberly');
    expectDone(g, 'm5_finale');
    expect(finale).toBe(true);
    expect(g.state.quests.finished).toBe(true);
    expect(g.state.clock.day).toBeGreaterThanOrEqual(16);
  });
});
