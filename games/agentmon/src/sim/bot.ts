/**
 * The headless playthrough bot: plays a new adventure from Gran's house to the credits with the
 * game's own rules (the story scripts, the world, the battle engine, the befriend maths, the Trial
 * solver), without drawing anything. It acts like a kid who follows the quest: it walks to each
 * goal, talks to people, spars with some wild Agentmon on the way, makes friends (always when a gate
 * needs a friend it doesn't have yet), rests when its team is tired, and solves the Trials.
 *
 * It also keeps a clock of what a kid would spend (walking, reading, spars, befriending, puzzles),
 * which the pacing model uses. With `fuzz`, it also does random things now and then (wanders off,
 * talks to anyone, walks away from spars, loses on purpose, saves and reloads), and must still reach
 * the credits: the soft-lock fuzzer.
 */
import { chooseAction, suggestMove, suggestSwitch } from '../core/battle/ai';
import { afterBattle, bestReplacement, canBefriend, canUseMove, resolveTurn, startBattle, type Action, type Battle, type Mood, type Outcome } from '../core/battle/engine';
import { sparkSetup, tapFill } from '../core/befriend';
import { bestMoveset, grow, growthTarget, makeCreature, maxEnergy } from '../core/creature';
import { parseRoom } from '../core/puzzle/puzzle';
import { solve } from '../core/puzzle/solver';
import { hash32, Rng } from '../core/rng';
import { deserialize, serialize } from '../core/save/save';
import { evalFlags } from '../core/script';
import { newGameState, type Dir, type GameState } from '../core/state';
import type { Creature, Difficulty, Element } from '../core/types';
import { footprint, type MapObject } from '../core/world/map';
import { findPath } from '../core/world/path';
import { DIRS, hasAbility, type WildMon } from '../core/world/world';
import { AREA_BY_ID } from '../data/areas';
import { CHAPTERS } from '../data/chapters';
import { CODEC, DEX } from '../data/index';
import { MAPS, START } from '../data/maps/index';
import { QUEST_BY_ID } from '../data/quests';
import { SPECIES } from '../data/species';
import { TER } from '../data/terrain';
import { TRAINER_BY_ID, trainerTeam } from '../data/trainers';
import { TRIAL_BY_ID } from '../data/trials';
import { TUNING } from '../tuning';
import { routeBetween } from '../game/links';
import { runScript, type ScriptHost } from '../game/runner';
import { Session } from '../game/session';
import { defaultSettings } from '../game/settings';

export interface BotOptions {
  seed: number;
  difficulty: Difficulty;
  /** 0, 1 or 2: Spinnet, Druzling or Buzzbill (default from the seed). */
  starter?: number;
  befriendMode?: 'spark' | 'mood';
  /** Chance per goal of doing something random first (the soft-lock fuzzer). */
  fuzz?: number;
  /** Give up after this many steps. */
  maxSteps?: number;
  /** Give up after this much real time (ms); default 3 minutes. */
  maxMs?: number;
  /** Print progress now and then. */
  log?: boolean;
}

/** Seconds a kid would spend on each kind of thing (the pacing model adds exploring on top). */
export interface BotClock { walk: number; read: number; battle: number; befriend: number; puzzle: number; menus: number }

export interface BotResult {
  ok: boolean;
  reason: string;
  stage: number;
  clock: BotClock;
  /** Clock total at the end of each main quest stage. */
  stageTimes: number[];
  steps: number;
  spars: { wild: number; trainer: number; lost: number };
  befriends: number;
  rests: number;
  roomsSolved: number;
  team: { species: string; level: number }[];
  fuzzActions: number;
  saveReloads: number;
  /** What the bot lost to (for tuning): opponent, its levels, and the team's levels. */
  losses: string[];
  /** Wild spars per chapter. */
  wildByChapter: Record<number, number>;
}

const ABILITY_OF: Partial<Record<MapObject['kind'], string>> = { vines: 'snip', icewall: 'melt', 'water-gap': 'freeze', boulder: 'shove', updraft: 'updraft', machine: 'power' };
const ELEMENT_OF_ABILITY: Record<string, Element> = { melt: 'flare', paddle: 'tide', snip: 'leaf', shove: 'stone', updraft: 'gust', freeze: 'frost', power: 'volt', light: 'glow' };
const STARTERS = ['spinnet', 'druzling', 'buzzbill'];

/** Reading time for one line of dialogue: a beat, plus about two and a half words a second. */
const readTime = (text: string) => 1 + text.split(/\s+/).length / 2.5;

export async function playthrough(o: BotOptions): Promise<BotResult> {
  const bot = new Bot(o);
  return bot.run();
}

class Bot implements ScriptHost {
  state: GameState;
  session: Session;
  rng: Rng;
  clock: BotClock = { walk: 0, read: 0, battle: 0, befriend: 0, puzzle: 0, menus: 0 };
  stageTimes: number[] = [];
  steps = 0;
  spars = { wild: 0, trainer: 0, lost: 0 };
  befriends = 0;
  rests = 0;
  private resting = false;
  roomsSolved = 0;
  fuzzActions = 0;
  saveReloads = 0;
  losses: string[] = [];
  private wildPerChapter = new Map<number, number>();
  private tutorials = new Set<string>();
  private starter: string;

