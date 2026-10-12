import { describe, expect, it } from 'vitest';
import type { LevelDef } from '../../src/data/levelTypes';
import { tuning } from '../../src/systems/difficulty';
import { landingGravity, makeLanding, stepLanding, type LandingConfig } from '../../src/systems/landing';
import { LevelError, parseLevel, TILE } from '../../src/systems/level';
import {
  buildPlatWorld, doInteraction, findInteraction, jumpHeightTiles, makePlatEvents, makePlayer, platCfg, resetPlatEvents, resetPuzzle, stepPlatformer,
  type PlatInput, type PlatWorld, type PPlayer,
} from '../../src/systems/platformer';

const DT = 1 / 60;

function level(map: string[], extra: Partial<LevelDef> = {}): LevelDef {
  return { id: 'test', name: 'Test', body: 'moon', theme: 'moon', map, ...extra };
}

function world(def: LevelDef, gravityG = 1): { w: PlatWorld; p: PPlayer } {
  const m = parseLevel(def);
  const w = buildPlatWorld(m, platCfg(gravityG, def.avatar ?? 'astronaut', tuning('normal')), () => true, () => false);
  return { w, p: makePlayer(w) };
}

function run(w: PlatWorld, p: PPlayer, input: PlatInput, seconds: number) {
  const ev = makePlatEvents();
  const all = makePlatEvents();
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    resetPlatEvents(ev);
    stepPlatformer(w, p, input, DT, ev);
    all.picked.push(...ev.picked);
    all.solved.push(...ev.solved);
    all.opened.push(...ev.opened);
    all.goals.push(...ev.goals);
    all.bumped ||= ev.bumped;
    all.bounced ||= ev.bounced;
    all.jumped ||= ev.jumped;
  }
  return all;
}

const IDLE: PlatInput = { x: 0, jump: false, jumpPressed: false };
const RIGHT: PlatInput = { x: 1, jump: false, jumpPressed: false };

describe('level parsing', () => {
  it('rejects broken maps with a helpful message', () => {
    expect(() => parseLevel(level(['....', '####']))).toThrow(LevelError);
    expect(() => parseLevel(level(['P..?', '####']))).toThrow(/unknown symbol/);
    expect(() => parseLevel(level(['P...', '##.#']))).toThrow(/bottom row/);
    expect(() => parseLevel(level(['P.q.', '####']))).toThrow(/no entry/);
  });

  it('groups tall doors into one entity', () => {
    const m = parseLevel(level(['.d..', '.d..', 'Pd..', '####'], { ents: { d: { kind: 'door', id: 'd1', open: ['x'] } } }));
    const doors = m.ents.filter((e) => e.kind === 'door');
    expect(doors.length).toBe(1);
    expect(doors[0].h).toBe(3);
  });
});

