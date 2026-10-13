import { describe, expect, it } from 'vitest';
import { makeCreature } from '../../src/core/creature';
import { Rng } from '../../src/core/rng';
import { evalFlags, fillText } from '../../src/core/script';
import { newGameState, type GameState } from '../../src/core/state';
import { footprint, parseMap } from '../../src/core/world/map';
import { findPath } from '../../src/core/world/path';
import { hasAbility, World } from '../../src/core/world/world';
import { AREA_BY_ID } from '../../src/data/areas';
import { SCRIPTS } from '../../src/data/dialogue/index';
import { DEX } from '../../src/data/index';
import { MAPS, START } from '../../src/data/maps/index';
import { TER } from '../../src/data/terrain';
import { TRAINER_BY_ID } from '../../src/data/trainers';
import type { Cmd, Script } from '../../src/core/script';

const fresh = (): GameState => newGameState({ slot: 1, name: 0, look: { skin: 0, hair: 0, hairColor: 0, outfit: 0 }, difficulty: 'normal', seed: 5, start: { map: START.map, x: START.x, y: START.y } });

describe('maps', () => {
  for (const def of Object.values(MAPS)) {
    it(`${def.id}: rows are even, warps, edges and people make sense`, () => {
      const widths = new Set(def.rows.map(r => r.length));
      expect(widths.size, 'every row the same width').toBe(1);
      const m = parseMap(def);
      const w = new World(def, fresh(), DEX, 1);
      for (const warp of def.warps) {
        expect(MAPS[warp.to], `warp to ${warp.to}`).toBeDefined();
        const dest = parseMap(MAPS[warp.to]!);
        const t = dest.ter[warp.ty * dest.w + warp.tx]!;
        expect(TER[t].walk, `${warp.to} ${warp.tx},${warp.ty} is walkable`).toBe(true);
      }
      for (const e of def.edges ?? []) if (MAPS[e.to]) {
        // a map you can walk off has a matching edge back
        const back = MAPS[e.to]!.edges?.find(b => b.to === def.id);
        expect(back, `${e.to} leads back to ${def.id}`).toBeDefined();
        expect(back!.offset).toBe(-e.offset);
      }
      for (const n of def.npcs) {
        expect(TER[m.ter[n.y * m.w + n.x]!].walk, `${n.id} stands on walkable ground`).toBe(true);
        expect(SCRIPTS[n.talk], `${n.id} has its script ${n.talk}`).toBeDefined();
        if (n.trainer) expect(TRAINER_BY_ID[n.trainer]).toBeDefined();
      }
      for (const t of def.triggers) expect(SCRIPTS[t.script], `trigger script ${t.script}`).toBeDefined();
      for (const id of def.wild ?? []) expect(AREA_BY_ID[id], `wild area ${id}`).toBeDefined();
      for (const o of m.objects) for (const f of footprint(o)) {
        expect(f.x >= 0 && f.y >= 0 && f.x < m.w && f.y < m.h, `${o.id} inside the map`).toBe(true);
      }
      if (def.rest) expect(w.passable(def.rest.x, def.rest.y), 'rest spot is walkable').toBe(true);
    });
  }

  it('starts the adventure on a free tile in Gran\'s house', () => {
    const w = new World(MAPS[START.map]!, fresh(), DEX, 1);
    expect(w.passable(START.x, START.y)).toBe(true);
  });

  it('every script only calls scripts and trainers that exist', () => {
    const check = (list: Script) => {
      for (const c of list as Cmd[]) {
        if ('goto' in c) expect(SCRIPTS[c.goto], c.goto).toBeDefined();
        if ('spar' in c) expect(TRAINER_BY_ID[c.spar], c.spar).toBeDefined();
        for (const k of ['then', 'else', 'yes', 'no', 'win', 'lose', 'friend'] as const) {
          const sub = (c as Record<string, unknown>)[k];
          if (Array.isArray(sub)) check(sub as Script);
        }
      }
    };
    for (const s of Object.values(SCRIPTS)) check(s);
  });
});

