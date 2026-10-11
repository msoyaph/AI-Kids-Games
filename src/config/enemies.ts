import type { EnemyDef } from './types';

/**
 * The Gloom — every hostile creature. Order matters only for render mesh creation.
 * hp/damage here are minute-0 values; sim scales them over time (config/balance.ts).
 */
export const ENEMIES: EnemyDef[] = [
  { id: 'gloomling', name: 'Gloomling', behavior: 'chaser', hp: 10, speed: 3.7, damage: 8, radius: 0.6, height: 1.1, xp: 1, knockbackResist: 0, color: 0x7b5cff },
  { id: 'gnatlet', name: 'Gnatlet', behavior: 'swarmer', hp: 4, speed: 5.6, damage: 4, radius: 0.42, height: 0.8, xp: 1, knockbackResist: 0, color: 0xc9e65a },
  { id: 'boulderback', name: 'Boulderback', behavior: 'tank', hp: 75, speed: 2.25, damage: 16, radius: 1.3, height: 2.2, xp: 6, knockbackResist: 0.85, color: 0x8a8f99, maxCount: 600 },
  {
    id: 'spitcap', name: 'Spitcap', behavior: 'ranged', hp: 16, speed: 2.9, damage: 6, radius: 0.7, height: 1.4, xp: 2, knockbackResist: 0.1, color: 0xe0483e,
    range: 15, fireInterval: 3.2, projectileSpeed: 11, projectileDamage: 7, maxCount: 600,
  },
  {
    id: 'ramhorn', name: 'Ramhorn', behavior: 'charger', hp: 28, speed: 3.1, damage: 14, radius: 0.9, height: 1.3, xp: 3, knockbackResist: 0.4, color: 0xb5763c,
    range: 16, windup: 0.75, chargeSpeed: 17, chargeTime: 0.75, maxCount: 600,
  },
  { id: 'blobbin', name: 'Blobbin', behavior: 'splitter', hp: 26, speed: 3.0, damage: 9, radius: 0.9, height: 1.2, xp: 2, knockbackResist: 0.1, color: 0xff7ab8, splitInto: 'blobbit', splitCount: 2, maxCount: 600 },
  { id: 'blobbit', name: 'Blobbit', behavior: 'chaser', hp: 8, speed: 4.3, damage: 5, radius: 0.5, height: 0.7, xp: 1, knockbackResist: 0, color: 0xff9fcf },
  {
    id: 'fusewick', name: 'Fusewick', behavior: 'exploder', hp: 12, speed: 4.7, damage: 0, radius: 0.6, height: 1.0, xp: 2, knockbackResist: 0, color: 0x3a3340,
    range: 2.6, fuse: 0.65, explodeRadius: 3.2, explodeDamage: 18, maxCount: 600,
  },
  // Bosses
  { id: 'grumblecap', name: 'Grumblecap', behavior: 'boss', hp: 2600, speed: 2.7, damage: 22, radius: 3.0, height: 6, xp: 120, knockbackResist: 1, color: 0xd94c3d, bossPattern: 'grumblecap', projectileSpeed: 10, projectileDamage: 12, maxCount: 4 },
  { id: 'clockjaw', name: 'Clockjaw', behavior: 'boss', hp: 7000, speed: 3.4, damage: 30, radius: 3.2, height: 5, xp: 250, knockbackResist: 1, color: 0xc8913a, bossPattern: 'clockjaw', chargeSpeed: 24, windup: 1.0, chargeTime: 1.1, projectileDamage: 20, maxCount: 4 },
  { id: 'gloamRegent', name: 'The Gloam Regent', behavior: 'boss', hp: 16000, speed: 3.0, damage: 34, radius: 3.0, height: 7, xp: 500, knockbackResist: 1, color: 0x3b2a6b, bossPattern: 'regent', projectileSpeed: 12, projectileDamage: 16, maxCount: 4 },
];

export const ENEMY_INDEX: Record<string, number> = {};
ENEMIES.forEach((e, i) => (ENEMY_INDEX[e.id] = i));

export function enemyIndex(id: string): number {
  const i = ENEMY_INDEX[id];
  if (i === undefined) throw new Error(`Unknown enemy ${id}`);
  return i;
}

/** Elite modifiers. */
export const ELITE = { hpMult: 9, scale: 1.6, damageMult: 1.5, speedMult: 1.05, xpMult: 10 } as const;
