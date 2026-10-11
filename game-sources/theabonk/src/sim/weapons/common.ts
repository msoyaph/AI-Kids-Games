import type { ProjectileVisual, WeaponStats } from '../../config/types';
import { Motion } from '../pools';
import type { WeaponInstance, World } from '../world';

export const VISUAL_INDEX: Record<ProjectileVisual, number> = {
  none: 0,
  dart: 1,
  lantern: 2,
  disc: 3,
  bee: 4,
  shard: 5,
  seed: 6,
  enemyOrb: 7,
  enemySpore: 8,
};
export const VISUALS: ProjectileVisual[] = ['none', 'dart', 'lantern', 'disc', 'bee', 'shard', 'seed', 'enemyOrb', 'enemySpore'];

let current: World | null = null;
/** Accept predicate for SpatialHash.nearest (bound once, no per-call closures). */
export const aliveAccept = (i: number): boolean => current!.enemies.alive[i] === 1;

export function bindWorld(w: World): void {
  current = w;
}

export function nearestEnemy(w: World, x: number, z: number, range: number): number {
  current = w;
  return w.grid.nearest(x, z, range, w.enemies.x, w.enemies.z, aliveAccept);
}

/** Random alive enemy within range of (x, z); -1 if none. */
export function randomEnemyNear(w: World, x: number, z: number, range: number): number {
  const buf = w.scratch;
  const n = w.grid.query(x, z, range, buf);
  if (n === 0) return -1;
  const e = w.enemies;
  const r2 = range * range;
  // a few random probes, then a linear fallback
  for (let tries = 0; tries < 8; tries++) {
    const i = buf[w.rng.int(n)];
    const dx = e.x[i] - x;
    const dz = e.z[i] - z;
    if (e.alive[i] && dx * dx + dz * dz <= r2) return i;
  }
  for (let k = 0; k < n; k++) {
    const i = buf[k];
    const dx = e.x[i] - x;
    const dz = e.z[i] - z;
    if (e.alive[i] && dx * dx + dz * dz <= r2) return i;
  }
  return -1;
}

export function spawnProjectile(
  w: World,
  wi: WeaponInstance,
  s: WeaponStats,
  x: number,
  y: number,
  z: number,
  dirX: number,
  dirZ: number,
  motion: number,
): number {
  const p = w.projectiles;
  const i = p.alloc();
  if (i < 0) return -1;
  const l = Math.hypot(dirX, dirZ) || 1;
  p.x[i] = p.px[i] = x;
  p.y[i] = p.py[i] = y;
  p.z[i] = p.pz[i] = z;
  p.vx[i] = (dirX / l) * s.speed;
  p.vz[i] = (dirZ / l) * s.speed;
  p.speed[i] = s.speed;
  p.life[i] = p.maxLife[i] = s.duration;
  p.damage[i] = s.damage;
  // projectile size grows with the area bonus relative to the weapon's base area
  const areaK = Math.min(1.8, s.area / Math.max(0.01, wi.def.base.area));
  const base = motion === Motion.Orbit ? 0.6 : motion === Motion.Boomerang ? 0.6 : 0.4;
  p.radius[i] = base * areaK * (wi.def.visual.scale ?? 1);
  p.knockback[i] = s.knockback;
  p.hitInterval[i] = s.hitInterval;
  p.pierce[i] = s.pierce;
  p.slow[i] = s.slow;
  p.explode[i] = s.explode;
  p.crit[i] = s.crit;
  p.slot[i] = wi.slot;
  p.visual[i] = VISUAL_INDEX[wi.def.visual.kind];
  p.motion[i] = motion;
  p.useImmunity[i] = motion === Motion.Orbit || motion === Motion.Boomerang ? 1 : 0;
  return i;
}
