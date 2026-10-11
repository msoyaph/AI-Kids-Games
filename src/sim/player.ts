// Player movement with circle-vs-tile collision, ramps and ladders.
import { approachAngle, clamp, damp } from '../core/math';
import type { PlayerState } from './state';
import type { World } from './world';

export const PLAYER_R = 0.28;
export const WALK_SPEED = 3.7;
export const RUN_SPEED = 6.6;
export const SNEAK_SPEED = 1.2;

export interface Motion {
  vx: number;
  vz: number;
  speed: number;
  running: boolean;
  /** distance walked (for footstep cadence / stats) */
  odometer: number;
}

export function newMotion(): Motion {
  return { vx: 0, vz: 0, speed: 0, running: false, odometer: 0 };
}

export interface MoveIntent {
  x: number;
  z: number;
  run: boolean;
  sneak?: boolean;
}

export function facingVec(f: number): [number, number] {
  return [Math.sin(f), Math.cos(f)];
}

export function tileOf(world: World, x: number, z: number): number {
  return world.idx(clamp(Math.floor(x), 0, world.size - 1), clamp(Math.floor(z), 0, world.size - 1));
}

/** Tile directly in front of the player. */
export function frontTile(world: World, p: PlayerState, reach = 0.85): number {
  const [fx, fz] = facingVec(p.facing);
  // snap to the dominant axis so "in front" feels like a grid neighbour
  let dx = 0, dz = 0;
  if (Math.abs(fx) > Math.abs(fz) * 0.6) dx = Math.sign(fx);
  if (Math.abs(fz) > Math.abs(fx) * 0.6) dz = Math.sign(fz);
  const cx = Math.floor(p.x), cz = Math.floor(p.z);
  let tx = Math.floor(p.x + fx * reach), tz = Math.floor(p.z + fz * reach);
  if (tx === cx && tz === cz) {
    tx = cx + dx;
    tz = cz + dz;
  }
  return world.idx(clamp(tx, 0, world.size - 1), clamp(tz, 0, world.size - 1));
}

/** Move a circle through the tile world, sliding along blocked tiles. */
export function moveCircle(world: World, pos: { x: number; z: number }, dx: number, dz: number, r = PLAYER_R): void {
  const dist = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(dist / 0.15));
  for (let s = 0; s < steps; s++) {
    const from = tileOf(world, pos.x, pos.z);
    let nx = pos.x + dx / steps;
    let nz = pos.z + dz / steps;
    for (let it = 0; it < 3; it++) {
      let pushed = false;
      const x0 = Math.floor(nx - r), x1 = Math.floor(nx + r);
      const z0 = Math.floor(nz - r), z1 = Math.floor(nz + r);
      for (let tz = z0; tz <= z1; tz++) {
        for (let tx = x0; tx <= x1; tx++) {
          const t = world.inb(tx, tz) ? world.idx(tx, tz) : -1;
          if (t === from) continue;
          if (t >= 0 && !world.blocked(from, t)) continue;
          const cx = clamp(nx, tx, tx + 1), cz = clamp(nz, tz, tz + 1);
          const ex = nx - cx, ez = nz - cz;
          const d2 = ex * ex + ez * ez;
          if (d2 >= r * r) continue;
          if (d2 > 1e-10) {
            const d = Math.sqrt(d2);
            nx += (ex / d) * (r - d);
            nz += (ez / d) * (r - d);
          } else {
            nx = pos.x;
            nz = pos.z;
          }
          pushed = true;
        }
      }
      if (!pushed) break;
    }
    pos.x = nx;
    pos.z = nz;
  }
}

export function stepPlayer(world: World, p: PlayerState, m: Motion, intent: MoveIntent, dt: number): void {
  const mag = Math.min(1, Math.hypot(intent.x, intent.z));
  const speed = intent.sneak ? SNEAK_SPEED : intent.run ? RUN_SPEED : WALK_SPEED;
  let tvx = 0, tvz = 0;
  if (mag > 0.12) {
    tvx = (intent.x / Math.max(mag, 1e-6)) * speed * mag;
    tvz = (intent.z / Math.max(mag, 1e-6)) * speed * mag;
    const target = Math.atan2(intent.x, intent.z);
    p.facing = approachAngle(p.facing, target, dt * 14);
  }
  m.vx = damp(m.vx, tvx, 16, dt);
  m.vz = damp(m.vz, tvz, 16, dt);
  const before = { x: p.x, z: p.z };
  moveCircle(world, p, m.vx * dt, m.vz * dt);
  const moved = Math.hypot(p.x - before.x, p.z - before.z);
  m.speed = dt > 0 ? moved / dt : 0;
  m.running = intent.run && m.speed > WALK_SPEED * 0.9;
  m.odometer += moved;
  const t = tileOf(world, p.x, p.z);
  p.level = world.logicalLevel(t);
}

/** Ladder: if facing a cliff one level up/down, return destination tile. */
export function ladderTarget(world: World, p: PlayerState): number | null {
  const from = tileOf(world, p.x, p.z);
  const to = frontTile(world, p, 0.9);
  if (to === from) return null;
  const fx = from % world.size, fz = (from / world.size) | 0;
  const tx = to % world.size, tz = (to / world.size) | 0;
  if (Math.abs(fx - tx) + Math.abs(fz - tz) !== 1) return null;
  const lf = world.logicalLevel(from);
  const lt = world.height(to);
  if (Math.abs(lt - lf) !== 1) return null;
  if (world.structure(to)) return null;
  if (world.isWater(to)) return null;
  const o = world.obj(to);
  if (o && (o.k === 'tree' || o.k === 'pine' || o.k === 'palm' || o.k === 'fruitTree' || o.k === 'rock' || o.k === 'deco' || o.k === 'hole' || o.k === 'sapling')) return null;
  return to;
}
