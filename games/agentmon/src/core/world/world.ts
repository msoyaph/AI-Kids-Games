/**
 * The overworld rules for one map: where you can walk, what's in front of you, field abilities,
 * and the visible wild Agentmon that wander in their habitat. Pure (no rendering): the overworld
 * scene animates what this decides, and the playthrough bot drives it headlessly.
 */
import { Rng } from '../rng';
import { storyFlags, type Dir, type GameState } from '../state';
import type { BattleDex, Element } from '../types';
import type { Mood } from '../battle/engine';
import { TER, type Ter } from '../../data/terrain';
import { AREA_BY_ID, type AreaDef } from '../../data/areas';
import { difficultyShift } from '../../data/trainers';
import { TUNING } from '../../tuning';
import { footprint, parseMap, terAt, type MapDef, type MapObject, type NpcDef, type ParsedMap, type Warp } from './map';
import { evalFlags } from '../script';

export const DIRS: Record<Dir, [number, number]> = { 0: [0, 1], 1: [-1, 0], 2: [1, 0], 3: [0, -1] };

/** Field abilities, each unlocked by befriending any Agentmon of its element. */
export const ABILITY_ELEMENT: Record<string, Element> = {
  melt: 'flare', paddle: 'tide', snip: 'leaf', shove: 'stone', updraft: 'gust', freeze: 'frost', power: 'volt', light: 'glow',
};

export function hasAbility(dex: BattleDex, s: GameState, ability: string): boolean {
  const el = ABILITY_ELEMENT[ability];
  if (!el) return false;
  if (s.flags.has('debug-all-abilities')) return true;
  return [...s.team, ...s.base].some(c => dex.species[c.species]?.element === el);
}

export interface WildMon {
  key: number;
  area: string;
  species: string;
  level: number;
  shimmer: boolean;
  mood: Mood;
  x: number;
  y: number;
  dir: Dir;
  /** Seconds until it decides what to do next. */
  timer: number;
  /** Set for one update when it hops (the scene animates it). */
  hopped: boolean;
}

export interface NpcState {
  def: NpcDef;
  x: number;
  y: number;
  dir: Dir;
  timer: number;
  visible: boolean;
}

export type Facing =
  | { kind: 'none' }
  | { kind: 'npc'; npc: NpcState }
  | { kind: 'object'; obj: MapObject }
  | { kind: 'wild'; wild: WildMon }
  | { kind: 'water' };

export type StepResult =
  | { kind: 'moved'; x: number; y: number; slide: boolean }
  | { kind: 'blocked'; facing: Facing }
  | { kind: 'warp'; warp: Warp }
  | { kind: 'edge'; to: string; x: number; y: number }
  | { kind: 'wild'; wild: WildMon }
  | { kind: 'locked'; warp: Warp }
  | { kind: 'shoved'; obj: MapObject };

const WILD_TERRAIN: Record<AreaDef['terrain'], Ter[]> = {
  grass: ['tall'], cave: ['cave', 'dark'], water: ['water'], snow: ['snow'], sand: ['sand'], sky: ['cloud'], none: [],
};

export class World {
  readonly def: MapDef;
  readonly map: ParsedMap;
  readonly npcs: NpcState[];
  wild: WildMon[] = [];
  private nextKey = 1;
  private respawn: { area: string; at: number }[] = [];
  private clock = 0;
  readonly rng: Rng;
  /** Story flags plus live facts (items carried, friends made), for map conditions. */
  readonly flags: { has(flag: string): boolean };

  constructor(def: MapDef, readonly s: GameState, readonly dex: BattleDex, seed: number) {
    this.def = def;
    this.flags = storyFlags(s, dex.species);
    this.map = parseMap(def);
    this.rng = new Rng(seed);
    this.npcs = def.npcs.map(n => ({ def: n, x: n.x, y: n.y, dir: n.dir, timer: 1 + this.rng.next() * 3, visible: true }));
    this.refreshNpcs();
  }

