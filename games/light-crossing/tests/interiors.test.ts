// Walk-in interiors: layouts, entering/leaving, the shop, Lantern Hall, villager homes,
// gifts on display, markers, and saving + resuming indoors.
import { describe, expect, it } from 'vitest';
import { makeGame } from './helpers';
import { nextDay, placePlot, setHour, talk } from './story';
import { HALL_ROOM, SHOP_ROOM, VILLAGER_ROOMS } from '../src/data/interiors';
import { VILLAGERS } from '../src/data/villagers';
import { item } from '../src/data/registry';
import {
  buildRoom,
  canEnter,
  enterInterior,
  exitInterior,
  interiorResolve,
  interiorRT,
  stepInterior,
  villagerRoom,
  type Room,
  type RoomKind,
} from '../src/sim/interior';
import { agents, homeResolver, personRoom, roomDoorOf, syncAgents } from '../src/sim/agents';
import { applyEffect } from '../src/sim/quests';
import { scheduleMoveIn } from '../src/sim/placement';
import { give } from '../src/sim/inventory';
import { giveGift } from '../src/sim/villagers';
import { markerPos } from '../src/sim/markers';
import { MISSION_BY_ID } from '../src/data/missions';
import { SafeStorage, SaveManager } from '../src/sim/save';
import { createGame } from '../src/sim/systems';
import type { Game } from '../src/sim/game';

class MemStorage implements Storage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

/** A game where every villager has moved in, the shop and museum are built. */
function townGame(seed = 4242): Game {
  const g = makeGame(seed);
  applyEffect(g, { type: 'pitchTent' });
  applyEffect(g, { type: 'spawn', struct: 'shopCart' });
  applyEffect(g, { type: 'construct', from: 'shopCart', to: 'shop' });
  applyEffect(g, { type: 'spawn', struct: 'museumTent' });
  applyEffect(g, { type: 'construct', from: 'museumTent', to: 'museum' });
  for (const v of VILLAGERS) placePlot(g, v.id);
  scheduleMoveIn(g, VILLAGERS.map((v) => v.id));
  nextDay(g);
  syncAgents(g);
  return g;
}

/** Tiles reachable on foot from the doorway. */
function reachable(room: Room): Set<number> {
  const seen = new Set<number>();
  const start = room.door.z * room.w + room.door.x;
  const q = [start];
  seen.add(start);
  while (q.length) {
    const i = q.pop()!;
    const x = i % room.w, z = (i / room.w) | 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= room.w || nz >= room.d) continue;
      const k = nz * room.w + nx;
      if (seen.has(k) || room.solid[k]) continue;
      seen.add(k);
      q.push(k);
    }
  }
  return seen;
}
const canReach = (room: Room, reach: Set<number>, x: number, z: number) =>
  [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => reach.has((z + dz!) * room.w + (x + dx!)));

/** Walk the player to stand on (x,z) facing `facing` (room coordinates). */
function stand(g: Game, x: number, z: number, facing: number): void {
  const rt = interiorRT(g)!;
  rt.x = x + 0.5;
  rt.z = z + 0.5;
  rt.facing = facing;
}
const NORTH = Math.PI, WEST = -Math.PI / 2, EAST = Math.PI / 2;

