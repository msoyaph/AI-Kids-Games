import { describe, expect, it } from 'vitest';
import { doorOpen, interact, move, parseRoom, platformTiles, traceBeams, type RoomDef } from '../../src/core/puzzle/puzzle';
import { solve } from '../../src/core/puzzle/solver';

const room = (rows: string[], extra: Partial<RoomDef> = {}) => parseRoom({ id: 't', name: 't', hint: '', rows, ...extra });

describe('puzzle rules', () => {
  it('pushes a block onto a plate, which opens the door to the exit', () => {
    const r = room([
      '#######',
      '#S.B._#',
      '###D###',
      '###E###',
    ]);
    expect(doorOpen(r, r.start)).toBe(false);
    let s = move(r, r.start, 2).state; // to (2,1)
    s = move(r, s, 2).state; // push block to (4,1)
    s = move(r, s, 2).state; // push block onto the plate at (5,1)
    expect(doorOpen(r, s)).toBe(true);
    expect(solve(r)).not.toBeNull();
  });

  it('a block can not be pushed into a wall or another block', () => {
    const r = room(['#####', '#SBB#', '#####']);
    const m = move(r, r.start, 2);
    expect(m.events).toEqual(['blocked']);
    expect(m.state.x).toBe(1);
  });

  it('you slide on ice until something stops you; blocks slide too', () => {
    const r = room(['########', '#S,,,,.#', '########']);
    const s = move(r, r.start, 2).state;
    expect(s.x).toBe(6);
    const r2 = room(['########', '#SB,,,.#', '########']);
    const s2 = move(r2, r2.start, 2).state;
    expect(s2.blocks).toEqual([1 * 8 + 6]);
  });

  it('a block pushed into a pit fills it, so you can cross', () => {
    const r = room(['#######', '#SBx.E#', '#######']);
    const sol = solve(r);
    expect(sol).not.toBeNull();
    let s = move(r, r.start, 2).state;
    expect(s.pitsFilled).toEqual([1 * 7 + 3]);
    s = move(r, s, 2).state;
    s = move(r, s, 2).state;
    s = move(r, s, 2).state;
    expect(s.solved).toBe(true);
  });

  it('colour switches flip their gates', () => {
    const r = room(['#######', '#SpP.E#', '#######']);
    let s = move(r, r.start, 2).state;
    expect(s.gatesOpen).toEqual(['p']);
    s = move(r, s, 2).state;
    expect(s.x).toBe(3);
    expect(solve(r)?.actions).toEqual([2, 2, 2, 2]);
  });

  it('mirrors bend a light beam onto the crystal; a turnable mirror can be turned with A', () => {
    const r = room([
      '#######',
      '#L..m.#',
      '#.....#',
      '#S..C.#',
      '###D###',
      '###E###',
    ], { emitters: [{ x: 1, y: 1, dir: 2 }] });
    // 'm' starts as '/': a beam going right turns up, missing the crystal below it
    expect(traceBeams(r, r.start).lit.size).toBe(0);
    const sol = solve(r);
    expect(sol).not.toBeNull();
    expect(sol!.actions.some(a => typeof a === 'string')).toBe(true);
    // turned to '\\' it sends the beam down onto the crystal
    const facing = { ...r.start, x: 4, y: 2, dir: 3 as const };
    const turned = interact(r, facing, { snip: true, melt: true }).state;
    expect(traceBeams(r, turned).lit.size).toBe(1);
  });

  it('moving platforms carry you across a gap, one tile per move', () => {
    const r = room(['#######', '#S===E#', '#######'], { platforms: [{ path: [[2, 1], [3, 1], [4, 1]], start: 0 }] });
    expect(platformTiles(r, 0)).toEqual([9]);
    expect(platformTiles(r, 2)).toEqual([11]);
    const sol = solve(r);
    expect(sol).not.toBeNull();
  });

  it('vines and ice blocks need the right friend', () => {
    const r = room(['######', '#SV.E#', '######']);
    expect(solve(r, r.start, 10_000, { snip: false, melt: false })).toBeNull();
    expect(solve(r, r.start, 10_000, { snip: true, melt: false })).not.toBeNull();
  });
});
