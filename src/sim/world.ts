import { BASE_STATS, CAPS, MAP_HALF } from '../config/balance';
import { mergeTuning, TUNING_DEFAULTS, xpToNextWith, type Tuning, type TuningOverrides } from '../config/tuning';
import { characterDef } from '../config/characters';
import { mapDef, type MapDef, type MapId } from '../config/maps';
import type { WeaponConfig } from '../config/weapons';
import type { CharacterDef, PassiveDef, PlayerStats, ShrineKind, WeaponStats } from '../config/types';
import { EventBuffer } from '../core/events';
import { Rng } from '../core/rng';
import { EnemyPool, EnemyProjectilePool, GemPool, HazardPool, PickupPool, ProjectilePool } from './pools';
import { BOSS_ATTACKS, SOURCE_SLOTS } from './sources';
import { FlowField } from './flowField';
import { SpatialHash } from './spatialHash';
import { Terrain } from './terrain';

export interface SimInput {
  /** Desired world-space move direction (length ≤ 1). */
  moveX: number;
  moveZ: number;
  /** Jump pressed since the previous tick. */
  jump: boolean;
  /** Slide held. */
  slide: boolean;
}

export function emptyInput(): SimInput {
  return { moveX: 0, moveZ: 0, jump: false, slide: false };
}

export interface WeaponInstance {
  def: WeaponConfig;
  index: number;
  level: number;
  slot: number;
  timer: number;
  /** Projectiles remaining in the current staggered volley. */
  burstLeft: number;
  burstTimer: number;
  /** Orbit: remaining active time. */
  active: number;
  /** Resolved stats after level + player modifiers. */
  stats: WeaponStats;
  damageDealt: number;
  kills: number;
  /** Aura: time until next damage pulse. */
  pulse: number;
}

export interface PassiveInstance {
  def: PassiveDef;
  index: number;
  level: number;
}

export interface Buffs {
  might: number;
  haste: number;
  ward: number;
  fortune: number;
}

export interface Player {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
  pz: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  onGround: boolean;
  sliding: boolean;
  slideCd: number;
  coyote: number;
  jumpBuffer: number;
  /** Seconds since landing (bhop window). */
  landT: number;
  hp: number;
  iframes: number;
  level: number;
  xp: number;
  xpNext: number;
  alive: boolean;
  revivals: number;
  rerolls: number;
  /** Final stats (base + passives + buffs). */
  stats: PlayerStats;
  /** Character + permanent shop bonuses. */
  baseStats: PlayerStats;
  buffs: Buffs;
  character: CharacterDef;
  hurtFlash: number;
  /** Max HP at the last stat recompute (to heal by the delta when max HP rises). */
  hpMaxCache: number;
  /** Seconds left chilled (slowed) by frost attacks. */
  chill: number;
}

export type WorldState = 'playing' | 'levelup' | 'chest' | 'dead' | 'won';

export type ChoiceKind = 'newWeapon' | 'weaponLevel' | 'newPassive' | 'passiveLevel' | 'evolve' | 'heal' | 'gold';

export interface UpgradeChoice {
  kind: ChoiceKind;
  id: string;
  /** Level after taking the choice. */
  level: number;
}

export interface Shrine {
  x: number;
  y: number;
  z: number;
  kind: ShrineKind;
  hp: number;
  alive: boolean;
  hitCd: number;
  /** Seconds since last hit (render wobble). */
  shake: number;
}

export interface PickRecord {
  t: number;
  level: number;
  offered: string[];
  picked: string | null;
}

export interface BossFight {
  id: string;
  spawnedAt: number;
  /** -1 while still alive. */
  killedAt: number;
  damageTaken: number;
}

