import { DROPS, gemTier } from '../config/balance';
import { enemyDamageScaleWith, enemyHpScaleWith } from '../config/tuning';
import { ELITE, ENEMIES, enemyIndex } from '../config/enemies';
import { Ev } from '../core/events';
import { damageAfterArmor, hitDamage, isCrit, knockbackImpulse } from './damage';
import { PickupKind, type PickupKindT } from './pools';
import { goldMult } from './stats';
import type { World } from './world';

// ───────────────────────────── spawning ─────────────────────────────

export function spawnEnemy(w: World, type: number, x: number, z: number, elite = false): number {
  const e = w.enemies;
  if (e.count >= w.maxEnemies) return -1;
  const i = e.alloc();
  if (i < 0) return -1;
  const def = ENEMIES[type];
  const minutes = w.time / 60;
  const boss = def.behavior === 'boss';
  const hpScale = boss ? 1 + w.player.level * 0.03 : enemyHpScaleWith(minutes, w.tuning.combat);
  const hp = def.hp * hpScale * (elite ? ELITE.hpMult : 1);
  const t = w.terrain;
  x = t.clampToMap(x);
  z = t.clampToMap(z);
  const y = t.height(x, z);
  e.type[i] = type;
  e.x[i] = e.px[i] = x;
  e.y[i] = e.py[i] = y;
  e.z[i] = e.pz[i] = z;
  e.hp[i] = e.maxHp[i] = hp;
  e.speed[i] = def.speed * (elite ? ELITE.speedMult : 1) * (0.92 + w.rng.next() * 0.16);
  e.damage[i] = def.damage * (boss ? 1 : enemyDamageScaleWith(minutes, w.tuning.combat)) * (elite ? ELITE.damageMult : 1);
  e.scale[i] = elite ? ELITE.scale : 1;
  e.radius[i] = def.radius * e.scale[i];
  e.xp[i] = def.xp * (elite ? ELITE.xpMult : 1);
  e.elite[i] = elite ? 1 : 0;
  e.yaw[i] = Math.atan2(w.player.x - x, w.player.z - z);
  // desync behaviour timers so groups don't act in lockstep
  e.stT[i] = (def.fireInterval ?? 1) * w.rng.next();
  return i;
}

// ───────────────────────────── drops ─────────────────────────────

export function spawnGem(w: World, x: number, y: number, z: number, value: number): void {
  const g = w.gems;
  if (g.count >= g.cap) {
    // pool full: merge into an existing gem instead of dropping XP
    const j = w.tick % g.count;
    g.value[j] += value;
    g.tier[j] = gemTier(g.value[j]);
    return;
  }
  const i = g.alloc();
  g.x[i] = g.px[i] = x + (w.rng.next() - 0.5) * 0.6;
  g.y[i] = g.py[i] = y + 0.6;
  g.z[i] = g.pz[i] = z + (w.rng.next() - 0.5) * 0.6;
  g.vy[i] = 3 + w.rng.next() * 2;
  g.value[i] = value;
  g.tier[i] = gemTier(value);
}

export function spawnPickup(w: World, kind: PickupKindT, x: number, y: number, z: number, value = 0): number {
  const pk = w.pickups;
  const i = pk.alloc();
  if (i < 0) return -1;
  pk.kind[i] = kind;
  pk.x[i] = pk.px[i] = x;
  pk.y[i] = pk.py[i] = y + 0.8;
  pk.z[i] = pk.pz[i] = z;
  pk.vy[i] = 4;
  pk.value[i] = value;
  return i;
}

// ───────────────────────────── hitting enemies ─────────────────────────────

/**
 * Apply one hit from the player's weapon in `slot` to enemy i.
 * Returns the damage dealt (0 if the enemy was already dead).
 */
export function hitEnemy(
  w: World,
  i: number,
  baseDamage: number,
  critChance: number,
  slot: number,
  dirX: number,
  dirZ: number,
  knockback: number,
  slow = 0,
): number {
  const e = w.enemies;
  if (!e.alive[i]) return 0;
  const crit = isCrit(critChance, w.rng.next());
  const dmg = hitDamage(baseDamage, crit, w.rng.next());
  e.hp[i] -= dmg;
  e.flash[i] = 0.1;
  const def = ENEMIES[e.type[i]];
  if (knockback > 0) {
    const l = Math.hypot(dirX, dirZ);
    if (l > 1e-4) {
      const k = knockbackImpulse(knockback, def.knockbackResist, e.elite[i] === 1) / l;
      e.kx[i] += dirX * k;
      e.kz[i] += dirZ * k;
    }
  }
  if (slow > 0) {
    e.slowT[i] = 1.5;
    if (slow > e.slowAmt[i]) e.slowAmt[i] = slow;
  }
  const wi = w.weapons[slot];
  if (wi) wi.damageDealt += dmg;
  w.events.push(Ev.Damage, e.x[i], e.y[i] + def.height * e.scale[i], e.z[i], dmg, crit ? 1 : 0);
  if (e.hp[i] <= 0) killEnemy(w, i, slot);
  return dmg;
}