  constructor(private o: BotOptions) {
    this.rng = new Rng(hash32(o.seed, 9001));
    this.state = newGameState({ slot: 3, name: o.seed % 40, look: { skin: 1, hair: 0, hairColor: 0, outfit: 0 }, difficulty: o.difficulty, seed: hash32(o.seed, 77), start: { map: START.map, x: START.x, y: START.y } });
    this.state.dir = START.dir;
    this.session = this.newSession();
    this.starter = STARTERS[o.starter ?? o.seed % 3]!;
  }

  private newSession(): Session {
    const settings = { ...defaultSettings(), befriendMode: this.o.befriendMode ?? 'spark' } as ReturnType<typeof defaultSettings>;
    const s = new Session(this.state, settings, true);
    s.enterMap(this.state.map, this.state.x, this.state.y, this.state.dir);
    return s;
  }

  get world() { return this.session.world; }

  /** What stands on each tile (objects that are there right now), rebuilt when something changes. */
  private grid: (MapObject | undefined)[] = [];
  /** Boulders moved so far (the grid is rebuilt after each). */
  private shoves = 0;
  private deadline = 0;
  private gridKey = '';
  private objAt(x: number, y: number): MapObject | undefined {
    const w = this.world;
    const key = `${w.def.id}|${this.state.flags.size}|${this.shoves}|${this.session.world === w ? 1 : 0}`;
    if (key !== this.gridKey) {
      this.gridKey = key;
      this.grid = new Array(w.w * w.h);
      for (const o of w.objects()) for (const f of footprint(o)) if (f.x >= 0 && f.y >= 0 && f.x < w.w && f.y < w.h) this.grid[f.y * w.w + f.x] = o;
    }
    return x < 0 || y < 0 || x >= w.w || y >= w.h ? undefined : this.grid[y * w.w + x];
  }
  get total() { const c = this.clock; return c.walk + c.read + c.battle + c.befriend + c.puzzle + c.menus; }
  get stage() { return this.state.quests.main ?? 0; }

  // ---- the main loop ------------------------------------------------------------------------

  async run(): Promise<BotResult> {
    const fail = (reason: string) => this.result(false, reason);
    try {
      await this.script('intro');
      let lastProgress = '';
      let stalls = 0;
      const t0 = Date.now();
      this.deadline = t0 + (this.o.maxMs ?? 180_000);
      let lastLog = 0;
      for (let guard = 0; guard < 5000; guard++) {
        if (this.state.flags.has('credits')) return this.result(true, 'reached the credits');
        if (this.steps > (this.o.maxSteps ?? 60000)) return fail(`too many steps (stage ${this.stage}, ${this.state.map})`);
        if (Date.now() - t0 > (this.o.maxMs ?? 180_000)) return fail(`too slow (stage ${this.stage}, ${this.state.map})`);
        if (this.o.log && this.steps - lastLog > 1500) { lastLog = this.steps; console.log(`  … stage ${this.stage}, ${this.state.map} (${this.state.x},${this.state.y}), steps ${this.steps}, team ${this.state.team.map(c => `${c.species} ${c.level}`).join(', ')}`); }
        while (this.stageTimes.length < this.stage) this.stageTimes.push(this.total);
        const progress = `${this.stage}|${this.state.flags.size}|${this.state.map}|${this.state.team.length + this.state.base.length}`;
        if (progress === lastProgress) {
          if (++stalls > 40) {
            const g = this.goal();
            const around = `goal ${g ? `${g.map} ${g.x},${g.y}` : 'none'}; people ${this.world.npcs.filter(n => n.visible).map(n => `${n.def.id}@${n.x},${n.y}`).join(' ')}; wild ${this.world.wild.map(w => `${w.species}@${w.x},${w.y}`).join(' ')}`;
            return fail(`stuck at stage ${this.stage} on ${this.state.map} (${this.state.x},${this.state.y}); ${around}`);
          }
        } else { stalls = 0; lastProgress = progress; }
        if (this.o.fuzz && this.rng.chance(this.o.fuzz)) await this.fuzz();
        if (this.tired()) { await this.rest(); continue; }
        await this.kidSpars();
        await this.advance();
      }
      return fail('the loop ran out');
    } catch (e) {
      return fail(`error: ${(e as Error).message} (stage ${this.stage}, ${this.state.map})`);
    }
  }

  private result(ok: boolean, reason: string): BotResult {
    return {
      ok, reason, stage: this.stage, clock: { ...this.clock }, stageTimes: [...this.stageTimes, this.total], steps: this.steps, spars: { ...this.spars },
      befriends: this.befriends, rests: this.rests, roomsSolved: this.roomsSolved, team: this.state.team.map(c => ({ species: c.species, level: c.level })),
      fuzzActions: this.fuzzActions, saveReloads: this.saveReloads, losses: [...this.losses], wildByChapter: Object.fromEntries(this.wildPerChapter),
    };
  }

  /** One push towards the current goal. */
  private async advance(): Promise<void> {
    const goal = this.goal();
    if (!goal) { await this.poke(); return; }
    if (this.state.map !== goal.map) {
      const hop = routeBetween(this.state.map, goal.map)?.[0];
      if (!hop) throw new Error(`no route from ${this.state.map} to ${goal.map}`);
      if (hop.via.kind === 'warp') await this.goInto(hop.via.x, hop.via.y);
      else await this.goOffEdge(hop.via.side);
      return;
    }
    await this.goInto(goal.x, goal.y);
    await this.poke();
  }

