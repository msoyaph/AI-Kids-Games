import { DT } from '../../config/balance';
import { sfxId } from '../../config/sfx';
import { Ev } from '../../core/events';
import { HazardKind } from '../pools';
import type { WeaponInstance, World } from '../world';
import { randomEnemyNear } from './common';

/** Area burst: a short telegraph, then an explosion under a random nearby enemy. */
export function burst(w: World, wi: WeaponInstance): void {
  const s = wi.stats;
  if (wi.burstLeft > 0) {
    wi.burstTimer -= DT;
    if (wi.burstTimer <= 0) {
      wi.burstLeft--;
      wi.burstTimer = 0.14;
      dropBurst(w, wi);
    }
  }
  wi.timer -= DT;
  if (wi.timer > 0) return;
  const p = w.player;
  if (randomEnemyNear(w, p.x, p.z, s.range) < 0) {
    wi.timer = 0.15;
    return;
  }
  wi.timer += s.cooldown;
  dropBurst(w, wi);
  wi.burstLeft = s.amount - 1;
  wi.burstTimer = 0.14;
}

function dropBurst(w: World, wi: WeaponInstance): void {
  const s = wi.stats;
  const p = w.player;
  const t = randomEnemyNear(w, p.x, p.z, s.range);
  let x: number, z: number;
  if (t >= 0) {
    x = w.enemies.x[t];
    z = w.enemies.z[t];
  } else {
    const a = w.rng.next() * Math.PI * 2;
    x = p.x + Math.sin(a) * s.range * 0.5;
    z = p.z + Math.cos(a) * s.range * 0.5;
  }
  const hz = w.hazards;
  const i = hz.alloc();
  if (i < 0) return;
  hz.kind[i] = HazardKind.Burst;
  hz.x[i] = x;
  hz.z[i] = z;
  hz.y[i] = w.terrain.height(x, z);
  hz.radius[i] = s.area;
  hz.damage[i] = s.damage;
  hz.knockback[i] = s.knockback;
  hz.slot[i] = wi.slot;
  hz.a0[i] = 0.28; // fuse
  hz.a1[i] = s.crit;
  hz.life[i] = hz.maxLife[i] = 0.3;
  hz.color[i] = wi.def.visual.color;
  w.events.push(Ev.Sfx, x, hz.y[i], z, 0.6, 0, 0, sfxId(wi.def.sfx));
}
