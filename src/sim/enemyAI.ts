import { DT, MOVE, SPAWN } from '../config/balance';
import { ENEMIES } from '../config/enemies';
import { Ev } from '../core/events';
import { updateBoss } from './bosses';
import { damageArea, damagePlayer, killEnemy } from './combat';
import { placeOffscreen } from './director';
import type { World } from './world';

/** Charger states */
const CH_APPROACH = 0;
const CH_WINDUP = 1;
const CH_DASH = 2;
const CH_RECOVER = 3;
/** Exploder states */
const EX_APPROACH = 0;
const EX_FUSE = 1;

const push = new Float32Array(2);
const bossMove = new Float32Array(2);
const MAX_NEIGHBORS = 10;

// Behaviour ids resolved once (avoid string compares in the hot loop)
const BEHAVIOR_ID: Record<string, number> = { chaser: 0, swarmer: 1, tank: 2, ranged: 3, charger: 4, splitter: 5, exploder: 6, boss: 7 };
const TYPE_BEHAVIOR = new Uint8Array(ENEMIES.map((d) => BEHAVIOR_ID[d.behavior]));
const TYPE_FLYING = new Uint8Array(ENEMIES.map((d) => (d.id === 'gnatlet' || d.id === 'gloamRegent' ? 1 : 0)));

export function fireEnemyShot(w: World, x: number, y: number, z: number, dirX: number, dirZ: number, speed: number, damage: number, visual = 0): void {
  const s = w.enemyShots;
  const i = s.alloc();
  if (i < 0) return;
  const l = Math.hypot(dirX, dirZ) || 1;
  s.x[i] = s.px[i] = x;
  s.y[i] = s.py[i] = y;
  s.z[i] = s.pz[i] = z;
  s.vx[i] = (dirX / l) * speed;
  s.vz[i] = (dirZ / l) * speed;
  s.life[i] = 6;
  s.damage[i] = damage;
  s.radius[i] = 0.45;
  s.visual[i] = visual;
}