  private goal(): { map: string; x: number; y: number } | null {
    if (this.stage === 1) return { map: 'academy-garden', x: 6 + 2 * STARTERS.indexOf(this.starter), y: 4 };
    return QUEST_BY_ID.main!.goals?.[this.stage] ?? null;
  }

  // ---- moving around ------------------------------------------------------------------------

  private can(ability: string) { return hasAbility(DEX, this.state, ability); }

  /** Can the bot stand here now (or after clearing something with a friend it has)? `all`: with every friend. */
  private passable(x: number, y: number, all = false): boolean {
    const w = this.world;
    const t = w.ter(x, y);
    const info = TER[t];
    if (!info.walk) return false;
    if (info.needs && !all && !this.can(info.needs)) return false;
    const obj = this.objAt(x, y);
    if (obj) {
      const ab = ABILITY_OF[obj.kind];
      if (!ab || ab === 'power' || ab === 'updraft') return false;
      if (!all && !this.can(ab)) return false;
    }
    if (w.npcAt(x, y)) return false;
    if (w.wildAt(x, y)) return false;
    return true;
  }

  /** Walk next to (or onto) a tile and step into it (doors and goals). */
  private async goInto(tx: number, ty: number): Promise<void> {
    const map = this.state.map;
    for (let tries = 0; tries < 6 && this.state.map === map; tries++) {
      if (this.state.x === tx && this.state.y === ty) return;
      const adjacent = Math.abs(this.state.x - tx) + Math.abs(this.state.y - ty) === 1;
      if (adjacent) {
        const dir = this.dirTo(tx, ty);
        const fromX = this.state.x, fromY = this.state.y;
        await this.stepDir(dir);
        // moved at all (into the tile, or through a door to the far side of this same map): done
        if (this.state.map !== map || this.state.x !== fromX || this.state.y !== fromY) return;
        // something in the way: a friend may clear it, or a locked door may need power
        await this.unblock(tx, ty, dir);
        if (this.state.map === map && !(this.state.x === tx && this.state.y === ty)) { await this.stepDir(dir); }
        return;
      }
      const target = this.passable(tx, ty) ? [tx, ty] as [number, number] : this.nearestFree(tx, ty);
      if (!target) { this.world.update(3); this.clock.walk += 3; continue; } // someone is in the way: wait
      const ok = await this.walkTo(target[0], target[1]);
      if (!ok) await this.unstick(target[0], target[1]);
    }
  }

  private nearestFree(tx: number, ty: number): [number, number] | null {
    const opts = ([0, 1, 2, 3] as Dir[]).map(d => DIRS[d]).map(([dx, dy]) => [tx + dx, ty + dy] as [number, number]).filter(([x, y]) => this.passable(x, y) || (x === this.state.x && y === this.state.y));
    opts.sort((a, b) => Math.abs(a[0] - this.state.x) + Math.abs(a[1] - this.state.y) - (Math.abs(b[0] - this.state.x) + Math.abs(b[1] - this.state.y)));
    return opts[0] ?? null;
  }

  /** Follow a path, a step at a time (wild ones move as you go). Returns false if there is none. */
  private async walkTo(tx: number, ty: number): Promise<boolean> {
    const map = this.state.map;
    for (let guard = 0; guard < 400; guard++) {
      if (this.state.map !== map) return true;
      if (this.state.x === tx && this.state.y === ty) return true;
      const path = findPath(this.world.w, this.world.h, this.state.x, this.state.y, tx, ty, (x, y) => this.passable(x, y) && (!this.world.warpAt(x, y) || (x === tx && y === ty)), 6000);
      if (!path || !path.length) return false;
      const [nx, ny] = path[0]!;
      const dir = this.dirTo(nx, ny);
      const obj = this.objAt(nx, ny);
      if (obj && ABILITY_OF[obj.kind] && obj.kind !== 'boulder') { this.state.dir = dir; await this.useAbility(obj); continue; }
      // a locked door (an unpowered mine door): power it up, then carry on
      if ((await this.stepDir(dir)) === 'locked') { await this.unblock(nx, ny, dir); if (this.state.map === map && !(this.state.x === nx && this.state.y === ny)) return false; }
    }
    return false;
  }

  /** No path with the friends it has: find which friend a path would need, and go make that friend. */
  private async unstick(tx: number, ty: number): Promise<void> {
    const path = findPath(this.world.w, this.world.h, this.state.x, this.state.y, tx, ty, (x, y) => this.passable(x, y, true), 6000);
    if (!path) {
      // the far side of this same map: through a hollow log, a frozen cave or old ruins (a small Trial)
      const map = this.state.map;
      const through = this.world.def.warps.filter(w => w.to === map || (w.to.startsWith('trial:') && TRIAL_BY_ID[w.to.slice(6)]?.to.map === map));
      for (const w of through) {
        const spot = this.nearestFree(w.x, w.y);
        if (spot && findPath(this.world.w, this.world.h, this.state.x, this.state.y, spot[0], spot[1], (x, y) => this.passable(x, y, true), 6000)) {
          const before = `${this.state.x},${this.state.y}`;
          await this.goInto(w.x, w.y);
          if (`${this.state.x},${this.state.y}` !== before) return;
        }
      }
      // nobody can get there right now (a wandering creature or person in a doorway): wait a moment
      this.world.update(2);
      this.clock.walk += 2;
      return;
    }
    for (const [x, y] of path) {
      const need = TER[this.world.ter(x, y)].needs ?? ABILITY_OF[this.objAt(x, y)?.kind ?? 'tree'];
      if (need && !this.can(need)) { await this.makeFriendOf(ELEMENT_OF_ABILITY[need]!); return; }
    }
    this.world.update(2);
    this.clock.walk += 2;
  }

