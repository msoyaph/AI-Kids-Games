import { DT } from '../../config/balance';
import { sfxId } from '../../config/sfx';
import { Ev } from '../../core/events';
import { Motion } from '../pools';
import type { WeaponInstance, World } from '../world';
import { spawnProjectile } from './common';

/** Removes this weapon's orbiting projectiles (used when it levels up / evolves). */
export function clearOrbiters(w: World, slot: number): void {
  const pr = w.projectiles;
  for (let i = 0; i < pr.count; i++) if (pr.alive[i] && pr.slot[i] === slot && pr.motion[i] === Motion.Orbit) pr.alive[i] = 0;
}

/** Orbs circling the player for `duration`, then resting for `cooldown`. */
export function orbit(w: World, wi: WeaponInstance): void {
  const s = wi.stats;
  const permanent = !!wi.def.params?.permanent;
  if (wi.active > 0) {
    wi.active -= DT;
    return;
  }
  wi.timer -= DT;
  if (wi.timer > 0) return;
  const p = w.player;
  const n = s.amount;
  const offset = w.rng.next() * Math.PI * 2;
  for (let k = 0; k < n; k++) {
    const i = spawnProjectile(w, wi, s, p.x, p.y + 1, p.z, 0, 1, Motion.Orbit);
    if (i < 0) break;
    const pr = w.projectiles;
    pr.a0[i] = offset + (k / n) * Math.PI * 2;
    pr.a1[i] = s.area;
    pr.a2[i] = s.speed;
    if (permanent) pr.life[i] = pr.maxLife[i] = 1e6;
  }
  wi.active = permanent ? 1e6 : s.duration;
  wi.timer = s.cooldown;
  w.events.push(Ev.Sfx, p.x, p.y, p.z, 1, 0, 0, sfxId(wi.def.sfx));
}
