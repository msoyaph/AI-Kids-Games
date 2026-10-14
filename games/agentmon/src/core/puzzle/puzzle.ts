/**
 * Trial puzzle rooms: the rules, pure and turn-based (every step is one move, so rooms can be
 * solved by a computer and replayed exactly). A room is solved when you reach the exit E; its door
 * D opens when every plate has a block on it and every crystal is lit.
 *
 * Room characters:
 *   # wall · . floor · , ice (you and blocks slide until something stops you) · x pit (a block
 *   pushed in fills it) · B block · _ plate · Q block on a plate · D door · E exit · S start ·
 *   p t y colour switches (step on to flip that colour's gates) · P T Y colour gates (start closed) ·
 *   L light emitter (direction in the room data) · / \ fixed mirrors · m turnable mirror (face it and
 *   press A; starts as /) · n turnable mirror starting as \ · C crystal · = gap a moving platform
 *   crosses · V vines (a Leaf friend snips them) · I ice block (a Flare friend melts it) ·
 *   ~ water (blocks you; Paddle doesn't work in Trials).
 */
import type { Dir } from '../state';

export type Color = 'p' | 't' | 'y';
export interface Platform { path: [number, number][]; start: number }
export interface Emitter { x: number; y: number; dir: Dir }

export interface RoomDef {
  id: string;
  name: string;
  rows: string[];
  emitters?: Emitter[];
  platforms?: Platform[];
  /** Short hint shown by the stuck helper. */
  hint: string;
  /** Teaching rooms show a one-time tutorial. */
  tutorial?: string;
}

export interface PuzzleState {
  x: number;
  y: number;
  dir: Dir;
  blocks: number[];
  pitsFilled: number[];
  gatesOpen: Color[];
  /** Turnable mirror tiles that currently face the other way. */
  flipped: number[];
  cleared: number[];
  tick: number;
  solved: boolean;
}

export interface Room {
  def: RoomDef;
  w: number;
  h: number;
  grid: string[];
  start: PuzzleState;
}

const D: Record<Dir, [number, number]> = { 0: [0, 1], 1: [-1, 0], 2: [1, 0], 3: [0, -1] };

export function parseRoom(def: RoomDef): Room {
  const h = def.rows.length, w = Math.max(...def.rows.map(r => r.length));
  const grid: string[] = [];
  const blocks: number[] = [];
  let sx = 1, sy = 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let ch = def.rows[y]![x] ?? '#';
    if (ch === 'S') { sx = x; sy = y; ch = '.'; }
    if (ch === 'B') { blocks.push(y * w + x); ch = '.'; }
    if (ch === 'Q') { blocks.push(y * w + x); ch = '_'; }
    grid.push(ch);
  }
  return { def, w, h, grid, start: { x: sx, y: sy, dir: 3, blocks: blocks.sort((a, b) => a - b), pitsFilled: [], gatesOpen: [], flipped: [], cleared: [], tick: 0, solved: false } };
}

export const cloneState = (s: PuzzleState): PuzzleState => ({ ...s, blocks: [...s.blocks], pitsFilled: [...s.pitsFilled], gatesOpen: [...s.gatesOpen], flipped: [...s.flipped], cleared: [...s.cleared] });

const GATE: Record<string, Color> = { P: 'p', T: 't', Y: 'y' };

/** Where every moving platform is at this tick (they go along their path and back, one tile a step). */
export function platformTiles(room: Room, tick: number): number[] {
  return (room.def.platforms ?? []).map(p => {
    const n = p.path.length;
    const period = Math.max(1, (n - 1) * 2);
    let i = (p.start + tick) % period;
    if (i >= n) i = period - i;
    const [x, y] = p.path[i]!;
    return y * room.w + x;
  });
}

function cell(room: Room, s: PuzzleState, i: number): string {
  const ch = room.grid[i] ?? '#';
  if (ch === 'x' && s.pitsFilled.includes(i)) return '.';
  if ((ch === 'V' || ch === 'I') && s.cleared.includes(i)) return '.';
  return ch;
}

/** The door is open when every plate holds a block and every crystal is lit. */
export function doorOpen(room: Room, s: PuzzleState): boolean {
  for (let i = 0; i < room.grid.length; i++) if (room.grid[i] === '_' && !s.blocks.includes(i)) return false;
  const lit = litCrystals(room, s);
  for (let i = 0; i < room.grid.length; i++) if (room.grid[i] === 'C' && !lit.has(i)) return false;
  return true;
}

