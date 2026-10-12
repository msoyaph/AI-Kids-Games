import { ENEMIES } from '../config/enemies';
import { EVOLUTIONS } from '../config/passives';
import { Rng } from '../core/rng';
import { HazardKind, PickupKind } from './pools';
import type { SimInput, UpgradeChoice, World } from './world';

/**
 * Heuristic AI player used for headless balance simulations and tests.
 * `skill` (0..1) controls reaction quality: lower skill reacts later, ignores more
 * threats and makes noisier upgrade decisions.
 */
export class Bot {
  private rng: Rng;
  private jitterA = 0;
  private decideT = 0;
  private mx = 0;
  private mz = 0;
  private wantJump = false;
  private stuckT = 0;
  private unstickT = 0;
  private lastX = 0;
  private lastZ = 0;
  private unstickA = 0;

  constructor(
    seed: number,
    readonly skill = 0.7,
  ) {
    this.rng = new Rng(seed ^ 0xb07);
  }

  decide(w: World, out: SimInput): void {
    // re-plan at a human-ish cadence; worse players react slower
    this.decideT -= 1 / 60;
    if (this.decideT <= 0 || this.ringNear(w)) {
      this.decideT = 0.05 + (1 - this.skill) * 0.25;
      this.plan(w);
    }
    // stuck against a cliff or tree? pick a fresh direction for a moment (a person would)
    const p = w.player;
    if (this.unstickT > 0) {
      this.unstickT -= 1 / 60;
      this.mx = Math.sin(this.unstickA);
      this.mz = Math.cos(this.unstickA);
    } else {
      const moved = Math.hypot(p.x - this.lastX, p.z - this.lastZ);
      this.stuckT = moved < 0.04 ? this.stuckT + 1 / 60 : 0;
      if (this.stuckT > 0.4) {
        this.stuckT = 0;
        this.unstickT = 0.8;
        this.unstickA = Math.atan2(this.mx, this.mz) + (this.rng.next() < 0.5 ? 1 : -1) * (1.2 + this.rng.next());
        this.wantJump = true;
      }
    }
    this.lastX = p.x;
    this.lastZ = p.z;
    out.moveX = this.mx;
    out.moveZ = this.mz;
    out.jump = this.wantJump;
    this.wantJump = false;
    out.slide = false;
  }

  private ringNear(w: World): boolean {
    const hz = w.hazards;
    const p = w.player;
    for (let i = 0; i < hz.count; i++) {
      if (hz.kind[i] !== HazardKind.EnemyRing) continue;
      const d = Math.hypot(p.x - hz.x[i], p.z - hz.z[i]);
      if (d > hz.a0[i] && d - hz.a0[i] < 4) return true;
    }
    return false;
  }

