/**
 * The town's rules: the new town, roads and zones, growth, happiness and services, the budget and the
 * city grant, traffic and transit, and the player's actions (with their refunds).
 */
import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';
import { THING } from '../../src/data/things';
import { TUNING } from '../../src/data/tuning';
import { act } from '../../src/sim/actions';
import { grantDue } from '../../src/sim/budget';
import { census } from '../../src/sim/census';
import { eco } from '../../src/sim/eco';
import { emptyLots } from '../../src/sim/growth';
import { buildable, idx } from '../../src/sim/map';
import { COAST_ROAD, MAIN_ST, newTown } from '../../src/sim/newtown';
import { addThing, ZONE, type Town } from '../../src/sim/state';
import { Sim } from '../../src/sim/tick';
import { traffic } from '../../src/sim/traffic';
import { atCap, canPlace, counts, occupancy, tilesOf } from '../../src/sim/world';
import { CROSS, street, zoned } from '../support/street';

const run = (t: Town, sec: number) => { const sim = new Sim(t); const ev = []; for (let i = 0; i < sec * 2; i++) ev.push(...sim.advance(0.5)); return { sim, ev }; };
const homesOf = (t: Town) => t.things.filter(x => THING[x.def]?.class === 'home');

describe('a new town', () => {
  it('starts as sleepy old Breezeport', () => {
    const t = newTown(1);
    expect(t.coins).toBe(TUNING.start.coins);
    expect(t.unlocked).toEqual(['harbor']);
    expect(t.things.find(x => x.def === 'cityhall')).toMatchObject({ x: 41, z: 8 });
    expect(t.roads[idx(MAIN_ST, COAST_ROAD)]).toBe(1);
    // every road in town joins up
    const c = census(t);
    const nets = new Set<number>();
    for (let i = 0; i < c.network.length; i++) if (c.network[i]) nets.add(c.network[i]!);
    expect(nets.size).toBe(1);
    // nothing overlaps, and everything stands on land
    const occ = new Map<number, number>();
    for (const x of t.things) for (const [tx, tz] of tilesOf(x)) {
      expect(occ.has(idx(tx, tz)), `${x.def} overlaps at ${tx},${tz}`).toBe(false);
      occ.set(idx(tx, tz), x.id);
      if (x.def !== 'pier') expect(buildable(tx, tz), `${x.def} at ${tx},${tz}`).toBe(true);
    }
  });

  it('is the same town from the same seed', () => {
    const a = zoned(5), b = zoned(5);
    run(a, 120); run(b, 120);
    expect(a.things.map(x => [x.def, x.x, x.z, x.look])).toEqual(b.things.map(x => [x.def, x.x, x.z, x.look]));
  });

  it('plays the same however the frames fall', () => {
    const a = zoned(9), b = zoned(9);
    const sa = new Sim(a), sb = new Sim(b);
    for (let i = 0; i < 200 * 60; i++) sa.advance(1 / 60);
    for (let i = 0; i < 200 * 7; i++) sb.advance(1 / 7);
    expect(Math.abs(a.t - b.t)).toBeLessThan(0.3);
    expect(homesOf(a).length).toBe(homesOf(b).length);
  });
});