  /** Something blocks the tile you face: clear it, power a door's machine, or make the friend for it. */
  private async unblock(tx: number, ty: number, dir: Dir): Promise<void> {
    const obj = this.world.objectAt(tx, ty);
    if (obj && ABILITY_OF[obj.kind]) { this.state.dir = dir; await this.useAbility(obj); return; }
    const warp = this.world.warpAt(tx, ty);
    if (warp?.needs && !evalFlags(warp.needs, this.world.flags)) {
      const m = warp.needs.match(/^powered:([\w-]+):(.+)$/);
      const machine = m && this.world.map.objects.find(o => o.id === m[2]);
      if (machine) {
        const spot = this.nearestFree(machine.x, machine.y);
        if (spot) { await this.walkTo(spot[0], spot[1]); this.state.dir = this.dirTo(machine.x, machine.y); await this.useAbility(machine); await this.goInto(tx, ty); }
      }
    }
  }

  private async useAbility(obj: MapObject): Promise<void> {
    const ab = ABILITY_OF[obj.kind];
    if (!ab) return;
    if (!this.can(ab)) { await this.makeFriendOf(ELEMENT_OF_ABILITY[ab]!); return; }
    this.clock.menus += 3;
    if (obj.kind === 'updraft') { if (obj.script) await this.script(obj.script); return; }
    if (obj.kind === 'boulder') return;
    this.world.useAbility(obj);
  }

  private dirTo(x: number, y: number): Dir {
    return x > this.state.x ? 2 : x < this.state.x ? 1 : y > this.state.y ? 0 : 3;
  }

  private async goOffEdge(side: 'n' | 's' | 'e' | 'w'): Promise<void> {
    const w = this.world;
    const map = this.state.map;
    const len = side === 'n' || side === 's' ? w.w : w.h;
    const border: [number, number][] = [];
    for (let k = 0; k < len; k++) {
      const [x, y] = side === 'n' ? [k, 0] : side === 's' ? [k, w.h - 1] : side === 'w' ? [0, k] : [w.w - 1, k];
      if (this.passable(x, y, true)) border.push([x, y]);
    }
    border.sort((a, b) => Math.abs(a[0] - this.state.x) + Math.abs(a[1] - this.state.y) - (Math.abs(b[0] - this.state.x) + Math.abs(b[1] - this.state.y)));
    for (const [bx, by] of border.slice(0, 6)) {
      if (!(this.state.x === bx && this.state.y === by)) {
        const ok = await this.walkTo(bx, by);
        if (!ok) { await this.unstick(bx, by); continue; }
      }
      if (this.state.map !== map) return;
      await this.stepDir(side === 'n' ? 3 : side === 's' ? 0 : side === 'w' ? 1 : 2);
      if (this.state.map !== map) return;
    }
  }

  /** One step, with everything the overworld does (sliding, doors, edges, wild ones, triggers). */
  private async stepDir(dir: Dir): Promise<string> {
    const w = this.world;
    if (Date.now() > this.deadline) throw new Error('too slow');
    const r = w.step(dir);
    if (r.kind === 'shoved') this.shoves++;
    this.steps++;
    if (this.o.log && this.steps % 20000 === 0) console.log(`  … step ${this.steps}: ${this.state.map} (${this.state.x},${this.state.y}) stage ${this.stage}\n${new Error().stack?.split('\n').slice(2, 9).map(l => l.trim().replace(/\(.*\/src\//, '(')).join('\n')}`);
    this.world.update(0.2);
    switch (r.kind) {
      case 'moved': {
        this.clock.walk += r.slide ? 0.09 : 0.2;
        let slide = r.slide;
        while (slide) {
          const r2 = this.world.step(this.state.dir);
          if (r2.kind !== 'moved') break;
          this.clock.walk += 0.09;
          slide = r2.slide;
        }
        await this.afterStep();
        return r.kind;
      }
      case 'warp': {
        if (r.warp.to.startsWith('trial:')) { await this.trial(r.warp.to.slice(6)); return r.kind; }
        this.clock.walk += 0.6;
        this.changeMap(r.warp.to, r.warp.tx, r.warp.ty, r.warp.dir ?? dir);
        return r.kind;
      }
      case 'edge': {
        const dest = MAPS[r.to];
        if (!dest) return r.kind;
        const rows = dest.rows.length, cols = Math.max(...dest.rows.map(x => x.length));
        const side = dir === 3 ? 'n' : dir === 0 ? 's' : dir === 2 ? 'e' : 'w';
        const x = side === 'n' || side === 's' ? r.x : side === 'e' ? 0 : cols - 1;
        const y = side === 'n' ? rows - 1 : side === 's' ? 0 : r.y;
        this.clock.walk += 0.6;
        this.changeMap(r.to, x, y, dir);
        return r.kind;
      }
      case 'wild': await this.wildSpar(r.wild); return r.kind;
      case 'locked': this.clock.read += readTime(r.warp.lockedText ?? 'It is locked.'); return r.kind;
      default: return r.kind;
    }
  }

