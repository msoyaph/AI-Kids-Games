import { DROPS, DT } from '../config/balance';
import { ENEMIES, enemyIndex } from '../config/enemies';
import { sfxId } from '../config/sfx';
import { BANNER } from '../config/waves';
import { Ev } from '../core/events';
import { setBossKilledHandler, spawnEnemy, spawnGem, spawnPickup } from './combat';
import { fireEnemyShot } from './enemyAI';
import { spawnEnemyHazard } from './hazards';
import { HazardKind, PickupKind } from './pools';
import { goldMult } from './stats';
import type { World } from './world';

/**
 * Boss pattern state machines. Each boss uses the enemy pool's scratch fields:
 *   state = current action, stT = action timer, stA/stB = locked direction,
 *   stC = cycle counter.
 */

const IDLE = 0;
const WINDUP = 1;
const DASH = 2;
const RECOVER = 3;
const BARRAGE = 4;
const SLAM = 5;

export function spawnBoss(w: World, type: number): void {
  const p = w.player;
  const a = w.rng.next() * Math.PI * 2;
  const i = spawnEnemy(w, type, p.x + Math.sin(a) * 30, p.z + Math.cos(a) * 30);
  if (i < 0) return;
  const e = w.enemies;
  e.state[i] = IDLE;
  e.stT[i] = 3;
  e.stC[i] = 0;
  w.director.bossUid = e.uid[i];
  w.director.bossType = type;
  w.director.bossMaxHp = e.maxHp[i];
  w.events.push(Ev.BossSpawn, e.x[i], e.y[i], e.z[i], 0, 0, 0, type);
  w.events.push(Ev.Sfx, e.x[i], e.y[i], e.z[i], 1, 0, 0, sfxId('roar'));
}

function summon(w: World, i: number, id: string, count: number, radius: number): void {
  const e = w.enemies;
  const t = enemyIndex(id);
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2 + w.rng.next();
    spawnEnemy(w, t, e.x[i] + Math.sin(a) * radius, e.z[i] + Math.cos(a) * radius);
  }
}

function ring(w: World, i: number, n: number, speed: number, damage: number, offset: number, visual: number): void {
  const e = w.enemies;
  const y = e.y[i] + 2;
  for (let k = 0; k < n; k++) {
    const a = offset + (k / n) * Math.PI * 2;
    fireEnemyShot(w, e.x[i], y, e.z[i], Math.sin(a), Math.cos(a), speed, damage, visual);
  }
  w.events.push(Ev.Sfx, e.x[i], y, e.z[i], 1, 0, 0, sfxId('spores'));
}

function shockwave(w: World, x: number, z: number, maxR: number, speed: number, damage: number): void {
  spawnEnemyHazard(w, HazardKind.EnemyRing, x, z, maxR, damage, maxR / speed + 0.1, 0.5, speed, 0xff4f6a);
  w.events.push(Ev.Sfx, x, w.terrain.height(x, z), z, 1, 0, 0, sfxId('slam'));
}

function slam(w: World, x: number, z: number, r: number, damage: number, fuse: number): void {
  spawnEnemyHazard(w, HazardKind.EnemySlam, x, z, r, damage, fuse + 0.05, fuse, 0, 0xff3b4f);
}

/** Writes the boss's desired velocity into out. */
export function updateBoss(w: World, i: number, dist: number, dx: number, dz: number, out: Float32Array): void {
  const e = w.enemies;
  const def = ENEMIES[e.type[i]];
  const hpFrac = e.hp[i] / e.maxHp[i];
  const speed = e.speed[i] * (1 - e.slowAmt[i] * 0.5);
  out[0] = dx * speed;
  out[1] = dz * speed;
  e.stT[i] -= DT;
  switch (def.bossPattern) {
    case 'grumblecap':
      grumblecap(w, i, dist, hpFrac, out);
      break;
    case 'clockjaw':
      clockjaw(w, i, dist, dx, dz, hpFrac, out);
      break;
    case 'regent':
      regent(w, i, dist, dx, dz, hpFrac, out);
      break;
  }
}