describe('roads and zones', () => {
  it('charges for new road tiles only, and gives it all back', () => {
    const t = newTown(1);
    const before = t.coins;
    const tiles: [number, number][] = [[40, 17], [40, 18], [40, 16]]; // (40, 16) is already road
    expect(act(t, { type: 'road', tiles })).toMatchObject({ ok: true, coins: 2 * TUNING.money.road, n: 2 });
    expect(t.coins).toBe(before - 2 * TUNING.money.road);
    act(t, { type: 'unroad', tiles: [[40, 17], [40, 18]] });
    expect(t.coins).toBe(before);
  });

  it('says plainly why a road can’t go somewhere', () => {
    const t = newTown(1);
    expect(act(t, { type: 'road', tiles: [[40, 1]] })).toMatchObject({ ok: false, why: expect.stringMatching(/beach|bay/) });
    expect(act(t, { type: 'road', tiles: [[10, 20]] })).toMatchObject({ ok: false, why: expect.stringMatching(/isn’t open/) });
    expect(act(t, { type: 'road', tiles: [[42, 9]] })).toMatchObject({ ok: false, why: expect.stringMatching(/already there/) });
    t.coins = 5;
    expect(act(t, { type: 'road', tiles: [[40, 17]] })).toMatchObject({ ok: false, why: expect.stringMatching(/costs/) });
  });

  it('zones only open land, never roads or buildings', () => {
    const t = street();
    const r = act(t, { type: 'zone', x0: 36, z0: CROSS - 2, x1: 44, z1: CROSS, zone: ZONE.home });
    expect(r.ok).toBe(true);
    expect(t.zones[idx(40, CROSS - 1)]).toBe(ZONE.none); // Main Street
    expect(t.zones[idx(38, CROSS)]).toBe(ZONE.none); // the cross street
    expect(t.zones[idx(38, CROSS - 1)]).toBe(ZONE.home);
    expect(act(t, { type: 'zone', x0: 10, z0: 30, x1: 12, z1: 32, zone: ZONE.home }).ok).toBe(false);
  });

  it('finds 2 × 2 lots facing their road', () => {
    const lots = emptyLots(zoned(), 'home');
    expect(lots.length).toBe(5);
    for (const l of lots) expect(l).toMatchObject({ z: CROSS - 2, rot: 0 });
  });
});

describe('growth', () => {
  it('builds homes and shops on zoned lots, facing the street', () => {
    const t = zoned();
    const { ev } = run(t, 240);
    const homes = homesOf(t).filter(h => h.z === CROSS - 2);
    expect(homes.length).toBeGreaterThanOrEqual(3);
    expect(t.things.some(x => THING[x.def]?.class === 'shop')).toBe(true);
    for (const h of homes) {
      expect(h.rot).toBe(0);
      for (const [x, z] of tilesOf(h)) expect(t.zones[idx(x, z)]).toBe(ZONE.home);
    }
    expect(ev.some(e => e.type === 'first-family')).toBe(true);
  });

  it('builds nothing on land nobody zoned', () => {
    const t = street();
    const n = t.things.length;
    run(t, 120);
    expect(t.things.length).toBe(n);
  });

  it('lets homes reach the top level only with a school and a clinic nearby', () => {
    const t = zoned(3);
    t.mode = 'creative';
    t.unlocked = ['harbor', 'maple', 'greenway', 'boardwalk', 'hilltop', 'meadows'];
    run(t, 200);
    // a happy street: trees, a playground, jobs
    for (const [x, z] of [[30, 19], [32, 19], [34, 19], [36, 19], [38, 19], [31, 23], [35, 23]] as const) act(t, { type: 'place', def: 'tree', x, z, rot: 0 });
    act(t, { type: 'zone', x0: 41, z0: CROSS + 1, x1: 50, z1: CROSS + 2, zone: ZONE.work });
    run(t, 900);
    expect(homesOf(t).some(h => h.level === 2)).toBe(true);
    expect(homesOf(t).some(h => h.level === 3)).toBe(false);
    expect(act(t, { type: 'place', def: 'school', x: 30, z: CROSS + 3, rot: 0 }).ok).toBe(true);
    expect(act(t, { type: 'place', def: 'clinic', x: 34, z: CROSS + 3, rot: 0 }).ok).toBe(true);
    run(t, 1200);
    expect(homesOf(t).some(h => h.level === 3)).toBe(true);
  });

  it('stops at the most buildings a save can hold', () => {
    const t = zoned();
    const fill = TUNING.caps.buildings - counts(t).buildings;
    for (let i = 0; i < fill; i++) addThing(t, { def: 'busstop', x: 79, z: 79, rot: 0 });
    expect(atCap(t, 'cottage')).toBe(true);
    const n = t.things.length;
    run(t, 120);
    expect(t.things.length).toBe(n);
    expect(canPlace(t, 'school', 30, CROSS + 3, 0)).toBe('full');
    expect(canPlace(t, 'tree', 30, CROSS + 3, 0)).toBe('ok');
  });
});

