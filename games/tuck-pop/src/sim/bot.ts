/**
 * Two bots that play through the real rules (game.ts), for balance tests (npm run sim), the
 * Adventure level checks and the capture route's autoplay.
 * - Casual: a young player. Looks at the pieces it holds (sometimes only one), never plans the
 *   order, likes clearing lines and snug spots, dislikes leaving lone holes, chooses loosely
 *   and sometimes just drops a piece anywhere it fits.
 * - Strong: plans the whole tray (every order, a beam of the best positions) and judges the
 *   board it leaves: room, holes, ragged edges, space for big pieces, then points.
 */
import { Rng } from '../core/rng';
import { emptyCells, findLines, fitsAnywhere, newLines } from './board';
import { canMove, place, type Game, type Move } from './game';
import { piece, type Piece } from './pieces';

export interface Choice { slot: number; pos: number }
const lines = newLines();

const full = (lo: number, hi: number, r: number, c: number) =>
  r < 0 || r > 7 || c < 0 || c > 7 || (r < 4 ? (lo >>> (r * 8 + c)) & 1 : (hi >>> ((r - 4) * 8 + c)) & 1) === 1;

/** Empty cells boxed in on all four sides (walls count as full). */
export function holes(lo: number, hi: number): number {
  let n = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
    if (!full(lo, hi, r, c) && full(lo, hi, r - 1, c) && full(lo, hi, r + 1, c) && full(lo, hi, r, c - 1) && full(lo, hi, r, c + 1)) n++;
  return n;
}

/** Changes between full and empty along every row and column (walls count as full): ragged boards score high. */
export function transitions(lo: number, hi: number): number {
  let n = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c <= 8; c++) if (full(lo, hi, r, c - 1) !== full(lo, hi, r, c)) n++;
  for (let c = 0; c < 8; c++) for (let r = 0; r <= 8; r++) if (full(lo, hi, r - 1, c) !== full(lo, hi, r, c)) n++;
  return n;
}

/** Filled neighbours (and walls) around a placed piece: how snugly it sits. */
function contacts(lo: number, hi: number, p: Piece, i: number): number {
  let n = 0;
  const r0 = p.pr[i]!, c0 = p.pc[i]!;
  for (const [dr, dc] of p.cells) {
    const r = r0 + dr, c = c0 + dc;
    if (full(lo, hi, r - 1, c)) n++; if (full(lo, hi, r + 1, c)) n++; if (full(lo, hi, r, c - 1)) n++; if (full(lo, hi, r, c + 1)) n++;
  }
  return n;
}

const slotsHeld = (g: Game) => [0, 1, 2, 3].filter(k => (k === 3 ? g.bonus : g.tray[k]));
const pieceIn = (g: Game, k: number) => (k === 3 ? g.bonus! : g.tray[k]!).piece;

export function casualChoice(g: Game, rng: Rng): Choice | null {
  const held = slotsHeld(g).filter(k => fitsAnywhere(g.lo, g.hi, pieceIn(g, k)));
  if (!held.length) return null;
  // Looks at every piece it holds (but never plans the order), and now and then just picks one.
  const looked = rng.chance(0.25) ? [rng.pick(held)] : held;
  const options: Choice[] = [], weights: number[] = [];
  const baseHoles = holes(g.lo, g.hi);
  for (const slot of looked) {
    const p = pieceIn(g, slot);
    for (let i = 0; i < p.count; i++) {
      if ((g.lo & p.lo[i]!) !== 0 || (g.hi & p.hi[i]!) !== 0) continue;
      const l = g.lo | p.lo[i]!, h = g.hi | p.hi[i]!;
      findLines(l, h, lines);
      const nl = l & ~lines.clrLo, nh = h & ~lines.clrHi;
      options.push({ slot, pos: i });
      weights.push(12 * lines.count + 2 * contacts(g.lo, g.hi, p, i) - 4 * Math.max(0, holes(nl, nh) - baseHoles));
    }
  }
  if (rng.chance(0.08)) return rng.pick(options);
  // softmax with temperature 3
  const top = Math.max(...weights);
  return rng.weighted(options, weights.map(w => Math.exp((w - top) / 3)));
}

