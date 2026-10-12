import { localized, t } from '../i18n';
import type { ElementId } from './elements';
import { applySpec, TUNING, type SpecTowerId } from './tuning';

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
/** Translated targeting-mode label. */
export function targetModeLabel(mode: TargetMode): string {
  return t(`target.${mode}`);
}

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
  /** Reveals cloaked constructs in range (specializations). */
  detect?: boolean;
  /** Damage multiplier against bosses / flyers. */
  bossMult?: number;
  airMult?: number;
  /** Multiplies damage that gets through an elemental ward (and damage to breakable shields). */
  wardBreak?: number;
}

/** How a specialization changes the look of the tower head (L3/L4). */
export type SpecLook = 'lance' | 'array' | 'bastion' | 'halo' | 'flare';

/** One of the two level-3 paths of an element or combo tower. */
export interface SpecDef {
  /** Stable id: `<tower>.<key>`, e.g. `flame.inferno`. */
  id: string;
  key: string;
  index: 0 | 1;
  /** Stats for level 3 and level 4 on this path. */
  levels: [TowerStats, TowerStats];
  look: SpecLook;
  /** Translated (`spec.<tower>.<key>.name` / `.desc`). */
  readonly name: string;
  readonly desc: string;
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
  /** Translated (reads the current language). */
  readonly name: string;
  kind: TowerKind;
  elements: ElementId[];
  behavior: BehaviorId;
  targets: 'ground' | 'both';
  projectile?: ProjectileStyle;
  /** Head turns to face its target. */
  rotates: boolean;
  /** Stats per level, from TUNING.towers (levels 3–4 are replaced by the chosen spec). */
  levels: TowerStats[];
  /** Two level-3 specializations (element and combo towers). */
  specs?: [SpecDef, SpecDef];
  /** One short line (translated). */
  readonly blurb: string;
  /** Name of the special ability, shown as a chip (translated). */
  readonly ability: string;
  look: TowerLook;
}

export const MAX_LEVEL = 4;
export const SELL_REFUND = TUNING.economy.sellRefund;

type TowerIdentity = Omit<TowerDef, 'id' | 'name' | 'blurb' | 'ability' | 'levels'>;

