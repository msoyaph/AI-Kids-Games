// Tap to walk: find the tile under a tap (projected through the curved world or the room camera), walk
// there along a path, and face whatever was tapped. With empty hands, tapping a person, door, tree or
// item also uses it on arrival; with a tool in hand you tap the glowing spot again to use the tool,
// so nothing is ever dug or chopped by accident.
import type { Game } from '../sim/game';
import { findPath, lineClear } from '../sim/pathfind';
import { agents } from '../sim/agents';
import { interiorRT } from '../sim/interior';
import { equippedTool } from '../sim/tools';
import { tileOf } from '../sim/player';

export type Project = (x: number, y: number, z: number) => { x: number; y: number; visible: boolean };

export interface TapPick {
  /** tile index (island) or room cell (z * w + x) */
  tile: number;
  x: number;
  z: number;
  /** a person, object or structure is there (not plain ground) */
  thing: boolean;
}

const TALL = new Set(['tree', 'pine', 'palm', 'fruitTree', 'rock', 'sapling', 'deco']);
/** buildings you can walk up to (their door is the middle of the front, south side) */
const DOORS = new Set(['hall', 'shop', 'shopCart', 'museum', 'museumTent', 'home', 'villagerHome', 'workbench', 'noticeBoard', 'lighthouse']);
const RADIUS = 14;
const PICK_PX = 56;
/** about how tall each building stands (for its outline on screen) */
const HEIGHT: Record<string, number> = { workbench: 0.8, noticeBoard: 1.3, shopCart: 1.5, museumTent: 1.9, lighthouse: 5 };

/** Which tile is under screen point (sx, sy)? */
export function pickTile(g: Game, project: Project, sx: number, sy: number): TapPick | null {
  let best: TapPick | null = null;
  let bestD = PICK_PX;
  const consider = (tile: number, x: number, z: number, y: number, thing: boolean, bias = 1) => {
    const p = project(x, y, z);
    if (!p.visible) return;
    const d = Math.hypot(p.x - sx, p.y - sy) * bias;
    if (d < bestD) {
      bestD = d;
      best = { tile, x, z, thing };
    }
  };
  const p = g.state.player;
  const rt = interiorRT(g);
  if (p.location !== 'island' && rt) {
    const { w, d } = rt.room;
    for (let z = 0; z < d; z++)
      for (let x = 0; x < w; x++) {
        const solid = rt.room.solid[z * w + x] === 1;
        consider(z * w + x, x + 0.5, z + 0.5, 0, solid);
        if (solid) consider(z * w + x, x + 0.5, z + 0.5, 0.7, true, 0.8);
      }
    for (const person of rt.room.people) {
      const x = Math.floor(person.x), z = Math.floor(person.z);
      consider(z * w + x, x + 0.5, z + 0.5, 0.9, true, 0.6);
    }
    return best;
  }
  const w = g.world;
  const cx = Math.floor(p.x), cz = Math.floor(p.z);
  for (let z = cz - RADIUS; z <= cz + RADIUS; z++)
    for (let x = cx - RADIUS; x <= cx + RADIUS; x++) {
      if (!w.inb(x, z)) continue;
      const i = w.idx(x, z);
      const o = w.obj(i);
      const y = w.surfaceY(x + 0.5, z + 0.5);
      const st = w.structure(i);
      consider(i, x + 0.5, z + 0.5, y, !!o);
      if (o && TALL.has(o.k)) consider(i, x + 0.5, z + 0.5, y + 1.1, true, 0.75);
      // a building's walls and roof count as the building (a child taps what they see)
      if (st && DOORS.has(st.type)) {
        consider(i, x + 0.5, z + 0.5, y + 0.6, false, 0.8);
        if (st.type !== 'workbench' && st.type !== 'noticeBoard') consider(i, x + 0.5, z + 0.5, y + 1.5, false, 0.8);
      }
    }
  // a tap inside a building's outline (its walls, the workbench top) picks the building, not the ground
  // hidden behind it: tile centres crowd together on screen at this camera angle
  const cur = best as TapPick | null;
  if (!cur || (!cur.thing && !w.structure(cur.tile))) {
    let front = -Infinity;
    for (const st of g.state.world.structures) {
      if (!DOORS.has(st.type) || Math.abs(st.x - cx) > RADIUS || Math.abs(st.z - cz) > RADIUS) continue;
      // the picked ground is in front of this building: keep it
      if (cur && Math.floor(cur.z) >= st.z + st.d) continue;
      const y = w.surfaceY(st.x + st.w / 2, st.z + st.d / 2);
      const top = y + (HEIGHT[st.type] ?? 2.2);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const [x, z] of [[st.x, st.z], [st.x + st.w, st.z], [st.x, st.z + st.d], [st.x + st.w, st.z + st.d]])
        for (const h of [y, top]) {
          const q = project(x!, h, z!);
          if (!q.visible) continue;
          x0 = Math.min(x0, q.x);
          x1 = Math.max(x1, q.x);
          y0 = Math.min(y0, q.y);
          y1 = Math.max(y1, q.y);
        }
      // the front-most building whose outline holds the tap
      if (sx < x0 || sx > x1 || sy < y0 || sy > y1 || st.z + st.d <= front) continue;
      front = st.z + st.d;
      const fx = st.x + Math.floor(st.w / 2), fz = st.z + st.d - 1;
      best = { tile: w.idx(fx, fz), x: fx + 0.5, z: fz + 0.5, thing: false };
      bestD = Math.min(bestD, 24);
    }
  }
  for (const a of agents(g).values()) {
    if (!a.visible) continue;
    const x = Math.floor(a.x), z = Math.floor(a.z);
    if (!w.inb(x, z)) continue;
    consider(w.idx(x, z), x + 0.5, z + 0.5, w.surfaceY(a.x, a.z) + 0.9, true, 0.6);
  }
  return best;
}

