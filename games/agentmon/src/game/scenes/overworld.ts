/**
 * The overworld: walk around Sunreach. Smooth tile-to-tile steps (hold B to hurry), tap-to-move,
 * talking, signs, gifts, field abilities, map changes and visible wild Agentmon. It is also the
 * script host: story scripts drive dialogue, spars, walks and fades through it.
 */
import { Container, Graphics } from 'pixi.js';
import type { Outcome } from '../../core/battle/engine';
import { evalFlags } from '../../core/script';
import type { Dir } from '../../core/state';
import { findPath } from '../../core/world/path';
import { DIRS, hasAbility, type Facing, type WildMon } from '../../core/world/world';
import type { MapObject } from '../../core/world/map';
import { SPECIES } from '../../data/species';
import { MAPS } from '../../data/maps/index';
import { ELEMENT_INFO } from '../../data/elements';
import { ITEMS } from '../../data/items';
import { TER } from '../../data/terrain';
import { TILE, WorldView } from '../../render/world-view';
import { wait } from '../../ui/dom';
import type { App, Scene } from '../app';
import type { Game } from '../game';
import { runScript, type ScriptHost } from '../runner';
import { runBattleScene, runPartnerScene } from './battle-host';
import { openPauseMenu } from '../../ui/menu';
import { openShop } from '../../ui/shop';
import { playCredits } from '../../ui/credits';
import { TRIAL_BY_ID } from '../../data/trials';
import { playTower } from '../tower';
import { TrialScene } from './trial';
import { QUEST_BY_ID } from '../../data/quests';
import { routeBetween } from '../links';

const STEP = 0.2;
const RUN_STEP = 0.13;
const SLIDE_STEP = 0.09;

interface Move { fromX: number; fromY: number; toX: number; toY: number; t: number; dur: number; slide: boolean }

export class OverworldScene implements Scene, ScriptHost {
  readonly name = 'overworld';
  readonly root = new Container();
  private view!: WorldView;
  private move: Move | null = null;
  private path: [number, number][] = [];
  private pathGoal: { x: number; y: number } | null = null;
  private busy = 0;
  private walkFrame = 0;
  private walkClock = 0;
  private time = 0;
  private npcMoves = new Map<string, Move>();
  private wildMoves = new Map<number, Move>();
  private camX = 0;
  private camY = 0;
  private cover = new Graphics();
  /** Dark caves: everything but a circle around you is dark (a Glow friend makes it much wider). */
  private darkness = new Graphics();
  /** The stuck helper: after a while with no progress, a hint and a pulsing arrow to the next goal. */
  private arrow = new Graphics();
  private idle = 0;
  private onMap = 0;
  private stuckKey = '';
  private hinted = false;
  private app!: App;

  constructor(readonly game: Game) {}

  get session() { return this.game.session!; }
  get world() { return this.session.world; }
  get state() { return this.session.state; }

  enter(app: App): void {
    this.app = app;
    this.build();
    this.game.onWorldTap = (x, y) => this.onTap(x, y);
    this.game.touch.setWorldActive(true);
    this.root.addChild(this.darkness, this.arrow, this.cover);
    this.session.notify = message => this.game.toast(message, 5000);
  }

  exit(): void {
    this.game.onWorldTap = null;
    this.game.touch.setWorldActive(false);
  }

  private build(): void {
    this.game.music.play(this.world.def.music);
    if (this.view) { this.root.removeChild(this.view.root); this.view.destroy(); }
    this.view = new WorldView(this.app.sprites, this.world, this.state);
    this.root.addChildAt(this.view.root, 0);
    this.npcMoves.clear();
    this.wildMoves.clear();
    this.placeActors();
    this.snapCamera();
  }

  resize(app: App): void {
    this.snapCamera();
    void app;
  }

  // ---- helpers -----------------------------------------------------------------------------

  private zoom(): number { return this.app.host.zoom; }