  get w() { return this.map.w; }
  get h() { return this.map.h; }
  ter(x: number, y: number): Ter { return terAt(this.map, x, y); }

  /** Is an object present right now (flags can remove or reveal it)? */
  present(o: MapObject): boolean {
    if (o.goneIf && this.s.flags.has(o.goneIf)) return false;
    if (o.showIf && !evalFlags(o.showIf, this.flags)) return false;
    if (o.kind === 'gift' && o.id && this.s.flags.has(`got:${this.def.id}:${o.id}`)) return false;
    if (o.id && this.s.flags.has(`gone:${this.def.id}:${o.id}`)) return false;
    return true;
  }

  objects(): MapObject[] { return this.map.objects.filter(o => this.present(o)); }

  objectAt(x: number, y: number): MapObject | undefined {
    return this.objects().find(o => footprint(o).some(t => t.x === x && t.y === y));
  }

  refreshNpcs(): void {
    for (const n of this.npcs) n.visible = (!n.def.showIf || evalFlags(n.def.showIf, this.flags)) && (!n.def.hideIf || !evalFlags(n.def.hideIf, this.flags));
  }

  npcAt(x: number, y: number): NpcState | undefined {
    return this.npcs.find(n => n.visible && n.x === x && n.y === y);
  }

  wildAt(x: number, y: number): WildMon | undefined {
    return this.wild.find(w => w.x === x && w.y === y);
  }

  /** Can the player stand on this tile (ignoring creatures)? */
  passable(x: number, y: number): boolean {
    const t = this.ter(x, y);
    const info = TER[t];
    if (!info.walk) return false;
    if (info.needs && !hasAbility(this.dex, this.s, info.needs)) return false;
    if (this.objectAt(x, y)) return false;
    if (this.npcAt(x, y)) return false;
    return true;
  }

  facingTile(x = this.s.x, y = this.s.y, dir: Dir = this.s.dir): [number, number] {
    const [dx, dy] = DIRS[dir];
    return [x + dx, y + dy];
  }

  facing(x = this.s.x, y = this.s.y, dir: Dir = this.s.dir): Facing {
    const [fx, fy] = this.facingTile(x, y, dir);
    const npc = this.npcAt(fx, fy);
    if (npc) return { kind: 'npc', npc };
    const wild = this.wildAt(fx, fy);
    if (wild) return { kind: 'wild', wild };
    const obj = this.objectAt(fx, fy);
    if (obj) {
      // talk across a shop or Rest Stop counter
      if (obj.kind === 'counter' || obj.kind === 'table') {
        const [bx, by] = this.facingTile(fx, fy, dir);
        const behind = this.npcAt(bx, by);
        if (behind) return { kind: 'npc', npc: behind };
      }
      return { kind: 'object', obj };
    }
    if (this.ter(fx, fy) === 'water' && !hasAbility(this.dex, this.s, 'paddle')) return { kind: 'water' };
    return { kind: 'none' };
  }

  warpAt(x: number, y: number): Warp | undefined {
    return this.def.warps.find(w => w.x === x && w.y === y);
  }

