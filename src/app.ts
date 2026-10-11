// App controller: screen flow (title -> slots -> creator -> game), main loop, autosave, input routing.
import { Input, type Command } from './input/input';
import { GameView } from './render/view';
import { item } from './data/registry';
import type { Game } from './sim/game';
import { newGameState, DEFAULT_LOOK, type Appearance } from './sim/state';
import { SaveManager, type WriteResult } from './sim/save';
import { createGame } from './sim/systems';
import { cycleTool, equipKind, putAway, TOOL_ORDER } from './sim/tools';
import { DEFAULT_SETTINGS, type Settings } from './settings';
import { h, UIManager, type Panel } from './ui/dom';
import { Hud } from './ui/hud';
import { iconImg } from './ui/icons';
import { InventoryPanel } from './ui/inventory';
import { ReelBar } from './ui/fishing';
import { CreatorScreen } from './ui/screens/creator';
import { controlsPanel, PauseMenu } from './ui/screens/pause';
import { confirmPanel, noticePanel, SlotScreen } from './ui/screens/slots';
import { TitleScreen } from './ui/screens/title';
import { registerPanels } from './ui/register';
import { sharedUniforms } from './render/curve';
import { installStory, pumpInbox, QuestTracker } from './ui/story';
import { installEventsUI } from './ui/events';
import { ReadAloud } from './ui/speech';
import { Governor, guessTier, QUALITY, urlTier, type QualityTier } from './render/quality';
import { RecipeTracker } from './ui/recipeTrack';
import { benchPanel, runBenchmark, type BenchResult } from './ui/bench';
import { questRT } from './sim/quests';
import { Phone } from './ui/phone';
import { settingsBody, settingsPanel } from './ui/settings';
import { runFinale } from './ui/finale';
import { AudioEngine } from './audio/engine';
import { TipManager } from './ui/tips';
import { TouchControls } from './ui/touch';
import { toolRing } from './ui/toolring';
import { phaseOf } from './sim/clock';
import { Ground } from './world/types';
import { tileOf } from './sim/player';
import { ContestHud, LumenPanel } from './ui/journal';
import { BUILD_COSTS, canAfford, startBuildPlacement } from './sim/build';
import { MEDAL_PRIZES, CONTESTS } from './data/challenges';
import { item as itemDef } from './data/registry';
import type { TalkHooks } from './ui/conversation';
import { cancelPlacement, placementRT } from './sim/placement';
import { PlaytestRecorder } from './sim/playtest';
import { SEASON_ICON, SEASON_NAME, SEASON_NEWS } from './sim/seasons';
import type { Season } from './data/types';

const AUTOSAVE_SEC = 60;
const TITLE_SEED = 20261011;

export class App {
  readonly input: Input;
  readonly view: GameView;
  readonly ui: UIManager;
  readonly hud: Hud;
  private reel: ReelBar;
  private tracker: QuestTracker;
  private recipeTrack: RecipeTracker;
  private contestHud: ContestHud;
  private tips: TipManager;
  private touch: TouchControls;
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
  readonly audio = new AudioEngine();
  /** WebGL context lost (glLost) and waiting for a tap to carry on (glPaused) */
  private glLost = false;
  private glPaused = false;
  private glCard = h('div', { class: 'gl-card', role: 'button' });
  /** benchmark: steers the player instead of the controls (see ui/bench.ts) */
  benchDriver: ((dt: number) => { x: number; z: number }) | null = null;
  /** read-aloud (browser speech; silently unavailable where unsupported) */
  readonly speech = new ReadAloud();
  private stepOdo = 0;
  /** story layer hooks into conversations */
  talkHooks: TalkHooks = { intro: async () => false, options: () => [] };
  /** panel factories other modules can open via game.ui.open (panels they push get the key as name) */
  panels: Record<string, (arg?: unknown) => void> = new Proxy({} as Record<string, (arg?: unknown) => void>, {
    set: (t, k, fn: (arg?: unknown) => void) => {
      t[String(k)] = (arg?: unknown) => this.ui.named(String(k), () => fn(arg));
      return true;
    },
  });
  /** on-device playtest log for the current slot (null when playtest mode is off) */
  playtest: PlaytestRecorder | null = null;
  private playtestParam = (() => {
    try {
      return new URLSearchParams(location.search).get('playtest') === '1';
    } catch {
      return false;
    }
  })();
  private ptBadge = h('div', { class: 'pt-badge' }, '● Playtest');

