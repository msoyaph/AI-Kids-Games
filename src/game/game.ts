/** Game client: owns sim, renderer, input and UI; runs the main loop and mode flow. */
import { Container, Sprite } from 'pixi.js';
import { TILE, clamp } from '../core/math';
import { storageMode, usage } from '../core/storage';
import type { ToolKind } from '../data/items';
import { SHOPS } from '../data/shops';
import { Input, type Action } from '../input/input';
import { Atlas } from '../render/atlas';
import { bakeAll, bakeCharacter } from '../render/art';
import type { Look } from '../render/art/characters';
import { bakeIcons } from '../render/art/icons';
import { Fx } from '../render/fx';
import { createRenderer, type RenderHost } from '../render/renderer';
import { WorldView } from '../render/world-view';
import { Sim } from '../sim';
import type { NewGameOptions } from '../sim/newgame';
import { loadSlot, saveToSlot, slotBytes } from '../sim/save';
import { shopOpen } from '../sim/shops';
import { seasonOf } from '../sim/state';
import type { WorldObject } from '../sim/types';
import { TUNING } from '../tuning';
import { openChestUI, openLostAndFound } from '../ui/chest';
import { dayEndView } from '../ui/dayend';
import { h } from '../ui/dom';
import { Hud } from '../ui/hud';
import { initIcons } from '../ui/icons';
import { INV_CSS } from '../ui/inventory';
import { iconName, itemName } from '../ui/itemview';
import { MENU_CSS, openMenu, registerTab, type MenuHost } from '../ui/menu';
import { settingsPanel } from '../ui/settings';
import { openShipping } from '../ui/ship';
import { openShop } from '../ui/shop';
import { CSS } from '../ui/style';
import { TitleScreen } from '../ui/title';
import { Fader, Modals, Toasts } from '../ui/widgets';
import { Controller } from './controller';
import { applySettingsToDom, loadSettings, saveSettings, type Settings } from './settings';

export interface GameOptions {
  bench: boolean;
  playtest: boolean;
  lowq: boolean;
  seed?: number;
}

export type Mode = 'boot' | 'title' | 'play' | 'sleeping';

/** Hooks later systems plug into without editing the core loop. */
export interface GameHooks {
  trigger: Record<string, (g: Game, arg?: string) => void>;
  onEnter: ((g: Game) => void)[];
  onUpdate: ((g: Game, dt: number) => void)[];
  onRender: ((g: Game, dt: number) => void)[];
  onAttach: ((g: Game) => void)[];
  interactNearby: ((g: Game) => boolean)[];
  special: Partial<Record<ToolKind, (g: Game) => void>>;
  inspect: ((g: Game, o: WorldObject, x: number, y: number) => boolean)[];
}

export const HOOKS: GameHooks = { trigger: {}, onEnter: [], onUpdate: [], onRender: [], onAttach: [], interactNearby: [], special: {}, inspect: [] };

export class Game implements MenuHost {
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
  fx = new Fx();
  ctl!: Controller;
  fps = 60;
  // UI
  uiRoot!: HTMLElement;
  hud!: Hud;
  toasts!: Toasts;
  modals!: Modals;
  fader!: Fader;
  title!: TitleScreen;
  /** seconds of real time since the scene began (animations) */
  time = 0;
  private last = 0;
  private walkT = 0;
  private fpsAcc = 0;
  private fpsN = 0;
  private titleT = 0;
  private busy = false;
  private unsub: (() => void)[] = [];

  constructor(opts: GameOptions) {
    this.opts = opts;
    this.settings = loadSettings();
  }

  // ── Boot ─────────────────────────────────────────────────
  async init(parent: HTMLElement): Promise<void> {
    this.host = await createRenderer(parent, this.opts.lowq || this.settings.quality === 'low');
    this.host.zoomBias = this.settings.zoom;
    this.host.resize();
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
    style.textContent = CSS + INV_CSS + MENU_CSS;
    document.head.appendChild(style);
    initIcons(this.atlas);
    applySettingsToDom(this.settings);
    this.fx.reduced = this.settings.reducedMotion;
    this.uiRoot = document.getElementById('ui')!;
    this.hud = new Hud(this.uiRoot);
    this.hud.onSlot = (i) => this.selectSlot(i);
    this.hud.onMenu = () => this.openMenu();
    this.toasts = new Toasts(this.uiRoot);
    this.modals = new Modals(this.uiRoot);
    this.modals.onChange = (open) => {
      if (this.sim) this.sim.paused = open || this.mode !== 'play';
      this.input.clear();
      this.input.holdUse = false;
    };
    this.fader = new Fader(this.uiRoot);
    this.title = new TitleScreen(this.uiRoot, this.modals, {
      onLoad: (slot) => this.loadGame(slot),
      onNew: (slot, o) => this.newGame(slot, o),
      onSettings: () => this.openSettings(),
      onBench: () => this.testPerformance(),
    });
    registerTab({ id: 'settings', label: 'Settings', icon: 'ui.gear', render: (host) => host.settingsPanel(() => {}) });
    this.hud.show(false);
  }

