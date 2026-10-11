import { DT } from '../../config/balance';
import { sfxId } from '../../config/sfx';
import { Ev } from '../../core/events';
import { Motion } from '../pools';
import type { WeaponInstance, World } from '../world';
import { randomEnemyNear, spawnProjectile } from './common';

/** Seekers that launch in a spread and steer toward (re-acquired) targets. */
export function homing(w: World, wi: WeaponInstance): void {
  const s = wi.stats;
  wi.timer -= DT;
  if (wi.timer > 0) return;
  const p = w.player;
  if (randomEnemyNear(w, p.x, p.z, s.range) < 0) {
    wi.timer = 0.15;
    return;
  }
  wi.timer += s.cooldown;
  const n = s.amount;
  const pr = w.projectiles;
  for (let k = 0; k < n; k++) {
    const a = p.yaw + Math.PI + (k - (n - 1) / 2) * 0.6;
    const i = spawnProjectile(w, wi, s, p.x, p.y + 1.4, p.z, Math.sin(a), Math.cos(a), Motion.Homing);
    if (i < 0) break;
    const t = randomEnemyNear(w, p.x, p.z, s.range);
    pr.target[i] = t >= 0 ? w.enemies.uid[t] : 0;
    pr.targetHint[i] = t;
    pr.a0[i] = 5 + w.rng.next() * 2; // turn rate
  }
  w.events.push(Ev.Sfx, p.x, p.y, p.z, 1, 0, 0, sfxId(wi.def.sfx));
}