  constructor(readonly canvas: HTMLCanvasElement, private root: HTMLElement) {
    this.settings = this.saves.loadSettings(DEFAULT_SETTINGS);
    this.input = new Input(canvas);
    this.view = new GameView(canvas, (id) => {
      const def = item(id);
      if (id === 'branch') return { shape: 'branch', color: 0xa47a52 };
      if (def.cat === 'shell') return { shape: 'shell', color: def.icon.c };
      if (def.cat === 'fruit') return { shape: 'fruit', color: def.icon.c };
      if (id === 'bottle') return { shape: 'bottle', color: 0x9fd9cf };
      if (id === 'falling_star' || id === 'stardust') return { shape: 'stone', color: id === 'stardust' ? 0xd8c8ff : 0xffe27a };
      if (def.cat === 'material') return { shape: 'stone', color: def.icon.c };
      return { shape: 'bundle', color: def.icon.c };
    });
    this.ui = new UIManager(root);
    this.hud = new Hud(root);
    this.reel = new ReelBar(root);
    this.tracker = new QuestTracker(root);
    this.recipeTrack = new RecipeTracker(root);
    this.contestHud = new ContestHud(root);
    this.tips = new TipManager(this, root);
    this.touch = new TouchControls(this, root);
    document.body.appendChild(this.fadeEl);
    this.applySettings();
    this.setupQuality();
    this.demo = createGame(newGameState(TITLE_SEED, 'Demo'));
    this.demo.state.clock.minute = 17.5 * 60;
    this.demo.mode = 'cutscene';
    this.ui.onChange = () => this.syncMode();
    this.ui.sfx = (n) => this.audio.play(n);
    const unlock = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
    registerPanels(this);
    installStory(this);
    installEventsUI(this);
    this.panels.phone = (start) => this.game && this.ui.push(new Phone(this.ui, this, start as string | undefined));
    this.panels.settings = () => this.ui.push(settingsPanel(this));
    this.panels.settingsInline = (body) => settingsBody(this, body as HTMLElement);
    this.panels.credits = () => this.titleCredits();
    this.panels.lumens = () => this.game && this.ui.push(new LumenPanel(this.ui, this.game));
    this.panels.toolRing = () => this.game && this.ui.push(toolRing(this));
    this.hallHooks.push(() => {
      const g = this.game!;
      const q = g.state.quests;
      const out: { label: string; run: () => void }[] = [];
      const permit = (kind: 'bridge' | 'ramp') => {
        const c = BUILD_COSTS[kind];
        return {
          label: `Build a ${kind} (✦ ${c.glints.toLocaleString()} + ${c.qty} ${itemDef(c.item).name})`,
          run: () => {
            const ok = canAfford(g, kind);
            if (!ok.ok) {
              this.hud.toast(ok.reason ?? '', 'warn');
              return;
            }
            this.ui.closeAll();
            startBuildPlacement(g, kind);
            this.hud.toast(kind === 'bridge' ? 'Stand on a river bank facing the water. E to build, Esc to cancel.' : 'Stand two tiles from a cliff, facing it. E to build, Esc to cancel.');
          },
        };
      };
      if (q.active.m3_bridge || q.done.includes('m3_bridge')) out.push(permit('bridge'));
      if (q.active.m3_ladder || q.done.includes('m3_ladder')) out.push(permit('ramp'));
      return out;
    });
    root.appendChild(this.ptBadge);
    // the graphics can be lost (low memory, a GPU reset): pause, then continue on a tap
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.glLost = true;
      this.glPaused = true;
      this.audio.setVolumes(0, 0, 0);
      this.glCard.textContent = 'Taking a little break… one moment!';
      this.glCard.style.display = 'flex';
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.glLost = false;
      this.view.applyQuality(this.view.quality);
      this.view.interior.invalidate();
      this.glCard.textContent = 'Tap to continue';
    });
    this.glCard.addEventListener('pointerdown', () => {
      if (this.glLost) return;
      this.glPaused = false;
      this.glCard.style.display = 'none';
      this.applySettings();
      this.last = performance.now();
    });
    document.body.appendChild(this.glCard);
    const activity = () => {
      if (this.game) this.game.idleSec = 0;
    };
    window.addEventListener('pointerdown', activity);
    window.addEventListener('wheel', activity, { passive: true });
    window.addEventListener('keydown', activity);
    this.showTitle();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.saveNow(true);
    });
    window.addEventListener('pagehide', () => this.saveNow(true));
    requestAnimationFrame((t) => this.loop(t));
  }

  applySettings(): void {
    this.audio.setVolumes(this.settings.master, this.settings.music, this.settings.sfx);
    this.speech.enabled = this.settings.readAloud;
    if (!this.settings.readAloud) this.speech.stop();
    document.documentElement.style.setProperty('--ts', String(this.settings.textSize || 1));
    this.view.rig.settings = { ...this.settings.camera };
    sharedUniforms.uCurveK.value = 0.0068 * this.settings.curve;
    this.saves.saveSettings(this.settings);
  }

  // ---------------- screen flow ----------------

  get currentSlot(): number {
    return this.slot;
  }

  playtestEnabled(): boolean {
    return this.settings.playtest || this.playtestParam;
  }

  /** Start/stop the playtest recorder to match the setting for the current game. */
  syncPlaytest(): void {
    const want = this.playtestEnabled() && !!this.game && this.slot >= 0;
    if (want && !this.playtest) {
      const key = `playtest.slot${this.slot}`;
      const st = this.saves.storage;
      this.playtest = new PlaytestRecorder({ load: () => st.get(key), save: (d) => void st.put(key, d) });
      this.playtest.attach(this.game!);
    } else if (!want && this.playtest) {
      this.playtest.flush();
      this.playtest.detach();
      this.playtest = null;
    }
    this.ptBadge.style.display = this.playtest ? 'block' : 'none';
  }

  showTitle(): void {
    this.mode = 'title';
    this.ui.closeAll();
    if (this.playtest) {
      this.playtest.flush();
      this.playtest.detach();
      this.playtest = null;
    }
    this.ptBadge.style.display = 'none';
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

  /** extra Lantern Hall services (story/permits add to this) */
  hallExtras(): { label: string; run: () => void }[] {
    return this.hallHooks.flatMap((f) => f());
  }
  hallHooks: (() => { label: string; run: () => void }[])[] = [];

  boardNotes(): string[] {
    const notes = this.boardHooks.flatMap((f) => f());
    return notes.length ? notes : ['Welcome to Driftlight Isle! Lantern Hall is open every day.'];
  }
  boardHooks: (() => string[])[] = [];

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
    g.ui.say = (speaker, lines, done) => {
      questRT(g).inbox.push({ speaker, lines });
      done?.();
    };
    g.bus.on('finale', () => setTimeout(() => runFinale(this), 400));
    g.bus.on('eventFinished', (e) => {
      const name = CONTESTS[e.kind as 'tournament' | 'bugoff'].name;
      const prize = e.medal > 0 ? MEDAL_PRIZES[e.medal - 1] : null;
      this.hud.toast(prize ? `${name} over! ${e.score} points — ${['Bronze', 'Silver', 'Gold'][e.medal - 1]} medal! You won a ${itemDef(prize.trophy).name} and ${prize.lumens} Lumens.` : `${name} over! ${e.score} points — no medal this time. Try again!`, prize ? 'good' : 'warn');
    });
    g.ui.open = (panel, arg) => this.panels[panel]?.(arg);
    g.bus.on('toast', (t) => this.hud.toast(t.text, t.kind, t.item));
    g.bus.on('sfx', (e) => this.audio.play(e.name, { vol: e.vol, pitch: e.pitch }));
    // doors: cut to dark, then fade the new room in
    g.bus.on('location', () => {
      const f = this.fadeEl;
      f.classList.add('cut', 'on');
      void f.offsetWidth;
      f.classList.remove('cut');
      f.classList.add('door');
      setTimeout(() => f.classList.remove('on'), 90);
      setTimeout(() => f.classList.remove('door'), 700);
    });
    g.bus.on('dayStarted', () => this.saveNow(true));
    g.bus.on('seasonChanged', (e) => {
      const season = e.season as Season;
      questRT(g).inbox.push({ speaker: '', title: `${SEASON_ICON[season]} ${SEASON_NAME[season]}`, lines: [] });
      this.hud.toast(SEASON_NEWS[season], 'good');
    });
    g.bus.on('fx', (f) => {
      if (f.kind === 'pop' && f.item) this.floatIcon(f.item, f.x, f.y + 1.6, f.z);
    });
    this.autosaveT = 0;
    this.tips.bind(g);
    if (this.playtest) {
      this.playtest.detach();
      this.playtest = null;
    }
    this.syncPlaytest();
    this.onEnterGame?.(g);
  }

  /** Play a throwaway island for the benchmark (slot -1: nothing is ever saved). */
  enterBench(g: Game, tier: QualityTier): void {
    this.ui.closeAll();
    this.enterGame(g, -1);
    questRT(g).inbox.length = 0;
    this.applyTier(tier);
  }

  private benchRunning = false;

  /** Run the performance test on the given tiers, then show the results. */
  async runBench(tiers: QualityTier[]): Promise<BenchResult[]> {
    if (this.benchRunning) return [];
    this.benchRunning = true;
    if (this.game && this.slot >= 0) this.saveNow(true);
    const results: BenchResult[] = [];
    for (const t of tiers) results.push(await runBenchmark(this, t));
    this.benchRunning = false;
    (window as unknown as { __benchResults?: BenchResult[] }).__benchResults = results;
    this.ui.push(
      benchPanel(this, results, () => {
        this.setupQuality();
        this.showTitle();
      }),
    );
    return results;
  }

  /** Last non-ok save result we already told the player about (so autosaves don't nag). */
  private saveWarned: WriteResult | '' = '';

  saveNow(quiet = false): boolean {
    if (!this.game || this.slot < 0 || this.mode !== 'game') return false;
    const r = this.saves.writeResult(this.slot, this.game.state);
    const ok = r === 'ok';
    if (ok) {
      this.saveWarned = '';
      if (!quiet) this.hud.toast('Game saved.', 'good');
    } else if (r === 'quota') {
      if (!quiet || this.saveWarned !== r)
        noticePanel(
          this.ui,
          'Storage is full',
          'There is no room to save right now. Your last save is safe! Ask a grown-up to clear some space for this site, then save again.',
        );
    } else if (!quiet || this.saveWarned !== r) {
      this.hud.toast(r === 'memory' ? 'Saving is unavailable here — progress will be lost when the page closes.' : 'Could not save just now. Your last save is safe.', 'warn');
    }
    if (!ok) this.saveWarned = r;
    // after the real save: quota recovery may have dropped the old playtest log
    this.playtest?.flush();
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

  tip(id: string): void {
    if (this.game) this.tips.trigger(this.game, id);
  }

  titleCredits(): void {
    const p: Panel = {
      modal: true,
      el: h(
        'div',
        { class: 'screen', style: 'z-index:9' },
        h('div', { class: 'dim' }),
        h(
          'div',
          { class: 'panel center', style: 'padding:24px;width:min(480px,92vw);text-align:center' },
          h('h2', { style: 'justify-content:center' }, 'Light Crossing'),
          h('p', null, 'A cozy island life-sim. Every model, texture, icon and melody is generated in code at runtime.'),
          h('p', { class: 'muted' }, 'Built with three.js, the Web Audio API and TypeScript.'),
          h('p', { class: 'muted tiny' }, 'Inspired by the gentle joys of slow island living.'),
          h('button', { class: 'btn primary', 'data-nav': '', onclick: () => this.ui.pop(p) }, 'Close'),
        ),
      ),
    };
    this.ui.push(p);
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
    if (placementRT(g) && (c === 'pause' || c === 'back' || c === 'cancel')) {
      cancelPlacement(g);
      this.hud.toast('Placement cancelled.');
      return;
    }
    switch (c) {
      case 'action':
        g.act();
        break;
      case 'inventory':
        this.tip('inventory');
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

  /** Advance the game synchronously (testing / hidden tabs where rAF is paused). */
  debugStep(frames: number, dt = 1 / 60): void {
    for (let k = 0; k < frames; k++) this.tick(dt, k === frames - 1);
  }

  /** graphics tier in use (Auto moves it with the governor) */
  tier: QualityTier = 'medium';
  private governor = new Governor('medium');
  private forcedTier = urlTier();

  /** Pick the starting tier from the setting (or ?quality=), and apply it. */
  setupQuality(): void {
    const q = this.settings.quality ?? 'auto';
    const start = this.forcedTier ?? (q === 'auto' ? guessTier() : q);
    this.governor = new Governor(start);
    this.applyTier(start);
  }

  applyTier(t: QualityTier): void {
    this.tier = t;
    const spec = { ...QUALITY[t] };
    // older settings could turn shadows off on their own
    if (this.settings.shadows === false) spec.shadows = false;
    this.view.applyQuality(spec);
  }

  private loop(now: number): void {
    const raw = (now - this.last) / 1000;
    const dt = Math.min(0.05, raw);
    this.last = now;
    // Auto quality: step tiers down when frames stay slow, back up when they stay fast
    if ((this.settings.quality ?? 'auto') === 'auto' && !this.forcedTier && !this.benchDriver) {
      const t = this.governor.sample(raw);
      if (t) this.applyTier(t);
    }
    this.tick(dt, true);
    requestAnimationFrame((t) => this.loop(t));
  }

  private tick(dt: number, render: boolean): void {
    if (this.glPaused) return;
    const f = this.input.poll(dt);
    this.hud.device = this.input.lastDevice;
    const g = this.game;
    if (g && (f.commands.length || Math.abs(f.moveX) + Math.abs(f.moveZ) > 0.05)) g.idleSec = 0;
    if (this.ui.top) this.ui.handle(f.commands);
    else if (g && this.mode === 'game') for (const c of f.commands) this.gameplayCommand(g, c);
    this.ui.update(dt);
    if (g && this.mode === 'game') {
      const free = !this.ui.modalOpen;
      const drive = this.benchDriver?.(dt);
      if (drive) {
        g.idleSec = 0;
        g.update(dt, { move: { x: drive.x, z: drive.z, run: false }, actionHeld: false });
      } else g.update(dt, free ? { move: { x: f.moveX, z: f.moveZ, run: f.run }, actionHeld: f.actionHeld } : null);
      this.playtest?.tick(dt, this.ui.topName);
      this.autosaveT += dt;
      if (this.autosaveT > (g.state.events.active ? 15 : AUTOSAVE_SEC)) {
        this.autosaveT = 0;
        this.saveNow(true);
      }
      this.hud.update(g);
      this.reel.update(g);
      this.tracker.update(this);
      this.recipeTrack.update(this);
      this.contestHud.update(g);
      this.tips.update(dt, g);
      pumpInbox(this);
    } else {
      this.demo.update(dt, null);
    }
    if (render) this.view.frame(dt);
    this.touch.update();
    this.updateAudio(dt);
  }

  private updateAudio(dt: number): void {
    const a = this.audio;
    a.update();
    const g = this.game;
    if (!g || this.mode !== 'game') {
      a.setMood('title');
      a.setAmbience(false, 0.6, 0.2, this.view.time);
      return;
    }
    const s = g.state;
    const night = this.view.sky.night;
    if (this.view.festival.active) a.setMood('festival');
    else if (s.player.location !== 'island') a.setMood('indoor');
    else if (s.weather.today === 'rain') a.setMood('rain');
    else a.setMood(phaseOf(s.clock.minute) === 'night' ? 'night' : phaseOf(s.clock.minute));
    const tile = tileOf(g.world, s.player.x, s.player.z);
    const seaNear = s.player.location === 'island' ? Math.max(0, 1 - g.world.gen.oceanDist[tile]! / 9) : 0;
    a.setAmbience(s.weather.today === 'rain' && s.player.location === 'island', seaNear, night, this.view.time);
    // footsteps + dust
    const odo = g.motion.odometer;
    const stride = g.motion.running ? 1.1 : 0.85;
    if (s.player.location === 'island' && odo - this.stepOdo > stride) {
      this.stepOdo = odo;
      const gr = g.world.ground(tile);
      const st = g.world.structure(tile);
      a.play(st && (st.type === 'bridge' || st.type === 'dock') ? 'stepWood' : gr === Ground.Sand ? 'stepSand' : 'step', { pitch: 0.9 + Math.random() * 0.2 });
      if (g.motion.running || gr === Ground.Sand || gr === Ground.Dirt)
        g.emit('fx', { kind: 'dust', x: s.player.x, y: g.world.surfaceY(s.player.x, s.player.z), z: s.player.z, color: gr === Ground.Sand ? 0xf3e2b6 : gr === Ground.Dirt ? 0xd9bf98 : 0xd8e8c8 });
    } else if (odo < this.stepOdo) this.stepOdo = odo;
    void dt;
  }
}