describe('interior layouts', () => {
  it('every villager home is in bounds, overlap-free, and fully reachable — gifts included', () => {
    const g = townGame();
    for (const v of VILLAGERS) {
      const L = VILLAGER_ROOMS[v.id]!;
      expect(L, v.id).toBeTruthy();
      // fill all gift slots so they're checked too
      g.state.villagers[v.id]!.gifts = ['furn_plank_table', 'furn_pocket_fern', 'furn_lullaby_piano', 'furn_woven_rug', 'furn_wick_lantern', 'furn_beacon_statue'];
      const room = buildRoom(g, villagerRoom(v.id));
      const occupied = new Map<number, string>();
      for (const f of L.furniture) {
        const def = item(f.id).furn;
        expect(def, `${v.id}: ${f.id}`).toBeTruthy();
        if (def!.rug) continue;
        const w = (f.r ?? 0) % 2 ? def!.d : def!.w, d = (f.r ?? 0) % 2 ? def!.w : def!.d;
        for (let z = f.z; z < f.z + d; z++)
          for (let x = f.x; x < f.x + w; x++) {
            expect(x >= 0 && z >= 0 && x < L.w && z < L.d, `${v.id}: ${f.id} out of bounds`).toBe(true);
            const k = z * L.w + x;
            expect(occupied.get(k), `${v.id}: ${f.id} overlaps ${occupied.get(k)}`).toBeUndefined();
            occupied.set(k, f.id);
          }
      }
      for (const s of [...L.giftSlots, L.spot, room.door]) expect(occupied.has(s.z * L.w + s.x), `${v.id}: slot ${s.x},${s.z} is blocked`).toBe(false);
      const reach = reachable(room);
      expect(canReach(room, reach, L.spot.x, L.spot.z), `${v.id}: can't reach the villager`).toBe(true);
      for (const s of L.giftSlots) expect(canReach(room, reach, s.x, s.z), `${v.id}: gift slot ${s.x},${s.z}`).toBe(true);
      expect(room.people.map((p) => p.id)).toEqual([v.id]);
      expect(room.decor.filter((d) => d.gift)).toHaveLength(6);
    }
  });

  it('Lantern Hall and the shop: every desk, board, kiosk and shelf can be reached', () => {
    const g = townGame();
    for (const kind of ['hall', 'shop'] as RoomKind[]) {
      const room = buildRoom(g, kind);
      const reach = reachable(room);
      for (const f of room.fixtures) {
        let ok = false;
        for (let z = f.z; z < f.z + f.d; z++) for (let x = f.x; x < f.x + f.w; x++) ok ||= canReach(room, reach, x, z);
        expect(ok, `${kind}: ${f.id}`).toBe(true);
      }
      for (const s of room.shelves) expect(canReach(room, reach, s.x, s.z), `${kind}: shelf ${s.x},${s.z}`).toBe(true);
    }
    expect(SHOP_ROOM.shelves.length).toBeGreaterThanOrEqual(19);
    expect(HALL_ROOM.fixtures.map((f) => f.id).sort()).toEqual(['board', 'desk', 'kiosk']);
  });
});