  private async afterStep(): Promise<void> {
    const def = this.world.def;
    for (const t of def.triggers) {
      const inX = this.state.x >= t.x && this.state.x < t.x + (t.w ?? 1);
      const inY = this.state.y >= t.y && this.state.y < t.y + (t.h ?? 1);
      if (inX && inY && (!t.when || evalFlags(t.when, this.world.flags))) { await this.script(t.script); return; }
    }
  }

  private changeMap(id: string, x: number, y: number, dir: Dir): void {
    this.session.enterMap(id, x, y, dir);
    this.gridKey = '';
  }

  /** Face each way and do what the A button does there (talk, read, pick up, use a friend). */
  private async poke(): Promise<void> {
    for (const dir of [3, 0, 1, 2] as Dir[]) {
      const map = this.state.map, stage = this.stage, flags = this.state.flags.size;
      this.state.dir = dir;
      const f = this.world.facing();
      if (f.kind === 'npc') await this.script(f.npc.def.talk);
      else if (f.kind === 'wild') await this.wildSpar(f.wild);
      else if (f.kind === 'object') await this.useObject(f.obj);
      if (this.state.map !== map || this.stage !== stage || this.state.flags.size !== flags) return;
    }
  }

  private async useObject(o: MapObject): Promise<void> {
    if (o.kind === 'sign') { this.clock.read += readTime(o.text ?? ''); return; }
    if (o.kind === 'gift') {
      this.state.flags.add(`got:${this.world.def.id}:${o.id}`);
      if (o.item) this.session.give(o.item);
      if (o.script) await this.script(o.script);
      return;
    }
    if (ABILITY_OF[o.kind]) { await this.useAbility(o); return; }
    if (o.script) await this.script(o.script);
  }

  // ---- friends and spars ----------------------------------------------------------------------

  private tired(): boolean {
    const team = this.state.team;
    if (!team.length) return false;
    const now = team.reduce((n, c) => n + c.energy, 0), max = team.reduce((n, c) => n + maxEnergy(DEX, c), 0);
    return team[0]!.energy <= 0 || now < max * 0.4;
  }

  /** Walk to the nearest Rest Stop and nap there (talk to the helper, say yes). */
  private async rest(): Promise<void> {
    // Already on the way to a Rest Stop and stuck again (the way back needs a friend this team
    // can't make while it is tired): a kid spars on with the free move until the team is tuckered
    // out, and wakes at the last Rest Stop, as in the game. Without this, rest → makeFriendOf → rest
    // recursed forever.
    if (this.resting) { this.spars.lost++; this.losses.push(`tired out on ${this.state.map} (${this.state.x},${this.state.y}) on the way to rest (stage ${this.stage})`); this.clock.battle += 120; await this.lostSpar(); return; }
    this.resting = true;
    try { await this.restAtStop(); } finally { this.resting = false; }
  }

  private async restAtStop(): Promise<void> {
    const stops = Object.values(MAPS).filter(m => m.rest && m.npcs.some(n => n.talk === 'rest-stop'));
    const options = stops.map(m => ({ m, route: m.id === this.state.map ? [] : routeBetween(this.state.map, m.id) })).filter(o => o.route).sort((a, b) => a.route!.length - b.route!.length);
    const target = options[0]?.m;
    if (target) {
      for (let guard = 0; guard < 30 && this.state.map !== target.id; guard++) {
        const hop = routeBetween(this.state.map, target.id)?.[0];
        if (!hop) break;
        if (hop.via.kind === 'warp') await this.goInto(hop.via.x, hop.via.y);
        else await this.goOffEdge(hop.via.side);
      }
      if (this.state.map === target.id) { await this.walkTo(target.rest!.x, target.rest!.y); await this.poke(); }
    }
    if (this.tired()) this.session.healAll();
    this.rests++;
    this.clock.menus += 10;
  }

  /** The wild spars a kid does on the way (about the chapter's `pathSpars`). */
  private async kidSpars(): Promise<void> {
    const def = this.world.def;
    if (!def.wild?.length || !this.state.team.length) return;
    const chapter = AREA_BY_ID[def.wild[0]!]?.chapter ?? 0;
    const planned = CHAPTERS.find(c => c.n === chapter)?.pathSpars ?? 0;
    const done = this.wildPerChapter.get(chapter) ?? 0;
    if (done >= planned) return;
    // spar with the nearest wild ones this kid can walk to, until the chapter's usual number
    const map = this.state.map;
    for (let tries = 0; tries < 12 && this.state.map === map && (this.wildPerChapter.get(chapter) ?? 0) < planned; tries++) {
      if (this.tired()) return;
      const near = [...this.world.wild].sort((a, b) => Math.abs(a.x - this.state.x) + Math.abs(a.y - this.state.y) - (Math.abs(b.x - this.state.x) + Math.abs(b.y - this.state.y)));
      let sparred = false;
      for (const w of near.slice(0, 3)) {
        const before = this.spars.wild;
        await this.approachAndSpar(w);
        if (this.spars.wild > before) { sparred = true; break; }
      }
      if (!sparred) { this.world.update(10); this.clock.walk += 10; }
    }
  }

