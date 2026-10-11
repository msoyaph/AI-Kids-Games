import type { ElementId } from './elements';

export type TowerId =
  // basic
  | 'arrow'
  | 'cannon'
  // element
  | 'flame'
  | 'bubble'
  | 'thorn'
  | 'prism'
  | 'shade'
  | 'rumble'
  // combos
  | 'steam'
  | 'wildfire'
  | 'solar'
  | 'wisp'
  | 'magma'
  | 'raingarden'
  | 'rainbow'
  | 'whirlpool'
  | 'quicksand'
  | 'sunflower'
  | 'nightshade'
  | 'ironbark'
  | 'eclipse'
  | 'crystal'
  | 'gravity';

export type TowerKind = 'basic' | 'element' | 'combo';

/** How a tower attacks. Adding a new tower = data + (at most) one new behavior in sim/behaviors.ts. */
export type BehaviorId = 'bullet' | 'chain' | 'beam' | 'pulse' | 'mortar';

export type TargetMode = 'first' | 'last' | 'strong' | 'close';
export const TARGET_MODES: readonly TargetMode[] = ['first', 'last', 'strong', 'close'];
export const TARGET_MODE_LABEL: Record<TargetMode, string> = {
  first: 'First',
  last: 'Last',
  strong: 'Strongest',
  close: 'Closest',
};

export type ProjectileStyle =
  | 'arrow'
  | 'cannonball'
  | 'fireball'
  | 'bubble'
  | 'thorn'
  | 'shadowOrb'
  | 'steamPuff'
  | 'seed'
  | 'wisp'
  | 'lava'
  | 'drop'
  | 'sunSeed'
  | 'shard'
  | 'poisonOrb'
  | 'bark'
  | 'flare';

export interface TowerStats {
  cost: number;
  /** Damage per hit (per pulse for 'pulse', damage-per-second for 'beam'). */
  damage: number;
  /** Range in tiles. */
  range: number;
  /** Attacks per second. */
  rate: number;
  splash?: number;
  /** Extra bounce targets for 'chain'. */
  chain?: number;
  chainFalloff?: number;
  /** Simultaneous targets for 'bullet' (multishot). */
  shots?: number;
  slow?: number;
  slowTime?: number;
  burnDps?: number;
  burnTime?: number;
  poisonDps?: number;
  poisonTime?: number;
  poisonStacks?: number;
  /** On death, poison jumps to this many nearby creatures. */
  poisonSpread?: number;
  stunChance?: number;
  stunTime?: number;
  armorBreak?: number;
  armorBreakTime?: number;
  critChance?: number;
  critMult?: number;
  /** Push creatures back along the path (tiles). */
  pushback?: number;
  /** Ground zone left on impact. */
  zoneDps?: number;
  zoneTime?: number;
  zoneRadius?: number;
  zoneSlow?: number;
  /** Aura that buffs nearby towers / boosts coins. */
  auraRadius?: number;
  auraRate?: number;
  auraDamage?: number;
  auraCoins?: number;
  /** Beam ramps up to this multiplier over beamRampTime seconds on one target. */
  beamRamp?: number;
  beamRampTime?: number;
}

export interface TowerLook {
  /** Silhouette family used by the procedural painter. */
  shape:
    | 'post'
    | 'cannon'
    | 'spire'
    | 'fountain'
    | 'bloom'
    | 'prism'
    | 'lantern'
    | 'rock'
    | 'vent'
    | 'tree'
    | 'orb'
    | 'mortar'
    | 'totem'
    | 'flower'
    | 'crystal'
    | 'well';
  body: number;
  accent: number;
}

export interface TowerDef {
  id: TowerId;
  name: string;
  kind: TowerKind;
  elements: ElementId[];
  behavior: BehaviorId;
  targets: 'ground' | 'both';
  projectile?: ProjectileStyle;
  /** Head turns to face its target. */
  rotates: boolean;
  levels: TowerStats[];
  /** One short line a 7-year-old can read. */
  blurb: string;
  /** Name of the special ability, shown as a chip. */
  ability: string;
  look: TowerLook;
}