/** Can a mover (player or block) stand on tile i? */
function free(room: Room, s: PuzzleState, i: number, x: number, y: number, forBlock: boolean): boolean {
  if (x < 0 || y < 0 || x >= room.w || y >= room.h) return false;
  const ch = cell(room, s, i);
  if (ch === '#' || ch === '~' || ch === 'L' || ch === 'C' || ch === 'V' || ch === 'I' || ch === '/' || ch === '\\' || ch === 'm' || ch === 'n') return false;
  if (ch in GATE && !s.gatesOpen.includes(GATE[ch]!)) return false;
  if (ch === 'D' && !doorOpen(room, s)) return false;
  if (ch === '=' && (forBlock || !platformTiles(room, s.tick).includes(i))) return false;
  if (ch === 'x') return forBlock; // a block falls in and fills it; you can't walk into a pit
  if (ch === 'E' && forBlock) return false;
  return true;
}

export type StepEvent = 'moved' | 'pushed' | 'filled' | 'slid' | 'blocked' | 'toggled' | 'solved' | 'rotated' | 'cleared';

/**
 * One move. Returns the new state (the old one is untouched) and what happened, for sounds and
 * animations. Moving platforms advance after every successful move, carrying you if you're on one.
 */
export function move(room: Room, s0: PuzzleState, dir: Dir): { state: PuzzleState; events: StepEvent[] } {
  const s = cloneState(s0);
  s.dir = dir;
  const events: StepEvent[] = [];
  if (s.solved) return { state: s, events };
  const [dx, dy] = D[dir];
  let x = s.x, y = s.y;
  const nx = x + dx, ny = y + dy, ni = ny * room.w + nx;
  const bi = s.blocks.indexOf(ni);
  if (bi >= 0) {
    // push the block (it slides on ice, fills a pit)
    let bx = nx, by = ny;
    let moved = false;
    for (;;) {
      const tx = bx + dx, ty = by + dy, ti = ty * room.w + tx;
      if (!free(room, s, ti, tx, ty, true) || s.blocks.includes(ti) || (tx === x && ty === y)) break;
      bx = tx; by = ty; moved = true;
      if (cell(room, s, ti) === 'x') { s.pitsFilled.push(ti); s.blocks.splice(bi, 1); events.push('filled'); break; }
      if (cell(room, s, ti) !== ',') break;
    }
    if (!moved) return { state: s0.dir === dir ? s0 : { ...cloneState(s0), dir }, events: ['blocked'] };
    if (!events.includes('filled')) { s.blocks[bi] = by * room.w + bx; s.blocks.sort((a, b) => a - b); }
    events.push('pushed');
    s.x = nx; s.y = ny;
  } else {
    if (!free(room, s, ni, nx, ny, false)) return { state: { ...cloneState(s0), dir }, events: ['blocked'] };
    x = nx; y = ny;
    // slide on ice
    while (cell(room, s, y * room.w + x) === ',') {
      const tx = x + dx, ty = y + dy, ti = ty * room.w + tx;
      if (!free(room, s, ti, tx, ty, false) || s.blocks.includes(ti)) break;
      x = tx; y = ty;
      events.push('slid');
    }
    s.x = x; s.y = y;
    events.push('moved');
  }
  // colour switches flip their gates when you step on them (gates with a block on them stay open)
  const here = cell(room, s, s.y * room.w + s.x);
  if (here === 'p' || here === 't' || here === 'y') {
    const c = here as Color;
    if (s.gatesOpen.includes(c)) {
      const occupied = room.grid.some((ch, i) => GATE[ch] === c && s.blocks.includes(i));
      if (!occupied) s.gatesOpen = s.gatesOpen.filter(g => g !== c);
    } else s.gatesOpen = [...s.gatesOpen, c].sort();
    events.push('toggled');
  }
  if (room.grid[s.y * room.w + s.x] === 'E') { s.solved = true; events.push('solved'); }
  return { state: s, events };
}

/**
 * Moving platforms slide one tile along their path on their own clock (the Trial scene ticks
 * every 0.7 s), carrying you if you're standing on one. Moves don't wait for them.
 */
