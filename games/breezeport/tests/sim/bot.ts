/**
 * The playthrough bot: plays Breezeport's story like a kid would, through the same actions the tools
 * use (sim/actions.ts), so it can't cheat. About 6 s of play for each thing it does, a learning pause
 * the first time it does something new, and reading time for every line of dialogue. It plans a simple
 * street grid in the open land, zones by what the town wants, puts services where homes aren't
 * covered, plants trees by unhappy homes, runs buses, funds projects and builds what the story asks.
 *
 * Used by tests/sim/pacing.test.ts (6–8 hours, no dead ends) and tests/sim/strategies.test.ts.
 */
import { CHAPTERS, type Goal } from '../../src/data/chapters';
import { THING } from '../../src/data/things';
import { act } from '../../src/sim/actions';
import { emptyLots } from '../../src/sim/growth';
import { buildable, idx, inMap, W, H } from '../../src/sim/map';
import { newTown } from '../../src/sim/newtown';
import { isRoad } from '../../src/sim/roads';
import { RFLAG, ZONE, type Rot, type Town } from '../../src/sim/state';
import { currentGoals, finishChapter, fundProject, progress, storyStep } from '../../src/sim/story';
import { Sim } from '../../src/sim/tick';
import { thingOpen, toolOpen, zoneOpen, laneOpen } from '../../src/sim/unlocks';
import { canPlace, centerOf, isOpen, occupancy, tilesOf } from '../../src/sim/world';

export interface BotRun {
  town: Town;
  /** Seconds of play when each chapter was finished (index = chapter). */
  chapters: number[];
  /** Total time a kid would spend: play time plus reading and learning. */
  total: number;
  /** Longest wait for coins (seconds of play spent only waiting for money). */
  coinWait: number;
  /** The chapter of the longest wait for coins. */
  coinWaitAt: number;
  /** The town when each chapter was finished: people, happiness and coins. */
  marks: { pop: number; happy: number; coins: number }[];
  stuck: string | null;
  actions: number;
}

const ACTION_SEC = 6;
const LEARN_SEC = 18;
const READ_SEC_PER_LINE = 4;

export class Bot {
  readonly town: Town;
  readonly sim: Sim;
  private learned = new Set<string>();
  extra = 0;
  actions = 0;
  coinWait = 0;
  /** This step, something the bot wanted to do was too dear (so any wait now is a wait for coins). */
  short = false;

  constructor(seed: number, town?: Town) {
    this.town = town ?? newTown(seed);
    this.sim = new Sim(this.town);
  }

  /** False: the story stands still (the strategy test plays a sandbox). */
  storyOn = true;

  /** Let town time pass (the bot is waiting or watching). */
  wait(sec: number) {
    for (let i = 0; i < sec / 0.5; i++) this.sim.advance(0.5);
    if (this.storyOn) this.story();
  }

  /** Tap a ripe coin bubble, as a kid does now and then. */
  collect(): boolean {
    const c = this.sim.census;
    const ripe = c.shops.concat(c.works).find(x => x.pay >= 4);
    if (!ripe) return false;
    act(this.town, { type: 'collect', id: ripe.id });
    this.did('collect');
    return true;
  }

  /** Doing something costs a kid some seconds (more the first time). */
  private did(kind: string) {
    this.actions++;
    let sec = ACTION_SEC;
    if (!this.learned.has(kind)) { this.learned.add(kind); sec += LEARN_SEC; }
    this.wait(sec);
  }

  private do(kind: string, a: Parameters<typeof act>[1]): boolean {
    const r = act(this.town, a);
    if (r.ok) { this.sim.refresh(true); this.did(kind); }
    else if (/coins/.test(r.why)) this.short = true;
    return r.ok;
  }

  private story() {
    const t = this.town;
    for (const e of storyStep(t, this.sim.census, this.sim.trips)) {
      if (e.type === 'chapter-done') {
        this.extra += CHAPTERS[e.chapter]!.outro.length * READ_SEC_PER_LINE + 6;
        finishChapter(t, this.sim.census);
        const next = CHAPTERS[t.story.chapter];
        if (next) this.extra += next.intro.length * READ_SEC_PER_LINE;
        this.sim.refresh(true);
      }
    }
  }

