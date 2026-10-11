/** Game client: owns sim, renderer, input and UI; runs the main loop and mode flow. */
import { Container, Sprite } from 'pixi.js';
import { TILE, clamp } from '../core/math';
import { storageMode } from '../core/storage';
import { Input, type Action } from '../input/input';
import { Atlas } from '../render/atlas';
import { bakeAll, bakeCharacter } from '../render/art';
import type { Look } from '../render/art/characters';
import { bakeIcons } from '../render/art/icons';
import { createRenderer, type RenderHost } from '../render/renderer';
import { Fx } from '../render/fx';
import { WorldView } from '../render/world-view';
import type { ToolKind } from '../data/items';
import type { WorldObject } from '../sim/types';
import { INV_CSS } from '../ui/inventory';
import { iconName, itemName } from '../ui/itemview';
import { openShipping } from '../ui/ship';
import { Controller } from './controller';
import { loadSlot, saveToSlot } from '../sim/save';
import { Sim } from '../sim';
import { seasonOf } from '../sim/state';
import type { NewGameOptions } from '../sim/newgame';
import { TUNING } from '../tuning';
import { dayEndView } from '../ui/dayend';
import { h } from '../ui/dom';
import { Hud } from '../ui/hud';
import { initIcons } from '../ui/icons';
import { CSS } from '../ui/style';
import { TitleScreen } from '../ui/title';
import { Fader, Modals, Toasts } from '../ui/widgets';
import { applySettingsToDom, loadSettings, saveSettings, type Settings } from './settings';

export interface GameOptions {
  bench: boolean;
  playtest: boolean;
  lowq: boolean;
  seed?: number;
}

export type Mode = 'boot' | 'title' | 'play' | 'sleeping';

export class Game {
  host!: RenderHost;
  atlas = new Atlas();
  playerAtlas = new Atlas();
  view!: WorldView;
  input = new Input();
  sim!: Sim;
  opts: GameOptions;
  settings: Settings;
  mode: Mode = 'boot';
  slot = 1;
  stage = new Container();
  player = new Sprite();
  playerShadow = new Sprite();
  cam = { x: 0, y: 0 };
  private last = 0;
  private walkT = 0;
  fps = 60;
  private fpsAcc = 0;
  private fpsN = 0;
  // UI
  uiRoot!: HTMLElement;
  hud!: Hud;
  toasts!: Toasts;
  modals!: Modals;
  fader!: Fader;
  title!: TitleScreen;
  private titleT = 0;
  private busy = false;
  private unsub: (() => void)[] = [];
  fx = new Fx();
  ctl!: Controller;

  constructor(opts: GameOptions) {
    this.opts = opts;
    this.settings = loadSettings();
  }

