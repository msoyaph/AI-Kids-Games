import { swapRemove } from '../core/pool';
import { Rng } from '../core/rng';
import { DIFFICULTIES, difficultyHp, type Difficulty, type DifficultyDef } from '../data/difficulty';
import { ELEMENT_ORDER, ELEMENTS, elementMultiplier, type ElementId } from '../data/elements';
import { ENEMIES, type EnemyDef, type EnemyId } from '../data/enemies';
import type { MapDef } from '../data/maps/types';
import {
  MAX_LEVEL,
  SPEC_LEVEL,
  sellValue,
  TOWERS,
  towerUnlocked,
  type TargetMode,
  type TowerId,
  type TowerStats,
} from '../data/towers';
import {
  buildWaves,
  CRYSTAL_WAVES,
  generateWave,
  waveClearBonus,
  waveSpawnDuration,
  type SpawnGroup,
  type WaveDef,
} from '../data/waves';
import { TUNING, type BossAttack } from '../data/tuning';
import { Enemy } from './enemy';
import { Projectile, Tower, Zone } from './entities';
import { Ev, EventQueue } from './events';
import { FlowField, UNREACHABLE } from './flowField';
import { F_WALK, Grid } from './grid';
import { SpatialHash } from './spatial';

export const TICK_RATE = 30;
export const DT = 1 / TICK_RATE;

export type GameMode = 'campaign' | 'endless' | 'tutorial';
export type GameState = 'playing' | 'won' | 'lost';
export type BuildFail = 'terrain' | 'occupied' | 'locked' | 'coins' | 'path' | 'outside';

export interface BuildCheck {
  ok: boolean;
  reason?: BuildFail;
}

export interface GameOptions {
  map: MapDef;
  difficulty: Difficulty;
  mode: GameMode;
  seed?: number;
  waves?: WaveDef[];
  startCoins?: number;
  startCrystals?: number;
  crystalWaves?: readonly number[];
  /** When false, every wave waits for the player to press Go (tutorial). */
  autoWaves?: boolean;
}

export interface RunStats {
  kills: number;
  bossKills: number;
  bossesKilled: EnemyId[];
  leaks: number;
  coinsEarned: number;
  interestEarned: number;
  wavesSentEarly: number;
  towersBuilt: number;
  combosBuilt: number;
  upgrades: number;
  maxLevel: number;
  maxCoins: number;
  sold: number;
  /** Every tower type built this run. */
  towerTypes: Set<TowerId>;
  shortestPath: number;
  longestPath: number;
  /** Gold paid for builds and upgrades. */
  coinsSpent: number;
  /** Lives lost per wave (index = wave − 1). */
  leaksByWave: number[];
  /** Spec ids picked this run. */
  specsChosen: string[];
  /** Towers sold during the run (for the after-match damage table). */
  soldTowers: TowerRecord[];
}

export interface TowerRecord {
  type: TowerId;
  level: number;
  spec: number;
  damage: number;
  kills: number;
}

interface SpawnCursor {
  group: SpawnGroup;
  wave: WaveDef;
  waveIndex: number;
  spawned: number;
  timer: number;
  spawnPoint: number;
}

const SPEED: Readonly<Record<string, number>> = TUNING.projectileSpeed;
const C = TUNING.combat;
const D = TUNING.combat.defaults;
const ECO = TUNING.economy;

const MAX_ENEMIES = 1600;
const MAX_PROJECTILES = 1600;
const MAX_ZONES = 96;

export class Game {
  readonly map: MapDef;
  readonly grid: Grid;
  readonly flow: FlowField;
  readonly diff: DifficultyDef;
  readonly mode: GameMode;
  readonly rng: Rng;
  readonly events = new EventQueue();
  readonly spatial: SpatialHash;

  readonly enemies: Enemy[] = [];
  private enemyFree: Enemy[] = [];
  private enemySlots = 0;
  private nextEnemyId = 1;

  readonly towers: Tower[] = [];
  /** Sparse id → tower table (O(1) lookups from damage/kill code). */
  private towerIndex: (Tower | undefined)[] = [];
  private nextTowerId = 1;
  /** Bumps on every build/sell so caches (paths, previews) can invalidate. */
  towerVersion = 0;

  readonly projectiles: Projectile[] = [];
  private projFree: Projectile[] = [];
  private projSlots = 0;

  readonly zones: Zone[] = [];
  private zoneFree: Zone[] = [];
  private zoneSlots = 0;

  tick = 0;
  time = 0;
  state: GameState = 'playing';
  coins: number;
  lives: number;
  readonly maxLives: number;

  readonly totalWaves: number;
  private waves: WaveDef[];
  /** Number of waves started so far. */
  waveNum = 0;
  /** Seconds until the next wave auto-starts; -1 = waiting for the player. */
  nextWaveTimer = -1;
  readonly autoWaves: boolean;
  private waveAlive: number[] = [];
  private waveCleared: boolean[] = [];
  private cursors: SpawnCursor[] = [];
  private readonly crystalWaves: readonly number[];

  unlocked: ElementId[] = [];
  crystals: number;

  readonly stats: RunStats;

  // scratch buffers (no allocation in the hot loop)
  private q: Enemy[] = new Array(MAX_ENEMIES);
  private q2: Enemy[] = new Array(MAX_ENEMIES);
  private picked: Enemy[] = new Array(8);
  private scratchDist: Float64Array;
  private scratchNext: Int32Array;
  private buildCache = new Map<number, boolean>();
  /** Cloaked constructs this tick (detection only runs when there are some). */
  private cloakedCount = 0;
  private empAttacks = new Map<string, BossAttack>();
  private buildCacheVersion = -1;

  constructor(opts: GameOptions) {
    this.map = opts.map;
    this.mode = opts.mode;
    this.diff = DIFFICULTIES[opts.difficulty];
    this.rng = new Rng(opts.seed ?? 12345);
    this.grid = new Grid(opts.map);
    this.flow = new FlowField(this.grid);
    this.flow.compute();
    this.spatial = new SpatialHash(this.grid.cols, this.grid.rows);
    const n = this.grid.cols * this.grid.rows;
    this.scratchDist = new Float64Array(n);
    this.scratchNext = new Int32Array(n);
    this.waves = opts.waves ?? buildWaves(opts.map);
    this.totalWaves = opts.mode === 'endless' ? Infinity : this.waves.length;
    this.autoWaves = opts.autoWaves ?? true;
    this.maxLives = this.diff.lives;
    this.lives = this.maxLives;
    this.coins = Math.round((opts.startCoins ?? opts.map.startCoins ?? ECO.mapStartCoins[opts.map.id] ?? ECO.startCoins) * this.diff.startCoins);
    this.crystals = opts.startCrystals ?? ECO.startCrystals;
    this.crystalWaves = opts.crystalWaves ?? CRYSTAL_WAVES;
    const shortest = this.pathLength();
    this.stats = {
      kills: 0,
      bossKills: 0,
      bossesKilled: [],
      leaks: 0,
      coinsEarned: 0,
      interestEarned: 0,
      wavesSentEarly: 0,
      towersBuilt: 0,
      combosBuilt: 0,
      upgrades: 0,
      maxLevel: 0,
      maxCoins: this.coins,
      sold: 0,
      towerTypes: new Set(),
      shortestPath: shortest,
      longestPath: shortest,
      coinsSpent: 0,
      leaksByWave: [],
      specsChosen: [],
      soldTowers: [],
    };
  }

  // ================================================================ waves

  getWave(n: number): WaveDef | null {
    if (n < 1 || n > this.totalWaves) return null;
    if (n > this.waves.length) {
      for (let w = this.waves.length + 1; w <= n; w++) this.waves.push(generateWave(w, this.map));
    }
    return this.waves[n - 1]!;
  }

