/**
 * Scoring. Every move returns its exact breakdown so the screen can say, for example, "Super! +60".
 * - +1 per block placed;
 * - lines: 10·L(L+1)/2 (10, 30, 60, 100, 150, 210 for 1–6 lines at once);
 * - the streak: each move that clears adds 1; line points are multiplied by ×1, ×1.5 … ×4
 *   (always a whole number); 3 moves in a row without a clear end it;
 * - clearing the whole board: +300.
 */
import { TUNING } from '../tuning';

const S = TUNING.score;
export type Word = 'Nice!' | 'Super!' | 'Amazing!' | 'Wow!' | 'Board clear!' | '';

export interface Breakdown {
  cells: number; lines: number; linePts: number;
  /** The multiplier in halves (2 = ×1, 8 = ×4). */
  multHalves: number;
  clearBonus: number; total: number; streak: number; word: Word;
}

export const linePoints = (lines: number) => S.lineBase * lines * (lines + 1) / 2;
export const multHalves = (streak: number) => 2 + Math.min(Math.max(streak - 1, 0), S.maxStep);
export const multText = (halves: number) => `×${halves % 2 ? (halves / 2).toFixed(1) : halves / 2}`;

/** The streak after a move: +1 when it clears; it survives `dryLimit − 1` dry moves in a row. */
export function nextStreak(streak: number, dry: number, lines: number): { streak: number; dry: number } {
  if (lines > 0) return { streak: streak + 1, dry: 0 };
  return dry + 1 >= S.dryLimit ? { streak: 0, dry: 0 } : { streak, dry: dry + 1 };
}

export function wordFor(lines: number, streak: number, boardClear: boolean): Word {
  if (boardClear) return 'Board clear!';
  if (lines === 0) return '';
  const level = Math.min(3, lines - 1 + (streak >= 4 ? 1 : 0));
  return (['Nice!', 'Super!', 'Amazing!', 'Wow!'] as const)[level]!;
}

/** Points for one move. `streak` is the streak including this move. */
export function score(cells: number, lines: number, streak: number, boardClear: boolean): Breakdown {
  const halves = lines > 0 ? multHalves(streak) : 2;
  const linePts = lines > 0 ? linePoints(lines) * halves / 2 : 0;
  const clearBonus = boardClear ? S.boardClear : 0;
  const placed = cells * S.perCell;
  return { cells: placed, lines, linePts, multHalves: halves, clearBonus, total: placed + linePts + clearBonus, streak, word: wordFor(lines, streak, boardClear) };
}
