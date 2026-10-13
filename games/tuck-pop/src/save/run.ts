/**
 * The game in progress (key `tuckpop.run`): the current Classic, Relax and Daily games, so a reload
 * resumes exactly where the player was, Undo included. Each run records the rules version; a run
 * made under different rules (or with a piece this version doesn't know) is dropped, while the
 * profile's best scores are kept.
 */
import { hasPiece, piece } from '../sim/pieces';
import { newGame, type Game, type Mode, type Slot, type Snapshot } from '../sim/game';
import { read, remove, write } from './storage';

export const RUN_VERSION = 1;
/** Bump when a saved game from the old rules would play differently. */
export const RULES_VERSION = 1;
export const RUN_KEY = 'run';
export type RunMode = Extract<Mode, 'classic' | 'relax' | 'daily'>;

type SlotData = [string, number] | null;
interface Core {
  trayNo: number; lo: number; hi: number; colors: string; masks: number[];
  tray: SlotData[]; bonus: SlotData;
  score: number; streak: number; dry: number; moves: number; lines: number; placed: number;
  boardClears: number; bestStreak: number; collected: number; broken: number; freeShuffle: number;
}
export interface RunData extends Core { rules: number; mode: RunMode; difficulty: 'easy' | 'normal'; seed: number; shuffles: number; continues: number; freeUndo: number; movesLimit: number; weights: number[] | null; undo: Core | null }

const slotOut = (s: Slot | null): SlotData => (s ? [s.piece.id, s.color] : null);
const slotIn = (d: unknown): Slot | null => (Array.isArray(d) && typeof d[0] === 'string' && hasPiece(d[0]) && Number.isInteger(d[1]) && d[1] >= 1 && d[1] <= 6 ? { piece: piece(d[0]), color: d[1] } : null);

function core(g: Game | Snapshot): Core {
  return {
    trayNo: g.trayNo, lo: g.lo, hi: g.hi, colors: Array.from(g.colors, c => String(c)).join(''), masks: [g.itemLo, g.itemHi, g.s2Lo, g.s2Hi, g.s1Lo, g.s1Hi],
    tray: g.tray.map(slotOut), bonus: slotOut(g.bonus),
    score: g.score, streak: g.streak, dry: g.dry, moves: g.moves, lines: g.lines, placed: g.placed,
    boardClears: g.boardClears, bestStreak: g.bestStreak, collected: g.collected, broken: g.broken, freeShuffle: g.freeShuffle,
  };
}

export function toRun(g: Game): RunData {
  return { rules: RULES_VERSION, mode: g.mode as RunMode, difficulty: g.difficulty, seed: g.seed, shuffles: g.shuffles, continues: g.continues, freeUndo: g.freeUndo, movesLimit: g.movesLimit, weights: g.weights ? [...g.weights] : null, ...core(g), undo: g.undo ? core(g.undo) : null };
}

const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
/** Rebuilds a core state; null if anything is off (then the run is dropped). */
function coreIn(d: Record<string, unknown>): Snapshot | null {
  const ints = ['trayNo', 'score', 'streak', 'dry', 'moves', 'lines', 'placed', 'boardClears', 'bestStreak', 'collected', 'broken', 'freeShuffle'];
  if (!ints.every(k => num(d[k]) && (d[k] as number) >= 0) || !num(d.lo) || !num(d.hi)) return null;
  if (typeof d.colors !== 'string' || !/^[0-8]{64}$/.test(d.colors)) return null;
  if (!Array.isArray(d.masks) || d.masks.length !== 6 || !d.masks.every(num)) return null;
  if (!Array.isArray(d.tray) || d.tray.length !== 3) return null;
  const tray = d.tray.map(slotIn);
  if (d.tray.some((t, i) => t !== null && !tray[i])) return null;
  const colors = Uint8Array.from(d.colors, ch => Number(ch));
  // the colors and the bitboard must agree
  for (let i = 0; i < 64; i++) { const set = (i < 32 ? ((d.lo as number) >>> i) & 1 : ((d.hi as number) >>> (i - 32)) & 1) === 1; if (set !== colors[i]! > 0) return null; }
  const [itemLo, itemHi, s2Lo, s2Hi, s1Lo, s1Hi] = d.masks as number[];
  const s: Record<string, unknown> = { colors, tray, bonus: slotIn(d.bonus), itemLo, itemHi, s2Lo, s2Hi, s1Lo, s1Hi };
  for (const k of ['lo', 'hi', ...ints]) s[k] = d[k];
  return s as unknown as Snapshot;
}

/** A saved run back into a game, or null when it can't be used. */
export function fromRun(raw: unknown): Game | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (d.rules !== RULES_VERSION || (d.mode !== 'classic' && d.mode !== 'relax' && d.mode !== 'daily') || (d.difficulty !== 'easy' && d.difficulty !== 'normal') || !num(d.seed)) return null;
  const c = coreIn(d);
  if (!c || (!c.tray.some(Boolean) && !c.bonus)) return null;
  const g = newGame({ mode: d.mode, difficulty: d.difficulty, seed: d.seed as number });
  Object.assign(g, c, { colors: c.colors, tray: c.tray });
  g.shuffles = num(d.shuffles) ? (d.shuffles as number) : 0;
  g.continues = num(d.continues) ? (d.continues as number) : 0;
  g.freeUndo = num(d.freeUndo) ? (d.freeUndo as number) : 0;
  g.movesLimit = num(d.movesLimit) ? (d.movesLimit as number) : 0;
  g.weights = Array.isArray(d.weights) && d.weights.length === 3 && d.weights.every(num) ? (d.weights as unknown as [number, number, number]) : null;
  g.undo = d.undo && typeof d.undo === 'object' ? coreIn(d.undo as Record<string, unknown>) : null;
  return g;
}

interface Stored { v: number; classic?: RunData; relax?: RunData; daily?: RunData }
function stored(): Stored {
  try { const v = JSON.parse(read(RUN_KEY) ?? 'null'); return v && typeof v === 'object' && v.v === RUN_VERSION ? v : { v: RUN_VERSION }; } catch { return { v: RUN_VERSION }; }
}

export function loadRun(mode: RunMode): Game | null { return fromRun(stored()[mode]); }

/** Saves the run (or forgets it when the game is over). */
export function saveRun(g: Game): boolean {
  if (g.mode !== 'classic' && g.mode !== 'relax' && g.mode !== 'daily') return true;
  const s = stored();
  if (g.over) delete s[g.mode]; else s[g.mode] = toRun(g);
  if (!s.classic && !s.relax && !s.daily) { remove(RUN_KEY); return true; }
  return write(RUN_KEY, JSON.stringify(s));
}

export function dropRun(mode: RunMode) { const s = stored(); delete s[mode]; if (!s.classic && !s.relax && !s.daily) remove(RUN_KEY); else write(RUN_KEY, JSON.stringify(s)); }