export interface RunStats {
  kills: number;
  damageTaken: number;
  coins: number;
  bossKills: Record<string, number>;
  evolutions: number;
  shrinesBroken: number;
  chestsOpened: number;
  topSpeed: number;
  elitesKilled: number;
  /** Damage taken / hits taken per source code (see sim/sources.ts). */
  damageBy: Float64Array;
  hitsBy: Uint32Array;
  /** Source of the most recent hit (cause of death when the run ends). */
  lastSource: number;
  /** Boss attack activations and activations that hit at least once (by BOSS_ATTACKS index). */
  bossAttackUsed: Uint32Array;
  bossAttackHits: Uint32Array;
  bossAttackLastHit: Int32Array;
  bossAttackSeq: number;
  bossFights: BossFight[];
  /** Seconds spent sliding on the ground / airborne, and jumps made. */
  slideTime: number;
  airTime: number;
  jumps: number;
  picks: PickRecord[];
  chests: Array<{ t: number; rewards: string[] }>;
}

export interface DirectorState {
  spawnAcc: number;
  eventIndex: number;
  bossUid: number;
  bossType: number;
  bossMaxHp: number;
  finalBossDefeated: boolean;
  lastSegment: number;
  /** Counts down to the victory screen once the run is won. */
  victoryT: number;
  dawn: boolean;
  /** Highest health phase the current boss has entered (phase-change attacks fire once). */
  bossPhase: number;
}

/** Map weather / hazards (Rimewood gusts and icicles). Driven by `w.hazardRng`. */
export interface Weather {
  /** Time of the next icicle volley. */
  nextIcicle: number;
  /** Time the next gust warning starts. */
  nextGust: number;
  /** Seconds of warning left before the current gust pushes (0 = none pending). */
  warnT: number;
  /** Seconds of push left. */
  gustT: number;
  /** Unit push direction and strength (u/s) of the current / announced gust. */
  dirX: number;
  dirZ: number;
  push: number;
  enemyPush: number;
  /** Boss blizzard: seconds left, and its centre (pushes swirl around it). */
  blizzardT: number;
  blizzardX: number;
  blizzardZ: number;
}

export interface WorldOptions {
  seed: number;
  characterId: string;
  /** Map to play (default Gloam Meadow). */
  map?: MapId;
  /** Permanent bonuses from the shop (added to base stats). */
  meta?: Partial<PlayerStats>;
  unlockedWeapons?: string[];
  /** Stress-test mode: keep N enemies alive, player invulnerable. */
  stress?: number;
  god?: boolean;
  /** Tuning overrides for this run (live panel / experiments). Defaults when omitted. */
  tuning?: TuningOverrides;
  /** Run played with non-default tuning: never counts for records or achievements. */
  tuned?: boolean;
}

export interface World {
  seed: number;
  rng: Rng;
  /**
   * Separate stream for map hazards (icicles, gusts): adding hazards to a map never shifts
   * the main stream, so other maps' spawn sequences stay identical.
   */
  hazardRng: Rng;
  map: MapDef;
  weather: Weather;
  terrain: Terrain;
  time: number;
  tick: number;
  state: WorldState;
  player: Player;
  weapons: WeaponInstance[];
  passives: PassiveInstance[];
  enemies: EnemyPool;
  projectiles: ProjectilePool;
  enemyShots: EnemyProjectilePool;
  gems: GemPool;
  pickups: PickupPool;
  hazards: HazardPool;
  grid: SpatialHash;
  /** Distance field toward the player for enemy pathing. */
  flow: FlowField;
  shrines: Shrine[];
  events: EventBuffer;
  pendingLevels: number;
  pendingChests: number;
  choices: UpgradeChoice[];
  chestRewards: UpgradeChoice[];
  director: DirectorState;
  stats: RunStats;
  unlockedWeapons: Set<string>;
  options: { stress: number; god: boolean; tuned: boolean };
  /** This run's tuning (a private copy — the live panel edits it in place). */
  tuning: Tuning;
  /** Shared query scratch buffers (never hold across calls). */
  scratch: Int32Array;
  scratch2: Int32Array;
  /** Reserved for damageArea (which can run inside loops that use `scratch`). */
  areaScratch: Int32Array;
  /** Gameplay-relevant camera yaw is not needed; kept for bots / debugging only. */
  maxEnemies: number;
}

export function makeStats(): PlayerStats {
  return { ...BASE_STATS };
}

