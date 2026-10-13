/**
 * One game: the board, the tray, the score and the rules for a move. Pure and seeded: no DOM,
 * no Pixi, no clock, no Math.random. The same seed and the same moves always give the same game,
 * which is what the bots, the tests, Undo and resume-after-reload rely on.
 *
 * Cells hold a color 1–6 (a block), STONE (a stone that takes two line clears) or CRACKED (a
 * stone with one clear left). Gems/fruit sit on top of blocks (the `items` mask) and are
 * collected when their block clears.
 */
import { pop } from '../core/bits';
import { TUNING } from '../tuning';
import { findLines, fitsAnywhere, fitsAt, newLines } from './board';
import { deal, type DealKind, type DealStats, type Weights } from './dealer';
import { piece, type Piece } from './pieces';
import { nextStreak, score, type Breakdown } from './scoring';
import { placeable } from './solver';

export type Mode = 'classic' | 'relax' | 'adventure' | 'daily';
export type Difficulty = 'easy' | 'normal';
export type End = '' | 'stuck' | 'moves' | 'goal';
export const STONE = 7, CRACKED = 8;

export interface Slot { piece: Piece; color: number }
export interface Goal { kind: 'lines' | 'items' | 'stones' | 'score'; target: number }

export interface Game {
  mode: Mode; difficulty: Difficulty; seed: number;
  /** Trays dealt so far (the next deal uses this number). */
  trayNo: number;
  lo: number; hi: number;
  colors: Uint8Array;
  /** Gems or fruit (on top of blocks), and stones with two (s2) or one (s1) clears left. */
  itemLo: number; itemHi: number; s2Lo: number; s2Hi: number; s1Lo: number; s1Hi: number;
  tray: (Slot | null)[];
  /** The Single block helper: a fourth, one-cell piece. */
  bonus: Slot | null;
  score: number; streak: number; dry: number; moves: number; lines: number; placed: number;
  boardClears: number; bestStreak: number; collected: number; broken: number;
  shuffles: number; continues: number;
  /** Relax: one free reshuffle when nothing fits, and one free Undo. */
  freeShuffle: number; freeUndo: number;
  /** Adventure and Daily: a move limit (0 = none) and a goal. */
  movesLimit: number; goal: Goal | null;
  /** Built-tray weights (Easy, Relax, Adventure). */
  weights: Weights | null;
  over: boolean; end: End;
  undo: Snapshot | null;
}

export interface Move {
  slot: number; piece: Piece; color: number; pos: number; r: number; c: number;
  placedCells: number[];
  rows: number; cols: number;
  /** Cells cleared by lines, with the color they had. */
  cleared: { index: number; color: number }[];
  collected: number[]; cracked: number[]; broken: number[];
  points: Breakdown; boardClear: boolean;
  dealt: boolean; reshuffled: boolean; over: boolean; end: End;
}

export interface NewGame {
  mode: Mode; seed: number; difficulty?: Difficulty;
  /** A starting layout: 8 rows of '.', '1'–'6' (blocks), 'g' (a block with a gem/fruit), 's' (stone), 'c' (cracked stone). */
  layout?: readonly string[];
  movesLimit?: number; goal?: Goal; weights?: Weights;
}

const set = (i: number): [number, number] => (i < 32 ? [(1 << i) | 0, 0] : [0, (1 << (i - 32)) | 0]);
const has = (lo: number, hi: number, i: number) => (i < 32 ? (lo >>> i) & 1 : (hi >>> (i - 32)) & 1) === 1;

/** Classic Normal deals at random (with its promises); every other mode builds trays that fit. */
export function dealKind(g: Pick<Game, 'mode' | 'difficulty'>): DealKind {
  return g.mode === 'classic' && g.difficulty === 'normal' ? 'normal' : 'build';
}

export function newGame(opts: NewGame): Game {
  const g: Game = {
    mode: opts.mode, difficulty: opts.difficulty ?? (opts.mode === 'daily' ? 'normal' : 'easy'), seed: opts.seed >>> 0, trayNo: 0,
    lo: 0, hi: 0, colors: new Uint8Array(64), itemLo: 0, itemHi: 0, s2Lo: 0, s2Hi: 0, s1Lo: 0, s1Hi: 0,
    tray: [null, null, null], bonus: null,
    score: 0, streak: 0, dry: 0, moves: 0, lines: 0, placed: 0, boardClears: 0, bestStreak: 0, collected: 0, broken: 0,
    shuffles: 0, continues: 0,
    freeShuffle: opts.mode === 'relax' ? 1 : 0, freeUndo: opts.mode === 'relax' ? 1 : 0,
    movesLimit: opts.movesLimit ?? 0, goal: opts.goal ?? null, weights: opts.weights ?? null,
    over: false, end: '', undo: null,
  };
  if (opts.layout) applyLayout(g, opts.layout);
  refill(g);
  return g;
}

