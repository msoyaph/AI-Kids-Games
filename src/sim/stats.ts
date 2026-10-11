import { MAX_COOLDOWN_REDUCTION } from '../config/balance';
import type { WeaponConfig } from '../config/weapons';
import type { PlayerStats, WeaponStats } from '../config/types';
import type { World } from './world';

/** Recompute final player stats from base + passives + active buffs. */
export function recomputePlayerStats(w: World): void {
  const p = w.player;
  const s = p.stats;
  const b = p.baseStats;
  for (const k in b) s[k as keyof PlayerStats] = b[k as keyof PlayerStats];
  for (const pi of w.passives) {
    for (const [k, v] of Object.entries(pi.def.perLevel)) s[k as keyof PlayerStats] += (v as number) * pi.level;
  }
  if (p.buffs.might > 0) s.might += 0.6;
  if (p.buffs.haste > 0) {
    s.moveSpeed += 0.35;
    s.cooldown += 0.25;
  }
  if (p.buffs.fortune > 0) s.growth += 1;
  const oldMax = p.hpMaxCache;
  s.maxHp = Math.max(1, s.maxHp);
  // keep current HP proportionally sane when max HP rises
  if (s.maxHp > oldMax) p.hp += s.maxHp - oldMax;
  if (p.hp > s.maxHp) p.hp = s.maxHp;
  p.hpMaxCache = s.maxHp;
  for (const wi of w.weapons) resolveWeaponStats(wi.def, wi.level, s, wi.stats);
}

export function cooldownMult(s: PlayerStats): number {
  return 1 - Math.min(MAX_COOLDOWN_REDUCTION, Math.max(-0.5, s.cooldown));
}

/** Weapon stats at `level` (base + level deltas), then scaled by player stats. */
export function rawWeaponStats(def: WeaponConfig, level: number, out: WeaponStats): WeaponStats {
  Object.assign(out, def.base);
  const n = Math.min(level - 1, def.levels.length);
  for (let i = 0; i < n; i++) {
    const d = def.levels[i].delta;
    for (const k in d) out[k as keyof WeaponStats] += d[k as keyof WeaponStats] as number;
  }
  return out;
}

export function resolveWeaponStats(def: WeaponConfig, level: number, s: PlayerStats, out: WeaponStats): WeaponStats {
  rawWeaponStats(def, level, out);
  out.damage *= 1 + s.might;
  out.cooldown = Math.max(0.08, out.cooldown * cooldownMult(s));
  out.area *= 1 + s.area;
  out.explode *= 1 + s.area;
  out.speed *= def.behavior === 'orbit' ? 1 + s.projSpeed * 0.5 : 1 + s.projSpeed;
  out.amount = Math.max(1, Math.round(out.amount + s.amount));
  out.duration *= 1 + s.duration;
  out.hitInterval = Math.max(0.1, out.hitInterval);
  out.slow = Math.min(0.85, out.slow);
  out.crit += s.crit;
  return out;
}

export function moveSpeedMult(s: PlayerStats): number {
  return Math.max(0.3, 1 + s.moveSpeed);
}

export function xpMult(s: PlayerStats): number {
  return Math.max(0.1, 1 + s.growth);
}

export function goldMult(s: PlayerStats): number {
  return Math.max(0.1, 1 + s.greed);
}
