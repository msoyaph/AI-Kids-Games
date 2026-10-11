import { CRIT_MULT } from '../config/balance';

/** Pure damage math (unit tested). */

export function isCrit(chance: number, roll: number): boolean {
  return roll < chance;
}

/** Outgoing hit: base already includes might. ±10% variance; crits multiply. */
export function hitDamage(base: number, crit: boolean, varianceRoll: number): number {
  const v = 0.9 + 0.2 * varianceRoll;
  return base * v * (crit ? CRIT_MULT : 1);
}

/**
 * Incoming damage after flat armor. Armor can never reduce a hit below 20% of its raw value
 * (so armor is strong early but never makes you invincible), and never below 1.
 */
export function damageAfterArmor(raw: number, armor: number): number {
  if (raw <= 0) return 0;
  const reduced = raw - Math.max(0, armor);
  return Math.max(1, Math.max(raw * 0.2, reduced));
}

/** Knockback velocity magnitude applied to an enemy. */
export function knockbackImpulse(force: number, resist: number, elite: boolean): number {
  const r = Math.min(1, Math.max(0, resist + (elite ? 0.5 : 0)));
  return force * (1 - r);
}
