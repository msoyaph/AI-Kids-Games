import { DT, PLAYER_RADIUS } from '../config/balance';
import { ELITE, ENEMIES } from '../config/enemies';
import { Ev } from '../core/events';
import { updateBoss } from './bosses';
import { damageArea, damagePlayer, killEnemy } from './combat';
import { placeOffscreen } from './director';
import { UNREACHABLE } from './flowField';
import type { EnemyPool } from './pools';
import { bossSrc, CONTACT_SRC, src, SrcKind } from './sources';
import type { Terrain } from './terrain';
import { HeroPassive, thornshell } from './heroes';
import { gustStrength } from './weather';
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
const fdir = new Float32Array(2);
/** Walker step scratch: candidate x, z in → corrected x, z and ground height out. */
const wpos = new Float64Array(3);
/** Snowball Roller speed factor for this tick (rollerStep → updateEnemies). */
const rollK = new Float64Array(1);
/** Per-type speed multipliers from tuning, refreshed each tick (live panel friendly). */
const speedMul = new Float32Array(ENEMIES.length);
const MAX_NEIGHBORS = 10;

// Behaviour ids resolved once (avoid string compares in the hot loop)
const BEHAVIOR_ID: Record<string, number> = { chaser: 0, swarmer: 1, tank: 2, ranged: 3, charger: 4, splitter: 5, exploder: 6, boss: 7 };
const TYPE_BEHAVIOR = new Uint8Array(ENEMIES.map((d) => BEHAVIOR_ID[d.behavior]));
const TYPE_FLYING = new Uint8Array(ENEMIES.map((d) => (d.flying ? 1 : 0)));
const TYPE_ROLL = new Float32Array(ENEMIES.map((d) => d.roll ?? 0));
const TYPE_SHOT_VISUAL = new Uint8Array(ENEMIES.map((d) => d.shotVisual ?? 0));
/** How much a gust moves each type (bosses stand firm; light flyers get blown about). */
const TYPE_GUST = new Float32Array(ENEMIES.map((d) => (d.behavior === 'boss' ? 0 : d.flying ? 1.2 : 1 - d.knockbackResist * 0.7)));
/** Source code of a boss's charge (contact while dashing counts as the charge attack). */
const TYPE_CHARGE_SRC = Int32Array.from(ENEMIES.map((d) => (d.bossPattern === 'clockjaw' ? bossSrc('clockjaw.charge') : d.bossPattern === 'oldRime' ? bossSrc('oldRime.charge') : 0)));

