/**
 * Villager movement: schedules → cross-location routes (location graph + A*) → positions
 * computed from game minutes. Off-screen villagers cost almost nothing: a route is planned
 * once per schedule leg and positions are just looked up by time.
 */
import { TILE, type Dir } from '../core/math';
import { findPath, nearestOpen } from '../core/pathfind';
import { ALL_MAP_IDS } from '../data/maps';
import { VILLAGERS, VILLAGER, type SchedEntry, type Spot, type VillagerDef } from '../data/villagers';
import { simInitHooks, type Sim } from './sim';
import { seasonOf } from './state';
import { registerSystem } from './systems';
import { isWet } from './weather';

/** Tiles walked per game minute. */
export const NPC_TILES_PER_MIN = 1.6;

export interface RouteStep {
  loc: string;
  x: number;
  y: number;
}

export interface NpcRt {
  id: string;
  loc: string;
  /** feet position in px */
  x: number;
  y: number;
  dir: Dir;
  route: RouteStep[] | null;
  routeStart: number;
  /** index of the schedule entry we are heading to / at */
  entry: number;
  sched: SchedEntry[];
  /** final facing at the destination */
  endDir: Dir;
  moving: boolean;
  /** frozen while talking / in a cutscene / at a festival */
  hold: boolean;
  /** not shown at all (e.g. away) */
  hidden: boolean;
  emote: { kind: string; until: number } | null;
}

export interface NpcWorld {
  list: NpcRt[];
  byId: Map<string, NpcRt>;
  /** loc → [warp tile x, y, to, tx, ty][] */
  graph: Map<string, [number, number, string, number, number][]> | null;
}

export function npcs(sim: Sim): NpcWorld {
  let w = sim.ext.npcs as NpcWorld | undefined;
  if (!w) {
    w = { list: [], byId: new Map(), graph: null };
    for (const v of VILLAGERS) {
      const rt: NpcRt = { id: v.id, loc: v.home, x: 0, y: 0, dir: 0, route: null, routeStart: 0, entry: 0, sched: [], endDir: 0, moving: false, hold: false, hidden: false, emote: null };
      w.list.push(rt);
      w.byId.set(v.id, rt);
    }
    sim.ext.npcs = w;
  }
  return w;
}

/** Hook for festivals / story to override a villager's day. */
export const scheduleOverrides: ((sim: Sim, v: VillagerDef) => SchedEntry[] | null)[] = [];

export function scheduleFor(sim: Sim, v: VillagerDef): SchedEntry[] {
  for (const o of scheduleOverrides) {
    const r = o(sim, v);
    if (r) return r;
  }
  const s = v.schedule;
  const st = sim.state;
  if (isWet(st.weather) && s.rain) return s.rain;
  if (st.day % 5 === 4 && s.rest) return s.rest;
  const key = `s${seasonOf(st.day)}` as 's0';
  return s[key] ?? s.default;
}

export function spotTile(sim: Sim, loc: string, spot: Spot): [number, number] {
  const l = sim.loc(loc);
  let x: number, y: number;
  if (typeof spot === 'string') {
    const p = l.def.points[spot];
    if (!p) {
      const c = l.def.points.door ?? { x: Math.floor(l.w / 2), y: Math.floor(l.h / 2) };
      x = c.x;
      y = c.y;
    } else {
      x = p.x;
      y = p.y;
    }
  } else [x, y] = spot;
  return nearestOpen(l, x, y);
}

function buildGraph(sim: Sim): Map<string, [number, number, string, number, number][]> {
  const g = new Map<string, [number, number, string, number, number][]>();
  for (const id of ALL_MAP_IDS()) {
    if (id === 'mine') continue;
    const l = sim.loc(id);
    const edges: [number, number, string, number, number][] = [];
    for (const w of l.warps) {
      if (!ALL_MAP_IDS().includes(w.to) || w.to === 'mine') continue;
      edges.push([w.x, w.y, w.to, w.tx, w.ty]);
    }
    g.set(id, edges);
  }
  return g;
}

/** BFS over locations; returns warp hops [from loc, warp x, y, to loc, arrival x, y]. */
function locRoute(sim: Sim, from: string, to: string): [string, number, number, string, number, number][] | null {
  const w = npcs(sim);
  w.graph ??= buildGraph(sim);
  if (from === to) return [];
  const prev = new Map<string, [string, number, number, number, number]>();
  const q = [from];
  prev.set(from, ['', 0, 0, 0, 0]);
  while (q.length) {
    const cur = q.shift()!;
    if (cur === to) break;
    for (const [wx, wy, nl, tx, ty] of w.graph.get(cur) ?? []) {
      if (prev.has(nl)) continue;
      prev.set(nl, [cur, wx, wy, tx, ty]);
      q.push(nl);
    }
  }
  if (!prev.has(to)) return null;
  const hops: [string, number, number, string, number, number][] = [];
  let c = to;
  while (c !== from) {
    const [p, wx, wy, tx, ty] = prev.get(c)!;
    hops.push([p, wx, wy, c, tx, ty]);
    c = p;
  }
  return hops.reverse();
}

