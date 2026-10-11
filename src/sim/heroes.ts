import { PLAYER_RADIUS } from '../config/balance';
import { ENEMIES } from '../config/enemies';
import { sfxId } from '../config/sfx';
import { Ev } from '../core/events';
import { hitEnemy } from './combat';
import type { World } from './world';

/**
 * Hero signature passives. Each hero has one (CharacterDef.passive); the player keeps a
 * numeric code so hot paths compare integers, not strings.
 */
export const HeroPassive = {
  None: 0,
  /** Thea: landing from a jump bonks nearby Gloom. */
  LandingBonk: 1,
  /** Pip: super slides (movement numbers in her CharacterDef). */
  SuperSlide: 2,
  /** Brindle: below 30% HP he takes 40% less damage. */
  ShellGuard: 3,
  /** Ottie: long slides; sliding through Gloom bowls them over (and they can't touch you). */
  Slipstream: 4,
  /** Bramble: Gloom that hurt him on contact take thorns damage. */
  Thornshell: 5,
  /** Nova: four cards at every level-up. */
  WiseEyes: 6,
} as const;

const CODES: Record<string, number> = {
  landingBonk: HeroPassive.LandingBonk,
  superSlide: HeroPassive.SuperSlide,
  shellGuard: HeroPassive.ShellGuard,
  slipstream: HeroPassive.Slipstream,
  thornshell: HeroPassive.Thornshell,
  wiseEyes: HeroPassive.WiseEyes,
};

export function passiveCode(id: string | undefined): number {
  return id ? (CODES[id] ?? HeroPassive.None) : HeroPassive.None;
}

const TYPE_BOSS = new Uint8Array(ENEMIES.map((d) => (d.behavior === 'boss' ? 1 : 0)));
/** No-weapon slot for hero hits (no per-weapon immunity / damage tracking). */
const HERO_SLOT = -1;

/** Shell Guard: damage multiplier for an incoming hit. */
export const SHELL_GUARD_HP = 0.3;
export const SHELL_GUARD_MULT = 0.6;
/** Slipstream: sliding faster than this bowls Gloom over. */
export const SLIPSTREAM_SPEED = 8;

/** Thea's Landing Bonk: a shockwave around Thea on landing from a real jump. */
export function landingBonk(w: World, impact: number): void {
  const p = w.player;
  const radius = 2.4 + Math.min(1.6, (impact - 7) * 0.25);
  const dmg = (8 + impact * 0.8) * (1 + p.stats.might) * (1 + p.level * 0.03);
  const e = w.enemies;
  const buf = w.areaScratch;
  const n = w.grid.query(p.x, p.z, radius + 3.5, buf);
  for (let k = 0; k < n; k++) {
    const i = buf[k];
    if (!e.alive[i]) continue;
    const dx = e.x[i] - p.x;
    const dz = e.z[i] - p.z;
    const r = radius + e.radius[i];
    if (dx * dx + dz * dz > r * r) continue;
    hitEnemy(w, i, dmg, p.stats.crit, HERO_SLOT, dx, dz, 7);
  }
  w.events.push(Ev.Ring, p.x, p.y + 0.1, p.z, radius, 0, 0, 0xffb347);
  w.events.push(Ev.Sfx, p.x, p.y, p.z, 0.8, 0, 0, sfxId('bonk'));
}

/** Per-tick hero effects (Ottie's bowling). Sets p.bowling while it is active. */
export function updateHero(w: World): void {
  const p = w.player;
  p.bowling = false;
  if (p.passive !== HeroPassive.Slipstream || !p.sliding || !p.onGround) return;
  const speed = Math.hypot(p.vx, p.vz);
  if (speed < SLIPSTREAM_SPEED) return;
  p.bowling = true;
  const e = w.enemies;
  const buf = w.areaScratch;
  const reach = PLAYER_RADIUS + 0.6;
  const n = w.grid.query(p.x, p.z, reach + 2, buf);
  const dmg = (6 + speed * 0.5) * (1 + p.stats.might) * (1 + p.level * 0.03);
  for (let k = 0; k < n; k++) {
    const i = buf[k];
    if (!e.alive[i] || TYPE_BOSS[e.type[i]] || w.time < e.bonkT[i]) continue;
    const dx = e.x[i] - p.x;
    const dz = e.z[i] - p.z;
    const r = reach + e.radius[i];
    if (dx * dx + dz * dz > r * r) continue;
    e.bonkT[i] = w.time + 0.5;
    // knocked aside, out of Ottie's line of travel
    const side = (dx * p.vz - dz * p.vx) >= 0 ? 1 : -1;
    hitEnemy(w, i, dmg, p.stats.crit, HERO_SLOT, (p.vz / speed) * side + (p.vx / speed) * 0.5, (-p.vx / speed) * side + (p.vz / speed) * 0.5, 9);
  }
}

/** Bramble's Thornshell: the Gloom that hurt him by touch takes thorns damage. */
export function thornshell(w: World, i: number, raw: number): void {
  const p = w.player;
  const e = w.enemies;
  if (!e.alive[i]) return;
  hitEnemy(w, i, raw * 2.5 * (1 + p.stats.might), 0, HERO_SLOT, e.x[i] - p.x, e.z[i] - p.z, 6);
}
