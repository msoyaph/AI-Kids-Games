import { describe, expect, it } from 'vitest';
import { BODY_BY_ID, SYSTEM_BY_ID } from '../../src/data/bodies';
import { CHARACTERS } from '../../src/data/characters';
import { DIALOGUE } from '../../src/data/dialogue';
import { ITEM_BY_ID } from '../../src/data/items';
import { LEVELS } from '../../src/data/levels';
import { MISSIONS } from '../../src/data/missions';
import type { MissionDef, ObjectiveDef } from '../../src/data/missionTypes';
import { PART_BY_ID } from '../../src/data/parts';
import { COURSE_BY_ID } from '../../src/data/races';
import { STICKER_BY_ID } from '../../src/data/stickers';
import type { GameEvent } from '../../src/systems/events';
import { MissionEngine } from '../../src/systems/missions';
import { createSave } from '../../src/systems/save/schema';
import { GameState } from '../../src/systems/state';

function setup(defs: MissionDef[] = MISSIONS) {
  const state = new GameState(createSave(0));
  const engine = new MissionEngine(state, defs);
  state.on((e) => engine.handle(e));
  return { state, engine };
}

/** Events that would satisfy an objective once (what the game would emit). */
export function eventsFor(obj: ObjectiveDef, state: GameState): GameEvent[] {
  const n = obj.count ?? 1;
  const many = (e: GameEvent) => Array.from({ length: n }, () => e);
  switch (obj.kind) {
    case 'visit': return [{ type: 'visit', place: obj.place! }];
    case 'arrive': return [{ type: 'arrive', system: obj.system! }];
    case 'near': return [{ type: 'near', body: obj.body! }];
    case 'land': return [{ type: 'land', body: obj.body!, perfect: false }];
    case 'home': return [{ type: 'home' }];
    case 'enterArea': return [{ type: 'enterArea', area: obj.area! }];
    case 'collect': return many({ type: 'collect', item: obj.item!, area: obj.area ?? 'x', count: 1 });
    case 'scan': return Array.from({ length: n }, (_, i) => ({ type: 'scan' as const, target: obj.target!.endsWith(':') ? `${obj.target}${i}` : obj.target! }));
    case 'talk': return [{ type: 'talk', npc: obj.npc!, area: obj.area ?? 'x' }];
    case 'reach': return [{ type: 'reach', marker: obj.marker!, area: obj.area ?? 'x' }];
    case 'solve': return [{ type: 'solve', puzzle: obj.puzzle!, area: obj.area ?? 'x' }];
    case 'gates': return [{ type: 'gates', course: obj.course! }];
    case 'race': return [{ type: 'race', course: obj.course!, time: 1, medal: obj.medal ?? 'bronze' }];
    case 'equip': return [{ type: 'equip', part: obj.part ?? 'any' }];
    case 'coins': return [{ type: 'coins', amount: n, system: obj.system ?? 'earth' }];
    case 'fuel': return many({ type: 'fuel' });
    case 'boost': return many({ type: 'boost' });
    case 'slingshot': return many({ type: 'slingshot', body: 'x' });
    case 'haul': return many({ type: 'haul', item: obj.item!, system: obj.system ?? 'x' });
    case 'glimmer': return many({ type: 'glimmer', system: 'x' });
    case 'deliver':
      state.data.cargo[obj.item!] = (state.data.cargo[obj.item!] ?? 0) + n;
      return [{ type: 'land', body: obj.body!, perfect: false }];
  }
}

