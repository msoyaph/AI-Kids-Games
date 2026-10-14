/**
 * The census: who lives where, who works where, who shops where, how well each home is served, how
 * happy it is, and what the town wants next (demand). Worked out from the town itself (nothing here
 * is saved) whenever the town changes, and now and then as traffic moves.
 *
 * - **Reach.** Homes, shops and workplaces join the road network through a road beside them. People
 *   work and shop within the network they can reach (a road component), so connecting roads matters.
 *   The old harbour has a few jobs of its own, on the coast road's network.
 * - **Needs** (0–1 each): work, fun (shops or a community center nearby), nature (trees and park
 *   pieces within a few tiles), each service whose circle covers the home, and calm streets.
 * - **Happiness** is a base plus the needs met, never below the floor: a missing service only costs a
 *   little, and the info card says what would help.
 *
 * Pure: no DOM, no Date, no Math.random.
 */
import { THING, type ServiceKind, type ZoneName } from '../data/things';
import { TUNING } from '../data/tuning';
import { H, idx, inMap, W } from './map';
import { isRoad } from './roads';
import { COAST_ROAD, MAIN_ST } from './newtown';
import { ZONE, type Thing, type Town } from './state';
import { centerOf, tilesOf } from './world';

export const SERVICES: readonly ServiceKind[] = ['school', 'library', 'clinic', 'safety', 'community', 'recycling'];

export interface HomeNeeds { work: number; fun: number; nature: number; calm: number; services: Partial<Record<ServiceKind, boolean>>; happy: number }

export interface Census {
  population: number;
  workers: number;
  jobs: number;
  /** Workers who have a job they can reach. */
  employed: number;
  homes: Thing[];
  shops: Thing[];
  works: Thing[];
  needs: Map<number, HomeNeeds>;
  /** Shoppers within reach of each shop (by id), and each shop's and workplace's earning strength (0.3–1). */
  shoppers: Map<number, number>;
  strength: Map<number, number>;
  /** City happiness (population-weighted), or null with nobody living here yet. */
  happy: number | null;
  demand: Record<ZoneName, number>;
  /** Each service's coverage (1 where its circle reaches). */
  coverage: Record<ServiceKind, Uint8Array>;
  /** Green points around each tile (trees, park pieces, park zones), for the nature need and the greenery map. */
  green: Float32Array;
  /** Road components: which network each road tile belongs to (0 none). */
  network: Int32Array;
  /** Was traffic counted (the calm need only shows once there is traffic)? */
  traffic: boolean;
}

const residentsOf = (t: Thing) => (THING[t.def]?.class === 'home' ? (THING[t.def]!.zone ? TUNING.people.residents[(THING[t.def]!.level ?? 1) - 1]! : 24) : 0);
const jobsOf = (t: Thing) => {
  const d = THING[t.def];
  if (!d?.zone || d.zone === 'home') return d?.class === 'civic' && d.service ? 4 : 0;
  const lvl = (d.level ?? 1) - 1;
  return d.zone === 'shop' ? TUNING.people.shopJobs[lvl]! : TUNING.people.workJobs[lvl]!;
};
export const residents = residentsOf;
export const jobs = jobsOf;

/** Label each connected road network. */
function networks(town: Town): Int32Array {
  const net = new Int32Array(W * H);
  let label = 0;
  const stack: number[] = [];
  for (let i = 0; i < W * H; i++) {
    if (!town.roads[i] || net[i]) continue;
    label++;
    net[i] = label;
    stack.push(i);
    while (stack.length) {
      const j = stack.pop()!;
      const x = j % W, z = (j / W) | 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, nz = z + dz;
        if (!inMap(nx, nz)) continue;
        const k = idx(nx, nz);
        if (town.roads[k] && !net[k]) { net[k] = label; stack.push(k); }
      }
    }
  }
  return net;
}

/** The road networks a thing touches (through roads beside its footprint). */
function netsOf(town: Town, net: Int32Array, t: Thing): number[] {
  const out = new Set<number>();
  for (const [x, z] of tilesOf(t)) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const nx = x + dx, nz = z + dz;
    if (isRoad(town, nx, nz)) out.add(net[idx(nx, nz)]!);
  }
  return [...out];
}

