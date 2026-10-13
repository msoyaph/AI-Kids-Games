/**
 * A Trial: puzzle rooms one after another, then the top floor (the Keeper and the Beacon).
 * Grid steps with the same controls as walking around (stick, keys, d-pad, tap a direction).
 * A on a mirror turns it; A on vines or an ice block clears them (the Keeper's helpers lend you
 * any ability inside a Trial). Reset puts the room back as it started, so nothing can get stuck.
 * The stuck helper offers a hint after a while (or straight away from the Hint button).
 */
import { Container, Graphics, Sprite } from 'pixi.js';
import { playerLook } from '../../art/characters';
import { bakeRoom, block, colorGate, colorSwitch, crystal, door, emitter, iceBlock, mirror, platformSprite, vineWall } from '../../art/trial-art';
import { doorOpen, interact, mirrorAt, move, parseRoom, platformTiles, tickPlatforms, traceBeams, type PuzzleState, type Room } from '../../core/puzzle/puzzle';
import type { Dir } from '../../core/state';
import { TRIAL_BY_ID, type TrialDef } from '../../data/trials';
import { solve } from '../../core/puzzle/solver';
import { bigTextures } from '../../render/atlas';
import { h } from '../../ui/dom';
import type { App, Scene } from '../app';
import type { Game } from '../game';
import { OverworldScene } from './overworld';

const T = 16;
const STEP = 0.16;
const PLATFORM_TICK = 0.7;

export class TrialScene implements Scene {
  readonly name = 'trial';
  readonly root = new Container();
  private trial: TrialDef;
  private roomIndex = 0;
  private room!: Room;
  private state!: PuzzleState;
  private world = new Container();
  private ground = new Container();
  private pieces = new Container();
  private beams = new Graphics();
  private player = new Sprite();
  private blockSprites: Sprite[] = [];
  private platformSprites: Sprite[] = [];
  private tileSprites = new Map<number, Sprite>();
  private anim: { t: number; dur: number; from: { x: number; y: number }; blocks: Map<number, { x: number; y: number }> } | null = null;
  private platformClock = 0;
  private idle = 0;
  private moves = 0;
  private resets = 0;
  private ui!: HTMLElement;
  private hintShown = false;
  private app!: App;
  private busy = false;
  private time = 0;
  /** R resets the room (keyboard); the Reset button works everywhere. */
  private resetKey = false;
  private onKey = (e: KeyboardEvent) => { if (e.code === 'KeyR' && !e.repeat && !this.game.focus.open) this.resetKey = true; };

  constructor(private game: Game, trialId: string, private onDone?: () => void) {
    this.trial = TRIAL_BY_ID[trialId]!;
    this.roomIndex = Math.min(this.trial.rooms.length - 1, game.session?.state.vars[`trial-room:${trialId}`] ?? 0);
  }

  enter(app: App): void {
    this.app = app;
    this.world.addChild(this.ground, this.beams, this.pieces);
    this.root.addChild(this.world);
    this.ui = h('div.trial-ui', {},
      h('div.trial-title', {}),
      h('div.trial-buttons', {},
        h('button', { type: 'button', onclick: () => this.reset() }, '↺ Reset'),
        h('button', { type: 'button', onclick: () => void this.showHint() }, '💡 Hint'),
        h('button', { type: 'button', onclick: () => void this.leave() }, '🚪 Leave'),
      ));
    app.ui.appendChild(this.ui);
    this.game.onWorldTap = (x, y) => this.onTap(x, y);
    this.game.touch.setWorldActive(true);
    addEventListener('keydown', this.onKey);
    this.loadRoom(this.roomIndex);
    this.game.music.play(this.trial.music);
    if (this.room.def.tutorial) void this.withBusy(() => this.game.tutorial(this.room.def.tutorial!));
  }

  exit(): void {
    removeEventListener('keydown', this.onKey);
    this.ui.remove();
    this.game.onWorldTap = null;
    this.game.touch.setWorldActive(false);
  }

  private async withBusy<T>(f: () => Promise<T>): Promise<T> {
    this.busy = true;
    this.game.touch.setWorldActive(false);
    try { return await f(); } finally { this.busy = false; this.game.touch.setWorldActive(true); this.game.input.clearPresses(); }
  }