function grumblecap(w: World, i: number, dist: number, hpFrac: number, out: Float32Array): void {
  const e = w.enemies;
  const def = ENEMIES[e.type[i]];
  const enraged = hpFrac < 0.5;
  const dmg = def.projectileDamage ?? 12;
  if (e.state[i] === SLAM) {
    out[0] = out[1] = 0;
    if (e.stT[i] <= 0) {
      e.state[i] = IDLE;
      e.stT[i] = enraged ? 1.6 : 2.4;
    }
    return;
  }
  if (e.stT[i] > 0) return;
  const c = e.stC[i]++;
  if (dist < 9) {
    // stomp: telegraphed slam around itself
    slam(w, e.x[i], e.z[i], 7, def.damage, 0.9);
    e.state[i] = SLAM;
    e.stT[i] = 1.0;
  } else if (c % 3 === 2) {
    summon(w, i, enraged ? 'blobbin' : 'gnatlet', enraged ? 5 : 8, 4);
    e.stT[i] = 2.5;
  } else {
    ring(w, i, enraged ? 20 : 14, def.projectileSpeed ?? 10, dmg, c * 0.3, 1);
    if (enraged) ring(w, i, 20, (def.projectileSpeed ?? 10) * 0.7, dmg, c * 0.3 + 0.16, 1);
    e.stT[i] = enraged ? 2.4 : 3.4;
  }
}

function clockjaw(w: World, i: number, dist: number, dx: number, dz: number, hpFrac: number, out: Float32Array): void {
  const e = w.enemies;
  const def = ENEMIES[e.type[i]];
  const enraged = hpFrac < 0.4;
  switch (e.state[i]) {
    case IDLE:
      if (e.stT[i] <= 0 && dist < 34) {
        e.state[i] = WINDUP;
        e.stT[i] = def.windup ?? 1;
        e.stA[i] = dx;
        e.stB[i] = dz;
      }
      break;
    case WINDUP:
      out[0] = out[1] = 0;
      if (e.stT[i] > 0.35) {
        e.stA[i] = dx;
        e.stB[i] = dz;
      }
      if (e.stT[i] <= 0) {
        e.state[i] = DASH;
        e.stT[i] = def.chargeTime ?? 1;
      }
      break;
    case DASH: {
      const cs = (def.chargeSpeed ?? 22) * (enraged ? 1.15 : 1);
      out[0] = e.stA[i] * cs;
      out[1] = e.stB[i] * cs;
      if (e.stT[i] <= 0) {
        shockwave(w, e.x[i], e.z[i], enraged ? 26 : 20, enraged ? 14 : 11, def.projectileDamage ?? 20);
        const c = e.stC[i]++;
        if (c % 2 === 1) summon(w, i, 'ramhorn', 3, 5);
        // enraged: chain a second charge immediately
        if (enraged && c % 2 === 0) {
          e.state[i] = WINDUP;
          e.stT[i] = 0.6;
        } else {
          e.state[i] = RECOVER;
          e.stT[i] = 1.4;
        }
      }
      break;
    }
    case RECOVER:
      out[0] *= 0.3;
      out[1] *= 0.3;
      if (e.stT[i] <= 0) {
        e.state[i] = IDLE;
        e.stT[i] = enraged ? 0.8 : 1.6;
      }
      break;
  }
}