describe('walking', () => {
  it('steps, bumps into things, and uses warps and edges', () => {
    const s = fresh();
    const w = new World(MAPS.brightmoor!, s, DEX, 2);
    s.x = 4; s.y = 7;
    expect(w.step(3)).toMatchObject({ kind: 'warp' }); // the door of Gran's house
    s.x = 14; s.y = 0;
    expect(w.step(3)).toMatchObject({ kind: 'edge', to: 'meadow-path', x: 10 });
    s.x = 1; s.y = 1;
    expect(w.step(1).kind).toBe('blocked'); // a tree
  });

  it('a locked door explains itself until its flag is set', () => {
    const s = fresh();
    const w = new World(MAPS.brightmoor!, s, DEX, 2);
    s.x = 19; s.y = 7;
    expect(w.step(3).kind).toBe('locked');
    s.flags.add('woke-up');
    expect(w.step(3).kind).toBe('warp');
  });

  it('water and dark caves need the right friend; vines can be snipped by a Leaf friend', () => {
    const s = fresh();
    const w = new World(MAPS['meadow-path']!, s, DEX, 3);
    expect(hasAbility(DEX, s, 'paddle')).toBe(false);
    // the pond at (8..12, 16..18)
    expect(w.passable(9, 17)).toBe(false);
    s.team.push(makeCreature(DEX, { species: 'lullakin', level: 5 }, new Rng(1)));
    expect(hasAbility(DEX, s, 'paddle')).toBe(true);
    expect(w.passable(9, 17)).toBe(true);
    const vine = { kind: 'vines' as const, x: 0, y: 0, id: 'v1' };
    expect(w.useAbility(vine)).toBeNull();
    s.base.push(makeCreature(DEX, { species: 'snipsy', level: 5 }, new Rng(1)));
    expect(w.useAbility(vine)).toBe('snip');
    expect(s.flags.has('gone:meadow-path:v1')).toBe(true);
  });

  it('finds paths around obstacles', () => {
    const grid = ['.....', '.###.', '.#...', '.#.#.', '...#.'];
    const p = findPath(5, 5, 0, 0, 2, 2, (x, y) => grid[y]![x] === '.');
    expect(p).not.toBeNull();
    expect(p!.at(-1)).toEqual([2, 2]);
    expect(findPath(5, 5, 0, 0, 2, 3, (x, y) => grid[y]![x] === '.' && !(x === 2 && y === 2))).not.toBeNull();
  });
});

describe('wild Agentmon', () => {
  it('appear only in their habitat, away from the player, and never step next to you', () => {
    const s = fresh();
    s.x = 11; s.y = 26;
    const w = new World(MAPS['meadow-path']!, s, DEX, 9);
    w.populate();
    expect(w.wild.length).toBe(AREA_BY_ID['meadow-path']!.spawns);
    for (const m of w.wild) {
      expect(w.ter(m.x, m.y)).toBe('tall');
      expect(Math.abs(m.x - s.x) + Math.abs(m.y - s.y)).toBeGreaterThanOrEqual(3);
    }
    for (let i = 0; i < 2000; i++) {
      w.update(0.25);
      for (const m of w.wild) {
        expect(w.ter(m.x, m.y)).toBe('tall');
        if (m.hopped) expect(Math.abs(m.x - s.x) + Math.abs(m.y - s.y)).toBeGreaterThan(1);
      }
    }
  });

  it('come back a while after they leave', () => {
    const s = fresh();
    const w = new World(MAPS['meadow-path']!, s, DEX, 4);
    w.populate();
    const n = w.wild.length;
    w.remove(w.wild[0]!.key);
    expect(w.wild.length).toBe(n - 1);
    for (let i = 0; i < 400; i++) w.update(0.25);
    expect(w.wild.length).toBe(n);
  });

  it('a shimmer is guaranteed once a species has three research stars', () => {
    const s = fresh();
    for (const e of AREA_BY_ID['meadow-path']!.wild) s.guide.stars[DEX.species[e.species]!.num] = 3;
    const w = new World(MAPS['meadow-path']!, s, DEX, 11);
    w.populate();
    expect(w.wild.some(m => m.shimmer)).toBe(true);
  });
});

describe('script helpers', () => {
  it('evaluates flag expressions', () => {
    const f = new Set(['a', 'b']);
    expect(evalFlags('a', f)).toBe(true);
    expect(evalFlags('!a', f)).toBe(false);
    expect(evalFlags('a & !c', f)).toBe(true);
    expect(evalFlags('c | b', f)).toBe(true);
    expect(evalFlags('c & a | d', f)).toBe(false);
  });

  it('fills names into lines', () => {
    expect(fillText('Hi {player}, meet {rival}!', { player: 'Ava', rival: 'Juno' })).toBe('Hi Ava, meet Juno!');
  });
});