  // ── Modes ────────────────────────────────────────────────
  showTitle(): void {
    this.mode = 'title';
    this.hud.show(false);
    this.title.show(true);
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
      ev.on('sound', (e) => this.sfx(e.id)),
      ev.on('anim', (e) => {
        if (e.kind === 'shake') {
          const s = this.view.spriteAt(this.sim.here, e.x, e.y);
          if (s) this.fx.shake(s);
        }
      }),
    );
    for (const f of HOOKS.onAttach) f(this);
  }

  newGame(slot: number, o: NewGameOptions): void {
    this.slot = slot;
    this.attachSim(Sim.newGame(o));
    this.beginPlay();
    this.save(false);
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
    this.modals.closeAll();
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
      dayEndView(report, this.sim.state.day, () => close()),
      { bare: true, onClose: () => void this.wakeUp() },
    );
    this.busy = false;
  }

  private async wakeUp(): Promise<void> {
    this.mode = 'play';
    this.sim.paused = false;
    await this.fader.in(700);
    this.afterWake();
  }

  /** Morning events (mail, cutscenes) plug in here. */
  afterWake(): void {
    for (const f of HOOKS.onEnter) f(this);
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
    if (this.mode === 'play') for (const f of HOOKS.onEnter) f(this);
  }

  locName(): string {
    const id = this.sim.p.loc;
    if (id === 'farm') return `${this.sim.p.farm} Farm`;
    if (id === 'farmhouse') return `${this.sim.p.name}'s House`;
    return this.sim.here.def.name;
  }

  screenToWorld(cssX: number, cssY: number): { x: number; y: number } {
    const z = this.host.zoom, dpr = this.host.dpr;
    return { x: (cssX * dpr - this.view.root.x) / z, y: (cssY * dpr - this.view.root.y) / z };
  }

  /** Sound hook (the audio system replaces this). */
  sfx(_id: string): void {}

  useSpecialTool(k: ToolKind): void {
    const f = HOOKS.special[k];
    if (f) f(this);
    else this.toasts.show('Nothing to do with that here.');
  }

  /** Talk to villagers / pet animals nearby. */
  interactNearby(): void {
    for (const f of HOOKS.interactNearby) if (f(this)) return;
  }

  openChest(x: number, y: number): void {
    const o = this.sim.here.obj(x, y);
    if (!o) return;
    this.sfx('open');
    openChestUI(this.sim, o, this.modals, (id) => this.sfx(id), () => this.sim.here.touch(x, y));
  }

  inspectObject(o: WorldObject, x: number, y: number): void {
    for (const f of HOOKS.inspect) if (f(this, o, x, y)) return;
  }

  // ── Menus & triggers ─────────────────────────────────────
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
    if (s) this.hud.showToolName(itemName(s.id, p.tools));
    this.sfx('tick');
  }

  openMenu(tab = 'bag'): void {
    if (this.mode !== 'play' || this.modals.open) return;
    this.sfx('open');
    openMenu(this, tab);
  }

  settingsPanel(onChange: () => void): HTMLElement {
    return settingsPanel(this.settings, {
      apply: (s) => {
        applySettingsToDom(s);
        this.fx.reduced = s.reducedMotion;
        if (this.host.zoomBias !== s.zoom) {
          this.host.zoomBias = s.zoom;
          this.host.resize();
          this.snapCamera();
        }
        this.applyAudioSettings();
        onChange();
      },
      save: (s) => saveSettings(s),
      testPerformance: () => this.testPerformance(),
      speechAvailable: typeof window !== 'undefined' && 'speechSynthesis' in window,
      inGame: this.mode === 'play',
      quit: () => this.quitToTitle(),
      storageInfo: () => {
        const total = usage().reduce((t, u) => t + u.bytes, 0);
        return storageMode() === 'memory'
          ? 'Saving is off in this window (your browser blocked storage).'
          : `Saves use ${(total / 1024).toFixed(0)} KB${this.mode === 'play' ? ` (this farm: ${(slotBytes(this.slot) / 1024).toFixed(0)} KB)` : ''}.`;
      },
    });
  }

  /** Audio system replaces this. */
  applyAudioSettings(): void {}

  /** Benchmark system replaces this. */
  testPerformance(): void {
    this.toasts.show('Performance test is getting ready...');
  }

  openSettings(): void {
    let close = () => {};
    close = this.modals.show(h('div', { style: 'width:min(92vw,460px)' }, h('h2', null, 'Settings'), this.settingsPanel(() => {}), h('div', { class: 'actions' }, h('button', { class: 'btn green', onclick: () => close() }, 'Done'))), { cancel: () => {} });
  }

  runTrigger(action: string, arg?: string): void {
    const hook = HOOKS.trigger[action];
    if (hook) {
      hook(this, arg);
      return;
    }
    switch (action) {
      case 'ship':
        openShipping(this.sim, this.modals, (id) => this.sfx(id));
        return;
      case 'lostfound':
        openLostAndFound(this.sim, this.modals, (id) => this.sfx(id));
        return;
      case 'shop': {
        if (!arg) return;
        const r = shopOpen(this.sim, arg);
        if (!r.open) {
          this.toasts.show(r.reason ?? 'Closed!');
          return;
        }
        if (!this.shopKeeperHere(arg)) {
          this.toasts.show(`${SHOPS[arg].name}: nobody is at the counter right now.`);
          return;
        }
        openShop(this.sim, arg, this.modals, (id) => this.sfx(id), (t) => this.toasts.show(t));
        return;
      }
      case 'bed': {
        const late = this.sim.state.min >= TUNING.sleepyMin;
        this.modals.ask('Go to bed?', late ? "It's late — a good sleep will restore your energy." : 'Sleeping ends the day and saves your game.', [
          { label: 'Not yet', cls: 'gray' },
          { label: 'Sleep', cls: 'green', primary: true, onClick: () => void this.goToBed(false) },
        ]);
        return;
      }
    }
  }

  /** Villager system replaces this to require the keeper at the counter. */
  shopKeeperHere(_shop: string): boolean {
    return true;
  }

  private handleActions(): void {
    for (const a of this.input.drain()) {
      if (this.modals.open) continue;
      if (a === 'menu') this.openMenu();
      else if (a === 'inventory') this.openMenu('bag');
      else if (a === 'map') this.openMenu('map');
      else if (a === 'journal') this.openMenu('quests');
      else if (a.startsWith('slot')) this.selectSlot(parseInt(a.slice(4), 10));
      else if (a === 'interact') this.ctl.interact();
      else if (a === 'use') this.ctl.use(this.input.fromPointer);
      else if (a === 'prevTool') this.selectSlot((this.sim.p.sel + TUNING.toolbarSize - 1) % TUNING.toolbarSize);
      else if (a === 'nextTool') this.selectSlot((this.sim.p.sel + 1) % TUNING.toolbarSize);
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
    this.time += dt;
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
    if (!this.modals.open && !this.ctl.locked && !this.inputBlocked) {
      const before = this.sim.p.loc;
      this.sim.movePlayer(input.moveX, input.moveY, dt);
      if (this.sim.p.loc !== before) this.enterLocation();
    } else this.sim.moving = false;
    if (!this.modals.open) this.ctl.updateTarget();
    this.sim.update(dt);
    for (const f of HOOKS.onUpdate) f(this, dt);
    this.fx.update(dt);
    this.walkT = this.sim.moving ? this.walkT + dt : 0;
    this.hud.update(this.sim, this.locName(), this.sim.p.loc === 'mine');
  }

  /** Set by cutscenes/minigames to stop walking. */
  inputBlocked = false;

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

  /** Optional camera override (cutscenes / title). */
  camTarget: { x: number; y: number } | null = null;

  render(dt: number): void {
    const p = this.sim.p;
    const frame = this.ctl.pose ? 3 : this.sim.moving ? [0, 1, 0, 2][Math.floor(this.walkT * 8) % 4] : 0;
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
    } else if (this.camTarget) {
      tx = this.camTarget.x;
      ty = this.camTarget.y;
    }
    const follow = this.mode === 'title' ? 0.02 : this.camTarget ? 0.06 : 0.2;
    this.cam.x += (tx - this.cam.x) * follow;
    this.cam.y += (ty - this.cam.y) * follow;
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
    for (const f of HOOKS.onRender) f(this, dt);
    this.view.update();
    if (this.mode === 'play') this.ctl.drawHighlights();
    this.host.app.render();
  }
}
