import { DT } from '../config/balance';
import { updatePlayer } from './player';
import type { SimInput, World } from './world';

function savePrevious(w: World): void {
  const p = w.player;
  p.px = p.x;
  p.py = p.y;
  p.pz = p.z;
}

/** Advance the world by one fixed 1/60 s tick. */
export function step(w: World, input: SimInput): void {
  if (w.state !== 'playing') return;
  w.tick++;
  w.time += DT;
  savePrevious(w);
  updatePlayer(w, input);
}
