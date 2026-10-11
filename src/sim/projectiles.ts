import { DT, WEAPON_SLOTS } from '../config/balance';
import { ENEMIES } from '../config/enemies';
import { Ev } from '../core/events';
import { damageArea, hitEnemy } from './combat';
import { HazardKind, Motion } from './pools';
import { ARC_GRAVITY } from './weapons/hazard';
import type { World } from './world';

const HEIGHTS = Float32Array.from(ENEMIES.map((d) => d.height));

function landSeed(w: World, i: number): void {
  const pr = w.projectiles;
  const hz = w.hazards;
  const h = hz.alloc();
  if (h < 0) return;
  hz.kind[h] = HazardKind.Fire;
  hz.x[h] = pr.x[i];
  hz.z[h] = pr.z[i];
  hz.y[h] = w.terrain.height(pr.x[i], pr.z[i]);
  hz.radius[h] = pr.a1[i];
  hz.damage[h] = pr.damage[i];
  hz.tick[h] = pr.a2[i];
  hz.tickT[h] = 0;
  hz.life[h] = hz.maxLife[h] = pr.a0[i];
  hz.slot[h] = pr.slot[i];
  hz.slow[h] = pr.slow[i];
  hz.a1[h] = pr.crit[i];
  const wi = w.weapons[pr.slot[i]];
  hz.color[h] = wi ? wi.def.visual.color : 0xff5a2a;
  w.events.push(Ev.Ring, hz.x[h], hz.y[h], hz.z[h], hz.radius[h], 0, 0, hz.color[h]);
}

