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
    this.root.addChild(this.cover);
  }

  exit(): void {
    this.game.onWorldTap = null;
    this.game.touch.setWorldActive(false);
  }

  private build(): void {
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
    const target = w.npcAt(tx, ty) || w.wildAt(tx, ty) || w.objectAt(tx, ty);
    if (target || !w.passable(tx, ty)) {
      // walk next to it, then face it and press A
      let best: [number, number][] | null = null;
      for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]] as const) {
        const ax = tx + dx, ay = ty + dy;
        if (ax === this.state.x && ay === this.state.y) { best = []; break; }
        if (!w.passable(ax, ay) || w.wildAt(ax, ay)) continue;
        const p = findPath(w.w, w.h, this.state.x, this.state.y, ax, ay, (x, y) => w.passable(x, y) && !w.wildAt(x, y));
        if (p && (!best || p.length < best.length)) best = p;
      }
      if (best) { this.path = best; this.pathGoal = { x: tx, y: ty }; }
      return;
    }
    const p = findPath(w.w, w.h, this.state.x, this.state.y, tx, ty, (x, y) => w.passable(x, y) && !w.wildAt(x, y));
    if (p) { this.path = p; this.pathGoal = null; }
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
      if (inX && inY && (!t.when || evalFlags(t.when, this.state.flags))) {
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
      return;
    }
    const abilities: Partial<Record<MapObject['kind'], [string, string, string]>> = {
      vines: ['snip', 'Thick vines block the way. A Leaf friend could snip them.', 'Snip the vines'],
      icewall: ['melt', 'A wall of ice. A Flare friend could melt it with a warm glow.', 'Melt the ice'],
      machine: ['power', 'An old machine. A Volt friend could wake it up.', 'Power it up'],
      boulder: ['shove', 'A big round boulder. A Stone friend could shove it.', ''],
      'water-gap': ['freeze', 'The water is too wide. A Frost friend could make ice stepping stones.', 'Freeze the water'],
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
      this.world.useAbility(o);
      this.sfx('ability');
      await this.game.tutorial('ability');
      this.view.syncObjects();
      return;
    }
    if (o.kind === 'nest') return this.sayLines(['A cozy nest. Talk to the helper to let your friends nap.']);
    if (o.kind === 'shelf') return this.sayLines(['Books about Agentmon. One is called "Snacks Friends Love".']);
    if (o.kind === 'beacon') return this.sayLines([o.litBy && this.state.flags.has(o.litBy) ? 'The Beacon shines warm and bright.' : 'The Beacon is dim. Static fog swirls around it.']);
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
  async tower(): Promise<void> { this.toast('The Challenge Tower opens after the story!'); }
  async credits(): Promise<void> { this.toast('The End… for now!'); }
  async beacon(id: string): Promise<void> { this.view.syncObjects(); this.toast('The Beacon shines again!'); void id; }
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
  music(id: string): void { void id; }
  sfx(id: string): void { void id; }
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
      npcs: this.world.npcs.filter(n => n.visible).map(n => ({ id: n.def.id, x: n.x, y: n.y })),
    };
  }
}
