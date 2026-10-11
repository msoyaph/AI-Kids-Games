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

export type EnemyLook = 'slime' | 'gremlin' | 'robot' | 'bat' | 'mushroom' | 'imp' | 'king';

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
    name: 'Gloop',
    blurb: 'A wobbly slime that loves shiny things.',
    hp: 32,
    speed: 1.6,
    armor: 0,
    coins: 4,
    lives: 1,
    radius: 0.3,
    elemental: true,
    look: 'slime',
    color: 0x7be06a,
    tip: 'Some Gloops are made of an element. Check the little icon!',
  },
  minigloop: {
    id: 'minigloop',
    name: 'Mini Gloop',
    blurb: 'A teeny slime that pops out of a Splitblob.',
    hp: 14,
    speed: 1.9,
    armor: 0,
    coins: 1,
    lives: 1,
    radius: 0.2,
    look: 'slime',
    color: 0x9cf08e,
    tip: 'Tiny but fast. Splash towers pop lots at once.',
  },
  zoomkin: {
    id: 'zoomkin',
    name: 'Zoomkin',
    blurb: 'A giggly gremlin on roller skates. Zoom zoom!',
    hp: 20,
    speed: 2.9,
    armor: 0,
    coins: 3,
    lives: 1,
    radius: 0.26,
    elemental: true,
    look: 'gremlin',
    color: 0xffa94d,
    tip: 'Very fast! Slow them down with Water or long mazes.',
  },
  clankbot: {
    id: 'clankbot',
    name: 'Clankbot',
    blurb: 'A wind-up robot with a tin hat. Clank clank!',
    hp: 46,
    speed: 1.15,
    armor: 0.4,
    coins: 6,
    lives: 1,
    radius: 0.32,
    look: 'robot',
    color: 0x9fb4c8,
    tip: 'Armor blocks some damage. Shadow towers crack it!',
  },
  puffbat: {
    id: 'puffbat',
    name: 'Puffbat',
    blurb: 'A fluffy flying puffball. It ignores your maze!',
    hp: 24,
    speed: 1.85,
    armor: 0,
    coins: 4,
    lives: 1,
    radius: 0.28,
    flying: true,
    elemental: true,
    look: 'bat',
    color: 0xc79bff,
    tip: 'Flies straight to the castle. Cannons and some towers cannot hit it.',
  },
  mendy: {
    id: 'mendy',
    name: 'Mendy',
    blurb: 'A friendly mushroom that patches up its pals.',
    hp: 40,
    speed: 1.3,
    armor: 0.1,
    coins: 7,
    lives: 1,
    radius: 0.3,
    heal: { radius: 2, pct: 0.06, interval: 1.6 },
    look: 'mushroom',
    color: 0xff6b8a,
    tip: 'Heals nearby creatures. Poof it first!',
  },
  splitblob: {
    id: 'splitblob',
    name: 'Splitblob',
    blurb: 'A big slime full of little slimes.',
    hp: 52,
    speed: 1.35,
    armor: 0,
    coins: 5,
    lives: 2,
    radius: 0.36,
    split: { into: 'minigloop', count: 3 },
    look: 'slime',
    color: 0x5fd4c4,
    tip: 'Splits into 3 Mini Gloops when popped.',
  },
  bubbleimp: {
    id: 'bubbleimp',
    name: 'Bubble Imp',
    blurb: 'A cheeky imp inside an element bubble.',
    hp: 42,
    speed: 1.55,
    armor: 0,
    coins: 6,
    lives: 1,
    radius: 0.3,
    shielded: true,
    look: 'imp',
    color: 0xffd36b,
    tip: 'Its bubble blocks most damage. Use the element that beats the bubble!',
  },
  kinggloop: {
    id: 'kinggloop',
    name: 'King Gloop',
    blurb: 'The biggest, bounciest slime. He wears a tiny crown.',
    hp: 620,
    speed: 0.85,
    armor: 0.1,
    coins: 80,
    lives: 3,
    radius: 0.62,
    boss: true,
    split: { into: 'gloop', count: 5 },
    ccResist: 0.35,
    look: 'slime',
    color: 0x5bd96a,
    tip: 'BOSS! Splits into 5 Gloops when popped.',
  },
  bigclank: {
    id: 'bigclank',
    name: 'Big Clank',
    blurb: 'A giant wind-up robot with a huge key on its back.',
    hp: 520,
    speed: 0.75,
    armor: 0.5,
    coins: 150,
    lives: 4,
    radius: 0.6,
    boss: true,
    ccResist: 0.3,
    look: 'robot',
    color: 0x8aa0bb,
    tip: 'BOSS! Super armored. Crack it with Shadow or Ironbark.',
  },
  mamapuff: {
    id: 'mamapuff',
    name: 'Mama Puff',
    blurb: 'A huge fluffy bat. Her babies ride along!',
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
    look: 'bat',
    color: 0xb07cff,
    tip: 'Flying BOSS! Make sure your towers can hit flyers.',
  },
  grumbleking: {
    id: 'grumbleking',
    name: 'Grumble King',
    blurb: 'The grumpy leader with a color-changing crown.',
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
    look: 'king',
    color: 0xff8f5a,
    tip: 'FINAL BOSS! His crown changes element. Mix many elements!',
  },
};

export const ENEMY_IDS = Object.keys(ENEMIES) as EnemyId[];

/** Element variant names, e.g. "Ember Gloop". */
export const ELEMENT_PREFIX: Record<ElementId, string> = {
  fire: 'Ember',
  water: 'Splash',
  nature: 'Leafy',
  light: 'Shiny',
  shadow: 'Gloomy',
  earth: 'Pebbly',
};