  private loadRoom(i: number): void {
    this.roomIndex = i;
    const s = this.game.session?.state;
    if (s) s.vars[`trial-room:${this.trial.id}`] = i;
    this.room = parseRoom(this.trial.rooms[i]!);
    this.state = this.room.start;
    this.moves = 0;
    this.resets = 0;
    this.idle = 0;
    this.hintShown = false;
    this.ground.removeChildren().forEach(c => c.destroy({ children: true }));
    for (const chunk of bigTextures(bakeRoom(this.room, this.trial.theme))) {
      const sp = new Sprite(chunk.tex);
      sp.x = chunk.x;
      sp.y = chunk.y;
      this.ground.addChild(sp);
    }
    this.pieces.removeChildren();
    this.tileSprites.clear();
    this.blockSprites = [];
    this.platformSprites = [];
    const sprites = this.app.sprites;
    const theme = this.trial.theme;
    this.room.grid.forEach((ch, k) => {
      const x = (k % this.room.w) * T, y = Math.floor(k / this.room.w) * T;
      let spr: Sprite | null = null;
      if (ch === 'p' || ch === 't' || ch === 'y') spr = new Sprite(sprites.get(`sw:${ch}`, () => colorSwitch(ch)));
      else if (ch === 'P' || ch === 'T' || ch === 'Y' || ch === 'D' || ch === 'C' || ch === 'm' || ch === 'n' || ch === '/' || ch === '\\') spr = new Sprite();
      else if (ch === 'L') { const d = (this.room.def.emitters ?? []).find(e => e.y * this.room.w + e.x === k)?.dir ?? 2; spr = new Sprite(sprites.get(`em:${d}`, () => emitter(d))); }
      else if (ch === 'V') spr = new Sprite(sprites.get('vinewall', () => vineWall()));
      else if (ch === 'I') spr = new Sprite(sprites.get('iceblock', () => iceBlock()));
      if (spr) { spr.x = x; spr.y = y; this.pieces.addChild(spr); this.tileSprites.set(k, spr); }
    });
    for (let i = 0; i < (this.room.def.platforms ?? []).length; i++) {
      const p = new Sprite(sprites.get(`plat:${theme}`, () => platformSprite(theme)));
      this.pieces.addChild(p);
      this.platformSprites.push(p);
    }
    for (let i = 0; i < this.state.blocks.length; i++) {
      const b = new Sprite(sprites.get(`block:${theme}`, () => block(theme)));
      this.pieces.addChild(b);
      this.blockSprites.push(b);
    }
    const s2 = this.game.session?.state;
    const look = s2 ? playerLook(s2.look.skin, s2.look.hair, s2.look.hairColor, s2.look.outfit) : playerLook(1, 0, 0, 0);
    this.player = new Sprite(sprites.character('player', look, this.state.dir, 0));
    this.player.anchor.set(0.5, 1);
    this.pieces.addChild(this.player);
    (this.ui.querySelector('.trial-title') as HTMLElement).textContent = `${this.trial.name} · ${this.room.def.name} (${i + 1}/${this.trial.rooms.length})`;
    this.sync();
    this.resize(this.app);
  }

  resize(app: App): void {
    const { width: W, height: H } = app.host;
    const z = Math.max(1, Math.min(Math.floor(W / (this.room.w * T)), Math.floor((H * 0.86) / (this.room.h * T)), app.host.zoom + 1));
    this.world.scale.set(z);
    this.world.x = Math.round((W - this.room.w * T * z) / 2);
    this.world.y = Math.round((H - this.room.h * T * z) / 2 + H * 0.04);
  }

  /** Make every sprite match the state (instantly; the step animation eases the movers). */
  private sync(): void {
    const sprites = this.app.sprites;
    const theme = this.trial.theme;
    const open = doorOpen(this.room, this.state);
    const beams = traceBeams(this.room, this.state);
    this.room.grid.forEach((ch, k) => {
      const s = this.tileSprites.get(k);
      if (!s) return;
      if (ch === 'P' || ch === 'T' || ch === 'Y') { const c = ch.toLowerCase() as 'p'; const o = this.state.gatesOpen.includes(c); s.texture = sprites.get(`gate:${c}:${o}`, () => colorGate(c, o)); }
      if (ch === 'D') s.texture = sprites.get(`door:${theme}:${open}`, () => door(open, theme));
      if (ch === 'C') { const lit = beams.lit.has(k); s.texture = sprites.get(`crystal:${lit}`, () => crystal(lit)); }
      if (ch === 'm' || ch === 'n' || ch === '/' || ch === '\\') { const m = mirrorAt(this.room, this.state, k)!; const turn = ch === 'm' || ch === 'n'; s.texture = sprites.get(`mirror:${m}:${turn}`, () => mirror(m, turn)); }
      if (ch === 'V' || ch === 'I') s.visible = !this.state.cleared.includes(k);
    });
    this.beams.clear();
    for (const b of beams.path) {
      const x = (b.i % this.room.w) * T, y = Math.floor(b.i / this.room.w) * T;
      if (b.dir === 0 || b.dir === 3) this.beams.rect(x + 6, y, 4, T).fill({ color: 0xfff3b0, alpha: 0.85 });
      else this.beams.rect(x, y + 6, T, 4).fill({ color: 0xfff3b0, alpha: 0.85 });
    }
    platformTiles(this.room, this.state.tick).forEach((t, i) => {
      const p = this.platformSprites[i]!;
      p.x = (t % this.room.w) * T;
      p.y = Math.floor(t / this.room.w) * T;
    });
    this.blockSprites.forEach((b, i) => {
      const k = this.state.blocks[i];
      b.visible = k !== undefined;
      if (k !== undefined) { b.x = (k % this.room.w) * T; b.y = Math.floor(k / this.room.w) * T; }
    });
    this.player.x = this.state.x * T + T / 2;
    this.player.y = (this.state.y + 1) * T - 2;
  }

