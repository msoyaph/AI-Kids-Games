// Interiors (player home + museum): room grid, movement, interactions, enter/exit.
import { approachAngle, clamp, damp } from '../core/math';
import { FISH, BUGS, FOSSILS, item } from '../data/registry';
import type { Game, Interaction } from './game';
import { doorTile, footprint, homeFixtures, roomSize, sleep } from './housing';
import { facingVec, RUN_SPEED, WALK_SPEED } from './player';
import { isDonated } from './museum';

export type RoomKind = 'home' | 'museum';

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

export interface Room {
  kind: RoomKind;
  w: number;
  d: number;
  door: { x: number; z: number };
  solid: Uint8Array;
  fixtures: Fixture[];
  displays: Display[];
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

export function interiorRT(g: Game): InteriorRT | null {
  return (g.runtime.interior as InteriorRT | undefined) ?? null;
}

export function buildHomeRoom(g: Game): Room {
  const { w, d } = roomSize(g);
  const solid = new Uint8Array(w * d);
  const fixtures: Fixture[] = homeFixtures(g).map((f) => ({ ...f }));
  for (const f of fixtures) for (let z = f.z; z < f.z + f.d; z++) for (let x = f.x; x < f.x + f.w; x++) solid[z * w + x] = 1;
  for (const pf of g.state.home.furniture) {
    const def = item(pf.id).furn;
    if (!def || def.rug) continue;
    const fp = footprint(pf.id, pf.rot);
    for (let z = pf.z; z < pf.z + fp.d; z++) for (let x = pf.x; x < pf.x + fp.w; x++) if (x < w && z < d) solid[z * w + x] = 1;
  }
  return { kind: 'home', w, d, door: doorTile(g), solid, fixtures, displays: [] };
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
  const solid = new Uint8Array(w * d);
  const displays: Display[] = [];
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
      displays.push({ wing: wg.wing, item: id, x: s.x, z: s.z, filled: isDonated(g, id) });
      solid[s.z * w + s.x] = 1;
    });
    // dividing walls with an opening along the front walkway
    if (wi > 0) for (let z = 0; z < 8; z++) solid[z * w + wi * MUSEUM_WING_W] = 1;
  });
  const door = { x: Math.floor(w / 2), z: d - 1 };
  const desk: Fixture = { id: 'desk', x: door.x - 3, z: d - 2, w: 2, d: 1 };
  for (let x = desk.x; x < desk.x + desk.w; x++) solid[desk.z * w + x] = 1;
  return { kind: 'museum', w, d, door, solid, fixtures: [desk], displays };
}

export function rebuildRoom(g: Game): void {
  const rt = interiorRT(g);
  if (!rt) return;
  rt.room = rt.room.kind === 'home' ? buildHomeRoom(g) : buildMuseumRoom(g);
  g.emit('location', { loc: rt.room.kind });
}

export function enterInterior(g: Game, kind: RoomKind): void {
  const p = g.state.player;
  const room = kind === 'home' ? buildHomeRoom(g) : buildMuseumRoom(g);
  g.runtime.interior = {
    room,
    x: room.door.x + 0.5,
    z: room.d - 0.55,
    facing: Math.PI,
    vx: 0,
    vz: 0,
    speed: 0,
    ret: { x: p.x, z: p.z, facing: p.facing },
  } satisfies InteriorRT;
  p.location = kind;
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
  g.runtime.interior = undefined;
  g.emit('location', { loc: 'island' });
  g.emit('sfx', { name: 'door' });
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
}

export function interiorFront(g: Game): { x: number; z: number } {
  const rt = interiorRT(g)!;
  const [fx, fz] = facingVec(rt.facing);
  return { x: Math.floor(rt.x + fx * 0.85), z: Math.floor(rt.z + fz * 0.85) };
}

export function interiorResolve(g: Game): Interaction | null {
  const rt = interiorRT(g);
  if (!rt) return null;
  const room = rt.room;
  const f = interiorFront(g);
  const here = { x: Math.floor(rt.x), z: Math.floor(rt.z) };
  for (const fx of room.fixtures) {
    const hit = (p: { x: number; z: number }) => p.x >= fx.x && p.x < fx.x + fx.w && p.z >= fx.z && p.z < fx.z + fx.d;
    if (!hit(f)) continue;
    if (fx.id === 'bed')
      return {
        label: 'Sleep',
        priority: 80,
        run: () => g.ui.confirm('Sleep until morning?', () => g.ui.open('sleep')),
      };
    if (fx.id === 'chest') return { label: 'Open storage', priority: 80, run: () => g.ui.open('storage') };
    if (fx.id === 'desk') return { label: 'Talk to Professor Vesper', priority: 80, run: () => g.ui.open('museumDesk') };
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
  if (room.kind === 'home') {
    void here;
    return { label: 'Decorate', priority: 5, run: () => g.ui.open('editor') };
  }
  return null;
}

export { sleep };