export function updateEnemies(w: World): void {
  const e = w.enemies;
  const p = w.player;
  const t = w.terrain;
  const grid = w.grid;
  const cellStart = grid.cellStart;
  const cellItems = grid.items;
  const gInv = grid.inv;
  const gHalf = grid.half;
  const gDim = grid.dim;
  const decay = Math.exp(-7 * DT);
  const px = p.x;
  const pz = p.z;

  for (let i = 0; i < e.count; i++) {
    if (!e.alive[i]) continue;
    const type = e.type[i];
    const beh = TYPE_BEHAVIOR[type];
    const def = ENEMIES[type];
    e.age[i] += DT;
    if (e.flash[i] > 0) e.flash[i] -= DT;
    if (e.slowT[i] > 0) {
      e.slowT[i] -= DT;
      if (e.slowT[i] <= 0) e.slowAmt[i] = 0;
    }
    let x = e.x[i];
    let z = e.z[i];
    let dx = px - x;
    let dz = pz - z;
    const dist = Math.sqrt(dx * dx + dz * dz) || 0.001;
    dx /= dist;
    dz /= dist;

    if (beh !== 7 && dist > SPAWN.recycleDist) {
      placeOffscreen(w, i);
      continue;
    }

    const speed = e.speed[i] * (1 - e.slowAmt[i]);
    let mvx = dx * speed;
    let mvz = dz * speed;

    switch (beh) {
      case 1: {
        // swarmer: weaving approach
        const wob = Math.sin(e.age[i] * 3.2 + e.uid[i]) * 0.7;
        const c = Math.cos(wob);
        const s = Math.sin(wob);
        mvx = (dx * c - dz * s) * speed;
        mvz = (dx * s + dz * c) * speed;
        break;
      }
      case 3: {
        // ranged: hold distance, strafe, shoot
        const range = def.range ?? 14;
        const side = e.uid[i] & 1 ? 1 : -1;
        if (dist > range) {
          // approach
        } else if (dist < range * 0.6) {
          mvx = -dx * speed;
          mvz = -dz * speed;
        } else {
          mvx = -dz * side * speed * 0.6;
          mvz = dx * side * speed * 0.6;
        }
        e.stT[i] -= DT;
        if (e.stT[i] <= 0 && dist < range * 1.4) {
          e.stT[i] = (def.fireInterval ?? 3) * (0.8 + w.rng.next() * 0.4);
          // lead the target a little
          const ps = def.projectileSpeed ?? 10;
          const tt = dist / ps;
          const ax = px + p.vx * tt * 0.5 - x;
          const az = pz + p.vz * tt * 0.5 - z;
          fireEnemyShot(w, x, e.y[i] + 1.0 * e.scale[i], z, ax, az, ps, (def.projectileDamage ?? 6) * (e.damage[i] / Math.max(1, def.damage)), 0);
          w.events.push(Ev.EnemyShoot, x, e.y[i] + 1, z);
        }
        break;
      }
      case 4: {
        // charger
        const st = e.state[i];
        if (st === CH_APPROACH) {
          if (dist < (def.range ?? 15)) {
            e.state[i] = CH_WINDUP;
            e.stT[i] = def.windup ?? 0.7;
            e.stA[i] = dx;
            e.stB[i] = dz;
          }
        } else if (st === CH_WINDUP) {
          mvx = mvz = 0;
          // keep tracking during the first half of windup
          if (e.stT[i] > (def.windup ?? 0.7) * 0.5) {
            e.stA[i] = dx;
            e.stB[i] = dz;
          }
          e.stT[i] -= DT;
          if (e.stT[i] <= 0) {
            e.state[i] = CH_DASH;
            e.stT[i] = def.chargeTime ?? 0.7;
          }
        } else if (st === CH_DASH) {
          const cs = (def.chargeSpeed ?? 16) * (1 - e.slowAmt[i] * 0.5);
          mvx = e.stA[i] * cs;
          mvz = e.stB[i] * cs;
          e.stT[i] -= DT;
          if (e.stT[i] <= 0) {
            e.state[i] = CH_RECOVER;
            e.stT[i] = 1.0;
          }
        } else {
          mvx *= 0.3;
          mvz *= 0.3;
          e.stT[i] -= DT;
          if (e.stT[i] <= 0) e.state[i] = CH_APPROACH;
        }
        break;
      }
      case 6: {
        // exploder
        if (e.state[i] === EX_APPROACH) {
          if (dist < (def.range ?? 2.5)) {
            e.state[i] = EX_FUSE;
            e.stT[i] = def.fuse ?? 0.6;
          }
        } else {
          mvx *= 0.25;
          mvz *= 0.25;
          e.stT[i] -= DT;
          if (e.stT[i] <= 0) {
            explode(w, i);
            continue;
          }
        }
        break;
      }
      case 7:
        updateBoss(w, i, dist, dx, dz, bossMove);
        mvx = bossMove[0];
        mvz = bossMove[1];
        break;
      default:
        break;
    }

    // separation from neighbours (soft, capped work per enemy). Grid cells are walked
    // inline with integer math: no calls with double arguments in this hot loop.
    let sx = 0;
    let sz = 0;
    const r = e.radius[i];
    const reach = r + 1.4;
    let cx0 = ((x - reach + gHalf) * gInv) | 0;
    let cx1 = ((x + reach + gHalf) * gInv) | 0;
    let cz0 = ((z - reach + gHalf) * gInv) | 0;
    let cz1 = ((z + reach + gHalf) * gInv) | 0;
    if (cx0 < 0) cx0 = 0;
    if (cz0 < 0) cz0 = 0;
    if (cx1 >= gDim) cx1 = gDim - 1;
    if (cz1 >= gDim) cz1 = gDim - 1;
    let checked = 0;
    const wgt = beh === 7 ? 0.05 : beh === 2 ? 0.5 : 1; // heavier enemies get pushed less
    scan: for (let cz = cz0; cz <= cz1; cz++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const c = cz * gDim + cx;
        const end = cellStart[c + 1];
        for (let k = cellStart[c]; k < end; k++) {
          const j = cellItems[k];
          if (j === i) continue;
          if (++checked > MAX_NEIGHBORS) break scan;
          const ox = x - e.x[j];
          const oz = z - e.z[j];
          const rr = r + e.radius[j];
          const d2 = ox * ox + oz * oz;
          if (d2 < rr * rr && d2 > 1e-6) {
            const d = Math.sqrt(d2);
            const f = ((rr - d) / d) * wgt;
            sx += ox * f;
            sz += oz * f;
          }
        }
      }
    }

    x += (mvx + e.kx[i]) * DT + sx * 0.35;
    z += (mvz + e.kz[i]) * DT + sz * 0.35;
    e.kx[i] *= decay;
    e.kz[i] *= decay;

    if (beh !== 7 && !TYPE_FLYING[type] && t.colliderCellNear(x, z) && t.resolveColliders(x, z, r * 0.8, push)) {
      x = push[0];
      z = push[1];
    }
    const lim = t.half - 2;
    if (x < -lim) x = -lim;
    else if (x > lim) x = lim;
    if (z < -lim) z = -lim;
    else if (z > lim) z = lim;
    e.x[i] = x;
    e.z[i] = z;

    const gy = t.heightAt(x, z);
    const y = e.y[i];
    e.y[i] = gy > y ? y + (gy - y) * 0.35 : y + (gy - y) * 0.25;

    if (mvx * mvx + mvz * mvz > 0.01) {
      const want = Math.atan2(mvx, mvz);
      let d = want - e.yaw[i];
      if (d > Math.PI) d -= Math.PI * 2;
      else if (d < -Math.PI) d += Math.PI * 2;
      e.yaw[i] += d * 0.2;
    }
  }
}