describe('mission engine', () => {
  it('auto-starts the first main mission and tracks it', () => {
    const { state, engine } = setup();
    engine.autoStart();
    expect(state.data.activeMission).toBe('c1_welcome');
    expect(engine.currentObjective()?.obj.kind).toBe('visit');
    expect(state.outbox.some((m) => m.kind === 'dialogue' && m.id === 'c1_welcome_brief')).toBe(true);
  });

  it('counts progress and only for matching events', () => {
    const { state, engine } = setup();
    state.data.missions.c1_welcome = { status: 'done', step: 3, count: 0, seen: [] };
    state.data.missions.c1_first_flight = { status: 'done', step: 3, count: 0, seen: [] };
    state.data.missions.c1_fuel = { status: 'done', step: 3, count: 0, seen: [] };
    state.data.missions.c1_moon = { status: 'done', step: 3, count: 0, seen: [] };
    engine.autoStart();
    expect(engine.isActive('c1_moon_rocks')).toBe(true);
    state.emit({ type: 'collect', item: 'marsrock', area: 'moon_base', count: 1 });
    expect(engine.progress('c1_moon_rocks')!.count).toBe(0);
    state.emit({ type: 'collect', item: 'moonrock', area: 'moon_base', count: 1 });
    state.emit({ type: 'collect', item: 'moonrock', area: 'moon_base', count: 1 });
    expect(engine.progress('c1_moon_rocks')!.count).toBe(2);
    state.emit({ type: 'collect', item: 'moonrock', area: 'moon_base', count: 1 });
    expect(engine.progress('c1_moon_rocks')!.step).toBe(1);
  });

  it('scans of the same object only count once', () => {
    const { state, engine } = setup();
    state.data.missions.c1_welcome = { status: 'done', step: 3, count: 0, seen: [] };
    state.data.missions.c1_first_flight = { status: 'done', step: 3, count: 0, seen: [] };
    engine.start('c1s_satellites');
    state.emit({ type: 'scan', target: 'sat:0' });
    state.emit({ type: 'scan', target: 'sat:0' });
    state.emit({ type: 'scan', target: 'moon' });
    expect(engine.progress('c1s_satellites')!.count).toBe(1);
    state.emit({ type: 'scan', target: 'sat:1' });
    state.emit({ type: 'scan', target: 'sat:2' });
    expect(engine.isDone('c1s_satellites')).toBe(true);
    expect(state.data.stickers).toContain('st_satellite');
  });

  it('one landing can finish "fly near" and "land" together', () => {
    const { state, engine } = setup();
    for (const id of ['c1_welcome', 'c1_first_flight', 'c1_fuel']) state.data.missions[id] = { status: 'done', step: 9, count: 0, seen: [] };
    engine.autoStart();
    state.emit({ type: 'land', body: 'moon', perfect: true });
    expect(engine.progress('c1_moon')!.step).toBe(2);
  });

  it('completing a mission gives rewards and starts the next main mission', () => {
    const { state, engine } = setup();
    engine.autoStart();
    state.emit({ type: 'visit', place: 'hangar' });
    state.emit({ type: 'visit', place: 'lounge' });
    state.emit({ type: 'talk', npc: 'pip', area: 'lounge' });
    expect(engine.isDone('c1_welcome')).toBe(true);
    expect(state.data.coins).toBe(30);
    expect(state.data.activeMission).toBe('c1_first_flight');
    expect(state.outbox.some((m) => m.kind === 'missionDone' && m.id === 'c1_welcome')).toBe(true);
  });

  it('the whole campaign can be completed in order with no soft-locks', () => {
    const { state, engine } = setup();
    engine.autoStart();
    let safety = 0;
    // Keep finishing whatever is active (main and side) until nothing is left.
    while (safety++ < 500) {
      for (const def of engine.available()) engine.start(def.id, false);
      const act = engine.active();
      if (!act.length) break;
      const def = act[0];
      const obj = engine.objective(def.id)!;
      for (const e of eventsFor(obj, state)) state.emit(e);
    }
    const c = engine.counts();
    expect(c.mainDone).toBe(c.main);
    expect(c.sideDone).toBe(c.side);
    expect(state.data.chapter).toBeGreaterThanOrEqual(Math.max(...MISSIONS.map((m) => m.chapter)));
  });
});

describe('mission data', () => {
  const ids = new Set(MISSIONS.map((m) => m.id));
  const chars = new Set(CHARACTERS.map((c) => c.id));
  for (const m of MISSIONS) {
    it(`${m.id} only references things that exist`, () => {
      expect(chars.has(m.giver)).toBe(true);
      expect(DIALOGUE[m.briefing], `briefing ${m.briefing}`).toBeTruthy();
      expect(DIALOGUE[m.done], `done ${m.done}`).toBeTruthy();
      for (const r of m.requires) expect(ids.has(r), `requires ${r}`).toBe(true);
      expect(m.objectives.length).toBeGreaterThan(0);
      for (const o of m.objectives) {
        expect(o.text.length).toBeLessThan(48);
        if (o.onStart) expect(DIALOGUE[o.onStart], o.onStart).toBeTruthy();
        if (o.onDone) expect(DIALOGUE[o.onDone], o.onDone).toBeTruthy();
        if (o.body) expect(BODY_BY_ID[o.body], o.body).toBeTruthy();
        if (o.system) expect(SYSTEM_BY_ID[o.system as keyof typeof SYSTEM_BY_ID], o.system).toBeTruthy();
        if (o.area) expect(o.area === 'lounge' || !!LEVELS[o.area], o.area).toBe(true);
        if (o.item) expect(ITEM_BY_ID[o.item], o.item).toBeTruthy();
        if (o.npc) expect(chars.has(o.npc), o.npc).toBe(true);
        if (o.course) expect(COURSE_BY_ID[o.course], o.course).toBeTruthy();
        if (o.part && o.part !== 'any') expect(PART_BY_ID[o.part], o.part).toBeTruthy();
      }
      for (const p of m.rewards.parts ?? []) expect(PART_BY_ID[p], p).toBeTruthy();
      for (const s of m.rewards.stickers ?? []) expect(STICKER_BY_ID[s], s).toBeTruthy();
    });
  }
  it('every dialogue line names a real speaker and stays short', () => {
    for (const [id, lines] of Object.entries(DIALOGUE)) {
      for (const l of lines) {
        expect(chars.has(l.who) || l.who === 'sign', `${id}: ${l.who}`).toBe(true);
        expect(l.text.length, `${id}: "${l.text}"`).toBeLessThanOrEqual(110);
      }
    }
  });
});