export function fireEnemyShot(w: World, x: number, y: number, z: number, dirX: number, dirZ: number, speed: number, damage: number, visual = 0, source = 0, inst = 0): void {
  const s = w.enemyShots;
  const i = s.alloc();
  if (i < 0) return;
  s.src[i] = source;
  s.inst[i] = inst;
  const l = Math.hypot(dirX, dirZ) || 1;
  s.x[i] = s.px[i] = x;
  s.y[i] = s.py[i] = y;
  s.z[i] = s.pz[i] = z;
  s.vx[i] = (dirX / l) * speed;
  s.vz[i] = (dirZ / l) * speed;
  s.life[i] = 4;
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
  const tel = w.tuning.telegraphs;
  const recycleDist = w.tuning.spawns.recycleDist;
  const per = w.tuning.enemies.perType;
  const global = w.tuning.enemies.speedMult;
  const dMul = w.mods.enemySpeed;
  for (let t = 0; t < ENEMIES.length; t++) speedMul[t] = global * (per[ENEMIES[t].id] ?? 1) * dMul;
  const px = p.x;
  const pz = p.z;
  const flow = w.flow;
  // ground surfaces (ice / snow) and gusts — both absent on most maps
  const surf = t.surface;
  const sDim = t.hdim;
  const sHalf = t.half + 0.5;
  const decayIce = Math.exp(-2.5 * DT);
  const gk = gustStrength(w) * w.weather.enemyPush * DT;
  const gwx = w.weather.dirX * gk;
  const gwz = w.weather.dirZ * gk;

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

    if (beh !== 7 && dist > recycleDist) {
      placeOffscreen(w, i);
      continue;
    }

    // Walkers follow the flow field around walls; when the straight line is (nearly) the
    // shortest path they just head straight for the player.
    const walker = beh !== 7 && TYPE_FLYING[type] === 0 && !flow.island;
    let pdx = dx;
    let pdz = dz;
    let pathDirect = true;
    if (walker && flow.targetCell >= 0 && flowSteer(w, i)) {
      pdx = fdir[0];
      pdz = fdir[1];
      pathDirect = false;
    }

    let surfMul = 1;
    let kd = decay;
    if (surf !== null && TYPE_FLYING[type] === 0 && beh !== 7) {
      const sk = surf[((z + sHalf) | 0) * sDim + ((x + sHalf) | 0)];
      if (sk === 1) {
        surfMul = 0.9;
        kd = decayIce; // knocked across the ice
      } else if (sk === 2) surfMul = 0.75;
    }
    if (TYPE_ROLL[type] !== 0) rollerStep(e, i, type);

    const speed = e.speed[i] * speedMul[type] * (1 - e.slowAmt[i]) * surfMul;
    let mvx = pdx * speed;
    let mvz = pdz * speed;

    switch (beh) {
      case 1: {
        // swarmer: weaving approach
        const wob = Math.sin(e.age[i] * 3.2 + e.uid[i]) * 0.7;
        const c = Math.cos(wob);
        const s = Math.sin(wob);
        mvx = (pdx * c - pdz * s) * speed;
        mvz = (pdx * s + pdz * c) * speed;
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
          fireEnemyShot(w, x, e.y[i] + 1.0 * e.scale[i], z, ax, az, ps, (def.projectileDamage ?? 6) * (e.damage[i] / Math.max(1, def.damage)), TYPE_SHOT_VISUAL[type], src(SrcKind.Shot, type));
          w.events.push(Ev.EnemyShoot, x, e.y[i] + 1, z);
        }
        break;
      }
      case 4: {
        // charger
        const st = e.state[i];
        if (st === CH_APPROACH) {
          if (pathDirect && dist < (def.range ?? 15)) {
            e.state[i] = CH_WINDUP;
            e.stT[i] = (def.windup ?? 0.7) * tel.chargerWindupMult;
            e.stA[i] = dx;
            e.stB[i] = dz;
          }
        } else if (st === CH_WINDUP) {
          mvx = mvz = 0;
          // keep tracking during the first half of windup
          if (e.stT[i] > (def.windup ?? 0.7) * tel.chargerWindupMult * 0.5) {
            e.stA[i] = dx;
            e.stB[i] = dz;
          }
          e.stT[i] -= DT;
          if (e.stT[i] <= 0) {
            e.state[i] = CH_DASH;
            e.stT[i] = def.chargeTime ?? 0.7;
          }
        } else if (st === CH_DASH) {
          const cs = (def.chargeSpeed ?? 16) * (1 - e.slowAmt[i] * 0.5) * (TYPE_ROLL[type] !== 0 ? rollK[0] : 1);
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
            e.stT[i] = (def.fuse ?? 0.6) * tel.fuseMult;
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
    e.kx[i] *= kd;
    e.kz[i] *= kd;
    if (gwx !== 0 || gwz !== 0) {
      const gf = TYPE_GUST[type];
      x += gwx * gf;
      z += gwz * gf;
    }

    if (beh !== 7 && !TYPE_FLYING[type] && t.colliderCellNear(x, z) && t.resolveColliders(x, z, r * 0.8, push)) {
      x = push[0];
      z = push[1];
    }
    const lim = t.half - 2;
    if (x < -lim) x = -lim;
    else if (x > lim) x = lim;
    if (z < -lim) z = -lim;
    else if (z > lim) z = lim;
    let gy: number;
    if (walker) {
      wpos[0] = x;
      wpos[1] = z;
      walkerStep(t, e, i);
      x = wpos[0];
      z = wpos[1];
      gy = wpos[2];
    } else gy = t.heightAt(x, z);
    e.x[i] = x;
    e.z[i] = z;

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

// The walker helpers below take only integers and objects (doubles travel through typed
// scratch arrays) and stay out of updateEnemies so V8 keeps inlining that loop's own calls
// instead of boxing their double arguments.

/**
 * Flow-field steering for walker slot i: writes the downhill direction to fdir and returns
 * true when the path bends — i.e. it is much longer than the straight line to the player.
 */
function flowSteer(w: World, i: number): boolean {
  const e = w.enemies;
  const x = e.x[i];
  const z = e.z[i];
  const dx = w.player.x - x;
  const dz = w.player.z - z;
  const dist = Math.sqrt(dx * dx + dz * dz) || 0.001;
  const c = w.terrain.cellOf(x, z);
  const cost = w.flow.dist[c];
  return cost !== UNREACHABLE && cost > dist * 2.2 + 3 && w.flow.directionAt(c, fdir);
}

/**
 * Snowball Roller: while rolling it grows (up to def.roll × size) and speeds up; afterwards
 * the extra snow falls off. Writes this tick's speed factor to rollK; stC accumulates the
 * distance rolled (the renderer turns it into spin).
 */
function rollerStep(e: EnemyPool, i: number, type: number): void {
  const def = ENEMIES[type];
  const base = e.elite[i] ? ELITE.scale : 1;
  const st = e.state[i];
  if (st === CH_DASH) {
    const t = Math.min(1, Math.max(0, 1 - e.stT[i] / (def.chargeTime ?? 1)));
    e.scale[i] = base * (1 + ((def.roll ?? 1) - 1) * t);
    rollK[0] = 0.6 + 0.9 * t;
    e.stC[i] += (def.chargeSpeed ?? 10) * rollK[0] * DT;
  } else {
    const s = e.scale[i];
    if (s > base) e.scale[i] = Math.max(base, s - DT * 0.6);
    rollK[0] = 1;
    if (st !== CH_WINDUP) e.stC[i] += e.speed[i] * (st === CH_RECOVER ? 0.3 : 1) * DT;
  }
  e.radius[i] = def.radius * e.scale[i];
}

/**
 * Walls are walls: undo walker slot i's step from its stored position to wpos[0..1] (walk,
 * knockback, dash, crowd push) across a wall, sliding along it when only one axis is
 * blocked. Then writes its level-aware ground height to wpos[2].
 */
function walkerStep(t: Terrain, e: EnemyPool, i: number): void {
  let x = wpos[0];
  let z = wpos[1];
  const ox = e.x[i];
  const oz = e.z[i];
  const c0 = t.cellOf(ox, oz);
  const c1 = t.cellOf(x, z);
  if (c1 !== c0 && !t.canStep(c0, c1)) {
    const cX = t.cellOf(x, oz);
    if (cX === c0 || t.canStep(c0, cX)) {
      z = oz;
      e.kz[i] = 0;
    } else {
      const cZ = t.cellOf(ox, z);
      if (cZ === c0 || t.canStep(c0, cZ)) {
        x = ox;
        e.kx[i] = 0;
      } else {
        x = ox;
        z = oz;
        e.kx[i] = e.kz[i] = 0;
      }
    }
  }
  wpos[0] = x;
  wpos[1] = z;
  wpos[2] = t.heightOnLevel(x, z);
}

function explode(w: World, i: number): void {
  const e = w.enemies;
  const def = ENEMIES[e.type[i]];
  const x = e.x[i];
  const z = e.z[i];
  const radius = (def.explodeRadius ?? 3) * e.scale[i];
  const p = w.player;
  const dist = Math.hypot(p.x - x, p.z - z);
  if (dist < radius + PLAYER_RADIUS && p.y - e.y[i] < 2.5) damagePlayer(w, def.explodeDamage ?? 15, src(SrcKind.Explosion, e.type[i]));
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
  let bestSrc = 0;
  let bestInst = 0;
  let bestI = -1;
  const bowling = p.bowling;
  for (let k = 0; k < n; k++) {
    const i = buf[k];
    if (!e.alive[i] || e.damage[i] <= 0) continue;
    // Ottie bowling through: regular Gloom can't land a hit
    if (bowling && TYPE_BEHAVIOR[e.type[i]] !== 7) continue;
    const def = ENEMIES[e.type[i]];
    const dx = e.x[i] - p.x;
    const dz = e.z[i] - p.z;
    const rr = e.radius[i] + PLAYER_RADIUS;
    if (dx * dx + dz * dz > rr * rr) continue;
    // jumping clean over a creature avoids it
    if (p.y > e.y[i] + def.height * e.scale[i] * 0.85) continue;
    // charging rams hit harder
    const type = e.type[i];
    const mult = TYPE_BEHAVIOR[type] === 4 && e.state[i] === CH_DASH ? 1.3 : 1;
    if (e.damage[i] * mult > best) {
      best = e.damage[i] * mult;
      // a dashing Clockjaw / Old Rime counts as its charge attack
      const chargeSrc = TYPE_CHARGE_SRC[type];
      bestSrc = chargeSrc !== 0 && e.state[i] === 2 ? chargeSrc : CONTACT_SRC[type];
      bestInst = e.atk[i];
      bestI = i;
    }
  }
  if (best > 0 && damagePlayer(w, best, bestSrc, bestInst) && p.passive === HeroPassive.Thornshell) thornshell(w, bestI, best);
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
    const rr = s.radius[i] + PLAYER_RADIUS;
    if (dx * dx + dz * dz < rr * rr && Math.abs(s.y[i] - (p.y + 0.9)) < 1.1) {
      if (damagePlayer(w, s.damage[i], s.src[i], s.inst[i]) || w.options.god) s.alive[i] = 0;
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
