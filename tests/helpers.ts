// Shared test helpers: headless game creation and player positioning.
import { createGame } from '../src/sim/systems';
import { newGameState } from '../src/sim/state';
import type { Game } from '../src/sim/game';

export function makeGame(seed = 4242): Game {
  return createGame(newGameState(seed, 'Tester'));
}

/** Teleport the player next to tile `target` (west side by default) facing it. */
export function faceTile(g: Game, target: number): boolean {
  const w = g.world;
  const N = w.size;
  const tx = target % N, tz = (target / N) | 0;
  const opts: [number, number, number][] = [
    [-1, 0, Math.PI / 2],
    [1, 0, -Math.PI / 2],
    [0, -1, 0],
    [0, 1, Math.PI],
  ];
  for (const [dx, dz, f] of opts) {
    const x = tx + dx, z = tz + dz;
    if (!w.inb(x, z)) continue;
    const i = w.idx(x, z);
    if (w.isWater(i) || w.structure(i) || w.height(i) !== w.height(target)) continue;
    const o = w.obj(i);
    if (o && o.k !== 'flower' && o.k !== 'weed') continue;
    g.state.player.x = x + 0.5;
    g.state.player.z = z + 0.5;
    g.state.player.level = w.height(i);
    g.state.player.facing = f;
    return true;
  }
  return false;
}

/** Run the action button and step time until the action completes. */
export function act(g: Game): boolean {
  const ok = g.act();
  for (let k = 0; k < 120 && g.action; k++) g.update(1 / 60, null);
  return ok;
}

export function findObj(g: Game, pred: (k: string, i: number) => boolean): number {
  for (const key of Object.keys(g.state.world.objects)) {
    const i = +key;
    if (pred(g.state.world.objects[i]!.k, i)) return i;
  }
  return -1;
}
