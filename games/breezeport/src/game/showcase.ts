/**
 * The showcase town (`?scene=showcase&seed=7`): Breezeport near the end of the story, built in code
 * by the town's own rules, for the website's previews, the cover, the trailer and the performance
 * check of a big town. Every area is open and grown: a downtown of shops and offices round City Hall,
 * family streets in Maple Row and the meadows, the Greenway's parks and glasshouse, the boardwalk's
 * aquarium, Ferris wheel and festival stage, and the observatory up the hill with the tram. All three
 * town projects are done (the lighthouse shines, City Hall has its clock, the ferry runs).
 *
 * It never reads or writes a save.
 */
import { noise } from '../core/rng';
import { GROWS, THING, type ZoneName } from '../data/things';
import { act } from '../sim/actions';
import { emptyLots, zoneRect } from '../sim/growth';
import { AREAS, areaAt, buildable, H, idx, W, type AreaId } from '../sim/map';
import { MAIN_ST, newTown } from '../sim/newtown';
import { isRoad } from '../sim/roads';
import { addThing, touch, ZONE, type Rot, type Town } from '../sim/state';
import { atCap, canPlace, occupancy, touchesRoad } from '../sim/world';
import { CHAPTERS } from '../data/chapters';

/** Street rows and columns (Main Street's column among them). */
const ROWS = [6, 11, 17, 23, 29, 35, 41, 47, 53, 59, 65, 71];
const COLS = [5, 12, 19, 26, 33, MAIN_ST, 47, 54, 61, 68, 75];

/** What each area is mostly zoned for (the rest is homes). */
function zoneFor(area: AreaId | undefined, x: number, z: number): number {
  const n = noise(x >> 1, z >> 1, 77);
  switch (area) {
    case 'harbor': return n < 0.55 ? ZONE.shop : n < 0.75 ? ZONE.work : ZONE.home;
    case 'boardwalk': return z < 14 ? (n < 0.7 ? ZONE.shop : ZONE.home) : n < 0.25 ? ZONE.shop : ZONE.home;
    case 'greenway': return n < 0.35 ? ZONE.park : n < 0.45 ? ZONE.shop : ZONE.home;
    case 'hilltop': return n < 0.2 ? ZONE.shop : n < 0.35 ? ZONE.work : ZONE.home;
    case 'meadows': return n < 0.3 ? ZONE.work : n < 0.4 ? ZONE.shop : ZONE.home;
    default: return n < 0.12 ? ZONE.shop : n < 0.2 ? ZONE.park : ZONE.home;
  }
}

/** How grown a building is: downtown is tallest; the edges of town are still small. */
function levelAt(area: AreaId | undefined, x: number, z: number): 1 | 2 | 3 {
  const n = noise(x, z, 91);
  const core = area === 'harbor' ? 0.35 : area === 'boardwalk' || area === 'hilltop' ? 0.2 : 0.08;
  return n < core ? 3 : n < core + 0.45 ? 2 : 1;
}

/** Put `def` as near (x, z) as it fits, beside a road. */
function placeNear(t: Town, def: string, x: number, z: number): boolean {
  for (let r = 0; r < 10; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
    for (const rot of [0, 1, 2, 3] as Rot[]) {
      if (canPlace(t, def, x + dx, z + dz, rot) !== 'ok' || !touchesRoad(t, def, x + dx, z + dz, rot)) continue;
      if (act(t, { type: 'place', def, x: x + dx, z: z + dz, rot }).ok) return true;
    }
  }
  return false;
}

