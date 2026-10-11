/**
 * Sim: the headless game. Owns GameState + runtime locations, exposes an action API
 * used by the client, the test bot and unit tests. No DOM / Pixi imports here.
 */
import { Emitter } from '../core/events';
import { Rng, hash32 } from '../core/rng';
import { DIR_DX, DIR_DY, TILE, dirFromVec, type Dir } from '../core/math';
import { forgetMap, getMapDef, hasMap, type MapContext } from '../data/maps';
import type { StructurePlacement } from '../data/maps/types';
import { TUNING } from '../tuning';
import { addItem } from './inventory';
import { moveBody } from './movement';
import { createState, generateFarmClutter, type NewGameOptions } from './newgame';
import type { GameState } from './state';
import { SYSTEMS, type DayReport } from './systems';
import type { WorldObject } from './types';
import { rollWeather } from './weather';
import { Loc } from './world';

export interface SavedLoc {
  soil?: string;
  objs?: [number, WorldObject][];
}

export interface SimEvents extends Record<string, unknown> {
  warp: { from: string; to: string };
  toast: { text: string; icon?: string };
  sound: { id: string; x?: number; y?: number };
  fx: { kind: string; x: number; y: number; color?: number; text?: string };
  dialog: { text: string; who?: string };
  changed: { what: string };
  clock: { min: number };
  sleepy: { min: number };
  passout: { min: number };
  newDay: { day: number };
  tired: { energy: number };
  levelUp: { skill: string; level: number };
  mineFloor: { floor: number };
  faint: { where: string };
  hurt: { dmg: number };
  achievement: { id: string };
  pickup: { id: string; n: number; q: number };
  anim: { kind: string; x: number; y: number };
  hearts: { id: string; hearts: number };
}

/** Systems that need per-Sim setup (warp guards etc.) register here. */
export const simInitHooks: ((sim: Sim) => void)[] = [];
/** Run once when a brand-new game is created (welcome mail, starting objects…). */
export const newGameHooks: ((sim: Sim) => void)[] = [];

/** Festival-day check is provided by the festival system (set at startup). */
export const calendarHooks = {
  isFestival: (_day: number): boolean => false,
};

export class Sim {
  state: GameState;
  world = new Map<string, Loc>();
  ev = new Emitter<SimEvents>();
  /** saved location data not yet instantiated */
  private pending: Record<string, SavedLoc> = {};
  /** tile the player arrived on via warp; warps there are ignored until they step off */
  private warpLock: { x: number; y: number } | null = null;
  /** true while a modal (menu, dialogue, cutscene) pauses the clock */
  paused = false;
  /** set by the client while walking */
  moving = false;
  /** level-ups gained today (reported at bedtime) */
  pendingLevelUps: { skill: string; level: number }[] = [];
  /** messages produced by morning systems (shown in the day summary) */
  morningNotes: string[] = [];
  /** runtime data owned by systems (not saved), e.g. villager positions */
  ext: Record<string, unknown> = {};
  /** per-frame hooks run while the clock is running */
  frameHooks: ((sim: Sim, dt: number) => void)[] = [];

  constructor(state: GameState, savedLocs: Record<string, SavedLoc> = {}) {
    this.state = state;
    this.pending = savedLocs;
    for (const f of simInitHooks) f(this);
  }

  static newGame(opts: NewGameOptions): Sim {
    const sim = new Sim(createState(opts));
    generateFarmClutter(sim.loc('farm'), sim.state.seed);
    for (const f of newGameHooks) f(sim);
    return sim;
  }

  get p() {
    return this.state.player;
  }

  mapCtx(): MapContext {
    return { houseLevel: this.state.buildings.houseLevel, done: this.state.story.done };
  }

  forgetMapCache(id: string): void {
    forgetMap(id);
  }

  /** Which structure sprite/footprint exists at a placement given current state. */
  resolveStructure = (_loc: string, sp: StructurePlacement): string | null => {
    const b = this.state.buildings;
    if (sp.kind === 'farmhouse') return `farmhouse${b.houseLevel}`;
    if (sp.kind === 'greenhouse') return this.state.story.done.includes('crops') ? 'greenhouse' : 'greenhouseRuin';
    if (sp.kind === 'plot' && sp.id) {
      const lvl = b.built[sp.id];
      if (lvl === undefined) return null;
      if (sp.id === 'coop' || sp.id === 'barn') return `${sp.id}${lvl}`;
      return sp.id;
    }
    return sp.kind;
  };

  loc(id: string): Loc {
    let l = this.world.get(id);
    if (!l) {
      const def = getMapDef(id, this.mapCtx());
      l = new Loc(def, this.resolveStructure);
      const saved = this.pending[id];
      if (saved) {
        applySavedLoc(l, saved);
        delete this.pending[id];
      }
      this.world.set(id, l);
    }
    return l;
  }

  hasLoc(id: string): boolean {
    return hasMap(id);
  }

  get here(): Loc {
    return this.loc(this.p.loc);
  }