  private reset(): void {
    if (this.busy) return;
    this.state = this.room.start;
    this.resets++;
    this.anim = null;
    this.sync();
    this.game.toast('Room reset!', 900);
  }

  private async showHint(): Promise<void> {
    if (this.busy) return;
    this.hintShown = true;
    await this.withBusy(async () => { await this.game.dialogue.say(this.room.def.hint, 'Hint'); this.game.dialogue.close(); });
  }

  /** The Trial menu (Start / M / Menu): keep going, reset the room, a hint, or leave for now. */
  private async trialMenu(): Promise<void> {
    if (this.busy) return;
    const pick = await this.withBusy(async () => {
      const r = await this.game.dialogue.ask('Trial menu', ['Keep going', 'Reset room', 'Hint', 'Leave for now']);
      this.game.dialogue.close();
      return r;
    });
    if (pick === 1) { this.reset(); this.sync(); }
    else if (pick === 2) await this.showHint();
    else if (pick === 3) await this.leave();
  }

  private async leave(): Promise<void> {
    if (this.busy) return;
    const pick = await this.withBusy(async () => {
      const r = await this.game.dialogue.ask('Leave the Trial for now? You can come back to this room any time.', ['Keep going', 'Leave']);
      this.game.dialogue.close();
      return r;
    });
    if (pick === 1) this.finish(false);
  }

  private finish(done: boolean): void {
    const g = this.game;
    const session = g.session;
    if (!session) return;
    if (done) {
      session.state.flags.add(`trial:${this.trial.id}`);
      session.state.stats.puzzles += this.trial.rooms.length;
      delete session.state.vars[`trial-room:${this.trial.id}`];
      const to = this.trial.to;
      session.enterMap(to.map, to.x, to.y, 3);
    } else {
      const s = session.state;
      session.enterMap(s.map, s.x, s.y, 0);
    }
    session.save();
    this.onDone?.();
    g.app.go(new OverworldScene(g));
  }

  private onTap(clientX: number, clientY: number): void {
    if (this.busy || this.anim) return;
    const dpr = this.app.host.dpr, z = this.world.scale.x;
    const tx = Math.floor((clientX * dpr - this.world.x) / z / T), ty = Math.floor((clientY * dpr - this.world.y) / z / T);
    const dx = tx - this.state.x, dy = ty - this.state.y;
    if (dx === 0 && dy === 0) return;
    const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : dy > 0 ? 0 : 3;
    // tapping the tile you face, right next to you, uses it when there is something to use (turn a
    // mirror, snip vines, melt an ice block); otherwise it is a step
    if (Math.abs(dx) + Math.abs(dy) === 1 && dir === this.state.dir) {
      const k = ty * this.room.w + tx;
      const ch = this.room.grid[k];
      if ((ch === 'm' || ch === 'n' || ch === 'V' || ch === 'I') && !this.state.cleared.includes(k)) { this.pressA(); return; }
    }
    this.step(dir);
  }

  private pressA(): void {
    const r = interact(this.room, this.state, { snip: true, melt: true });
    if (r.events.length) { this.state = r.state; this.sync(); this.moves++; }
  }

  private step(dir: Dir): void {
    const before = this.state;
    const r = move(this.room, this.state, dir);
    this.state = r.state;
    if (r.events.includes('blocked')) { this.sync(); return; }
    if (r.events.includes('pushed') || r.events.includes('slid')) this.game.sfx('push');
    if (r.events.includes('filled') || r.events.includes('toggled')) this.game.sfx('click');
    this.moves++;
    this.idle = 0;
    const blocks = new Map<number, { x: number; y: number }>();
    before.blocks.forEach((k, i) => blocks.set(i, { x: (k % this.room.w) * T, y: Math.floor(k / this.room.w) * T }));
    const dist = Math.abs(this.state.x - before.x) + Math.abs(this.state.y - before.y);
    this.anim = { t: 0, dur: STEP * Math.max(1, dist * 0.6), from: { x: before.x * T + T / 2, y: (before.y + 1) * T - 2 }, blocks };
    if (r.events.includes('solved')) void this.solved();
  }

