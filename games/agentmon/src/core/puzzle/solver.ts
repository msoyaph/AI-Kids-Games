/**
 * Breadth-first solver for puzzle rooms: finds the shortest list of moves (and mirror turns /
 * clearing) from the start to the exit. Used by the tests (every room must be solvable), the
 * playthrough bot, the pacing model, and the stuck helper's hints.
 */
import type { Dir } from '../state';
import { interact, move, stateKey, tickPlatforms, type PuzzleState, type Room } from './puzzle';

/** A step, "face this way and press A" (turn a mirror, snip vines, melt ice), or wait for platforms. */
export type PuzzleAction = Dir | 'a0' | 'a1' | 'a2' | 'a3' | 'wait';

export interface Solution { actions: PuzzleAction[]; explored: number }

export function solve(room: Room, from: PuzzleState = room.start, maxStates = 400_000, abilities = { snip: true, melt: true }): Solution | null {
  const start = from;
  const seen = new Map<string, { prev: string | null; act: PuzzleAction | null }>();
  const k0 = stateKey(start);
  seen.set(k0, { prev: null, act: null });
  let frontier: { key: string; s: PuzzleState }[] = [{ key: k0, s: start }];
  // moving platforms make "tick" part of the state; cap it so rooms without platforms aren't affected
  const period = Math.max(1, ...(room.def.platforms ?? []).map(p => (p.path.length - 1) * 2));
  const norm = (s: PuzzleState): PuzzleState => (room.def.platforms?.length ? { ...s, tick: s.tick % period } : { ...s, tick: 0 });
  let explored = 0;
  while (frontier.length && explored < maxStates) {
    const next: typeof frontier = [];
    for (const { key, s } of frontier) {
      explored++;
      if (s.solved) {
        const actions: PuzzleAction[] = [];
        for (let k: string | null = key; k; k = seen.get(k)!.prev) { const a = seen.get(k)!.act; if (a !== null) actions.push(a); }
        return { actions: actions.reverse(), explored };
      }
      const tries: { act: PuzzleAction; s: PuzzleState }[] = [];
      for (const d of [0, 1, 2, 3] as Dir[]) {
        const r = move(room, s, d);
        if (!r.events.includes('blocked')) tries.push({ act: d, s: r.state });
        // face it and press A: turn a mirror, or clear vines / an ice block
        const i = interact(room, { ...s, dir: d }, abilities);
        if (i.events.length) tries.push({ act: `a${d}` as PuzzleAction, s: i.state });
      }
      // wait for the moving platforms
      if (room.def.platforms?.length) tries.push({ act: 'wait', s: tickPlatforms(room, s) });
      for (const t of tries) {
        const n = norm(t.s);
        const k = stateKey(n);
        if (seen.has(k)) continue;
        seen.set(k, { prev: key, act: t.act });
        next.push({ key: k, s: n });
      }
    }
    frontier = next;
  }
  return null;
}
