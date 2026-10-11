import type { ElementId } from '../data/elements';
import { ENEMIES, type EnemyDef } from '../data/enemies';

/** A pooled creature. Fields are reset in `init` so objects can be reused forever. */
export class Enemy {
  /** Unique per spawn (never reused) — lets projectiles detect a recycled target. */
  id = 0;
  /** Stable pool slot, used by the renderer to map to sprite views. */
  readonly slot: number;
  alive = false;
  def: EnemyDef = ENEMIES.gloop;
  element: ElementId | null = null;
  shield: ElementId | null = null;
  flying = false;
  boss = false;
  radius = 0.3;

  x = 0;
  y = 0;
  /** Previous tick position (for render interpolation). */
  px = 0;
  py = 0;
  /** Current cell and the waypoint cell we are walking to. */
  cell = -1;
  wcell = -1;
  wx = 0;
  wy = 0;
  /** Remaining distance to the castle in tiles (lower = further along). */
  remaining = 0;

  hp = 1;
  maxHp = 1;
  armor = 0;
  speed = 1;
  coins = 1;
  lives = 1;
  waveIndex = 0;

  // status effects
  slowAmt = 0;
  slowTime = 0;
  burnDps = 0;
  burnTime = 0;
  poisonPerStack = 0;
  poisonStacks = 0;
  poisonTime = 0;
  poisonSpread = 0;
  stunTime = 0;
  ccImmune = 0;
  armorBreak = 0;
  armorBreakTime = 0;
  healTimer = 0;
  shiftTimer = 0;
  dotTimer = 0;

  /** Visual helpers (read by renderer). */
  hitFlash = 0;
  laneX = 0;
  laneY = 0;
  facing = 1;
  spawnAge = 0;

  /** Who dealt the last damage (tower id, -1 = none) for kill credit. */
  lastHitBy = -1;

  constructor(slot: number) {
    this.slot = slot;
  }

  init(id: number, def: EnemyDef, el: ElementId | null, hp: number, coins: number, waveIndex: number): void {
    this.id = id;
    this.alive = true;
    this.def = def;
    this.element = el;
    this.shield = null;
    this.flying = !!def.flying;
    this.boss = !!def.boss;
    this.radius = def.radius;
    this.hp = hp;
    this.maxHp = hp;
    this.armor = def.armor;
    this.speed = def.speed;
    this.coins = coins;
    this.lives = def.lives;
    this.waveIndex = waveIndex;
    this.slowAmt = 0;
    this.slowTime = 0;
    this.burnDps = 0;
    this.burnTime = 0;
    this.poisonPerStack = 0;
    this.poisonStacks = 0;
    this.poisonTime = 0;
    this.poisonSpread = 0;
    this.stunTime = 0;
    this.ccImmune = 0;
    this.armorBreak = 0;
    this.armorBreakTime = 0;
    this.healTimer = def.heal ? def.heal.interval * 0.5 : 0;
    this.shiftTimer = def.shiftElement ?? 0;
    this.dotTimer = 0;
    this.hitFlash = 0;
    this.facing = 1;
    this.spawnAge = 0;
    this.lastHitBy = -1;
    this.cell = -1;
    this.wcell = -1;
  }

  get effectiveArmor(): number {
    const a = this.armor - (this.armorBreakTime > 0 ? this.armorBreak : 0);
    return a > 0 ? a : 0;
  }

  get currentSpeed(): number {
    if (this.stunTime > 0) return 0;
    return this.speed * (this.slowTime > 0 ? 1 - this.slowAmt : 1);
  }
}