  get nextWave(): WaveDef | null {
    return this.getWave(this.waveNum + 1);
  }

  get allWavesStarted(): boolean {
    return this.waveNum >= this.totalWaves;
  }

  /** Coins you'd get for calling the next wave right now. */
  get earlyBonus(): number {
    if (this.waveNum === 0 || this.nextWaveTimer <= 0) return 0;
    return Math.ceil(this.nextWaveTimer * ECO.earlyBonus.perSecond * (1 + this.waveNum * ECO.earlyBonus.perWave));
  }

  /** Start the next wave now (the Go / Send-early button). Returns bonus coins. */
  sendNextWave(): number {
    if (this.state !== 'playing' || this.allWavesStarted) return 0;
    const bonus = this.earlyBonus;
    if (bonus > 0) {
      this.addCoins(bonus);
      this.stats.wavesSentEarly++;
      const e = this.events.push(Ev.Coins, this.grid.castleX, this.grid.castleY);
      e.value = bonus;
      e.kind = 'early';
    }
    this.startWave();
    return bonus;
  }

  private startWave(): void {
    const w = this.getWave(this.waveNum + 1);
    if (!w) return;
    this.waveNum++;
    const idx = this.waveNum - 1;
    let total = 0;
    for (const g of w.groups) {
      this.cursors.push({ group: g, wave: w, waveIndex: idx, spawned: 0, timer: g.delay, spawnPoint: this.cursors.length });
      total += g.count;
    }
    this.waveAlive[idx] = total;
    this.waveCleared[idx] = false;
    if (!this.allWavesStarted && this.autoWaves) {
      this.nextWaveTimer = waveSpawnDuration(w) + ECO.breather.base * this.diff.breather + (w.boss ? ECO.breather.boss : 0);
    } else {
      this.nextWaveTimer = -1;
    }
    const e = this.events.push(Ev.WaveStart);
    e.value = this.waveNum;
    e.kind = w.boss ?? '';
  }

  private updateSpawns(): void {
    for (let i = this.cursors.length - 1; i >= 0; i--) {
      const c = this.cursors[i]!;
      c.timer -= DT;
      while (c.timer <= 0 && c.spawned < c.group.count) {
        const g = c.group;
        const el = g.elements ? (g.elements[c.spawned % g.elements.length] ?? null) : null;
        const sp = this.grid.spawns[(c.spawnPoint + c.spawned) % this.grid.spawns.length]!;
        const e = this.spawnEnemy(ENEMIES[g.enemy], el, c.wave, c.waveIndex, this.grid.cellX(sp) + 0.5, this.grid.cellY(sp) + 0.5, sp);
        if (e && g.shields) e.shield = g.shields[c.spawned % g.shields.length]!;
        if (e && g.resist) e.resist = g.resist;
        c.spawned++;
        c.timer += g.gap;
      }
      if (c.spawned >= c.group.count) swapRemove(this.cursors, i);
    }
    if (this.nextWaveTimer > 0) {
      this.nextWaveTimer -= DT;
      if (this.nextWaveTimer <= 0) {
        this.nextWaveTimer = 0;
        this.startWave();
      }
    }
  }

  private spawnEnemy(
    def: EnemyDef,
    el: ElementId | null,
    wave: WaveDef,
    waveIndex: number,
    x: number,
    y: number,
    cell: number,
  ): Enemy | null {
    if (this.enemies.length >= MAX_ENEMIES) return null;
    let e = this.enemyFree.pop();
    if (!e) e = new Enemy(this.enemySlots++);
    const hp = Math.max(1, Math.round(def.hp * wave.hp * difficultyHp(this.diff, wave.n)));
    const coins = Math.max(1, Math.round(def.coins * wave.coins * this.diff.coins));
    e.init(this.nextEnemyId++, def, el, hp, coins, waveIndex);
    e.speed = def.speed * this.diff.speed;
    if (def.shiftElement) e.element = ELEMENT_ORDER[this.rng.int(0, 5)]!;
    e.x = e.px = x;
    e.y = e.py = y;
    e.laneX = this.rng.range(-0.16, 0.16);
    e.laneY = this.rng.range(-0.12, 0.12);
    if (def.boss) {
      e.laneX = 0;
      e.laneY = 0;
    }
    if (e.flying) {
      e.cell = -1;
      e.wcell = -1;
      e.wx = this.grid.castleX;
      e.wy = this.grid.castleY;
    } else {
      e.cell = cell;
      this.setWaypoint(e, this.flow.next[cell]!);
    }
    this.updateRemaining(e);
    this.enemies.push(e);
    const ev = this.events.push(def.boss ? Ev.BossSpawn : Ev.Spawn, x, y);
    ev.kind = def.id;
    return e;
  }

  private setWaypoint(e: Enemy, cell: number): void {
    if (cell < 0) {
      e.wcell = e.cell;
      e.wx = this.grid.cellX(e.cell) + 0.5;
      e.wy = this.grid.cellY(e.cell) + 0.5;
      return;
    }
    e.wcell = cell;
    e.wx = this.grid.cellX(cell) + 0.5;
    e.wy = this.grid.cellY(cell) + 0.5;
  }

  private updateRemaining(e: Enemy): void {
    const dx = e.wx - e.x;
    const dy = e.wy - e.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (e.flying) {
      e.remaining = d;
      return;
    }
    let wd = this.flow.dist[e.wcell]!;
    if (wd >= UNREACHABLE) {
      const n = this.flow.next[e.wcell]!;
      wd = n >= 0 ? this.flow.dist[n]! + 1 : 999;
    }
    e.remaining = wd + d;
  }

  // ================================================================ step

  step(): void {
    if (this.state !== 'playing') return;
    this.tick++;
    this.time += DT;
    this.updateSpawns();
    // fresh hash for healers / poison spread during the enemy update (indices go stale after compaction)
    this.spatial.rebuild(this.enemies);
    this.updateEnemies();
    this.spatial.rebuild(this.enemies);
    if (this.cloakedCount > 0) this.updateDetection();
    this.updateTowers();
    this.updateProjectiles();
    this.updateZones();
    this.compactEnemies();
    this.checkWaves();
    if (this.coins > this.stats.maxCoins) this.stats.maxCoins = this.coins;
  }

  private updateEnemies(): void {
    const g = this.grid;
    this.cloakedCount = 0;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i]!;
      if (!e.alive) continue;
      e.px = e.x;
      e.py = e.y;
      e.spawnAge += DT;
      if (e.hitFlash > 0) e.hitFlash -= DT;
      if (e.ccImmune > 0) e.ccImmune -= DT;
      if (e.slowTime > 0) e.slowTime -= DT;
      if (e.armorBreakTime > 0) e.armorBreakTime -= DT;

      // damage over time (ignores armor so poison is always useful)
      let dot = 0;
      if (e.burnTime > 0) {
        e.burnTime -= DT;
        dot += e.burnDps;
      }
      if (e.poisonTime > 0) {
        e.poisonTime -= DT;
        dot += e.poisonPerStack * e.poisonStacks;
        if (e.poisonTime <= 0) e.poisonStacks = 0;
      }
      if (dot > 0) {
        this.damage(e, dot * DT, NEUTRAL, e.lastHitBy, true);
        if (!e.alive) continue;
      }

