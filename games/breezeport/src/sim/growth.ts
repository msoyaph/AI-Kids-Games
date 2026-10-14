/**
 * Growth: buildings appear on zoned lots the town has demand for, and grow up as their area gets
 * happier. A lot is a 2 × 2 square of one zone, on open land, beside a road; the new building faces
 * that road. Scaffolding shows while it's built (TUNING.growth.buildSec). Nothing ever shrinks,
 * empties or falls down.
 *
 * Pure: no DOM, no Date, no Math.random (the town's own seeded stream).
 */
import { next } from '../core/rng';
import { GROWS, THING, type ZoneName } from '../data/things';
import { TUNING } from '../data/tuning';
import type { Census } from './census';
import { buildable, idx, inMap } from './map';
import { isRoad } from './roads';
import { addThing, bump, touch, ZONE, type Rot, type Thing, type Town } from './state';
import { counts, isOpen, occupancy } from './world';

/** The town's own dice (seeded and saved, so a town grows the same way every time it's replayed). */
export function roll(town: Town): number {
  const [v, s] = next(town.rng);
  town.rng = s;
  return v;
}

const ZONE_OF: Record<ZoneName, number> = { home: ZONE.home, shop: ZONE.shop, work: ZONE.work };

export interface Lot { x: number; z: number; rot: Rot }

/** Every empty lot of a zone: a 2 × 2 square of that zone on open land with a road beside it. */
export function emptyLots(town: Town, zone: ZoneName, limit = Infinity): Lot[] {
  const want = ZONE_OF[zone];
  const occ = occupancy(town);
  const out: Lot[] = [];
  const used = new Set<number>();
  for (let z = 0; z < 79 && out.length < limit; z++) for (let x = 0; x < 79 && out.length < limit; x++) {
    let ok = true;
    for (let dz = 0; dz < 2 && ok; dz++) for (let dx = 0; dx < 2 && ok; dx++) {
      const i = idx(x + dx, z + dz);
      if (town.zones[i] !== want || occ[i] || used.has(i) || !isOpen(town, x + dx, z + dz)) ok = false;
    }
    if (!ok) continue;
    const rot = facing(town, x, z);
    if (rot === null) continue;
    out.push({ x, z, rot });
    for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) used.add(idx(x + dx, z + dz));
  }
  return out;
}

/** Which way a 2 × 2 lot at (x, z) should face: towards a road along a whole side (south first). */
export function facing(town: Pick<Town, 'roads'>, x: number, z: number): Rot | null {
  const side = (a: [number, number], b: [number, number]) => isRoad(town, ...a) && isRoad(town, ...b);
  if (side([x, z + 2], [x + 1, z + 2])) return 0;
  if (side([x + 2, z], [x + 2, z + 1])) return 3;
  if (side([x - 1, z], [x - 1, z + 1])) return 1;
  if (side([x, z - 1], [x + 1, z - 1])) return 2;
  // a road beside just one tile of a side still works
  if (isRoad(town, x, z + 2) || isRoad(town, x + 1, z + 2)) return 0;
  if (isRoad(town, x + 2, z) || isRoad(town, x + 2, z + 1)) return 3;
  if (isRoad(town, x - 1, z) || isRoad(town, x - 1, z + 1)) return 1;
  if (isRoad(town, x, z - 1) || isRoad(town, x + 1, z - 1)) return 2;
  return null;
}

export type GrowthEvent = { type: 'built'; thing: Thing } | { type: 'level-up'; thing: Thing; level: number };

/** One growth step for a zone: maybe start a new building on a lot (the higher the demand, the likelier). */
export function grow(town: Town, c: Census, zone: ZoneName): Thing | null {
  const d = c.demand[zone];
  if (d < TUNING.growth.minDemand || roll(town) > d + 0.15) return null;
  if (counts(town).buildings >= TUNING.caps.buildings) return null;
  const lots = emptyLots(town, zone, 120);
  if (!lots.length) return null;
  // next to what's already built first, so the town grows outwards like a real one
  const occ = occupancy(town);
  const busy = (l: Lot) => { let n = 0; for (let dz = -2; dz <= 3; dz++) for (let dx = -2; dx <= 3; dx++) if (inMap(l.x + dx, l.z + dz) && occ[idx(l.x + dx, l.z + dz)]) n++; return n; };
  const ranked = lots.map(l => ({ l, b: busy(l) })).sort((a, b) => b.b - a.b);
  const lot = ranked[Math.floor(roll(town) * Math.min(ranked.length, 3))]!.l;
  const defs = GROWS[zone][1];
  const def = defs[Math.floor(roll(town) * defs.length)]!;
  const looks = THING[def]!.looks?.length ?? 1;
  const thing = addThing(town, { def, x: lot.x, z: lot.z, rot: lot.rot, look: Math.floor(roll(town) * looks), level: 1, born: town.t });
  bump(town, `built-${zone}`);
  return thing;
}

/**
 * One level-up step: the happiest building that's ready grows into its next level. Homes need their
 * own happiness over the bar (and a school and a clinic for level 3); shops and workplaces need the
 * homes around them happy and enough shoppers or workers.
 */
export function levelUp(town: Town, c: Census): GrowthEvent | null {
  let best: Thing | null = null, bestScore = 0;
  for (const t of town.things) {
    const d = THING[t.def];
    if (!d?.zone || !d.level || d.level >= 3) continue;
    if (t.born && town.t - t.born < TUNING.growth.buildSec * 2) continue;
    const bar = (TUNING.growth.levelHappy as readonly number[])[d.level] ?? 100;
    let score = 0;
    if (d.zone === 'home') {
      const n = c.needs.get(t.id);
      if (!n || n.happy < bar) continue;
      if (d.level === 2 && !(n.services.school && n.services.clinic)) continue;
      score = n.happy;
    } else {
      const strength = c.strength.get(t.id) ?? 0;
      if (strength < 0.9) continue;
      const around = areaHappy(c, t);
      if (around < bar) continue;
      score = around;
    }
    if (score > bestScore) { bestScore = score; best = t; }
  }
  if (!best) return null;
  const d = THING[best.def]!;
  const level = (d.level ?? 1) + 1;
  const defs = GROWS[d.zone as ZoneName][level as 2 | 3];
  best.def = defs[Math.floor(roll(town) * defs.length)]!;
  best.level = level;
  best.born = town.t;
  const looks = THING[best.def]!.looks?.length ?? 1;
  best.look = best.look % looks;
  bump(town, `level${level}`);
  touch(town);
  return { type: 'level-up', thing: best, level };
}

/** How happy the homes around a building are (or 70 with none around yet). */
function areaHappy(c: Census, t: Thing): number {
  let sum = 0, n = 0;
  for (const h of c.homes) {
    if (Math.abs(h.x - t.x) > 10 || Math.abs(h.z - t.z) > 10) continue;
    const need = c.needs.get(h.id);
    if (need) { sum += need.happy; n++; }
  }
  return n ? sum / n : 70;
}

/** Zone a rectangle (or clear it with ZONE.none). Roads and anything standing there are left alone. */
export function zoneRect(town: Town, x0: number, z0: number, x1: number, z1: number, zone: number): number {
  const occ = occupancy(town);
  let n = 0;
  for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
    if (!inMap(x, z) || !buildable(x, z) || isRoad(town, x, z) || !isOpen(town, x, z)) continue;
    const i = idx(x, z);
    if (occ[i] && zone !== ZONE.none) continue;
    if (town.zones[i] !== zone) { town.zones[i] = zone; n++; }
  }
  if (n) touch(town);
  return n;
}