function regent(w: World, i: number, dist: number, dx: number, dz: number, hpFrac: number, out: Float32Array): void {
  const e = w.enemies;
  const def = ENEMIES[e.type[i]];
  const phase = hpFrac < 0.33 ? 2 : hpFrac < 0.66 ? 1 : 0;
  const dmg = def.projectileDamage ?? 16;
  const sp = def.projectileSpeed ?? 12;
  // hover at mid range, circling the player
  const want = 13;
  const radial = dist > want + 2 ? 1 : dist < want - 2 ? -1 : 0;
  const s = e.speed[i];
  out[0] = dx * radial * s - dz * s * 0.7;
  out[1] = dz * radial * s + dx * s * 0.7;
  const p = w.player;
  switch (e.state[i]) {
    case BARRAGE:
      out[0] *= 0.3;
      out[1] *= 0.3;
      e.stA[i] -= DT;
      if (e.stA[i] <= 0) {
        e.stA[i] = phase === 2 ? 0.08 : 0.12;
        const a = e.stB[i];
        e.stB[i] += 0.37;
        const arms = phase === 0 ? 2 : 3;
        for (let k = 0; k < arms; k++) {
          const aa = a + (k / arms) * Math.PI * 2;
          fireEnemyShot(w, e.x[i], e.y[i] + 3, e.z[i], Math.sin(aa), Math.cos(aa), sp * 0.8, dmg, 0);
        }
      }
      if (e.stT[i] <= 0) {
        e.state[i] = IDLE;
        e.stT[i] = 1.5 - phase * 0.3;
      }
      return;
    case SLAM:
      out[0] = out[1] = 0;
      if (e.stT[i] <= 0) {
        e.state[i] = IDLE;
        e.stT[i] = 1.2;
      }
      return;
  }
  if (e.stT[i] > 0) return;
  const c = e.stC[i]++ % 4;
  if (c === 0) {
    e.state[i] = BARRAGE;
    e.stT[i] = 3 + phase * 0.5;
    e.stA[i] = 0;
    e.stB[i] = w.rng.next() * Math.PI * 2;
  } else if (c === 1) {
    // blink behind the player and drop slams around them
    const a = Math.atan2(p.x - e.x[i], p.z - e.z[i]);
    e.x[i] = e.px[i] = w.terrain.clampToMap(p.x + Math.sin(a) * 10);
    e.z[i] = e.pz[i] = w.terrain.clampToMap(p.z + Math.cos(a) * 10);
    w.events.push(Ev.Explosion, e.x[i], e.y[i] + 3, e.z[i], 4, 0, 0, 0xb48cff);
    const n = 3 + phase;
    for (let k = 0; k < n; k++) {
      const aa = (k / n) * Math.PI * 2 + w.rng.next();
      slam(w, p.x + Math.sin(aa) * 4, p.z + Math.cos(aa) * 4, 3.4, dmg * 1.3, 1.1);
    }
    slam(w, p.x, p.z, 3, dmg * 1.3, 1.3);
    e.state[i] = SLAM;
    e.stT[i] = 1.4;
  } else if (c === 2) {
    const n = 1 + phase;
    for (let k = 0; k < n; k++) {
      // staggered rings: jump each one
      spawnEnemyHazard(w, HazardKind.EnemyRing, e.x[i], e.z[i], 24, dmg, (24 + k * 6) / 12 + 0.2, -k * 6, 12, 0xb48cff);
    }
    w.events.push(Ev.Sfx, e.x[i], e.y[i], e.z[i], 1, 0, 0, sfxId('slam'));
    e.stT[i] = 2.6;
  } else {
    summon(w, i, phase === 2 ? 'fusewick' : 'gloomling', 6 + phase * 2, 5);
    ring(w, i, 16 + phase * 4, sp, dmg, 0, 0);
    e.stT[i] = 2.2;
  }
}

setBossKilledHandler((w, i) => {
  const e = w.enemies;
  const type = e.type[i];
  const def = ENEMIES[type];
  const x = e.x[i];
  const y = e.y[i];
  const z = e.z[i];
  if (w.director.bossUid === e.uid[i]) w.director.bossUid = 0;
  w.stats.bossKills[def.id] = (w.stats.bossKills[def.id] ?? 0) + 1;
  w.events.push(Ev.BossDie, x, y, z, 0, 0, 0, type);
  w.events.push(Ev.Sfx, x, y, z, 1, 0, 0, sfxId('explode'));
  // treasure fountain
  for (let k = 0; k < 10; k++) spawnGem(w, x + (w.rng.next() - 0.5) * 6, y, z + (w.rng.next() - 0.5) * 6, e.xp[i] / 10);
  spawnPickup(w, PickupKind.Chest, x, y, z);
  const coins = 12;
  for (let k = 0; k < coins; k++) {
    const a = (k / coins) * Math.PI * 2;
    const c = spawnPickup(w, PickupKind.Coin, x + Math.sin(a) * 3, y, z + Math.cos(a) * 3, Math.max(1, Math.round((DROPS.bossGold / coins) * goldMult(w.player.stats))));
    if (c >= 0) w.pickups.vy[c] = 8;
  }
  // clear the boss's hazards so the victory moment is clean
  const hz = w.hazards;
  for (let k = 0; k < hz.count; k++) if (hz.kind[k] >= HazardKind.EnemyRing) hz.alive[k] = 0;
  if (def.bossPattern === 'regent') {
    w.director.finalBossDefeated = true;
    w.director.victoryT = 3;
    w.events.push(Ev.Banner, 0, 0, 0, 0, 0, 0, BANNER.regentDown);
  }
});
