import { counterOf, ELEMENT_ORDER, type ElementId } from '../data/elements';
import type { Difficulty } from '../data/difficulty';
import type { MapDef } from '../data/maps/types';
import { comboFor, ELEMENT_TOWERS, MAX_LEVEL, statsFor, TOWERS, type TowerId, type TowerStats } from '../data/towers';
import type { Tower } from './entities';
import { DT, Game, type GameMode } from './Game';
import { F_WALK } from './grid';
import { UNREACHABLE } from './flowField';

export interface BotOptions {
  /** 'good' builds smart mazes; 'casual' places towers less cleverly (a younger player). */
  skill?: 'good' | 'casual';
  /** Seconds between decisions. */
  thinkEvery?: number;
}

/** Rough damage-per-second estimate used for spending decisions. */
function power(st: TowerStats): number {
  const hits = (st.shots ?? 1) * (1 + (st.chain ?? 0) * 0.7) * (st.splash ? 1.6 : 1);
  const control = (st.slow ? 1 + st.slow : 1) * (st.stunChance ? 1.2 : 1) * (st.auraRate ? 1.4 : 1);
  const crit = 1 + (st.critChance ?? 0) * ((st.critMult ?? 2) - 1);
  const extra = (st.bossMult ? 1 + (st.bossMult - 1) * 0.3 : 1) * (st.airMult ? 1 + (st.airMult - 1) * 0.3 : 1) * (st.wardBreak ? 1.1 : 1);
  return (st.damage * st.rate * hits * crit + (st.burnDps ?? 0) + (st.poisonDps ?? 0) * 1.5 + (st.zoneDps ?? 0)) * control * extra;
}

/** The specialization path the bot takes at level 3 (best L3 + L4 power). */
function bestSpec(t: Tower): 0 | 1 {
  const specs = t.def.specs!;
  const score = (i: 0 | 1): number => power(specs[i].levels[0]) + 0.5 * power(specs[i].levels[1]);
  return score(1) > score(0) ? 1 : 0;
}

/** Stats a tower would have after its next upgrade (taking the bot's spec choice). */
function nextStats(g: Game, t: Tower): TowerStats {
  return g.needsSpec(t) ? t.def.specs![bestSpec(t)].levels[0] : statsFor(t.def, t.level + 1, t.spec);
}

/** Combo preference (strong all-rounders first). */
const COMBO_RANK: TowerId[] = ['crystal', 'eclipse', 'solar', 'wildfire', 'nightshade', 'wisp', 'rainbow', 'ironbark', 'steam', 'magma', 'sunflower', 'gravity', 'quicksand', 'raingarden', 'whirlpool'];

/**
 * A simple headless player used to prove every map is winnable and to tune
 * balance. It is intentionally not perfect: if this bot wins, kids can too.
 */
export class AutoPlayer {
  private timer = 0;
  private readonly skill: 'good' | 'casual';
  private readonly thinkEvery: number;
  private elementPlan: ElementId[];
  private pathCells: number[] = [];
  private pathVersion = -1;
  private flightCells: number[] = [];
  private scratchDist: Float64Array;
  private scratchNext: Int32Array;
  /** Planned serpentine maze walls (maze maps, good bot). */
  private mazePlan = new Set<number>();
  /** Wall cells grouped per wall, in build order (a wall only helps once it is complete). */
  private walls: number[][] = [];
  private prunedAt = -1;

  constructor(
    private readonly g: Game,
    opts: BotOptions = {},
  ) {
    this.skill = opts.skill ?? 'good';
    this.thinkEvery = opts.thinkEvery ?? 0.5;
    const fav = g.map.favoredElements ?? [];
    const plan: ElementId[] = [];
    for (const e of fav) {
      const c = counterOf(e);
      if (!plan.includes(c)) plan.push(c);
    }
    for (const e of ['light', 'nature', 'fire', 'shadow', 'water', 'earth'] as ElementId[]) if (!plan.includes(e)) plan.push(e);
    this.elementPlan = plan;
    const n = g.grid.cols * g.grid.rows;
    this.scratchDist = new Float64Array(n);
    this.scratchNext = new Int32Array(n);
    const gr = g.grid;
    // split platforms (gates) and changing terrain maze better greedily than with one field-wide zig-zag
    if (g.map.style === 'maze' && this.skill === 'good' && gr.teleports.length === 0 && !gr.dynamic.some((d) => d.kind === 'unstable')) this.planSerpentine();
    // flyers: the sky lane when the map has one, else a straight line to the nearest castle
    if (gr.skyPath.length) {
      for (const c of gr.skyPath) this.flightCells.push(c);
    } else {
      for (const s of gr.spawns) {
        const sx = gr.cellX(s) + 0.5;
        const sy = gr.cellY(s) + 0.5;
        const goal = gr.nearestCastle(sx, sy);
        for (let t = 0; t <= 1; t += 0.05) {
          const c = gr.cellAt(sx + (goal.x - sx) * t, sy + (goal.y - sy) * t);
          if (c >= 0 && !this.flightCells.includes(c)) this.flightCells.push(c);
        }
      }
    }
  }

