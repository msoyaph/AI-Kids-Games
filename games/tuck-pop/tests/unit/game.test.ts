import { describe, expect, it } from 'vitest';
import { toRows } from '../../src/core/bits';
import { fitsAt } from '../../src/sim/board';
import { addSingle, canMove, CRACKED, newGame, place, rescues, shuffle, undo, type Game } from '../../src/sim/game';
import { piece, positionAt } from '../../src/sim/pieces';

/** Puts a chosen piece into slot 0 (tests only). */
function give(g: Game, id: string, slot = 0) { g.tray[slot] = { piece: piece(id), color: 2 }; }
/** The first position where the slot's piece fits. */
const firstFit = (g: Game, slot: number) => { const p = g.tray[slot]!.piece; for (let i = 0; i < p.count; i++) if (fitsAt(g.lo, g.hi, p, i)) return i; return -1; };

describe('a game', () => {
  it('starts with an empty board and a tray of three, the same for the same seed', () => {
    const a = newGame({ mode: 'classic', seed: 42 }), b = newGame({ mode: 'classic', seed: 42 });
    expect(a.lo | a.hi).toBe(0);
    expect(a.tray.map(t => t!.piece.id)).toEqual(b.tray.map(t => t!.piece.id));
    expect(a.tray.map(t => t!.color)).toEqual(b.tray.map(t => t!.color));
    expect(new Set(a.tray.map(t => t!.color)).size).toBe(3);
    expect(a.trayNo).toBe(1);
  });
  it('places a piece, colors its cells, scores one point per block and empties the slot', () => {
    const g = newGame({ mode: 'classic', seed: 1 });
    give(g, 'l4a');
    const m = place(g, 0, positionAt(piece('l4a'), 2, 3))!;
    expect(m.placedCells.sort((a, b) => a - b)).toEqual([19, 27, 35, 36]);
    expect([...g.colors].filter(Boolean)).toHaveLength(4);
    expect(m.points.total).toBe(4); expect(g.score).toBe(4); expect(g.tray[0]).toBeNull();
  });
  it('refuses a placement that overlaps or leaves the board', () => {
    const g = newGame({ mode: 'classic', seed: 1 });
    give(g, 'o2', 0); give(g, 'o2', 1);
    place(g, 0, positionAt(piece('o2'), 0, 0));
    expect(place(g, 1, positionAt(piece('o2'), 1, 1))).toBeNull();
    expect(place(g, 1, 999)).toBeNull();
    expect(place(g, 0, 0)).toBeNull(); // the slot is empty now
  });
  it('clears a row and a column at once, scores both, and builds a streak', () => {
    const g = newGame({ mode: 'classic', seed: 3, layout: ['.#######', '#.......', '#.......', '#.......', '#.......', '#.......', '#.......', '#.......'] });
    give(g, 'dot');
    const m = place(g, 0, positionAt(piece('dot'), 0, 0))!;
    expect(m.rows).toBe(1); expect(m.cols).toBe(1);
    expect(m.cleared).toHaveLength(15);
    expect(m.boardClear).toBe(true);
    expect(m.points).toMatchObject({ cells: 1, lines: 2, linePts: 30, clearBonus: 300, total: 331, word: 'Board clear!' });
    expect(g.streak).toBe(1); expect(g.lines).toBe(2); expect(g.boardClears).toBe(1);
  });
  it('deals a new tray when the last piece is placed', () => {
    const g = newGame({ mode: 'classic', seed: 9 });
    let m;
    for (let k = 0; k < 3; k++) m = place(g, k, firstFit(g, k))!;
    expect(m!.dealt).toBe(true); expect(g.trayNo).toBe(2);
    expect(g.tray.every(Boolean)).toBe(true);
  });
  it('knows when nothing the player holds fits (only lone cells free, big pieces in the tray)', () => {
    const g = newGame({ mode: 'classic', seed: 5, layout: ['##.#.#.#', '#.#.#.#.', '.#.#.#.#', '#.#.#.#.', '.#.#.#.#', '#.#.#.#.', '.#.#.#.#', '#.#.#.#.'] });
    g.tray = [{ piece: piece('o3'), color: 1 }, { piece: piece('i2h'), color: 2 }, { piece: piece('i5v'), color: 3 }];
    expect(canMove(g)).toBe(false);
    g.tray[1] = { piece: piece('dot'), color: 2 };
    expect(canMove(g)).toBe(true);
  });
  it('a move that leaves nothing placeable ends the game, and Undo brings it back', () => {
    const g = newGame({ mode: 'classic', seed: 5, layout: ['##.#.#.#', '#.#.#.#.', '.#.#.#.#', '#.#.#.#.', '.#.#.#.#', '#.#.#.#.', '.#.#.#.#', '#.#.#.#.'] });
    g.tray = [{ piece: piece('dot'), color: 1 }, { piece: piece('i2h'), color: 2 }, null];
    const before = toRows(g.lo, g.hi);
    const m = place(g, 0, positionAt(piece('dot'), 0, 2))!;
    expect(m.over).toBe(true); expect(g.end).toBe('stuck');
    expect(rescues(g)).toEqual({ undo: false, shuffle: true, single: true });
    expect(undo(g)).toBe(true);
    expect(toRows(g.lo, g.hi)).toEqual(before); expect(g.over).toBe(false); expect(g.score).toBe(0);
    expect(g.tray[0]!.piece.id).toBe('dot');
    expect(undo(g)).toBe(false); // one step only
  });
  it('Shuffle deals a tray that can be placed, and Single adds a one-cell piece', () => {
    const g = newGame({ mode: 'classic', seed: 8, layout: ['##.#.#.#', '#.#.#.#.', '.#.#.#.#', '#.#.#.#.', '.#.#.#.#', '#.#.#.#.', '.#.#.#.#', '#.#.#.#.'] });
    g.tray = [{ piece: piece('o3'), color: 1 }, null, null];
    expect(canMove(g)).toBe(false);
    expect(shuffle(g)).toBe(true);
    expect(canMove(g)).toBe(true);
    expect(addSingle(g)).toBe(true); expect(addSingle(g)).toBe(false);
    expect(g.bonus!.piece.id).toBe('dot');
    const m = place(g, 3, positionAt(piece('dot'), 0, 2))!;
    expect(m.slot).toBe(3); expect(g.bonus).toBeNull();
  });
  it('Relax reshuffles once for free when nothing fits, then ends', () => {
    const g = newGame({ mode: 'relax', seed: 5, layout: ['##.#.#.#', '#.#.#.#.', '.#.#.#.#', '#.#.#.#.', '.#.#.#.#', '#.#.#.#.', '.#.#.#.#', '#.#.#.#.'] });
    expect(g.freeShuffle).toBe(1); expect(g.freeUndo).toBe(1);
    g.tray = [{ piece: piece('dot'), color: 1 }, { piece: piece('o3'), color: 2 }, null];
    const m = place(g, 0, positionAt(piece('dot'), 0, 2))!;
    expect(m.reshuffled).toBe(true); expect(m.over).toBe(false); expect(g.freeShuffle).toBe(0);
    expect(canMove(g)).toBe(true);
  });
  it('stones crack on the first clear and break on the second; gems are collected', () => {
    const g = newGame({ mode: 'adventure', seed: 2, goal: { kind: 'stones', target: 1 }, layout: ['.s#g####', '........', '........', '........', '........', '........', '........', '........'] });
    give(g, 'dot');
    const m1 = place(g, 0, positionAt(piece('dot'), 0, 0))!;
    expect(m1.cracked).toEqual([1]); expect(m1.collected).toEqual([3]); expect(m1.broken).toEqual([]);
    expect(g.colors[1]).toBe(CRACKED); expect(g.collected).toBe(1);
    expect(toRows(g.lo, g.hi)[0]).toBe('.#......');
    g.tray = [{ piece: piece('i2h'), color: 1 }, { piece: piece('i3h'), color: 2 }, { piece: piece('i2h'), color: 3 }];
    place(g, 0, positionAt(piece('i2h'), 0, 2)); place(g, 1, positionAt(piece('i3h'), 0, 4));
    const m2 = place(g, 2, positionAt(piece('i2h'), 1, 0))!;
    expect(m2.over).toBe(false);
    expect(toRows(g.lo, g.hi)[0]).toBe('.######.');
    g.tray = [{ piece: piece('dot'), color: 1 }, { piece: piece('dot'), color: 2 }, null];
    place(g, 1, positionAt(piece('dot'), 0, 7));
    const m3 = place(g, 0, positionAt(piece('dot'), 0, 0))!;
    expect(m3.broken).toEqual([1]); expect(g.broken).toBe(1);
    expect(m3.end).toBe('goal');
  });
  it('a move limit ends Daily and Adventure games', () => {
    const g = newGame({ mode: 'daily', seed: 4, movesLimit: 2 });
    place(g, 0, firstFit(g, 0)); const m = place(g, 1, firstFit(g, 1))!;
    expect(m.over).toBe(true); expect(m.end).toBe('moves');
    expect(shuffle(g)).toBe(false);
  });
});