function applyLayout(g: Game, layout: readonly string[]) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const ch = layout[r]?.[c] ?? '.', i = r * 8 + c;
    if (ch === '.') continue;
    const [l, h] = set(i);
    g.lo |= l; g.hi |= h;
    if (ch === 's') { g.colors[i] = STONE; g.s2Lo |= l; g.s2Hi |= h; }
    else if (ch === 'c') { g.colors[i] = CRACKED; g.s1Lo |= l; g.s1Hi |= h; }
    else { g.colors[i] = ch === 'g' ? 1 + (i % TUNING.colors) : Math.min(TUNING.colors, Math.max(1, Number(ch) || 1)); if (ch === 'g') { g.itemLo |= l; g.itemHi |= h; } }
  }
}

/** Deals a fresh tray of three. */
function refill(g: Game, salt = 0) {
  const dealt = deal({ lo: g.lo, hi: g.hi, score: g.score, seed: g.seed, trayNo: g.trayNo, kind: dealKind(g), weights: g.weights ?? undefined, salt, stats: stats ?? undefined });
  g.trayNo++;
  g.tray = dealt.pieces.map((p, i) => ({ piece: p, color: dealt.colors[i]! }));
}

/** Deal statistics, collected only while a simulation sets them. */
let stats: DealStats | null = null;
export const collectStats = (s: DealStats | null) => { stats = s; };

const slotOf = (g: Game, slot: number) => (slot === 3 ? g.bonus : g.tray[slot] ?? null);
export function canPlace(g: Game, slot: number, pos: number): boolean {
  const s = slotOf(g, slot);
  return !!s && !g.over && pos >= 0 && pos < s.piece.count && fitsAt(g.lo, g.hi, s.piece, pos);
}

/** Whether any piece the player holds fits somewhere. */
export function canMove(g: Game): boolean {
  for (let k = 0; k < 4; k++) { const s = slotOf(g, k); if (s && fitsAnywhere(g.lo, g.hi, s.piece)) return true; }
  return false;
}

/** What the goal has reached so far (Adventure). */
export function progress(g: Game): number {
  if (!g.goal) return 0;
  switch (g.goal.kind) {
    case 'lines': return g.lines;
    case 'items': return g.collected;
    case 'stones': return g.broken;
    case 'score': return g.score;
  }
}
export const goalMet = (g: Game) => !!g.goal && progress(g) >= g.goal.target;

const lines = newLines();

/** Places the piece in `slot` (0–2, or 3 for the Single block) at position `pos`. Returns null if it doesn't fit. */
export function place(g: Game, slot: number, pos: number): Move | null {
  if (!canPlace(g, slot, pos)) return null;
  const s = slotOf(g, slot)!, p = s.piece;
  g.undo = snapshot(g);
  // place
  const placedCells: number[] = [];
  for (const [dr, dc] of p.cells) { const i = (p.pr[pos]! + dr) * 8 + p.pc[pos]! + dc; placedCells.push(i); g.colors[i] = s.color; }
  g.lo |= p.lo[pos]!; g.hi |= p.hi[pos]!;
  // clear
  findLines(g.lo, g.hi, lines);
  const cleared: Move['cleared'] = [], collected: number[] = [], cracked: number[] = [], broken: number[] = [];
  if (lines.count) {
    const cl = lines.clrLo, ch = lines.clrHi;
    for (let i = 0; i < 64; i++) {
      if (!has(cl, ch, i)) continue;
      if (has(g.s2Lo, g.s2Hi, i)) { cracked.push(i); g.colors[i] = CRACKED; continue; }
      if (has(g.s1Lo, g.s1Hi, i)) broken.push(i);
      if (has(g.itemLo, g.itemHi, i)) collected.push(i);
      cleared.push({ index: i, color: g.colors[i]! });
      g.colors[i] = 0;
    }
    const keepLo = g.s2Lo & cl, keepHi = g.s2Hi & ch; // full-health stones crack and stay
    g.s1Lo = (g.s1Lo & ~cl) | keepLo; g.s1Hi = (g.s1Hi & ~ch) | keepHi;
    g.s2Lo &= ~cl; g.s2Hi &= ~ch;
    g.itemLo &= ~cl; g.itemHi &= ~ch;
    g.lo = (g.lo & ~cl) | keepLo; g.hi = (g.hi & ~ch) | keepHi;
  }
  const boardClear = lines.count > 0 && g.lo === 0 && g.hi === 0;
  const st = nextStreak(g.streak, g.dry, lines.count);
  g.streak = st.streak; g.dry = st.dry;
  const points = score(p.size, lines.count, g.streak, boardClear);
  g.score += points.total; g.moves++; g.lines += lines.count; g.placed += p.size;
  g.collected += collected.length; g.broken += broken.length;
  if (boardClear) g.boardClears++;
  g.bestStreak = Math.max(g.bestStreak, g.streak);
  if (slot === 3) g.bonus = null; else g.tray[slot] = null;
  // next tray, then the end of the game
  let dealt = false, reshuffled = false;
  if (g.tray.every(t => !t)) { refill(g); dealt = true; }
  if (goalMet(g)) finish(g, 'goal');
  else if (g.movesLimit && g.moves >= g.movesLimit) finish(g, 'moves');
  else if (!canMove(g)) {
    if (g.freeShuffle > 0) { g.freeShuffle--; shuffle(g); reshuffled = true; }
    else finish(g, 'stuck');
  }
  return {
    slot, piece: p, color: s.color, pos, r: p.pr[pos]!, c: p.pc[pos]!, placedCells, rows: lines.rows, cols: lines.cols,
    cleared, collected, cracked, broken, points, boardClear, dealt, reshuffled, over: g.over, end: g.end,
  };
}

