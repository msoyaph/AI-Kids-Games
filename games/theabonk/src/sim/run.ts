import { placeShrines } from './shrines';
import { recomputePlayerStats } from './stats';
import { addWeapon } from './weapons';
import { createWorld, type World, type WorldOptions } from './world';

/** Create a world ready to play: starting weapon equipped, stats resolved. */
export function newRun(opts: WorldOptions): World {
  const w = createWorld(opts);
  recomputePlayerStats(w);
  w.player.hp = w.player.stats.maxHp;
  addWeapon(w, w.player.character.startWeapon);
  placeShrines(w);
  return w;
}