describe('happiness and services', () => {
  it('never drops a home below the floor, however little it has', () => {
    const t = newTown(1);
    t.unlocked.push('maple');
    act(t, { type: 'road', tiles: [[10, 20], [11, 20], [12, 20]] });
    addThing(t, { def: 'cottage', x: 10, z: 18, rot: 0 });
    const c = census(t);
    const lonely = c.needs.get(t.things.at(-1)!.id)!;
    expect(lonely.happy).toBeGreaterThanOrEqual(TUNING.happiness.floor);
    expect(lonely.happy).toBeLessThan(60);
  });

  it('covers homes within a service’s circle', () => {
    const t = zoned();
    run(t, 200);
    t.coins = 5000;
    expect(act(t, { type: 'place', def: 'school', x: 31, z: CROSS + 1, rot: 0 }).ok).toBe(true);
    const c = census(t);
    expect(c.homes.length).toBeGreaterThan(0);
    for (const h of c.homes) {
      const d = Math.hypot(h.x + 1 - 32.5, h.z + 1 - (CROSS + 2.5));
      if (d < TUNING.services.radius.school - 2) expect(c.needs.get(h.id)!.services.school).toBe(true);
    }
  });

  it('makes homes happier with trees nearby', () => {
    const t = zoned();
    run(t, 200);
    const before = census(t).happy!;
    for (let x = 30; x <= 39; x++) act(t, { type: 'place', def: 'tree', x, z: CROSS - 3, rot: 0 });
    expect(census(t).happy!).toBeGreaterThan(before);
  });
});

describe('the budget and the city grant', () => {
  it('collects residents’ fees and fills shop bubbles, which collect themselves', () => {
    const t = zoned();
    const { ev } = run(t, 600);
    expect(t.stats.collected ?? 0).toBeGreaterThan(0);
    expect(ev.some(e => e.type === 'collected')).toBe(true);
    expect(t.history.length).toBeGreaterThan(0);
  });

  it('never lets coins go below zero, and a broke town always gets a grant', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const t = zoned(seed);
      const rng = new Rng(seed);
      run(t, 120);
      // a town that spent everything: some services and roads, then not a coin left
      t.mode = 'creative';
      for (let i = 0; i < 4; i++) act(t, { type: 'place', def: rng.pick(['school', 'clinic', 'library', 'safety']), x: rng.int(27, 50), z: rng.int(23, 25), rot: 0 });
      for (let x = 27; x < 53; x++) if (rng.chance(0.5)) act(t, { type: 'road', tiles: [[x, 26]] });
      t.mode = 'story';
      t.coins = 0;
      const sim = new Sim(t);
      let lowest = Infinity, granted = false;
      for (let i = 0; i < 2 * (TUNING.grant.everySec + 60); i++) {
        for (const e of sim.advance(0.5)) if (e.type === 'grant') granted = true;
        lowest = Math.min(lowest, t.coins);
      }
      expect(lowest).toBeGreaterThanOrEqual(0);
      expect(granted || t.coins >= TUNING.grant.below, `seed ${seed}`).toBe(true);
    }
  });

  it('gives no grant in Creative mode, or while coins are waiting to be collected', () => {
    const t = zoned();
    const { sim } = run(t, 400);
    t.coins = 10;
    t.flags.lastGrant = -1e9;
    const shop = sim.census.shops[0]!;
    shop.pay = TUNING.grant.below * 2;
    expect(grantDue(t, sim.census)).toBe(false);
    shop.pay = 0;
    t.mode = 'creative';
    expect(grantDue(t, sim.census)).toBe(false);
  });
});

