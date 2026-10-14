/**
 * The biggest town a save can ever hold, built to be as hard to write small as possible: every tile
 * different from the one before it (so the run-length map can't shrink), the most buildings and
 * decorations the sim allows, every bus route full, every stat and flag the game writes, and big
 * numbers everywhere. The storage budget is checked against this.
 */
import { CHAPTERS, PROJECTS } from '../../src/data/chapters';
import { isBuildingDef, THINGS } from '../../src/data/things';
import { TUNING } from '../../src/data/tuning';
import { AREAS, H, W } from '../../src/sim/map';
import { emptyTown, type Rot, type Town } from '../../src/sim/state';
import { bubbleSize } from '../../src/sim/payouts';

export function maxTown(seed = 7): Town {
  const t = emptyTown(seed);
  t.name = 'Wonderful Windy Harbour'.padEnd(24, '!');
  t.t = 9_999_999.9;
  t.coins = 999_999_999;
  t.mode = 'story';
  t.unlocked = AREAS.map(a => a.id);
  // the map: 30 tile values in turn (roads with their lanes, then each zone and finish)
  for (let i = 0; i < W * H; i++) {
    const v = i % 30;
    if (v < 4) { t.roads[i] = 1; t.rflags[i] = v; }
    else if (v > 4) { t.zones[i] = Math.floor((v - 5) / 5); t.finish[i] = (v - 5) % 5; }
  }
  const buildings = THINGS.filter(d => isBuildingDef(d.id));
  const decor = THINGS.filter(d => !isBuildingDef(d.id));
  const stops: number[] = [];
  for (let i = 0; i < TUNING.caps.buildings; i++) {
    const d = i < TUNING.caps.stopsPerRoute ? THINGS.find(x => x.id === 'busstop')! : buildings[i % buildings.length]!;
    const thing = { id: t.nextId++, def: d.id, x: (i * 7) % W, z: (i * 13) % H, rot: (i % 4) as Rot, look: i % 8, level: (i % 3) + 1, pay: 0, born: 0, solar: i % 2 === 0 };
    thing.pay = bubbleSize(thing) * 0.77;
    t.things.push(thing);
    if (d.id === 'busstop') stops.push(thing.id);
  }
  for (let i = 0; i < TUNING.caps.decor; i++) {
    const d = decor[i % decor.length]!;
    t.things.push({ id: t.nextId++, def: d.id, x: (i * 11) % W, z: (i * 17) % H, rot: (i % 4) as Rot, look: i % 5, level: 1, pay: 0, born: 0 });
  }
  t.routes = Array.from({ length: TUNING.caps.routes }, (_, i) => ({ id: i + 1, stops: [...stops], color: 0x123456 * (i + 1) % 0xffffff }));
  const big = 987_654_321;
  for (const d of THINGS) { t.stats[`placed-${d.id}`] = big; t.stats[`placed-${d.class}`] = big; }
  for (const k of ['chapters', 'collected', 'grants', 'road', 'routes', 'solar', 'built-home', 'built-shop', 'built-work', 'level2', 'level3', 'zone-1', 'zone-2', 'zone-3', 'zone-4', 'bike', 'tram']) t.stats[k] = big;
  for (let c = 0; c < CHAPTERS.length; c++) t.flags[`intro-${c}`] = 1;
  for (const id of Object.keys(PROJECTS)) t.flags[`project-${id}`] = 1;
  for (const k of ['chapterWaiting', 'endlessFlats', 'endlessPop', 'endlessRound', 'endlessTrees', 'firstFamily', 'halfUpkeepUntil', 'lastGrant', 'openedCityHall', 'openedMaps']) t.flags[k] = big;
  t.story = { chapter: CHAPTERS.length, done: [...CHAPTERS.flatMap(c => c.goals.map(g => g.id)), 'e999-pop', 'e999-trees'], creditsSeen: true };
  t.history = Array.from({ length: 12 }, (_, i) => ({ day: 99_990 + i, income: big, upkeep: big, coins: big, pop: big, happy: 100 }));
  t.cam = { x: 79.9, z: 79.9, yawStep: 7, zoom: 240 };
  return t;
}