/** Plan a full route (tile steps across locations). */
export function planRoute(sim: Sim, fromLoc: string, fx: number, fy: number, toLoc: string, tx: number, ty: number): RouteStep[] | null {
  const hops = locRoute(sim, fromLoc, toLoc);
  if (!hops) return null;
  const out: RouteStep[] = [{ loc: fromLoc, x: fx, y: fy }];
  let cl = fromLoc, cx = fx, cy = fy;
  for (const [l, wx, wy, nl, ax, ay] of hops) {
    // pick the warp tile of this edge closest to us (edge exits span several tiles)
    const p = findPath(sim.loc(l), cx, cy, wx, wy);
    if (!p) return null;
    for (const [x, y] of p) out.push({ loc: l, x, y });
    out.push({ loc: nl, x: ax, y: ay });
    cl = nl;
    cx = ax;
    cy = ay;
  }
  const last = findPath(sim.loc(cl), cx, cy, tx, ty);
  if (!last) return null;
  for (const [x, y] of last) out.push({ loc: cl, x, y });
  return out;
}

function placeAt(sim: Sim, rt: NpcRt, loc: string, spot: Spot, dir: number | undefined): void {
  const [x, y] = spotTile(sim, loc, spot);
  rt.loc = loc;
  rt.x = x * TILE + TILE / 2;
  rt.y = y * TILE + TILE - 2;
  rt.dir = (dir ?? 0) as Dir;
  rt.endDir = rt.dir;
  rt.route = null;
  rt.moving = false;
}

/** Put every villager where their schedule says they are right now (start of day / load). */
export function resetNpcs(sim: Sim): void {
  const now = sim.state.min;
  for (const rt of npcs(sim).list) {
    const v = VILLAGER[rt.id];
    rt.sched = scheduleFor(sim, v);
    rt.hold = false;
    rt.hidden = false;
    rt.emote = null;
    let idx = 0;
    for (let i = 0; i < rt.sched.length; i++) if (rt.sched[i][0] <= now) idx = i;
    const e = rt.sched[idx];
    placeAt(sim, rt, e[1], e[2], e[3]);
    rt.entry = idx;
  }
}

function startLeg(sim: Sim, rt: NpcRt, e: SchedEntry): void {
  const [tx, ty] = spotTile(sim, e[1], e[2]);
  const fx = Math.floor(rt.x / TILE), fy = Math.floor((rt.y - 1) / TILE);
  const r = planRoute(sim, rt.loc, fx, fy, e[1], tx, ty);
  rt.endDir = (e[3] ?? 0) as Dir;
  if (!r || r.length <= 1) {
    placeAt(sim, rt, e[1], e[2], e[3]);
    return;
  }
  rt.route = r;
  rt.routeStart = sim.absMinute();
  rt.moving = true;
}

/** Advance positions from the clock. Cheap: O(villagers). */
export function updateNpcs(sim: Sim): void {
  const w = npcs(sim);
  const now = sim.absMinute();
  const min = sim.state.min;
  for (const rt of w.list) {
    if (rt.hold) continue;
    // next schedule entry?
    const next = rt.sched[rt.entry + 1];
    if (next && min >= next[0]) {
      rt.entry++;
      startLeg(sim, rt, next);
    }
    if (!rt.route) continue;
    const d = Math.max(0, (now - rt.routeStart) * NPC_TILES_PER_MIN);
    const i = Math.floor(d);
    const r = rt.route;
    if (i >= r.length - 1) {
      const end = r[r.length - 1];
      rt.loc = end.loc;
      rt.x = end.x * TILE + TILE / 2;
      rt.y = end.y * TILE + TILE - 2;
      rt.dir = rt.endDir;
      rt.route = null;
      rt.moving = false;
      continue;
    }
    const a = r[i], b = r[i + 1];
    rt.loc = a.loc;
    if (a.loc !== b.loc) {
      rt.x = a.x * TILE + TILE / 2;
      rt.y = a.y * TILE + TILE - 2;
      continue;
    }
    const f = d - i;
    rt.x = (a.x + (b.x - a.x) * f) * TILE + TILE / 2;
    rt.y = (a.y + (b.y - a.y) * f) * TILE + TILE - 2;
    rt.dir = b.x > a.x ? 2 : b.x < a.x ? 1 : b.y > a.y ? 0 : 3;
    rt.moving = true;
  }
}

/** Villager standing next to (or on) a tile in the player's location. */
export function npcNear(sim: Sim, px: number, py: number, radius = 18): NpcRt | null {
  let best: NpcRt | null = null, bd = radius;
  for (const rt of npcs(sim).list) {
    if (rt.loc !== sim.p.loc || rt.hidden) continue;
    const d = Math.hypot(rt.x - px, rt.y - 6 - py);
    if (d < bd) {
      bd = d;
      best = rt;
    }
  }
  return best;
}

export function keeperAtCounter(sim: Sim, shopRoom: string, keeper: string): boolean {
  const rt = npcs(sim).byId.get(keeper);
  if (!rt || rt.loc !== shopRoom || rt.hidden) return false;
  const p = sim.loc(shopRoom).def.points.keeper;
  if (!p) return true;
  return Math.abs(rt.x - (p.x * TILE + 8)) < 24 && Math.abs(rt.y - (p.y * TILE + 14)) < 24;
}

simInitHooks.push((sim) => {
  sim.frameHooks.push(updateNpcs);
  resetNpcs(sim);
});

registerSystem({
  id: 'npcs',
  startDay(sim) {
    resetNpcs(sim);
  },
});