const O3 = piece('o3'), I5H = piece('i5h'), I5V = piece('i5v'), C5 = [piece('c5a'), piece('c5b'), piece('c5c'), piece('c5d')], O2 = piece('o2');
/** How good a board is to be left with (higher is better). */
export function boardValue(lo: number, hi: number): number {
  let room = 0;
  if (fitsAnywhere(lo, hi, O3)) room += 14;
  if (fitsAnywhere(lo, hi, I5H)) room += 4;
  if (fitsAnywhere(lo, hi, I5V)) room += 4;
  for (const p of C5) if (fitsAnywhere(lo, hi, p)) room += 1.5;
  if (fitsAnywhere(lo, hi, O2)) room += 3;
  return emptyCells(lo, hi) * 1.2 - holes(lo, hi) * 7 - transitions(lo, hi) * 0.9 + room;
}

interface Node { lo: number; hi: number; used: number; first: Choice | null; points: number; value: number }

/** The strong bot's plan for the pieces it holds: the best first move, after looking at every order with a beam. */
export function strongChoice(g: Game, beam = 8): Choice | null {
  const held = slotsHeld(g);
  let frontier: Node[] = [{ lo: g.lo, hi: g.hi, used: 0, first: null, points: 0, value: 0 }];
  let best: Node | null = null;
  for (let depth = 0; depth < held.length; depth++) {
    const next: Node[] = [];
    for (const node of frontier) for (const k of held) {
      if (node.used & (1 << k)) continue;
      const p = pieceIn(g, k);
      for (let i = 0; i < p.count; i++) {
        if ((node.lo & p.lo[i]!) !== 0 || (node.hi & p.hi[i]!) !== 0) continue;
        const l = node.lo | p.lo[i]!, h = node.hi | p.hi[i]!;
        findLines(l, h, lines);
        const nl = l & ~lines.clrLo, nh = h & ~lines.clrHi;
        const points = node.points + lines.count * (lines.count + 1) * 5 + (nl === 0 && nh === 0 ? 300 : 0);
        const n: Node = { lo: nl, hi: nh, used: node.used | (1 << k), first: node.first ?? { slot: k, pos: i }, points, value: 0 };
        n.value = boardValue(nl, nh) + points * 0.08;
        next.push(n);
      }
    }
    if (!next.length) break;
    next.sort((a, b) => b.value - a.value);
    frontier = next.slice(0, beam);
    // prefer plans that place more pieces; among equals, the best value
    best = frontier[0]!;
  }
  return best?.first ?? null;
}

export type BotKind = 'casual' | 'strong';
export function choose(kind: BotKind, g: Game, rng: Rng): Choice | null {
  return kind === 'casual' ? casualChoice(g, rng) : strongChoice(g);
}

/** Seconds a person might take for a move: dragging, thinking (longer on a busy board), watching clears. */
export function moveSeconds(m: Move, filledBefore: number, relax = false): number {
  let s = 1.3 + 0.8 + 0.03 * filledBefore;
  const lineCount = popcount8(m.rows) + popcount8(m.cols);
  if (lineCount) s += (0.5 + 0.15 * lineCount) * (relax ? 1.4 : 1);
  if (m.boardClear) s += 1.2;
  if (m.dealt) s += 0.4;
  return s;
}
const popcount8 = (x: number) => { let n = 0; while (x) { n += x & 1; x >>>= 1; } return n; };

export interface Played { score: number; moves: number; seconds: number; lines: number; boardClears: number; bestStreak: number; end: string; capped: boolean }

/** Plays one game to the end (or the move cap) with a bot. */
export function playOut(g: Game, kind: BotKind, rng: Rng, cap = 4000): Played {
  let seconds = 0;
  while (!g.over && g.moves < cap && canMove(g)) {
    const choice = choose(kind, g, rng);
    if (!choice) break;
    const filled = 64 - emptyCells(g.lo, g.hi);
    const m = place(g, choice.slot, choice.pos);
    if (!m) throw new Error(`bot chose an illegal move: slot ${choice.slot}, position ${choice.pos}`);
    seconds += moveSeconds(m, filled, g.mode === 'relax');
  }
  return { score: g.score, moves: g.moves, seconds, lines: g.lines, boardClears: g.boardClears, bestStreak: g.bestStreak, end: g.end, capped: !g.over && g.moves >= cap };
}