  private placeActors(): void {
    const p = this.view.player;
    p.x = this.state.x * TILE + TILE / 2;
    p.y = (this.state.y + 1) * TILE - 1;
    p.zIndex = p.y + 0.3;
    for (const n of this.world.npcs) {
      const s = this.view.npcSprites.get(n.def.id);
      if (!s) continue;
      s.x = n.x * TILE + TILE / 2;
      s.y = (n.y + 1) * TILE - 1;
      s.zIndex = s.y + 0.2;
      s.texture = this.view.npcTexture(n, 0);
    }
    for (const w of this.world.wild) {
      const s = this.view.wildSprite(w);
      s.x = w.x * TILE + TILE / 2;
      s.y = (w.y + 1) * TILE;
      s.zIndex = s.y + 1;
    }
  }

  private snapCamera(): void {
    const z = this.zoom();
    const { width: W, height: H } = this.app.host;
    const p = this.view.player;
    const mapW = this.world.w * TILE * z, mapH = this.world.h * TILE * z;
    let cx = p.x * z - W / 2, cy = (p.y - 8) * z - H / 2;
    cx = mapW <= W ? (mapW - W) / 2 : Math.max(0, Math.min(mapW - W, cx));
    cy = mapH <= H ? (mapH - H) / 2 : Math.max(0, Math.min(mapH - H, cy));
    this.camX = cx;
    this.camY = cy;
    this.view.root.scale.set(z);
    this.view.root.x = -Math.round(cx);
    this.view.root.y = -Math.round(cy);
    this.cover.clear();
  }

  isBusy(): boolean { return this.busy > 0; }

  private async withBusy<T>(f: () => Promise<T>): Promise<T> {
    this.busy++;
    this.game.touch.setWorldActive(false);
    this.path = [];
    try { return await f(); } finally {
      this.busy--;
      if (!this.busy) { this.game.touch.setWorldActive(true); this.game.input.clearPresses(); }
    }
  }

  // ---- input and movement --------------------------------------------------------------------