export function updateProjectiles(w: World): void {
  const pr = w.projectiles;
  const e = w.enemies;
  const p = w.player;
  const t = w.terrain;
  const buf = w.scratch;
  const time = w.time;
  for (let i = 0; i < pr.count; i++) {
    if (!pr.alive[i]) continue;
    pr.px[i] = pr.x[i];
    pr.py[i] = pr.y[i];
    pr.pz[i] = pr.z[i];
    pr.life[i] -= DT;
    const motion = pr.motion[i];
    if (pr.life[i] <= 0) {
      if (motion === Motion.Arc) landSeed(w, i);
      pr.alive[i] = 0;
      continue;
    }
    switch (motion) {
      case Motion.Linear: {
        pr.x[i] += pr.vx[i] * DT;
        pr.z[i] += pr.vz[i] * DT;
        const gy = t.height(pr.x[i], pr.z[i]) + 0.9;
        if (pr.y[i] < gy) pr.y[i] += (gy - pr.y[i]) * 0.5;
        else pr.y[i] += (gy - pr.y[i]) * 0.05;
        break;
      }
      case Motion.Orbit: {
        // a3 = age (life may be "infinite" for permanent orbits, so it can't be derived)
        const age = (pr.a3[i] += DT);
        const a = pr.a0[i] + pr.a2[i] * age;
        // ease the radius in on spawn
        const r = pr.a1[i] * Math.min(1, age * 5);
        pr.x[i] = p.x + Math.sin(a) * r;
        pr.z[i] = p.z + Math.cos(a) * r;
        pr.y[i] = p.y + 1.0 + Math.sin(age * 4 + pr.a0[i]) * 0.2;
        // snap prev on the first frame so it doesn't streak from the player
        if (age <= DT * 1.5) {
          pr.px[i] = pr.x[i];
          pr.py[i] = pr.y[i];
          pr.pz[i] = pr.z[i];
        }
        break;
      }
      case Motion.Boomerang: {
        pr.a0[i] += DT;
        const half = pr.maxLife[i] * 0.5;
        const el = pr.a0[i];
        if (el < half) {
          const f = 1 - el / half;
          const sp = pr.speed[i] * f;
          pr.x[i] += pr.a1[i] * sp * DT;
          pr.z[i] += pr.a2[i] * sp * DT;
        } else {
          const dx = p.x - pr.x[i];
          const dz = p.z - pr.z[i];
          const d = Math.hypot(dx, dz) || 0.001;
          const sp = pr.speed[i] * Math.min(1.6, (el - half) / half + 0.3) + Math.hypot(p.vx, p.vz);
          const st = Math.min(d, sp * DT);
          pr.x[i] += (dx / d) * st;
          pr.z[i] += (dz / d) * st;
          if (d < 1.2) {
            pr.alive[i] = 0;
            continue;
          }
        }
        pr.y[i] += (t.height(pr.x[i], pr.z[i]) + 1.0 - pr.y[i]) * 0.3;
        break;
      }
      case Motion.Homing: {
        let ti = pr.targetHint[i];
        if (ti < 0 || ti >= e.count || !e.alive[ti] || e.uid[ti] !== pr.target[i]) {
          ti = e.findUid(pr.target[i], ti);
          if (ti < 0 && (w.tick + i) % 6 === 0) {
            // re-acquire the nearest enemy to the bee
            const n = w.grid.query(pr.x[i], pr.z[i], 16, buf);
            let best = -1;
            let bd = 256;
            for (let k = 0; k < n; k++) {
              const j = buf[k];
              if (!e.alive[j]) continue;
              const dx = e.x[j] - pr.x[i];
              const dz = e.z[j] - pr.z[i];
              const d2 = dx * dx + dz * dz;
              if (d2 < bd) {
                bd = d2;
                best = j;
              }
            }
            ti = best;
            if (best >= 0) pr.target[i] = e.uid[best];
          }
          pr.targetHint[i] = ti;
        }
        const sp = pr.speed[i];
        if (ti >= 0) {
          const dx = e.x[ti] - pr.x[i];
          const dz = e.z[ti] - pr.z[i];
          const want = Math.atan2(dx, dz);
          const cur = Math.atan2(pr.vx[i], pr.vz[i]);
          let d = want - cur;
          if (d > Math.PI) d -= Math.PI * 2;
          else if (d < -Math.PI) d += Math.PI * 2;
          const turn = Math.max(-pr.a0[i] * DT, Math.min(pr.a0[i] * DT, d));
          const na = cur + turn;
          pr.vx[i] = Math.sin(na) * sp;
          pr.vz[i] = Math.cos(na) * sp;
        }
        pr.x[i] += pr.vx[i] * DT;
        pr.z[i] += pr.vz[i] * DT;
        pr.y[i] += (t.height(pr.x[i], pr.z[i]) + 1.2 - pr.y[i]) * 0.15;
        break;
      }
      case Motion.Arc: {
        pr.vy[i] -= ARC_GRAVITY * DT;
        pr.x[i] += pr.vx[i] * DT;
        pr.y[i] += pr.vy[i] * DT;
        pr.z[i] += pr.vz[i] * DT;
        continue; // seeds don't collide in flight
      }
    }
    const x = pr.x[i];
    const z = pr.z[i];
    if (x < -t.half || x > t.half || z < -t.half || z > t.half) {
      pr.alive[i] = 0;
      continue;
    }
    // ── collisions ──
    const r = pr.radius[i];
    const n = w.grid.query(x, z, r + 3.2, buf);
    const slot = pr.slot[i];
    const immunity = pr.useImmunity[i] === 1;
    const y = pr.y[i];
    for (let k = 0; k < n; k++) {
      const j = buf[k];
      if (!e.alive[j]) continue;
      const dx = e.x[j] - x;
      const dz = e.z[j] - z;
      const rr = r + e.radius[j];
      if (dx * dx + dz * dz > rr * rr) continue;
      const top = e.y[j] + HEIGHTS[e.type[j]] * e.scale[j] + 0.8;
      if (y < e.y[j] - 0.8 || y > top) continue;
      if (immunity) {
        const o = j * WEAPON_SLOTS + slot;
        if (e.immune[o] > time) continue;
        e.immune[o] = time + pr.hitInterval[i];
      } else {
        if (pr.hasHit(i, e.uid[j])) continue;
        pr.addHit(i, e.uid[j]);
      }
      const kx = motion === Motion.Orbit ? dx : pr.vx[i] || dx;
      const kz = motion === Motion.Orbit ? dz : pr.vz[i] || dz;
      hitEnemy(w, j, pr.damage[i], pr.crit[i], slot, kx, kz, pr.knockback[i], pr.slow[i]);
      if (pr.explode[i] > 0) {
        damageArea(w, x, z, pr.explode[i], pr.damage[i] * 0.5, pr.crit[i], slot, 3);
        w.events.push(Ev.Explosion, x, y, z, pr.explode[i], 0, 0, w.weapons[slot]?.def.visual.color ?? 0xffaa55);
      }
      if (!immunity) {
        pr.pierce[i]--;
        if (pr.pierce[i] < 0) {
          pr.alive[i] = 0;
          break;
        }
      }
    }
  }
}