  /**
   * Plan wall columns with alternating gaps (top, bottom, top…) so creatures
   * zig-zag across the whole field — the classic mazing strategy.
   */
  private planSerpentine(): void {
    const gr = this.g.grid;
    // First gap goes on the side away from where creatures come in, so even the
    // first finished wall makes them walk further; later gaps alternate.
    let spawnY = 0;
    for (const sp of gr.spawns) spawnY += gr.cellY(sp);
    spawnY /= gr.spawns.length;
    let gapBottom = spawnY < gr.rows / 2;
    // Walls are built from the spawn side toward the castle: every finished wall adds a full zig.
    for (let x = 3; x <= gr.cols - 4; x += 3) {
      const gap = gapBottom ? gr.rows - 2 : 1;
      gapBottom = !gapBottom;
      const wall: number[] = [];
      for (let y = 1; y <= gr.rows - 2; y++) {
        if (y === gap) continue;
        const c = gr.idx(x, y);
        if ((gr.flags[c]! & F_WALK) !== 0 && gr.isBuildable(c)) wall.push(c);
      }
      this.walls.push(wall);
      for (const c of wall) this.mazePlan.add(c);
    }
  }

  /** Cells of the first wall that still has gaps to fill. */
  private currentWall(): Set<number> | null {
    const g = this.g;
    for (const w of this.walls) {
      const open = w.filter((c) => this.mazePlan.has(c) && g.grid.isBuildable(c));
      if (open.length) return new Set(open);
    }
    return null;
  }

  /** Call once per sim tick. */
  update(): void {
    const g = this.g;
    if (g.state !== 'playing') return;
    if (g.waveNum === 0) {
      this.think();
      this.think();
      g.sendNextWave();
      return;
    }
    this.timer -= DT;
    if (this.timer > 0) return;
    this.timer = this.thinkEvery;
    this.think();
  }

  private think(): void {
    const g = this.g;
    while (g.crystals > 0) {
      const el = this.elementPlan.find((e) => !g.unlocked.includes(e)) ?? ELEMENT_ORDER.find((e) => !g.unlocked.includes(e));
      if (!el || !g.chooseElement(el)) break;
    }
    // Spend on whatever adds the most power per coin: a new tower (plus a bonus
    // while the maze still has walls to build) or upgrading an existing one.
    for (let guard = 0; guard < 8; guard++) {
      const want = this.desiredTower();
      const buildCost = want ? TOWERS[want].levels[0]!.cost : Infinity;
      let buildValue = want ? power(TOWERS[want].levels[0]!) / buildCost : 0;
      if (want && this.mazeWallsLeft() > 0) buildValue *= 1.6;
      if (want && g.towers.length < 6) buildValue *= 3;
      const up = this.bestUpgrade();
      const upCost = up ? g.upgradeCost(up) : Infinity;
      const upValue = up ? (power(nextStats(g, up)) - power(up.stats)) / upCost : 0;
      if (want && buildValue >= upValue) {
        if (g.coins < buildCost || !this.place(want)) break;
      } else if (up) {
        if (g.coins < upCost) break;
        g.upgrade(up, g.needsSpec(up) ? bestSpec(up) : undefined);
      } else break;
    }
  }

  private mazeWallsLeft(): number {
    let n = 0;
    for (const c of this.mazePlan) if (this.g.grid.isBuildable(c)) n++;
    return n;
  }

  /** Which tower to build next. */
  private desiredTower(): TowerId | null {
    const g = this.g;
    const un = g.unlocked;
    // early: cheap arrow posts to start the maze (and keep walls coming on maze maps)
    if (g.waveNum <= 2 && g.towers.length < 7) return 'arrow';
    const elementCost = TOWERS.flame.levels[0]!.cost;
    if (g.map.style === 'maze' && g.towers.length < 8 + g.waveNum * 0.7 && g.coins < elementCost) return 'arrow';
    const combos: TowerId[] = [];
    for (let i = 0; i < un.length; i++) for (let j = i + 1; j < un.length; j++) combos.push(comboFor(un[i]!, un[j]!)!);
    const comboChoice = COMBO_RANK.find((c) => combos.includes(c));
    const airCapable = g.towers.filter((t) => t.def.targets === 'both').length;
    if (comboChoice && g.coins >= TOWERS[comboChoice].levels[0]!.cost) {
      if (TOWERS[comboChoice].targets === 'ground' && airCapable < g.towers.length * 0.6) {
        const alt = COMBO_RANK.find((c) => combos.includes(c) && TOWERS[c].targets === 'both');
        if (alt) return alt;
      }
      return comboChoice;
    }
    if (un.length) {
      const el = un[g.towers.length % un.length]!;
      const id = ELEMENT_TOWERS[el] as TowerId;
      if (TOWERS[id].targets === 'ground' && airCapable < g.towers.length * 0.6) return 'arrow';
      return id;
    }
    return 'arrow';
  }