  // --- the planner ---
  /** Lay the next stretch of the street grid: rows every 7 tiles and columns every 8, joined to the town. */
  growRoads(): boolean {
    const t = this.town;
    const rows: number[] = [], cols: number[] = [];
    for (let z = 6; z < H - 2; z += 7) rows.push(z);
    for (let x = 0; x < W - 2; x += 8) cols.push(x);
    // candidate segments: a block's side next to existing roads, in open land
    let best: [number, number][] | null = null, bestScore = -Infinity;
    const occ = occupancy(t);
    const ok = (x: number, z: number) => inMap(x, z) && buildable(x, z) && isOpen(t, x, z) && !occ[idx(x, z)];
    for (const z of rows) for (let k = 0; k < cols.length - 1; k++) {
      const a = cols[k]!, b = cols[k + 1]!;
      const tiles: [number, number][] = [];
      for (let x = a; x <= b; x++) tiles.push([x, z]);
      const fresh = tiles.filter(([x, zz]) => !isRoad(t, x, zz));
      if (!fresh.length || !tiles.every(([x, zz]) => isRoad(t, x, zz) || ok(x, zz))) continue;
      const joined = tiles.some(([x, zz]) => isRoad(t, x, zz) || isRoad(t, x, zz - 1) || isRoad(t, x, zz + 1) || isRoad(t, x - 1, zz) || isRoad(t, x + 1, zz));
      if (!joined) continue;
      const score = -Math.hypot((a + b) / 2 - 40, z - 12) - fresh.length * 0.2;
      if (score > bestScore) { bestScore = score; best = tiles; }
    }
    for (const x of cols) for (let k = 0; k < rows.length - 1; k++) {
      const a = rows[k]!, b = rows[k + 1]!;
      const tiles: [number, number][] = [];
      for (let z = a; z <= b; z++) tiles.push([x, z]);
      const fresh = tiles.filter(([xx, z]) => !isRoad(t, xx, z));
      if (!fresh.length || !tiles.every(([xx, z]) => isRoad(t, xx, z) || ok(xx, z))) continue;
      const joined = tiles.some(([xx, z]) => isRoad(t, xx, z) || isRoad(t, xx - 1, z) || isRoad(t, xx + 1, z) || isRoad(t, xx, z - 1) || isRoad(t, xx, z + 1));
      if (!joined) continue;
      const score = -Math.hypot(x - 40, (a + b) / 2 - 12) - fresh.length * 0.2;
      if (score > bestScore) { bestScore = score; best = tiles; }
    }
    if (!best) return false;
    const cost = best.filter(([x, z]) => !isRoad(t, x, z)).length * 8;
    if (t.coins < cost) { this.short = true; return false; }
    return this.do('road', { type: 'road', tiles: best });
  }

  /** Zone a strip of lots along roads for a zone kind (2 deep, beside a road). */
  zoneStrip(zone: number, tiles = 8): boolean {
    const t = this.town;
    if (!zoneOpen(t, zone)) return false;
    const occ = occupancy(t);
    // never on the lines where the street grid will go (growRoads), so the town can keep growing
    const free = (x: number, z: number) => inMap(x, z) && buildable(x, z) && isOpen(t, x, z) && !isRoad(t, x, z) && !occ[idx(x, z)] && t.zones[idx(x, z)] === 0 && !onGrid(x, z);
    let best: [number, number, number, number] | null = null, bestScore = -Infinity;
    for (let z = 2; z < H - 3; z++) for (let x = 2; x < W - 3; x++) {
      if (!isRoad(t, x, z)) continue;
      // a run of free tiles beside this road: below or above a street running east–west…
      for (const dz of [1, -2]) {
        let n = 0;
        while (n < tiles && free(x + n, z + dz) && free(x + n, z + dz + 1) && isRoad(t, x + n, z)) n++;
        if (n < 2) continue;
        const score = -Math.hypot(x - 40, z - 12) + n;
        if (score > bestScore) { bestScore = score; best = [x, z + dz, x + n - 1, z + dz + 1]; }
      }
      // …or right or left of one running north–south
      for (const dx of [1, -2]) {
        let n = 0;
        while (n < tiles && free(x + dx, z + n) && free(x + dx + 1, z + n) && isRoad(t, x, z + n)) n++;
        if (n < 2) continue;
        const score = -Math.hypot(x - 40, z - 12) + n;
        if (score > bestScore) { bestScore = score; best = [x + dx, z, x + dx + 1, z + n - 1]; }
      }
    }
    if (!best) return this.rezone(zone);
    return this.do(`zone-${zone}`, { type: 'zone', x0: best[0], z0: best[1], x1: best[2], z1: best[3], zone });
  }