  async init(parent: HTMLElement): Promise<void> {
    this.host = await createRenderer(parent, this.opts.lowq || this.settings.quality === 'low');
    this.host.zoomBias = this.settings.zoom;
    bakeAll(this.atlas);
    bakeIcons(this.atlas);
    this.atlas.bake();
    this.view = new WorldView(this.host.app.renderer, this.atlas);
    this.stage.addChild(this.view.root);
    this.host.app.stage.addChild(this.stage);
    this.player.anchor.set(0.5, 1);
    this.player.label = 'nocull';
    this.playerShadow.anchor.set(0.5, 0.5);
    this.playerShadow.alpha = 0.25;
    this.playerShadow.label = 'nocull';
    this.playerShadow.texture = this.atlas.tex('shadow');
    this.ctl = new Controller(this);
    this.view.fx.addChild(this.fx.layer);
    this.view.top.addChild(this.ctl.layer);
    this.input.attachCanvas(this.host.app.canvas as HTMLCanvasElement);
    this.initUI();
    this.input.onAction = (a) => this.onRawAction(a);
    window.addEventListener('pagehide', () => this.suspend());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.suspend();
    });
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  private initUI(): void {
    const style = document.createElement('style');
    style.textContent = CSS + INV_CSS;
    document.head.appendChild(style);
    initIcons(this.atlas);
    applySettingsToDom(this.settings);
    this.uiRoot = document.getElementById('ui')!;
    this.hud = new Hud(this.uiRoot);
    this.hud.onSlot = (i) => this.selectSlot(i);
    this.hud.onMenu = () => this.openMenu();
    this.toasts = new Toasts(this.uiRoot);
    this.modals = new Modals(this.uiRoot);
    this.modals.onChange = (open) => {
      if (this.sim) this.sim.paused = open || this.mode !== 'play';
      this.input.clear();
    };
    this.fader = new Fader(this.uiRoot);
    this.title = new TitleScreen(this.uiRoot, this.modals, {
      onLoad: (slot) => this.loadGame(slot),
      onNew: (slot, o) => this.newGame(slot, o),
      onSettings: () => this.openSettings(),
      onBench: () => this.toasts.show('The performance test arrives in a later update.'),
    });
    this.hud.show(false);
  }

  // ── Modes ────────────────────────────────────────────────
  showTitle(): void {
    this.mode = 'title';
    this.hud.show(false);
    this.title.show(true);
    // demo farm behind the title
    this.attachSim(Sim.newGame({ name: '', farm: '', pet: 'dog', petName: '', seed: 4242 }));
    this.sim.paused = true;
    this.sim.warpTo('farm', 30, 18, 0);
    this.enterLocation();
    this.player.visible = false;
    this.playerShadow.visible = false;
  }

  private attachSim(sim: Sim): void {
    for (const u of this.unsub) u();
    this.unsub = [];
    this.sim = sim;
    const ev = sim.ev;
    this.unsub.push(
      ev.on('toast', (e) => this.toasts.show(e.text, e.icon)),
      ev.on('sleepy', () => this.toasts.show("It's getting late... you feel sleepy. Time for bed soon!", 'ui.moon', 5000)),
      ev.on('passout', () => void this.goToBed(true)),
      ev.on('tired', () => this.toasts.show("You're out of energy! Eat a snack or head to bed.", 'ui.energy')),
      ev.on('pickup', (e) => this.toasts.pickup(iconName(e.id, this.sim.p.tools), `+${e.n} ${itemName(e.id)}`)),
      ev.on('levelUp', (e) => this.toasts.show(`Your ${e.skill} skill grew to level ${e.level}!`, 'ui.star2', 4500)),
      ev.on('anim', (e) => {
        if (e.kind === 'shake') {
          const s = this.view.spriteAt(this.sim.here, e.x, e.y);
          if (s) this.fx.shake(s);
        }
      }),
    );
  }

  newGame(slot: number, o: NewGameOptions): void {
    this.slot = slot;
    this.attachSim(Sim.newGame(o));
    this.beginPlay();
    this.save(false);
    this.toasts.show(`Welcome to Cliff Valley, ${this.sim.p.name}!`, 'ui.season0', 4500);
  }

  loadGame(slot: number): void {
    const sim = loadSlot(slot);
    if (!sim) {
      this.modals.ask('Oops!', "That farm couldn't be opened. It might be from a newer version of the game.", [{ label: 'OK', primary: true }]);
      return;
    }
    this.slot = slot;
    this.attachSim(sim);
    this.beginPlay();
  }

  private beginPlay(): void {
    this.settings.lastSlot = this.slot;
    saveSettings(this.settings);
    this.title.show(false);
    this.mode = 'play';
    this.sim.paused = false;
    this.bakePlayer();
    this.player.visible = true;
    this.playerShadow.visible = true;
    this.enterLocation();
    this.hud.show(true);
  }

  quitToTitle(): void {
    this.save(this.sim.state.min > TUNING.dayStartMin);
    this.modals.closeAll();
    this.showTitle();
  }

  /** Save to the current slot; returns false and shows a friendly note on failure. */
  save(suspended: boolean): boolean {
    if (this.mode !== 'play' && this.mode !== 'sleeping') return false;
    const r = saveToSlot(this.sim, this.slot, suspended);
    if (!r.ok) {
      const msg =
        r.reason === 'quota'
          ? "Your device's storage is full, so today couldn't be saved. Your last save is safe! Try deleting an old farm in the title menu."
          : storageMode() === 'memory'
            ? 'Saving is turned off in this window.'
            : "Today couldn't be saved, but your last save is safe.";
      this.toasts.show(msg, 'ui.book', 6000);
      return false;
    }
    return true;
  }

  private suspend(): void {
    if (this.mode === 'play' && this.sim) this.save(true);
  }

  async goToBed(passedOut: boolean): Promise<void> {
    if (this.busy || this.mode !== 'play') return;
    this.busy = true;
    this.mode = 'sleeping';
    this.sim.paused = true;
    this.modals.closeAll();
    await this.fader.out(passedOut ? 'Zzz... you dozed off.' : 'Sweet dreams...', 700);
    const report = this.sim.sleep(passedOut);
    this.save(false);
    this.enterLocation();
    const close = this.modals.show(
      dayEndView(report, this.sim.state.day, () => {
        close();
      }),
      { bare: true, onClose: () => void this.wakeUp() },
    );
    this.busy = false;
  }

  private async wakeUp(): Promise<void> {
    this.mode = 'play';
    this.sim.paused = false;
    await this.fader.in(700);
  }

  bakePlayer(): void {
    const l = this.sim.p.look;
    this.playerAtlas = new Atlas();
    bakeCharacter(this.playerAtlas, 'player', { ...l, hairStyle: l.hairStyle as Look['hairStyle'] });
    this.playerAtlas.bake();
  }

  enterLocation(): void {
    const loc = this.sim.here;
    this.fx.clear();
    this.view.setLoc(loc, seasonOf(this.sim.state.day));
    this.view.sorted.addChild(this.playerShadow, this.player, this.ctl.tool);
    this.snapCamera();
  }

  locName(): string {
    const id = this.sim.p.loc;
    if (id === 'farm') return `${this.sim.p.farm} Farm`;
    return this.sim.here.def.name;
  }

  screenToWorld(cssX: number, cssY: number): { x: number; y: number } {
    const z = this.host.zoom, dpr = this.host.dpr;
    return { x: (cssX * dpr - this.view.root.x) / z, y: (cssY * dpr - this.view.root.y) / z };
  }

  /** Sound hook (audio system plugs in here). */
  sfx(_id: string): void {}

  /** Fishing rod / bonk stick / slingshot — wired up by later systems. */
  useSpecialTool(_k: ToolKind): void {
    this.toasts.show('You can use this soon!');
  }

  /** Talk to nearby villagers / pet animals (later systems). */
  interactNearby(): void {}

  openChest(_x: number, _y: number): void {}

  inspectObject(_o: WorldObject, _x: number, _y: number): void {}

  // ── Input ────────────────────────────────────────────────
  private onRawAction(a: Action): void {
    if (a === 'menu' && this.modals.open) {
      this.modals.cancelTop();
      this.input.clear();
    }
  }

  selectSlot(i: number): void {
    if (this.mode !== 'play') return;
    const p = this.sim.p;
    p.sel = clamp(i, 0, TUNING.toolbarSize - 1);
    const s = p.inv[p.sel];
    if (s) this.hud.showToolName(s.id);
  }

  openMenu(): void {
    if (this.mode !== 'play' || this.modals.open) return;
    const close = this.modals.show(
      h('div', null,
        h('h2', null, 'Menu'),
        h('div', { class: 'title-menu', style: 'margin:auto' },
          h('button', { class: 'btn gray', onclick: () => { close(); this.openSettings(); } }, 'Settings'),
          h('button', { class: 'btn', onclick: () => { close(); this.quitToTitle(); } }, 'Save & quit to title'),
          h('button', { class: 'btn green', onclick: () => close() }, 'Back to farm'),
        ),
      ),
      { cancel: () => {} },
    );
  }

  openSettings(): void {
    // Full settings panel arrives in phase 12; basic text size + fps now.
    const s = this.settings;
    const close = this.modals.show(
      h('div', null,
        h('h2', null, 'Settings'),
        h('div', { class: 'form-row' }, h('label', null, 'Text size'),
          h('div', { class: 'choice-row' }, ...['Small', 'Normal', 'Large', 'Huge'].map((n, i) => {
            const b = h('button', { class: 'choice' + (s.textSize === i ? ' on' : '') }, n);
            b.addEventListener('click', () => { s.textSize = i; applySettingsToDom(s); saveSettings(s); close(); this.openSettings(); });
            return b;
          }))),
        h('div', { class: 'actions' }, h('button', { class: 'btn green', onclick: () => close() }, 'Done')),
      ),
      { cancel: () => {} },
    );
  }

  private handleActions(): void {
    for (const a of this.input.drain()) {
      if (this.modals.open) continue;
      if (a === 'menu') this.openMenu();
      else if (a.startsWith('slot')) this.selectSlot(parseInt(a.slice(4), 10));
      else if (a === 'interact') this.ctl.interact();
      else if (a === 'use') this.ctl.use(this.input.fromPointer);
      else if (a === 'prevTool') this.selectSlot((this.sim.p.sel + TUNING.toolbarSize - 1) % TUNING.toolbarSize);
      else if (a === 'nextTool') this.selectSlot((this.sim.p.sel + 1) % TUNING.toolbarSize);
    }
  }

  /** Interact with whatever is in front of (or under) the player. */
  interact(): void {
    const sim = this.sim;
    const ft = sim.facingTile();
    const pt = sim.playerTile();
    const trig = sim.here.triggerAt(ft.x, ft.y) ?? sim.here.triggerAt(pt.x, pt.y);
    if (trig) this.runTrigger(trig.action, trig.arg);
  }

  runTrigger(action: string, _arg?: string): void {
    if (action === 'ship') {
      openShipping(this.sim, this.modals, (id) => this.sfx(id));
      return;
    }
    if (action === 'bed') {
      const late = this.sim.state.min >= TUNING.sleepyMin;
      this.modals.ask('Go to bed?', late ? "It's late — a good sleep will restore your energy." : 'Sleeping ends the day and saves your game.', [
        { label: 'Not yet', cls: 'gray' },
        { label: 'Sleep', cls: 'green', primary: true, onClick: () => void this.goToBed(false) },
      ]);
    }
  }

  // ── Loop ─────────────────────────────────────────────────
  private frame(t: number): void {
    const dt = Math.min(0.05, Math.max(0, (t - this.last) / 1000));
    this.last = t;
    this.fpsAcc += dt;
    this.fpsN++;
    if (this.fpsAcc >= 0.5) {
      this.fps = this.fpsN / this.fpsAcc;
      this.fpsAcc = 0;
      this.fpsN = 0;
    }
    if (this.sim) {
      this.update(dt);
      this.render(dt);
    }
    requestAnimationFrame((tt) => this.frame(tt));
  }

  update(dt: number): void {
    const input = this.input;
    input.frame();
    if (this.mode === 'title') {
      input.drain();
      this.titleT += dt;
      return;
    }
    if (this.mode !== 'play') {
      input.drain();
      return;
    }
    this.handleActions();
    this.ctl.update(dt);
    if (!this.modals.open && !this.ctl.locked) {
      const before = this.sim.p.loc;
      this.sim.movePlayer(input.moveX, input.moveY, dt);
      if (this.sim.p.loc !== before) this.enterLocation();
    } else this.sim.moving = false;
    if (this.mode === 'play' && !this.modals.open) this.ctl.updateTarget();
    this.sim.update(dt);
    this.fx.update(dt);
    this.walkT = this.sim.moving ? this.walkT + dt : 0;
    this.hud.update(this.sim, this.locName(), false);
  }

  snapCamera(): void {
    this.cam.x = this.sim.p.x;
    this.cam.y = this.sim.p.y - 8;
    this.clampCamera();
  }

  private clampCamera(): void {
    const loc = this.sim.here;
    const z = this.host.zoom;
    const vw = this.host.width / z, vh = this.host.height / z;
    const mw = loc.w * TILE, mh = loc.h * TILE;
    this.cam.x = mw <= vw ? mw / 2 : clamp(this.cam.x, vw / 2, mw - vw / 2);
    this.cam.y = mh <= vh ? mh / 2 : clamp(this.cam.y, vh / 2, mh - vh / 2);
  }

  render(_dt: number): void {
    const p = this.sim.p;
    const frame = this.ctl?.pose ? 3 : this.sim.moving ? [0, 1, 0, 2][Math.floor(this.walkT * 8) % 4] : 0;
    this.player.texture = this.playerAtlas.tex(`ch.player.${p.dir}.${frame}`);
    this.player.x = Math.round(p.x);
    this.player.y = Math.round(p.y) + 1;
    this.player.zIndex = this.player.y;
    this.playerShadow.x = this.player.x;
    this.playerShadow.y = this.player.y - 1;
    this.playerShadow.zIndex = this.player.y - 2;
    let tx = p.x, ty = p.y - 8;
    if (this.mode === 'title') {
      tx = 30 * TILE + Math.sin(this.titleT * 0.05) * 240;
      ty = 18 * TILE + Math.cos(this.titleT * 0.04) * 80;
    }
    this.cam.x += (tx - this.cam.x) * (this.mode === 'title' ? 0.02 : 0.2);
    this.cam.y += (ty - this.cam.y) * (this.mode === 'title' ? 0.02 : 0.2);
    this.clampCamera();
    const z = this.host.zoom;
    const camX = Math.round(this.cam.x * z) / z, camY = Math.round(this.cam.y * z) / z;
    this.view.root.scale.set(z);
    this.view.root.x = Math.round(this.host.width / 2 - camX * z);
    this.view.root.y = Math.round(this.host.height / 2 - camY * z);
    this.view.view.x = camX - this.host.width / 2 / z;
    this.view.view.y = camY - this.host.height / 2 / z;
    this.view.view.w = this.host.width / z;
    this.view.view.h = this.host.height / z;
    this.view.update();
    if (this.mode === 'play') this.ctl.drawHighlights();
    this.host.app.render();
  }
}