  /** Rebuild static layout of a location (after building/upgrade changes). */
  refreshLoc(id: string): void {
    const l = this.world.get(id);
    if (!l) return;
    const def = getMapDef(id, this.mapCtx());
    if (def !== l.def) l.setDef(def, this.resolveStructure);
    else l.rebuild(this.resolveStructure);
  }

  /** All saved location payloads, including ones never loaded this session. */
  pendingLocs(): Record<string, SavedLoc> {
    return this.pending;
  }

  // ── Movement ─────────────────────────────────────────────
  speed(): number {
    let s = TUNING.walkSpeed;
    for (const b of this.p.buffs) if (b.speed) s *= 1 + b.speed;
    return s;
  }

  /** Move the player by a direction vector (length ≤ 1) for dt seconds. */
  movePlayer(vx: number, vy: number, dt: number): boolean {
    const p = this.p;
    const len = Math.hypot(vx, vy);
    if (len < 0.01) {
      this.moving = false;
      return false;
    }
    const nx = vx / Math.max(1, len), ny = vy / Math.max(1, len);
    p.dir = dirFromVec(nx, ny, p.dir);
    const sp = this.speed() * dt;
    const loc = this.here;
    const body = { x: p.x, y: p.y };
    const moved = moveBody(loc, body, nx * sp, ny * sp);
    p.x = body.x;
    p.y = body.y;
    this.moving = moved;
    if (moved) this.state.stats.steps += sp / TILE;
    this.checkWarp();
    return moved;
  }

  playerTile(): { x: number; y: number } {
    return { x: Math.floor(this.p.x / TILE), y: Math.floor((this.p.y - 1) / TILE) };
  }

  /** Tile in front of the player. */
  facingTile(): { x: number; y: number } {
    const t = this.playerTile();
    return { x: t.x + DIR_DX[this.p.dir], y: t.y + DIR_DY[this.p.dir] };
  }

  /** Guards that can block a warp with a friendly message (closed shops, locked homes…). */
  warpGuards: ((sim: Sim, to: string) => string | null)[] = [];

  private checkWarp(): void {
    const t = this.playerTile();
    if (this.warpLock) {
      if (this.warpLock.x === t.x && this.warpLock.y === t.y) return;
      this.warpLock = null;
    }
    const w = this.here.warpAtTile(t.x, t.y);
    if (!w) return;
    if (w.need && !this.state.flags[w.need] && !this.state.story.done.includes(w.need)) {
      this.ev.emit('toast', { text: w.msg ?? 'The way is blocked for now.' });
      // step back out of the warp tile
      this.p.x -= DIR_DX[this.p.dir] * 6;
      this.p.y -= DIR_DY[this.p.dir] * 6;
      return;
    }
    for (const g of this.warpGuards) {
      const msg = g(this, w.to);
      if (msg) {
        this.ev.emit('toast', { text: msg });
        this.p.x -= DIR_DX[this.p.dir] * 6;
        this.p.y -= DIR_DY[this.p.dir] * 6;
        return;
      }
    }
    if (!this.hasLoc(w.to)) {
      this.ev.emit('toast', { text: 'This path is still overgrown. Come back later!' });
      this.p.x -= DIR_DX[this.p.dir] * 6;
      this.p.y -= DIR_DY[this.p.dir] * 6;
      return;
    }
    this.warpTo(w.to, w.tx, w.ty, w.dir ?? this.p.dir);
  }

  warpTo(to: string, tx: number, ty: number, dir: Dir = this.p.dir): void {
    const from = this.p.loc;
    this.p.loc = to;
    this.p.x = tx * TILE + TILE / 2;
    this.p.y = ty * TILE + TILE - 2;
    this.p.dir = dir;
    this.loc(to);
    this.warpLock = { x: tx, y: ty };
    this.ev.emit('warp', { from, to });
  }

  // ── Clock ─────────────────────────────────────────────────
  private lastTick = -1;
  private sleepyShown = -1;
  private passoutSent = -1;
  /** multiplier for the clock (bench / tests) */
  clockScale = 1;

  minutesPerSecond(): number {
    return ((TUNING.dayEndMin - TUNING.dayStartMin) / TUNING.dayRealSeconds) * this.clockScale;
  }

  update(dt: number): void {
    if (this.paused) return;
    const st = this.state;
    st.playSec += dt;
    this.advanceMinutes(dt * this.minutesPerSecond());
    for (let i = 0; i < this.frameHooks.length; i++) this.frameHooks[i](this, dt);
  }

  /** Advance the clock, running 10-minute ticks and bedtime events. */
  advanceMinutes(m: number): void {
    const st = this.state;
    if (this.lastTick < 0) this.lastTick = Math.floor(st.min / 10);
    st.min = Math.min(TUNING.dayEndMin, st.min + m);
    const tick = Math.floor(st.min / 10);
    while (this.lastTick < tick) {
      this.lastTick++;
      for (const s of SYSTEMS) s.tick?.(this, this.lastTick * 10);
      this.ev.emit('clock', { min: this.lastTick * 10 });
    }
    if (st.min >= TUNING.sleepyMin && this.sleepyShown !== st.day) {
      this.sleepyShown = st.day;
      this.ev.emit('sleepy', { min: st.min });
    }
    if (st.min >= TUNING.dayEndMin && this.passoutSent !== st.day) {
      this.passoutSent = st.day;
      this.ev.emit('passout', { min: st.min });
    }
  }

