import type { CupData, SpeedClass } from '../../data/types';
import { findCup } from '../../data/cups';
import { pointsFor, sortStandings, type Standing } from '../../sim/rules';
import type { AiSlot, PlayerSlot, SessionConfig, SessionResult } from '../session';

/**
 * A 4-race cup: tracks the points table, builds each race's config (grid = previous race's finish order;
 * players start at the back of race 1) and reports the final standings.
 */
export class GrandPrix {
  readonly cup: CupData;
  raceIndex = 0;
  readonly standings: Standing[];
  private lastOrder: number[] | null = null;
  /** Points each kart earned in the most recent race. */
  lastPoints: number[] = [];

  constructor(
    cupId: string,
    readonly speedClass: SpeedClass,
    readonly mirror: boolean,
    readonly players: PlayerSlot[],
    readonly ai: AiSlot[],
    readonly seed: number,
    readonly mode: 'grandPrix' | 'versus' = 'grandPrix',
    readonly trackIds?: string[],
    readonly items = true,
    readonly itemSet: SessionConfig['itemSet'] = 'all',
    readonly laps = 3,
  ) {
    this.cup = findCup(cupId);
    const n = players.length + ai.length;
    this.standings = Array.from({ length: n }, (_, i) => ({ id: i, points: 0, finishes: [] }));
  }

  get tracks(): string[] {
    return this.trackIds ?? [...this.cup.tracks];
  }

  get done(): boolean {
    return this.raceIndex >= this.tracks.length;
  }

  config(): SessionConfig {
    const n = this.players.length + this.ai.length;
    let grid: number[];
    if (this.lastOrder) grid = [...this.lastOrder];
    else {
      // race 1: AI in front, players at the back
      grid = [];
      for (let i = this.players.length; i < n; i++) grid.push(i);
      for (let i = 0; i < this.players.length; i++) grid.push(i);
    }
    return {
      mode: this.mode,
      trackId: this.tracks[this.raceIndex],
      speedClass: this.speedClass,
      mirror: this.mirror,
      items: this.items,
      itemSet: this.itemSet,
      laps: this.laps,
      players: this.players,
      ai: this.ai,
      gridOrder: grid,
      seed: this.seed + this.raceIndex * 7919,
      intro: true,
    };
  }

  /** Apply a finished race; returns per-kart points awarded. */
  addResult(r: SessionResult): number[] {
    const pts = new Array(this.standings.length).fill(0);
    for (const res of r.results) {
      const p = pointsFor(res.rank);
      pts[res.index] = p;
      const st = this.standings[res.index];
      st.points += p;
      st.finishes.push(res.rank);
    }
    this.lastOrder = [...r.results].sort((a, b) => a.rank - b.rank).map((x) => x.index);
    this.lastPoints = pts;
    this.raceIndex++;
    return pts;
  }

  sorted(): Standing[] {
    return sortStandings(this.standings);
  }

  /** Final cup position (1-based) of a kart index. */
  placeOf(index: number): number {
    return this.sorted().findIndex((s) => s.id === index) + 1;
  }
}
