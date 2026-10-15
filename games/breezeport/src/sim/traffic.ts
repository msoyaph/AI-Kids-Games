/**
 * Traffic: where people travel and which streets get busy. Each home sends its workers to jobs and its
 * shoppers to shops, along the shortest road path (a breadth-first search on the road grid, one per
 * home). Some of those trips go by bus (homes near a stop on a route whose stops also reach the
 * destination), by bike (short trips where bike lanes run) or by tram; the rest are car trips, added
 * up on every road tile they cross. Load over a tile's capacity is a jam: the cars there slow down and
 * the homes beside it lose a little calm. Better planning fixes it: another connection, a bus route,
 * bike lanes, the tram.
 *
 * Pure: no DOM, no Date, no Math.random. Worked out when the town changes (it's quick enough for a
 * maximum town: one search per home).
 */
import { THING } from '../data/things';
import { TUNING } from '../data/tuning';
import { residents, type Census } from './census';
import { H, idx, inMap, W } from './map';
import { isRoad } from './roads';
import { RFLAG, type Thing, type Town } from './state';
import { centerOf, tilesOf } from './world';

export interface Traffic {
  /** Load on each road tile (1 = full; above is a jam). */
  load: Float32Array;
  /** Trips an hour by each way of getting about. */
  car: number;
  bus: number;
  bike: number;
  tram: number;
  /** Road tiles over capacity. */
  jams: number;
}

/** The road tile beside a thing (the first one found round its footprint). */
export function entryOf(town: Town, t: Thing): number {
  for (const [x, z] of tilesOf(t)) for (const [dx, dz] of [[0, 1], [1, 0], [-1, 0], [0, -1]] as const) if (isRoad(town, x + dx, z + dz)) return idx(x + dx, z + dz);
  return -1;
}

const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

// one set of search buffers, reused (a maximum town runs many searches in a row)
const DIST = new Int32Array(W * H), PREV = new Int32Array(W * H), QUEUE = new Int32Array(W * H);

/** Breadth-first search over the roads from one tile: distance and the way back to it (shared buffers: copy them to keep them). */
export function roadSearch(town: Town, from: number): { dist: Int32Array; prev: Int32Array } {
  const dist = DIST.fill(-1), prev = PREV.fill(-1);
  if (from < 0) return { dist, prev };
  const queue = QUEUE;
  let head = 0, tail = 0;
  dist[from] = 0;
  queue[tail++] = from;
  while (head < tail) {
    const i = queue[head++]!;
    const x = i % W, z = (i / W) | 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, nz = z + dz;
      if (!inMap(nx, nz)) continue;
      const j = idx(nx, nz);
      if (!town.roads[j] || dist[j] >= 0) continue;
      dist[j] = dist[i]! + 1;
      prev[j] = i;
      queue[tail++] = j;
    }
  }
  return { dist, prev };
}

/** Tiles within `r` of a stop of this kind (for bus and tram reach). */
function stopReach(town: Town, def: string, r: number): Map<number, Set<number>> {
  // tile → the stop ids that reach it
  const out = new Map<number, Set<number>>();
  for (const t of town.things) {
    if (t.def !== def) continue;
    const c = centerOf(t);
    for (let z = Math.max(0, Math.floor(c.z - r)); z <= Math.min(H - 1, Math.ceil(c.z + r)); z++) for (let x = Math.max(0, Math.floor(c.x - r)); x <= Math.min(W - 1, Math.ceil(c.x + r)); x++) {
      if (Math.hypot(x + 0.5 - c.x, z + 0.5 - c.z) > r) continue;
      const i = idx(x, z);
      if (!out.has(i)) out.set(i, new Set());
      out.get(i)!.add(t.id);
    }
  }
  return out;
}

