/**
 * The Daily puzzle: the same for everyone on the same calendar day (the seed comes from the date
 * as yyyymmdd), a starting layout of a few scattered clumps, and 40 moves. Trays are built to fit
 * (with a few more big pieces than Easy), so nearly everyone finishes and the score is the
 * challenge. Missing a day costs nothing; there are no streaks.
 */
import { hash32, Rng } from '../core/rng';
import { findLines, fitsAt, newLines } from './board';
import { newGame, type Game } from './game';
import { PIECES } from './pieces';

export const DAILY_MOVES = 40;
export const DAILY_WEIGHTS = [40, 45, 15] as const;
export const dailySeed = (day: number) => hash32(0xda11, day);
/** yyyymmdd for a calendar date (the caller passes the player's local date). */
export const dayNumber = (year: number, month1: number, date: number) => year * 10000 + month1 * 100 + date;

/** A starting layout: 3–5 small and medium pieces dropped at random, with no full line. */
export function dailyLayout(day: number): string[] {
  const rng = new Rng(dailySeed(day) ^ 0x5eed);
  const lines = newLines();
  let lo = 0, hi = 0;
  const colors = new Uint8Array(64);
  const clumps = rng.range(3, 5);
  for (let k = 0, tries = 0; k < clumps && tries < 200; tries++) {
    const p = rng.pick(PIECES.filter(q => q.tier < 2));
    const i = rng.int(p.count);
    if (!fitsAt(lo, hi, p, i)) continue;
    const l = lo | p.lo[i]!, h = hi | p.hi[i]!;
    if (findLines(l, h, lines).count) continue;
    lo = l; hi = h; k++;
    const color = 1 + rng.int(6);
    for (const [dr, dc] of p.cells) colors[(p.pr[i]! + dr) * 8 + p.pc[i]! + dc] = color;
  }
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) { let s = ''; for (let c = 0; c < 8; c++) s += colors[r * 8 + c] ? String(colors[r * 8 + c]) : '.'; rows.push(s); }
  return rows;
}

export function dailyGame(day: number): Game {
  return newGame({ mode: 'daily', difficulty: 'normal', seed: dailySeed(day), layout: dailyLayout(day), movesLimit: DAILY_MOVES, weights: DAILY_WEIGHTS });
}