/** Damage enemies (not the player) within radius — explosions, bursts. */
export function damageArea(w: World, x: number, z: number, radius: number, damage: number, crit: number, slot: number, knockback: number, slow = 0): number {
  const e = w.enemies;
  const buf = w.areaScratch;
  const n = w.grid.query(x, z, radius + 3.5, buf);
  let hits = 0;
  for (let k = 0; k < n; k++) {
    const i = buf[k];
    if (!e.alive[i]) continue;
    const dx = e.x[i] - x;
    const dz = e.z[i] - z;
    const r = radius + e.radius[i];
    if (dx * dx + dz * dz > r * r) continue;
    hitEnemy(w, i, damage, crit, slot, dx, dz, knockback, slow);
    hits++;
  }
  return hits;
}

export function killEnemy(w: World, i: number, slot: number): void {
  const e = w.enemies;
  if (!e.alive[i]) return;
  e.alive[i] = 0;
  const type = e.type[i];
  const def = ENEMIES[type];
  const x = e.x[i];
  const y = e.y[i];
  const z = e.z[i];
  const elite = e.elite[i] === 1;
  w.stats.kills++;
  const wi = w.weapons[slot];
  if (wi && slot >= 0) wi.kills++;
  w.events.push(Ev.EnemyDie, x, y, z, type, e.scale[i], elite ? 1 : 0);

  if (def.behavior === 'boss') {
    onBossKilled(w, i);
    return;
  }

  spawnGem(w, x, y, z, e.xp[i]);
  const luck = 1 + w.player.stats.luck;
  if (elite) {
    w.stats.elitesKilled++;
    spawnPickup(w, PickupKind.Chest, x, y, z);
    for (let k = 0; k < 4; k++) spawnPickup(w, PickupKind.Coin, x + (w.rng.next() - 0.5) * 2, y, z + (w.rng.next() - 0.5) * 2, Math.round((DROPS.eliteGold / 4) * goldMult(w.player.stats)));
  } else {
    const r = w.rng.next();
    const c = w.tuning.combat;
    if (r < c.magnetChance * luck) spawnPickup(w, PickupKind.Magnet, x, y, z);
    else if (r < (c.magnetChance + c.heartChance) * luck) spawnPickup(w, PickupKind.Heart, x, y, z, c.heartHeal);
    else if (r < (c.magnetChance + c.heartChance + c.coinChance) * luck) spawnPickup(w, PickupKind.Coin, x, y, z, Math.max(1, Math.round(DROPS.coinValue * goldMult(w.player.stats))));
  }

  if (def.splitInto) {
    const child = enemyIndex(def.splitInto);
    const n = def.splitCount ?? 2;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + w.rng.next();
      const c = spawnEnemy(w, child, x + Math.sin(a) * 0.8, z + Math.cos(a) * 0.8, false);
      if (c >= 0) {
        w.enemies.kx[c] = Math.sin(a) * 6;
        w.enemies.kz[c] = Math.cos(a) * 6;
      }
    }
  }
}

/** Hook set by the boss module (avoids an import cycle). */
export let onBossKilled: (w: World, i: number) => void = () => {};
export function setBossKilledHandler(fn: (w: World, i: number) => void): void {
  onBossKilled = fn;
}

// ───────────────────────────── hurting the player ─────────────────────────────

export function damagePlayer(w: World, raw: number): boolean {
  const p = w.player;
  if (!p.alive || p.iframes > 0 || p.buffs.ward > 0 || w.options.god) return false;
  const dmg = damageAfterArmor(raw, p.stats.armor);
  p.hp -= dmg;
  p.iframes = w.tuning.combat.playerIframes;
  p.hurtFlash = 1;
  w.stats.damageTaken += dmg;
  w.events.push(Ev.PlayerHurt, dmg);
  if (p.hp <= 0) {
    if (p.revivals > 0) revivePlayer(w);
    else {
      p.hp = 0;
      p.alive = false;
      w.state = 'dead';
    }
  }
  return true;
}

export function healPlayer(w: World, amount: number): void {
  const p = w.player;
  const before = p.hp;
  p.hp = Math.min(p.stats.maxHp, p.hp + amount);
  if (p.hp - before >= 1) w.events.push(Ev.PlayerHeal, p.hp - before);
}

function revivePlayer(w: World): void {
  const p = w.player;
  p.revivals--;
  p.hp = p.stats.maxHp * 0.5;
  p.iframes = 3;
  w.events.push(Ev.Revive, p.x, p.y, p.z);
  // blast everything nearby away
  const e = w.enemies;
  for (let i = 0; i < e.count; i++) {
    if (!e.alive[i]) continue;
    const dx = e.x[i] - p.x;
    const dz = e.z[i] - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 14 && d > 0.01) {
      e.kx[i] += (dx / d) * 30;
      e.kz[i] += (dz / d) * 30;
      if (ENEMIES[e.type[i]].behavior !== 'boss') {
        e.hp[i] -= e.maxHp[i] * 0.5;
        if (e.hp[i] <= 0) killEnemy(w, i, -1);
      }
    }
  }
}