/** Identity and looks only — numbers live in TUNING.towers, text in i18n (`tower.<id>.*`). */
const IDENTITY: Record<TowerId, TowerIdentity> = {
  arrow: { kind: 'basic', elements: [], behavior: 'bullet', targets: 'both', projectile: 'arrow', rotates: true, look: { shape: 'post', body: 0x56658a, accent: 0x3ee6ff } },
  cannon: { kind: 'basic', elements: [], behavior: 'bullet', targets: 'ground', projectile: 'cannonball', rotates: true, look: { shape: 'cannon', body: 0x4f5c7c, accent: 0xffb347 } },
  flame: { kind: 'element', elements: ['fire'], behavior: 'bullet', targets: 'both', projectile: 'fireball', rotates: false, look: { shape: 'spire', body: 0xd9583a, accent: 0xffb347 } },
  bubble: { kind: 'element', elements: ['water'], behavior: 'bullet', targets: 'both', projectile: 'bubble', rotates: false, look: { shape: 'fountain', body: 0x3d8fe0, accent: 0xaee8ff } },
  thorn: { kind: 'element', elements: ['nature'], behavior: 'bullet', targets: 'both', projectile: 'thorn', rotates: true, look: { shape: 'bloom', body: 0x3aa84a, accent: 0xff7ac8 } },
  prism: { kind: 'element', elements: ['light'], behavior: 'chain', targets: 'both', rotates: false, look: { shape: 'prism', body: 0xf2c230, accent: 0xfff3a6 } },
  shade: { kind: 'element', elements: ['shadow'], behavior: 'bullet', targets: 'both', projectile: 'shadowOrb', rotates: false, look: { shape: 'lantern', body: 0x6b3fc4, accent: 0xd8b6ff } },
  rumble: { kind: 'element', elements: ['earth'], behavior: 'pulse', targets: 'ground', rotates: false, look: { shape: 'rock', body: 0xa8784a, accent: 0xffe08a } },
  steam: { kind: 'combo', elements: ['fire', 'water'], behavior: 'bullet', targets: 'both', projectile: 'steamPuff', rotates: false, look: { shape: 'vent', body: 0x8fa3b8, accent: 0xff9b6a } },
  wildfire: { kind: 'combo', elements: ['fire', 'nature'], behavior: 'bullet', targets: 'both', projectile: 'seed', rotates: false, look: { shape: 'flower', body: 0xe8642c, accent: 0x9be15d } },
  solar: { kind: 'combo', elements: ['fire', 'light'], behavior: 'bullet', targets: 'both', projectile: 'flare', rotates: false, look: { shape: 'orb', body: 0xffa630, accent: 0xfff27a } },
  wisp: { kind: 'combo', elements: ['fire', 'shadow'], behavior: 'bullet', targets: 'both', projectile: 'wisp', rotates: false, look: { shape: 'lantern', body: 0x7d2c8f, accent: 0xff7a3d } },
  magma: { kind: 'combo', elements: ['fire', 'earth'], behavior: 'mortar', targets: 'ground', projectile: 'lava', rotates: true, look: { shape: 'mortar', body: 0x7a4a33, accent: 0xff5a1f } },
  raingarden: { kind: 'combo', elements: ['water', 'nature'], behavior: 'bullet', targets: 'both', projectile: 'drop', rotates: false, look: { shape: 'tree', body: 0x2e9e7a, accent: 0x8fd8ff } },
  rainbow: { kind: 'combo', elements: ['water', 'light'], behavior: 'chain', targets: 'both', rotates: false, look: { shape: 'crystal', body: 0x6fd0ff, accent: 0xff8ad8 } },
  whirlpool: { kind: 'combo', elements: ['water', 'shadow'], behavior: 'pulse', targets: 'ground', rotates: false, look: { shape: 'well', body: 0x3b4fb8, accent: 0x9cf0ff } },
  quicksand: { kind: 'combo', elements: ['water', 'earth'], behavior: 'pulse', targets: 'ground', rotates: false, look: { shape: 'totem', body: 0xb08a4f, accent: 0x5ec8e8 } },
  sunflower: { kind: 'combo', elements: ['nature', 'light'], behavior: 'bullet', targets: 'both', projectile: 'sunSeed', rotates: false, look: { shape: 'flower', body: 0x8a5a2b, accent: 0xffd52e } },
  nightshade: { kind: 'combo', elements: ['nature', 'shadow'], behavior: 'bullet', targets: 'both', projectile: 'poisonOrb', rotates: false, look: { shape: 'bloom', body: 0x4b2a7a, accent: 0x9be15d } },
  ironbark: { kind: 'combo', elements: ['nature', 'earth'], behavior: 'bullet', targets: 'both', projectile: 'bark', rotates: true, look: { shape: 'tree', body: 0x6b4a2b, accent: 0x7bd36a } },
  eclipse: { kind: 'combo', elements: ['light', 'shadow'], behavior: 'beam', targets: 'both', rotates: true, look: { shape: 'orb', body: 0x3a2a6b, accent: 0xffe66b } },
  crystal: { kind: 'combo', elements: ['light', 'earth'], behavior: 'bullet', targets: 'both', projectile: 'shard', rotates: false, look: { shape: 'crystal', body: 0xb98a56, accent: 0xfff0a0 } },
  gravity: { kind: 'combo', elements: ['shadow', 'earth'], behavior: 'pulse', targets: 'both', rotates: false, look: { shape: 'well', body: 0x4a2f6b, accent: 0xc49bff } },
};

export const TOWERS = {} as Record<TowerId, TowerDef>;
for (const id of Object.keys(IDENTITY) as TowerId[]) {
  const def = localized({ id, ...IDENTITY[id], levels: TUNING.towers[id] } as TowerDef, `tower.${id}`, ['name', 'blurb', 'ability'] as const);
  const mods = TUNING.specs[id as SpecTowerId];
  if (mods) {
    def.specs = mods.map((m, index) =>
      localized(
        { id: `${id}.${m.key}`, key: m.key, index, look: m.look, levels: [applySpec(def.levels[2]!, m), applySpec(def.levels[3]!, m)] } as SpecDef,
        `spec.${id}.${m.key}`,
        ['name', 'desc'] as const,
      ),
    ) as [SpecDef, SpecDef];
  }
  TOWERS[id] = def;
}

/** Level at which a tower picks its specialization. */
export const SPEC_LEVEL = 3;

/** Stats for a tower at `level` on spec path `spec` (-1 = none). */
export function statsFor(def: TowerDef, level: number, spec: number): TowerStats {
  if (spec >= 0 && level >= SPEC_LEVEL && def.specs) return def.specs[spec]!.levels[level - SPEC_LEVEL]!;
  return def.levels[level - 1]!;
}

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