  private async approachAndSpar(w: WildMon): Promise<void> {
    for (let guard = 0; guard < 60; guard++) {
      const mon = this.world.wild.find(m => m.key === w.key);
      if (!mon) return;
      if (Math.abs(mon.x - this.state.x) + Math.abs(mon.y - this.state.y) === 1) { this.state.dir = this.dirTo(mon.x, mon.y); await this.wildSpar(mon); return; }
      const spot = ([0, 1, 2, 3] as Dir[]).map(d => DIRS[d]).map(([dx, dy]) => [mon.x + dx, mon.y + dy] as [number, number]).find(([x, y]) => this.passable(x, y));
      if (!spot) { this.world.update(1); continue; }
      const path = findPath(this.world.w, this.world.h, this.state.x, this.state.y, spot[0], spot[1], (x, y) => this.passable(x, y), 4000);
      if (!path) return;
      if (!path.length) continue;
      await this.stepDir(this.dirTo(path[0]![0], path[0]![1]));
    }
  }

  /** Make a friend of an element: here if one lives here, else on the nearest map where one does. */
  private async makeFriendOf(el: Element): Promise<void> {
    const has = () => [...this.state.team, ...this.state.base].some(c => SPECIES[c.species]?.element === el);
    const where = (id: string) => (MAPS[id]?.wild ?? []).some(a => AREA_BY_ID[a]?.wild.some(e => SPECIES[e.species]?.element === el));
    const start = this.state.map;
    if (!where(start)) {
      const options = Object.keys(MAPS).filter(where).map(id => ({ id, route: routeBetween(start, id) })).filter(x => x.route).sort((a, b) => a.route!.length - b.route!.length);
      const target = options[0];
      if (!target) throw new Error(`no ${el} Agentmon anywhere reachable`);
      for (let guard = 0; guard < 30 && this.state.map !== target.id; guard++) {
        const hop = routeBetween(this.state.map, target.id)?.[0];
        if (!hop) break;
        if (hop.via.kind === 'warp') await this.goInto(hop.via.x, hop.via.y);
        else await this.goOffEdge(hop.via.side);
      }
    }
    for (let tries = 0; tries < 30 && !has(); tries++) {
      if (this.tired()) { await this.rest(); return; }
      const mon = this.world.wild.find(w => SPECIES[w.species]?.element === el);
      if (!mon) { this.world.update(5); this.clock.walk += 5; continue; }
      await this.approachAndSpar(mon);
    }
  }

  private async wildSpar(w: WildMon): Promise<void> {
    const sp = SPECIES[w.species]!;
    const chapter = AREA_BY_ID[w.area]?.chapter ?? 0;
    const wantFriend = this.wantsFriend(w.species, chapter);
    const foe = makeCreature(DEX, { species: w.species, level: w.level, shimmer: w.shimmer }, new Rng(hash32(this.o.seed, this.steps, w.key)));
    const out = await this.battle([foe], { kind: 'wild', mood: w.mood, befriend: wantFriend });
    this.spars.wild++;
    this.wildPerChapter.set(chapter, (this.wildPerChapter.get(chapter) ?? 0) + 1);
    if (out === 'lost') await this.lostSpar();
    else this.world.remove(w.key);
    void sp;
  }

  /** A kid befriends what the chapter suggests, anything new while the team is small, and gate helpers. */
  private wantsFriend(species: string, chapter: number): boolean {
    const all = [...this.state.team, ...this.state.base];
    if (all.some(c => c.species === species)) return false;
    const el = SPECIES[species]!.element;
    if (!all.some(c => SPECIES[c.species]?.element === el)) return true;
    if (CHAPTERS.find(c => c.n === chapter)?.befriend.includes(species)) return true;
    return this.state.team.length < 4 && this.rng.chance(0.5);
  }

