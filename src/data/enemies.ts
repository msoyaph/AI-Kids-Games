import type { ElementId } from './elements';

export type EnemyId =
  | 'gloop'
  | 'minigloop'
  | 'zoomkin'
  | 'clankbot'
  | 'puffbat'
  | 'mendy'
  | 'splitblob'
  | 'bubbleimp'
  | 'kinggloop'
  | 'bigclank'
  | 'mamapuff'
  | 'grumbleking';

export type EnemyLook = 'beetle' | 'drone' | 'golem' | 'wisp' | 'mender' | 'geode' | 'sentinel' | 'archon';

export interface EnemyDef {
  id: EnemyId;
  name: string;
  blurb: string;
  /** Hit points at wave-1 strength (every creature, bosses too, is scaled by the wave health curve). */
  hp: number;
  /** Tiles per second. */
  speed: number;
  /** Fraction of damage blocked, 0..0.8. */
  armor: number;
  coins: number;
  /** Lives lost if it reaches the castle. */
  lives: number;
  /** Visual radius in tiles (also used for splash hits). */
  radius: number;
  flying?: boolean;
  boss?: boolean;
  /** Can spawn with an element affinity (coloured variant). */
  elemental?: boolean;
  /** Always has an element bubble: only the counter element hurts fully. */
  shielded?: boolean;
  heal?: { radius: number; pct: number; interval: number };
  split?: { into: EnemyId; count: number };
  /** Multiplier on stun duration and pushback (bosses resist). */
  ccResist?: number;
  /** Changes element every N seconds. */
  shiftElement?: number;
  look: EnemyLook;
  color: number;
  /** Encyclopedia tip. */
  tip: string;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  gloop: {
    id: 'gloop',
    name: 'Crystal Beetle',
    blurb: 'A scuttling construct with a crystal shell. The bulk of every Shardbound wave.',
    hp: 32,
    speed: 1.6,
    armor: 0,
    coins: 4,
    lives: 1,
    radius: 0.3,
    elemental: true,
    look: 'beetle',
    color: 0x5fd6c8,
    tip: 'Many beetles carry an element core. Check the icon and counter it.',
  },
  minigloop: {
    id: 'minigloop',
    name: 'Shardling',
    blurb: 'A small beetle that breaks loose when a Geode Brute shatters.',
    hp: 14,
    speed: 1.9,
    armor: 0,
    coins: 1,
    lives: 1,
    radius: 0.2,
    look: 'beetle',
    color: 0x8ff0e2,
    tip: 'Fast and fragile. Splash damage clears them quickly.',
  },
  zoomkin: {
    id: 'zoomkin',
    name: 'Skitter Drone',
    blurb: 'A light drone that skims the ground at high speed.',
    hp: 20,
    speed: 2.9,
    armor: 0,
    coins: 3,
    lives: 1,
    radius: 0.26,
    elemental: true,
    look: 'drone',
    color: 0xffb347,
    tip: 'Very fast. Slow it down or give it a long route.',
  },
  clankbot: {
    id: 'clankbot',
    name: 'Stone Golem',
    blurb: 'A walking slab of rune-carved stone. Slow, but its armor blocks a lot of damage.',
    hp: 46,
    speed: 1.15,
    armor: 0.4,
    coins: 6,
    lives: 1,
    radius: 0.32,
    look: 'golem',
    color: 0x9aa3b8,
    tip: 'Armor 40%. Shadow towers and Ironbark break armor.',
  },
  puffbat: {
    id: 'puffbat',
    name: 'Shadow Wisp',
    blurb: 'A drifting knot of energy. It flies straight over your maze.',
    hp: 24,
    speed: 1.85,
    armor: 0,
    coins: 4,
    lives: 1,
    radius: 0.28,
    flying: true,
    elemental: true,
    look: 'wisp',
    color: 0xa06bff,
    tip: 'Flying: ignores the maze. Impact Cannons and other ground-only towers cannot hit it.',
  },
  mendy: {
    id: 'mendy',
    name: 'Mender Construct',
    blurb: 'A support unit that repairs nearby constructs.',
    hp: 40,
    speed: 1.3,
    armor: 0.1,
    coins: 7,
    lives: 1,
    radius: 0.3,
    heal: { radius: 2, pct: 0.06, interval: 1.6 },
    look: 'mender',
    color: 0x6cffa8,
    tip: 'Repairs allies in a 2-tile radius. Destroy it first.',
  },
  splitblob: {
    id: 'splitblob',
    name: 'Geode Brute',
    blurb: 'A hulking geode packed with Shardlings.',
    hp: 52,
    speed: 1.35,
    armor: 0,
    coins: 5,
    lives: 2,
    radius: 0.36,
    split: { into: 'minigloop', count: 3 },
    look: 'geode',
    color: 0x8c7fb0,
    tip: 'Breaks into 3 Shardlings when destroyed.',
  },
  bubbleimp: {
    id: 'bubbleimp',
    name: 'Warded Sentinel',
    blurb: 'An armored construct inside an elemental ward.',
    hp: 42,
    speed: 1.55,
    armor: 0,
    coins: 6,
    lives: 1,
    radius: 0.3,
    shielded: true,
    look: 'sentinel',
    color: 0xe0c27a,
    tip: 'Its ward blocks 75% of damage unless you hit it with the element that beats the ward.',
  },
  kinggloop: {
    id: 'kinggloop',
    name: 'Prism Matriarch',
    blurb: 'The hive-mother of the crystal beetles.',
    hp: 620,
    speed: 0.85,
    armor: 0.1,
    coins: 80,
    lives: 3,
    radius: 0.62,
    boss: true,
    split: { into: 'gloop', count: 5 },
    ccResist: 0.35,
    look: 'beetle',
    color: 0x52d0b8,
    tip: 'BOSS. Splits into 5 Crystal Beetles when destroyed.',
  },
  bigclank: {
    id: 'bigclank',
    name: 'Iron Titan',
    blurb: 'A colossal golem plated in iron.',
    hp: 520,
    speed: 0.75,
    armor: 0.5,
    coins: 150,
    lives: 4,
    radius: 0.6,
    boss: true,
    ccResist: 0.3,
    look: 'golem',
    color: 0x8e98ae,
    tip: 'BOSS. 50% armor. Break its plating with Shadow or Ironbark.',
  },
  mamapuff: {
    id: 'mamapuff',
    name: 'Tempest Engine',
    blurb: 'A flying war-engine that carries a swarm of wisps.',
    hp: 430,
    speed: 0.95,
    armor: 0.15,
    coins: 180,
    lives: 4,
    radius: 0.62,
    boss: true,
    flying: true,
    split: { into: 'puffbat', count: 5 },
    ccResist: 0.3,
    look: 'drone',
    color: 0xb07cff,
    tip: 'Flying BOSS. Releases 5 Shadow Wisps when destroyed.',
  },
  grumbleking: {
    id: 'grumbleking',
    name: 'Archon Null',
    blurb: 'The ancient construct mind behind the invasion. Its core shifts element.',
    hp: 600,
    speed: 0.7,
    armor: 0.3,
    coins: 400,
    lives: 6,
    radius: 0.68,
    boss: true,
    shiftElement: 6,
    heal: { radius: 2.4, pct: 0.03, interval: 2 },
    ccResist: 0.25,
    look: 'archon',
    color: 0xff8f5a,
    tip: 'FINAL BOSS. Its core changes element every few seconds. Bring several elements.',
  },
};

export const ENEMY_IDS = Object.keys(ENEMIES) as EnemyId[];

/** Element variant names, e.g. "Ember Gloop". */
export const ELEMENT_PREFIX: Record<ElementId, string> = {
  fire: 'Ember',
  water: 'Tide',
  nature: 'Verdant',
  light: 'Radiant',
  shadow: 'Umbral',
  earth: 'Basalt',
};