  /** Place something where it's needed (near homes, on a free spot; services where homes aren't covered). */
  place(def: string, near?: { x: number; z: number }, where?: (x: number, z: number) => boolean): boolean {
    const t = this.town;
    const d = THING[def]!;
    if (!thingOpen(t, def)) return false;
    if (t.mode !== 'creative' && t.coins < (d.cost ?? 0)) { this.short = true; return false; }
    const c = this.sim.census;
    let target = near;
    if (!target) {
      const homes = d.service ? c.homes.filter(h => !c.needs.get(h.id)?.services[d.service!]) : c.homes;
      const pool = homes.length ? homes : c.homes;
      if (pool.length) { const s = pool.reduce((a, h) => { const cc = centerOf(h); return { x: a.x + cc.x, z: a.z + cc.z }; }, { x: 0, z: 0 }); target = { x: s.x / pool.length, z: s.z / pool.length }; }
      else target = { x: 40, z: 12 };
    }
    let best: { x: number; z: number; rot: Rot } | null = null, bestD = Infinity;
    for (let r = 0; r < 26 && !best; r++) for (let z = Math.floor(target.z) - r; z <= Math.floor(target.z) + r; z++) for (let x = Math.floor(target.x) - r; x <= Math.floor(target.x) + r; x++) {
      if (Math.max(Math.abs(x - target.x), Math.abs(z - target.z)) < r - 1) continue;
      for (const rot of [0, 1, 2, 3] as Rot[]) {
        if (canPlace(t, def, x, z, rot) !== 'ok' || (where && !where(x, z))) continue;
        // keep the street grid's lines clear (stops stand beside roads, so they may)
        if (def !== 'busstop' && def !== 'tramstop' && tilesOf({ def, x, z, rot }).some(([a, b]) => onGrid(a, b) && !isRoad(t, a, b))) continue;
        // big things need to touch a road (so people can get there)
        if (d.w * d.d > 1 && !touches(t, def, x, z, rot)) continue;
        const dd = Math.hypot(x - target.x, z - target.z);
        if (dd < bestD) { bestD = dd; best = { x, z, rot }; }
      }
    }
    if (!best) return d.w * d.d > 1 && d.class !== 'tree' ? this.makeRoom(def, target) : false;
    return this.do(`place-${def}`, { type: 'place', def, x: best.x, z: best.z, rot: best.rot });
  }

  /**
   * No free spot for something big: clear a few small buildings and trees beside a road near where
   * it's wanted (taking things away gives all their coins back), then build it there. A kid does the
   * same when a street is full.
   */
  private makeRoom(def: string, target: { x: number; z: number }): boolean {
    const t = this.town;
    const occ = occupancy(t);
    let best: { x: number; z: number; rot: Rot; ids: number[] } | null = null, bestCost = Infinity;
    for (let z = Math.floor(target.z) - 12; z <= target.z + 12; z++) for (let x = Math.floor(target.x) - 12; x <= target.x + 12; x++) for (const rot of [0, 1, 2, 3] as Rot[]) {
      const tiles = tilesOf({ def, x, z, rot });
      if (!tiles.every(([a, b]) => inMap(a, b) && buildable(a, b) && isOpen(t, a, b) && !isRoad(t, a, b) && !onGrid(a, b))) continue;
      if (!touches(t, def, x, z, rot)) continue;
      const ids = [...new Set(tiles.map(([a, b]) => occ[idx(a, b)]!).filter(Boolean))];
      let cost = Math.hypot(x - target.x, z - target.z) * 0.1;
      for (const id of ids) {
        const o = t.things.find(th => th.id === id)!;
        const od = THING[o.def]!;
        if (!od.zone && od.class !== 'tree' && od.class !== 'park') { cost = Infinity; break; }
        cost += od.zone ? 3 * (od.level ?? 1) : 0.5;
      }
      if (cost < bestCost) { bestCost = cost; best = { x, z, rot, ids }; }
    }
    if (!best) return false;
    for (const id of best.ids) act(t, { type: 'remove', id });
    const ok = act(t, { type: 'place', def, x: best.x, z: best.z, rot: best.rot }).ok;
    if (ok) { this.sim.refresh(true); this.did(`room-${def}`); }
    return ok;
  }