function explode(w: World, i: number): void {
  const e = w.enemies;
  const def = ENEMIES[e.type[i]];
  const x = e.x[i];
  const z = e.z[i];
  const radius = (def.explodeRadius ?? 3) * e.scale[i];
  const p = w.player;
  const dist = Math.hypot(p.x - x, p.z - z);
  if (dist < radius + MOVE.radius && p.y - e.y[i] < 2.5) damagePlayer(w, (def.explodeDamage ?? 15) * (e.damage[i] > 0 ? 1 : 1));
  w.events.push(Ev.Explosion, x, e.y[i] + 0.6, z, radius, 0, 0xff8a3d);
  e.alive[i] = 0; // blows itself up: no XP
  // the blast hurts other Gloom too
  damageArea(w, x, z, radius, (def.explodeDamage ?? 15) * 2.5, 0, -1, 10);
}

/** Contact damage: the strongest touching enemy hits the player (once per i-frame window). */
export function enemyContacts(w: World): void {
  const p = w.player;
  if (!p.alive || p.iframes > 0) return;
  const e = w.enemies;
  const buf = w.scratch2;
  const n = w.grid.query(p.x, p.z, 5, buf);
  let best = 0;
  for (let k = 0; k < n; k++) {
    const i = buf[k];
    if (!e.alive[i] || e.damage[i] <= 0) continue;
    const def = ENEMIES[e.type[i]];
    const dx = e.x[i] - p.x;
    const dz = e.z[i] - p.z;
    const rr = e.radius[i] + MOVE.radius;
    if (dx * dx + dz * dz > rr * rr) continue;
    // jumping clean over a creature avoids it
    if (p.y > e.y[i] + def.height * e.scale[i] * 0.85) continue;
    // charging rams hit harder
    const mult = TYPE_BEHAVIOR[e.type[i]] === 4 && e.state[i] === CH_DASH ? 1.5 : 1;
    if (e.damage[i] * mult > best) best = e.damage[i] * mult;
  }
  if (best > 0) damagePlayer(w, best);
}

export function updateEnemyShots(w: World): void {
  const s = w.enemyShots;
  const p = w.player;
  const t = w.terrain;
  for (let i = 0; i < s.count; i++) {
    if (!s.alive[i]) continue;
    s.life[i] -= DT;
    if (s.life[i] <= 0) {
      s.alive[i] = 0;
      continue;
    }
    const x = (s.x[i] += s.vx[i] * DT);
    const z = (s.z[i] += s.vz[i] * DT);
    // shots skim the terrain at a fixed height (so you can hop over them)
    const gy = t.heightAt(x, z);
    s.y[i] += (gy + 1.0 - s.y[i]) * 0.2;
    if (Math.abs(x) > t.half || Math.abs(z) > t.half) {
      s.alive[i] = 0;
      continue;
    }
    const dx = x - p.x;
    const dz = z - p.z;
    const rr = s.radius[i] + MOVE.radius;
    if (dx * dx + dz * dz < rr * rr && Math.abs(s.y[i] - (p.y + 0.9)) < 1.1) {
      if (damagePlayer(w, s.damage[i]) || w.options.god) s.alive[i] = 0;
    }
  }
}

/** Safety net: anything whose HP was drained outside hitEnemy still dies properly. */
export function killDepleted(w: World): void {
  const e = w.enemies;
  for (let i = 0; i < e.count; i++) {
    if (e.alive[i] && e.hp[i] <= 0) killEnemy(w, i, -1);
  }
}