describe('traffic and transit', () => {
  it('sends cars along the roads, and buses take some of them', () => {
    const t = zoned();
    act(t, { type: 'zone', x0: 41, z0: CROSS + 1, x1: 50, z1: CROSS + 2, zone: ZONE.work });
    run(t, 400);
    const c = census(t);
    const a = traffic(t, c);
    expect(a.car).toBeGreaterThan(0);
    expect(a.load.some(v => v > 0)).toBe(true);
    for (let i = 0; i < a.load.length; i++) if (a.load[i]! > 0) expect(t.roads[i]).toBe(1);
    // bus stops by the homes and by the jobs, joined into a route
    t.mode = 'creative';
    const occ = occupancy(t);
    const spots = [[30, CROSS + 1], [35, CROSS + 1], [47, CROSS - 1], [50, CROSS + 1], [49, CROSS + 1]].filter(([x, z]) => !occ[idx(x!, z!)]);
    const stops = spots.map(([x, z]) => act(t, { type: 'place', def: 'busstop', x: x!, z: z!, rot: 0 })).filter(r => r.ok).length;
    expect(stops).toBeGreaterThanOrEqual(2);
    const ids = t.things.filter(x => x.def === 'busstop').map(x => x.id);
    expect(act(t, { type: 'route', stops: ids, color: 0xff0000 }).ok).toBe(true);
    const b = traffic(t, census(t));
    expect(b.bus).toBeGreaterThan(0);
    expect(b.car).toBeLessThan(a.car);
  });

  it('turns trips green: buses, bikes and trees raise the eco rating', () => {
    const t = zoned();
    run(t, 300);
    const c = census(t);
    const before = eco(t, c, traffic(t, c)).leaves;
    t.mode = 'creative';
    for (let x = 26; x <= 53; x++) act(t, { type: 'place', def: 'tree', x, z: 26, rot: 0 });
    for (const h of t.things.filter(x => THING[x.def]?.zone)) act(t, { type: 'solar', id: h.id });
    const c2 = census(t);
    expect(eco(t, c2, traffic(t, c2)).leaves).toBeGreaterThan(before);
  });
});

describe('actions', () => {
  it('refunds everything taken away, and never removes City Hall', () => {
    const t = street();
    const before = t.coins;
    expect(act(t, { type: 'place', def: 'fountain', x: 30, z: CROSS + 1, rot: 0 }).ok).toBe(true);
    const f = t.things.at(-1)!;
    expect(t.coins).toBe(before - THING.fountain!.cost!);
    expect(act(t, { type: 'remove', id: f.id }).ok).toBe(true);
    expect(t.coins).toBe(before);
    const hall = t.things.find(x => x.def === 'cityhall')!;
    expect(act(t, { type: 'remove', id: hall.id })).toMatchObject({ ok: false });
  });

  it('moves, turns and paints things', () => {
    const t = street();
    act(t, { type: 'place', def: 'bench', x: 30, z: CROSS + 1, rot: 0 });
    const b = t.things.at(-1)!;
    expect(act(t, { type: 'move', id: b.id, x: 31, z: CROSS + 1, rot: 2 }).ok).toBe(true);
    expect(b).toMatchObject({ x: 31, rot: 2 });
    expect(act(t, { type: 'move', id: b.id, x: 40, z: CROSS, rot: 0 }).ok).toBe(false); // a road
    const home = addThing(t, { def: 'cottage', x: 32, z: CROSS - 2, rot: 0 });
    expect(act(t, { type: 'paint', id: home.id, look: 4 }).ok).toBe(true);
    expect(home.look).toBe(4);
  });

  it('puts bus stops only beside a road, and needs two for a route', () => {
    const t = street();
    t.story.chapter = 3;
    expect(act(t, { type: 'place', def: 'busstop', x: 33, z: CROSS + 3, rot: 0 })).toMatchObject({ ok: false, why: expect.stringMatching(/beside a road/) });
    expect(act(t, { type: 'place', def: 'busstop', x: 33, z: CROSS + 1, rot: 0 }).ok).toBe(true);
    const s = t.things.at(-1)!;
    expect(act(t, { type: 'route', stops: [s.id], color: 1 }).ok).toBe(false);
  });

  it('makes everything free in Creative mode', () => {
    const t = newTown(1, 'creative');
    expect(t.coins).toBe(0);
    expect(act(t, { type: 'road', tiles: [[10, 20], [11, 20]] }).ok).toBe(true);
    expect(act(t, { type: 'place', def: 'aquarium', x: 12, z: 21, rot: 0 }).ok).toBe(true);
    expect(t.coins).toBe(0);
  });

  it('caps decorations too', () => {
    const t = street();
    t.coins = 5000;
    for (let i = counts(t).decor; i < TUNING.caps.decor; i++) addThing(t, { def: 'bush', x: 79, z: 79, rot: 0 });
    expect(act(t, { type: 'place', def: 'tree', x: 30, z: CROSS + 1, rot: 0 })).toMatchObject({ ok: false, why: expect.stringMatching(/full of those/) });
    expect(act(t, { type: 'place', def: 'school', x: 30, z: CROSS + 1, rot: 0 }).ok).toBe(true);
  });
});
