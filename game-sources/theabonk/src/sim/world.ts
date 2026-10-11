import { BASE_STATS, CAPS, MAP_HALF, xpToNext } from '../config/balance';
import { characterDef } from '../config/characters';
import type { WeaponConfig } from '../config/weapons';
import type { CharacterDef, PassiveDef, PlayerStats, ShrineKind, WeaponStats } from '../config/types';
import { EventBuffer } from '../core/events';
import { Rng } from '../core/rng';
import { EnemyPool, EnemyProjectilePool, GemPool, HazardPool, PickupPool, ProjectilePool } from './pools';
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
}

export interface WorldOptions {
  seed: number;
  characterId: string;
  /** Permanent bonuses from the shop (added to base stats). */
  meta?: Partial<PlayerStats>;
  unlockedWeapons?: string[];
  /** Stress-test mode: keep N enemies alive, player invulnerable. */
  stress?: number;
  god?: boolean;
}

export interface World {
  seed: number;
  rng: Rng;
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
  shrines: Shrine[];
  events: EventBuffer;
  pendingLevels: number;
  pendingChests: number;
  choices: UpgradeChoice[];
  chestRewards: UpgradeChoice[];
  director: DirectorState;
  stats: RunStats;
  unlockedWeapons: Set<string>;
  options: { stress: number; god: boolean };
  /** Shared query scratch buffers (never hold across calls). */
  scratch: Int32Array;
  scratch2: Int32Array;
  /** Gameplay-relevant camera yaw is not needed; kept for bots / debugging only. */
  maxEnemies: number;
}

export function makeStats(): PlayerStats {
  return { ...BASE_STATS };
}

export function createWorld(opts: WorldOptions): World {
  const rng = new Rng(opts.seed);
  const terrain = new Terrain(opts.seed);
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
    xpNext: xpToNext(1),
    alive: true,
    revivals: baseStats.revival,
    rerolls: baseStats.reroll,
    stats: { ...baseStats },
    baseStats,
    buffs: { might: 0, haste: 0, ward: 0, fortune: 0 },
    character,
    hurtFlash: 0,
    hpMaxCache: baseStats.maxHp,
  };

  const stress = opts.stress ?? 0;
  const world: World = {
    seed: opts.seed,
    rng,
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
    shrines: [],
    events: new EventBuffer(8192),
    pendingLevels: 0,
    pendingChests: 0,
    choices: [],
    chestRewards: [],
    director: { spawnAcc: 0, eventIndex: 0, bossUid: 0, bossType: -1, bossMaxHp: 0, finalBossDefeated: false, lastSegment: -1, victoryT: 0, dawn: false },
    stats: { kills: 0, damageTaken: 0, coins: 0, bossKills: {}, evolutions: 0, shrinesBroken: 0, chestsOpened: 0, topSpeed: 0, elitesKilled: 0 },
    unlockedWeapons: new Set(opts.unlockedWeapons ?? []),
    options: { stress, god: !!opts.god || stress > 0 },
    scratch: new Int32Array(2048),
    scratch2: new Int32Array(512),
    maxEnemies: stress > 0 ? stress + 100 : CAPS.enemies,
  };
  return world;
}