      const def = e.def;
      // ---- mechanics: regeneration, cloak, boss phases, attacks, tunnelling
      e.sinceHit += DT;
      if (e.revealed > 0) e.revealed -= DT;
      if (e.regenPct > 0 && e.sinceHit >= e.regenDelay && e.burnTime <= 0 && e.poisonTime <= 0 && e.hp < e.maxHp) {
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.regenPct * DT);
      }
      if (e.cloakHidden > 0) {
        e.cloakTimer += DT;
        const cycle = e.cloakHidden + e.cloakVisible;
        if (e.cloakTimer >= cycle) e.cloakTimer -= cycle;
        e.cloaked = e.cloakTimer < e.cloakHidden;
        if (e.cloaked) this.cloakedCount++;
      }
      if (def.phases) this.updateBossPhase(e);
      const atk = this.attackOf(e);
      if (atk) {
        this.updateAttack(e, atk);
        if (!e.alive) continue;
      }
      if (def.burrow && !e.flying && this.updateBurrow(e)) continue;
      if (def.heal) {
        e.healTimer -= DT;
        if (e.healTimer <= 0) {
          e.healTimer = def.heal.interval;
          this.healAround(e, def.heal.radius, def.heal.pct);
        }
      }
      if (def.shiftElement) {
        e.shiftTimer -= DT;
        if (e.shiftTimer <= 0) {
          e.shiftTimer = def.shiftElement;
          const cur = e.element ? ELEMENT_ORDER.indexOf(e.element) : 0;
          e.element = ELEMENT_ORDER[(cur + 1 + this.rng.int(0, 4)) % 6]!;
          const ev = this.events.push(Ev.Heal, e.x, e.y);
          ev.kind = 'shift';
          ev.tag = e.element;
        }
      }

      if (e.stunTime > 0) {
        e.stunTime -= DT;
        continue;
      }
      let move = e.currentSpeed * DT;
      if (e.flying) {
        const dx = g.castleX - e.x;
        const dy = g.castleY - e.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= move + 0.35) {
          this.leak(e);
          continue;
        }
        e.x += (dx / d) * move;
        e.y += (dy / d) * move;
        if (Math.abs(dx) > 0.01) e.facing = dx > 0 ? 1 : -1;
        e.remaining = d - move;
        continue;
      }
      let guard = 4;
      while (move > 0 && guard-- > 0) {
        const dx = e.wx - e.x;
        const dy = e.wy - e.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (Math.abs(dx) > 0.02) e.facing = dx > 0 ? 1 : -1;
        if (d <= move) {
          e.x = e.wx;
          e.y = e.wy;
          move -= d;
          e.cell = e.wcell;
          if (this.flow.dist[e.cell] === 0) {
            this.leak(e);
            break;
          }
          this.setWaypoint(e, this.flow.next[e.cell]!);
          if (e.wcell === e.cell) break; // nowhere to go (should not happen with the block check)
        } else {
          e.x += (dx / d) * move;
          e.y += (dy / d) * move;
          move = 0;
        }
      }
      if (e.alive) this.updateRemaining(e);
    }
  }

  private healAround(src: Enemy, radius: number, pct: number): void {
    const n = this.spatial.query(src.x, src.y, radius, 1, this.q2);
    let healed = 0;
    for (let i = 0; i < n; i++) {
      const o = this.q2[i]!;
      if (o === src || !o.alive || o.hp >= o.maxHp) continue;
      o.hp = Math.min(o.maxHp, o.hp + o.maxHp * pct);
      healed++;
    }
    if (src.def.shiftElement) src.hp = Math.min(src.maxHp, src.hp + src.maxHp * pct * C.shiftSelfHeal);
    if (healed > 0) {
      const ev = this.events.push(Ev.Heal, src.x, src.y);
      ev.value = radius;
      ev.kind = 'heal';
    }
  }

  private leak(e: Enemy): void {
    e.alive = false;
    this.lives = Math.max(0, this.lives - e.lives);
    this.stats.leaks += e.lives;
    this.stats.leaksByWave[e.waveIndex] = (this.stats.leaksByWave[e.waveIndex] ?? 0) + e.lives;
    this.waveAlive[e.waveIndex]!--;
    const ev = this.events.push(Ev.Leak, e.x, e.y);
    ev.value = e.lives;
    ev.kind = e.def.id;
    if (this.lives <= 0 && this.state === 'playing') {
      this.state = 'lost';
      this.events.push(Ev.Defeat);
    }
  }

  private compactEnemies(): void {
    const arr = this.enemies;
    for (let i = arr.length - 1; i >= 0; i--) {
      const e = arr[i]!;
      if (!e.alive) {
        swapRemove(arr, i);
        this.enemyFree.push(e);
      }
    }
  }

  private checkWaves(): void {
    for (let i = 0; i < this.waveNum; i++) {
      if (this.waveCleared[i] || this.waveAlive[i]! > 0) continue;
      this.waveCleared[i] = true;
      const n = i + 1;
      const bonus = waveClearBonus(n);
      const cap = ECO.interestCap.base + n * ECO.interestCap.perWave;
      const interest = Math.min(cap, Math.floor(this.coins * this.diff.interest));
      this.addCoins(bonus + interest);
      this.stats.interestEarned += interest;
      const ev = this.events.push(Ev.WaveClear, this.grid.castleX, this.grid.castleY);
      ev.value = bonus;
      ev.value2 = interest;
      ev.id = n;
      if (this.crystalWaves.includes(n) && this.unlocked.length + this.crystals < ELEMENT_ORDER.length) {
        this.crystals++;
        const c = this.events.push(Ev.Crystal, this.grid.castleX, this.grid.castleY);
        c.value = this.crystals;
      }
    }
    if (this.state === 'playing' && this.allWavesStarted && this.cursors.length === 0 && this.enemies.length === 0) {
      let all = true;
      for (let i = 0; i < this.waveNum; i++) if (!this.waveCleared[i]) all = false;
      if (all && this.lives > 0) {
        this.state = 'won';
        this.events.push(Ev.Victory);
      }
    }
  }

  /** True while creatures are on the field or still spawning. */
  get waveActive(): boolean {
    return this.enemies.length > 0 || this.cursors.length > 0;
  }

  private addCoins(n: number): void {
    this.coins += n;
    this.stats.coinsEarned += n;
  }

  // ================================================================ damage

  /**
   * Apply damage after element, shield and armor modifiers.
   * `dot` damage ignores armor and makes no hit events.
   */
  damage(e: Enemy, amount: number, elements: readonly ElementId[], towerId: number, dot = false): number {
    if (!e.alive) return 0;
    let m = elementMultiplier(elements, e.element);
    const src = towerId >= 0 ? this.towerById(towerId) : undefined;
    const sst = src ? src.stats : null;
    if (sst && !dot) {
      if (sst.bossMult && e.boss) m *= sst.bossMult;
      if (sst.airMult && e.flying) m *= sst.airMult;
    }
    if (e.shield) {
      let pierce = false;
      for (let i = 0; i < elements.length; i++) if (ELEMENTS[elements[i]!].beats === e.shield) pierce = true;
      if (!pierce) {
        m *= Math.min(1, C.wardMult * (sst?.wardBreak ?? 1));
        if (!dot && (this.tick & 3) === 0) {
          const ev = this.events.push(Ev.ShieldBlock, e.x, e.y);
          ev.tag = e.shield;
        }
      }
    }
    if (e.resist) {
      for (let i = 0; i < elements.length; i++) {
        if (elements[i] === e.resist) {
          m *= C.resistMult;
          break;
        }
      }
    }
    e.sinceHit = 0;
    const armor = dot ? 0 : e.effectiveArmor;
    let dmg: number;
    if (e.barrier > 0 && !dot) {
      // the barrier soaks the hit first (armor doesn't help it; ward breakers hit it harder)
      const wb = sst?.wardBreak ?? 1;
      const raw = amount * m * wb;
      const absorbed = Math.min(e.barrier, raw);
      e.barrier -= absorbed;
      if (e.barrier <= 0) {
        e.barrier = 0;
        this.events.push(Ev.BarrierBreak, e.x, e.y).id = e.slot;
      }
      const through = ((raw - absorbed) / wb) * (1 - armor);
      e.hp -= through;
      dmg = absorbed + through;
    } else {
      dmg = amount * m * (1 - armor);
      e.hp -= dmg;
    }
    if (!dot) e.hitFlash = 0.1;
    if (src) {
      e.lastHitBy = towerId;
      src.damageDone += dmg;
    } else if (towerId >= 0) e.lastHitBy = towerId;
    if (e.hp <= 0) this.kill(e);
    return dmg;
  }

  private kill(e: Enemy): void {
    e.alive = false;
    this.stats.kills++;
    if (e.boss) {
      this.stats.bossKills++;
      this.stats.bossesKilled.push(e.def.id);
    }
    // Sunflower coin aura
    let bonus = 0;
    for (let i = 0; i < this.towers.length; i++) {
      const t = this.towers[i]!;
      const st = t.stats;
      if (!st.auraCoins) continue;
      const dx = t.x - e.x;
      const dy = t.y - e.y;
      if (dx * dx + dy * dy <= st.auraRadius! * st.auraRadius! && st.auraCoins > bonus) bonus = st.auraCoins;
    }
    const gain = Math.round(e.coins * (1 + bonus));
    this.addCoins(gain);
    const killer = this.towerById(e.lastHitBy);
    if (killer) killer.kills++;
    const ev = this.events.push(Ev.Kill, e.x, e.y);
    ev.value = gain;
    ev.value2 = bonus > 0 ? 1 : 0;
    ev.kind = e.def.id;
    ev.tag = e.element ?? '';
    ev.id = e.slot;

    const split = e.def.split;
    if (split) {
      const child = ENEMIES[split.into];
      const wave = this.getWave(e.waveIndex + 1)!;
      for (let k = 0; k < split.count; k++) {
        const a = (k / split.count) * Math.PI * 2;
        const c = this.spawnEnemy(child, e.boss ? e.element : null, wave, e.waveIndex, e.x + Math.cos(a) * 0.25, e.y + Math.sin(a) * 0.25, e.cell);
        if (!c) continue;
        this.waveAlive[e.waveIndex]!++;
        if (!c.flying) {
          c.cell = e.cell >= 0 ? e.cell : c.cell;
          c.wcell = e.wcell;
          c.wx = e.wx;
          c.wy = e.wy;
        }
        c.stunTime = C.splitPause; // little "pop out" pause
        this.updateRemaining(c);
      }
      const sev = this.events.push(Ev.Split, e.x, e.y);
      sev.kind = split.into;
    }
    if (e.poisonSpread > 0 && e.poisonStacks > 0) {
      const n = this.spatial.query(e.x, e.y, C.poisonSpread.radius, 1, this.q2);
      let spread = 0;
      for (let i = 0; i < n && spread < e.poisonSpread; i++) {
        const o = this.q2[i]!;
        if (!o.alive || o === e) continue;
        o.poisonPerStack = Math.max(o.poisonPerStack, e.poisonPerStack);
        o.poisonStacks = Math.max(o.poisonStacks, 1);
        o.poisonTime = Math.max(o.poisonTime, C.poisonSpread.time);
        o.poisonSpread = e.poisonSpread;
        o.lastHitBy = e.lastHitBy;
        const cev = this.events.push(Ev.Chain, e.x, e.y);
        cev.x2 = o.x;
        cev.y2 = o.y;
        cev.tag = 'nature';
        cev.kind = 'poison';
        spread++;
      }
    }
    this.waveAlive[e.waveIndex]!--;
  }

  private applyEffects(e: Enemy, st: TowerStats, towerId: number): void {
    if (!e.alive) return;
    const resist = e.def.ccResist ?? 1;
    if (st.slow) {
      const amt = st.slow * (e.boss ? C.bossSlowMult : 1);
      if (amt >= e.slowAmt || e.slowTime <= 0) e.slowAmt = amt;
      e.slowTime = Math.max(e.slowTime, st.slowTime ?? D.slowTime);
    }
    if (st.burnDps) {
      e.burnDps = Math.max(e.burnTime > 0 ? e.burnDps : 0, st.burnDps);
      e.burnTime = Math.max(e.burnTime, st.burnTime ?? D.burnTime);
    }
    if (st.poisonDps) {
      e.poisonPerStack = Math.max(e.poisonTime > 0 ? e.poisonPerStack : 0, st.poisonDps);
      e.poisonStacks = Math.min(st.poisonStacks ?? 1, (e.poisonTime > 0 ? e.poisonStacks : 0) + 1);
      e.poisonTime = st.poisonTime ?? D.poisonTime;
      if (st.poisonSpread) e.poisonSpread = Math.max(e.poisonSpread, st.poisonSpread);
    }
    if (st.armorBreak) {
      e.armorBreak = Math.max(e.armorBreakTime > 0 ? e.armorBreak : 0, st.armorBreak);
      e.armorBreakTime = Math.max(e.armorBreakTime, st.armorBreakTime ?? D.armorBreakTime);
    }
    if (st.stunChance && e.ccImmune <= 0 && this.rng.chance(st.stunChance)) {
      e.stunTime = (st.stunTime ?? D.stunTime) * resist;
      e.ccImmune = e.stunTime + (e.boss ? C.stunImmunity.boss : C.stunImmunity.normal);
      const ev = this.events.push(Ev.Stun, e.x, e.y);
      ev.value = e.stunTime;
    }
    if (st.pushback) this.pushBack(e, st.pushback * resist);
    e.lastHitBy = towerId;
  }

  /** Shove a creature back toward where it came from. */
  private pushBack(e: Enemy, amount: number): void {
    if (amount <= 0) return;
    if (e.flying) {
      const dx = e.x - this.grid.castleX;
      const dy = e.y - this.grid.castleY;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      e.x = Math.max(0.2, Math.min(this.grid.cols - 0.2, e.x + (dx / d) * amount));
      e.y = Math.max(0.2, Math.min(this.grid.rows - 0.2, e.y + (dy / d) * amount));
      return;
    }
    const g = this.grid;
    const c = e.cell;
    if (c < 0) return;
    const cd = this.flow.dist[c]!;
    // upstream neighbour = open neighbour with the largest distance that still leads into c
    let up = -1;
    let upD = cd;
    const x = g.cellX(c);
    const y = g.cellY(c);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (!g.inBounds(nx, ny)) continue;
        const ni = g.idx(nx, ny);
        if (!g.isOpen(ni) || this.flow.next[ni] !== c) continue;
        const nd = this.flow.dist[ni]!;
        if (nd > upD) {
          upD = nd;
          up = ni;
        }
      }
    }
    // first slide back to the centre of the current cell, then into the upstream cell
    let left = amount;
    const cx0 = x + 0.5;
    const cy0 = y + 0.5;
    const d0 = Math.hypot(cx0 - e.x, cy0 - e.y);
    if (d0 >= left) {
      e.x += ((cx0 - e.x) / d0) * left;
      e.y += ((cy0 - e.y) / d0) * left;
      this.setWaypoint(e, c);
      return;
    }
    e.x = cx0;
    e.y = cy0;
    left -= d0;
    if (up < 0) {
      this.setWaypoint(e, this.flow.next[c]!);
      return;
    }
    const ux = g.cellX(up) + 0.5;
    const uy = g.cellY(up) + 0.5;
    const d1 = Math.hypot(ux - e.x, uy - e.y);
    const k = Math.min(1, left / d1);
    e.x += (ux - e.x) * k;
    e.y += (uy - e.y) * k;
    e.cell = k >= 1 ? up : c;
    this.setWaypoint(e, k >= 1 ? this.flow.next[up]! : c);
  }

  // ================================================================ towers

  towerById(id: number): Tower | undefined {
    return id >= 0 ? this.towerIndex[id] : undefined;
  }

  towerAt(cx: number, cy: number): Tower | undefined {
    if (!this.grid.inBounds(cx, cy)) return undefined;
    const id = this.grid.tower[this.grid.idx(cx, cy)]!;
    return id >= 0 ? this.towerById(id) : undefined;
  }

  canBuild(type: TowerId, cx: number, cy: number): BuildCheck {
    const g = this.grid;
    if (!g.inBounds(cx, cy)) return { ok: false, reason: 'outside' };
    const i = g.idx(cx, cy);
    if (g.tower[i]! >= 0) return { ok: false, reason: 'occupied' };
    if (!g.isBuildable(i)) return { ok: false, reason: 'terrain' };
    if (!towerUnlocked(type, this.unlocked)) return { ok: false, reason: 'locked' };
    if (!this.wouldKeepPath(i)) return { ok: false, reason: 'path' };
    if (this.coins < TOWERS[type].levels[0]!.cost) return { ok: false, reason: 'coins' };
    return { ok: true };
  }

  /** Would blocking this cell still let every creature reach the castle? (cached per tower layout) */
  wouldKeepPath(cell: number): boolean {
    const g = this.grid;
    if ((g.flags[cell]! & F_WALK) === 0) return true;
    if (this.buildCacheVersion !== this.towerVersion) {
      this.buildCache.clear();
      this.buildCacheVersion = this.towerVersion;
    }
    // Creatures move, so only cache the spawn check; enemy cells are re-checked live.
    let spawnOk = this.buildCache.get(cell);
    let filled = false;
    if (spawnOk === undefined) {
      this.flow.fill(this.scratchDist, this.scratchNext, cell);
      filled = true;
      spawnOk = this.flow.spawnsConnected(this.scratchDist);
      this.buildCache.set(cell, spawnOk);
    }
    if (!spawnOk) return false;
    let groundEnemies = false;
    for (let i = 0; i < this.enemies.length && !groundEnemies; i++) groundEnemies = this.enemies[i]!.alive && !this.enemies[i]!.flying;
    if (!groundEnemies) return true;
    if (!filled) this.flow.fill(this.scratchDist, this.scratchNext, cell);
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i]!;
      if (!e.alive || e.flying) continue;
      const resume = e.wcell !== cell && g.isOpen(e.wcell) ? e.wcell : e.cell;
      if (resume === cell || resume < 0) continue; // will walk off the new tower via escape pointers
      if (this.scratchDist[resume]! >= UNREACHABLE) return false;
    }
    return true;
  }

  /** Path cells from each spawn if `blockCell` were blocked (for the placement preview). */
  previewPaths(blockCell: number, out: number[][]): number[][] {
    this.flow.fill(this.scratchDist, this.scratchNext, blockCell);
    const spawns = this.grid.spawns;
    while (out.length < spawns.length) out.push([]);
    out.length = spawns.length;
    for (let s = 0; s < spawns.length; s++) {
      if (this.scratchDist[spawns[s]!]! >= UNREACHABLE) out[s]!.length = 0;
      else this.flow.pathFrom(spawns[s]!, out[s], this.scratchDist, this.scratchNext);
    }
    return out;
  }

  currentPaths(out: number[][]): number[][] {
    const spawns = this.grid.spawns;
    while (out.length < spawns.length) out.push([]);
    out.length = spawns.length;
    for (let s = 0; s < spawns.length; s++) this.flow.pathFrom(spawns[s]!, out[s]);
    return out;
  }

  /** Longest spawn→castle walking distance right now (tiles). */
  pathLength(): number {
    let best = 0;
    for (const s of this.grid.spawns) best = Math.max(best, this.flow.dist[s]!);
    return best;
  }

  build(type: TowerId, cx: number, cy: number): Tower | null {
    if (this.state !== 'playing') return null;
    const check = this.canBuild(type, cx, cy);
    if (!check.ok) return null;
    const def = TOWERS[type];
    const cost = def.levels[0]!.cost;
    const t = new Tower();
    t.id = this.nextTowerId++;
    t.def = def;
    t.level = 1;
    t.cx = cx;
    t.cy = cy;
    t.cell = this.grid.idx(cx, cy);
    t.x = cx + 0.5;
    t.y = cy + 0.5;
    t.invested = cost;
    t.cooldown = C.buildCooldown;
    t.builtAtTick = this.tick;
    t.sinceBuild = 0;
    t.mode = def.behavior === 'pulse' ? 'close' : 'first';
    this.coins -= cost;
    this.stats.coinsSpent += cost;
    this.towers.push(t);
    this.towerIndex[t.id] = t;
    this.grid.tower[t.cell] = t.id;
    this.afterLayoutChange(t.cell);
    this.stats.towersBuilt++;
    if (def.kind === 'combo') this.stats.combosBuilt++;
    this.stats.towerTypes.add(type);
    if (this.stats.maxLevel < 1) this.stats.maxLevel = 1;
    const ev = this.events.push(Ev.Build, t.x, t.y);
    ev.kind = type;
    ev.id = t.id;
    ev.value = cost;
    return t;
  }

  upgradeCost(t: Tower): number {
    return t.level >= MAX_LEVEL ? 0 : t.def.levels[t.level]!.cost;
  }

  /** True when the next upgrade picks a specialization (level 2 → 3 on element/combo towers). */
  needsSpec(t: Tower): boolean {
    return !!t.def.specs && t.level === SPEC_LEVEL - 1;
  }

  /**
   * Upgrade a tower. Going to level 3 locks in specialization `spec` (0 or 1;
   * defaults to the first path when omitted).
   */
  upgrade(t: Tower, spec?: 0 | 1): boolean {
    if (this.state !== 'playing' || t.level >= MAX_LEVEL) return false;
    const cost = this.upgradeCost(t);
    if (this.coins < cost) return false;
    this.coins -= cost;
    this.stats.coinsSpent += cost;
    t.invested += cost;
    if (this.needsSpec(t)) {
      t.spec = spec ?? 0;
      this.stats.specsChosen.push(t.def.specs![t.spec]!.id);
    }
    t.level++;
    t.sinceBuild = 0;
    this.stats.upgrades++;
    if (t.level > this.stats.maxLevel) this.stats.maxLevel = t.level;
    this.recomputeAuras();
    const ev = this.events.push(Ev.Upgrade, t.x, t.y);
    ev.kind = t.def.id;
    ev.id = t.id;
    ev.value = t.level;
    ev.value2 = t.spec;
    return true;
  }

  sell(t: Tower): number {
    const idx = this.towers.indexOf(t);
    if (idx < 0 || this.state !== 'playing') return 0;
    const refund = sellValue(t.invested);
    this.coins += refund;
    this.stats.soldTowers.push({ type: t.def.id, level: t.level, spec: t.spec, damage: t.damageDone, kills: t.kills });
    this.towers.splice(idx, 1);
    this.towerIndex[t.id] = undefined;
    this.grid.tower[t.cell] = -1;
    this.stats.sold++;
    this.afterLayoutChange(t.cell);
    const ev = this.events.push(Ev.Sell, t.x, t.y);
    ev.kind = t.def.id;
    ev.id = t.id;
    ev.value = refund;
    return refund;
  }

  setTargetMode(t: Tower, mode: TargetMode): void {
    t.mode = mode;
  }

  private afterLayoutChange(cell: number): void {
    this.towerVersion++;
    if ((this.grid.flags[cell]! & F_WALK) !== 0) {
      this.flow.compute();
      // Creatures heading into a newly blocked cell turn back to their last cell centre.
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i]!;
        if (!e.alive || e.flying) continue;
        if (!this.grid.isOpen(e.wcell) && e.cell >= 0 && this.grid.isOpen(e.cell) && e.cell !== e.wcell) {
          this.setWaypoint(e, e.cell);
        }
        this.updateRemaining(e);
      }
      const len = this.pathLength();
      if (len < UNREACHABLE && len > this.stats.longestPath) this.stats.longestPath = len;
    }
    this.recomputeAuras();
  }

  private recomputeAuras(): void {
    for (const t of this.towers) {
      t.rateMult = 1;
      t.dmgMult = 1;
    }
    for (const a of this.towers) {
      const st = a.stats;
      if (!st.auraRadius || (!st.auraRate && !st.auraDamage)) continue;
      const r2 = st.auraRadius * st.auraRadius;
      for (const t of this.towers) {
        if (t === a) continue;
        const dx = t.x - a.x;
        const dy = t.y - a.y;
        if (dx * dx + dy * dy > r2) continue;
        if (st.auraRate) t.rateMult = Math.max(t.rateMult, 1 + st.auraRate);
        if (st.auraDamage) t.dmgMult = Math.max(t.dmgMult, 1 + st.auraDamage);
      }
    }
  }

  // ---------------------------------------------------------------- targeting

  private better(mode: TargetMode, a: Enemy, b: Enemy | null, tx: number, ty: number): boolean {
    if (!b) return true;
    switch (mode) {
      case 'first':
        return a.remaining < b.remaining;
      case 'last':
        return a.remaining > b.remaining;
      case 'strong':
        return a.hp > b.hp || (a.hp === b.hp && a.remaining < b.remaining);
      case 'close': {
        const da = (a.x - tx) * (a.x - tx) + (a.y - ty) * (a.y - ty);
        const db = (b.x - tx) * (b.x - tx) + (b.y - ty) * (b.y - ty);
        return da < db;
      }
    }
  }

  /** Pick up to `max` targets into this.picked. Returns count. */
  private pickTargets(t: Tower, range: number, max: number): number {
    const air: 0 | 1 = t.def.targets === 'both' ? 1 : 0;
    const n = this.spatial.query(t.x, t.y, range, air, this.q);
    if (n === 0) return 0;
    let count = 0;
    for (let k = 0; k < max; k++) {
      let best: Enemy | null = null;
      for (let i = 0; i < n; i++) {
        const e = this.q[i]!;
        if (!e.targetable) continue;
        let used = false;
        for (let j = 0; j < count; j++) if (this.picked[j] === e) used = true;
        if (used) continue;
        if (this.better(t.mode, e, best, t.x, t.y)) best = e;
      }
      if (!best) break;
      this.picked[count++] = best;
    }
    return count;
  }

  private updateTowers(): void {
    for (let i = 0; i < this.towers.length; i++) {
      const t = this.towers[i]!;
      t.sinceFire += DT;
      t.sinceBuild += DT;
      if (t.disabled > 0) {
        t.disabled -= DT;
        t.beamTarget = null;
        continue;
      }
      const st = t.stats;
      if (t.def.behavior === 'beam') {
        this.updateBeam(t, st);
        continue;
      }
      if (t.cooldown > 0) t.cooldown -= DT * t.rateMult;
      if (t.cooldown > 0) continue;
      let fired = false;
      switch (t.def.behavior) {
        case 'bullet':
        case 'mortar':
          fired = this.fireBullets(t, st);
          break;
        case 'chain':
          fired = this.fireChain(t, st);
          break;
        case 'pulse':
          fired = this.firePulse(t, st);
          break;
      }
      if (fired) {
        t.cooldown += 1 / st.rate;
        if (t.cooldown < 0) t.cooldown = 0;
        t.sinceFire = 0;
      } else {
        t.cooldown = 0;
      }
    }
  }

  private fireBullets(t: Tower, st: TowerStats): boolean {
    const n = this.pickTargets(t, st.range, st.shots ?? 1);
    if (n === 0) return false;
    for (let k = 0; k < n; k++) {
      const e = this.picked[k]!;
      const p = this.spawnProjectile(t, st, e);
      if (k === 0) t.angle = Math.atan2(e.y - t.y, e.x - t.x);
      if (p && k === 0) {
        const ev = this.events.push(Ev.Fire, t.x, t.y);
        ev.x2 = e.x;
        ev.y2 = e.y;
        ev.kind = t.def.id;
        ev.tag = p.style;
        ev.id = t.id;
      }
    }
    return true;
  }

  private spawnProjectile(t: Tower, st: TowerStats, e: Enemy): Projectile | null {
    if (this.projectiles.length >= MAX_PROJECTILES) return null;
    let p = this.projFree.pop();
    if (!p) p = new Projectile(this.projSlots++);
    p.active = true;
    p.style = t.def.projectile ?? 'arrow';
    p.x = p.px = t.x;
    p.y = p.py = t.y - 0.15;
    p.target = e;
    p.targetId = e.id;
    p.tx = e.x;
    p.ty = e.y;
    p.stats = st;
    p.elements = t.def.elements;
    p.towerId = t.id;
    p.hitsAir = t.def.targets === 'both';
    p.crit = !!st.critChance && this.rng.chance(st.critChance);
    p.damage = st.damage * t.dmgMult * (p.crit ? (st.critMult ?? D.critMult) : 1);
    p.angle = Math.atan2(e.y - p.y, e.x - p.x);
    p.z = 0;
    if (t.def.behavior === 'mortar') {
      p.lob = true;
      p.sx = p.x;
      p.sy = p.y;
      // lead the target a little
      const lead = C.mortar.lead * e.currentSpeed;
      const dx = e.wx - e.x;
      const dy = e.wy - e.y;
      const d = Math.hypot(dx, dy) || 1;
      p.tx = e.x + (dx / d) * Math.min(lead, d);
      p.ty = e.y + (dy / d) * Math.min(lead, d);
      p.t = 0;
      p.tTotal = C.mortar.flight;
      p.target = null;
    } else {
      p.lob = false;
      p.speed = SPEED[p.style] ?? 10;
    }
    this.projectiles.push(p);
    return p;
  }

  private fireChain(t: Tower, st: TowerStats): boolean {
    const n = this.pickTargets(t, st.range, 1);
    if (n === 0) return false;
    let cur = this.picked[0]!;
    t.angle = Math.atan2(cur.y - t.y, cur.x - t.x);
    let fromX = t.x;
    let fromY = t.y - 0.3;
    let dmg = st.damage * t.dmgMult;
    const bounces = (st.chain ?? 0) + 1;
    const hit = this.picked;
    let hitCount = 0;
    const elTag = t.def.elements[t.def.elements.length - 1] ?? 'light';
    for (let b = 0; b < bounces; b++) {
      const ev = this.events.push(Ev.Chain, fromX, fromY);
      ev.x2 = cur.x;
      ev.y2 = cur.y;
      ev.tag = elTag;
      ev.kind = t.def.id;
      ev.value = b;
      hit[hitCount++] = cur;
      const cx = cur.x;
      const cy = cur.y;
      this.damage(cur, dmg, t.def.elements, t.id);
      this.applyEffects(cur, st, t.id);
      if (hitCount >= hit.length) break;
      // find nearest un-hit creature
      const m = this.spatial.query(cx, cy, C.chainRadius, t.def.targets === 'both' ? 1 : 0, this.q2);
      let best: Enemy | null = null;
      let bestD = Infinity;
      for (let i = 0; i < m; i++) {
        const o = this.q2[i]!;
        if (!o.alive || !o.targetable) continue;
        let used = false;
        for (let j = 0; j < hitCount; j++) if (hit[j] === o) used = true;
        if (used) continue;
        const d = (o.x - cx) * (o.x - cx) + (o.y - cy) * (o.y - cy);
        if (d < bestD) {
          bestD = d;
          best = o;
        }
      }
      if (!best) break;
      fromX = cx;
      fromY = cy;
      cur = best;
      dmg *= st.chainFalloff ?? D.chainFalloff;
    }
    return true;
  }

  private firePulse(t: Tower, st: TowerStats): boolean {
    const air: 0 | 1 = t.def.targets === 'both' ? 1 : 0;
    const n = this.spatial.query(t.x, t.y, st.range, air, this.q);
    if (n === 0) return false;
    const dmg = st.damage * t.dmgMult;
    for (let i = 0; i < n; i++) {
      const e = this.q[i]!;
      this.damage(e, dmg, t.def.elements, t.id);
      this.applyEffects(e, st, t.id);
    }
    const ev = this.events.push(Ev.Pulse, t.x, t.y);
    ev.value = st.range;
    ev.kind = t.def.id;
    ev.tag = t.def.elements[0] ?? '';
    ev.id = t.id;
    return true;
  }

  private updateBeam(t: Tower, st: TowerStats): void {
    let e = t.beamTarget;
    const range = st.range;
    if (e && (!e.alive || !e.targetable || e.id !== t.beamTargetId || (e.x - t.x) ** 2 + (e.y - t.y) ** 2 > (range + e.radius) ** 2)) {
      e = null;
    }
    if (!e) {
      const n = this.pickTargets(t, range, 1);
      e = n > 0 ? this.picked[0]! : null;
      t.beamTime = 0;
      t.beamTarget = e;
      t.beamTargetId = e ? e.id : 0;
    }
    if (!e) return;
    t.beamTime += DT;
    t.sinceFire = 0;
    const ramp = 1 + ((st.beamRamp ?? D.beamRamp) - 1) * Math.min(1, t.beamTime / (st.beamRampTime ?? D.beamRampTime));
    t.angle = Math.atan2(e.y - t.y, e.x - t.x);
    this.damage(e, st.damage * ramp * t.dmgMult * t.rateMult * DT, t.def.elements, t.id);
  }

  // ---------------------------------------------------------------- projectiles

  private updateProjectiles(): void {
    const arr = this.projectiles;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i]!;
      p.px = p.x;
      p.py = p.y;
      let arrived = false;
      if (p.lob) {
        p.t += DT;
        const f = Math.min(1, p.t / p.tTotal);
        p.x = p.sx + (p.tx - p.sx) * f;
        p.y = p.sy + (p.ty - p.sy) * f;
        p.z = Math.sin(Math.PI * f) * 1.6;
        p.angle = Math.atan2(p.ty - p.sy, p.tx - p.sx);
        arrived = f >= 1;
      } else {
        const tg = p.target;
        if (tg && tg.alive && tg.id === p.targetId) {
          p.tx = tg.x;
          p.ty = tg.y;
        } else p.target = null;
        const dx = p.tx - p.x;
        const dy = p.ty - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const step = p.speed * DT;
        if (d > 0.0001) p.angle = Math.atan2(dy, dx);
        if (d <= step + 0.15) {
          p.x = p.tx;
          p.y = p.ty;
          arrived = true;
        } else {
          p.x += (dx / d) * step;
          p.y += (dy / d) * step;
        }
      }
      if (arrived) {
        this.impact(p);
        p.active = false;
        p.target = null;
        swapRemove(arr, i);
        this.projFree.push(p);
      }
    }
  }

  private impact(p: Projectile): void {
    const st = p.stats;
    if (st.splash) {
      const n = this.spatial.query(p.tx, p.ty, st.splash, p.hitsAir ? 1 : 0, this.q2);
      for (let i = 0; i < n; i++) {
        const e = this.q2[i]!;
        // the primary target takes full damage; others take 70%
        const k = e === p.target ? 1 : C.splashFalloff;
        this.damage(e, p.damage * k, p.elements, p.towerId);
        this.applyEffects(e, st, p.towerId);
      }
      const ev = this.events.push(Ev.Splash, p.tx, p.ty);
      ev.value = st.splash;
      ev.kind = p.style;
      ev.tag = p.elements[0] ?? '';
    } else if (p.target && p.target.alive && p.target.id === p.targetId && !p.target.burrowed) {
      const target = p.target;
      const dealt = this.damage(target, p.damage, p.elements, p.towerId);
      this.applyEffects(target, st, p.towerId);
      const ev = this.events.push(Ev.Hit, p.tx, p.ty);
      ev.kind = p.style;
      ev.tag = p.elements[0] ?? '';
      ev.value = dealt;
      ev.value2 = p.crit ? 1 : 0;
      ev.id = target.slot;
    }
    if (p.crit) {
      const ev = this.events.push(Ev.Crit, p.tx, p.ty);
      ev.value = Math.round(p.damage);
    }
    if (st.zoneDps) this.spawnZone(p);
  }

  private spawnZone(p: Projectile): void {
    if (this.zones.length >= MAX_ZONES) return;
    let z = this.zoneFree.pop();
    if (!z) z = new Zone(this.zoneSlots++);
    const st = p.stats;
    z.active = true;
    z.x = p.tx;
    z.y = p.ty;
    z.r = st.zoneRadius ?? D.zoneRadius;
    z.dps = st.zoneDps!;
    z.slow = st.zoneSlow ?? 0;
    z.time = z.maxTime = st.zoneTime ?? D.zoneTime;
    z.tick = 0;
    z.hitsAir = p.hitsAir;
    z.elements = p.elements;
    z.towerId = p.towerId;
    z.look = p.style === 'lava' ? 'lava' : 'steam';
    this.zones.push(z);
    const ev = this.events.push(Ev.Zone, z.x, z.y);
    ev.value = z.r;
    ev.kind = z.look;
  }

  private updateZones(): void {
    const arr = this.zones;
    for (let i = arr.length - 1; i >= 0; i--) {
      const z = arr[i]!;
      z.time -= DT;
      z.tick -= DT;
      if (z.tick <= 0) {
        z.tick += C.zoneTick;
        const n = this.spatial.query(z.x, z.y, z.r, z.hitsAir ? 1 : 0, this.q2);
        for (let k = 0; k < n; k++) {
          const e = this.q2[k]!;
          this.damage(e, z.dps * C.zoneTick, z.elements, z.towerId, true);
          if (z.slow > 0 && e.alive) {
            if (z.slow >= e.slowAmt || e.slowTime <= 0) e.slowAmt = z.slow * (e.boss ? C.bossSlowMult : 1);
            e.slowTime = Math.max(e.slowTime, 0.4);
          }
        }
      }
      if (z.time <= 0) {
        z.active = false;
        swapRemove(arr, i);
        this.zoneFree.push(z);
      }
    }
  }

  // ================================================================ mechanics

  /** Detector towers reveal cloaked constructs in range. */
  private updateDetection(): void {
    for (let i = 0; i < this.towers.length; i++) {
      const t = this.towers[i]!;
      const st = t.stats;
      if (!st.detect || t.disabled > 0) continue;
      const n = this.spatial.query(t.x, t.y, st.range, 1, this.q2);
      for (let k = 0; k < n; k++) {
        const e = this.q2[k]!;
        if (e.cloaked) e.revealed = C.revealLinger;
      }
    }
  }

  /** The attack this construct uses right now (jammer static burst or the boss's phase attack). */
  private attackOf(e: Enemy): BossAttack | null {
    const def = e.def;
    if (def.emp) {
      let a = this.empAttacks.get(def.id);
      if (!a) {
        a = { kind: 'stomp', every: def.emp.every, windup: def.emp.windup, radius: def.emp.radius, duration: def.emp.duration };
        this.empAttacks.set(def.id, a);
      }
      return a;
    }
    const ph = def.phases;
    if (!ph) return null;
    for (let i = e.phase - 1; i >= 0; i--) if (ph[i]!.attack) return ph[i]!.attack!;
    return null;
  }

  private updateBossPhase(e: Enemy): void {
    const ph = e.def.phases!;
    if (e.phase >= ph.length || e.hp / e.maxHp >= ph[e.phase]!.at) return;
    const p = ph[e.phase]!;
    e.phase++;
    if (p.shield) e.barrier = e.barrierMax = Math.round(e.maxHp * p.shield);
    if (p.speed) e.speedMult = p.speed;
    if (p.armor !== undefined) e.armor = p.armor;
    if (p.regen) {
      e.regenPct = p.regen.pct;
      e.regenDelay = p.regen.delay;
    }
    if (p.cloak) {
      e.cloakHidden = p.cloak.hidden;
      e.cloakVisible = p.cloak.visible;
      e.cloakTimer = 0;
    }
    if (p.attack) e.attackTimer = 1.5;
    const ev = this.events.push(Ev.BossPhase, e.x, e.y);
    ev.value = e.phase + 1;
    ev.kind = p.key;
    ev.tag = e.def.id;
    ev.id = e.slot;
  }

  private updateAttack(e: Enemy, atk: BossAttack): void {
    if (e.windup > 0) {
      e.windup -= DT;
      if (e.windup <= 0) {
        e.windup = 0;
        e.attackTimer = atk.every;
        this.executeAttack(e, atk);
      }
      return;
    }
    if (e.burrowed) return;
    e.attackTimer -= DT;
    // summons need room: no brood or swarm right at the Citadel gate
    const summon = atk.kind === 'brood' || atk.kind === 'swarm';
    if (e.attackTimer <= 0 && summon && e.remaining < C.summonMinDistance) e.attackTimer = 0.5;
    if (e.attackTimer <= 0) {
      e.windup = atk.windup;
      const ev = this.events.push(Ev.Warn, e.x, e.y);
      ev.value = atk.radius;
      ev.value2 = atk.windup;
      ev.kind = e.def.emp ? 'emp' : atk.kind;
      ev.tag = e.def.id;
      ev.id = e.slot;
    }
  }

  private executeAttack(e: Enemy, atk: BossAttack): void {
    if (atk.kind === 'brood' || atk.kind === 'swarm') {
      const child = ENEMIES[atk.spawn ?? 'minigloop'];
      const wave = this.getWave(e.waveIndex + 1)!;
      const n = atk.count ?? 3;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const c = this.spawnEnemy(child, null, wave, e.waveIndex, e.x + Math.cos(a) * atk.radius * 0.5, e.y + Math.sin(a) * atk.radius * 0.5, e.cell);
        if (!c) continue;
        this.waveAlive[e.waveIndex]!++;
        if (!c.flying && e.cell >= 0) {
          c.cell = e.cell;
          c.wcell = e.wcell;
          c.wx = e.wx;
          c.wy = e.wy;
        }
        c.stunTime = C.splitPause;
        this.updateRemaining(c);
      }
      const sev = this.events.push(Ev.Split, e.x, e.y);
      sev.kind = child.id;
      return;
    }
    // stomp / null field / static burst: knock towers offline
    const r2 = (atk.radius + 0.5) * (atk.radius + 0.5);
    const dur = atk.duration ?? 2;
    for (let i = 0; i < this.towers.length; i++) {
      const t = this.towers[i]!;
      const dx = t.x - e.x;
      const dy = t.y - e.y;
      if (dx * dx + dy * dy <= r2) t.disabled = Math.max(t.disabled, dur);
    }
    const ev = this.events.push(Ev.Disable, e.x, e.y);
    ev.value = atk.radius;
    ev.value2 = dur;
    ev.kind = e.def.emp ? 'emp' : atk.kind;
  }

  /** Tunnelling: returns true while the construct moves underground this tick. */
  private updateBurrow(e: Enemy): boolean {
    const B = e.def.burrow!;
    e.burrowTimer -= DT;
    if (!e.burrowed) {
      if (e.burrowTimer > 0 || e.stunTime > 0 || e.windup > 0) return false;
      e.burrowed = true;
      e.burrowTimer = B.duration;
      e.slowTime = 0;
      const ev = this.events.push(Ev.Burrow, e.x, e.y);
      ev.value = 1;
      ev.id = e.slot;
    }
    const g = this.grid;
    const dx = g.castleX - e.x;
    const dy = g.castleY - e.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const move = e.speed * e.speedMult * B.speed * DT;
    if (e.burrowTimer > 0 && d > 1.2) {
      e.x += (dx / d) * Math.min(move, d);
      e.y += (dy / d) * Math.min(move, d);
      if (Math.abs(dx) > 0.01) e.facing = dx > 0 ? 1 : -1;
      e.remaining = d;
      return true;
    }
    this.surface(e);
    return false;
  }

  /** Come up on the nearest open, reachable cell (never inside a tower). */
  private surface(e: Enemy): void {
    const g = this.grid;
    const cx = Math.floor(e.x);
    const cy = Math.floor(e.y);
    const R = C.surfaceSearch;
    let best = -1;
    let bestD = Infinity;
    for (let y = cy - R; y <= cy + R; y++) {
      for (let x = cx - R; x <= cx + R; x++) {
        if (!g.inBounds(x, y)) continue;
        const i = g.idx(x, y);
        if (!g.isOpen(i) || this.flow.dist[i]! >= UNREACHABLE) continue;
        const ddx = x + 0.5 - e.x;
        const ddy = y + 0.5 - e.y;
        const dd = ddx * ddx + ddy * ddy;
        if (dd < bestD) {
          bestD = dd;
          best = i;
        }
      }
    }
    if (best < 0) best = e.cell >= 0 && g.isOpen(e.cell) ? e.cell : this.grid.spawns[0]!;
    e.burrowed = false;
    e.burrowTimer = e.def.burrow!.every;
    e.cell = best;
    e.x = g.cellX(best) + 0.5;
    e.y = g.cellY(best) + 0.5;
    this.setWaypoint(e, this.flow.next[best]!);
    this.updateRemaining(e);
    const ev = this.events.push(Ev.Burrow, e.x, e.y);
    ev.value = 0;
    ev.id = e.slot;
  }

  // ================================================================ elements

  chooseElement(el: ElementId): boolean {
    if (this.crystals <= 0 || this.unlocked.includes(el)) return false;
    this.crystals--;
    this.unlocked.push(el);
    const ev = this.events.push(Ev.ElementPicked, this.grid.castleX, this.grid.castleY);
    ev.tag = el;
    return true;
  }

  /** Debug / tests: spawn a creature directly. */
  debugSpawn(id: EnemyId, el: ElementId | null = null, spawnIdx = 0): Enemy | null {
    const w = this.getWave(Math.max(1, this.waveNum)) ?? generateWave(1, this.map);
    const sp = this.grid.spawns[spawnIdx % this.grid.spawns.length]!;
    const e = this.spawnEnemy(ENEMIES[id], el, w, Math.max(0, this.waveNum - 1), this.grid.cellX(sp) + 0.5, this.grid.cellY(sp) + 0.5, sp);
    if (e) {
      const idx = Math.max(0, this.waveNum - 1);
      this.waveAlive[idx] = (this.waveAlive[idx] ?? 0) + 1;
      if (this.waveCleared[idx] === undefined) this.waveCleared[idx] = true;
    }
    return e;
  }
}

/** Damage-over-time is element-neutral. */
const NEUTRAL: readonly ElementId[] = [];