export const MAX_LEVEL = 4;
export const SELL_REFUND = 0.75;

/** Fields that grow with the damage multiplier as a tower levels up. */
const DAMAGE_LIKE: (keyof TowerStats)[] = ['damage', 'burnDps', 'poisonDps', 'zoneDps'];

/**
 * Build 4 levels from a base stat block. `dmg` multiplies damage-like fields,
 * range grows a little each level, and `tweaks` override anything per level.
 */
export function makeLevels(
  base: Omit<TowerStats, 'cost'>,
  costs: readonly [number, number, number, number],
  dmg: readonly [number, number, number, number],
  tweaks: Partial<TowerStats>[] = [],
  rangeStep = 0.15,
): TowerStats[] {
  const out: TowerStats[] = [];
  let acc: Partial<TowerStats> = {};
  for (let i = 0; i < 4; i++) {
    acc = { ...acc, ...(tweaks[i] ?? {}) };
    const lv: TowerStats = { ...base, ...acc, cost: costs[i]!, range: (acc.range ?? base.range) + rangeStep * i };
    for (const key of DAMAGE_LIKE) {
      const v = (lv[key] as number | undefined) ?? undefined;
      if (v !== undefined && !(key in acc)) (lv[key] as number) = Math.round(v * dmg[i]! * 10) / 10;
    }
    out.push(lv);
  }
  return out;
}

const BASIC_COST = [20, 25, 45, 80] as const;
const ELEMENT_COST = [60, 70, 120, 200] as const;
const COMBO_COST = [150, 160, 260, 420] as const;
const ELEMENT_DMG = [1, 2, 3.8, 7] as const;
const COMBO_DMG = [1, 1.9, 3.5, 6.2] as const;

