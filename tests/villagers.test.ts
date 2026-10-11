import { describe, expect, it } from 'vitest';
import { acceptRequest, canFulfill, dailyVillagers, dueHeartRewards, fulfillRequest, giveGift, hearts, makeRequest, noteTalk, reactionTo, vstate } from '../src/sim/villagers';
import { VILLAGERS, VILLAGER_BY_ID } from '../src/data/villagers';
import { confirmPlacement, placementRT, scheduleMoveIn, startPlotPlacement } from '../src/sim/placement';
import { findPath } from '../src/sim/pathfind';
import { agents, updateAgents } from '../src/sim/agents';
import { personRoom } from '../src/sim/agents';
import { countItem, give } from '../src/sim/inventory';
import { hasItemDef, RECIPE_BY_ID } from '../src/data/registry';
import { makeGame } from './helpers';
import type { Game } from '../src/sim/game';

function placePlotSomewhere(g: Game, owner: string): boolean {
  startPlotPlacement(g, owner);
  const w = g.world;
  const pl = placementRT(g)!;
  for (let i = 0; i < w.size * w.size; i++) {
    if (w.region(i) !== 1 || !w.standable(i)) continue;
    g.state.player.x = (i % w.size) + 0.5;
    g.state.player.z = ((i / w.size) | 0) + 0.5;
    g.state.player.facing = Math.PI; // north
    g.state.player.level = w.height(i);
    pl.compute(g, pl);
    if (pl.valid) return confirmPlacement(g);
  }
  return false;
}

function moveIn(g: Game, id: string) {
  expect(placePlotSomewhere(g, id)).toBe(true);
  scheduleMoveIn(g, [id]);
  g.state.clock.day += 1;
  g.startDay();
}

describe('villager data', () => {
  it('has 8 villagers whose rewards and favorites exist', () => {
    expect(VILLAGERS.length).toBe(8);
    for (const v of VILLAGERS) {
      expect(hasItemDef(v.favorite), v.favorite).toBe(true);
      expect(hasItemDef(v.heartGift), v.heartGift).toBe(true);
      for (const r of v.heartRecipes) expect(RECIPE_BY_ID[r], r).toBeTruthy();
    }
  });
});

describe('villagers', () => {
  it('plots become homes and villagers move in the next day', () => {
    const g = makeGame(110);
    moveIn(g, 'tansy');
    expect(vstate(g, 'tansy').movedIn).toBe(true);
    expect(g.state.world.structures.some((s) => s.type === 'villagerHome' && s.owner === 'tansy')).toBe(true);
  });

  it('talking once a day raises friendship; gifts react to likes', () => {
    const g = makeGame(111);
    expect(noteTalk(g, 'rusk')).toBe(true);
    expect(noteTalk(g, 'rusk')).toBe(false);
    const f = vstate(g, 'rusk').friendship;
    expect(f).toBeGreaterThan(0);
    expect(reactionTo('rusk', VILLAGER_BY_ID.rusk!.favorite)).toBe('love');
    expect(reactionTo('percival', 'fiber')).toBe('dislike');
    give(g, VILLAGER_BY_ID.rusk!.favorite);
    const slot = g.state.player.inv.findIndex((s) => s?.id === VILLAGER_BY_ID.rusk!.favorite);
    expect(giveGift(g, 'rusk', slot)).toBe('love');
    expect(vstate(g, 'rusk').friendship).toBe(f + 10);
  });

  it('heart milestones deliver rewards once', () => {
    const g = makeGame(112);
    vstate(g, 'mochi').friendship = 100;
    expect(hearts(100)).toBe(5);
    const r = dueHeartRewards(g, 'mochi');
    expect(r.length).toBe(4);
    expect(dueHeartRewards(g, 'mochi').length).toBe(0);
    expect(countItem(g, VILLAGER_BY_ID.mochi!.heartGift)).toBe(1);
  });

  it('requests can be generated, accepted and fulfilled', () => {
    const g = makeGame(113);
    moveIn(g, 'juno');
    const v = vstate(g, 'juno');
    v.request = makeRequest(g, 'juno', 0.1)!; // deliver
    expect(v.request.kind).toBe('deliver');
    acceptRequest(g, 'juno');
    expect(canFulfill(g, 'juno')).toBe(false);
    give(g, v.request.target, v.request.qty);
    expect(canFulfill(g, 'juno')).toBe(true);
    const before = g.state.player.glints;
    const rew = fulfillRequest(g, 'juno')!;
    expect(g.state.player.glints).toBe(before + rew.glints);
    expect(countItem(g, v.request.target)).toBe(0);
    expect(g.state.stats.requestsDone).toBe(1);
  });

  it('lost-item requests place the item somewhere reachable', () => {
    const g = makeGame(114);
    moveIn(g, 'kip');
    let found = false;
    for (let d = 0; d < 12 && !found; d++) {
      g.state.clock.day += 1;
      dailyVillagers(g);
      const r = vstate(g, 'kip').request;
      if (r?.kind === 'lost') {
        expect(r.lostTile).toBeDefined();
        expect(g.state.world.objects[r.lostTile!]?.item).toBe(r.target);
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it('pathfinding finds routes in town and villagers walk around', () => {
    const g = makeGame(115);
    const lots = g.world.gen.lots;
    const a = g.world.idx(lots.plaza.x + 1, lots.plaza.z + 1);
    const b = g.world.idx(lots.dock.x, lots.dock.z - 1);
    const p = findPath(g.world, a, b);
    expect(p).not.toBeNull();
    expect(p!.length).toBeGreaterThan(3);
    moveIn(g, 'tansy');
    g.state.clock.minute = 12 * 60;
    const start = { ...agents(g).get('tansy') ?? { x: 0, z: 0 } };
    for (let k = 0; k < 600; k++) updateAgents(g, 1 / 30);
    const ag = agents(g).get('tansy')!;
    expect(ag).toBeTruthy();
    expect(Math.hypot(ag.x - start.x, ag.z - start.z)).toBeGreaterThan(0.5);
    // Pemberly works inside Lantern Hall (outdoors only for the festival)
    expect(agents(g).get('pemberly')).toBeUndefined();
    expect(personRoom(g, 'pemberly')).toBe('hall');
  });
});