export function tickPlatforms(room: Room, s0: PuzzleState): PuzzleState {
  if (!room.def.platforms?.length) return s0;
  const s = cloneState(s0);
  const before = platformTiles(room, s.tick);
  s.tick++;
  const after = platformTiles(room, s.tick);
  const onIdx = before.indexOf(s.y * room.w + s.x);
  if (onIdx >= 0 && room.grid[s.y * room.w + s.x] === '=') {
    const t = after[onIdx]!;
    s.x = t % room.w;
    s.y = Math.floor(t / room.w);
  }
  return s;
}

/** Face a turnable mirror and press A to turn it; face vines or an ice block to clear them. */
export function interact(room: Room, s0: PuzzleState, abilities: { snip: boolean; melt: boolean }): { state: PuzzleState; events: StepEvent[] } {
  const [dx, dy] = D[s0.dir];
  const tx = s0.x + dx, ty = s0.y + dy, ti = ty * room.w + tx;
  const ch = cell(room, s0, ti);
  const s = cloneState(s0);
  if (ch === 'm' || ch === 'n') {
    s.flipped = s.flipped.includes(ti) ? s.flipped.filter(i => i !== ti) : [...s.flipped, ti].sort((a, b) => a - b);
    return { state: s, events: ['rotated'] };
  }
  if ((ch === 'V' && abilities.snip) || (ch === 'I' && abilities.melt)) {
    s.cleared = [...s.cleared, ti].sort((a, b) => a - b);
    return { state: s, events: ['cleared'] };
  }
  return { state: s0, events: [] };
}

/** Which way a mirror tile faces right now: '/' or '\\'. */
export function mirrorAt(room: Room, s: PuzzleState, i: number): '/' | '\\' | null {
  const ch = room.grid[i];
  if (ch === '/' || ch === '\\') return ch;
  if (ch === 'm') return s.flipped.includes(i) ? '\\' : '/';
  if (ch === 'n') return s.flipped.includes(i) ? '/' : '\\';
  return null;
}

/** Trace every beam. Returns lit crystals, and the beam path (tile, direction) for drawing. */
export function traceBeams(room: Room, s: PuzzleState): { lit: Set<number>; path: { i: number; dir: Dir }[] } {
  const lit = new Set<number>();
  const path: { i: number; dir: Dir }[] = [];
  for (const e of room.def.emitters ?? []) {
    let x = e.x, y = e.y, dir = e.dir;
    const seen = new Set<string>();
    for (let steps = 0; steps < room.w * room.h * 4; steps++) {
      const [dx, dy] = D[dir];
      x += dx; y += dy;
      if (x < 0 || y < 0 || x >= room.w || y >= room.h) break;
      const i = y * room.w + x;
      const key = `${i}:${dir}`;
      if (seen.has(key)) break;
      seen.add(key);
      const ch = cell(room, s, i);
      if (ch === 'C') { lit.add(i); path.push({ i, dir }); break; }
      if (ch === '#' || ch === 'V' || ch === 'I' || ch === 'L' || s.blocks.includes(i)) break;
      if (ch in GATE && !s.gatesOpen.includes(GATE[ch]!)) break;
      if (ch === 'D' && !doorOpenIgnoringCrystals(room, s)) break;
      path.push({ i, dir });
      const m = mirrorAt(room, s, i);
      if (m === '/') dir = ({ 0: 1, 1: 0, 2: 3, 3: 2 } as Record<Dir, Dir>)[dir];
      else if (m === '\\') dir = ({ 0: 2, 2: 0, 1: 3, 3: 1 } as Record<Dir, Dir>)[dir];
    }
  }
  return { lit, path };
}

function doorOpenIgnoringCrystals(room: Room, s: PuzzleState): boolean {
  for (let i = 0; i < room.grid.length; i++) if (room.grid[i] === '_' && !s.blocks.includes(i)) return false;
  return true;
}

export const litCrystals = (room: Room, s: PuzzleState) => traceBeams(room, s).lit;

/** A compact key for a state (for the solver's "seen" set). */
export function stateKey(s: PuzzleState): string {
  return `${s.x},${s.y}|${s.blocks.join(',')}|${s.pitsFilled.join(',')}|${s.gatesOpen.join('')}|${s.flipped.join(',')}|${s.cleared.join(',')}|${s.tick}`;
}