export const TOWERS: Record<TowerId, TowerDef> = {
  // ---------------------------------------------------------------- basic
  arrow: {
    id: 'arrow',
    name: 'Bolt Turret',
    kind: 'basic',
    elements: [],
    behavior: 'bullet',
    targets: 'both',
    projectile: 'arrow',
    rotates: true,
    levels: makeLevels({ damage: 8, range: 3.2, rate: 1.5 }, BASIC_COST, [1, 2, 3.7, 6.5], [{}, {}, { rate: 1.7 }, { rate: 1.9 }]),
    blurb: 'Fast, cheap twin-rail turret. The backbone of every maze.',
    ability: 'Rapid fire',
    look: { shape: 'post', body: 0x56658a, accent: 0x3ee6ff },
  },
  cannon: {
    id: 'cannon',
    name: 'Impact Cannon',
    kind: 'basic',
    elements: [],
    behavior: 'bullet',
    targets: 'ground',
    projectile: 'cannonball',
    rotates: true,
    levels: makeLevels(
      { damage: 16, range: 2.8, rate: 0.8, splash: 0.9 },
      [35, 40, 70, 120],
      [1, 2, 3.7, 6.5],
      [{}, {}, { splash: 1.05 }, { splash: 1.2 }],
    ),
    blurb: "Heavy shells that hit a whole group. Can't target flyers.",
    ability: 'Splash',
    look: { shape: 'cannon', body: 0x4f5c7c, accent: 0xffb347 },
  },

  // -------------------------------------------------------------- element
  flame: {
    id: 'flame',
    name: 'Pyre Spire',
    kind: 'element',
    elements: ['fire'],
    behavior: 'bullet',
    targets: 'both',
    projectile: 'fireball',
    rotates: false,
    levels: makeLevels(
      { damage: 20, range: 3.0, rate: 0.9, splash: 1.0, burnDps: 6, burnTime: 2 },
      ELEMENT_COST,
      ELEMENT_DMG,
      [{}, {}, { splash: 1.15 }, { splash: 1.3 }],
    ),
    blurb: 'Lobs fire cores that splash and leave targets burning.',
    ability: 'Splash + Burn',
    look: { shape: 'spire', body: 0xd9583a, accent: 0xffb347 },
  },
  bubble: {
    id: 'bubble',
    name: 'Tidecaller',
    kind: 'element',
    elements: ['water'],
    behavior: 'bullet',
    targets: 'both',
    projectile: 'bubble',
    rotates: false,
    levels: makeLevels(
      { damage: 14, range: 3.0, rate: 1.2, slow: 0.35, slowTime: 2 },
      ELEMENT_COST,
      ELEMENT_DMG,
      [{}, { slow: 0.4 }, { slow: 0.45, splash: 0.6 }, { slow: 0.5, splash: 0.8 }],
    ),
    blurb: 'Pressurized water bolts that slow whatever they hit.',
    ability: 'Slow',
    look: { shape: 'fountain', body: 0x3d8fe0, accent: 0xaee8ff },
  },
  thorn: {
    id: 'thorn',
    name: 'Briar Launcher',
    kind: 'element',
    elements: ['nature'],
    behavior: 'bullet',
    targets: 'both',
    projectile: 'thorn',
    rotates: true,
    levels: makeLevels(
      { damage: 8, range: 3.2, rate: 1.1, poisonDps: 10, poisonTime: 4, poisonStacks: 3 },
      ELEMENT_COST,
      ELEMENT_DMG,
      [{}, {}, { poisonStacks: 4 }, { poisonStacks: 5 }],
    ),
    blurb: 'Fires toxic spines. Poison stacks and ignores armor.',
    ability: 'Poison',
    look: { shape: 'bloom', body: 0x3aa84a, accent: 0xff7ac8 },
  },
  prism: {
    id: 'prism',
    name: 'Arc Prism',
    kind: 'element',
    elements: ['light'],
    behavior: 'chain',
    targets: 'both',
    rotates: false,
    levels: makeLevels(
      { damage: 16, range: 3.4, rate: 1.0, chain: 2, chainFalloff: 0.8 },
      ELEMENT_COST,
      ELEMENT_DMG,
      [{}, { chain: 3 }, { chain: 3 }, { chain: 4 }],
    ),
    blurb: 'Arcs of light that jump from target to target.',
    ability: 'Chain',
    look: { shape: 'prism', body: 0xf2c230, accent: 0xfff3a6 },
  },
  shade: {
    id: 'shade',
    name: 'Umbral Lantern',
    kind: 'element',
    elements: ['shadow'],
    behavior: 'bullet',
    targets: 'both',
    projectile: 'shadowOrb',
    rotates: false,
    levels: makeLevels(
      { damage: 30, range: 3.6, rate: 0.7, armorBreak: 0.2, armorBreakTime: 3, critChance: 0.2, critMult: 2 },
      ELEMENT_COST,
      ELEMENT_DMG,
      [{}, {}, { armorBreak: 0.25 }, { armorBreak: 0.3, critChance: 0.25 }],
    ),
    blurb: 'Void orbs that crack armor and land critical hits.',
    ability: 'Armor break',
    look: { shape: 'lantern', body: 0x6b3fc4, accent: 0xd8b6ff },
  },
  rumble: {
    id: 'rumble',
    name: 'Quake Pylon',
    kind: 'element',
    elements: ['earth'],
    behavior: 'pulse',
    targets: 'ground',
    rotates: false,
    levels: makeLevels(
      { damage: 20, range: 1.8, rate: 0.6, stunChance: 0.2, stunTime: 0.6 },
      ELEMENT_COST,
      ELEMENT_DMG,
      [{}, {}, { stunChance: 0.25 }, { stunChance: 0.3, stunTime: 0.8 }],
      0.1,
    ),
    blurb: 'Slams the ground, damaging everything nearby. Can stun.',
    ability: 'Shockwave + Stun',
    look: { shape: 'rock', body: 0xa8784a, accent: 0xffe08a },
  },

  // ---------------------------------------------------------------- combos
  steam: {
    id: 'steam',
    name: 'Vapor Vent',
    kind: 'combo',
    elements: ['fire', 'water'],
    behavior: 'bullet',
    targets: 'both',
    projectile: 'steamPuff',
    rotates: false,
    levels: makeLevels(
      { damage: 18, range: 3.2, rate: 0.6, splash: 1.0, zoneDps: 16, zoneTime: 3, zoneRadius: 1.2, zoneSlow: 0.4 },
      COMBO_COST,
      COMBO_DMG,
      [{}, {}, { zoneSlow: 0.45, zoneRadius: 1.35 }, { zoneSlow: 0.5, zoneRadius: 1.5 }],
    ),
    blurb: 'Blasts scalding clouds that slow and damage everything inside.',
    ability: 'Slow field',
    look: { shape: 'vent', body: 0x8fa3b8, accent: 0xff9b6a },
  },
  wildfire: {
    id: 'wildfire',
    name: 'Wildfire Kiln',
    kind: 'combo',
    elements: ['fire', 'nature'],
    behavior: 'bullet',
    targets: 'both',
    projectile: 'seed',
    rotates: false,
    levels: makeLevels(
      { damage: 26, range: 3.2, rate: 0.9, splash: 1.2, burnDps: 12, burnTime: 3, poisonDps: 10, poisonTime: 4, poisonStacks: 3 },
      COMBO_COST,
      COMBO_DMG,
    ),
    blurb: 'Seeds that burst into burning, poisonous embers.',
    ability: 'Burn + Poison',
    look: { shape: 'flower', body: 0xe8642c, accent: 0x9be15d },
  },
  solar: {
    id: 'solar',
    name: 'Sunforge',
    kind: 'combo',
    elements: ['fire', 'light'],
    behavior: 'bullet',
    targets: 'both',
    projectile: 'flare',
    rotates: false,
    levels: makeLevels({ damage: 90, range: 4.2, rate: 0.35, splash: 1.8, burnDps: 10, burnTime: 2 }, COMBO_COST, COMBO_DMG),
    blurb: 'Charges a miniature star and drops it for massive splash damage.',
    ability: 'Mega splash',
    look: { shape: 'orb', body: 0xffa630, accent: 0xfff27a },
  },
  wisp: {
    id: 'wisp',
    name: 'Cinder Wisp',
    kind: 'combo',
    elements: ['fire', 'shadow'],
    behavior: 'bullet',
    targets: 'both',
    projectile: 'wisp',
    rotates: false,
    levels: makeLevels(
      { damage: 24, range: 3.4, rate: 1.1, shots: 2, burnDps: 8, burnTime: 2, armorBreak: 0.15, armorBreakTime: 3 },
      COMBO_COST,
      COMBO_DMG,
      [{}, {}, { shots: 3 }, { shots: 3 }],
    ),
    blurb: 'Releases homing embers at several targets at once.',
    ability: 'Multi-shot',
    look: { shape: 'lantern', body: 0x7d2c8f, accent: 0xff7a3d },
  },
  magma: {
    id: 'magma',
    name: 'Magma Mortar',
    kind: 'combo',
    elements: ['fire', 'earth'],
    behavior: 'mortar',
    targets: 'ground',
    projectile: 'lava',
    rotates: true,
    levels: makeLevels(
      { damage: 48, range: 4.6, rate: 0.45, splash: 1.3, zoneDps: 20, zoneTime: 3, zoneRadius: 1.0 },
      COMBO_COST,
      COMBO_DMG,
    ),
    blurb: 'Lobs molten slag that leaves burning pools on the path.',
    ability: 'Lava pools',
    look: { shape: 'mortar', body: 0x7a4a33, accent: 0xff5a1f },
  },
  raingarden: {
    id: 'raingarden',
    name: 'Monsoon Grove',
    kind: 'combo',
    elements: ['water', 'nature'],
    behavior: 'bullet',
    targets: 'both',
    projectile: 'drop',
    rotates: false,
    levels: makeLevels(
      { damage: 12, range: 3.0, rate: 1.2, slow: 0.2, slowTime: 1.5, auraRadius: 2.2, auraRate: 0.2 },
      COMBO_COST,
      COMBO_DMG,
      [{}, { auraRate: 0.25 }, { auraRate: 0.3 }, { auraRate: 0.35, auraRadius: 2.5 }],
    ),
    blurb: 'Charged rain that speeds up every tower in its radius.',
    ability: 'Attack-speed aura',
    look: { shape: 'tree', body: 0x2e9e7a, accent: 0x8fd8ff },
  },
  rainbow: {
    id: 'rainbow',
    name: 'Spectrum Array',
    kind: 'combo',
    elements: ['water', 'light'],
    behavior: 'chain',
    targets: 'both',
    rotates: false,
    levels: makeLevels(
      { damage: 22, range: 3.6, rate: 1.0, chain: 5, chainFalloff: 0.9, slow: 0.15, slowTime: 1 },
      COMBO_COST,
      COMBO_DMG,
      [{}, {}, { chain: 6 }, { chain: 7 }],
    ),
    blurb: 'A split beam of light that chains through huge groups.',
    ability: 'Long chain',
    look: { shape: 'crystal', body: 0x6fd0ff, accent: 0xff8ad8 },
  },
  whirlpool: {
    id: 'whirlpool',
    name: 'Maelstrom Well',
    kind: 'combo',
    elements: ['water', 'shadow'],
    behavior: 'pulse',
    targets: 'ground',
    rotates: false,
    levels: makeLevels(
      { damage: 18, range: 2.0, rate: 0.5, pushback: 0.6, slow: 0.5, slowTime: 1.5 },
      COMBO_COST,
      COMBO_DMG,
      [{}, {}, { pushback: 0.75 }, { pushback: 0.9 }],
      0.1,
    ),
    blurb: 'A vortex that drags enemies back along the path.',
    ability: 'Push back',
    look: { shape: 'well', body: 0x3b4fb8, accent: 0x9cf0ff },
  },
  quicksand: {
    id: 'quicksand',
    name: 'Mire Obelisk',
    kind: 'combo',
    elements: ['water', 'earth'],
    behavior: 'pulse',
    targets: 'ground',
    rotates: false,
    levels: makeLevels(
      { damage: 14, range: 2.2, rate: 0.8, slow: 0.55, slowTime: 2, stunChance: 0.1, stunTime: 0.8 },
      COMBO_COST,
      COMBO_DMG,
      [{}, {}, { slow: 0.6 }, { slow: 0.65, stunChance: 0.15 }],
      0.1,
    ),
    blurb: 'Turns the ground to sludge: heavy slow and the odd stun.',
    ability: 'Heavy slow',
    look: { shape: 'totem', body: 0xb08a4f, accent: 0x5ec8e8 },
  },
  sunflower: {
    id: 'sunflower',
    name: 'Gilded Bloom',
    kind: 'combo',
    elements: ['nature', 'light'],
    behavior: 'bullet',
    targets: 'both',
    projectile: 'sunSeed',
    rotates: false,
    levels: makeLevels(
      { damage: 22, range: 3.2, rate: 1.2, auraRadius: 2.6, auraCoins: 0.5 },
      COMBO_COST,
      COMBO_DMG,
      [{}, {}, { auraCoins: 0.6 }, { auraCoins: 0.75 }],
    ),
    blurb: 'Enemies destroyed in its radius drop bonus gold.',
    ability: 'Gold aura',
    look: { shape: 'flower', body: 0x8a5a2b, accent: 0xffd52e },
  },
  nightshade: {
    id: 'nightshade',
    name: 'Nightshade',
    kind: 'combo',
    elements: ['nature', 'shadow'],
    behavior: 'bullet',
    targets: 'both',
    projectile: 'poisonOrb',
    rotates: false,
    levels: makeLevels(
      { damage: 14, range: 3.4, rate: 0.9, poisonDps: 28, poisonTime: 5, poisonStacks: 4, poisonSpread: 2 },
      COMBO_COST,
      COMBO_DMG,
      [{}, {}, { poisonSpread: 3 }, { poisonSpread: 3, poisonStacks: 5 }],
    ),
    blurb: 'Virulent poison that spreads to nearby enemies on defeat.',
    ability: 'Spreading poison',
    look: { shape: 'bloom', body: 0x4b2a7a, accent: 0x9be15d },
  },
  ironbark: {
    id: 'ironbark',
    name: 'Ironbark',
    kind: 'combo',
    elements: ['nature', 'earth'],
    behavior: 'bullet',
    targets: 'both',
    projectile: 'bark',
    rotates: true,
    levels: makeLevels(
      { damage: 68, range: 3.2, rate: 0.6, armorBreak: 0.3, armorBreakTime: 5, stunChance: 0.15, stunTime: 0.8 },
      COMBO_COST,
      COMBO_DMG,
    ),
    blurb: 'Hurls ironwood spikes that shatter armor and can stun.',
    ability: 'Armor smash',
    look: { shape: 'tree', body: 0x6b4a2b, accent: 0x7bd36a },
  },
  eclipse: {
    id: 'eclipse',
    name: 'Eclipse Beam',
    kind: 'combo',
    elements: ['light', 'shadow'],
    behavior: 'beam',
    targets: 'both',
    rotates: true,
    levels: makeLevels(
      { damage: 34, range: 3.8, rate: 1, beamRamp: 3, beamRampTime: 3 },
      COMBO_COST,
      COMBO_DMG,
      [{}, {}, { beamRamp: 3.5 }, { beamRamp: 4 }],
    ),
    blurb: 'A focused beam that grows stronger the longer it holds a target.',
    ability: 'Ramping beam',
    look: { shape: 'orb', body: 0x3a2a6b, accent: 0xffe66b },
  },
  crystal: {
    id: 'crystal',
    name: 'Shardstorm Spire',
    kind: 'combo',
    elements: ['light', 'earth'],
    behavior: 'bullet',
    targets: 'both',
    projectile: 'shard',
    rotates: false,
    levels: makeLevels(
      { damage: 30, range: 3.8, rate: 1.0, shots: 3, critChance: 0.25, critMult: 2.5 },
      COMBO_COST,
      COMBO_DMG,
      [{}, {}, { shots: 4 }, { shots: 4, critChance: 0.3 }],
    ),
    blurb: 'Fires crystal shards at several targets with a high crit chance.',
    ability: 'Multi-shot + Crit',
    look: { shape: 'crystal', body: 0xb98a56, accent: 0xfff0a0 },
  },
  gravity: {
    id: 'gravity',
    name: 'Gravity Well',
    kind: 'combo',
    elements: ['shadow', 'earth'],
    behavior: 'pulse',
    targets: 'both',
    rotates: false,
    levels: makeLevels(
      { damage: 34, range: 2.0, rate: 0.33, stunChance: 1, stunTime: 0.9, slow: 0.3, slowTime: 2 },
      COMBO_COST,
      COMBO_DMG,
      [{}, {}, { stunTime: 1.0 }, { stunTime: 1.2 }],
      0.12,
    ),
    blurb: 'Collapses space around it, stunning everything caught in the pulse.',
    ability: 'Area stun',
    look: { shape: 'well', body: 0x4a2f6b, accent: 0xc49bff },
  },
};