  /** Try to take one step. Ice keeps you sliding (the scene calls step again while `slide`). */
  step(dir: Dir): StepResult {
    this.s.dir = dir;
    const [nx, ny] = this.facingTile();
    // off the edge: the next map
    if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) {
      const side = nx < 0 ? 'w' : nx >= this.w ? 'e' : ny < 0 ? 'n' : 's';
      const e = this.def.edges?.find(ed => ed.side === side);
      if (e) return { kind: 'edge', to: e.to, x: side === 'n' || side === 's' ? nx + e.offset : side === 'w' ? -1 : 0, y: side === 'e' || side === 'w' ? ny + e.offset : side === 'n' ? -1 : 0 };
      return { kind: 'blocked', facing: { kind: 'none' } };
    }
    const wild = this.wildAt(nx, ny);
    if (wild) return { kind: 'wild', wild };
    const warp = this.warpAt(nx, ny);
    if (warp) {
      if (warp.needs && !evalFlags(warp.needs, this.flags)) return { kind: 'locked', warp };
      return { kind: 'warp', warp };
    }
    const obj = this.objectAt(nx, ny);
    if (obj && obj.kind === 'boulder' && hasAbility(this.dex, this.s, 'shove')) {
      const [bx, by] = [nx + DIRS[dir][0], ny + DIRS[dir][1]];
      if (this.passable(bx, by) && !this.wildAt(bx, by) && !this.warpAt(bx, by) && this.ter(bx, by) !== 'water') {
        obj.x = bx;
        obj.y = by;
        return { kind: 'shoved', obj };
      }
    }
    if (!this.passable(nx, ny)) return { kind: 'blocked', facing: this.facing() };
    this.s.x = nx;
    this.s.y = ny;
    this.s.stats.steps++;
    const slide = TER[this.ter(nx, ny)].slide === true;
    return { kind: 'moved', x: nx, y: ny, slide };
  }

  /** Use a field ability on the obstacle in front. Returns the ability used, or null. */
  useAbility(obj: MapObject): string | null {
    const need: Partial<Record<MapObject['kind'], string>> = { vines: 'snip', icewall: 'melt', machine: 'power', 'water-gap': 'freeze' };
    const ability = need[obj.kind];
    if (!ability || !hasAbility(this.dex, this.s, ability)) return null;
    if (obj.kind === 'machine') this.s.flags.add(`powered:${this.def.id}:${obj.id}`);
    else this.s.flags.add(`gone:${this.def.id}:${obj.id}`);
    return ability;
  }

  // ---- wild Agentmon ------------------------------------------------------------------------

  private areaTiles(area: AreaDef): [number, number][] {
    const kinds = WILD_TERRAIN[area.terrain];
    const out: [number, number][] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const t = this.ter(x, y);
      if (!kinds.includes(t)) continue;
      if (TER[t].needs && !hasAbility(this.dex, this.s, TER[t].needs!)) continue;
      if (this.objectAt(x, y) || this.warpAt(x, y)) continue;
      out.push([x, y]);
    }
    return out;
  }

  private moodFor(area: AreaDef): Mood {
    const beacon = ['', '', 'beacon-lighthouse', 'beacon-lighthouse', 'beacon-canopy', 'beacon-canopy', 'beacon-mine', 'beacon-mine', 'beacon-sunstone', 'beacon-sunstone', 'beacon-summit', 'beacon-summit', 'beacon-spire', 'beacon-spire'][area.chapter] ?? '';
    const clear = !beacon || this.s.flags.has(beacon) || this.s.flags.has('beacon-spire');
    const r = this.rng.next();
    return clear ? (r < 0.4 ? 'happy' : 'calm') : r < 0.45 ? 'grumpy' : 'calm';
  }

  private spawnOne(area: AreaDef, avoid = 5): WildMon | null {
    const tiles = this.areaTiles(area).filter(([x, y]) => Math.abs(x - this.s.x) + Math.abs(y - this.s.y) >= avoid && !this.wildAt(x, y));
    if (!tiles.length || !area.wild.length) return null;
    const [x, y] = this.rng.pick(tiles);
    // A gate's helper is always out here while you have no friend of its element yet.
    const needed = (area.ensure ?? []).find(id => {
      const el = this.dex.species[id]?.element;
      const friend = [...this.s.team, ...this.s.base].some(c => this.dex.species[c.species]?.element === el);
      return !friend && !this.wild.some(w => w.area === area.id && this.dex.species[w.species]?.element === el);
    });
    const e = (needed && area.wild.find(w => w.species === needed)) || this.rng.weighted(area.wild, area.wild.map(w => w.weight));
    const species = this.dex.species[e.species]!;
    const shift = difficultyShift(TUNING.difficulty[this.s.difficulty].wildLevel, area.chapter);
    const level = Math.max(2, Math.min(50, this.rng.range(e.min, e.max) + shift));
    // Shimmer: guaranteed once its Field Guide page has 3 research stars; otherwise a rare surprise.
    const earned = (this.s.guide.stars[species.num] ?? 0) >= 3 && !this.s.guide.shimmer.has(species.num) && !this.wild.some(w => w.shimmer && w.species === species.id);
    const shimmer = earned || this.rng.chance(1 / 200);
    const mon: WildMon = { key: this.nextKey++, area: area.id, species: species.id, level, shimmer, mood: this.moodFor(area), x, y, dir: this.rng.int(4) as Dir, timer: 0.5 + this.rng.next() * 2, hopped: false };
    this.wild.push(mon);
    return mon;
  }

  /** Fill each wild area up to its number of visible spawns (on entering a map). */
  populate(): void {
    for (const id of this.def.wild ?? []) {
      const area = AREA_BY_ID[id];
      if (!area) continue;
      const have = this.wild.filter(w => w.area === id).length;
      for (let i = have; i < area.spawns; i++) if (!this.spawnOne(area, 3)) break;
    }
  }

  /** A wild one leaves (befriended, walked away from, wandered off, or sparred): it comes back later. */
  remove(key: number): void {
    const w = this.wild.find(m => m.key === key);
    if (!w) return;
    this.wild = this.wild.filter(m => m.key !== key);
    this.respawn.push({ area: w.area, at: this.clock + 25 + this.rng.next() * 20 });
  }

  /** Advance wild wandering and NPC strolls. Wild ones never step onto or next to the player. */
  update(dt: number, busy = false): void {
    this.clock += dt;
    for (const r of [...this.respawn]) if (r.at <= this.clock) {
      const area = AREA_BY_ID[r.area];
      if (area && this.spawnOne(area)) this.respawn = this.respawn.filter(x => x !== r);
      else r.at = this.clock + 5;
    }
    for (const w of this.wild) {
      w.hopped = false;
      if (busy) continue;
      w.timer -= dt;
      if (w.timer > 0) continue;
      w.timer = 1.2 + this.rng.next() * 2.4;
      const r = this.rng.next();
      if (r < 0.35) { w.dir = this.rng.int(4) as Dir; continue; }
      if (r < 0.5) continue;
      const dir = this.rng.int(4) as Dir;
      const [dx, dy] = DIRS[dir];
      const nx = w.x + dx, ny = w.y + dy;
      w.dir = dir;
      const area = AREA_BY_ID[w.area];
      if (!area || !WILD_TERRAIN[area.terrain].includes(this.ter(nx, ny))) continue;
      if (this.objectAt(nx, ny) || this.wildAt(nx, ny) || this.npcAt(nx, ny) || this.warpAt(nx, ny)) continue;
      if (Math.abs(nx - this.s.x) + Math.abs(ny - this.s.y) <= 1) continue;
      w.x = nx;
      w.y = ny;
      w.hopped = true;
    }
    for (const n of this.npcs) {
      if (!n.def.wander || !n.visible || busy) continue;
      n.timer -= dt;
      if (n.timer > 0) continue;
      n.timer = 1.5 + this.rng.next() * 3;
      const dir = this.rng.int(4) as Dir;
      const [dx, dy] = DIRS[dir];
      const nx = n.x + dx, ny = n.y + dy;
      n.dir = dir;
      if (Math.abs(nx - n.def.x) > n.def.wander || Math.abs(ny - n.def.y) > n.def.wander) continue;
      if (!TER[this.ter(nx, ny)].walk || this.objectAt(nx, ny) || this.npcAt(nx, ny) || this.warpAt(nx, ny) || this.wildAt(nx, ny)) continue;
      if (nx === this.s.x && ny === this.s.y) continue;
      n.x = nx;
      n.y = ny;
    }
  }
}
