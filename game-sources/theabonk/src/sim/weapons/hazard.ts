import { DT } from '../../config/balance';
import { sfxId } from '../../config/sfx';
import { Ev } from '../../core/events';
import { Motion } from '../pools';
import type { WeaponInstance, World } from '../world';
import { randomEnemyNear, spawnProjectile } from './common';

const FLIGHT = 0.55;
const GRAV = 26;

/** Lobs seeds that land and become damaging ground patches (see sim/hazards.ts). */
export function hazard(w: World, wi: WeaponInstance): void {
  const s = wi.stats;
  wi.timer -= DT;
  if (wi.timer > 0) return;
  wi.timer += s.cooldown;
  const p = w.player;
  const pr = w.projectiles;
  for (let k = 0; k < s.amount; k++) {
    const t = randomEnemyNear(w, p.x, p.z, s.range);
    let tx: number, tz: number;
    if (t >= 0) {
      tx = w.enemies.x[t] + (w.rng.next() - 0.5) * 2;
      tz = w.enemies.z[t] + (w.rng.next() - 0.5) * 2;
    } else {
      const a = w.rng.next() * Math.PI * 2;
      const d = 3 + w.rng.next() * s.range * 0.6;
      tx = p.x + Math.sin(a) * d;
      tz = p.z + Math.cos(a) * d;
    }
    const y0 = p.y + 1.2;
    const i = spawnProjectile(w, wi, s, p.x, y0, p.z, tx - p.x, tz - p.z, Motion.Arc);
    if (i < 0) break;
    // ballistic arc that lands at (tx, tz) after FLIGHT seconds
    const flight = FLIGHT * (0.85 + w.rng.next() * 0.3);
    pr.vx[i] = (tx - p.x) / flight;
    pr.vz[i] = (tz - p.z) / flight;
    const gy = w.terrain.height(tx, tz);
    pr.vy[i] = (gy - y0 + 0.5 * GRAV * flight * flight) / flight;
    pr.life[i] = pr.maxLife[i] = flight;
    pr.a0[i] = s.duration; // patch lifetime
    pr.a1[i] = s.area;
    pr.a2[i] = s.hitInterval;
  }
  w.events.push(Ev.Sfx, p.x, p.y, p.z, 1, 0, 0, sfxId(wi.def.sfx));
}

export const ARC_GRAVITY = GRAV;
