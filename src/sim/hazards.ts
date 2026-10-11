import { DT, PLAYER_RADIUS } from '../config/balance';
import { sfxId } from '../config/sfx';
import { Ev } from '../core/events';
import { damageArea, damagePlayer } from './combat';
import { HazardKind } from './pools';
import type { World } from './world';

/** Impact sound per slam look: boss slam, icicle, ice spike. */
const SLAM_SFX = [sfxId('slam'), sfxId('icicle'), sfxId('shatter')];

export function spawnEnemyHazard(w: World, kind: number, x: number, z: number, radius: number, damage: number, life: number, a0 = 0, a1 = 0, color = 0xff4f6a, source = 0, inst = 0): number {
  const hz = w.hazards;
  const i = hz.alloc();
  if (i < 0) return -1;
  hz.src[i] = source;
  hz.inst[i] = inst;
  hz.kind[i] = kind;
  hz.x[i] = x;
  hz.z[i] = z;
  hz.y[i] = w.terrain.height(x, z);
  hz.radius[i] = radius;
  hz.damage[i] = damage;
  hz.life[i] = hz.maxLife[i] = life;
  hz.a0[i] = a0;
  hz.a1[i] = a1;
  hz.tick[i] = 0.5;
  hz.tickT[i] = 0;
  hz.color[i] = color;
  hz.slot[i] = 255;
  return i;
}

export function updateHazards(w: World): void {
  const hz = w.hazards;
  const p = w.player;
  for (let i = 0; i < hz.count; i++) {
    if (!hz.alive[i]) continue;
    hz.life[i] -= DT;
    const kind = hz.kind[i];
    const x = hz.x[i];
    const z = hz.z[i];
    switch (kind) {
      case HazardKind.Fire:
        hz.tickT[i] -= DT;
        if (hz.tickT[i] <= 0) {
          hz.tickT[i] += hz.tick[i];
          damageArea(w, x, z, hz.radius[i], hz.damage[i], hz.a1[i], hz.slot[i], 0, hz.slow[i]);
        }
        break;
      case HazardKind.Burst:
        hz.a0[i] -= DT;
        if (hz.a0[i] <= 0 && hz.a0[i] > -DT * 1.5) {
          damageArea(w, x, z, hz.radius[i], hz.damage[i], hz.a1[i], hz.slot[i], hz.knockback[i]);
          w.events.push(Ev.Explosion, x, hz.y[i] + 0.5, z, hz.radius[i], 0, 0, hz.color[i]);
          hz.alive[i] = 0;
          continue;
        }
        break;
      case HazardKind.EnemyRing: {
        // expanding shockwave: hurts only grounded players inside the band — jump it!
        hz.a0[i] += hz.a1[i] * DT;
        const d = Math.hypot(p.x - x, p.z - z);
        const grounded = p.y - w.terrain.height(p.x, p.z) < 0.7;
        if (grounded && Math.abs(d - hz.a0[i]) < 0.9 + PLAYER_RADIUS) damagePlayer(w, hz.damage[i], hz.src[i], hz.inst[i]);
        if (hz.a0[i] >= hz.radius[i]) hz.alive[i] = 0;
        break;
      }
      case HazardKind.EnemySlam:
        hz.a0[i] -= DT;
        if (hz.a0[i] <= 0) {
          const d = Math.hypot(p.x - x, p.z - z);
          if (d < hz.radius[i] + PLAYER_RADIUS) damagePlayer(w, hz.damage[i], hz.src[i], hz.inst[i]);
          w.events.push(Ev.Explosion, x, hz.y[i] + 0.3, z, hz.radius[i], 1, 0, hz.color[i]);
          w.events.push(Ev.Sfx, x, hz.y[i], z, 1, 0, 0, SLAM_SFX[hz.a1[i]] ?? SLAM_SFX[0]);
          hz.alive[i] = 0;
          continue;
        }
        break;
      case HazardKind.EnemyPuddle: {
        hz.tickT[i] -= DT;
        if (hz.tickT[i] <= 0) {
          hz.tickT[i] += hz.tick[i];
          const d = Math.hypot(p.x - x, p.z - z);
          if (d < hz.radius[i] && p.y - hz.y[i] < 1) damagePlayer(w, hz.damage[i], hz.src[i], hz.inst[i]);
        }
        break;
      }
    }
    if (hz.life[i] <= 0) hz.alive[i] = 0;
  }
}
