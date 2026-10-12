// A busy late-game island built in memory for the performance benchmark (never saved): every
// neighbor moved in, the shop and museum built, decorations and flowers around the plaza, and
// the autumn Harvest Feast in full swing at 6 PM — the busiest place at the busiest time.
import { VILLAGERS } from '../data/villagers';
import type { Game } from './game';
import { pitchTent, sleep } from './housing';
import { applyEffect } from './quests';
import { confirmPlacement, placementRT, scheduleMoveIn, startPlotPlacement } from './placement';
import { setSeason, setSeasonsPaused } from './seasons';
import { newGameState } from './state';
import { createGame } from './systems';
import { Region } from '../world/types';

export const BENCH_SEED = 20261011;

/** Place a villager's plot on the first valid spot in the west lowlands. */
function placeAnywhere(g: Game, id: string): boolean {
  const w = g.world;
  startPlotPlacement(g, id);
  const pl = placementRT(g);
  if (!pl) return false;
  for (let i = 0; i < w.size * w.size; i++) {
    if (w.region(i) !== Region.West || !w.standable(i)) continue;
    for (const f of [Math.PI, 0, Math.PI / 2, -Math.PI / 2]) {
      g.state.player.x = (i % w.size) + 0.5;
      g.state.player.z = Math.floor(i / w.size) + 0.5;
      g.state.player.level = w.height(i);
      g.state.player.facing = f;
      pl.compute(g, pl);
      if (pl.valid) return confirmPlacement(g);
    }
  }
  return false;
}

export function buildBusyIsland(seed = BENCH_SEED): Game {
  const g = createGame(newGameState(seed, 'Bench'));
  g.state.tips = Object.fromEntries(['move', 'phone', 'net', 'rod', 'reel', 'axe', 'shovel', 'can', 'ladder', 'inventory', 'craft', 'shop', 'home', 'villager', 'night', 'rain', 'placement', 'museum', 'challenge', 'decor'].map((k) => [k, 1]));
  pitchTent(g);
  g.state.home.level = 2;
  applyEffect(g, { type: 'spawn', struct: 'shopCart' });
  applyEffect(g, { type: 'construct', from: 'shopCart', to: 'shop' });
  applyEffect(g, { type: 'spawn', struct: 'museumTent' });
  applyEffect(g, { type: 'construct', from: 'museumTent', to: 'museum' });
  const placed = VILLAGERS.filter((v) => placeAnywhere(g, v.id)).map((v) => v.id);
  scheduleMoveIn(g, placed);
  g.state.clock.minute = 22 * 60;
  sleep(g);
  // decorations + flowers around the plaza
  const w = g.world;
  const pl = w.gen.lots.plaza;
  const decor = ['furn_lantern_post', 'furn_mossback_bench', 'furn_terracotta_planter', 'furn_wick_lantern', 'furn_bellbloom_arbor', 'furn_hearthstone_bonfire'];
  let k = 0;
  for (let z = pl.z - 3; z < pl.z + pl.d + 3; z++)
    for (let x = pl.x - 3; x < pl.x + pl.w + 3; x++) {
      if (!w.inb(x, z)) continue;
      const i = w.idx(x, z);
      if (!w.isFreeForObject(i)) continue;
      const onEdge = x === pl.x - 3 || x === pl.x + pl.w + 2 || z === pl.z - 3 || z === pl.z + pl.d + 2;
      if (onEdge && k % 2 === 0) g.state.world.objects[i] = { k: 'deco', item: decor[k % decor.length]!, r: 0, q: 1 };
      else if (onEdge) g.state.world.objects[i] = { k: 'flower', v: (k % 6) * 16 + (k % 8), g: 3 };
      k++;
    }
  g.state.quests.chapter = 4;
  g.state.flags.lighthouseLit = 1;
  setSeason(g, 'autumn', 5);
  setSeasonsPaused(g, true);
  g.state.clock.minute = 18 * 60;
  g.state.weather.today = 'sunny';
  g.state.player.x = pl.x + pl.w / 2;
  g.state.player.z = pl.z + pl.d + 2.5;
  g.state.player.level = 0;
  g.emit('objectsChanged', {});
  g.emit('structuresChanged', {});
  return g;
}

/** The benchmark walk: a loop around the plaza, past the shop and back (tile centres). */
export function benchRoute(g: Game): { x: number; z: number }[] {
  const pl = g.world.gen.lots.plaza;
  const pts = [
    { x: pl.x + pl.w / 2, z: pl.z + pl.d + 2.5 },
    { x: pl.x - 1.5, z: pl.z + pl.d + 1.5 },
    { x: pl.x - 1.5, z: pl.z - 1.5 },
    { x: pl.x + pl.w + 1.5, z: pl.z - 1.5 },
    { x: pl.x + pl.w + 1.5, z: pl.z + pl.d + 1.5 },
  ];
  const w = g.world;
  // only keep points you can stand on
  return pts.filter((p) => w.inb(Math.floor(p.x), Math.floor(p.z)) && w.standable(w.idx(Math.floor(p.x), Math.floor(p.z))));
}
