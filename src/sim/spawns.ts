// Daily respawn of forageables: weeds, branches, shells, message bottles, dig spots, fruit.
import { dayRng, type Rng } from '../core/rng';
import { DIRS8, Ground, Region } from '../world/types';
import type { Game } from './game';
import type { TileObj } from './state';

export const SHELL_TABLE: [string, number][] = [
  ['shell_spiral', 40],
  ['shell_scallop', 30],
  ['shell_coral', 16],
  ['shell_cowrie', 10],
  ['shell_pearl', 2],
];

export const BURIED_TABLE: [string, number][] = [
  ['stone', 20],
  ['clay', 18],
  ['iron', 18],
  ['glowstone', 8],
  ['pouch', 10],
];

export const DAILY = {
  weedsAdd: 10,
  weedsMax: 45,
  branches: 12,
  shells: 9,
  fossils: 4,
  buried: 3,
};

function weightedPick(rng: Rng, table: [string, number][]): string {
  return rng.weighted(table, (t) => t[1])![0];
}

export function dailySpawns(g: Game): void {
  const s = g.state;
  const w = g.world;
  const day = s.clock.day;
  const rng = dayRng(s.seed, day, 'spawns');
  const objs = s.world.objects;

  // 1. per-day counters + fruit regrowth, clear yesterday's spawned items and dig spots
  for (const key in objs) {
    const o = objs[key]!;
    switch (o.k) {
      case 'tree':
      case 'pine':
        o.c = 0;
        o.b = 0;
        break;
      case 'fruitTree':
        o.c = 0;
        o.b = 0;
        if ((o.f ?? 0) === 0 && (o.g ?? 0) <= day) o.f = 3;
        break;
      case 'palm':
        o.c = 0;
        o.b = 0;
        if ((o.f ?? 0) === 0 && (o.g ?? 0) <= day) o.f = 2;
        break;
      case 'rock':
        o.c = 0;
        break;
      case 'item':
        if (o.tag === 'spawn') delete objs[key];
        break;
      case 'dig':
        if (o.tag === 'spawn' && (o.pd ?? 0) < day - 2) delete objs[key];
        break;
      default:
        break;
    }
  }

  // candidate tiles
  const N = w.size;
  const grass: number[] = [];
  const sand: number[] = [];
  const westLand: number[] = [];
  const anyLand: number[] = [];
  for (let i = 0; i < N * N; i++) {
    if (objs[i] || w.structure(i)) continue;
    const gr = w.ground(i);
    if (gr === Ground.Grass) grass.push(i);
    else if (gr === Ground.Sand) sand.push(i);
    if (gr === Ground.Grass || gr === Ground.Sand || gr === Ground.Dirt) {
      if (w.region(i) === Region.West && gr !== Ground.Dirt) westLand.push(i);
      if (gr !== Ground.Dirt) anyLand.push(i);
    }
  }
  const take = (list: number[]): number | undefined => {
    for (let tries = 0; tries < 30 && list.length; tries++) {
      const k = rng.int(0, list.length - 1);
      const i = list[k]!;
      list[k] = list[list.length - 1]!;
      list.pop();
      if (!objs[i] && !w.structure(i)) return i;
    }
    return undefined;
  };
  const place = (i: number | undefined, o: TileObj) => {
    if (i === undefined) return;
    objs[i] = o;
  };

  // 2. weeds
  let weeds = 0;
  for (const key in objs) if (objs[key]!.k === 'weed') weeds++;
  const addWeeds = Math.min(DAILY.weedsAdd + (day === 1 ? 14 : 0), DAILY.weedsMax - weeds);
  for (let k = 0; k < addWeeds; k++) place(take(grass), { k: 'weed' });

  // 3. branches under trees
  const trees = Object.keys(objs)
    .map(Number)
    .filter((i) => objs[i]!.k === 'tree' || objs[i]!.k === 'pine');
  rng.shuffle(trees);
  let branches = 0;
  for (const t of trees) {
    if (branches >= DAILY.branches + (day === 1 ? 8 : 0)) break;
    const x = t % N, z = (t / N) | 0;
    const [dx, dz] = DIRS8[rng.int(0, 7)]!;
    if (!w.inb(x + dx, z + dz)) continue;
    const i = w.idx(x + dx, z + dz);
    if (objs[i] || w.structure(i) || w.isWater(i) || w.height(i) !== w.height(t)) continue;
    objs[i] = { k: 'item', item: 'branch', q: 1, tag: 'spawn' };
    branches++;
  }

  // 4. shells + a message bottle on the beach
  for (let k = 0; k < DAILY.shells; k++) place(take(sand), { k: 'item', item: weightedPick(rng, SHELL_TABLE), q: 1, tag: 'spawn' });
  place(take(sand), { k: 'item', item: 'bottle', q: 1, tag: 'spawn' });

  // 5. dig spots: fossils + buried treasure, at least 3 in the starting region
  let digs = 0;
  for (const key in objs) if (objs[key]!.k === 'dig') digs++;
  const want = Math.max(0, DAILY.fossils + DAILY.buried - Math.floor(digs / 2));
  for (let k = 0; k < want; k++) {
    const isFossil = k < DAILY.fossils;
    const list = k % 2 === 0 ? westLand : anyLand;
    place(take(list), { k: 'dig', item: isFossil ? 'fossil_unknown' : weightedPick(rng, BURIED_TABLE), tag: 'spawn', pd: day });
  }

  s.world.rolledDay = day;
  g.emit('objectsChanged', {});
}