  absMinute(): number {
    return this.state.day * 1440 + this.state.min;
  }

  // ── Items ────────────────────────────────────────────────
  /** Give the player items; anything that doesn't fit goes to the Lost & Found box at home. */
  give(id: string, n = 1, q = 0, quiet = false): void {
    if (n <= 0) return;
    const left = addItem(this.p.inv, id, n, q);
    if (left > 0) {
      const o = this.state.overflow.find((s) => s.id === id && s.q === q);
      if (o) o.n += left;
      else this.state.overflow.push({ id, n: left, q });
      this.ev.emit('toast', { text: 'Your bag is full! Extra items went to the Lost & Found box at home.', icon: 'ui.bag' });
    }
    this.state.col.found[id] = (this.state.col.found[id] ?? 0) + n;
    if (!quiet) this.ev.emit('pickup', { id, n, q });
  }

  /** Daily deterministic RNG for a purpose + coordinates. */
  rng(salt: number, a = 0, b = 0): Rng {
    return new Rng(hash32(this.state.seed, this.state.day, salt, a, b));
  }

  // ── Energy ───────────────────────────────────────────────
  /** Spend energy; returns false (and warns) if the player is too tired. */
  useEnergy(n: number): boolean {
    const p = this.p;
    if (n <= 0) return true;
    if (p.energy <= 0) {
      this.ev.emit('tired', { energy: 0 });
      return false;
    }
    p.energy = Math.max(0, p.energy - n);
    if (p.energy === 0) this.ev.emit('tired', { energy: 0 });
    return true;
  }

  gainEnergy(n: number): void {
    this.p.energy = Math.min(this.p.maxEnergy, this.p.energy + n);
  }

  // ── Sleep / new day ──────────────────────────────────────
  /** End the day: overnight systems run, then a new morning starts in bed. */
  sleep(passedOut = false): DayReport {
    const st = this.state;
    const r: DayReport = { day: st.day, shipped: [], total: 0, levelUps: this.pendingLevelUps, notes: [], passedOut };
    this.pendingLevelUps = [];
    if (st.min >= TUNING.sleepyMin) st.stats.sleepsLate++;
    for (const s of SYSTEMS) s.endDay?.(this, r);
    st.day++;
    st.min = TUNING.dayStartMin;
    st.weather = st.tomorrow;
    st.tomorrow = rollWeather(st.seed, st.day + 1, calendarHooks.isFestival);
    st.stats.daysPlayed++;
    const p = this.p;
    p.energy = p.maxEnergy;
    p.hp = p.maxHp;
    p.buffs = [];
    const house = this.loc('farmhouse');
    const bed = house.def.points.bed ?? { x: 3, y: 3 };
    this.warpTo('farmhouse', bed.x, bed.y, 0);
    this.lastTick = Math.floor(st.min / 10);
    this.morningNotes = [];
    for (const s of SYSTEMS) s.startDay?.(this);
    r.notes.push(...this.morningNotes);
    this.morningNotes = [];
    this.ev.emit('newDay', { day: st.day });
    return r;
  }
}

// ── Save helpers for locations ─────────────────────────────
export function rleEncode(a: Uint8Array): string {
  let out = '';
  let i = 0;
  while (i < a.length) {
    const v = a[i];
    let n = 1;
    while (i + n < a.length && a[i + n] === v && n < 4095) n++;
    out += (n > 1 ? n.toString(36) + ':' : '') + v.toString(36) + ',';
    i += n;
  }
  return out;
}

export function rleDecode(s: string, len: number): Uint8Array {
  const a = new Uint8Array(len);
  let i = 0;
  for (const part of s.split(',')) {
    if (!part) continue;
    const c = part.indexOf(':');
    const n = c >= 0 ? parseInt(part.slice(0, c), 36) : 1;
    const v = parseInt(c >= 0 ? part.slice(c + 1) : part, 36);
    a.fill(v, i, Math.min(len, i + n));
    i += n;
  }
  return a;
}

export function applySavedLoc(l: Loc, s: SavedLoc): void {
  if (s.soil) {
    const d = rleDecode(s.soil, l.w * l.h);
    l.soil.set(d.subarray(0, l.soil.length));
  }
  if (s.objs) for (const [i, o] of s.objs) if (i >= 0 && i < l.w * l.h) l.objs.set(i, o);
  l.chunkDirty.fill(1);
  l.objVersion++;
}

export function serializeLoc(l: Loc): SavedLoc | null {
  const hasSoil = l.soil.some((v) => v !== 0);
  if (!hasSoil && l.objs.size === 0) return null;
  const out: SavedLoc = {};
  if (hasSoil) out.soil = rleEncode(l.soil);
  if (l.objs.size) out.objs = [...l.objs.entries()];
  return out;
}