  /** Trees by the homes that miss nature most, a few at a time (none where nature is already plenty). */
  plantTrees(n: number, force = false): boolean {
    const c = this.sim.census;
    const homes = [...c.homes].filter(h => force || (c.needs.get(h.id)?.nature ?? 1) < 0.7).sort((a, b) => (c.needs.get(a.id)?.nature ?? 1) - (c.needs.get(b.id)?.nature ?? 1));
    if (!homes.length && !force) return false;
    let done = false;
    for (let i = 0; i < n; i++) {
      const h = homes[i % Math.max(1, homes.length)];
      const at = h ? centerOf(h) : { x: 40, z: 12 };
      // in the middle of a block, where no lot will ever be (no road within two tiles)
      const inner = (x: number, z: number) => { for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (isRoad(this.town, x + dx, z + dz)) return false; return true; };
      if (!this.place(i % 4 === 3 ? 'blossom' : 'tree', at, inner)) break;
      done = true;
    }
    return done;
  }

  /** One kid-sized step towards the current goals. Returns false if there was nothing to do. */
  step(): boolean {
    const t = this.town;
    this.short = false;
    const c = this.sim.census;
    const goals = currentGoals(t).filter(g => !progress(t, c, this.sim.trips, g).done);
    // always: collect a big bubble now and then (a kid taps them)
    if (this.actions % 3 === 0 && this.collect()) return true;
    for (const g of goals) if (this.work(g)) return true;
    // keep the town growing in balance
    return this.grow();
  }

  /** Keep a balance: roads with room, homes, shops and work as the town wants them. */
  grow(): boolean {
    const t = this.town;
    const c = this.sim.census;
    const lots = (z: 'home' | 'shop' | 'work') => emptyLots(t, z, 6).length;
    if (c.demand.home > 0.3 && lots('home') < 2 && this.zoneStrip(ZONE.home)) return true;
    if (c.demand.shop > 0.3 && lots('shop') < 1 && this.zoneStrip(ZONE.shop, 4)) return true;
    if (zoneOpen(t, ZONE.work) && c.demand.work > 0.3 && lots('work') < 1 && this.zoneStrip(ZONE.work, 4)) return true;
    if ((c.happy ?? 70) < 72 && toolOpen(t, 'park') && t.coins > 60 && this.plantTrees(2)) return true;
    if (this.growRoads()) return true;
    return false;
  }

  private work(g: Goal): boolean {
    const t = this.town;
    const c = this.sim.census;
    switch (g.kind) {
      case 'stat':
        if (g.stat === 'road') return this.growRoads();
        if (g.stat === 'zone-1') return this.zoneStrip(ZONE.home);
        if (g.stat === 'zone-2') return this.zoneStrip(ZONE.shop, 4);
        if (g.stat === 'collected') return false;
        if (g.stat === 'placed-tree') return this.plantTrees(3, true);
        if (g.stat === 'placed-flowerbed') return this.place('flowerbed');
        if (g.stat === 'solar') { const b = t.things.find(x => THING[x.def]?.zone && !x.solar); return !!b && this.do('solar', { type: 'solar', id: b.id }); }
        return false;
      case 'pop': case 'happy': case 'jams': {
        if ((g.kind === 'happy' || (c.happy ?? 70) < 70) && this.cheerUp()) return true;
        if ((g.kind === 'jams' || (this.sim.trips?.jams ?? 0) > 3) && this.busRoute()) return true;
        return false;
      }
      case 'count': {
        // zone more only when the lots already zoned are taken (then wait for them to grow)
        if (g.cls === 'shop') return !emptyLots(t, 'shop', 1).length && this.zoneStrip(ZONE.shop, 4);
        if (g.cls === 'work') return !emptyLots(t, 'work', 1).length && this.zoneStrip(ZONE.work, 4);
        // homes grow bigger when they're happy (and flats need a school and a clinic): help them
        if (g.cls === 'home') return this.cheerUp();
        const def = g.def ?? g.defs?.[0];
        if (def === 'busstop') return this.placeStop('busstop');
        if (def === 'tramstop') return this.placeStop('tramstop');
        return !!def && this.place(def);
      }
      case 'cover': return this.place(g.service);
      case 'project': {
        if (fundProject(t, g.project).ok) { this.did('project'); return true; }
        this.short = true;
        return false;
      }
      case 'lanes': return this.paintLane(g.lane);
      case 'eco': {
        if (!t.things.some(x => x.def === 'recycling') && this.place('recycling')) return true;
        const b = t.things.find(x => THING[x.def]?.zone && !x.solar);
        if (b && t.coins > 80 && this.do('solar', { type: 'solar', id: b.id })) return true;
        if (this.paintLane('bike')) return true;
        return this.plantTrees(3);
      }
      case 'flag': t.flags[g.flag] = 1; this.did(`flag-${g.flag}`); return true;
      case 'routes': return this.busRoute();
    }
  }