  private bestUpgrade(): Tower | null {
    let best: Tower | null = null;
    let bestScore = -1;
    for (const t of this.g.towers) {
      if (t.level >= MAX_LEVEL) continue;
      const gain = power(nextStats(this.g, t)) - power(t.stats);
      // towers that actually see action are worth more
      const score = (gain / this.g.upgradeCost(t)) * (1 + Math.min(2, t.kills / 20));
      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    }
    return best;
  }

  private refreshPath(): void {
    if (this.pathVersion === this.g.towerVersion) return;
    this.pathVersion = this.g.towerVersion;
    const paths = this.g.currentPaths([]);
    const set = new Set<number>();
    for (const p of paths) for (const c of p) set.add(c);
    this.pathCells = [...set];
  }

  /** How many path cells (ground) and flight cells this spot covers. */
  private coverage(cell: number, range: number, air: boolean): number {
    const gr = this.g.grid;
    const x = gr.cellX(cell) + 0.5;
    const y = gr.cellY(cell) + 0.5;
    const r2 = range * range;
    let n = 0;
    for (const c of this.pathCells) {
      const dx = gr.cellX(c) + 0.5 - x;
      const dy = gr.cellY(c) + 0.5 - y;
      if (dx * dx + dy * dy <= r2) n++;
    }
    if (air) {
      for (const c of this.flightCells) {
        const dx = gr.cellX(c) + 0.5 - x;
        const dy = gr.cellY(c) + 0.5 - y;
        if (dx * dx + dy * dy <= r2) n += 0.6;
      }
    }
    return n;
  }

  private place(id: TowerId): boolean {
    const g = this.g;
    const gr = g.grid;
    this.refreshPath();
    const def = TOWERS[id];
    const range = def.levels[0]!.range;
    const air = def.targets === 'both';
    const baseLen = g.pathLength();
    let best = -1;
    let bestScore = -Infinity;
    const casual = this.skill === 'casual';
    // While the planned maze is unfinished, fill one wall at a time.
    if (this.prunedAt !== g.towerVersion) {
      this.prunedAt = g.towerVersion;
      for (const c of this.mazePlan) {
        if (gr.isBuildable(c) && !g.wouldKeepPath(c)) this.mazePlan.delete(c); // would seal the maze: skip for good
      }
    }
    const wall = this.currentWall();
    const usePlan = !!wall;
    for (let c = 0; c < gr.cols * gr.rows; c++) {
      if (!gr.isBuildable(c)) continue;
      if (wall && !wall.has(c)) continue;
      const cov = this.coverage(c, range, air);
      if (cov <= 0 && !usePlan) continue;
      let score = cov;
      if (!casual && (gr.flags[c]! & F_WALK) !== 0) {
        // mazing: reward spots that make the walk longer (and never seal it)
        g.flow.fill(this.scratchDist, this.scratchNext, c);
        let len = 0;
        let ok = true;
        for (const s of gr.spawns) {
          const d = this.scratchDist[s]!;
          if (d >= UNREACHABLE) ok = false;
          else len = Math.max(len, d);
        }
        if (!ok) continue;
        score += (len - baseLen) * (g.map.style === 'maze' ? 8 : 3);
      }
      if (casual) score += g.rng.next() * 6; // kids don't place perfectly
      if (score > bestScore && g.canBuild(id, gr.cellX(c), gr.cellY(c)).ok) {
        bestScore = score;
        best = c;
      }
    }
    if (best < 0) return false;
    return !!g.build(id, gr.cellX(best), gr.cellY(best));
  }
}

export interface SimResult {
  map: string;
  difficulty: Difficulty;
  won: boolean;
  lives: number;
  maxLives: number;
  wave: number;
  kills: number;
  towers: number;
  seconds: number;
  pathLength: number;
}

/** Play a whole map headlessly with the bot. */
export function simulate(map: MapDef, difficulty: Difficulty, opts: BotOptions & { seed?: number; mode?: GameMode; maxWaves?: number } = {}): SimResult {
  const g = new Game({ map, difficulty, mode: opts.mode ?? 'campaign', seed: opts.seed ?? 1 });
  const bot = new AutoPlayer(g, opts);
  const maxTicks = 30 * 60 * 60; // one hour of game time
  let t = 0;
  while (g.state === 'playing' && t < maxTicks) {
    bot.update();
    g.step();
    g.events.clear();
    t++;
    if (opts.maxWaves && g.waveNum > opts.maxWaves) break;
  }
  return {
    map: map.id,
    difficulty,
    won: g.state === 'won',
    lives: g.lives,
    maxLives: g.maxLives,
    wave: g.waveNum,
    kills: g.stats.kills,
    towers: g.towers.length,
    seconds: Math.round(g.time),
    pathLength: Math.round(g.pathLength()),
  };
}

