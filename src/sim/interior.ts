// Walk-in interiors: the player's home, the museum, The Curled Leaf shop, Lantern Hall and every
// villager's home. Room grid, movement, interactions, enter/exit, and resuming indoors from a save.
import { approachAngle, clamp, damp, fmt } from '../core/math';
import { HALL_ROOM, SHOP_ROOM, VILLAGER_ROOMS, GIFT_SLOTS, type PlacedDecor } from '../data/interiors';
import { FISH, BUGS, FOSSILS, item } from '../data/registry';
import { NPC_BY_ID, VILLAGER_BY_ID } from '../data/villagers';
import type { Game, Interaction } from './game';
import { doorTile, footprint, furnitureAt, homeData, homeFixtures, roomSize, sleep } from './housing';
import { facingVec, RUN_SPEED, WALK_SPEED } from './player';
import { isDonated } from './museum';
import { buy, dailyStock, type StockEntry } from './economy';
import { activityOf, agents, homeOf, roomDoorOf } from './agents';
import { findStructure } from './structures';
import type { IndoorPos, Location } from './state';

export type RoomKind = Exclude<Location, 'island'>;

export interface Fixture {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface Display {
  wing: 'fish' | 'bugs' | 'fossils';
  item: string;
  x: number;
  z: number;
  filled: boolean;
}

/** Someone standing in the room (NPC at their desk/counter, a villager at home). */
export interface RoomPerson {
  id: string;
  x: number;
  z: number;
  facing: number;
}

/** A shop display spot and what's on it today. */
export interface ShelfSlot {
  x: number;
  z: number;
  kind: 'wall' | 'table';
  stock: StockEntry | null;
  sold: boolean;
}

export interface Room {
  kind: RoomKind;
  w: number;
  d: number;
  door: { x: number; z: number };
  solid: Uint8Array;
  fixtures: Fixture[];
  displays: Display[];
  people: RoomPerson[];
  shelves: ShelfSlot[];
  /** decorative furniture (layouts + villager gifts); `gift` marks gifted pieces */
  decor: (PlacedDecor & { gift?: boolean })[];
  floor?: string;
  wall?: string;
}

export interface InteriorRT {
  room: Room;
  x: number;
  z: number;
  facing: number;
  vx: number;
  vz: number;
  speed: number;
  /** island position to return to */
  ret: { x: number; z: number; facing: number };
}

export const MUSEUM_WING_W = 13;
export const MUSEUM_D = 11;
export const SHOP_HOURS: [number, number] = [8, 22];

export function interiorRT(g: Game): InteriorRT | null {
  return (g.runtime.interior as InteriorRT | undefined) ?? null;
}

export const villagerRoom = (id: string): RoomKind => `villager:${id}`;
export function roomVillager(kind: string): string | null {
  return kind.startsWith('villager:') ? kind.slice(9) : null;
}

function emptyRoom(kind: RoomKind, w: number, d: number, door = { x: Math.floor(w / 2), z: d - 1 }): Room {
  return { kind, w, d, door, solid: new Uint8Array(w * d), fixtures: [], displays: [], people: [], shelves: [], decor: [] };
}

function fill(room: Room, x: number, z: number, w: number, d: number): void {
  for (let zz = z; zz < z + d; zz++) for (let xx = x; xx < x + w; xx++) if (xx >= 0 && zz >= 0 && xx < room.w && zz < room.d) room.solid[zz * room.w + xx] = 1;
}

function addDecor(room: Room, list: (PlacedDecor & { gift?: boolean })[]): void {
  for (const f of list) {
    room.decor.push(f);
    const def = item(f.id).furn;
    if (!def || def.rug) continue;
    const fp = f.gift ? { w: 1, d: 1 } : footprint(f.id, f.r ?? 0);
    fill(room, f.x, f.z, fp.w, fp.d);
  }
}

function addPerson(room: Room, id: string, x: number, z: number, facing = 0): void {
  room.people.push({ id, x, z, facing });
  fill(room, Math.floor(x), Math.floor(z), 1, 1);
}

export function buildHomeRoom(g: Game, kind: 'home' | 'basement' = 'home'): Room {
  const { w, d } = roomSize(g, kind);
  const room = emptyRoom(kind, w, d, doorTile(g, kind));
  room.fixtures = homeFixtures(g, kind).map((f) => ({ ...f }));
  for (const f of room.fixtures) fill(room, f.x, f.z, f.w, f.d);
  for (const pf of homeData(g, kind).furniture) {
    const def = item(pf.id).furn;
    if (!def || def.rug || pf.on !== undefined) continue;
    const fp = footprint(pf.id, pf.rot);
    fill(room, pf.x, pf.z, fp.w, fp.d);
  }
  return room;
}

/** Display slots for a museum wing, back rows first. */
export function wingSlots(wingIndex: number): { x: number; z: number }[] {
  const out: { x: number; z: number }[] = [];
  const x0 = wingIndex * MUSEUM_WING_W;
  for (const z of [1, 2, 4, 5, 7]) for (let x = x0 + 1; x < x0 + MUSEUM_WING_W - 1; x++) out.push({ x, z });
  return out;
}

export function buildMuseumRoom(g: Game): Room {
  const w = MUSEUM_WING_W * 3, d = MUSEUM_D;
  const room = emptyRoom('museum', w, d);
  const wings = [
    { wing: 'fish' as const, list: FISH.map((f) => f.id) },
    { wing: 'bugs' as const, list: BUGS.map((b) => b.id) },
    { wing: 'fossils' as const, list: FOSSILS.map((f) => f.id) },
  ];
  wings.forEach((wg, wi) => {
    const slots = wingSlots(wi);
    wg.list.forEach((id, k) => {
      const s = slots[k];
      if (!s) return;
      room.displays.push({ wing: wg.wing, item: id, x: s.x, z: s.z, filled: isDonated(g, id) });
      fill(room, s.x, s.z, 1, 1);
    });
    // dividing walls with an opening along the front walkway
    if (wi > 0) fill(room, wi * MUSEUM_WING_W, 0, 1, 8);
  });
  const desk: Fixture = { id: 'desk', x: room.door.x - 3, z: d - 2, w: 2, d: 1 };
  room.fixtures.push(desk);
  fill(room, desk.x, desk.z, desk.w, desk.d);
  room.people.push({ id: 'vesper', x: desk.x + desk.w / 2, z: desk.z - 0.25, facing: 0 });
  return room;
}

const STOCK_ORDER = ['tool', 'seed', 'sapling', 'fruit', 'furniture', 'wallpaper', 'flooring', 'clothing'];
function stockRank(e: StockEntry): number {
  const def = item(e.id);
  const cat = def.tool ? 'tool' : def.cat;
  const r = STOCK_ORDER.indexOf(cat);
  return r < 0 ? STOCK_ORDER.length : r;
}

export function buildShopRoom(g: Game): Room {
  const L = SHOP_ROOM;
  const room = emptyRoom('shop', L.w, L.d);
  room.floor = L.floor;
  room.wall = L.wall;
  room.fixtures = L.fixtures.map((f) => ({ ...f }));
  for (const f of room.fixtures) fill(room, f.x, f.z, f.w, f.d);
  // behind the counter is staff only
  fill(room, 3, 0, 4, 2);
  addDecor(room, L.furniture);
  const stock = [...dailyStock(g, 'shop')].sort((a, b) => stockRank(a) - stockRank(b));
  L.shelves.forEach((s, k) => {
    const e = stock[k] ?? null;
    room.shelves.push({ ...s, stock: e, sold: !!e && e.limited && g.state.shop.sold.includes(e.id) });
    fill(room, s.x, s.z, 1, 1);
  });
  room.people.push({ id: 'fennimore', x: L.host.x, z: L.host.z, facing: 0 });
  return room;
}

export function buildHallRoom(_g: Game): Room {
  const L = HALL_ROOM;
  const room = emptyRoom('hall', L.w, L.d);
  room.floor = L.floor;
  room.wall = L.wall;
  room.fixtures = L.fixtures.map((f) => ({ ...f }));
  for (const f of room.fixtures) fill(room, f.x, f.z, f.w, f.d);
  addDecor(room, L.furniture);
  addPerson(room, 'pemberly', L.host.x, L.host.z);
  return room;
}

export function buildVillagerRoom(g: Game, id: string): Room {
  const L = VILLAGER_ROOMS[id] ?? VILLAGER_ROOMS.tansy!;
  const room = emptyRoom(villagerRoom(id), L.w, L.d);
  room.floor = L.floor;
  room.wall = L.wall;
  addDecor(room, L.furniture);
  // gifts from the player, most recent first, on their gift spots
  const gifts = (g.state.villagers[id]?.gifts ?? []).filter((gid) => !!item(gid).furn).slice(0, GIFT_SLOTS);
  addDecor(
    room,
    gifts.map((gid, k) => ({ id: gid, x: L.giftSlots[k]!.x, z: L.giftSlots[k]!.z, gift: true })),
  );
  addPerson(room, id, L.spot.x + 0.5, L.spot.z + 0.5);
  return room;
}

export function buildRoom(g: Game, kind: RoomKind): Room {
  const vid = roomVillager(kind);
  if (vid) return buildVillagerRoom(g, vid);
  switch (kind) {
    case 'museum':
      return buildMuseumRoom(g);
    case 'shop':
      return buildShopRoom(g);
    case 'hall':
      return buildHallRoom(g);
    case 'basement':
      return buildHomeRoom(g, 'basement');
    default:
      return buildHomeRoom(g);
  }
}

/** Your home or its basement (the rooms you can decorate). */
export function isHomeRoom(kind: string): boolean {
  return kind === 'home' || kind === 'basement';
}

/** Take the stairs between the home and the basement (the way back outside is kept). */
export function changeFloor(g: Game, kind: 'home' | 'basement'): void {
  const rt = interiorRT(g);
  const ret = rt?.ret ?? { x: g.state.player.x, z: g.state.player.z, facing: 0 };
  const st = homeFixtures(g, kind).find((f) => f.id === (kind === 'basement' ? 'stairsUp' : 'stairsDown'));
  const x = st ? st.x + 0.5 + (kind === 'basement' ? 0.5 : -1) : 1.5;
  const z = st ? (kind === 'basement' ? st.z + 1.6 : st.z + 0.5) : 1.5;
  enterInterior(g, kind, { x, z, facing: kind === 'basement' ? 0 : -Math.PI / 2, ret });
}

/** Rebuild the current room after its contents changed (furniture, donations, purchases). */
export function rebuildRoom(g: Game): void {
  const rt = interiorRT(g);
  if (!rt) return;
  rt.room = buildRoom(g, rt.room.kind);
}

export function shopOpen(g: Game): boolean {
  const h = g.state.clock.minute / 60;
  return h >= SHOP_HOURS[0] && h < SHOP_HOURS[1];
}

/** Is `id` at home right now (inside their house)? */
export function villagerIsHome(g: Game, id: string): boolean {
  return !!g.state.villagers[id]?.movedIn && !!homeOf(g, id) && activityOf(id, Math.floor(g.state.clock.minute / 60), g) === 'home';
}

/** Can the player go into this room now? `resume` skips opening hours (loading a save made inside). */
export function canEnter(g: Game, kind: RoomKind, resume = false): { ok: boolean; reason?: string } {
  const vid = roomVillager(kind);
  if (vid) {
    if (!g.state.villagers[vid]?.movedIn || !homeOf(g, vid)) return { ok: false, reason: 'Nobody lives here yet.' };
    if (!resume && !villagerIsHome(g, vid)) return { ok: false, reason: `${VILLAGER_BY_ID[vid]?.name ?? vid} isn't home right now.` };
    return { ok: true };
  }
  switch (kind) {
    case 'home':
      return g.state.home.level >= 0 ? { ok: true } : { ok: false, reason: 'You have no home yet.' };
    case 'museum':
      return findStructure(g, 'museum') ? { ok: true } : { ok: false, reason: 'The museum is not built yet.' };
    case 'shop':
      if (!findStructure(g, 'shop')) return { ok: false, reason: 'The shop is not built yet.' };
      if (!resume && !shopOpen(g)) return { ok: false, reason: 'Closed for the night. Open 8 AM – 10 PM!' };
      return { ok: true };
    case 'hall':
      return findStructure(g, 'hall') ? { ok: true } : { ok: false, reason: 'Lantern Hall is closed.' };
    case 'basement':
      return g.state.home.level >= 3 ? { ok: true } : { ok: false, reason: 'Your home has no basement yet.' };
  }
  return { ok: false };
}

export function enterInterior(g: Game, kind: RoomKind, resume?: IndoorPos): void {
  const p = g.state.player;
  const room = buildRoom(g, kind);
  const door = roomDoorOf(g, kind);
  const ret = resume?.ret ?? (door ? { x: door.x, z: door.z, facing: 0 } : { x: p.x, z: p.z, facing: p.facing });
  const rt: InteriorRT = {
    room,
    x: resume ? clamp(resume.x, 0.3, room.w - 0.3) : room.door.x + 0.5,
    z: resume ? clamp(resume.z, 0.3, room.d - 0.3) : room.d - 0.55,
    facing: resume?.facing ?? Math.PI,
    vx: 0,
    vz: 0,
    speed: 0,
    ret,
  };
  // never resume inside furniture: fall back to the doorway
  if (resume && room.solid[Math.floor(rt.z) * room.w + Math.floor(rt.x)]) {
    rt.x = room.door.x + 0.5;
    rt.z = room.d - 0.55;
  }
  g.runtime.interior = rt;
  p.location = kind;
  p.indoor = { x: rt.x, z: rt.z, facing: rt.facing, ret };
  g.emit('location', { loc: kind });
  g.emit('sfx', { name: 'door' });
}

export function exitInterior(g: Game): void {
  const rt = interiorRT(g);
  const p = g.state.player;
  if (rt) {
    p.x = rt.ret.x;
    p.z = rt.ret.z;
    p.facing = 0;
  }
  p.location = 'island';
  p.indoor = undefined;
  g.runtime.interior = undefined;
  g.emit('location', { loc: 'island' });
  g.emit('sfx', { name: 'door' });
}

/** After loading a save: put the player back inside the room they saved in (or outside its door). */
export function resumeIndoors(g: Game): void {
  const p = g.state.player;
  if (p.location === 'island') {
    p.indoor = undefined;
    return;
  }
  const kind = p.location;
  if (canEnter(g, kind, true).ok) {
    if (p.indoor) enterInterior(g, kind, p.indoor);
    else {
      // older saves have no indoor position: start at the door, with the saved island spot as the way out
      enterInterior(g, kind, { x: 0, z: 0, facing: Math.PI, ret: { x: p.x, z: p.z, facing: p.facing } });
      const rt = interiorRT(g)!;
      rt.x = rt.room.door.x + 0.5;
      rt.z = rt.room.d - 0.55;
      p.indoor = { x: rt.x, z: rt.z, facing: rt.facing, ret: rt.ret };
    }
    return;
  }
  if (p.indoor) {
    p.x = p.indoor.ret.x;
    p.z = p.indoor.ret.z;
  }
  p.location = 'island';
  p.indoor = undefined;
}

function solidAt(room: Room, x: number, z: number): boolean {
  if (x < 0 || z < 0 || x >= room.w || z >= room.d) return true;
  return room.solid[z * room.w + x] === 1;
}

/** Interior movement with circle-vs-tile collision. */
export function stepInterior(g: Game, mx: number, mz: number, run: boolean, dt: number): void {
  const rt = interiorRT(g);
  if (!rt) return;
  const mag = Math.min(1, Math.hypot(mx, mz));
  const sp = run ? RUN_SPEED * 0.8 : WALK_SPEED * 0.85;
  const tvx = mag > 0.12 ? (mx / mag) * sp * mag : 0;
  const tvz = mag > 0.12 ? (mz / mag) * sp * mag : 0;
  if (mag > 0.12) rt.facing = approachAngle(rt.facing, Math.atan2(mx, mz), dt * 14);
  rt.vx = damp(rt.vx, tvx, 16, dt);
  rt.vz = damp(rt.vz, tvz, 16, dt);
  const r = 0.28;
  const room = rt.room;
  const bx = rt.x, bz = rt.z;
  let nx = rt.x + rt.vx * dt, nz = rt.z + rt.vz * dt;
  // leaving through the door
  const atDoor = Math.floor(nx) === room.door.x && nz > room.d - 0.2;
  if (atDoor && rt.vz > 0.3) {
    exitInterior(g);
    return;
  }
  for (let it = 0; it < 3; it++) {
    for (let tz = Math.floor(nz - r); tz <= Math.floor(nz + r); tz++)
      for (let tx = Math.floor(nx - r); tx <= Math.floor(nx + r); tx++) {
        // the doorway lets you step slightly outside the room
        if (tz === room.d && tx === room.door.x) continue;
        if (!solidAt(room, tx, tz)) continue;
        const cx = clamp(nx, tx, tx + 1), cz = clamp(nz, tz, tz + 1);
        const ex = nx - cx, ez = nz - cz;
        const d2 = ex * ex + ez * ez;
        if (d2 >= r * r) continue;
        if (d2 > 1e-9) {
          const d = Math.sqrt(d2);
          nx += (ex / d) * (r - d);
          nz += (ez / d) * (r - d);
        } else {
          nx = bx;
          nz = bz;
        }
      }
  }
  rt.x = nx;
  rt.z = nz;
  rt.speed = Math.hypot(rt.x - bx, rt.z - bz) / Math.max(dt, 1e-6);
  const ind = g.state.player.indoor;
  if (ind) {
    ind.x = rt.x;
    ind.z = rt.z;
    ind.facing = rt.facing;
  }
}

export function interiorFront(g: Game): { x: number; z: number } {
  const rt = interiorRT(g)!;
  const [fx, fz] = facingVec(rt.facing);
  return { x: Math.floor(rt.x + fx * 0.85), z: Math.floor(rt.z + fz * 0.85) };
}

const personName = (id: string) => VILLAGER_BY_ID[id]?.name ?? NPC_BY_ID[id]?.name ?? id;

export function interiorResolve(g: Game): Interaction | null {
  const rt = interiorRT(g);
  if (!rt) return null;
  const room = rt.room;
  const f = interiorFront(g);
  const at = (o: { x: number; z: number; w?: number; d?: number }) => f.x >= Math.floor(o.x) && f.x < Math.floor(o.x) + (o.w ?? 1) && f.z >= Math.floor(o.z) && f.z < Math.floor(o.z) + (o.d ?? 1);
  for (const p of room.people) {
    if (!at(p)) continue;
    return {
      label: `Talk to ${personName(p.id)}`,
      priority: 90,
      run: () => {
        const a = agents(g).get(p.id);
        if (a) a.talking = true;
        g.ui.open('talk', p.id);
      },
    };
  }
  for (const fx of room.fixtures) {
    if (!at(fx)) continue;
    switch (fx.id) {
      case 'bed':
        return { label: 'Sleep', priority: 80, run: () => g.ui.confirm('Sleep until morning?', () => g.ui.open('sleep')) };
      case 'chest':
        return { label: 'Open storage', priority: 80, run: () => g.ui.open('storage') };
      case 'stairsDown':
        return { label: 'Go down to the basement', priority: 80, run: () => changeFloor(g, 'basement') };
      case 'stairsUp':
        return { label: 'Go upstairs', priority: 80, run: () => changeFloor(g, 'home') };
      case 'desk':
        if (room.kind === 'museum') return { label: 'Talk to Professor Vesper', priority: 80, run: () => g.ui.open('museumDesk') };
        return { label: 'Talk to Pemberly', priority: 80, run: () => g.ui.open('talk', 'pemberly') };
      case 'counter':
        return { label: 'Talk to Fennimore', priority: 80, run: () => g.ui.open('talk', 'fennimore') };
      case 'board':
        return { label: 'Read the notice board', priority: 80, run: () => g.ui.open('board') };
      case 'kiosk':
        return { label: 'Lumen Exchange', priority: 80, run: () => g.ui.open('lumens') };
    }
  }
  for (const s of room.shelves) {
    if (!at(s) || !s.stock) continue;
    const e = s.stock;
    const name = item(e.id).name;
    if (s.sold) return { label: `${name} — sold out`, priority: 60, disabled: true, run: () => {} };
    return {
      label: `Buy ${name} (✦ ${fmt(e.price)})`,
      priority: 60,
      run: () =>
        g.ui.confirm(`Buy ${name} for ✦ ${fmt(e.price)}?`, () => {
          if (buy(g, e)) {
            g.toast(`Bought ${name}!`, 'good', e.id);
            rebuildRoom(g);
          }
        }),
    };
  }
  if (room.kind === 'museum') {
    const d = room.displays.find((ds) => ds.x === f.x && ds.z === f.z);
    if (d)
      return {
        label: d.filled ? `Look at the ${item(d.item).name}` : 'Empty display',
        priority: 60,
        run: () => g.ui.open('exhibit', d),
      };
  }
  const gift = room.decor.find((dc) => dc.gift && at(dc));
  if (gift) {
    const owner = roomVillager(room.kind) ?? '';
    return { label: `Look at the ${item(gift.id).name}`, priority: 40, run: () => g.toast(`${personName(owner)} kept the ${item(gift.id).name} you gave them!`, 'good', gift.id) };
  }
  if (isHomeRoom(room.kind)) {
    // dressing up: closets and mirrors open the wardrobe, the dye station opens dyeing
    const pf = furnitureAt(g, f.x, f.z);
    const model = pf ? item(pf.id).furn?.model : undefined;
    if (model === 'wardrobe' || model === 'mirror') return { label: 'Change clothes', priority: 70, run: () => g.ui.open('wardrobe') };
    if (model === 'dyestation') return { label: 'Dye clothes', priority: 70, run: () => g.ui.open('dye') };
    return { label: 'Decorate', priority: 5, run: () => g.ui.open('editor') };
  }
  return null;
}

export { sleep };
