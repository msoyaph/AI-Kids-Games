import { DIFFICULTIES, starsFor, type Difficulty } from '../data/difficulty';
import { ELEMENT_ORDER, ELEMENTS, counterOf, type ElementId } from '../data/elements';
import type { MapDef } from '../data/maps/types';
import type { WaveDef } from '../data/waves';
import { BUILD_FAIL_MSG, LOSE_LINES, TIPS, WIN_LINES } from '../data/strings';
import { TARGET_MODES, TOWERS, type TowerId } from '../data/towers';
import { elementIconUrl, towerIconUrl, type Atlas } from '../render/atlas/bake';
import { TILE } from '../render/MapPainter';
import { isTouchDevice, type QualityProfile } from '../render/quality';
import { WorldView } from '../render/WorldView';
import { Gestures } from '../input/Gestures';
import type { Tower } from '../sim/entities';
import { Ev, type GameEvent } from '../sim/events';
import { DT, Game, type GameMode } from '../sim/Game';
import { h, img } from '../ui/dom';
import { Hud, type HudHost } from '../ui/Hud';
import { pipSays, showModal, starsHtml, type ModalHandle } from '../ui/modals';
import type { App, Screen } from './App';

export interface GameScreenOpts {
  map: MapDef;
  difficulty: Difficulty;
  mode: GameMode;
  seed?: number;
  waves?: WaveDef[];
  startCoins?: number;
  startCrystals?: number;
  autoWaves?: boolean;
}

export interface GameNav {
  quit(): void;
  restart(): void;
  next?(): void;
  /** Called once when the run ends (for saving progress / achievements). */
  onEnd?(game: Game, won: boolean): { newBest?: boolean; badges?: string[] } | void;
}

/** One run of the game: sim + Pixi view + DOM HUD + input. */
export class GameScreen implements Screen, HudHost {
  readonly el = h('div.screen.game');
  readonly usesCanvas = true;
  readonly game: Game;
  readonly atlas: Atlas;
  readonly touch = isTouchDevice();
  view!: WorldView;
  hud!: Hud;
  buildType: TowerId | null = null;
  selected: Tower | null = null;
  speed: 1 | 2 | 3;
  paused = false;
  private gestures: Gestures | null = null;
  private acc = 0;
  private ghost: { cx: number; cy: number } | null = null;
  private confirmEl: HTMLElement | null = null;
  private modal: ModalHandle | null = null;
  private ended = false;
  private previewPaths: number[][] = [];
  private eventListeners: ((e: GameEvent) => void)[] = [];
  private frameListeners: ((dt: number) => void)[] = [];
  /** Smoothed per-frame costs (ms) for the perf overlay. */
  readonly profile = { simMs: 0, viewMs: 0 };
  private cleanup: (() => void)[] = [];

  constructor(
    private readonly app: App,
    readonly opts: GameScreenOpts,
    private readonly nav: GameNav,
  ) {
    this.atlas = app.atlas;
    this.speed = app.save.data.settings.speed;
    this.game = new Game({
      map: opts.map,
      difficulty: opts.difficulty,
      mode: opts.mode,
      seed: opts.seed ?? (Math.random() * 1e9) >>> 0,
      waves: opts.waves,
      startCoins: opts.startCoins,
      startCrystals: opts.startCrystals,
      autoWaves: opts.autoWaves,
    });
  }

  /** Extra listeners (tutorial, achievements) receive every sim event. */
  onEvent(fn: (e: GameEvent) => void): void {
    this.eventListeners.push(fn);
  }

  /** Called once per rendered frame with real seconds. */
  onFrame(fn: (dt: number) => void): void {
    this.frameListeners.push(fn);
  }