  private plan(w: World): void {
    const p = w.player;
    const e = w.enemies;
    let rx = 0;
    let rz = 0;
    let threat = 0;
    let closest = Infinity;
    const awareness = 8 + this.skill * 8;
    for (let i = 0; i < e.count; i++) {
      if (!e.alive[i]) continue;
      const dx = p.x - e.x[i];
      const dz = p.z - e.z[i];
      const d2 = dx * dx + dz * dz;
      if (d2 > awareness * awareness) continue;
      const d = Math.sqrt(d2) || 0.01;
      const edgeD = Math.max(0.3, d - e.radius[i]);
      if (edgeD < closest) closest = edgeD;
      const def = ENEMIES[e.type[i]];
      const charging = (def.behavior === 'charger' || def.bossPattern === 'clockjaw') && (e.state[i] === 1 || e.state[i] === 2);
      if (charging && edgeD < 18 && this.rng.next() < this.skill) {
        // sidestep out of the telegraphed charge line
        const lx = e.stA[i];
        const lz = e.stB[i];
        const side = dx * lz - dz * lx >= 0 ? 1 : -1;
        const along = -(dx * lx + dz * lz) / d; // >0 when we are in front of it
        if (along > 0.3) {
          const k = 3 / Math.max(1, edgeD * 0.5);
          rx += -lz * side * k;
          rz += lx * side * k;
          threat += k * 0.5;
        }
      }
      const danger = (def.behavior === 'boss' ? 6 : 1) * (e.state[i] === 2 && def.behavior === 'charger' ? 3 : 1);
      const wgt = danger / (edgeD * edgeD);
      rx += (dx / d) * wgt;
      rz += (dz / d) * wgt;
      threat += wgt;
    }
    // hostile projectiles: predict the closest approach and sidestep (or hop) incoming ones
    const s = w.enemyShots;
    for (let i = 0; i < s.count; i++) {
      const rx0 = p.x - s.x[i];
      const rz0 = p.z - s.z[i];
      const d2 = rx0 * rx0 + rz0 * rz0;
      if (d2 > 225) continue;
      const vx = s.vx[i];
      const vz = s.vz[i];
      const v2 = vx * vx + vz * vz || 1;
      const tHit = (rx0 * vx + rz0 * vz) / v2; // time of closest approach
      if (tHit < 0 || tHit > 1.4) continue;
      const cx = rx0 - vx * tHit;
      const cz = rz0 - vz * tHit;
      const miss = Math.sqrt(cx * cx + cz * cz);
      if (miss > 1.6) continue;
      if (this.rng.next() > this.skill) continue; // worse players miss some
      // step out of the line of fire, away from the predicted impact point
      const side = cx * vz - cz * vx >= 0 ? 1 : -1;
      const vl = Math.sqrt(v2);
      const wgt = (2.5 * (1.6 - miss)) / (0.3 + tHit);
      rx += (vz / vl) * side * wgt;
      rz += (-vx / vl) * side * wgt;
      threat += wgt * 0.3;
      if (tHit < 0.25 && miss < 0.9) this.wantJump = true;
    }
    // shockwaves: jump them when they arrive
    const hz = w.hazards;
    for (let i = 0; i < hz.count; i++) {
      if (!hz.alive[i]) continue;
      const kind = hz.kind[i];
      const d = Math.hypot(p.x - hz.x[i], p.z - hz.z[i]);
      if (kind === HazardKind.EnemyRing && hz.a0[i] < d) {
        // jump just before the expanding band arrives (it only hurts grounded players)
        const arrive = (d - hz.a0[i] - 1.2) / Math.max(1, hz.a1[i]);
        if (arrive < 0.12 + (1 - this.skill) * 0.1 && arrive > -0.1 && w.player.onGround && this.rng.next() < 0.5 + this.skill * 0.5) this.wantJump = true;
      }
      if ((kind === HazardKind.EnemySlam || kind === HazardKind.EnemyPuddle) && d < hz.radius[i] + 2) {
        const k = 4 / Math.max(0.5, d);
        rx += ((p.x - hz.x[i]) / (d || 1)) * k;
        rz += ((p.z - hz.z[i]) / (d || 1)) * k;
        threat += k;
      }
    }

    // goals: chests > hearts (when hurt) > shrines > gems
    let gx = 0;
    let gz = 0;
    let goal = false;
    const pk = w.pickups;
    let best = 40 * 40;
    for (let i = 0; i < pk.count; i++) {
      const k = pk.kind[i];
      if (k === PickupKind.Coin) continue;
      if (k === PickupKind.Heart && p.hp > p.stats.maxHp * 0.7) continue;
      const dx = pk.x[i] - p.x;
      const dz = pk.z[i] - p.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < best) {
        best = d2;
        gx = dx;
        gz = dz;
        goal = true;
      }
    }
    if (!goal && this.skill > 0.4) {
      for (const sh of w.shrines) {
        if (!sh.alive) continue;
        const dx = sh.x - p.x;
        const dz = sh.z - p.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < best && Math.abs(w.terrain.height(sh.x, sh.z) - p.y) < 1.5) {
          best = d2;
          gx = dx;
          gz = dz;
          goal = true;
        }
      }
    }
    if (!goal) {
      const g = w.gems;
      best = 18 * 18;
      for (let i = 0; i < g.count; i++) {
        const dx = g.x[i] - p.x;
        const dz = g.z[i] - p.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < best) {
          best = d2;
          gx = dx;
          gz = dz;
          goal = true;
        }
      }
    }

    // stay away from the map edge
    const half = w.terrain.half - 30;
    let cx = 0;
    let cz = 0;
    if (Math.abs(p.x) > half) cx = -Math.sign(p.x) * (Math.abs(p.x) - half) * 0.3;
    if (Math.abs(p.z) > half) cz = -Math.sign(p.z) * (Math.abs(p.z) - half) * 0.3;

    // circle-strafe: rotate the repulsion so we orbit the horde instead of backing into walls
    const rl = Math.hypot(rx, rz);
    let mx = 0;
    let mz = 0;
    if (rl > 0.0001) {
      const ang = 0.9;
      const c = Math.cos(ang);
      const sn = Math.sin(ang);
      const nx = rx / rl;
      const nz = rz / rl;
      mx += (nx * c - nz * sn) * Math.min(3, threat * 2);
      mz += (nx * sn + nz * c) * Math.min(3, threat * 2);
    }
    if (goal) {
      const gl = Math.hypot(gx, gz) || 1;
      const urge = threat < 0.15 ? 1.4 : threat < 0.5 ? 0.5 : 0.15;
      mx += (gx / gl) * urge;
      mz += (gz / gl) * urge;
    }
    mx += cx;
    mz += cz;
    if (Math.abs(mx) + Math.abs(mz) < 0.05) {
      // wander
      this.jitterA += (this.rng.next() - 0.5) * 0.6;
      mx = Math.sin(this.jitterA);
      mz = Math.cos(this.jitterA);
    }
    // lower skill → noisier steering
    const noise = (1 - this.skill) * 0.9;
    mx += (this.rng.next() - 0.5) * noise;
    mz += (this.rng.next() - 0.5) * noise;
    const l = Math.hypot(mx, mz) || 1;
    this.mx = mx / l;
    this.mz = mz / l;
    if (closest < 0.6 && this.rng.next() < this.skill * 0.5) this.wantJump = true;
  }

  chooseUpgrade(w: World): UpgradeChoice | null {
    const choices = w.choices;
    if (choices.length === 0) return null;
    const p = w.player;
    const owned = new Set(w.weapons.map((x) => x.def.id));
    const catalysts = new Set(EVOLUTIONS.filter((e) => owned.has(e.weapon)).map((e) => e.passive));
    let bestI = 0;
    let bestS = -Infinity;
    choices.forEach((c, i) => {
      let s = 0;
      switch (c.kind) {
        case 'evolve':
          s = 10;
          break;
        case 'weaponLevel':
          s = 3 + c.level * 0.1;
          break;
        case 'newWeapon':
          s = w.weapons.length < 3 ? 4 : w.weapons.length < 5 ? 3.1 : 1.5;
          break;
        case 'newPassive':
          s = catalysts.has(c.id) ? 2.9 : 1.4;
          if (c.id === 'heartyStew' || c.id === 'kettleLid') s += 0.5;
          break;
        case 'passiveLevel':
          s = catalysts.has(c.id) ? 2 : 1.5;
          break;
        case 'heal':
          s = p.hp < p.stats.maxHp * 0.5 ? 4 : 0.2;
          break;
        case 'gold':
          s = 0.1;
          break;
      }
      s += (this.rng.next() - 0.5) * (1 - this.skill) * 3;
      if (s > bestS) {
        bestS = s;
        bestI = i;
      }
    });
    return choices[bestI];
  }
}