  /**
   * No open land beside a road: clear a short row of small homes (level 1) and trees beside a road
   * and zone it for what the town wants. Everything taken away gives its coins back.
   */
  private rezone(zone: number): boolean {
    const t = this.town;
    if (zone === ZONE.home) return false;
    const occ = occupancy(t);
    let best: { x0: number; z0: number; x1: number; z1: number; ids: number[] } | null = null, bestCost = Infinity;
    for (let z = 2; z < H - 3; z++) for (let x = 2; x < W - 4; x++) {
      if (!isRoad(t, x, z) || !isRoad(t, x + 3, z)) continue;
      for (const dz of [1, -2]) {
        const tiles: [number, number][] = [];
        for (let k = 0; k < 4; k++) tiles.push([x + k, z + dz], [x + k, z + dz + 1]);
        if (!tiles.every(([a, b]) => inMap(a, b) && buildable(a, b) && isOpen(t, a, b) && !isRoad(t, a, b) && !onGrid(a, b))) continue;
        const ids = [...new Set(tiles.map(([a, b]) => occ[idx(a, b)]!).filter(Boolean))];
        let cost = 0;
        for (const id of ids) {
          const o = t.things.find(th => th.id === id)!, od = THING[o.def]!;
          if (!(od.class === 'tree' || (od.class === 'home' && (od.level ?? 1) === 1)) || tilesOf(o).some(([a, b]) => !tiles.some(([c, d]) => a === c && b === d))) { cost = Infinity; break; }
          cost += od.class === 'home' ? 2 : 0.3;
        }
        if (cost < bestCost) { bestCost = cost; best = { x0: x, z0: z + dz, x1: x + 3, z1: z + dz + 1, ids }; }
      }
    }
    if (!best) return false;
    for (const id of best.ids) act(t, { type: 'remove', id });
    return this.do(`rezone-${zone}`, { type: 'zone', x0: best.x0, z0: best.z0, x1: best.x1, z1: best.z1, zone });
  }

  /** Fix what the unhappiest homes miss: services first, then trees, something fun nearby, and jobs. */
  cheerUp(): boolean {
    const t = this.town;
    const c = this.sim.census;
    const homes = [...c.homes].sort((a, b) => (c.needs.get(a.id)?.happy ?? 100) - (c.needs.get(b.id)?.happy ?? 100));
    for (const worst of homes.slice(0, 6)) {
      const n = c.needs.get(worst.id);
      if (!n || n.happy >= 95) continue;
      for (const s of ['school', 'clinic', 'safety', 'library', 'community', 'recycling'] as const) if (!n.services[s] && thingOpen(t, s) && this.place(s, centerOf(worst))) return true;
      if (n.nature < 0.6 && this.plantTrees(3)) return true;
      if (n.fun < 0.6 && ((!emptyLots(t, 'shop', 1).length && this.zoneStrip(ZONE.shop, 4)) || this.place('playground', centerOf(worst)))) return true;
      if (n.work < 0.8 && zoneOpen(t, ZONE.work) && !emptyLots(t, 'work', 1).length && this.zoneStrip(ZONE.work, 4)) return true;
    }
    return false;
  }

  placeStop(def: 'busstop' | 'tramstop'): boolean {
    const t = this.town;
    const c = this.sim.census;
    // spread stops through the homes: far from other stops
    const stops = t.things.filter(x => x.def === def).map(centerOf);
    const homes = c.homes.map(centerOf).sort((a, b) => Math.min(...stops.map(s => -Math.hypot(s.x - b.x, s.z - b.z)), 0) - Math.min(...stops.map(s => -Math.hypot(s.x - a.x, s.z - a.z)), 0));
    const at = homes[0] ?? { x: 40, z: 12 };
    if (def === 'tramstop') {
      // beside the tram tracks
      for (let i = 0; i < t.rflags.length; i++) if (t.rflags[i]! & RFLAG.tram && !stops.some(s => Math.hypot(s.x - (i % W), s.z - Math.floor(i / W)) < 6)) return this.place(def, { x: i % W, z: Math.floor(i / W) });
    }
    return this.place(def, at);
  }