  private async solved(): Promise<void> {
    await this.withBusy(async () => {
      await new Promise(res => setTimeout(res, 350));
      this.game.sfx('solved');
      this.game.toast(`Room ${this.roomIndex + 1} solved! ✨`, 1200);
      if (this.roomIndex + 1 < this.trial.rooms.length) {
        await this.game.fade('out');
        this.loadRoom(this.roomIndex + 1);
        await this.game.fade('in');
        if (this.room.def.tutorial) await this.game.tutorial(this.room.def.tutorial);
      } else {
        await this.game.fade('out');
        this.finish(true);
        await this.game.fade('in');
      }
    });
  }

  update(dt: number): void {
    this.time += dt;
    const input = this.game.input;
    const pad = input.pollGamepad();
    if (this.game.focus.open) { this.game.focus.gamepad(pad); return; }
    // moving platforms keep their own clock
    if (this.room.def.platforms?.length && !this.busy) {
      this.platformClock += dt;
      if (this.platformClock >= PLATFORM_TICK) {
        this.platformClock = 0;
        this.state = tickPlatforms(this.room, this.state);
        if (!this.anim) this.sync();
        if (this.room.grid[this.state.y * this.room.w + this.state.x] === 'E' && !this.state.solved) { this.state = { ...this.state, solved: true }; void this.solved(); }
      }
    }
    if (this.anim) {
      const a = this.anim;
      a.t += dt;
      const k = Math.min(1, a.t / a.dur);
      const tx = this.state.x * T + T / 2, ty = (this.state.y + 1) * T - 2;
      this.player.x = Math.round(a.from.x + (tx - a.from.x) * k);
      this.player.y = Math.round(a.from.y + (ty - a.from.y) * k);
      if (k >= 1) { this.anim = null; this.sync(); }
    }
    const look = this.player;
    const s = this.game.session?.state;
    if (s) {
      const frame = this.anim ? [1, 0, 2, 0][Math.floor(this.time * 10) % 4]! : 0;
      look.texture = this.app.sprites.character('player', playerLook(s.look.skin, s.look.hair, s.look.hairColor, s.look.outfit), this.state.dir, frame);
    }
    if (this.busy || this.anim) return;
    // the stuck helper: a gentle hint after a long pause or several resets
    this.idle += dt;
    if (!this.hintShown && (this.idle > 75 || this.resets >= 3)) { void this.showHint(); return; }
    if (this.resetKey) { this.resetKey = false; this.reset(); this.sync(); return; }
    if (input.consume('menu')) { void this.trialMenu(); return; }
    if (input.consume('a')) { this.pressA(); return; }
    if (input.consume('b')) return;
    const d = input.dir();
    if (d !== null) this.step(d);
  }

  /** Capture routes and tests: play the first `n` steps of a solution at once. */
  demo(n: number): void {
    const sol = solve(this.room, this.room.start);
    if (!sol) return;
    for (const a of sol.actions.slice(0, n)) {
      if (a === 'wait') this.state = tickPlatforms(this.room, this.state);
      else if (typeof a === 'string') this.state = interact(this.room, { ...this.state, dir: Number(a[1]) as Dir }, { snip: true, melt: true }).state;
      else this.state = move(this.room, this.state, a).state;
    }
    this.sync();
  }

  /** Capture routes: solve the room on its own, one step at a time (for the preview loop). */
  async autoplay(): Promise<void> {
    const sol = solve(this.room, this.state);
    if (!sol) return;
    for (const a of sol.actions) {
      while (this.anim || this.busy) await new Promise(r => setTimeout(r, 30));
      await new Promise(r => setTimeout(r, 260));
      if (a === 'wait') await new Promise(r => setTimeout(r, PLATFORM_TICK * 1000));
      else if (typeof a === 'string') { this.state = { ...this.state, dir: Number(a[1]) as Dir }; this.pressA(); }
      else this.step(a);
    }
  }

  /** The solution from the current state (tests use it to play a room with real key presses). */
  solution(): string[] {
    return solve(this.room, this.state)?.actions.map(String) ?? [];
  }

  snapshot() {
    return { trial: this.trial.id, room: this.room.def.id, roomIndex: this.roomIndex, x: this.state.x, y: this.state.y, moves: this.moves, solved: this.state.solved, busy: this.busy,
      view: { x: this.world.x, y: this.world.y, zoom: this.world.scale.x, dpr: this.app.host.dpr } };
  }
}