describe('platformer', () => {
  it('lands on the ground and walks', () => {
    const { w, p } = world(level(['..........', 'P.........', '##########']));
    run(w, p, IDLE, 0.5);
    expect(p.onGround).toBe(true);
    const x0 = p.x;
    run(w, p, RIGHT, 1);
    expect(p.x).toBeGreaterThan(x0 + 150);
  });

  it('jumps about as high as the world allows (higher on the Moon)', () => {
    for (const g of [1, 0.17]) {
      const { w, p } = world(level(['..........', '..........', '..........', '..........', '..........', '..........', 'P.........', '##########']), g);
      run(w, p, IDLE, 0.5);
      const ground = p.y;
      let minY = p.y;
      const ev = makePlatEvents();
      stepPlatformer(w, p, { x: 0, jump: false, jumpPressed: true }, DT, ev);
      for (let i = 0; i < 120; i++) {
        resetPlatEvents(ev);
        stepPlatformer(w, p, IDLE, DT, ev);
        minY = Math.min(minY, p.y);
      }
      const tiles = (ground - minY) / TILE;
      expect(tiles).toBeGreaterThan(jumpHeightTiles(g) - 0.3);
      expect(tiles).toBeLessThan(jumpHeightTiles(g) + 0.5);
    }
  });

  it('one-way platforms can be jumped through from below and stood on', () => {
    const { w, p } = world(level(['......', '......', '......', '..====', 'P.....', '######']));
    run(w, p, IDLE, 0.5);
    p.x = 2.2 * TILE;
    const ev = makePlatEvents();
    stepPlatformer(w, p, { x: 0, jump: true, jumpPressed: true }, DT, ev);
    run(w, p, IDLE, 1.2);
    expect(p.onGround).toBe(true);
    expect(p.y + w.cfg.ph).toBeCloseTo(3 * TILE, 0);
  });

  it('pushing a crate onto a heavy plate opens the door, and it stays open', () => {
    const def = level(['.....d..', 'P.B..pd.', '########'], { ents: { p: { kind: 'plate', id: 'pl', heavy: true }, d: { kind: 'door', id: 'dr', open: ['pl'] } } });
    const { w, p } = world(def);
    run(w, p, IDLE, 0.3);
    const ev = run(w, p, RIGHT, 4);
    expect(ev.opened).toContain('dr');
    expect(w.doors[0].latched).toBe(true);
    resetPuzzle(w, p);
    run(w, p, IDLE, 1);
    expect(w.doors[0].amount).toBe(1);
  });

  it('carrying power orbs to a machine powers it and solves the puzzle', () => {
    const def = level(['........', 'POO..m..', '########'], { ents: { m: { kind: 'machine', id: 'm1', needs: 2, puzzle: 'pz', art: 'machine', name: 'Machine' } } });
    const { w, p } = world(def);
    run(w, p, IDLE, 0.3);
    const it = { kind: 'exit' as const, index: 0, x: 0, y: 0 };
    const ev = makePlatEvents();
    let solved = false;
    for (let round = 0; round < 2; round++) {
      // Walk to the next orb and grab it.
      for (let i = 0; i < 300; i++) {
        const f = findInteraction(w, p, { ...it });
        if (f && f.kind === 'pickOrb') {
          doInteraction(w, p, f, ev);
          break;
        }
        run(w, p, RIGHT, DT);
      }
      expect(p.carry).toBeGreaterThanOrEqual(0);
      for (let i = 0; i < 400; i++) {
        const f = findInteraction(w, p, { ...it });
        if (f && f.kind === 'deliver') {
          resetPlatEvents(ev);
          doInteraction(w, p, f, ev);
          if (ev.solved.includes('pz')) solved = true;
          break;
        }
        run(w, p, RIGHT, DT);
      }
      // Walk back for the next one.
      run(w, p, { x: -1, jump: false, jumpPressed: false }, 1.2);
    }
    expect(solved).toBe(true);
    expect(w.machines[0].powered).toBe(true);
  });

  it('color crystals solve their group when they match the sign', () => {
    const def = level(['........', 'P.kk....', '########'], { ents: { k: { kind: 'crystal', group: 'g', start: 0 } }, groups: { g: { target: [1, 2], puzzle: 'colors' } } });
    const { w, p } = world(def);
    const ev = makePlatEvents();
    const tap = (i: number, times: number) => {
      for (let k = 0; k < times; k++) doInteraction(w, p, { kind: 'crystal', index: i, x: 0, y: 0 }, ev);
    };
    tap(0, 1);
    expect(ev.solved).toEqual([]);
    tap(1, 2);
    expect(ev.solved).toEqual(['colors']);
    expect(w.active.has('g')).toBe(true);
  });

  it('bumblers bounce you back gently (no damage)', () => {
    const { w, p } = world(level(['..........', 'P...X.....', '##########']));
    const ev = run(w, p, RIGHT, 2);
    expect(ev.bumped).toBe(true);
  });

  it('jump pads launch you high', () => {
    const { w, p } = world(level(['......', '......', '......', '......', '......', '......', 'P.....', '###^##']));
    run(w, p, IDLE, 0.3);
    const ground = p.y;
    let minY = p.y;
    for (let i = 0; i < 90; i++) {
      run(w, p, { x: i < 20 ? 1 : 0, jump: false, jumpPressed: false }, DT);
      minY = Math.min(minY, p.y);
    }
    expect((ground - minY) / TILE).toBeGreaterThan(jumpHeightTiles(1) * 1.4);
  });

  it('collects coins, samples and reaches goals', () => {
    const def = level(['..........', 'P.$.s..g..', '##########'], { ents: { s: { kind: 'sample', item: 'moonrock' }, g: { kind: 'goal', marker: 'end' } } });
    const { w, p } = world(def);
    const ev = run(w, p, RIGHT, 3);
    expect(ev.picked.map((x) => x.kind).sort()).toEqual(['coin', 'sample']);
    expect(ev.goals.length).toBe(1);
  });
});

describe('landing', () => {
  const cfg = (safe: number): LandingConfig => ({ gravity: landingGravity(0.17), thrust: 560, side: 520, groundY: 570, padX: 640, padW: 170, safeSpeed: safe, worldW: 1280, assistAfter: 3 });

  it('the Easy auto-lander always lands on the pad with no input', () => {
    const c = cfg(150);
    const s = makeLanding(c, true, 200);
    let landed = false;
    for (let i = 0; i < 60 * 30 && !landed; i++) landed = stepLanding(s, c, { x: 0, thrust: false }, DT);
    expect(landed).toBe(true);
    expect(Math.abs(s.x - c.padX)).toBeLessThanOrEqual(c.padW / 2);
  });

  it('dropping fast bounces gently and turns on the helper after a few tries', () => {
    const c = cfg(100);
    const s = makeLanding(c, false, 640);
    let landed = false;
    for (let i = 0; i < 60 * 60 && !landed; i++) landed = stepLanding(s, c, { x: 0, thrust: false }, DT);
    expect(s.attempts).toBeGreaterThanOrEqual(3);
    expect(s.assist).toBe(true);
    expect(landed).toBe(true);
  });

  it('a slow centered touchdown is perfect', () => {
    const c = cfg(100);
    const s = makeLanding(c, false, 640);
    s.y = c.groundY - 5;
    s.vy = 20;
    let landed = false;
    for (let i = 0; i < 30 && !landed; i++) landed = stepLanding(s, c, { x: 0, thrust: false }, DT);
    expect(landed).toBe(true);
    expect(s.perfect).toBe(true);
  });
});
