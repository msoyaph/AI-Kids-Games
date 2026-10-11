// App controller: screen flow (title -> slots -> creator -> game), main loop, autosave, input routing.
import { Input, type Command } from './input/input';
import { GameView } from './render/view';
import { item } from './data/registry';
import type { Game } from './sim/game';
import { newGameState, DEFAULT_LOOK, type Appearance } from './sim/state';
import { SaveManager } from './sim/save';
import { createGame } from './sim/systems';
import { cycleTool, equipKind, putAway, TOOL_ORDER } from './sim/tools';
import { DEFAULT_SETTINGS, type Settings } from './settings';
import { h, UIManager, type Panel } from './ui/dom';
import { Hud } from './ui/hud';
import { iconImg } from './ui/icons';
import { InventoryPanel } from './ui/inventory';
import { CreatorScreen } from './ui/screens/creator';
import { controlsPanel, PauseMenu } from './ui/screens/pause';
import { confirmPanel, SlotScreen } from './ui/screens/slots';
import { TitleScreen } from './ui/screens/title';

const AUTOSAVE_SEC = 60;
const TITLE_SEED = 20261011;

export class App {
  readonly input: Input;
  readonly view: GameView;
  readonly ui: UIManager;
  readonly hud: Hud;
  readonly saves = new SaveManager();
  settings: Settings;
  game: Game | null = null;
  /** the island shown behind title / creator */
  private demo: Game;
  private slot = -1;
  private mode: 'title' | 'game' = 'title';
  private autosaveT = 0;
  private fadeEl = h('div', { class: 'fade' });
  private last = performance.now();
  /** panel factories other modules can open via game.ui.open */
  panels: Record<string, (arg?: unknown) => void> = {};

