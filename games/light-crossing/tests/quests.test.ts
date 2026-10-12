import { describe, expect, it } from 'vitest';
import { makeGame } from './helpers';
import { MISSIONS, MISSION_BY_ID } from '../src/data/missions';
import { NPC_BY_ID, VILLAGER_BY_ID } from '../src/data/villagers';
import { RECIPE_BY_ID, hasItemDef } from '../src/data/registry';
import { STATE_FNS, available, completeMission, evaluate, matchFilter, objectiveValue, onEvent, questOptions, startMission, talkScene, tryStart } from '../src/sim/quests';
import { give } from '../src/sim/inventory';
import type { GameEvents } from '../src/sim/events';

const EVENT_NAMES = new Set<keyof GameEvents>([
  'crafted', 'fishCaught', 'bugCaught', 'woodChopped', 'slept', 'itemSold', 'itemBought', 'donated', 'location', 'fossilAssessed', 'climbed', 'planted', 'flowerBred', 'eventFinished', 'talked',
]);

describe('mission data validation', () => {
  it('references only existing missions, characters, items, recipes, state functions and events', () => {
    const ids = new Set(MISSIONS.map((m) => m.id));
    expect(ids.size).toBe(MISSIONS.length);
    const who = (id: string) => !!VILLAGER_BY_ID[id] || !!NPC_BY_ID[id];
    for (const m of MISSIONS) {
      for (const r of m.requires) expect(ids.has(r), `${m.id} requires ${r}`).toBe(true);
      expect(who(m.giver), m.giver).toBe(true);
      if (m.turnIn) expect(who(m.turnIn)).toBe(true);
      for (const p of m.plots ?? []) expect(VILLAGER_BY_ID[p], p).toBeTruthy();
      for (const o of m.objectives) {
        if (o.kind === 'talk' || o.kind === 'deliver') expect(who(o.npc), `${m.id}:${o.npc}`).toBe(true);
        if (o.kind === 'deliver' && o.item && o.item !== '$nativeFruit') expect(hasItemDef(o.item), o.item).toBe(true);
        if (o.kind === 'state') expect(STATE_FNS[o.fn], `${m.id}:${o.fn}`).toBeTypeOf('function');
        if (o.kind === 'event') expect(EVENT_NAMES.has(o.event), `${m.id}:${o.event}`).toBe(true);
      }
      for (const e of [...(m.onStart ?? []), ...(m.onComplete ?? [])]) {
        if (e.type === 'recipe') expect(RECIPE_BY_ID[e.id], e.id).toBeTruthy();
        if (e.type === 'give') expect(hasItemDef(e.item), e.item).toBe(true);
      }
    }
  });

  it('chapters progress in order and every mission is reachable', () => {
    const done = new Set<string>();
    let progress = true;
    while (progress) {
      progress = false;
      for (const m of MISSIONS) if (!done.has(m.id) && m.requires.every((r) => done.has(r))) {
        done.add(m.id);
        progress = true;
        for (const r of m.requires) expect(MISSION_BY_ID[r]!.chapter).toBeLessThanOrEqual(m.chapter);
      }
    }
    expect(done.size).toBe(MISSIONS.length);
  });
});

describe('quest engine', () => {
  it('starts the first mission and respects minDay gates', () => {
    const g = makeGame(300);
    expect(g.state.quests.active.m1_arrive).toBeTruthy();
    g.state.quests.done.push(...['m1_arrive', 'm1_camp', 'm1_tools', 'm1_catch', 'm1_dig', 'm1_evening']);
    tryStart(g);
    expect(g.state.quests.active.m2_cart).toBeUndefined(); // minDay 2
    g.state.clock.day = 2;
    tryStart(g);
    expect(g.state.quests.active.m2_cart).toBeTruthy();
    expect(g.state.quests.chapter).toBe(2);
  });

  it('startTalk missions wait to be offered by their giver', () => {
    const g = makeGame(301);
    const m = MISSION_BY_ID.m4_tansy!;
    g.state.quests.done.push(...m.requires);
    tryStart(g);
    expect(g.state.quests.active.m4_tansy).toBeUndefined();
    expect(available(g).some((x) => x.id === 'm4_tansy')).toBe(true);
    const scene = talkScene(g, 'tansy')!;
    expect(scene.lines.length).toBeGreaterThan(0);
    scene.apply();
    expect(g.state.quests.active.m4_tansy).toBeTruthy();
  });

  it('event filters support equality, min: and prefix:, and sums', () => {
    expect(matchFilter({ item: 'ladder' }, { item: 'ladder' })).toBe(true);
    expect(matchFilter({ item: 'ladder' }, { item: 'net' })).toBe(false);
    expect(matchFilter({ 'min:size': 4 }, { size: 5 })).toBe(true);
    expect(matchFilter({ 'min:size': 4 }, { size: 3 })).toBe(false);
    expect(matchFilter({ 'prefix:id': 'seed_' }, { id: 'seed_bell_red' })).toBe(true);
    const g = makeGame(302);
    g.state.quests.active = {};
    startMission(g, MISSION_BY_ID.m2_cart!, false);
    onEvent(g, 'itemSold', { total: 1200 });
    onEvent(g, 'itemSold', { total: 600 });
    expect(objectiveValue(g, MISSION_BY_ID.m2_cart!, 1).value).toBe(1800);
  });

  it('sequential objectives only count once earlier steps are done', () => {
    const g = makeGame(303);
    g.state.quests.active = {};
    const m = MISSION_BY_ID.m1_evening!;
    startMission(g, m, false);
    onEvent(g, 'slept', { day: 2 });
    expect(objectiveValue(g, m, 1).done).toBe(false);
  });

  it('state objectives credit progress made before the mission started', () => {
    const g = makeGame(304);
    g.state.quests.active = {};
    g.state.stats.digSpots = 5;
    g.state.stats.woodChopped = 0;
    startMission(g, MISSION_BY_ID.m1_dig!, false);
    evaluate(g);
    expect(objectiveValue(g, MISSION_BY_ID.m1_dig!, 0).done).toBe(true);
  });

  it('deliveries are offered when the player carries the items and complete missions', () => {
    const g = makeGame(305);
    expect(talkScene(g, 'pemberly')).not.toBeNull();
    talkScene(g, 'pemberly')!.apply();
    expect(questOptions(g, 'pemberly')).toEqual([]);
    give(g, 'branch', 6);
    give(g, 'fiber', 3);
    const opts = questOptions(g, 'pemberly');
    expect(opts.length).toBe(2);
    for (const o of opts) o.run();
    expect(g.state.quests.done).toContain('m1_camp');
    expect(g.state.home.level).toBe(0);
    completeMission(g, MISSION_BY_ID.m1_camp!); // no-op when already done
    expect(g.state.quests.done.filter((d) => d === 'm1_camp').length).toBe(1);
  });
});