export function showcaseTown(seed = 7): Town {
  const t = newTown(seed, 'creative');
  t.unlocked = AREAS.map(a => a.id);
  // the street grid, wherever there's land
  const road = (tiles: [number, number][]) => { const ok = tiles.filter(([x, z]) => buildable(x, z) && !occupancy(t)[idx(x, z)]); if (ok.length) act(t, { type: 'road', tiles: ok }); };
  for (const z of ROWS) { const tiles: [number, number][] = []; for (let x = 2; x <= 77; x++) tiles.push([x, z]); road(tiles); }
  for (const x of COLS) { const tiles: [number, number][] = []; for (let z = 6; z <= 77; z++) tiles.push([x, z]); road(tiles); }
  // services and landmarks first, where they belong
  const civic: [string, number, number][] = [
    ['library', 34, 13], ['school', 28, 18], ['clinic', 44, 18], ['safety', 49, 13], ['community', 36, 24],
    ['school', 14, 24], ['clinic', 8, 36], ['library', 20, 30], ['safety', 14, 44], ['school', 30, 60], ['community', 20, 62],
    ['recycling', 48, 62], ['clinic', 36, 48], ['school', 64, 48], ['safety', 70, 60], ['community', 62, 30],
    ['glasshouse', 36, 36], ['pond', 30, 31], ['skatepark', 46, 42], ['playground', 9, 18], ['playground', 24, 50], ['fountain', 41, 14],
    ['aquarium', 62, 8], ['ferris', 70, 9], ['stage', 56, 18], ['observatory', 70, 70], ['playground', 58, 40], ['fountain', 64, 24],
  ];
  for (const [def, x, z] of civic) placeNear(t, def, x, z);
  // zone every lot along the roads by its area
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    if (!isRoad(t, x, z)) continue;
    for (const [dx, dz] of [[0, 1], [0, 2], [0, -1], [0, -2], [1, 0], [2, 0], [-1, 0], [-2, 0]] as const) {
      const nx = x + dx, nz = z + dz;
      if (!buildable(nx, nz) || isRoad(t, nx, nz) || t.zones[idx(nx, nz)]) continue;
      zoneRect(t, nx, nz, nx, nz, zoneFor(areaAt(nx, nz)?.id, nx, nz));
    }
  }
  // the buildings that grew there
  for (const zone of ['home', 'shop', 'work'] as ZoneName[]) {
    for (const lot of emptyLots(t, zone)) {
      if (atCap(t, 'cottage')) break;
      const area = areaAt(lot.x, lot.z)?.id;
      const level = levelAt(area, lot.x, lot.z);
      const defs = GROWS[zone][level];
      const def = defs[Math.floor(noise(lot.x, lot.z, 13) * defs.length)]!;
      const looks = THING[def]!.looks?.length ?? 1;
      addThing(t, { def, x: lot.x, z: lot.z, rot: lot.rot, level, look: Math.floor(noise(lot.x, lot.z, 17) * looks), solar: noise(lot.x, lot.z, 19) < 0.3 });
    }
  }
  // parks: trees, flower beds and benches on park lots; trees in the middle of blocks
  const occ = occupancy(t);
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const i = idx(x, z);
    if (!buildable(x, z) || isRoad(t, x, z) || occ[i] || atCap(t, 'tree')) continue;
    const n = noise(x, z, 23);
    if (t.zones[i] === ZONE.park) addThing(t, { def: n < 0.45 ? 'tree' : n < 0.6 ? 'blossom' : n < 0.78 ? 'flowerbed' : n < 0.88 ? 'bench' : 'picnic', x, z, rot: (Math.floor(n * 40) % 4) as Rot, look: Math.floor(n * 50) % 5 });
    else if (!t.zones[i] && n < 0.55) addThing(t, { def: n < 0.3 ? 'tree' : n < 0.42 ? 'pine' : n < 0.5 ? 'blossom' : 'bush', x, z, rot: 0, look: Math.floor(n * 30) % 3 });
  }
  // transit: bus stops and three routes, bike lanes on two long streets, the tram up the hill
  const stops: number[][] = [[], [], []];
  const stopSpots: [number, number, number][] = [[38, 12, 0], [45, 18, 0], [34, 24, 0], [27, 30, 0], [13, 18, 1], [20, 24, 1], [6, 30, 1], [13, 36, 1], [55, 12, 2], [62, 18, 2], [69, 24, 2], [55, 30, 2]];
  for (const [x, z, r] of stopSpots) if (placeNear(t, 'busstop', x, z)) stops[r]!.push(t.things.at(-1)!.id);
  const colors = [0x2fa3b0, 0xef6a55, 0xffc23d];
  stops.forEach((s, i) => { if (s.length >= 2) act(t, { type: 'route', stops: s, color: colors[i]! }); });
  const lane = (lane: 'bike' | 'tram', tiles: [number, number][]) => act(t, { type: 'lane', lane, on: true, tiles: tiles.filter(([x, z]) => isRoad(t, x, z)) });
  const along = (x0: number, z0: number, x1: number, z1: number) => { const out: [number, number][] = []; for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) out.push([x, z]); return out; };
  lane('bike', along(5, 23, 54, 23));
  lane('bike', along(26, 17, 26, 59));
  lane('tram', along(MAIN_ST, 11, MAIN_ST, 41));
  lane('tram', along(MAIN_ST, 41, 68, 41));
  lane('tram', along(68, 41, 68, 71));
  for (const [x, z] of [[41, 12], [41, 30], [52, 42], [69, 52], [69, 66]] as const) placeNear(t, 'tramstop', x, z);
  // the story is nearly done: every project funded, the stage built
  for (const p of ['lighthouse', 'clocktower', 'pier']) t.flags[`project-${p}`] = 1;
  t.mode = 'story';
  t.story = { chapter: CHAPTERS.length - 1, done: CHAPTERS.slice(0, -1).flatMap(c => c.goals.map(g => g.id)), creditsSeen: false };
  t.coins = 4820;
  t.name = 'Breezeport';
  touch(t);
  return t;
}