describe('entering and leaving', () => {
  it('Lantern Hall: walk in, talk to Pemberly at her desk, use the board and kiosk, walk out the door', () => {
    const g = makeGame(31);
    const door = roomDoorOf(g, 'hall')!;
    expect(canEnter(g, 'hall').ok).toBe(true);
    g.state.player.x = door.x;
    g.state.player.z = door.z;
    enterInterior(g, 'hall');
    expect(g.state.player.location).toBe('hall');
    const room = interiorRT(g)!.room;
    expect(room.people[0]!.id).toBe('pemberly');
    stand(g, 5, 3, NORTH);
    expect(interiorResolve(g)!.label).toBe('Talk to Pemberly');
    stand(g, 1, 3, WEST);
    expect(interiorResolve(g)!.label).toBe('Read the notice board');
    stand(g, 8, 2, EAST);
    expect(interiorResolve(g)!.label).toBe('Lumen Exchange');
    // walk out through the door
    stand(g, room.door.x, room.d - 1, 0);
    for (let k = 0; k < 60 && g.state.player.location !== 'island'; k++) stepInterior(g, 0, 1, false, 1 / 30);
    expect(g.state.player.location).toBe('island');
    expect(g.state.player.indoor).toBeUndefined();
    expect(Math.hypot(g.state.player.x - door.x, g.state.player.z - door.z)).toBeLessThan(0.01);
  });

  it('the shop shows today\'s stock on its shelves and sells it; it closes at night', () => {
    const g = townGame(77);
    setHour(g, 10);
    expect(canEnter(g, 'shop').ok).toBe(true);
    enterInterior(g, 'shop');
    const room = interiorRT(g)!.room;
    const stocked = room.shelves.filter((s) => s.stock);
    expect(stocked.length).toBeGreaterThanOrEqual(15);
    expect(room.people[0]!.id).toBe('fennimore');
    // the first shelf (left wall) holds a tool
    expect(item(room.shelves[0]!.stock!.id).tool).toBeTruthy();
    const furn = room.shelves.find((s) => s.stock && item(s.stock.id).furn && s.stock.limited)!;
    g.state.player.glints = 100000;
    // face the furniture shelf from a free neighbour and buy it
    const n = [[0, 1, NORTH], [1, 0, WEST], [-1, 0, EAST], [0, -1, 0]].find(([dx, dz]) => !room.solid[(furn.z + dz!) * room.w + furn.x + dx!])!;
    stand(g, furn.x + n[0]!, furn.z + n[1]!, n[2]!);
    const act = interiorResolve(g)!;
    expect(act.label).toContain(`Buy ${item(furn.stock!.id).name}`);
    act.run();
    expect(g.state.player.inv.some((s) => s?.id === furn.stock!.id)).toBe(true);
    expect(g.state.player.glints).toBe(100000 - furn.stock!.price);
    const again = interiorResolve(g)!;
    expect(again.disabled).toBe(true);
    expect(again.label).toContain('sold out');
    stand(g, 4, 3, NORTH);
    expect(interiorResolve(g)!.label).toBe('Talk to Fennimore');
    exitInterior(g);
    setHour(g, 23);
    expect(canEnter(g, 'shop').ok).toBe(false);
    expect(personRoom(g, 'fennimore')).toBe('shop');
    expect(agents(g).get('fennimore')).toBeUndefined();
  });

  it('knocking lets you into a villager\'s home only when they are home; gifts show up inside', () => {
    const g = townGame(55);
    const id = 'tansy';
    const home = g.state.world.structures.find((s) => s.owner === id && s.type === 'villagerHome')!;
    const door = roomDoorOf(g, villagerRoom(id))!;
    const knock = () => {
      g.state.player.x = door.x;
      g.state.player.z = door.z;
      g.state.player.facing = Math.PI;
      return homeResolver(g, { ...g.interactCtx(), frontStruct: home })!;
    };
    // 9 AM: Tansy is out at the plaza
    setHour(g, 9);
    const toasts: string[] = [];
    g.bus.on('toast', (t) => toasts.push(t.text));
    knock().run();
    expect(g.state.player.location).toBe('island');
    expect(toasts.at(-1)).toMatch(/isn't home/);
    // 12:30 (midday home slot) and she's gone inside
    setHour(g, 12.5);
    agents(g).get(id)!.visible = false;
    expect(personRoom(g, id)).toBe(villagerRoom(id));
    knock().run();
    expect(g.state.player.location).toBe(villagerRoom(id));
    stand(g, 4, 2, EAST);
    expect(interiorResolve(g)!.label).toBe('Talk to Tansy');
    exitInterior(g);
    // a furniture gift appears in her home
    give(g, 'furn_wick_lantern', 1);
    giveGift(g, id, g.state.player.inv.findIndex((s) => s?.id === 'furn_wick_lantern'));
    expect(g.state.villagers[id]!.gifts).toEqual(['furn_wick_lantern']);
    knock().run();
    const room = interiorRT(g)!.room;
    expect(room.decor.find((d) => d.gift)?.id).toBe('furn_wick_lantern');
    const slot = VILLAGER_ROOMS[id]!.giftSlots[0]!;
    stand(g, slot.x + 1, slot.z, WEST);
    expect(interiorResolve(g)!.label).toBe('Look at the Wick Lantern');
  });
});

describe('saving and resuming indoors', () => {
  function saveAndLoad(g: Game): Game {
    const mgr = new SaveManager(new SafeStorage(new MemStorage()));
    expect(mgr.write(0, g.state)).toBe(true);
    const r = mgr.read(0);
    if (!r.ok) throw new Error(r.error);
    return createGame(r.state);
  }

  it('a save made inside Lantern Hall resumes inside, at the same spot', () => {
    const g = makeGame(41);
    const door = roomDoorOf(g, 'hall')!;
    g.state.player.x = door.x;
    g.state.player.z = door.z;
    enterInterior(g, 'hall');
    for (let k = 0; k < 20; k++) stepInterior(g, -1, -1, false, 1 / 30);
    const rt = interiorRT(g)!;
    const g2 = saveAndLoad(g);
    expect(g2.state.player.location).toBe('hall');
    const rt2 = interiorRT(g2)!;
    expect(rt2.x).toBeCloseTo(rt.x, 5);
    expect(rt2.z).toBeCloseTo(rt.z, 5);
    exitInterior(g2);
    expect(Math.hypot(g2.state.player.x - door.x, g2.state.player.z - door.z)).toBeLessThan(0.01);
  });

  it('resumes inside a villager home and the museum; older saves resume at the door', () => {
    const g = townGame(43);
    setHour(g, 12.5);
    enterInterior(g, villagerRoom('rusk'));
    stand(g, 4, 4, NORTH);
    stepInterior(g, 0, 0, false, 1 / 30);
    setHour(g, 9); // even if Rusk would be out by now, you're still his guest
    const g2 = saveAndLoad(g);
    expect(g2.state.player.location).toBe(villagerRoom('rusk'));
    expect(interiorRT(g2)!.room.people[0]!.id).toBe('rusk');
    // a v2-style save: indoors with no saved indoor position
    const g3 = townGame(44);
    g3.state.player.location = 'museum';
    g3.state.player.indoor = undefined;
    const g4 = saveAndLoad(g3);
    expect(g4.state.player.location).toBe('museum');
    const rt4 = interiorRT(g4)!;
    expect(Math.floor(rt4.x)).toBe(rt4.room.door.x);
  });

  it('falls back outside if the room no longer makes sense', () => {
    const g = makeGame(45);
    g.state.player.location = 'shop'; // no shop on a new island
    g.state.player.indoor = { x: 3, z: 3, facing: 0, ret: { x: 20.5, z: 30.5, facing: 0 } };
    const g2 = saveAndLoad(g);
    expect(g2.state.player.location).toBe('island');
    expect(g2.state.player.x).toBe(20.5);
    expect(interiorRT(g2)).toBeNull();
  });
});

describe('markers', () => {
  it('point at the hall door from outside, and at Pemberly once inside', () => {
    const g = makeGame(51);
    const m = MISSION_BY_ID.m1_arrive!;
    const door = roomDoorOf(g, 'hall')!;
    const out = markerPos(g, m)!;
    expect(Math.hypot(out.x - door.x, out.z - (door.z - 0.7))).toBeLessThan(0.01);
    enterInterior(g, 'hall');
    const inside = markerPos(g, m)!;
    const p = interiorRT(g)!.room.people.find((x) => x.id === 'pemberly')!;
    expect([inside.x, inside.z]).toEqual([p.x, p.z]);
    // the map always uses island coordinates
    expect(markerPos(g, m, 'island')).toEqual(out);
  });

  it('indoors, a target elsewhere points at the way out', () => {
    const g = townGame(52);
    talk(g, 'pemberly');
    const m = MISSION_BY_ID.m1_camp!;
    enterInterior(g, 'museum');
    const room = interiorRT(g)!.room;
    const t = markerPos(g, m)!;
    expect(Math.floor(t.x)).toBe(room.door.x);
    expect(t.z).toBeGreaterThan(room.d - 1);
  });

  it('Pemberly waits outdoors in the plaza for the festival', () => {
    const g = makeGame(53);
    g.state.quests.active.m5_finale = { startedDay: 1, counts: [0] };
    syncAgents(g);
    expect(personRoom(g, 'pemberly')).toBeNull();
    expect(agents(g).get('pemberly')?.visible).toBe(true);
  });
});
