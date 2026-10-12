import { DT } from '../../config/balance';
import { sfxId } from '../../config/sfx';
import { Ev } from '../../core/events';
import { Motion } from '../pools';
import type { WeaponInstance, World } from '../world';
import { nearestEnemy, spawnProjectile } from './common';

/** Discs fly out toward a target, decelerate, then home back to the player. */
export function boomerang(w: World, wi: WeaponInstance): void {
  const s = wi.stats;
  const p = w.player;
  if (wi.burstLeft > 0) {
    wi.burstTimer -= DT;
    if (wi.burstTimer <= 0) {
      wi.burstTimer = 0.12;
      throwDisc(w, wi, s.amount - wi.burstLeft);
      wi.burstLeft--;
    }
  }
  wi.timer -= DT;
  if (wi.timer > 0) return;
  if (nearestEnemy(w, p.x, p.z, s.range) < 0) {
    wi.timer = 0.15;
    return;
  }
  wi.timer += s.cooldown;
  throwDisc(w, wi, 0);
  wi.burstLeft = s.amount - 1;
  wi.burstTimer = 0.12;
  w.events.push(Ev.Sfx, p.x, p.y, p.z, 1, 0, 0, sfxId(wi.def.sfx));
}

function throwDisc(w: World, wi: WeaponInstance, k: number): void {
  const s = wi.stats;
  const p = w.player;
  const t = nearestEnemy(w, p.x, p.z, s.range);
  let a = t >= 0 ? Math.atan2(w.enemies.x[t] - p.x, w.enemies.z[t] - p.z) : p.yaw;
  // fan successive discs out
  a += (k % 2 === 0 ? 1 : -1) * Math.ceil(k / 2) * 0.45;
  const i = spawnProjectile(w, wi, s, p.x, p.y + 1, p.z, Math.sin(a), Math.cos(a), Motion.Boomerang);
  if (i >= 0) {
    w.projectiles.a0[i] = 0; // elapsed
    w.projectiles.a1[i] = Math.sin(a);
    w.projectiles.a2[i] = Math.cos(a);
  }
}