/** Paint a circle of radius r (tiles) around (cx, cz) into a grid. */
function circle(grid: Uint8Array | Float32Array, cx: number, cz: number, r: number, value: number, add: boolean) {
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W - 1, Math.ceil(cx + r));
  const z0 = Math.max(0, Math.floor(cz - r)), z1 = Math.min(H - 1, Math.ceil(cz + r));
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
    if (d > r) continue;
    const i = idx(x, z);
    if (add) grid[i] = grid[i]! + value * (1 - (d / (r + 1)) * 0.5);
    else grid[i] = Math.max(grid[i]!, value);
  }
}

/** Traffic per road tile (0 quiet, 1 full, more is jammed), from sim/traffic.ts; absent before any traffic. */
export type TrafficMap = Float32Array | null;

export function census(town: Town, traffic: TrafficMap = null): Census {
  const net = networks(town);
  const homes: Thing[] = [], shops: Thing[] = [], works: Thing[] = [];
  for (const t of town.things) {
    const c = THING[t.def]?.class;
    if (c === 'home') homes.push(t);
    else if (c === 'shop') shops.push(t);
    else if (c === 'work') works.push(t);
  }
  // service coverage
  const coverage = Object.fromEntries(SERVICES.map(s => [s, new Uint8Array(W * H)])) as Record<ServiceKind, Uint8Array>;
  for (const t of town.things) {
    const s = THING[t.def]?.service;
    if (!s) continue;
    const c = centerOf(t);
    circle(coverage[s], c.x, c.z, TUNING.services.radius[s], 1, false);
  }
  // green points: trees and park pieces count around them; park zone tiles count a little
  const green = new Float32Array(W * H);
  for (const t of town.things) {
    const g = THING[t.def]?.green ?? 0;
    if (!g) continue;
    const c = centerOf(t);
    circle(green, c.x, c.z, TUNING.nature.reach, g, true);
  }
  for (let i = 0; i < W * H; i++) if (town.zones[i] === ZONE.park) circle(green, (i % W) + 0.5, ((i / W) | 0) + 0.5, 3, 0.35, true);
  // fun: shops, the community center, playgrounds and the skate park within reach of each tile
  const funGrid = new Float32Array(W * H);
  for (const t of town.things) {
    const d = THING[t.def];
    if (!d || !(d.class === 'shop' || d.service === 'community' || t.def === 'playground' || t.def === 'skatepark' || d.class === 'landmark')) continue;
    const c = centerOf(t);
    const x0 = Math.max(0, Math.floor(c.x - TUNING.people.shopReach)), x1 = Math.min(W - 1, Math.ceil(c.x + TUNING.people.shopReach));
    const z0 = Math.max(0, Math.floor(c.z - TUNING.people.shopReach)), z1 = Math.min(H - 1, Math.ceil(c.z + TUNING.people.shopReach));
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (Math.hypot(x + 0.5 - c.x, z + 0.5 - c.z) <= TUNING.people.shopReach) funGrid[idx(x, z)]! += 1;
  }
  // people and jobs per road network
  const workersBy = new Map<number, number>(), jobsBy = new Map<number, number>();
  const homeNets = new Map<number, number[]>();
  let population = 0, jobsTotal = 0;
  for (const h of homes) {
    const r = residentsOf(h);
    population += r;
    const nets = netsOf(town, net, h);
    homeNets.set(h.id, nets);
    const w = r * TUNING.people.workers;
    for (const n of nets.slice(0, 1)) workersBy.set(n, (workersBy.get(n) ?? 0) + w);
  }
  let shopJobs = 0;
  for (const t of town.things) {
    const j = jobsOf(t);
    if (!j) continue;
    jobsTotal += j;
    if (THING[t.def]?.class === 'shop') shopJobs += j;
    const nets = netsOf(town, net, t);
    for (const n of nets.slice(0, 1)) jobsBy.set(n, (jobsBy.get(n) ?? 0) + j);
  }
  // the old harbour's jobs belong to the network of the coast road at Main Street
  // (they help homes find work, but the town still wants workplaces of its own: see demand below)
  const townJobs = jobsTotal;
  const harbor = isRoad(town, MAIN_ST, COAST_ROAD) ? net[idx(MAIN_ST, COAST_ROAD)]! : 0;
  if (harbor) { jobsTotal += TUNING.people.harborJobs; jobsBy.set(harbor, (jobsBy.get(harbor) ?? 0) + TUNING.people.harborJobs); }
  const workers = population * TUNING.people.workers;
  let employed = 0;
  for (const [n, w] of workersBy) employed += Math.min(w, jobsBy.get(n) ?? 0);
  // residents by tile (for shoppers)
  const shoppers = new Map<number, number>(), strength = new Map<number, number>();
  for (const s of shops) {
    const c = centerOf(s);
    const nets = new Set(netsOf(town, net, s));
    let n = 0;
    for (const h of homes) {
      const hc = centerOf(h);
      if (Math.hypot(hc.x - c.x, hc.z - c.z) > TUNING.people.shopReach) continue;
      if (!(homeNets.get(h.id) ?? []).some(x => nets.has(x))) continue;
      n += residentsOf(h);
    }
    shoppers.set(s.id, n);
    const need = TUNING.people.shoppers[(THING[s.def]!.level ?? 1) - 1]!;
    strength.set(s.id, Math.min(1, Math.max(0.3, n / need)));
  }
  for (const w of works) {
    const nets = netsOf(town, net, w);
    const n = nets[0];
    const want = n ? jobsBy.get(n) ?? 0 : 0, have = n ? workersBy.get(n) ?? 0 : 0;
    strength.set(w.id, want > 0 ? Math.min(1, Math.max(0.3, have / want)) : 0.3);
  }
  // each home's needs and happiness
  const H_ = TUNING.happiness;
  const needs = new Map<number, HomeNeeds>();
  let happySum = 0;
  for (const h of homes) {
    const c = centerOf(h);
    const i = idx(Math.min(W - 1, Math.floor(c.x)), Math.min(H - 1, Math.floor(c.z)));
    const nets = homeNets.get(h.id) ?? [];
    const n = nets[0];
    const w = n ? workersBy.get(n) ?? 0 : 0, j = n ? jobsBy.get(n) ?? 0 : 0;
    const work = !n ? 0 : w <= 0 ? 1 : Math.min(1, j / w);
    const fun = Math.min(1, funGrid[i]! / 2);
    const nature = Math.min(1, green[i]! / TUNING.nature.want);
    let calm = 1;
    if (traffic) {
      let worst = 0;
      for (const [x, z] of tilesOf(h)) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, nz = z + dz;
        if (isRoad(town, nx, nz)) worst = Math.max(worst, traffic[idx(nx, nz)]!);
      }
      calm = 1 - Math.min(1, Math.max(0, worst - 0.6) / 0.8);
    }
    const services: HomeNeeds['services'] = {};
    let svc = 0;
    for (const s of SERVICES) { const on = coverage[s][i]! > 0; services[s] = on; if (on) svc += H_.service[s]; }
    const happy = Math.round(Math.min(100, Math.max(H_.floor, H_.base + work * H_.work + fun * H_.fun + nature * H_.nature + svc - (1 - calm) * H_.traffic)));
    needs.set(h.id, { work, fun, nature, calm, services, happy });
    happySum += happy * residentsOf(h);
  }
  const happy = population > 0 ? Math.round(happySum / population) : null;
  // demand: families want homes (more when the town is happy and there are jobs), shoppers want shops, workers want jobs
  const shopsWanted = population / 14;
  const demand: Record<ZoneName, number> = {
    home: clamp01(0.42 + (jobsTotal - workers) / Math.max(12, workers) * 0.5 + ((happy ?? 70) - 66) / 60 + (population < 40 ? 0.3 : 0)),
    shop: population > 0 ? clamp01((shopsWanted - shops.length) / 3 + 0.12) : 0,
    // shop jobs are part-time, so they only half stand in for workplaces
    work: population > 0 ? clamp01((workers - (townJobs - shopJobs * 0.5)) / 14 + 0.1) : 0,
  };
  return { population, workers, jobs: jobsTotal, employed, homes, shops, works, needs, shoppers, strength, happy, demand, coverage, green, network: net, traffic: !!traffic };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