  /** Play a whole spar with the engine. The kid follows the ★ hint most of the time. */
  private async battle(foe: Creature[], o: { kind: 'wild' | 'trainer'; mood?: Mood; befriend?: boolean; guardian?: boolean; trainerAi?: Difficulty; gentle?: boolean }): Promise<Outcome> {
    if (!this.state.team.some(c => c.energy > 0)) return 'left';
    const b: Battle = startBattle(DEX, { kind: o.kind, player: this.state.team, foe, difficulty: this.state.difficulty, seed: hash32(this.o.seed, this.state.stats.battles, this.steps), sharedXp: true, mood: o.mood, guardian: o.guardian, lead: this.state.team.findIndex(c => c.energy > 0) });
    const rng = new Rng(hash32(this.o.seed, this.state.stats.battles, 5));
    this.state.stats.battles++;
    const foeAi: Difficulty = o.kind === 'wild' ? (this.state.difficulty === 'hard' ? 'normal' : 'easy') : o.gentle ? 'easy' : TUNING.difficulty[this.state.difficulty].ai;
    this.clock.battle += 8; // the intro and the send-outs
    for (let guard = 0; guard < 200 && !b.outcome; guard++) {
      if (b.needsSwitch === 0) { resolveTurn(DEX, b, { type: 'switch', to: bestReplacement(DEX, b, 0) }, { type: 'rest' }); this.clock.battle += 4; continue; }
      let action: Action | null = null;
      if (o.befriend && canBefriend(DEX, b)) {
        action = { type: 'befriend', fill: this.befriendFill(b) };
        this.clock.befriend += this.state.difficulty === 'easy' ? 9 : 11;
      } else {
        action = this.kidMove(b, rng, !!o.befriend);
      }
      resolveTurn(DEX, b, action, chooseAction(DEX, b, 1, foeAi, rng));
      this.clock.battle += 8; // choosing (about 3 s) plus the animations and messages at 1× speed
    }
    if (!b.outcome) b.outcome = 'left';
    afterBattle(DEX, b);
    const out = b.outcome;
    if (out === 'won') { this.state.stats.wins++; this.state.coins += b.coins; }
    if (out === 'befriended' && b.befriended) {
      const c = b.befriended;
      c.moves = bestMoveset(DEX, SPECIES[c.species]!, c.level);
      this.session.befriend(c);
      this.befriends++;
      this.clock.befriend += 10; // the happy moment and picking a nickname
    }
    if (out === 'lost') {
      this.spars.lost++;
      this.losses.push(`${o.kind === 'trainer' ? this.lastTrainer : 'wild'} ${foe.map(c => `${c.species} ${c.level}`).join('/')} vs ${this.state.team.map(c => `${c.species} ${c.level}`).join('/')} (stage ${this.stage})`);
    }
    if (out !== 'lost') this.afterLevels();
    return out;
  }

  /** Mostly the ★ suggestion; sometimes another usable move; when befriending, gentle moves only. */
  private kidMove(b: Battle, rng: Rng, befriending: boolean): Action {
    const me = b.sides[0].team[b.sides[0].active]!;
    const foe = b.sides[1].team[b.sides[1].active]!;
    const usable = me.moves.filter(m => canUseMove(DEX, b, 0, m));
    if (befriending && foe.energy <= maxEnergy(DEX, foe) * 0.55) {
      const free = usable.filter(m => DEX.moves[m]!.power > 0).sort((x, y) => DEX.moves[x]!.power - DEX.moves[y]!.power)[0];
      if (free) return { type: 'move', move: free };
    }
    // the hint says a friend on the bench would do much better: most kids follow it
    const switchTo = suggestSwitch(DEX, b);
    if (switchTo !== null && !befriending && rng.chance(0.75)) return { type: 'switch', to: switchTo };
    const hint = suggestMove(DEX, b);
    if (hint && rng.chance(0.82)) return { type: 'move', move: hint };
    if (usable.length && rng.chance(0.85)) return { type: 'move', move: rng.pick(usable) };
    return chooseAction(DEX, b, 0, 'normal', rng);
  }

  /** How full a kid gets the heart: Spark Ring taps land near the glow with a little wobble. */
  private befriendFill(b: Battle): number {
    const foe = b.sides[1].team[b.sides[1].active]!;
    if (this.session.settings.befriendMode === 'mood') return this.rng.chance(0.8) ? TUNING.befriend.need : TUNING.befriend.need / 2;
    const setup = sparkSetup(DEX, { foe, mood: b.mood, difficulty: this.state.difficulty, seed: this.rng.int(2 ** 31), guardian: b.guardian });
    const wobble = 10 + setup.speed * 28;
    let fill = 0;
    for (let i = 0; i < setup.sparks && fill < setup.need; i++) {
      const err = (this.rng.next() + this.rng.next() + this.rng.next() - 1.5) * wobble * 1.4;
      fill += tapFill(setup, i, (setup.arcAt[i] ?? 0) + err);
    }
    return fill;
  }

  /** New moves (the suggested set) and growing (always yes) after spars. */
  private afterLevels(): void {
    for (const c of this.state.team) {
      const sp = SPECIES[c.species]!;
      c.moves = bestMoveset(DEX, sp, c.level);
      const to = growthTarget(DEX, c);
      if (to) { grow(DEX, c); this.session.research(SPECIES[to]!.num); this.clock.battle += 9; }
    }
  }

  // ---- Trials ---------------------------------------------------------------------------------

  private async trial(id: string): Promise<void> {
    const t = TRIAL_BY_ID[id]!;
    if (!this.state.flags.has(`trial:${id}`)) {
      const from = this.state.vars[`trial-room:${id}`] ?? 0;
      for (let i = from; i < t.rooms.length; i++) {
        const room = parseRoom(t.rooms[i]!);
        const sol = solve(room, room.start);
        if (!sol) throw new Error(`trial room ${t.rooms[i]!.id} has no solution`);
        // thinking, a few wrong tries, then the moves (a kid takes a while on the first rooms)
        this.clock.puzzle += 60 + sol.actions.length * 4;
        this.roomsSolved++;
      }
      this.state.flags.add(`trial:${id}`);
      this.state.stats.puzzles += t.rooms.length;
      delete this.state.vars[`trial-room:${id}`];
    }
    this.changeMap(t.to.map, t.to.x, t.to.y, 3);
  }

  // ---- the fuzzer -----------------------------------------------------------------------------