  private onTap(clientX: number, clientY: number): void {
    if (this.busy || this.game.focus.open) return;
    const dpr = this.app.host.dpr, z = this.zoom();
    const wx = (clientX * dpr - this.view.root.x) / z, wy = (clientY * dpr - this.view.root.y) / z;
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    if (tx < 0 || ty < 0 || tx >= this.world.w || ty >= this.world.h) return;
    const w = this.world;
    // paths never cross a door (it would take you somewhere you didn't tap)
    const free = (x: number, y: number) => w.passable(x, y) && !w.wildAt(x, y) && !w.warpAt(x, y);
    // a door: walk up to it and go in
    if (w.warpAt(tx, ty) && !(tx === this.state.x && ty === this.state.y)) {
      let best: [number, number][] | null = null;
      for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]] as const) {
        const ax = tx + dx, ay = ty + dy;
        const p = ax === this.state.x && ay === this.state.y ? [] : free(ax, ay) ? findPath(w.w, w.h, this.state.x, this.state.y, ax, ay, free) : null;
        if (p && (!best || p.length < best.length)) best = p;
      }
      if (best) { this.path = [...best, [tx, ty]]; this.pathGoal = null; }
      return;
    }
    const target = w.npcAt(tx, ty) || w.wildAt(tx, ty) || w.objectAt(tx, ty);
    if (target || !w.passable(tx, ty)) {
      // walk next to it, then face it and press A
      let best: [number, number][] | null = null;
      for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]] as const) {
        const ax = tx + dx, ay = ty + dy;
        if (ax === this.state.x && ay === this.state.y) { best = []; break; }
        if (!w.passable(ax, ay) || w.wildAt(ax, ay)) continue;
        const p = findPath(w.w, w.h, this.state.x, this.state.y, ax, ay, free);
        if (p && (!best || p.length < best.length)) best = p;
      }
      if (best) { this.path = best; this.pathGoal = { x: tx, y: ty }; }
      return;
    }
    const p = findPath(w.w, w.h, this.state.x, this.state.y, tx, ty, free);
    if (!p) return;
    // an exit at the edge of the map: keep walking on to the next place
    const side = ty === 0 ? 'n' : ty === w.h - 1 ? 's' : tx === 0 ? 'w' : tx === w.w - 1 ? 'e' : null;
    if (side && w.def.edges?.some(e => e.side === side)) p.push(side === 'n' ? [tx, -1] : side === 's' ? [tx, w.h] : side === 'w' ? [-1, ty] : [w.w, ty]);
    this.path = p;
    this.pathGoal = null;
  }

  private sinceSave = 0;

  update(dt: number): void {
    this.time += dt;
    this.state.playMs += dt * 1000;
    // a quiet autosave every minute while walking around (and on every map change and spar)
    this.sinceSave += dt;
    if (this.sinceSave > 60 && !this.busy && !this.move) { this.sinceSave = 0; this.session.save(); }
    const input = this.game.input;
    const pad = input.pollGamepad();
    if (this.game.focus.open) this.game.focus.gamepad(pad);
    this.world.update(dt, this.busy > 0 || this.game.focus.open);
    this.animateWild(dt);
    this.animateNpcs(dt);
    if (!this.busy && !this.game.focus.open) this.control(dt);
    else if (this.move) this.advanceMove(dt);
    this.animatePlayer(dt);
    this.followCamera(dt);
    this.drawDarkness();
    this.stuckHelper(dt);
  }

  private stuckHelper(dt: number): void {
    const active = this.game.input.dir() !== null || !!this.move || this.busy > 0 || this.game.focus.open || this.path.length > 0;
    this.idle = active ? 0 : this.idle + dt;
    this.onMap += dt;
    const stage = this.state.quests.main ?? 0;
    const key = `${this.state.map}|${stage}`;
    if (key !== this.stuckKey) { this.stuckKey = key; this.onMap = 0; this.hinted = false; }
    const g = this.arrow.clear();
    if (!this.game.settings.hints || this.busy || this.game.focus.open) return;
    const stuck = this.idle > 40 || this.onMap > 300;
    if (!stuck) return;
    const text = QUEST_BY_ID.main?.stages[stage];
    if (!this.hinted && text) { this.hinted = true; this.game.toast(`Hint: ${text} Follow the ★ arrow!`, 6000); }
    const t = this.questTarget();
    if (!t) return;
    const z = this.zoom();
    const p = this.view.player;
    const px = p.x * z + this.view.root.x, py = (p.y - 10) * z + this.view.root.y;
    const tx = (t.x * TILE + TILE / 2) * z + this.view.root.x, ty = (t.y * TILE + TILE / 2) * z + this.view.root.y;
    const a = Math.atan2(ty - py, tx - px);
    if (Math.hypot(tx - px, ty - py) < TILE * z * 1.2) return;
    const r = TILE * z * 1.6, s = TILE * z * 0.45;
    const cx = px + Math.cos(a) * r, cy = py + Math.sin(a) * r;
    const pulse = this.game.settings.reducedMotion ? 1 : 0.65 + 0.35 * Math.sin(this.time * 4);
    const pt = (d: number, side: number) => [cx + Math.cos(a) * d - Math.sin(a) * side, cy + Math.sin(a) * d + Math.cos(a) * side];
    g.poly([...pt(s, 0), ...pt(-s * 0.7, s * 0.8), ...pt(-s * 0.3, 0), ...pt(-s * 0.7, -s * 0.8)]).fill({ color: 0xffd84a, alpha: pulse }).stroke({ color: 0x2a1f3d, width: Math.max(2, z) });
  }

  /** Where the quest arrow points: the goal on this map, or the door or map edge on the way to it. */
  private questTarget(): { x: number; y: number } | null {
    const goal = QUEST_BY_ID.main?.goals?.[this.state.quests.main ?? 0];
    if (!goal) return null;
    if (goal.map === this.state.map) return { x: goal.x, y: goal.y };
    const hop = routeBetween(this.state.map, goal.map)?.[0];
    if (!hop) return null;
    if (hop.via.kind === 'warp') return { x: hop.via.x, y: hop.via.y };
    const side = hop.via.side, w = this.world.w, h = this.world.h;
    const border: [number, number][] = [];
    const len = side === 'n' || side === 's' ? w : h;
    for (let k = 0; k < len; k++) {
      const [x, y] = side === 'n' ? [k, 0] : side === 's' ? [k, h - 1] : side === 'w' ? [0, k] : [w - 1, k];
      if (this.world.passable(x, y)) border.push([x, y]);
    }
    border.sort((a, b) => Math.hypot(a[0] - this.state.x, a[1] - this.state.y) - Math.hypot(b[0] - this.state.x, b[1] - this.state.y));
    const [bx, by] = border[0] ?? [this.state.x, this.state.y];
    return { x: bx + (side === 'e' ? 1 : side === 'w' ? -1 : 0), y: by + (side === 's' ? 1 : side === 'n' ? -1 : 0) };
  }

  private drawDarkness(): void {
    const g = this.darkness.clear();
    if (!this.world.def.dark) return;
    const z = this.zoom();
    const p = this.view.player;
    const cx = p.x * z + this.view.root.x, cy = (p.y - 8) * z + this.view.root.y;
    const r = (hasAbility(this.session.dex, this.state, 'light') ? 5.5 : 3.5) * TILE * z;
    const { width: W, height: H } = this.app.host;
    g.rect(0, 0, W, H).fill({ color: 0x0b0820, alpha: 0.9 }).circle(cx, cy, r * 1.35).cut();
    g.circle(cx, cy, r * 1.35).fill({ color: 0x0b0820, alpha: 0.45 }).circle(cx, cy, r).cut();
  }

  private control(dt: number): void {
    const input = this.game.input;
    if (this.move) { this.advanceMove(dt); return; }
    if (input.consume('menu')) { void this.openMenu(); return; }
    const held = input.dir();
    if (held !== null) { this.path = []; this.pathGoal = null; }
    if (input.consume('a')) { this.path = []; void this.interact(); return; }
    let dir: Dir | null = held;
    if (dir === null && this.path.length) {
      const [nx, ny] = this.path[0]!;
      dir = nx > this.state.x ? 2 : nx < this.state.x ? 1 : ny > this.state.y ? 0 : 3;
    } else if (dir === null && this.pathGoal) {
      const g = this.pathGoal;
      this.pathGoal = null;
      const face: Dir = g.x > this.state.x ? 2 : g.x < this.state.x ? 1 : g.y > this.state.y ? 0 : 3;
      this.state.dir = face;
      void this.interact();
      return;
    }
    if (dir === null) return;
    this.tryStep(dir, input.isDown('b'));
  }

  private tryStep(dir: Dir, run: boolean): void {
    const fromX = this.state.x, fromY = this.state.y;
    const r = this.world.step(dir);
    if (this.path.length) this.path.shift();
    switch (r.kind) {
      case 'moved':
        this.move = { fromX, fromY, toX: r.x, toY: r.y, t: 0, dur: r.slide ? SLIDE_STEP : run ? RUN_STEP : STEP, slide: r.slide };
        return;
      case 'shoved':
        this.view.syncObjects();
        return;
      case 'warp':
        this.path = [];
        this.sfx('door');
        if (r.warp.to.startsWith('trial:')) { void this.withBusy(() => this.enterTrial(r.warp.to.slice(6))); return; }
        void this.withBusy(() => this.changeMap(r.warp.to, r.warp.tx, r.warp.ty, r.warp.dir ?? dir));
        return;
      case 'locked':
        this.path = [];
        void this.withBusy(() => this.game.dialogue.say(r.warp.lockedText ?? 'It is locked.').then(() => this.game.dialogue.close()));
        return;
      case 'edge': {
        this.path = [];
        const dest = MAPS[r.to];
        if (!dest) { this.game.toast('That way opens later in the story!'); return; }
        const side = this.edgeSide(dir);
        const rows = dest.rows.length, cols = Math.max(...dest.rows.map(x => x.length));
        const x = side === 'n' ? r.x : side === 's' ? r.x : side === 'e' ? 0 : cols - 1;
        const y = side === 'n' ? rows - 1 : side === 's' ? 0 : r.y;
        void this.withBusy(() => this.changeMap(r.to, x, y, dir));
        return;
      }
      case 'wild':
        this.path = [];
        void this.withBusy(() => this.wildEncounter(r.wild));
        return;
      case 'blocked':
        if (this.pathGoal && this.path.length === 0) { /* reached */ }
        this.path = [];
        return;
    }
  }

  private edgeSide(dir: Dir): 'n' | 's' | 'e' | 'w' {
    return dir === 3 ? 'n' : dir === 0 ? 's' : dir === 2 ? 'e' : 'w';
  }

  private advanceMove(dt: number): void {
    const m = this.move!;
    m.t += dt;
    if (m.t >= m.dur) {
      this.move = null;
      this.afterStep(m);
    }
  }

  private afterStep(m: Move): void {
    // keep sliding on ice
    if (m.slide) {
      const before = { x: this.state.x, y: this.state.y };
      const r = this.world.step(this.state.dir);
      if (r.kind === 'moved') { this.move = { fromX: before.x, fromY: before.y, toX: r.x, toY: r.y, t: 0, dur: r.slide ? SLIDE_STEP : STEP, slide: r.slide }; return; }
    }
    const def = this.world.def;
    for (const t of def.triggers) {
      const inX = this.state.x >= t.x && this.state.x < t.x + (t.w ?? 1);
      const inY = this.state.y >= t.y && this.state.y < t.y + (t.h ?? 1);
      if (inX && inY && (!t.when || evalFlags(t.when, this.world.flags))) {
        this.path = [];
        void this.withBusy(() => this.run(t.script));
        return;
      }
    }
  }

  private animatePlayer(dt: number): void {
    const p = this.view.player;
    const m = this.move;
    let x = this.state.x, y = this.state.y;
    if (m) {
      const k = Math.min(1, m.t / m.dur);
      x = m.fromX + (m.toX - m.fromX) * k;
      y = m.fromY + (m.toY - m.fromY) * k;
      this.walkClock += dt;
      if (this.walkClock > (m.dur > STEP - 0.01 ? 0.13 : 0.09)) { this.walkClock = 0; this.walkFrame = (this.walkFrame + 1) % 4; }
    } else this.walkFrame = 0;
    p.x = Math.round(x * TILE + TILE / 2);
    p.y = Math.round((y + 1) * TILE - 1);
    p.zIndex = p.y + 0.3;
    const frame = m && !m.slide ? [1, 0, 2, 0][this.walkFrame]! : 0;
    p.texture = this.app.sprites.character('player', this.view.playerLook, this.state.dir, frame);
    p.alpha = TER[this.world.ter(this.state.x, this.state.y)].needs === 'paddle' ? 0.95 : 1;
  }

  private animateNpcs(dt: number): void {
    for (const n of this.world.npcs) {
      const s = this.view.npcSprites.get(n.def.id);
      if (!s) continue;
      s.visible = n.visible;
      const tx = n.x * TILE + TILE / 2, ty = (n.y + 1) * TILE - 1;
      // walk smoothly to the new tile
      s.x += Math.sign(tx - s.x) * Math.min(Math.abs(tx - s.x), dt * 60);
      s.y += Math.sign(ty - s.y) * Math.min(Math.abs(ty - s.y), dt * 60);
      s.zIndex = s.y + 0.2;
      const moving = s.x !== tx || s.y !== ty;
      const blink = n.def.creature && (this.time + n.x) % 3.5 < 0.15;
      const frame = moving ? (Math.floor(this.time * 8) % 2 ? 1 : 2) : blink ? 3 : 0;
      s.texture = this.view.npcTexture(n, frame);
      if (n.def.creature) s.pivot.y = Math.round(Math.max(0, Math.sin(this.time * 4 + n.x)) * 1.5);
    }
  }

  private animateWild(dt: number): void {
    const keep = new Set(this.world.wild.map(w => w.key));
    for (const key of [...this.view.wildSprites.keys()]) if (!keep.has(key)) this.view.removeWild(key);
    for (const w of this.world.wild) {
      const s = this.view.wildSprite(w);
      const tx = w.x * TILE + TILE / 2, ty = (w.y + 1) * TILE;
      if (w.hopped) this.wildMoves.set(w.key, { fromX: s.x, fromY: s.y, toX: tx, toY: ty, t: 0, dur: 0.35, slide: false });
      const m = this.wildMoves.get(w.key);
      if (m) {
        m.t += dt;
        const k = Math.min(1, m.t / m.dur);
        s.x = m.fromX + (m.toX - m.fromX) * k;
        s.y = m.fromY + (m.toY - m.fromY) * k - Math.sin(k * Math.PI) * 4;
        if (k >= 1) this.wildMoves.delete(w.key);
      } else {
        s.x = tx;
        s.y = ty - (Math.sin(this.time * 3 + w.key) > 0.6 ? 1 : 0);
      }
      s.scale.x = w.dir === 2 ? -1 : 1;
      s.zIndex = ty + 1;
      // shimmer twinkle, grumpy fog tint
      s.tint = w.mood === 'grumpy' ? 0xd8d0f0 : 0xffffff;
      s.alpha = w.shimmer && Math.sin(this.time * 6 + w.key) > 0.7 ? 0.8 : 1;
    }
  }

  private followCamera(dt: number): void {
    const z = this.zoom();
    const { width: W, height: H } = this.app.host;
    const p = this.view.player;
    const mapW = this.world.w * TILE * z, mapH = this.world.h * TILE * z;
    let cx = p.x * z - W / 2, cy = (p.y - 8) * z - H / 2;
    cx = mapW <= W ? (mapW - W) / 2 : Math.max(0, Math.min(mapW - W, cx));
    cy = mapH <= H ? (mapH - H) / 2 : Math.max(0, Math.min(mapH - H, cy));
    const k = Math.min(1, dt * 10);
    this.camX += (cx - this.camX) * k;
    this.camY += (cy - this.camY) * k;
    this.view.root.scale.set(z);
    this.view.root.x = -Math.round(this.camX);
    this.view.root.y = -Math.round(this.camY);
  }

  // ---- interactions --------------------------------------------------------------------------

  private async interact(): Promise<void> {
    const f: Facing = this.world.facing();
    if (f.kind === 'none') {
      const [fx, fy] = this.world.facingTile();
      if (this.world.ter(fx, fy) === 'dark' && !hasAbility(this.session.dex, this.state, 'light')) {
        await this.withBusy(() => this.sayLines(['It is too dark to see. A Glow friend could light the way.']));
      }
      return;
    }
    await this.withBusy(async () => {
      if (f.kind === 'npc') {
        const n = f.npc;
        // they turn to face you
        const back: Dir = ([3, 2, 1, 0] as Dir[])[this.state.dir]!;
        if (!n.def.creature) n.dir = back;
        else this.game.cry(n.def.creature);
        await this.run(n.def.talk);
      } else if (f.kind === 'wild') {
        await this.wildEncounter(f.wild);
      } else if (f.kind === 'water') {
        await this.sayLines(['The water is calm and clear. A Tide friend could help you paddle across.']);
      } else if (f.kind === 'object') {
        await this.useObject(f.obj);
      }
    });
  }

  private async useObject(o: MapObject): Promise<void> {
    const dex = this.session.dex;
    if (o.kind === 'sign') return this.sayLines([o.text ?? 'A sign.']);
    if (o.kind === 'gift') {
      this.state.flags.add(`got:${this.world.def.id}:${o.id}`);
      if (o.item) { this.session.give(o.item); this.toast(`Found ${ITEMS[o.item]?.name ?? o.item}!`); this.sfx('item'); }
      this.view.syncObjects();
      if (o.script) await this.run(o.script);
      return;
    }
    const abilities: Partial<Record<MapObject['kind'], [string, string, string]>> = {
      vines: ['snip', 'Thick vines block the way. A Leaf friend could snip them.', 'Snip the vines'],
      icewall: ['melt', 'A wall of ice. A Flare friend could melt it with a warm glow.', 'Melt the ice'],
      machine: ['power', 'An old machine. A Volt friend could wake it up.', 'Power it up'],
      boulder: ['shove', 'A big round boulder. A Stone friend could shove it.', ''],
      'water-gap': ['freeze', 'The stream rushes too fast to paddle. A Frost friend could freeze an ice step.', 'Freeze the water'],
      updraft: ['updraft', 'A strong wind blows straight up here. A Gust friend could ride it!', 'Ride the updraft'],
    };
    const a = abilities[o.kind];
    if (a) {
      const [ability, missing, verb] = a;
      if (!hasAbility(dex, this.state, ability)) return this.sayLines([missing]);
      if (!verb) return this.sayLines(['Walk into the boulder to shove it.']);
      const el = Object.values(ELEMENT_INFO).find(e => e.ability.id === ability)!;
      const friend = [...this.state.team, ...this.state.base].find(c => SPECIES[c.species]?.element === el.id);
      const pick = await this.ask(`${friend ? this.session.friendName(friend) : 'Your friend'} can help! ${verb}?`, ['Yes', 'No']);
      this.game.dialogue.close();
      if (pick !== 0) return;
      if (o.kind === 'updraft') { if (o.script) await this.run(o.script); return; }
      this.world.useAbility(o);
      this.sfx('ability');
      await this.game.tutorial('ability');
      this.view.syncObjects();
      return;
    }
    if (o.kind === 'nest') return this.sayLines(['A cozy nest. Talk to the helper to let your friends nap.']);
    if (o.kind === 'shelf') return this.sayLines(['Books about Agentmon. One is called "Snacks Friends Love".']);
    if (o.kind === 'beacon') return this.sayLines([o.litBy && this.state.flags.has(o.litBy) ? 'The Beacon shines warm and bright.' : 'The Beacon is dim. Static fog swirls around it.']);
    if (o.kind === 'lure') return this.sayLines(['A striped tower with a dish on top. It hums, and gray fog puffs out of it.']);
    if (o.script) return this.run(o.script);
  }

  private async sayLines(lines: string[], who?: string): Promise<void> {
    for (const l of lines) await this.game.dialogue.say(l, who);
    this.game.dialogue.close();
  }

  /** Play a story script from outside (a new game's intro): the world waits until it ends. */
  play(script: string): Promise<void> { return this.withBusy(() => this.run(script)); }

  async run(script: string): Promise<void> {
    await runScript(this.session, this, script);
    this.game.dialogue.close();
    this.refresh();
  }

  private async wildEncounter(w: WildMon): Promise<void> {
    this.session.seen(w.species);
    const out = await runBattleScene(this.game, { kind: 'wild', wild: w });
    if (out === 'lost') { await this.lostSpar(); return; }
    this.world.remove(w.key);
    this.session.save();
  }

  /** A Trial's door: the puzzle rooms (or, once solved, straight through to where they lead). */
  private async enterTrial(id: string): Promise<void> {
    const t = TRIAL_BY_ID[id];
    if (!t) return;
    if (this.state.flags.has(`trial:${id}`)) { await this.changeMap(t.to.map, t.to.x, t.to.y, 3); return; }
    await this.game.fade('out');
    this.session.save();
    this.game.app.go(new TrialScene(this.game, id));
    await this.game.fade('in');
  }

  private async changeMap(id: string, x: number, y: number, dir: Dir): Promise<void> {
    await this.game.fade('out');
    this.session.enterMap(id, x, y, dir);
    this.build();
    this.session.save();
    await this.game.fade('in');
  }

  private async openMenu(): Promise<void> {
    await this.withBusy(() => openPauseMenu(this.game));
    if (this.game.session === null) return;
    this.view.syncNpcs();
  }

  // ---- ScriptHost ----------------------------------------------------------------------------

  say(text: string, who?: string): Promise<void> { return this.game.dialogue.say(text, who); }
  ask(text: string, options: string[], who?: string): Promise<number> { return this.game.dialogue.ask(text, options, who); }
  fade(dir: 'out' | 'in'): Promise<void> { this.game.dialogue.close(); return this.game.fade(dir); }
  wait(seconds: number): Promise<void> { return wait(seconds * 1000); }
  async spar(trainer: string): Promise<Outcome> {
    this.game.dialogue.close();
    return runBattleScene(this.game, { kind: 'trainer', trainer });
  }
  async wild(o: { species: string; level: number; guardian?: boolean }): Promise<Outcome> {
    this.game.dialogue.close();
    return runBattleScene(this.game, { kind: 'wild', species: o.species, level: o.level, guardian: o.guardian });
  }
  async partner(species: string): Promise<void> {
    this.game.dialogue.close();
    await runPartnerScene(this.game, species);
    this.refresh();
  }
  async lostSpar(): Promise<void> {
    this.game.dialogue.close();
    await this.game.fade('out');
    const r = this.state.rest;
    this.session.healAll();
    this.session.enterMap(r.map, r.x, r.y, 0);
    this.build();
    await this.game.fade('in');
    await this.sayLines(['Your friends took a nap at the Rest Stop. Everyone is rested and ready!']);
    this.session.save();
  }
  async shop(id: string): Promise<void> { this.game.dialogue.close(); await openShop(this.game, id); }
  async base(): Promise<void> { this.toast('The Agent Base opens later in the story!'); }
  async tower(): Promise<void> { this.game.dialogue.close(); await playTower(this.game); }
  async credits(): Promise<void> {
    this.game.dialogue.close();
    await playCredits(this.game, [...this.state.team].map(c => this.session.friendName(c)));
  }
  async beacon(id: string): Promise<void> { this.view.syncObjects(); this.sfx('beacon'); this.toast('The Beacon shines again!'); void id; }
  async walk(who: string, path: string): Promise<void> {
    for (const ch of path) {
      const dir = ({ d: 0, l: 1, r: 2, u: 3 } as Record<string, Dir>)[ch];
      if (dir === undefined) continue;
      if (who === 'player') {
        const fromX = this.state.x, fromY = this.state.y;
        const r = this.world.step(dir);
        if (r.kind === 'moved') { this.move = { fromX, fromY, toX: r.x, toY: r.y, t: 0, dur: STEP, slide: false }; await wait(STEP * 1000 + 20); this.move = null; }
      } else {
        const n = this.world.npcs.find(x => x.def.id === who);
        if (!n) continue;
        const [dx, dy] = DIRS[dir];
        n.dir = dir;
        n.x += dx;
        n.y += dy;
        await wait(STEP * 1000 + 40);
      }
    }
  }
  face(who: string, dir: Dir): void {
    if (who === 'player') this.state.dir = dir;
    else { const n = this.world.npcs.find(x => x.def.id === who); if (n) n.dir = dir; }
  }
  async warp(map: string, x: number, y: number, dir?: Dir): Promise<void> { await this.changeMap(map, x, y, dir ?? 0); }
  async emote(who: string, emote: string): Promise<void> { void who; void emote; await wait(400); }
  music(id: string): void { this.game.music.play(id); }
  sfx(id: string): void { this.game.sfx(id); }
  toast(text: string): void { this.game.toast(text); }
  tutorial(id: string): Promise<void> { this.game.dialogue.close(); return this.game.tutorial(id); }
  refresh(): void {
    this.world.refreshNpcs();
    this.view.syncNpcs();
    this.view.syncObjects();
  }

  snapshot() {
    return {
      map: this.state.map, x: this.state.x, y: this.state.y, dir: this.state.dir, busy: this.busy > 0,
      moving: !!this.move, team: this.state.team.map(c => ({ species: c.species, level: c.level, energy: c.energy })),
      wild: this.world.wild.map(w => ({ species: w.species, x: w.x, y: w.y, shimmer: w.shimmer })),
      flags: [...this.state.flags].sort(), coins: this.state.coins, dialogue: this.game.dialogue.open,
      // where the camera is, so tests can tap a tile: screen px = (tile * 16 + 8) * zoom + offset, ÷ dpr
      view: { x: this.view.root.x, y: this.view.root.y, zoom: this.zoom(), dpr: this.app.host.dpr },
      npcs: this.world.npcs.filter(n => n.visible).map(n => ({ id: n.def.id, x: n.x, y: n.y })),
    };
  }
}