  enter(): void {
    const s = this.app.save.data.settings;
    this.view = new WorldView(this.atlas, this.game, this.app.quality, { shake: s.shake, damageNumbers: s.damageNumbers }, this.app.bakeScale, this.app.stage.maxTextureSize);
    this.app.stage.root.addChild(this.view.world);
    this.hud = new Hud(this);
    this.el.append(this.hud.el);
    this.gestures = new Gestures(this.app.stage.app.canvas, {
      tap: (sx, sy, touch) => this.onTap(sx, sy, touch),
      longPress: (sx, sy) => this.onLongPress(sx, sy),
      hover: (sx, sy) => this.onHover(sx, sy),
      pan: (dx, dy) => this.view.camera.panBy(dx, dy),
      zoom: (f, sx, sy) => this.view.camera.zoomAt(f, sx, sy),
    });
    const onKey = (e: KeyboardEvent): void => this.onKey(e);
    const onBlur = (): void => this.autoPause();
    const onHidden = (): void => {
      if (document.hidden) this.autoPause();
    };
    const onRotate = (): void => this.autoPause();
    addEventListener('keydown', onKey);
    addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onHidden);
    addEventListener('orientationchange', onRotate);
    screen.orientation?.addEventListener?.('change', onRotate);
    this.cleanup.push(() => {
      removeEventListener('keydown', onKey);
      removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onHidden);
      removeEventListener('orientationchange', onRotate);
      screen.orientation?.removeEventListener?.('change', onRotate);
    });
    this.hud.update();
    this.app.achievements.onUnlock = (def) => {
      this.hud.banner('Badge earned', def.name);
      this.app.audio.ui('star');
    };
    // Re-fit the camera whenever HUD chrome changes size (drawer filled, fonts, rotation).
    if (typeof ResizeObserver !== 'undefined') {
      let last = '';
      const ro = new ResizeObserver(() => {
        const ins = this.hud.insets();
        const key = `${ins.top}:${ins.bottom}`;
        if (key !== last) {
          last = key;
          this.layoutChanged();
        }
      });
      for (const el of this.hud.el.querySelectorAll('.hud-top, .drawer')) ro.observe(el);
      this.cleanup.push(() => ro.disconnect());
    }
    this.app.audio.playMusic(this.opts.map.theme);
    // Read-only hook for automated tests (state + where a map cell is on screen).
    const g = this.game;
    (window as unknown as Record<string, unknown>).__vanexTest = {
      state: () => ({ coins: g.coins, lives: g.lives, wave: g.waveNum, towers: g.towers.length, enemies: g.enemies.length, kills: g.stats.kills, state: g.state, crystals: g.crystals, unlocked: [...g.unlocked], paused: this.paused, modal: !!this.modal }),
      cellCenter: (cx: number, cy: number) => {
        const p = this.view.camera.worldToScreen((cx + 0.5) * TILE, (cy + 0.5) * TILE);
        const r = this.app.stage.app.canvas.getBoundingClientRect();
        return { x: r.left + p.x, y: r.top + p.y };
      },
    };
    this.cleanup.push(() => delete (window as unknown as Record<string, unknown>).__vanexTest);
    // the first element crystal is a gift: ask right away
    if (this.game.crystals > 0 && this.opts.mode !== 'tutorial') setTimeout(() => this.openElementPick(true), 350);
    this.maybeRotateHint();
  }

  exit(): void {
    this.app.achievements.onUnlock = () => {};
    for (const c of this.cleanup) c();
    this.gestures?.destroy();
    this.modal?.close();
    this.view.destroy();
    this.app.audio.stopMusic();
  }

  resize(w: number, h: number): void {
    this.hud.layout(w, h);
    requestAnimationFrame(() => {
      const ins = this.hud.insets();
      this.view.layout(w, h, { top: ins.top, bottom: ins.bottom, left: 4, right: 4 }, false);
    });
  }

  layoutChanged(): void {
    this.resize(this.app.stage.width, this.app.stage.height);
  }

  onQualityChange(q: QualityProfile): void {
    this.view.setQuality(q);
  }

  // ============================================================== loop

  frame(dtMs: number): void {
    const dt = Math.min(dtMs / 1000, 0.1);
    const running = !this.paused && !this.modal && this.game.state === 'playing';
    const t0 = performance.now();
    if (running) {
      this.acc += dt * this.speed;
      let steps = 0;
      const maxSteps = 4 * this.speed;
      while (this.acc >= DT && steps < maxSteps) {
        this.game.step();
        this.acc -= DT;
        steps++;
      }
      if (steps >= maxSteps) this.acc = 0; // device can't keep up: drop time rather than spiral
    }
    const t1 = performance.now();
    this.game.events.drain(this.dispatch);
    // effects keep playing after the run ends (victory confetti), but freeze while paused
    const fxDt = running ? dt * this.speed : this.game.state !== 'playing' ? dt : 0;
    this.view.render(this.acc / DT, dt, fxDt);
    const t2 = performance.now();
    this.profile.simMs += (t1 - t0 - this.profile.simMs) * 0.1;
    this.profile.viewMs += (t2 - t1 - this.profile.viewMs) * 0.1;
    this.updateConfirm();
    this.hud.update();
    for (const fn of this.frameListeners) fn(dt);
    if (running) this.app.achievements.tick(dt, this.game, this.opts.mode);
    if (this.game.state !== 'playing' && !this.ended) this.finish();
  }

  private dispatch = (e: GameEvent): void => {
    this.view.handleEvent(e);
    this.app.audio.onGameEvent(e);
    for (const fn of this.eventListeners) fn(e);
    switch (e.type) {
      case Ev.WaveStart: {
        const n = e.value;
        const total = this.game.totalWaves;
        if (e.kind) this.hud.banner('Boss inbound', `Wave ${n}`);
        else if (n === total) this.hud.banner('Final wave', 'Hold the line');
        else if (n === 1) this.hud.banner('Breach detected', 'Wave 1');
        break;
      }
      case Ev.WaveClear:
        if (e.value2 > 0) this.hud.toast(`Wave ${e.id} cleared · +${e.value} bonus · +${e.value2} interest`);
        else this.hud.toast(`Wave ${e.id} cleared · +${e.value} bonus`);
        break;
      case Ev.Crystal:
        this.hud.banner('Element core recovered', 'Choose an element');
        break;
      case Ev.Leak:
        if (this.game.lives > 0 && this.game.lives <= 3) this.hud.toast('Warning: Citadel integrity critical.', true);
        break;
    }
  };

  // ============================================================== input

  private cellAt(sx: number, sy: number): { cx: number; cy: number } {
    const w = this.view.camera.screenToWorld(sx, sy);
    return { cx: Math.floor(w.x / TILE), cy: Math.floor(w.y / TILE) };
  }

  private onTap(sx: number, sy: number, touch: boolean): void {
    if (this.modal || this.game.state !== 'playing') return;
    const { cx, cy } = this.cellAt(sx, sy);
    if (this.buildType) {
      const tower = this.game.towerAt(cx, cy);
      if (tower) {
        this.selectBuild(null);
        this.selectTower(tower);
        return;
      }
      if (touch) {
        if (this.ghost && this.ghost.cx === cx && this.ghost.cy === cy) this.tryBuild(cx, cy);
        else this.showGhost(cx, cy);
      } else this.tryBuild(cx, cy);
      return;
    }
    const t = this.game.towerAt(cx, cy);
    this.selectTower(t && t !== this.selected ? t : null);
  }

  private onHover(sx: number, sy: number): void {
    // A ghost placed by touch waits for ✓/✕: mouse moves (hybrid devices, or the
    // pointer leaving the canvas to press ✓) must not move or clear it.
    if (!this.buildType || this.modal || this.confirmEl) return;
    const { cx, cy } = this.cellAt(sx, sy);
    if (this.ghost && this.ghost.cx === cx && this.ghost.cy === cy) return;
    if (!this.game.grid.inBounds(cx, cy)) {
      this.ghost = null;
      this.view.setGhost(null, 0, 0, false);
      this.view.setPreviewPath(null);
      return;
    }
    this.showGhost(cx, cy, false);
  }

  private onLongPress(sx: number, sy: number): void {
    if (this.modal) return;
    const { cx, cy } = this.cellAt(sx, sy);
    const t = this.game.towerAt(cx, cy);
    if (t) {
      this.showTowerInfo(t.def.id);
      return;
    }
    // nearest creature
    const w = this.view.camera.screenToWorld(sx, sy);
    let best = null;
    let bd = 0.9 * 0.9;
    for (const e of this.game.enemies) {
      const d = (e.x - w.x / TILE) ** 2 + (e.y - w.y / TILE) ** 2;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    if (best) this.showEnemyInfo(best.def.id, best.element, best.shield);
  }

  private showGhost(cx: number, cy: number, withConfirm = true): void {
    if (!this.buildType) return;
    this.ghost = { cx, cy };
    const check = this.game.canBuild(this.buildType, cx, cy);
    const showable = check.ok || check.reason === 'coins' || check.reason === 'path';
    this.view.setGhost(this.buildType, cx, cy, check.ok);
    if (showable && this.game.grid.isBuildable(this.game.grid.idx(cx, cy))) {
      this.view.setPreviewPath(this.game.previewPaths(check.reason === 'path' ? -1 : this.game.grid.idx(cx, cy), this.previewPaths));
    } else this.view.setPreviewPath(null);
    if (withConfirm && this.touch) this.placeConfirm(check.ok);
    if (!check.ok && withConfirm && check.reason) this.hud.toast(BUILD_FAIL_MSG[check.reason], true);
  }

  private placeConfirm(ok: boolean): void {
    this.confirmEl?.remove();
    this.confirmEl = null;
    if (!this.ghost) return;
    const yes = h('button.btn.green', { 'aria-label': 'Build here', disabled: !ok }, '✓');
    const no = h('button.btn.red', { 'aria-label': 'Cancel' }, '✕');
    yes.addEventListener('click', () => this.ghost && this.tryBuild(this.ghost.cx, this.ghost.cy));
    no.addEventListener('click', () => this.clearGhost());
    this.confirmEl = h('div.confirm', null, yes, no);
    this.el.append(this.confirmEl);
    this.updateConfirm();
  }

  private updateConfirm(): void {
    if (!this.confirmEl || !this.ghost) return;
    const p = this.view.camera.worldToScreen((this.ghost.cx + 0.5) * TILE, (this.ghost.cy + 1) * TILE);
    const top = p.y + 8;
    const below = top + 60 < this.app.stage.height - 8;
    const p2 = this.view.camera.worldToScreen((this.ghost.cx + 0.5) * TILE, this.ghost.cy * TILE);
    this.confirmEl.style.left = `${Math.round(p.x)}px`;
    this.confirmEl.style.top = `${Math.round(below ? top : p2.y - 64)}px`;
  }

  private clearGhost(): void {
    this.ghost = null;
    this.confirmEl?.remove();
    this.confirmEl = null;
    this.view.setGhost(null, 0, 0, false);
    this.view.setPreviewPath(null);
  }

  private tryBuild(cx: number, cy: number): void {
    if (!this.buildType) return;
    const check = this.game.canBuild(this.buildType, cx, cy);
    if (!check.ok) {
      this.hud.toast(BUILD_FAIL_MSG[check.reason!], true);
      this.app.audio.ui('deny');
      return;
    }
    const t = this.game.build(this.buildType, cx, cy);
    if (!t) return;
    // Keep building the same tower while you can afford it (fast mazing).
    const cost = TOWERS[this.buildType].levels[0]!.cost;
    if (this.game.coins < cost) this.selectBuild(null);
    else {
      this.clearGhost();
      if (!this.touch) this.showGhost(cx, cy, false);
    }
  }

  // ============================================================== HudHost actions

  selectBuild(t: TowerId | null): void {
    if (t && !this.game.unlocked.length && TOWERS[t].elements.length) return;
    this.buildType = t;
    this.clearGhost();
    if (t) this.selectTower(null);
    this.app.audio.ui('click');
  }

  selectTower(t: Tower | null): void {
    this.selected = t ?? null;
    this.view.select(this.selected);
    if (t) {
      this.buildType = null;
      this.clearGhost();
      this.app.audio.ui('click');
    }
  }

  deselect(): void {
    this.selectTower(null);
  }

  towerScreenX(t: Tower): number {
    return this.view.camera.worldToScreen(t.x * TILE, t.y * TILE).x;
  }

  upgradeSelected(): void {
    const t = this.selected;
    if (!t) return;
    if (this.game.upgrade(t)) {
      this.view.select(t);
      this.hud.refreshPanelButtons();
    } else if (t.level < 4) {
      this.hud.toast(BUILD_FAIL_MSG.coins, true);
      this.app.audio.ui('deny');
    }
  }

  sellSelected(): void {
    const t = this.selected;
    if (!t) return;
    this.game.sell(t);
    this.selectTower(null);
  }

  cycleTargeting(): void {
    const t = this.selected;
    if (!t) return;
    const i = TARGET_MODES.indexOf(t.mode);
    this.game.setTargetMode(t, TARGET_MODES[(i + 1) % TARGET_MODES.length]!);
    this.hud.refreshPanelButtons();
    this.app.audio.ui('click');
  }

  sendWave(): void {
    if (this.game.state !== 'playing') return;
    this.game.sendNextWave();
    this.app.audio.ui('click');
  }

  cycleSpeed(): void {
    this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1;
    this.app.save.data.settings.speed = this.speed;
    this.app.save.save();
  }

  togglePause(): void {
    if (this.modal) return;
    this.openPause();
  }

  private autoPause(): void {
    if (this.ended || this.modal || this.game.state !== 'playing') return;
    if (this.game.waveNum === 0 && !this.game.waveActive) return;
    this.openPause();
  }

  // ============================================================== modals

  private closeModal(): void {
    this.modal?.close();
    this.modal = null;
    this.paused = false;
  }

  openPause(): void {
    this.paused = true;
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)]!;
    this.modal = showModal(
      this.el,
      [
        h('h2', null, 'Paused'),
        h('p', null, tip),
        h(
          'div.row',
          null,
          h('button.btn.green.big', { onClick: () => this.closeModal() }, 'Resume'),
        ),
        h(
          'div.row',
          null,
          h('button.btn', { onClick: () => this.nav.restart() }, 'Restart'),
          h('button.btn.ghost', { onClick: () => this.nav.quit() }, 'Sector map'),
        ),
      ],
      { onBackdrop: () => this.closeModal(), label: 'Paused' },
    );
  }

  openElementPick(first = false): void {
    if (this.modal || this.game.crystals <= 0) return;
    const g = this.game;
    const grid = h('div.el-grid');
    for (const id of ELEMENT_ORDER) {
      const E = ELEMENTS[id];
      const owned = g.unlocked.includes(id);
      const btn = h(
        'button.el-btn',
        {
          disabled: owned,
          style: { background: `linear-gradient(180deg, #${E.light.toString(16).padStart(6, '0')} -40%, #${E.color.toString(16).padStart(6, '0')} 60%)` },
          'aria-label': `${E.name}${owned ? ' (already yours)' : ''}`,
        },
        img(elementIconUrl(this.atlas, id, 88), E.name),
        h('span.en', null, owned ? `${E.name} ✓` : E.name),
        h('span.eb', null, `Strong vs ${ELEMENTS[E.beats].name}`),
      );
      btn.addEventListener('click', () => {
        if (g.chooseElement(id)) {
          this.app.audio.ui('pick');
          this.closeModal();
          this.hud.toast(`${E.name} unlocked! ${E.why}.`);
          if (g.crystals > 0) setTimeout(() => this.openElementPick(), 300);
        }
      });
      grid.append(btn);
    }
    this.paused = true;
    this.modal = showModal(
      this.el,
      [
        pipSays(first ? 'Choose your first element. Each one changes how your towers fight, so pick what this map needs.' : 'Element core recovered. Pick another element to expand your arsenal.'),
        grid,
        h('div.row', null, h('button.btn.ghost', { onClick: () => this.closeModal() }, 'Later')),
      ],
      { label: 'Choose an element' },
    );
  }

  showTowerInfo(id: TowerId): void {
    if (this.modal) return;
    const def = TOWERS[id];
    const st = def.levels[0]!;
    const els = def.elements;
    const strong = els.map((e) => ELEMENTS[ELEMENTS[e].beats].name);
    this.paused = true;
    this.modal = showModal(
      this.el,
      [
        h('div.info-card', null, img(towerIconUrl(id, 4, 144), def.name, 'portrait'), h('div', null, h('h4', null, def.name), h('p', null, def.blurb), h('p', null, `Special: ${def.ability}`), strong.length ? h('p', null, `Strong vs ${strong.join(' & ')} enemies`) : h('p', null, 'No element: equal damage to everything'), h('p', null, def.targets === 'ground' ? 'Ground targets only' : 'Hits ground and air'), h('p', null, `Cost ${st.cost} · Range ${st.range.toFixed(1)}`))),
        h('div.row', null, h('button.btn.green', { onClick: () => this.closeModal() }, 'OK')),
      ],
      { onBackdrop: () => this.closeModal(), label: def.name },
    );
  }

  showEnemyInfo(id: string, el: ElementId | null, shield: ElementId | null): void {
    const def = (this.game.enemies.find((e) => e.def.id === id) ?? this.game.enemies[0])?.def;
    if (!def) return;
    const lines = [h('h4', null, (el ? `${ELEMENTS[el].name} ` : '') + def.name), h('p', null, def.blurb), h('p', null, def.tip)];
    if (el) lines.push(h('p', null, `Weak to ${ELEMENTS[counterOf(el)].name} (${ELEMENTS[counterOf(el)].why}).`));
    if (shield) lines.push(h('p', null, `${ELEMENTS[shield].name} ward: only ${ELEMENTS[counterOf(shield)].name} damage gets through in full.`));
    this.paused = true;
    this.modal = showModal(this.el, [h('div.info-card', null, h('div', null, ...lines)), h('div.row', null, h('button.btn.green', { onClick: () => this.closeModal() }, 'OK'))], {
      onBackdrop: () => this.closeModal(),
      label: def.name,
    });
  }

  private finish(): void {
    this.ended = true;
    this.selectTower(null);
    this.clearGhost();
    const g = this.game;
    const won = g.state === 'won';
    const result = this.nav.onEnd?.(g, won) ?? {};
    const stars = won ? starsFor(g.lives, g.maxLives) : 0;
    setTimeout(() => {
      if (won) {
        const line = WIN_LINES[Math.floor(Math.random() * WIN_LINES.length)]!;
        this.modal = showModal(this.el, [
          h('h2', null, 'Sector secured'),
          starsHtml(stars, 3, true),
          pipSays(line, 'cheeky'),
          h('p', null, `Lives ${g.lives}/${g.maxLives} · ${g.stats.kills} destroyed`),
          result.badges?.length ? h('p', null, `New badge${result.badges.length > 1 ? 's' : ''}: ${result.badges.join(', ')}`) : null,
          h(
            'div.row',
            null,
            this.nav.next ? h('button.btn.green.big', { onClick: () => this.nav.next!() }, 'Next sector') : null,
            h('button.btn', { onClick: () => this.nav.restart() }, 'Replay'),
            h('button.btn.ghost', { onClick: () => this.nav.quit() }, 'Sector map'),
          ),
        ].filter(Boolean) as HTMLElement[]);
        this.app.audio.ui('star');
      } else {
        const endless = this.opts.mode === 'endless';
        const line = endless ? `You held until wave ${g.waveNum}.` : LOSE_LINES[Math.floor(Math.random() * LOSE_LINES.length)]!;
        this.modal = showModal(this.el, [
          h('h2', null, endless ? 'Run complete' : 'Defense breached'),
          pipSays(line),
          endless && result.newBest ? h('p', null, '🏆 New best wave!') : null,
          result.badges?.length ? h('p', null, `New badge${result.badges.length > 1 ? 's' : ''}: ${result.badges.join(', ')}`) : null,
          h('p', null, TIPS[Math.floor(Math.random() * TIPS.length)]!),
          h('div.row', null, h('button.btn.green.big', { onClick: () => this.nav.restart() }, 'Retry'), h('button.btn.ghost', { onClick: () => this.nav.quit() }, 'Sector map')),
        ].filter(Boolean) as HTMLElement[]);
      }
    }, 900);
  }

  private maybeRotateHint(): void {
    const s = this.app.save.data.settings;
    if (s.rotateHintSeen || !this.touch) return;
    if (innerHeight <= innerWidth || innerWidth > 700) return;
    const hint = h('div.rotate-hint.panel', { role: 'status' }, 'Rotate your device for a wider view of the field.', h('button.btn.round.ghost', { 'aria-label': 'Dismiss', onClick: () => hint.remove() }, '✕'));
    this.el.append(hint);
    setTimeout(() => hint.remove(), 6000);
    s.rotateHintSeen = true;
    this.app.save.save();
  }

  // ============================================================== keyboard

  private onKey(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement) return;
    const k = e.key.toLowerCase();
    if (this.modal) {
      if (k === 'escape' || (k === ' ' && this.paused)) {
        e.preventDefault();
        this.closeModal();
      }
      return;
    }
    if (k >= '0' && k <= '9') {
      const n = k === '0' ? 10 : Number(k);
      const id = this.hud.hotkeyTower(n);
      if (id) this.selectBuild(this.buildType === id ? null : id);
      return;
    }
    switch (k) {
      case 'escape':
        if (this.buildType) this.selectBuild(null);
        else if (this.selected) this.selectTower(null);
        else this.openPause();
        break;
      case ' ':
      case 'p':
        e.preventDefault();
        this.openPause();
        break;
      case 'f':
        this.cycleSpeed();
        break;
      case 'n':
      case 'enter':
        this.sendWave();
        break;
      case 'u':
        this.upgradeSelected();
        break;
      case 's':
        this.sellSelected();
        break;
      case 't':
        this.cycleTargeting();
        break;
      case 'e':
        this.openElementPick();
        break;
    }
  }

  back(): boolean {
    return false; // Escape handled in onKey
  }
}

export function difficultyLabel(d: Difficulty): string {
  return DIFFICULTIES[d].label;
}
