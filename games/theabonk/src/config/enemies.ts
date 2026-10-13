import type { EnemyDef } from './types';

/**
 * The Gloom — every hostile creature. Append new kinds at the end: indices are part of
 * damage-source codes and determinism fingerprints.
 * hp/damage here are minute-0 values; the sim scales them over time (config/tuning.ts).
 */
export const ENEMIES: EnemyDef[] = [
  { id: 'gloomling', deathFx: 'pop', name: 'Gloomling', behavior: 'chaser', hp: 10, speed: 3.6, damage: 5, radius: 0.6, height: 1.1, xp: 1, knockbackResist: 0, color: 0x7b5cff },
  { id: 'gnatlet', deathFx: 'puff', name: 'Gnatlet', behavior: 'swarmer', hp: 4, speed: 5.4, damage: 3, radius: 0.42, height: 0.8, xp: 1, knockbackResist: 0, color: 0xc9e65a, flying: true, bob: 0.25 },
  { id: 'boulderback', deathFx: 'shards', name: 'Boulderback', behavior: 'tank', hp: 75, speed: 2.25, damage: 12, radius: 1.3, height: 2.2, xp: 6, knockbackResist: 0.85, color: 0x8a8f99, maxCount: 600 },
  {
    id: 'spitcap', deathFx: 'splat', name: 'Spitcap', behavior: 'ranged', hp: 16, speed: 2.9, damage: 5, radius: 0.7, height: 1.4, xp: 2, knockbackResist: 0.1, color: 0xe0483e,
    range: 14, fireInterval: 4.4, projectileSpeed: 9, projectileDamage: 4, maxCount: 600,
  },
  {
    id: 'ramhorn', deathFx: 'pop', name: 'Ramhorn', behavior: 'charger', hp: 28, speed: 3.1, damage: 10, radius: 0.9, height: 1.3, xp: 3, knockbackResist: 0.4, color: 0xb5763c,
    range: 16, windup: 0.75, chargeSpeed: 17, chargeTime: 0.75, maxCount: 600,
  },
  { id: 'blobbin', deathFx: 'splat', name: 'Blobbin', behavior: 'splitter', hp: 26, speed: 3.0, damage: 7, radius: 0.9, height: 1.2, xp: 2, knockbackResist: 0.1, color: 0xff7ab8, splitInto: 'blobbit', splitCount: 2, maxCount: 600 },
  { id: 'blobbit', deathFx: 'splat', name: 'Blobbit', behavior: 'chaser', hp: 8, speed: 4.1, damage: 4, radius: 0.5, height: 0.7, xp: 1, knockbackResist: 0, color: 0xff9fcf },
  {
    id: 'fusewick', deathFx: 'puff', name: 'Fusewick', behavior: 'exploder', hp: 12, speed: 4.7, damage: 0, radius: 0.6, height: 1.0, xp: 2, knockbackResist: 0, color: 0x3a3340,
    range: 2.6, fuse: 0.75, explodeRadius: 3.2, explodeDamage: 14, maxCount: 600,
  },
  // Bosses
  { id: 'grumblecap', name: 'Grumblecap', behavior: 'boss', hp: 2600, speed: 2.6, damage: 15, radius: 3.0, height: 6, xp: 120, knockbackResist: 1, color: 0xd94c3d, epithet: 'The Spore Tyrant', enrageAt: 0.5, bossPattern: 'grumblecap', projectileSpeed: 9, projectileDamage: 7, maxCount: 4 },
  { id: 'clockjaw', name: 'Clockjaw', behavior: 'boss', hp: 9000, speed: 3.3, damage: 20, radius: 3.2, height: 5, xp: 250, knockbackResist: 1, color: 0xc8913a, epithet: 'The Wind-Up Terror', enrageAt: 0.4, bossPattern: 'clockjaw', chargeSpeed: 21, windup: 1.1, chargeTime: 1.1, projectileDamage: 12, maxCount: 4 },
  { id: 'gloamRegent', name: 'The Gloam Regent', behavior: 'boss', hp: 44000, speed: 3.0, damage: 26, radius: 3.0, height: 7, xp: 500, knockbackResist: 1, color: 0x3b2a6b, epithet: 'Lord of the Gloom', phases: [0.66, 0.33], enrageAt: 0.33, bossPattern: 'regent', projectileSpeed: 11, projectileDamage: 12, maxCount: 4, flying: true, bob: 0.6 },

  // ── Rimewood ──
  { id: 'frostling', deathFx: 'shards', name: 'Frostling', model: 'gloomling', behavior: 'chaser', hp: 14, speed: 3.5, damage: 6, radius: 0.62, height: 1.15, xp: 1, knockbackResist: 0.1, color: 0x6fb4ff, chill: 1.2 },
  {
    id: 'snowRoller', deathFx: 'puff', name: 'Snowball Roller', behavior: 'charger', hp: 30, speed: 2.8, damage: 10, radius: 0.85, height: 1.6, xp: 3, knockbackResist: 0.5, color: 0xb4cdea,
    range: 20, windup: 0.6, chargeSpeed: 10, chargeTime: 2.4, roll: 1.7, maxCount: 600,
  },
  {
    id: 'icicap', deathFx: 'shards', name: 'Icicap', model: 'spitcap', behavior: 'ranged', hp: 18, speed: 2.8, damage: 5, radius: 0.7, height: 1.4, xp: 2, knockbackResist: 0.1, color: 0x4fc3f0,
    range: 15, fireInterval: 4.2, projectileSpeed: 10, projectileDamage: 4, chill: 1.4, shotVisual: 2, maxCount: 600,
  },
  { id: 'grumblecapFrost', name: 'Frosted Grumblecap', model: 'grumblecap', behavior: 'boss', hp: 2800, speed: 2.6, damage: 15, radius: 3.0, height: 6, xp: 120, knockbackResist: 1, color: 0x6fa8e8, epithet: 'Spore Tyrant of the Rimewood', enrageAt: 0.5, bossPattern: 'grumblecap', projectileSpeed: 9, projectileDamage: 7, shotVisual: 2, maxCount: 4 },
  { id: 'clockjawFrost', name: 'Frosted Clockjaw', model: 'clockjaw', behavior: 'boss', hp: 9500, speed: 3.3, damage: 20, radius: 3.2, height: 5, xp: 250, knockbackResist: 1, color: 0x8fb8d8, epithet: 'The Frozen Gears', enrageAt: 0.4, bossPattern: 'clockjaw', chargeSpeed: 21, windup: 1.1, chargeTime: 1.1, projectileDamage: 12, maxCount: 4 },
  {
    id: 'oldRime', name: 'Old Rime, the Frost Stag', behavior: 'boss', hp: 46000, speed: 3.4, damage: 26, radius: 3.0, height: 7, xp: 500, knockbackResist: 1, color: 0xbcd6f0,
    epithet: 'Ancient of the Winter Wood', phases: [0.66, 0.33], enrageAt: 0.33, bossPattern: 'oldRime', chargeSpeed: 20, windup: 1.0, chargeTime: 1.0, projectileSpeed: 11, projectileDamage: 12, chill: 1.2, shotVisual: 2, maxCount: 4,
  },
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