interface Way {
  x: number;
  z: number;
}

/** Breadth-first path over a room's solid grid. */
function roomPath(solid: Uint8Array, w: number, d: number, from: number, goals: Set<number>): number[] | null {
  const prev = new Map<number, number>([[from, -1]]);
  const q = [from];
  while (q.length) {
    const c = q.shift()!;
    if (goals.has(c)) {
      const out: number[] = [];
      for (let k = c; k !== from; k = prev.get(k)!) out.push(k);
      return out.reverse();
    }
    const x = c % w, z = Math.floor(c / w);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx!, nz = z + dz!;
      if (nx < 0 || nz < 0 || nx >= w || nz >= d) continue;
      const n = nz * w + nx;
      if (prev.has(n) || solid[n] === 1) continue;
      prev.set(n, c);
      q.push(n);
    }
  }
  return null;
}

export class TapMover {
  private way: Way[] = [];
  private face: Way | null = null;
  private use = false;
  private best = Infinity;
  private stuck = 0;
  /** where the walk started (a door ends it) */
  private loc = '';
  active = false;

  cancel(): void {
    this.active = false;
    this.way = [];
    this.face = null;
  }

  /** Walk to `pick`. Returns false when there's no way there. */
  start(g: Game, pick: TapPick): boolean {
    this.cancel();
    const p = g.state.player;
    const near = (a: number, b: number) => a === b;
    const rt = interiorRT(g);
    let path: number[] | null = null;
    let size = 0;
    let toThing = pick.thing;
    if (p.location !== 'island' && rt) {
      const { w, d, solid } = rt.room;
      size = w;
      const from = Math.floor(rt.z) * w + Math.floor(rt.x);
      const goals = new Set<number>();
      toThing = solid[pick.tile] === 1 || pick.thing;
      if (!toThing) goals.add(pick.tile);
      else
        for (const [dx, dz] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
          const x = (pick.tile % w) + dx!, z = Math.floor(pick.tile / w) + dz!;
          if (x >= 0 && z >= 0 && x < w && z < d && solid[z * w + x] !== 1) goals.add(z * w + x);
        }
      if (goals.has(from)) path = [];
      else path = roomPath(solid, w, d, from, goals);
      // someone behind a counter: walk up to the counter in front of them instead
      if (!path && toThing) {
        const far = new Set<number>();
        const tx = pick.tile % w, tz = Math.floor(pick.tile / w);
        for (let dz = -2; dz <= 2; dz++)
          for (let dx = -2; dx <= 2; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dz)) !== 2 || (dx !== 0 && dz !== 0)) continue;
            const x = tx + dx, z = tz + dz;
            if (x >= 0 && z >= 0 && x < w && z < d && solid[z * w + x] !== 1) far.add(z * w + x);
          }
        path = far.has(from) ? [] : roomPath(solid, w, d, from, far);
      }
    } else {
      const wd = g.world;
      size = wd.size;
      const from = tileOf(wd, p.x, p.z);
      // a building: walk to its front door (and go in, with empty hands)
      const st = wd.structure(pick.tile);
      if (st && DOORS.has(st.type)) {
        const dx = st.x + Math.floor(st.w / 2), dz = st.z + st.d;
        if (wd.inb(dx, dz) && wd.standable(wd.idx(dx, dz))) {
          pick = { tile: wd.idx(dx, dz - 1), x: dx + 0.5, z: dz - 0.5, thing: true };
          const q = from === wd.idx(dx, dz) ? [] : findPath(wd, from, wd.idx(dx, dz), 3000);
          if (!q) return false;
          this.way = q.map((i) => ({ x: (i % size) + 0.5, z: Math.floor(i / size) + 0.5 }));
          this.face = { x: pick.x, z: pick.z };
          this.use = !equippedTool(g);
          this.best = Infinity;
          this.stuck = 0;
          this.loc = p.location;
          this.active = true;
          return true;
        }
      }
      const tx = pick.tile % wd.size, tz = Math.floor(pick.tile / wd.size);
      const open = !pick.thing && wd.standable(pick.tile);
      toThing = !open;
      const goals = open ? [pick.tile] : [[0, 1], [-1, 0], [1, 0], [0, -1]].map(([dx, dz]) => [tx + dx!, tz + dz!] as const).filter(([x, z]) => wd.inb(x, z)).map(([x, z]) => wd.idx(x, z)).filter((i) => wd.standable(i));
      let bestLen = Infinity;
      for (const goal of goals) {
        if (near(goal, from)) {
          path = [];
          break;
        }
        const q = findPath(wd, from, goal, 3000);
        if (q && q.length < bestLen) {
          bestLen = q.length;
          path = q;
        }
      }
    }
    if (!path) return false;
    this.way = path.map((i) => ({ x: (i % size) + 0.5, z: Math.floor(i / size) + 0.5 }));
    // the door mat: keep walking, out of the door
    if (p.location !== 'island' && rt && pick.tile === (rt.room.d - 1) * rt.room.w + rt.room.door.x) {
      this.way.push({ x: rt.room.door.x + 0.5, z: rt.room.d - 0.5 }, { x: rt.room.door.x + 0.5, z: rt.room.d + 0.6 });
      toThing = false;
    }
    this.loc = p.location;
    // stop on the tile itself (ground), or face the thing we walked up to
    this.face = toThing ? { x: pick.x, z: pick.z } : null;
    this.use = pick.thing && !equippedTool(g);
    this.best = Infinity;
    this.stuck = 0;
    this.active = true;
    return true;
  }

  /**
   * The move to make this frame (a unit-ish vector), or null when there's nothing left to do.
   * `arrive` is called once when the walk ends next to what was tapped.
   */
  drive(g: Game, dt: number, arrive: (use: boolean) => void): { x: number; z: number } | null {
    if (!this.active) return null;
    const p = g.state.player;
    if (p.location !== this.loc) {
      this.cancel();
      return null;
    }
    const rt = interiorRT(g);
    const pos = p.location !== 'island' && rt ? { x: rt.x, z: rt.z } : { x: p.x, z: p.z };
    // skip ahead to the farthest waypoint in a clear straight line (outdoors)
    if (p.location === 'island')
      while (this.way.length > 1 && lineClear(g.world, pos.x, pos.z, this.way[1]!.x, this.way[1]!.z)) this.way.shift();
    const next = this.way[0];
    if (!next) {
      this.finish(g, arrive);
      return null;
    }
    const dx = next.x - pos.x, dz = next.z - pos.z;
    const d = Math.hypot(dx, dz);
    if (d < (this.way.length === 1 ? 0.12 : 0.3)) {
      this.way.shift();
      this.best = Infinity;
      this.stuck = 0;
      if (!this.way.length) {
        this.finish(g, arrive);
        return null;
      }
      return this.drive(g, dt, arrive);
    }
    // give up if we stop getting closer (a villager in the way, a closed door...)
    if (d < this.best - 0.02) {
      this.best = d;
      this.stuck = 0;
    } else if ((this.stuck += dt) > 1.2) {
      this.cancel();
      return null;
    }
    // ease into the last step so we stop on the tile centre
    const k = this.way.length === 1 ? Math.min(1, d * 2.5 + 0.25) : 1;
    return { x: (dx / d) * k, z: (dz / d) * k };
  }

  private finish(g: Game, arrive: (use: boolean) => void): void {
    const face = this.face;
    const use = this.use;
    this.cancel();
    if (face) {
      const p = g.state.player;
      const rt = interiorRT(g);
      if (p.location !== 'island' && rt) rt.facing = Math.atan2(face.x - rt.x, face.z - rt.z);
      else p.facing = Math.atan2(face.x - p.x, face.z - p.z);
    }
    arrive(use);
  }
}