  private async fuzz(): Promise<void> {
    this.fuzzActions++;
    const r = this.rng.next();
    if (r < 0.35) {
      // wander: a few random steps (doors and edges included)
      for (let i = 0, n = 2 + this.rng.int(10); i < n; i++) await this.stepDir(this.rng.int(4) as Dir);
    } else if (r < 0.55) {
      // talk to someone random on this map
      const npc = this.rng.pick(this.world.npcs.filter(n => n.visible).concat([]));
      if (npc) { await this.goInto(npc.x, npc.y); await this.poke(); }
    } else if (r < 0.7) {
      // save and load again (the adventure must carry on exactly)
      const text = serialize(CODEC, this.state);
      const back = deserialize(CODEC, text, this.state.slot);
      if (!back.ok) throw new Error(`save/load failed: ${back.reason}`);
      this.state = back.state;
      this.session = this.newSession();
      this.gridKey = '';
      this.saveReloads++;
    } else if (r < 0.82) {
      // lose a spar on purpose (only resting): wake at the Rest Stop with nothing lost
      const w = this.world.wild[0];
      if (w && this.state.team.some(c => c.energy > 0)) {
        const foe = makeCreature(DEX, { species: w.species, level: w.level + 8 }, new Rng(this.steps));
        const b = startBattle(DEX, { kind: 'wild', player: this.state.team, foe: [foe], difficulty: this.state.difficulty, seed: this.steps, lead: this.state.team.findIndex(c => c.energy > 0) });
        for (let g = 0; g < 300 && !b.outcome; g++) resolveTurn(DEX, b, b.needsSwitch === 0 ? { type: 'switch', to: bestReplacement(DEX, b, 0) } : { type: 'rest' }, chooseAction(DEX, b, 1, 'hard', this.rng));
        afterBattle(DEX, b);
        if (b.outcome === 'lost') await this.lostSpar();
      }
    } else {
      // walk away from a spar: start one and leave
      const w = this.world.wild[0];
      if (w) this.world.remove(w.key);
    }
  }

  // ---- ScriptHost -----------------------------------------------------------------------------

  private async script(id: string): Promise<void> { await runScript(this.session, this, id); }

  say(text: string): Promise<void> { this.clock.read += readTime(text); return Promise.resolve(); }
  ask(text: string): Promise<number> { this.clock.read += readTime(text) + 1.5; return Promise.resolve(0); }
  fade(): Promise<void> { this.clock.menus += 0.5; return Promise.resolve(); }
  wait(seconds: number): Promise<void> { this.clock.menus += seconds; return Promise.resolve(); }
  private lastTrainer = '';
  async spar(trainer: string): Promise<Outcome> {
    this.lastTrainer = trainer;
    const t = TRAINER_BY_ID[trainer]!;
    const foe = trainerTeam(t, this.state.difficulty, this.state.starter, TUNING.difficulty[this.state.difficulty]).map(m => makeCreature(DEX, { species: m.species, level: m.level }, new Rng(hash32(this.o.seed, m.level))));
    const out = await this.battle(foe, { kind: 'trainer', gentle: t.gentle });
    this.spars.trainer++;
    return out;
  }
  async wild(o: { species: string; level: number; guardian?: boolean }): Promise<Outcome> {
    const foe = makeCreature(DEX, { species: o.species, level: o.level }, new Rng(hash32(this.o.seed, o.level, 3)));
    return this.battle([foe], { kind: 'wild', befriend: true, guardian: o.guardian, mood: 'happy' });
  }
  async partner(species: string): Promise<void> {
    const c = makeCreature(DEX, { species, level: 5 }, new Rng(hash32(this.state.rng, 5)));
    this.clock.befriend += 20;
    this.session.befriend(c);
    this.state.starter = species;
    this.state.flags.add('got-partner');
  }
  async lostSpar(): Promise<void> {
    const r = this.state.rest;
    this.session.healAll();
    this.changeMap(r.map, r.x, r.y, 0);
    this.clock.menus += 6;
  }
  async shop(): Promise<void> {
    // a kid buys a few snacks and berries when they have coins to spare
    this.clock.menus += 25;
    for (const id of ['pep-berry', 'berry-bun']) if (this.state.coins > 200) { this.state.coins -= 30; this.session.give(id); }
  }
  async base(): Promise<void> { this.clock.menus += 20; }
  async tower(): Promise<void> { this.clock.menus += 5; }
  async credits(): Promise<void> { this.clock.menus += 30; }
  async beacon(): Promise<void> { this.clock.menus += 3; }
  async walk(who: string, path: string): Promise<void> {
    for (const ch of path) {
      const dir = ({ d: 0, l: 1, r: 2, u: 3 } as Record<string, Dir>)[ch];
      if (dir === undefined) continue;
      if (who === 'player') { const r = this.world.step(dir); if (r.kind === 'moved') this.clock.walk += 0.2; }
    }
  }
  face(who: string, dir: Dir): void { if (who === 'player') this.state.dir = dir; }
  async warp(map: string, x: number, y: number, dir?: Dir): Promise<void> { this.changeMap(map, x, y, dir ?? 0); }
  async emote(): Promise<void> { this.clock.menus += 0.4; }
  music(): void {}
  sfx(): void {}
  toast(): void {}
  async tutorial(id: string): Promise<void> { if (!this.tutorials.has(id)) { this.tutorials.add(id); this.clock.read += 6; } }
  refresh(): void { this.world.refreshNpcs(); }
}
