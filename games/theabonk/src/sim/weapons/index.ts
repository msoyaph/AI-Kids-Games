import { WEAPON_SLOTS } from '../../config/balance';
import { WEAPON_INDEX, WEAPONS, weaponDef, weaponMaxLevel } from '../../config/weapons';
import type { WeaponBehavior } from '../../config/types';
import { resolveWeaponStats } from '../stats';
import type { WeaponInstance, World } from '../world';
import { aura } from './aura';
import { boomerang } from './boomerang';
import { burst } from './burst';
import { chain } from './chain';
import { bindWorld } from './common';
import { hazard } from './hazard';
import { homing } from './homing';
import { clearOrbiters, orbit } from './orbit';
import { projectile } from './projectile';

/**
 * Behaviour registry. A new weapon = a config entry in config/weapons.ts; a new *kind* of
 * weapon = one function here.
 */
export const BEHAVIORS: Record<WeaponBehavior, (w: World, wi: WeaponInstance) => void> = {
  aura,
  projectile,
  orbit,
  burst,
  chain,
  boomerang,
  hazard,
  homing,
};

export function updateWeapons(w: World): void {
  bindWorld(w);
  for (let k = 0; k < w.weapons.length; k++) {
    const wi = w.weapons[k];
    BEHAVIORS[wi.def.behavior](w, wi);
  }
}

export function createWeaponInstance(w: World, id: string, slot: number): WeaponInstance {
  const def = weaponDef(id);
  const wi: WeaponInstance = {
    def,
    index: WEAPON_INDEX[id],
    level: 1,
    slot,
    timer: 0.4,
    burstLeft: 0,
    burstTimer: 0,
    active: 0,
    stats: { ...def.base },
    damageDealt: 0,
    kills: 0,
    pulse: 0.3,
  };
  resolveWeaponStats(def, 1, w.player.stats, wi.stats);
  return wi;
}

export function hasWeapon(w: World, id: string): boolean {
  return w.weapons.some((x) => x.def.id === id);
}

export function addWeapon(w: World, id: string): WeaponInstance | null {
  if (w.weapons.length >= WEAPON_SLOTS || hasWeapon(w, id)) return null;
  const wi = createWeaponInstance(w, id, w.weapons.length);
  w.weapons.push(wi);
  return wi;
}

export function levelUpWeapon(w: World, wi: WeaponInstance): void {
  if (wi.level >= weaponMaxLevel(wi.def)) return;
  wi.level++;
  resolveWeaponStats(wi.def, wi.level, w.player.stats, wi.stats);
  refreshWeapon(w, wi);
}

/** Swap a weapon for its evolved form in the same slot. */
export function evolveWeapon(w: World, wi: WeaponInstance, intoId: string): void {
  const def = weaponDef(intoId);
  clearOrbiters(w, wi.slot);
  wi.def = def;
  wi.index = WEAPON_INDEX[intoId];
  wi.level = 1;
  wi.active = 0;
  wi.timer = 0.2;
  wi.burstLeft = 0;
  resolveWeaponStats(def, 1, w.player.stats, wi.stats);
}

/** Orbit weapons respawn their orbiters so new counts / radii take effect immediately. */
export function refreshWeapon(w: World, wi: WeaponInstance): void {
  if (wi.def.behavior === 'orbit') {
    clearOrbiters(w, wi.slot);
    wi.active = 0;
    wi.timer = 0;
  }
}

export function isMaxed(wi: WeaponInstance): boolean {
  return wi.level >= weaponMaxLevel(wi.def);
}

export { WEAPONS };
