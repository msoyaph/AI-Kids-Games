/**
 * Everything the player can do to the town, as actions. The tools, undo, the playthrough bot and the
 * tests all go through `act`, so they can't disagree about the rules. Each action checks what it
 * needs (open land, coins, a road beside a stop) and says plainly why when it can't. Taking things
 * away always gives their coins back: mistakes cost nothing. In Creative mode everything is free.
 *
 * Pure: no DOM, no Date, no Math.random.
 */
import { THING } from '../data/things';
import { TUNING } from '../data/tuning';
import { collectTap } from './collect';
import { buildable, idx, inMap } from './map';
import { isRoad } from './roads';
import { addThing, bump, RFLAG, ROAD, touch, ZONE, type Rot, type Town } from './state';
import { canPlace, isOpen, occupancy, thingById, WHY_TEXT } from './world';
import { zoneRect } from './growth';

export type Action =
  | { type: 'road'; tiles: [number, number][] }
  | { type: 'unroad'; tiles: [number, number][] }
  | { type: 'lane'; lane: 'bike' | 'tram'; tiles: [number, number][]; on: boolean }
  | { type: 'zone'; x0: number; z0: number; x1: number; z1: number; zone: number }
  | { type: 'place'; def: string; x: number; z: number; rot: Rot; look?: number }
  | { type: 'remove'; id: number }
  | { type: 'move'; id: number; x: number; z: number; rot: Rot }
  | { type: 'paint'; id: number; look: number }
  | { type: 'solar'; id: number }
  | { type: 'collect'; id: number }
  | { type: 'route'; stops: number[]; color: number }
  | { type: 'unroute'; id: number };

export type Result = { ok: true; coins?: number; n?: number } | { ok: false; why: string };

const free = (t: Town) => t.mode === 'creative';
const no = (why: string): Result => ({ ok: false, why });

/** What a road would cost: only the tiles that aren't road yet, and only where a road can go. */
export function roadCost(town: Town, tiles: readonly [number, number][]) {
  let n = 0;
  for (const [x, z] of tiles) if (!isRoad(town, x, z)) n++;
  return n * TUNING.money.road;
}

/** Why a road can't go on a tile (null when it can). */
export function roadBlocked(town: Town, x: number, z: number): string | null {
  if (!inMap(x, z) || !buildable(x, z)) return WHY_TEXT.water;
  if (!isOpen(town, x, z)) return WHY_TEXT.locked;
  if (!isRoad(town, x, z) && occupancy(town)[idx(x, z)]) return WHY_TEXT.taken;
  return null;
}

export const SOLAR_COST = 40;

