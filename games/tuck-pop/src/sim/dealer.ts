/**
 * The fair dealer. Promises (property-tested in tests/unit/dealer.test.ts):
 * - I1, every mode: a fresh tray always has a piece that fits, so a game can only end partway
 *   through a tray, never on a deal.
 * - I2, built trays (Easy, Relax, Adventure, Shuffle): all three pieces can be placed, in some order.
 * - I3, Normal: while the board is open (a free 3×3 and enough empty cells), all three can be
 *   placed. Bad luck alone never ends a game; a crowded board can. The "open" threshold rises
 *   with the score, so even perfect play ends.
 * - I4: a deal depends only on (board, score, seed, tray number, salt), with its own random
 *   stream, so resuming, undoing or replaying never changes it.
 * - I5: pieces get bigger as the score grows on Normal.
 */
import { hash32, Rng } from '../core/rng';
import { TUNING } from '../tuning';
import { emptyCells, findLines, fitsAnywhere, fitsAt, newLines } from './board';
import { PIECES, piece, type Piece, type Tier } from './pieces';
import { placeable } from './solver';

const D = TUNING.dealer;
export type Weights = readonly [number, number, number];
export type DealKind = 'build' | 'normal';
export interface Dealt { pieces: Piece[]; colors: number[] }
export interface DealStats { deals: number; draws: number; built: number; ops: number }

const byTier: Piece[][] = [[], [], []];
const familySize = new Map<string, number>();
for (const p of PIECES) { byTier[p.tier]!.push(p); familySize.set(p.family, (familySize.get(p.family) ?? 0) + 1); }
/** A piece's weight inside its tier: its family's weight shared by the family's orientations. */
const inTier = PIECES.map(p => (D.family[p.family] ?? 1) / familySize.get(p.family)!);
const O3 = piece('o3');

export const pressure = (score: number) => Math.min(1, Math.max(0, (score - D.pressureFrom) / D.pressureSpan));
export function normalWeights(score: number): Weights {
  const t = pressure(score);
  return [0, 1, 2].map(i => D.normalStart[i]! + (D.normalEnd[i]! - D.normalStart[i]!) * t) as unknown as Weights;
}
export const openThreshold = (score: number) => D.openBase + Math.round(D.openPressure * pressure(score)) + Math.max(0, Math.floor((score - D.tightenFrom) / D.tightenEvery));
/** Open: a free 3×3 and at least `openThreshold` empty cells. */
export const isOpen = (lo: number, hi: number, score: number) => emptyCells(lo, hi) >= openThreshold(score) && fitsAnywhere(lo, hi, O3);

/** The random stream for one deal. */
export const dealRng = (seed: number, trayNo: number, salt: number) => new Rng(hash32(seed, trayNo, salt, 0x7c0ffee));

function drawPiece(rng: Rng, weights: Weights, tier?: Tier): Piece {
  const t = tier ?? (rng.weighted([0, 1, 2] as const, weights) as Tier);
  const list = byTier[t]!;
  return rng.weighted(list, list.map(p => inTier[p.index]!));
}

function colorsFor(rng: Rng, n: number): number[] {
  const all = [1, 2, 3, 4, 5, 6].slice(0, TUNING.colors);
  rng.shuffle(all);
  return all.slice(0, n);
}

const work = newLines();
/**
 * Builds a tray by playing it out on a copy of the board: each piece is one that fits the board
 * as it will be (weighted like a normal draw), placed (often where it clears the most), then
 * lines clear. So the tray can always be fully placed. A single block always fits (a board can't
 * be full without full lines), so this never fails.
 */
export function buildTray(lo: number, hi: number, rng: Rng, weights: Weights, n = 3): Piece[] {
  const out: Piece[] = [];
  for (let k = 0; k < n; k++) {
    const fitting = PIECES.filter(p => fitsAnywhere(lo, hi, p));
    const p = rng.weighted(fitting, fitting.map(q => (weights[q.tier] || 0.0001) * inTier[q.index]!));
    let best = -1, bestLines = -1, seen = 0, pick = -1;
    const kind = rng.chance(D.kindPlacement);
    for (let i = 0; i < p.count; i++) {
      if (!fitsAt(lo, hi, p, i)) continue;
      seen++;
      if (rng.int(seen) === 0) pick = i; // reservoir: a uniform random fitting position
      if (kind) { const n = findLines(lo | p.lo[i], hi | p.hi[i], work).count; if (n > bestLines) { bestLines = n; best = i; } }
    }
    const i = kind && best >= 0 ? best : pick;
    const lines = findLines(lo | p.lo[i]!, hi | p.hi[i]!, work);
    lo = (lo | p.lo[i]!) & ~lines.clrLo; hi = (hi | p.hi[i]!) & ~lines.clrHi;
    out.push(p);
  }
  return rng.shuffle(out);
}

/** A random tray from the score's weights; above some pressure, sometimes a "hard set" of two or more big pieces. */
function drawTray(rng: Rng, score: number): Piece[] {
  const weights = normalWeights(score);
  const hard = rng.chance(D.hardSet * pressure(score));
  const tray = [0, 1, 2].map(i => drawPiece(rng, weights, hard && i < 2 ? 2 : undefined));
  return rng.shuffle(tray);
}

export interface DealRequest {
  lo: number; hi: number; score: number; seed: number; trayNo: number;
  kind: DealKind;
  /** Weights for built trays (Easy, Relax, Adventure levels). */
  weights?: Weights;
  /** Separates other streams from the same tray number (Shuffle, the Relax reshuffle). */
  salt?: number;
  /** How many pieces (3 unless set; Normal's random draws only apply to full trays). */
  count?: number;
  stats?: DealStats;
}

export function deal(req: DealRequest): Dealt {
  const rng = dealRng(req.seed, req.trayNo, req.salt ?? 0);
  const n = req.count ?? 3;
  const stats = req.stats;
  if (stats) stats.deals++;
  let pieces: Piece[] | null = null;
  if (req.kind === 'normal' && n === 3) {
    const open = isOpen(req.lo, req.hi, req.score);
    const spent = { ops: 0 };
    for (let d = 0; d < D.draws && !pieces && spent.ops < D.dealBudget; d++) {
      const tray = drawTray(rng, req.score);
      if (stats) stats.draws++;
      if (!tray.some(p => fitsAnywhere(req.lo, req.hi, p))) continue;
      if (open && !placeable(req.lo, req.hi, tray, Math.min(D.checkBudget, D.dealBudget - spent.ops), spent)) continue;
      pieces = tray;
    }
    if (stats) stats.ops += spent.ops;
  }
  if (!pieces) {
    if (stats) stats.built++;
    pieces = buildTray(req.lo, req.hi, rng, req.weights ?? (req.kind === 'normal' ? normalWeights(req.score) : D.easy), n);
  }
  return { pieces, colors: colorsFor(rng, n) };
}

export const newStats = (): DealStats => ({ deals: 0, draws: 0, built: 0, ops: 0 });