export function createWorld(opts: WorldOptions): World {
  const rng = new Rng(opts.seed);
  const tuning = mergeTuning(TUNING_DEFAULTS, opts.tuning);
  const map = mapDef(opts.map ?? 'meadow');
  const terrain = new Terrain(opts.seed, map.terrain);
  const character = characterDef(opts.characterId);

  const baseStats = makeStats();
  for (const [k, v] of Object.entries(character.stats)) baseStats[k as keyof PlayerStats] += v as number;
  if (opts.meta) for (const [k, v] of Object.entries(opts.meta)) baseStats[k as keyof PlayerStats] += v as number;

  const y = terrain.height(0, 0);
  const player: Player = {
    x: 0,
    y,
    z: 0,
    px: 0,
    py: y,
    pz: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: Math.PI,
    onGround: true,
    sliding: false,
    slideCd: 0,
    coyote: 0,
    jumpBuffer: 0,
    landT: 1,
    hp: baseStats.maxHp,
    iframes: 0,
    level: 1,
    xp: 0,
    xpNext: xpToNextWith(1, tuning.xp),
    alive: true,
    revivals: baseStats.revival,
    rerolls: baseStats.reroll,
    stats: { ...baseStats },
    baseStats,
    buffs: { might: 0, haste: 0, ward: 0, fortune: 0 },
    character,
    hurtFlash: 0,
    hpMaxCache: baseStats.maxHp,
    chill: 0,
  };

  const stress = opts.stress ?? 0;
  const world: World = {
    seed: opts.seed,
    rng,
    hazardRng: new Rng((opts.seed ^ 0x2c1b3c6d) >>> 0),
    map,
    weather: {
      nextIcicle: map.hazards.icicles?.start ?? Infinity,
      nextGust: map.hazards.gusts?.start ?? Infinity,
      warnT: 0,
      gustT: 0,
      dirX: 0,
      dirZ: 0,
      push: 0,
      enemyPush: 0,
      blizzardT: 0,
      blizzardX: 0,
      blizzardZ: 0,
    },
    terrain,
    time: 0,
    tick: 0,
    state: 'playing',
    player,
    weapons: [],
    passives: [],
    enemies: new EnemyPool(Math.max(CAPS.enemies, stress + 200)),
    projectiles: new ProjectilePool(CAPS.projectiles),
    enemyShots: new EnemyProjectilePool(CAPS.enemyProjectiles),
    gems: new GemPool(CAPS.gems),
    pickups: new PickupPool(CAPS.pickups),
    hazards: new HazardPool(CAPS.hazards),
    grid: new SpatialHash(MAP_HALF, 4, Math.max(CAPS.enemies, stress + 200)),
    flow: new FlowField(terrain),
    shrines: [],
    events: new EventBuffer(8192),
    pendingLevels: 0,
    pendingChests: 0,
    choices: [],
    chestRewards: [],
    director: { spawnAcc: 0, eventIndex: 0, bossUid: 0, bossType: -1, bossMaxHp: 0, finalBossDefeated: false, lastSegment: -1, victoryT: 0, dawn: false, bossPhase: 0 },
    stats: {
      kills: 0,
      damageTaken: 0,
      coins: 0,
      bossKills: {},
      evolutions: 0,
      shrinesBroken: 0,
      chestsOpened: 0,
      topSpeed: 0,
      elitesKilled: 0,
      damageBy: new Float64Array(SOURCE_SLOTS),
      hitsBy: new Uint32Array(SOURCE_SLOTS),
      lastSource: 0,
      bossAttackUsed: new Uint32Array(BOSS_ATTACKS.length),
      bossAttackHits: new Uint32Array(BOSS_ATTACKS.length),
      bossAttackLastHit: new Int32Array(BOSS_ATTACKS.length).fill(-1),
      bossAttackSeq: 0,
      bossFights: [],
      slideTime: 0,
      airTime: 0,
      jumps: 0,
      picks: [],
      chests: [],
    },
    unlockedWeapons: new Set(opts.unlockedWeapons ?? []),
    options: { stress, god: !!opts.god || stress > 0, tuned: !!opts.tuned },
    tuning,
    scratch: new Int32Array(2048),
    scratch2: new Int32Array(512),
    areaScratch: new Int32Array(2048),
    maxEnemies: stress > 0 ? stress + 100 : CAPS.enemies,
  };
  return world;
}