export const BASIC_TOWERS: TowerId[] = ['arrow', 'cannon'];
export const ELEMENT_TOWERS: Record<string, TowerId> = {
  fire: 'flame',
  water: 'bubble',
  nature: 'thorn',
  light: 'prism',
  shadow: 'shade',
  earth: 'rumble',
};
export const TOWER_IDS = Object.keys(TOWERS) as TowerId[];
export const COMBO_TOWERS = TOWER_IDS.filter((id) => TOWERS[id].kind === 'combo');

/** Find the combo tower made from two elements (order doesn't matter). */
export function comboFor(a: ElementId, b: ElementId): TowerId | null {
  for (const id of COMBO_TOWERS) {
    const els = TOWERS[id].elements;
    if ((els[0] === a && els[1] === b) || (els[0] === b && els[1] === a)) return id;
  }
  return null;
}

export function totalCost(id: TowerId, level: number): number {
  const lv = TOWERS[id].levels;
  let sum = 0;
  for (let i = 0; i < level; i++) sum += lv[i]!.cost;
  return sum;
}

export function sellValue(invested: number): number {
  return Math.floor(invested * SELL_REFUND);
}

/** Is this tower buildable with the given unlocked elements? */
export function towerUnlocked(id: TowerId, unlocked: readonly ElementId[]): boolean {
  return TOWERS[id].elements.every((e) => unlocked.includes(e));
}
