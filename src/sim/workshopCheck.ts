import type { Difficulty } from '../data/difficulty';
import type { MapDef } from '../data/maps/types';
import { AutoPlayer } from './autoplay';
import { FlowField, UNREACHABLE } from './flowField';
import { DT, Game } from './Game';
import { F_BUILD, Grid } from './grid';

/** Rule problems that stop a Workshop map from being played or shared (text keys `workshop.problem.*`). */
export type WsProblem = 'castle' | 'castleShape' | 'spawn' | 'spawns' | 'gates' | 'path' | 'room' | 'close';

/** Minimum buildable cells and walking distance from any spawn. */
const MIN_BUILD = 24;
const MIN_PATH = 8;

/** Structural checks (instant). An empty list means the map is playable. */
export function checkWorkshop(map: MapDef): WsProblem[] {
  const text = map.grid.join('');
  const out: WsProblem[] = [];
  const castleCells = [...text].filter((c) => c === 'C').length;
  if (castleCells === 0) out.push('castle');
  if (!text.includes('S')) out.push('spawn');
  if (out.length) return out;
  const g = new Grid(map);
  if (g.spawns.length > 4) out.push('spawns');
  // every castle must be exactly a 2×2 block (at most two of them)
  if (castleCells % 4 !== 0 || g.castles.length > 2 || g.castles.length * 4 !== castleCells) out.push('castleShape');
  else
    for (const c of g.castles) {
      const x0 = c.x - 1;
      const y0 = c.y - 1;
      for (const [dx, dy] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ] as const) {
        const i = g.idx(x0 + dx, y0 + dy);
        if (!g.inBounds(x0 + dx, y0 + dy) || !g.goals.includes(i)) out.push('castleShape');
      }
    }
  const pIn = text.includes('P');
  const pOut = text.includes('Q');
  if (pIn !== pOut || [...text].filter((c) => c === 'P').length > 1 || [...text].filter((c) => c === 'Q').length > 1) out.push('gates');
  const f = new FlowField(g);
  f.compute();
  let shortest = Infinity;
  for (const s of g.spawns) {
    const d = f.dist[s]!;
    if (d >= UNREACHABLE) {
      out.push('path');
      break;
    }
    shortest = Math.min(shortest, d);
  }
  if (!out.includes('path') && shortest < MIN_PATH) out.push('close');
  let build = 0;
  for (let i = 0; i < g.flags.length; i++) if (g.flags[i]! & F_BUILD) build++;
  if (build < MIN_BUILD) out.push('room');
  return [...new Set(out)];
}

/**
 * The "can it be won?" check: the good bot plays the map headless on Normal,
 * a slice at a time so the page stays responsive (progress bar in the editor).
 */
export class WorkshopBotRun {
  readonly game: Game;
  private readonly bot: AutoPlayer;
  private ticks = 0;
  private static readonly MAX_TICKS = 30 * 60 * 60;

  constructor(map: MapDef, difficulty: Difficulty = 'normal', seed = 1) {
    this.game = new Game({ map, difficulty, mode: 'campaign', seed });
    this.bot = new AutoPlayer(this.game);
  }

  get done(): boolean {
    return this.game.state !== 'playing' || this.ticks >= WorkshopBotRun.MAX_TICKS;
  }

  get won(): boolean {
    return this.game.state === 'won';
  }

  /** Share of the waves started (for the progress bar). */
  get progress(): number {
    return this.done ? 1 : Math.min(0.99, this.game.waveNum / this.game.totalWaves);
  }

  /** Run for about `ms` milliseconds of real time. */
  stepFor(ms: number): void {
    const end = performance.now() + ms;
    while (!this.done && performance.now() < end) {
      for (let i = 0; i < 60 && !this.done; i++) {
        this.bot.update();
        this.game.step();
        this.game.events.clear();
        this.ticks++;
      }
    }
  }

  /** Seconds of game time simulated so far. */
  get simulated(): number {
    return this.ticks * DT;
  }
}