  busRoute(): boolean {
    const t = this.town;
    const stops = t.things.filter(x => x.def === 'busstop');
    if (stops.length < 3) return this.placeStop('busstop');
    const used = new Set(t.routes.flatMap(r => r.stops));
    const fresh = stops.filter(s => !used.has(s.id));
    if (t.routes.length && fresh.length < 2) return stops.length < 8 ? this.placeStop('busstop') : false;
    const pick = (t.routes.length ? fresh : stops).slice(0, 6).map(s => s.id);
    return this.do('route', { type: 'route', stops: pick, color: 0x2fa3b0 });
  }

  paintLane(lane: 'bike' | 'tram'): boolean {
    const t = this.town;
    if (!laneOpen(t, lane)) return false;
    const bit = lane === 'bike' ? RFLAG.bike : RFLAG.tram;
    // along the busiest straight road rows: the next 8 road tiles without the lane
    for (let z = 0; z < H; z++) {
      const tiles: [number, number][] = [];
      for (let x = 0; x < W && tiles.length < 8; x++) if (isRoad(t, x, z) && !(t.rflags[idx(x, z)]! & bit) && isRoad(t, x - 1, z) || isRoad(t, x, z) && !(t.rflags[idx(x, z)]! & bit) && isRoad(t, x + 1, z)) tiles.push([x, z]);
      if (tiles.length >= 6 && this.do(`lane-${lane}`, { type: 'lane', lane, tiles, on: true })) return true;
    }
    return false;
  }
}

/** The bot's street grid: rows every 7 tiles from the coast road, columns every 8 through Main Street. */
const onGrid = (x: number, z: number) => (z - 6) % 7 === 0 || x % 8 === 0;

function touches(t: Town, def: string, x: number, z: number, rot: Rot): boolean {
  const d = THING[def]!;
  const w = rot % 2 ? d.d : d.w, dd = rot % 2 ? d.w : d.d;
  for (let i = -1; i <= w; i++) for (const zz of [z - 1, z + dd]) if (isRoad(t, x + i, zz)) return true;
  for (let j = 0; j < dd; j++) for (const xx of [x - 1, x + w]) if (isRoad(t, xx, z + j)) return true;
  return false;
}

export interface PlayOptions {
  /** Give up after this much play (a dead end). */
  limit?: number;
  /** Stop when this chapter starts (for the strategy test's chapter-5 towns). */
  until?: number;
  /** Start every chapter with 0 coins (the city grant must carry the town). */
  broke?: boolean;
}

/** Play the story from a new town (to the festival, or to `until`). */
export function playthrough(seed: number, opts: PlayOptions = {}): BotRun {
  const limit = opts.limit ?? 12 * 3600, until = opts.until ?? CHAPTERS.length;
  const bot = new Bot(seed);
  const t = bot.town;
  bot.extra += CHAPTERS[0]!.intro.length * READ_SEC_PER_LINE;
  const chapters: number[] = [];
  const marks: BotRun['marks'] = [];
  let lastChapter = 0, idle = 0, coinIdle = 0, coinWaitAt = -1, stuck: string | null = null;
  if (opts.broke) t.coins = 0;
  while (t.story.chapter < until && t.t < limit) {
    const acted = bot.step();
    // waiting: for the town to grow, or (when something wanted was too dear) for coins
    if (!acted) {
      bot.wait(6); idle += 6;
      coinIdle = bot.short ? coinIdle + 6 : 0;
      if (coinIdle > bot.coinWait) { bot.coinWait = coinIdle; coinWaitAt = t.story.chapter; }
    }
    else idle = coinIdle = 0;
    if (t.story.chapter !== lastChapter) {
      chapters.push(t.t + bot.extra);
      marks.push({ pop: bot.sim.census.population, happy: bot.sim.census.happy ?? 0, coins: Math.round(t.coins) });
      lastChapter = t.story.chapter;
      if (opts.broke) t.coins = 0;
    }
    if (idle > 1800) { stuck = `chapter ${t.story.chapter}: nothing to do for 30 minutes (${currentGoals(t).filter(g => !progress(t, bot.sim.census, bot.sim.trips, g).done).map(g => g.id).join(', ')})`; break; }
  }
  if (t.story.chapter < until && !stuck) stuck = `chapter ${t.story.chapter} not finished in ${limit / 3600} h: ${currentGoals(t).filter(g => !progress(t, bot.sim.census, bot.sim.trips, g).done).map(g => g.id).join(', ')}`;
  return { town: t, chapters, total: t.t + bot.extra, coinWait: bot.coinWait, coinWaitAt, stuck, actions: bot.actions, marks };
}
