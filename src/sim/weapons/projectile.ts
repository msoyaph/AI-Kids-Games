import { DT } from '../../config/balance';
import { sfxId } from '../../config/sfx';
import { Ev } from '../../core/events';
import { Motion } from '../pools';
import type { WeaponInstance, World } from '../world';
import { nearestEnemy, spawnProjectile } from './common';

const NO_PARAMS: { spread?: number; nova?: number } = {};

/**
 * Straight projectiles. Variants via params:
 *  - default: a staggered volley aimed at the nearest enemy
 *  - spread: all at once in a fan toward the nearest enemy
 *  - nova: all at once evenly around the player (no target needed)
 */
export function projectile(w: World, wi: WeaponInstance): void {
  const s = wi.stats;
  const p = w.player;
  const params = wi.def.params ?? NO_PARAMS;
  const y = p.y + 1.0;

  // staggered volley in progress
  if (wi.burstLeft > 0) {
    wi.burstTimer -= DT;
    if (wi.burstTimer <= 0) {
      wi.burstTimer = 0.08;
      wi.burstLeft--;
      const t = nearestEnemy(w, p.x, p.z, s.range);
      let dx: number, dz: number;
      if (t >= 0) {
        dx = w.enemies.x[t] - p.x;
        dz = w.enemies.z[t] - p.z;
      } else {
        dx = Math.sin(p.yaw);
        dz = Math.cos(p.yaw);
      }
      spawnProjectile(w, wi, s, p.x, y, p.z, dx, dz, Motion.Linear);
    }
  }

  wi.timer -= DT;
  if (wi.timer > 0) return;

  if (params.nova) {
    const n = s.amount;
    const base = w.time * 0.7;
    for (let k = 0; k < n; k++) {
      const a = base + (k / n) * Math.PI * 2;
      spawnProjectile(w, wi, s, p.x, y, p.z, Math.sin(a), Math.cos(a), Motion.Linear);
    }
    wi.timer += s.cooldown;
    w.events.push(Ev.Sfx, p.x, p.y, p.z, 1, 0, 0, sfxId(wi.def.sfx));
    return;
  }

  const t = nearestEnemy(w, p.x, p.z, s.range);
  if (t < 0) {
    wi.timer = 0.1; // nothing in range: check again shortly
    return;
  }
  wi.timer += s.cooldown;
  const dx = w.enemies.x[t] - p.x;
  const dz = w.enemies.z[t] - p.z;
  if (params.spread) {
    const n = s.amount;
    const base = Math.atan2(dx, dz);
    const spread = params.spread * Math.min(1, 0.5 + n * 0.12);
    for (let k = 0; k < n; k++) {
      const a = n === 1 ? base : base - spread / 2 + (spread * k) / (n - 1);
      spawnProjectile(w, wi, s, p.x, y, p.z, Math.sin(a), Math.cos(a), Motion.Linear);
    }
  } else {
    spawnProjectile(w, wi, s, p.x, y, p.z, dx, dz, Motion.Linear);
    wi.burstLeft = s.amount - 1;
    wi.burstTimer = 0.08;
  }
  w.events.push(Ev.Sfx, p.x, p.y, p.z, 1, 0, 0, sfxId(wi.def.sfx));
}