export function traffic(town: Town, c: Census): Traffic {
  const T = TUNING.traffic;
  const load = new Float32Array(W * H);
  const out: Traffic = { load, car: 0, bus: 0, bike: 0, tram: 0, jams: 0 };
  const dests: { t: Thing; entry: number; weight: number }[] = [];
  for (const t of c.shops.concat(c.works)) {
    const e = entryOf(town, t);
    if (e >= 0) dests.push({ t, entry: e, weight: (THING[t.def]!.zone === 'shop' ? 1.2 : 1) * (THING[t.def]!.level ?? 1) });
  }
  if (!dests.length) return out;
  // which stops are on which bus route, and what each stop reaches
  const busNear = stopReach(town, 'busstop', T.stopReach);
  const tramNear = stopReach(town, 'tramstop', T.stopReach + 1);
  const routeOf = new Map<number, Set<number>>();
  for (const r of town.routes) for (const s of r.stops) { if (!routeOf.has(s)) routeOf.set(s, new Set()); routeOf.get(s)!.add(r.id); }
  const routesNear = (tile: number) => { const out = new Set<number>(); for (const s of busNear.get(tile) ?? []) for (const r of routeOf.get(s) ?? []) out.add(r); return out; };
  const hasTram = town.things.some(t => t.def === 'tramstop');
  // at most MAX_SEARCHES homes are followed (spread evenly through the town); their trips stand for the rest
  const MAX_SEARCHES = 120;
  const step = Math.max(1, Math.ceil(c.homes.length / MAX_SEARCHES));
  for (let k = 0; k < c.homes.length; k += step) {
    const h = c.homes[k]!;
    const from = entryOf(town, h);
    if (from < 0) continue;
    const { dist, prev } = roadSearch(town, from);
    // people go to places within reach along the roads, the nearer the likelier
    const reach = dests.filter(d => dist[d.entry]! >= 0 && dist[d.entry]! <= TUNING.people.reach);
    if (!reach.length) continue;
    const trips = residents(h) * TUNING.people.workers * step;
    const near = (d: (typeof dests)[number]) => d.weight * Math.exp(-dist[d.entry]! / 8);
    const total = reach.reduce((n, d) => n + near(d), 0);
    const homeTile = idx(Math.floor(centerOf(h).x), Math.floor(centerOf(h).z));
    const homeRoutes = routesNear(homeTile);
    const homeTram = hasTram && (tramNear.get(homeTile)?.size ?? 0) > 0;
    for (const d of reach) {
      const share = near(d) / total;
      const n = trips * share;
      const destTile = idx(Math.floor(centerOf(d.t).x), Math.floor(centerOf(d.t).z));
      // other ways to travel take some of the trips off the road
      let bus = 0, bike = 0, tram = 0;
      if (homeRoutes.size) { for (const r of routesNear(destTile)) if (homeRoutes.has(r)) { bus = T.bus; break; } }
      if (homeTram && (tramNear.get(destTile)?.size ?? 0) > 0) tram = T.tram;
      const short = dist[d.entry]! <= 16;
      if (short && laneNear(town, from) && laneNear(town, d.entry)) bike = T.bike;
      const away = Math.min(0.85, bus + bike + tram);
      out.bus += n * (bus / Math.max(1e-6, bus + bike + tram || 1)) * away;
      out.bike += n * (bike / Math.max(1e-6, bus + bike + tram || 1)) * away;
      out.tram += n * (tram / Math.max(1e-6, bus + bike + tram || 1)) * away;
      const cars = n * (1 - away);
      out.car += cars;
      // walk back from the destination along a shortest way, adding the cars to each tile; where
      // several ways are as short (a grid), the trips share them, so a second street really helps
      let i = d.entry, k = (h.id * 7919 + d.t.id * 104729) >>> 0;
      for (let guard = 0; i >= 0 && guard < W * H; guard++) {
        load[i]! += cars;
        if (i === from) break;
        const x = i % W, z = (i / W) | 0, want = dist[i]! - 1;
        let n = 0, pick = prev[i]!;
        for (const [dx, dz] of STEPS) {
          const nx = x + dx, nz = z + dz;
          if (!inMap(nx, nz) || dist[idx(nx, nz)] !== want) continue;
          // reservoir pick among the equally short ways, from a stable per-trip hash
          k = (k * 1664525 + 1013904223) >>> 0;
          if (k % ++n === 0) pick = idx(nx, nz);
        }
        i = pick;
      }
    }
  }
  for (let i = 0; i < W * H; i++) {
    if (!load[i]) continue;
    load[i] = load[i]! / T.capacity;
    if (load[i]! > 1) out.jams++;
  }
  return out;
}

/** Is there a bike lane on this road tile or within a couple of tiles of it? */
function laneNear(town: Town, i: number): boolean {
  const x = i % W, z = (i / W) | 0;
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
    const nx = x + dx, nz = z + dz;
    if (inMap(nx, nz) && town.rflags[idx(nx, nz)]! & RFLAG.bike) return true;
  }
  return false;
}