function finish(g: Game, end: End) { g.over = true; g.end = end; }

/** Helpers. Each returns whether it did anything; the caller pays from the player's supply. */
export function undo(g: Game): boolean {
  if (!g.undo) return false;
  restore(g, g.undo);
  g.undo = null;
  return true;
}

/** Shuffle: a new tray of three, built to fit. */
export function shuffle(g: Game): boolean {
  if (g.end === 'goal' || g.end === 'moves') return false;
  g.shuffles++;
  const dealt = deal({ lo: g.lo, hi: g.hi, score: g.score, seed: g.seed, trayNo: g.trayNo, kind: 'build', weights: g.weights ?? TUNING.dealer.easy, salt: 1000 + g.shuffles });
  g.tray = dealt.pieces.map((p, i) => ({ piece: p, color: dealt.colors[i]! }));
  g.over = false; g.end = '';
  return true;
}

/** Single block: a one-cell piece to place anywhere. */
export function addSingle(g: Game): boolean {
  if (g.bonus || g.end === 'goal' || g.end === 'moves') return false;
  g.bonus = { piece: piece('dot'), color: 1 + (g.moves % TUNING.colors) };
  g.over = false; g.end = '';
  return true;
}

/** Which helpers would let a stuck game go on: Shuffle and Single always; Undo only if the earlier tray could all be placed. */
export function rescues(g: Game): { undo: boolean; shuffle: boolean; single: boolean } {
  const u = g.undo;
  const undoHelps = !!u && placeable(u.lo, u.hi, u.tray.filter((t): t is Slot => !!t).map(t => t.piece), TUNING.dealer.checkBudget);
  const ok = g.end === 'stuck' || !g.over;
  return { undo: ok && undoHelps, shuffle: ok, single: ok && !g.bonus };
}

/** Everything a move changes, for Undo. */
export interface Snapshot {
  trayNo: number; lo: number; hi: number; colors: Uint8Array;
  itemLo: number; itemHi: number; s2Lo: number; s2Hi: number; s1Lo: number; s1Hi: number;
  tray: (Slot | null)[]; bonus: Slot | null;
  score: number; streak: number; dry: number; moves: number; lines: number; placed: number;
  boardClears: number; bestStreak: number; collected: number; broken: number; freeShuffle: number;
}
const FIELDS = ['trayNo', 'lo', 'hi', 'itemLo', 'itemHi', 's2Lo', 's2Hi', 's1Lo', 's1Hi', 'bonus', 'score', 'streak', 'dry', 'moves', 'lines', 'placed', 'boardClears', 'bestStreak', 'collected', 'broken', 'freeShuffle'] as const;

export function snapshot(g: Game): Snapshot {
  const s = { colors: g.colors.slice(), tray: g.tray.slice() } as Snapshot;
  for (const f of FIELDS) (s as unknown as Record<string, unknown>)[f] = g[f];
  return s;
}
function restore(g: Game, s: Snapshot) {
  for (const f of FIELDS) (g as unknown as Record<string, unknown>)[f] = s[f];
  g.colors = s.colors.slice(); g.tray = s.tray.slice();
  g.over = false; g.end = '';
}

/** Cell helpers for views and tests. */
export const filled = (g: Game, i: number) => has(g.lo, g.hi, i);
export const hasItem = (g: Game, i: number) => has(g.itemLo, g.itemHi, i);
export const stonesLeft = (g: Game) => pop(g.s2Lo) + pop(g.s2Hi) + pop(g.s1Lo) + pop(g.s1Hi);
export const itemsLeft = (g: Game) => pop(g.itemLo) + pop(g.itemHi);