  constructor(canvas: HTMLCanvasElement, private root: HTMLElement) {
    this.settings = this.saves.loadSettings(DEFAULT_SETTINGS);
    this.input = new Input(canvas);
    this.view = new GameView(canvas, (id) => {
      const def = item(id);
      if (id === 'branch') return { shape: 'branch', color: 0xa47a52 };
      if (def.cat === 'shell') return { shape: 'shell', color: def.icon.c };
      if (def.cat === 'fruit') return { shape: 'fruit', color: def.icon.c };
      if (id === 'bottle') return { shape: 'bottle', color: 0x9fd9cf };
      if (def.cat === 'material') return { shape: 'stone', color: def.icon.c };
      return { shape: 'bundle', color: def.icon.c };
    });
    this.ui = new UIManager(root);
    this.hud = new Hud(root);
    document.body.appendChild(this.fadeEl);
    this.applySettings();
    this.demo = createGame(newGameState(TITLE_SEED, 'Demo'));
    this.demo.state.clock.minute = 17.5 * 60;
    this.demo.mode = 'cutscene';
    this.ui.onChange = () => this.syncMode();
    this.showTitle();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.saveNow(true);
    });
    window.addEventListener('pagehide', () => this.saveNow(true));
    requestAnimationFrame((t) => this.loop(t));
  }

  applySettings(): void {
    this.view.rig.settings = { ...this.settings.camera };
    this.view.sky.setShadows(this.settings.shadows);
    this.view.renderer.shadowMap.enabled = this.settings.shadows;
    this.saves.saveSettings(this.settings);
  }

  // ---------------- screen flow ----------------

  showTitle(): void {
    this.mode = 'title';
    this.ui.closeAll();
    this.game = null;
    this.hud.setVisible(false);
    this.view.attach(this.demo);
    this.view.preview = 'title';
    const hasSaves = this.saves.list().some(Boolean);
    this.ui.push(
      new TitleScreen(this.ui, {
        hasSaves,
        onStart: () => this.showSlots(),
        onSettings: () => this.panels.settings?.(),
        onCredits: () => this.panels.credits?.(),
      }),
    );
  }

  showSlots(): void {
    const p: Panel = new SlotScreen(this.ui, this.saves, {
      onLoad: (slot) => this.loadSlot(slot),
      onNew: (slot) => this.showCreator(slot),
      onBack: () => this.ui.pop(p),
    });
    this.ui.push(p);
  }

  showCreator(slot: number): void {
    const look: Appearance = { ...DEFAULT_LOOK };
    this.demo.state.player.look = { ...look };
    const dock = this.demo.world.gen.spawn;
    this.demo.state.player.x = dock.x;
    this.demo.state.player.z = dock.z - 1.2;
    this.demo.state.player.facing = 0;
    this.view.rebuildPlayer();
    this.view.preview = 'creator';
    const c: Panel = new CreatorScreen(this.ui, this.input, look, {
      onChange: (l) => {
        this.demo.state.player.look = { ...l };
        this.view.rebuildPlayer();
      },
      onBack: () => {
        this.ui.pop(c);
        this.view.preview = 'title';
      },
      onDone: (name, l, seed) => this.startNewGame(slot, name, l, seed),
    });
    this.ui.push(c);
  }

  async fade(mid: () => void): Promise<void> {
    this.fadeEl.classList.add('on');
    await new Promise((r) => setTimeout(r, 650));
    mid();
    await new Promise((r) => setTimeout(r, 120));
    this.fadeEl.classList.remove('on');
  }

  startNewGame(slot: number, name: string, look: Appearance, seed: number): void {
    void this.fade(() => {
      const st = newGameState(seed, name, look);
      this.enterGame(createGame(st), slot);
      this.saveNow(true);
      this.onNewGame?.(this.game!);
    });
  }

  loadSlot(slot: number): void {
    const res = this.saves.read(slot);
    if (!res.ok) {
      confirmPanel(this.ui, `That save couldn't be loaded (${res.error}). Start over in this slot?`, () => this.showCreator(slot), undefined, ['New game', 'Cancel']);
      return;
    }
    void this.fade(() => this.enterGame(createGame(res.state), slot));
  }

  /** hook for the story layer (set by main.ts) */
  onNewGame?: (g: Game) => void;
  onEnterGame?: (g: Game) => void;

  enterGame(g: Game, slot: number): void {
    this.ui.closeAll();
    this.game = g;
    this.slot = slot;
    this.mode = 'game';
    this.view.preview = null;
    this.view.attach(g);
    this.hud.setVisible(true);
    g.ui.confirm = (text, yes, no) => confirmPanel(this.ui, text, yes, no);
    g.ui.open = (panel, arg) => this.panels[panel]?.(arg);
    g.bus.on('toast', (t) => this.hud.toast(t.text, t.kind, t.item));
    g.bus.on('dayStarted', () => this.saveNow(true));
    g.bus.on('fx', (f) => {
      if (f.kind === 'pop' && f.item) this.floatIcon(f.item, f.x, f.y + 1.6, f.z);
    });
    this.autosaveT = 0;
    this.onEnterGame?.(g);
  }

  saveNow(quiet = false): boolean {
    if (!this.game || this.slot < 0 || this.mode !== 'game') return false;
    const ok = this.saves.write(this.slot, this.game.state);
    if (!quiet) this.hud.toast(ok ? 'Game saved.' : 'Saving is unavailable here — progress will be lost when the page closes.', ok ? 'good' : 'warn');
    this.hud.saving.classList.add('on');
    setTimeout(() => this.hud.saving.classList.remove('on'), 900);
    return ok;
  }

  quitToTitle(): void {
    this.saveNow(true);
    void this.fade(() => this.showTitle());
  }

  openPause(): void {
    this.ui.push(
      new PauseMenu(this.ui, {
        onSave: () => this.saveNow(),
        onSettings: () => this.panels.settings?.(),
        onControls: () => this.ui.push(controlsPanel(this.ui)),
        onQuit: () => this.quitToTitle(),
      }),
    );
  }

  /** Floating "+item" icon rising from a world point. */
  floatIcon(id: string, x: number, y: number, z: number): void {
    const p = this.view.project(x, y, z);
    if (!p.visible) return;
    const el = h('div', { class: 'floaty', style: `left:${p.x}px;top:${p.y}px` }, iconImg(id, 'icon'));
    this.root.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  // ---------------- loop ----------------

  private syncMode(): void {
    const g = this.game;
    if (!g) return;
    if (this.ui.modalOpen) {
      if (g.mode === 'play') g.mode = 'menu';
    } else if (g.mode === 'menu') g.mode = 'play';
  }

  private gameplayCommand(g: Game, c: Command): void {
    switch (c) {
      case 'action':
        g.act();
        break;
      case 'inventory':
        this.ui.push(new InventoryPanel(this.ui, g));
        break;
      case 'pause':
        this.openPause();
        break;
      case 'phone':
        this.panels.phone?.();
        break;
      case 'map':
        this.panels.phone?.('map');
        break;
      case 'toolRing':
        this.panels.toolRing?.();
        break;
      case 'toolNext':
        cycleTool(g, 1);
        break;
      case 'toolPrev':
        cycleTool(g, -1);
        break;
      case 'putAway':
        putAway(g);
        break;
      default:
        if (c.startsWith('tool') && c.length === 5) {
          const kind = TOOL_ORDER[Number(c[4]) - 1];
          if (kind && !equipKind(g, kind)) g.toast(`You don't have that tool yet.`, 'warn');
        }
    }
  }

  private loop(now: number): void {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const f = this.input.poll(dt);
    this.hud.device = this.input.lastDevice;
    const g = this.game;
    if (this.ui.top) this.ui.handle(f.commands);
    else if (g && this.mode === 'game') for (const c of f.commands) this.gameplayCommand(g, c);
    this.ui.update(dt);
    if (g && this.mode === 'game') {
      const free = !this.ui.modalOpen;
      g.update(dt, free ? { move: { x: f.moveX, z: f.moveZ, run: f.run }, actionHeld: f.actionHeld } : null);
      this.autosaveT += dt;
      if (this.autosaveT > AUTOSAVE_SEC) {
        this.autosaveT = 0;
        this.saveNow(true);
      }
      this.hud.update(g);
    } else {
      this.demo.update(dt, null);
    }
    this.view.frame(dt);
    requestAnimationFrame((t) => this.loop(t));
  }
}
