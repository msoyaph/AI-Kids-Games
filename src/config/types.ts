/** Shared types for all tuning/config data. */

export type StatKey =
  | 'maxHp'
  | 'regen'
  | 'armor'
  | 'moveSpeed'
  | 'might'
  | 'cooldown'
  | 'area'
  | 'amount'
  | 'duration'
  | 'projSpeed'
  | 'magnet'
  | 'luck'
  | 'growth'
  | 'greed'
  | 'revival'
  | 'crit'
  | 'reroll'
  | 'skip'
  | 'banish';

/**
 * Player stats. Everything except maxHp/regen/armor/magnet/amount/revival/reroll is a
 * fractional bonus (0.1 = +10%). Final values are derived in sim/stats.ts.
 */
export type PlayerStats = Record<StatKey, number>;

export type WeaponBehavior =
  | 'aura'
  | 'projectile'
  | 'orbit'
  | 'burst'
  | 'chain'
  | 'boomerang'
  | 'hazard'
  | 'homing';

export type ProjectileVisual =
  | 'none'
  | 'dart'
  | 'lantern'
  | 'disc'
  | 'bee'
  | 'shard'
  | 'seed'
  | 'enemyOrb'
  | 'enemySpore';

/** Enemy shot looks (EnemyProjectilePool.visual). */
export const ShotVisual = { Orb: 0, Spore: 1, Shard: 2 } as const;

export interface WeaponStats {
  /** Damage per hit before player might. */
  damage: number;
  /** Seconds between activations. */
  cooldown: number;
  /** Radius / size in world units (scaled by player area). */
  area: number;
  /** Projectile speed (u/s) or orbit angular speed (rad/s). */
  speed: number;
  /** Projectiles / orbs / bolts / patches per activation (+ player amount). */
  amount: number;
  /** Extra enemies a projectile may pass through. */
  pierce: number;
  /** Lifetime of projectiles / hazards / orbit activity (scaled by player duration). */
  duration: number;
  knockback: number;
  /** Minimum seconds between two hits on the same enemy for persistent damage sources. */
  hitInterval: number;
  /** Targeting / acquisition range. */
  range: number;
  /** Chain jumps (lightning). */
  chain: number;
  /** Slow applied on hit (0..1 fraction of speed removed). */
  slow: number;
  /** Explosion radius on hit (0 = none). */
  explode: number;
  /** Additive crit chance for this weapon. */
  crit: number;
}

export interface WeaponLevel {
  text: string;
  delta: Partial<WeaponStats>;
}

export interface WeaponDef {
  id: string;
  name: string;
  description: string;
  behavior: WeaponBehavior;
  base: WeaponStats;
  /** Upgrades for levels 2..maxLevel (index 0 → level 2). maxLevel = levels.length + 1. */
  levels: WeaponLevel[];
  visual: { color: number; kind: ProjectileVisual; scale?: number };
  sfx: string;
  /** Achievement id that unlocks it; undefined = available from the start. */
  unlock?: string;
  /** True for evolved forms — never offered as a "new weapon". */
  evolved?: boolean;
  /** Relative chance to appear in upgrade picks. */
  weight: number;
}

export interface PassiveDef {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  perLevel: Partial<PlayerStats>;
  color: number;
  unlock?: string;
  weight: number;
}

export interface EvolutionDef {
  weapon: string;
  passive: string;
  into: string;
}

export type EnemyBehavior =
  | 'chaser'
  | 'swarmer'
  | 'tank'
  | 'ranged'
  | 'charger'
  | 'splitter'
  | 'exploder'
  | 'boss';

export interface EnemyDef {
  id: string;
  name: string;
  /** Model to build (another enemy's id): variants reuse a base model in their own colour. */
  model?: string;
  behavior: EnemyBehavior;
  hp: number;
  speed: number;
  damage: number;
  radius: number;
  height: number;
  xp: number;
  /** 0 = full knockback, 1 = immune. */
  knockbackResist: number;
  color: number;
  /** Behaviour parameters (meaning depends on behaviour). */
  range?: number;
  fireInterval?: number;
  projectileSpeed?: number;
  projectileDamage?: number;
  windup?: number;
  chargeSpeed?: number;
  chargeTime?: number;
  splitInto?: string;
  splitCount?: number;
  fuse?: number;
  explodeRadius?: number;
  explodeDamage?: number;
  /** How it bursts when defeated (render only): pop, shards, puff, splat. */
  deathFx?: 'pop' | 'shards' | 'puff' | 'splat';
  /** Flies: ignores walls, pathing and ground effects (ice, snow). */
  flying?: boolean;
  /** Hover bob amplitude (render only). */
  bob?: number;
  /** Seconds the player is chilled (slowed) by this enemy's touch or shots. */
  chill?: number;
  /** Charger only: rolls, growing up to this size multiplier and speeding up as it goes. */
  roll?: number;
  /** Shot look (ShotVisual); defaults to Orb. */
  shotVisual?: number;
  /** Boss only: intro-card subtitle. */
  epithet?: string;
  /** Boss only: health fractions where its fight changes (ticks on the boss bar). */
  phases?: number[];
  /** Boss only: health fraction below which it is enraged (bar turns red). */
  enrageAt?: number;
  /** Boss only: which attack pattern drives it. */
  bossPattern?: 'grumblecap' | 'clockjaw' | 'regent' | 'oldRime';
  /** Render capacity hint. */
  maxCount?: number;
}

export interface WaveSegment {
  /** Segment start time in seconds; it runs until the next segment starts. */
  start: number;
  /** Enemies spawned per second (before ramping toward minAlive). */
  rate: number;
  /** If fewer than this many enemies are alive, spawning accelerates. */
  minAlive: number;
  /** Hard cap on alive enemies during this segment. */
  maxAlive: number;
  mix: Array<[string, number]>;
}

export type WaveEventKind = 'ring' | 'swarm' | 'elite' | 'boss' | 'horde';

export interface WaveEvent {
  time: number;
  kind: WaveEventKind;
  enemy: string;
  count: number;
  banner?: number;
}

export type PropKind =
  | 'pine'
  | 'oak'
  | 'rock'
  | 'mushroom'
  | 'crystal'
  | 'stump'
  | 'flower'
  | 'tuft'
  | 'post'
  // Rimewood
  | 'frostPine'
  | 'birch'
  | 'snowRock'
  | 'iceCrystal'
  | 'frostShrub'
  | 'snowTuft';

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  description: string;
  startWeapon: string;
  stats: Partial<PlayerStats>;
  /** Movement personality. */
  move: { speed: number; jump: number; slideBoost: number; slideFriction: number };
  unlock?: string;
  colors: { primary: number; secondary: number; accent: number; skin: number };
  /** Signature passive (sim/heroes.ts). */
  passive: { id: string; name: string; description: string };
}

export interface ShopDef {
  id: string;
  name: string;
  description: string;
  stat: keyof PlayerStats;
  perRank: number;
  maxRank: number;
  baseCost: number;
  costGrowth: number;
}

export type ShrineKind = 'might' | 'haste' | 'ward' | 'magnet' | 'fortune' | 'gold';

export interface ShrineDef {
  kind: ShrineKind;
  name: string;
  description: string;
  duration: number;
  color: number;
  weight: number;
}