export function act(town: Town, a: Action): Result {
  switch (a.type) {
    case 'road': {
      for (const [x, z] of a.tiles) { const why = roadBlocked(town, x, z); if (why) return no(why); }
      const cost = free(town) ? 0 : roadCost(town, a.tiles);
      if (cost > town.coins) return no(`That road costs ${cost} coins.`);
      let n = 0;
      for (const [x, z] of a.tiles) {
        const i = idx(x, z);
        if (town.roads[i]) continue;
        town.roads[i] = ROAD.street;
        town.zones[i] = ZONE.none;
        town.finish[i] = 0;
        n++;
      }
      town.coins -= cost;
      bump(town, 'road', n);
      touch(town);
      return { ok: true, coins: cost, n };
    }
    case 'unroad': {
      let n = 0, back = 0;
      for (const [x, z] of a.tiles) {
        if (!isRoad(town, x, z)) continue;
        const i = idx(x, z);
        back += TUNING.money.road + (town.rflags[i]! & RFLAG.bike ? TUNING.money.bikeLane : 0) + (town.rflags[i]! & RFLAG.tram ? TUNING.money.tram : 0);
        town.roads[i] = 0;
        town.rflags[i] = 0;
        n++;
      }
      if (!free(town)) town.coins += back * TUNING.money.refund;
      if (n) touch(town);
      return { ok: true, coins: -back, n };
    }
    case 'lane': {
      const bit = a.lane === 'bike' ? RFLAG.bike : RFLAG.tram;
      const each = a.lane === 'bike' ? TUNING.money.bikeLane : TUNING.money.tram;
      const tiles = a.tiles.filter(([x, z]) => isRoad(town, x, z) && !!(town.rflags[idx(x, z)]! & bit) !== a.on);
      if (!tiles.length) return no(a.on ? 'Draw it along a road.' : 'There’s no lane there.');
      const cost = a.on && !free(town) ? tiles.length * each : 0;
      if (cost > town.coins) return no(`That costs ${cost} coins.`);
      for (const [x, z] of tiles) town.rflags[idx(x, z)] = a.on ? town.rflags[idx(x, z)]! | bit : town.rflags[idx(x, z)]! & ~bit;
      if (a.on) town.coins -= cost; else if (!free(town)) town.coins += tiles.length * each;
      bump(town, a.lane, a.on ? tiles.length : 0);
      touch(town);
      return { ok: true, coins: cost, n: tiles.length };
    }
    case 'zone': {
      const n = zoneRect(town, a.x0, a.z0, a.x1, a.z1, a.zone);
      if (!n) return no(a.zone ? 'Zones go on open land beside your roads.' : 'There’s no zone there.');
      if (a.zone) bump(town, `zone-${a.zone}`, n);
      return { ok: true, n };
    }
    case 'place': {
      const d = THING[a.def];
      if (!d) return no('That isn’t something you can build.');
      const why = canPlace(town, a.def, a.x, a.z, a.rot);
      if (why !== 'ok') return no(WHY_TEXT[why]);
      const cost = free(town) ? 0 : d.cost ?? 0;
      if (cost > town.coins) return no(`It costs ${cost} coins.`);
      // a park piece or a service on a zoned lot takes the lot over
      town.coins -= cost;
      const thing = addThing(town, { def: a.def, x: a.x, z: a.z, rot: a.rot, look: a.look ?? 0, born: d.class === 'civic' || d.class === 'landmark' ? town.t : 0 });
      for (let z = thing.z; z < thing.z + (a.rot % 2 ? d.w : d.d); z++) for (let x = thing.x; x < thing.x + (a.rot % 2 ? d.d : d.w); x++) if (d.class !== 'park' && d.class !== 'tree') town.zones[idx(x, z)] = ZONE.none;
      bump(town, `placed-${a.def}`);
      bump(town, `placed-${d.class}`);
      return { ok: true, coins: cost };
    }
    case 'remove': {
      const t = thingById(town, a.id);
      if (!t) return no('It’s already gone.');
      const d = THING[t.def]!;
      if (t.def === 'cityhall' || t.def === 'pier') return no('That one belongs to the whole town.');
      town.things.splice(town.things.indexOf(t), 1);
      for (const r of town.routes) r.stops = r.stops.filter(s => s !== t.id);
      town.routes = town.routes.filter(r => r.stops.length >= 2);
      const back = free(town) ? 0 : (d.cost ?? 0) * TUNING.money.refund;
      town.coins += back;
      touch(town);
      return { ok: true, coins: -back };
    }
    case 'move': {
      const t = thingById(town, a.id);
      if (!t) return no('It’s gone.');
      const why = canPlace(town, t.def, a.x, a.z, a.rot, t.id);
      if (why !== 'ok') return no(WHY_TEXT[why]);
      Object.assign(t, { x: a.x, z: a.z, rot: a.rot });
      touch(town);
      return { ok: true };
    }
    case 'paint': {
      const t = thingById(town, a.id);
      const looks = t ? THING[t.def]?.looks?.length ?? 0 : 0;
      if (!t || !looks) return no('That one can’t be painted.');
      t.look = ((a.look % looks) + looks) % looks;
      touch(town);
      return { ok: true };
    }
    case 'solar': {
      const t = thingById(town, a.id);
      const z = t ? THING[t.def]?.zone : undefined;
      if (!t || !z) return no('Solar panels go on homes, shops and workplaces.');
      if (t.solar) return no('It already has solar panels.');
      if (!free(town) && town.coins < SOLAR_COST) return no(`Solar panels cost ${SOLAR_COST} coins.`);
      if (!free(town)) town.coins -= SOLAR_COST;
      t.solar = true;
      bump(town, 'solar');
      touch(town);
      return { ok: true, coins: free(town) ? 0 : SOLAR_COST };
    }
    case 'collect': {
      const t = thingById(town, a.id);
      if (!t) return no('It’s gone.');
      const coins = collectTap(town, t);
      return coins > 0 ? { ok: true, coins: -coins } : no('Nothing to collect yet.');
    }
    case 'route': {
      const stops = a.stops.filter(id => thingById(town, id)?.def === 'busstop');
      if (stops.length < 2) return no('A bus route needs at least two stops.');
      if (town.routes.length >= TUNING.caps.routes) return no(`The town can run ${TUNING.caps.routes} bus routes.`);
      town.routes.push({ id: Math.max(0, ...town.routes.map(r => r.id)) + 1, stops: stops.slice(0, TUNING.caps.stopsPerRoute), color: a.color });
      bump(town, 'routes');
      touch(town);
      return { ok: true, n: stops.length };
    }
    case 'unroute': {
      const i = town.routes.findIndex(r => r.id === a.id);
      if (i < 0) return no('That route is gone.');
      town.routes.splice(i, 1);
      touch(town);
      return { ok: true };
    }
  }
}
