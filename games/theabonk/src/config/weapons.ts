import type { WeaponDef, WeaponStats } from './types';

const ZERO: WeaponStats = {
  damage: 0,
  cooldown: 1,
  area: 1,
  speed: 0,
  amount: 1,
  pierce: 0,
  duration: 1,
  knockback: 0,
  hitInterval: 0.5,
  range: 20,
  chain: 0,
  slow: 0,
  explode: 0,
  crit: 0,
};

function s(p: Partial<WeaponStats>): WeaponStats {
  return { ...ZERO, ...p };
}

/**
 * Weapon roster. Each entry is pure data; its `behavior` selects one function in
 * sim/weapons/. `params` carries behaviour-specific knobs that never scale with levels.
 */
export interface WeaponConfig extends WeaponDef {
  params?: { spread?: number; nova?: number; permanent?: number; arc?: number };
}

export const WEAPONS: WeaponConfig[] = [
  {
    id: 'bonkRing',
    name: 'Bonk Ring',
    description: 'A halo of phantom mallets thumps everything that gets too close.',
    behavior: 'aura',
    base: s({ damage: 8, area: 3.6, hitInterval: 0.6, knockback: 4.5, cooldown: 0 }),
    levels: [
      { text: '+2 damage, +12% radius', delta: { damage: 2, area: 0.4 } },
      { text: '+2 damage, thumps faster', delta: { damage: 2, hitInterval: -0.08 } },
      { text: '+15% radius, stronger knockback', delta: { area: 0.5, knockback: 2 } },
      { text: '+4 damage, thumps faster', delta: { damage: 4, hitInterval: -0.07 } },
    ],
    visual: { color: 0xffb347, kind: 'none' },
    sfx: 'thump',
    weight: 100,
  },
  {
    id: 'thistleDarts',
    name: 'Thistle Darts',
    description: 'Flicks barbed darts at the nearest foe.',
    behavior: 'projectile',
    base: s({ damage: 12, cooldown: 0.95, area: 1, speed: 26, amount: 1, duration: 1.4, knockback: 1.2, range: 34 }),
    levels: [
      { text: '+1 dart', delta: { amount: 1 } },
      { text: '+4 damage, -0.1s cooldown', delta: { damage: 4, cooldown: -0.1 } },
      { text: '+1 dart, pierces +1', delta: { amount: 1, pierce: 1 } },
      { text: '+6 damage, pierces +1', delta: { damage: 6, pierce: 1 } },
    ],
    visual: { color: 0x9be36b, kind: 'dart' },
    sfx: 'dart',
    weight: 100,
  },
  {
    id: 'lanterns',
    name: 'Firefly Lanterns',
    description: 'Glowing lanterns circle you, singeing whatever they touch.',
    behavior: 'orbit',
    base: s({ damage: 10, cooldown: 2.4, area: 3.2, speed: 3.2, amount: 2, duration: 4, knockback: 3, hitInterval: 0.5 }),
    levels: [
      { text: '+1 lantern', delta: { amount: 1 } },
      { text: '+4 damage, wider orbit', delta: { damage: 4, area: 0.5 } },
      { text: '+1 lantern, lasts longer', delta: { amount: 1, duration: 0.8 } },
      { text: '+5 damage, spins faster', delta: { damage: 5, speed: 0.8 } },
    ],
    visual: { color: 0xffe066, kind: 'lantern' },
    sfx: 'lantern',
    weight: 100,
  },
  {
    id: 'drumBurst',
    name: 'Thunder Drum',
    description: 'A drumbeat detonates beneath a nearby foe.',
    behavior: 'burst',
    base: s({ damage: 22, cooldown: 2.2, area: 3.0, amount: 1, range: 22, knockback: 6 }),
    levels: [
      { text: '+1 beat', delta: { amount: 1 } },
      { text: '+10 damage, +20% radius', delta: { damage: 10, area: 0.6 } },
      { text: '+1 beat, -0.4s cooldown', delta: { amount: 1, cooldown: -0.4 } },
      { text: '+14 damage, +25% radius', delta: { damage: 14, area: 0.8 } },
    ],
    visual: { color: 0xff7a3d, kind: 'none' },
    sfx: 'drum',
    weight: 90,
  },
  {
    id: 'zapJar',
    name: 'Zap Jar',
    description: 'Uncorks a crackling bolt that leaps from foe to foe.',
    behavior: 'chain',
    base: s({ damage: 14, cooldown: 1.8, amount: 1, chain: 3, range: 20, area: 7 }),
    levels: [
      { text: '+2 leaps', delta: { chain: 2 } },
      { text: '+7 damage', delta: { damage: 7 } },
      { text: '+1 bolt, -0.2s cooldown', delta: { amount: 1, cooldown: -0.2 } },
      { text: '+3 leaps, +8 damage', delta: { chain: 3, damage: 8 } },
    ],
    visual: { color: 0x8fd8ff, kind: 'none' },
    sfx: 'zap',
    weight: 90,
  },
  {
    id: 'wobbleDisc',
    name: 'Wobble Disc',
    description: 'A wobbly disc that sails out, then loops back to you.',
    behavior: 'boomerang',
    base: s({ damage: 16, cooldown: 1.7, area: 1, speed: 20, amount: 1, duration: 1.8, hitInterval: 0.35, knockback: 3, range: 26 }),
    levels: [
      { text: '+6 damage', delta: { damage: 6 } },
      { text: '+1 disc', delta: { amount: 1 } },
      { text: 'Bigger and faster', delta: { area: 0.35, speed: 4 } },
      { text: '+1 disc, +8 damage', delta: { amount: 1, damage: 8 } },
    ],
    visual: { color: 0x5ad1c9, kind: 'disc' },
    sfx: 'disc',
    weight: 90,
  },
  {
    id: 'emberSeeds',
    name: 'Ember Seeds',
    description: 'Tosses seeds that burst into smouldering patches.',
    behavior: 'hazard',
    base: s({ damage: 5, cooldown: 3.2, area: 2.4, amount: 2, duration: 3.0, hitInterval: 0.45, range: 14, speed: 12 }),
    levels: [
      { text: '+1 seed', delta: { amount: 1 } },
      { text: '+3 damage, +15% radius', delta: { damage: 3, area: 0.4 } },
      { text: '+1 seed, burns longer', delta: { amount: 1, duration: 1.2 } },
      { text: '+4 damage, burns faster', delta: { damage: 4, hitInterval: -0.1 } },
    ],
    visual: { color: 0xff5a2a, kind: 'seed' },
    sfx: 'seed',
    weight: 80,
  },
  {
    id: 'wispBees',
    name: 'Wisp Bees',
    description: 'Loyal wisp-bees hunt down foes on their own.',
    behavior: 'homing',
    base: s({ damage: 10, cooldown: 1.5, area: 1, speed: 15, amount: 2, duration: 3.5, knockback: 1, range: 40 }),
    levels: [
      { text: '+1 bee', delta: { amount: 1 } },
      { text: '+5 damage', delta: { damage: 5 } },
      { text: '+1 bee, faster flight', delta: { amount: 1, speed: 3 } },
      { text: '+6 damage, pierces +1', delta: { damage: 6, pierce: 1 } },
    ],
    visual: { color: 0xc6a8ff, kind: 'bee' },
    sfx: 'bee',
    unlock: 'level25',
    weight: 80,
  },
  {
    id: 'frostFan',
    name: 'Frost Fan',
    description: 'A fan of icy shards that chill whatever they strike.',
    behavior: 'projectile',
    base: s({ damage: 8, cooldown: 1.6, area: 1, speed: 22, amount: 3, pierce: 1, duration: 0.8, slow: 0.35, knockback: 0.5, range: 24 }),
    levels: [
      { text: '+1 shard', delta: { amount: 1 } },
      { text: '+4 damage, colder', delta: { damage: 4, slow: 0.1 } },
      { text: '+2 shards, pierces +1', delta: { amount: 2, pierce: 1 } },
      { text: '+6 damage, longer reach', delta: { damage: 6, duration: 0.3 } },
    ],
    params: { spread: 0.55 },
    visual: { color: 0xbff0ff, kind: 'shard' },
    sfx: 'frost',
    unlock: 'beatGrumblecap',
    weight: 80,
  },

  // ───────────── Evolved forms (offered only through evolutions) ─────────────
  {
    id: 'quakeCrown',
    name: 'Quake Crown',
    description: 'The ring becomes a rolling earthquake that staggers and slows.',
    behavior: 'aura',
    base: s({ damage: 18, area: 5.2, hitInterval: 0.38, knockback: 8, slow: 0.25, cooldown: 0 }),
    levels: [],
    visual: { color: 0xffd36b, kind: 'none' },
    sfx: 'thump',
    evolved: true,
    weight: 0,
  },
  {
    id: 'thornstorm',
    name: 'Thornstorm',
    description: 'A ceaseless hail of piercing thorns.',
    behavior: 'projectile',
    base: s({ damage: 20, cooldown: 0.55, area: 1.3, speed: 32, amount: 4, pierce: 3, duration: 1.4, knockback: 1.5, range: 36 }),
    levels: [],
    params: { spread: 0.3 },
    visual: { color: 0x5df07a, kind: 'dart', scale: 1.3 },
    sfx: 'dart',
    evolved: true,
    weight: 0,
  },
  {
    id: 'everglow',
    name: 'Everglow Lanterns',
    description: 'Lanterns that never dim, orbiting forever.',
    behavior: 'orbit',
    base: s({ damage: 18, cooldown: 0.2, area: 4.6, speed: 3.8, amount: 5, duration: 9999, knockback: 3, hitInterval: 0.35 }),
    levels: [],
    params: { permanent: 1 },
    visual: { color: 0xfff1a6, kind: 'lantern', scale: 1.25 },
    sfx: 'lantern',
    evolved: true,
    weight: 0,
  },
  {
    id: 'skyDrum',
    name: 'Skyquake Drum',
    description: 'Thunder from the sky flattens whole crowds.',
    behavior: 'burst',
    base: s({ damage: 50, cooldown: 1.4, area: 5.2, amount: 3, range: 26, knockback: 9 }),
    levels: [],
    visual: { color: 0xffa23d, kind: 'none' },
    sfx: 'drum',
    evolved: true,
    weight: 0,
  },
  {
    id: 'stormBottle',
    name: 'Storm Bottle',
    description: 'A bottled thunderstorm that arcs through entire hordes.',
    behavior: 'chain',
    base: s({ damage: 26, cooldown: 0.9, amount: 2, chain: 9, range: 24, area: 9 }),
    levels: [],
    visual: { color: 0xd4f2ff, kind: 'none' },
    sfx: 'zap',
    evolved: true,
    weight: 0,
  },
  {
    id: 'cometDisc',
    name: 'Comet Disc',
    description: 'Blazing discs that explode on impact.',
    behavior: 'boomerang',
    base: s({ damage: 34, cooldown: 1.2, area: 1.6, speed: 28, amount: 3, duration: 2.0, hitInterval: 0.3, knockback: 4, explode: 2.2, range: 30 }),
    levels: [],
    visual: { color: 0xff8f5a, kind: 'disc', scale: 1.3 },
    sfx: 'disc',
    evolved: true,
    weight: 0,
  },
  {
    id: 'wildfire',
    name: 'Wildfire Grove',
    description: 'Seeds erupt into roaring wildfire groves.',
    behavior: 'hazard',
    base: s({ damage: 11, cooldown: 2.2, area: 3.6, amount: 4, duration: 5, hitInterval: 0.3, range: 16, speed: 14 }),
    levels: [],
    visual: { color: 0xff3d1f, kind: 'seed', scale: 1.3 },
    sfx: 'seed',
    evolved: true,
    weight: 0,
  },
  {
    id: 'queenSwarm',
    name: "Queen's Swarm",
    description: 'A royal swarm of bursting wisp-bees.',
    behavior: 'homing',
    base: s({ damage: 18, cooldown: 0.9, area: 1.3, speed: 20, amount: 5, pierce: 2, duration: 4, knockback: 1.5, explode: 1.6, range: 44 }),
    levels: [],
    visual: { color: 0xe2a8ff, kind: 'bee', scale: 1.3 },
    sfx: 'bee',
    evolved: true,
    weight: 0,
  },
  {
    id: 'glacierBloom',
    name: 'Glacier Bloom',
    description: 'A blooming nova of ice that freezes the field.',
    behavior: 'projectile',
    base: s({ damage: 16, cooldown: 1.1, area: 1.3, speed: 24, amount: 10, pierce: 3, duration: 1.0, slow: 0.6, knockback: 1, range: 30 }),
    levels: [],
    params: { nova: 1 },
    visual: { color: 0xe6fbff, kind: 'shard', scale: 1.3 },
    sfx: 'frost',
    evolved: true,
    weight: 0,
  },
];

export const WEAPON_INDEX: Record<string, number> = {};
WEAPONS.forEach((w, i) => (WEAPON_INDEX[w.id] = i));

export function weaponDef(id: string): WeaponConfig {
  const i = WEAPON_INDEX[id];
  if (i === undefined) throw new Error(`Unknown weapon ${id}`);
  return WEAPONS[i];
}

export function weaponMaxLevel(def: WeaponDef): number {
  return def.levels.length + 1;
}
