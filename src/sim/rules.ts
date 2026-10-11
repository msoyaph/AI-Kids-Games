// Pure scoring rules (unit tested).

/** Grand Prix points by finishing position (1st..8th). Positions beyond get 0. */
export const GP_POINTS = [15, 12, 10, 8, 6, 4, 2, 1] as const;

export function pointsFor(rank: number): number {
  return rank >= 1 && rank <= GP_POINTS.length ? GP_POINTS[rank - 1] : 0;
}

export type Medal = 'gold' | 'silver' | 'bronze';

export function medalFor(rank: number): Medal | null {
  return rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : null;
}

export function medalRank(m: Medal | null | undefined): number {
  return m === 'gold' ? 3 : m === 'silver' ? 2 : m === 'bronze' ? 1 : 0;
}

export function betterMedal(a: Medal | null | undefined, b: Medal | null | undefined): Medal | null {
  return medalRank(a) >= medalRank(b) ? (a ?? null) : (b ?? null);
}

export interface Standing {
  id: number;
  points: number;
  /** Finishing positions so far (for tie breaks). */
  finishes: number[];
}

/**
 * Sort cup standings: most points first; ties broken by more race wins, then better last-race finish.
 */
export function sortStandings(list: Standing[]): Standing[] {
  return [...list].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const wa = a.finishes.filter((f) => f === 1).length;
    const wb = b.finishes.filter((f) => f === 1).length;
    if (wb !== wa) return wb - wa;
    const la = a.finishes[a.finishes.length - 1] ?? 99;
    const lb = b.finishes[b.finishes.length - 1] ?? 99;
    return la - lb;
  });
}

/** Battle: rank by score, then balloons left, then fewer times popped. */
export function battleOrder<T extends { score: number; balloons: number; popped: number; index: number }>(list: T[]): T[] {
  return [...list].sort((a, b) => b.score - a.score || b.balloons - a.balloons || a.popped - b.popped || a.index - b.index);
}
