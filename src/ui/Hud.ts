import { ELEMENT_ORDER, ELEMENTS, type ElementId } from '../data/elements';
import { ENEMIES } from '../data/enemies';
import { BASIC_TOWERS, comboFor, ELEMENT_TOWERS, MAX_LEVEL, sellValue, TARGET_MODE_LABEL, TOWERS, type TowerId } from '../data/towers';
import { wavePreview } from '../data/waves';
import { atlasIconUrl, elementIconUrl, enemyTexName, towerIconUrl, type Atlas } from '../render/atlas/bake';
import type { Tower } from '../sim/entities';
import type { Game } from '../sim/Game';
import { h, img, setText } from './dom';

export interface HudHost {
  readonly game: Game;
  readonly atlas: Atlas;
  readonly buildType: TowerId | null;
  readonly selected: Tower | null;
  readonly speed: number;
  readonly paused: boolean;
  readonly touch: boolean;
  selectBuild(t: TowerId | null): void;
  sendWave(): void;
  cycleSpeed(): void;
  togglePause(): void;
  openElementPick(): void;
  upgradeSelected(): void;
  sellSelected(): void;
  cycleTargeting(): void;
  deselect(): void;
  showTowerInfo(id: TowerId): void;
  layoutChanged(): void;
}

interface CardRef {
  el: HTMLButtonElement;
  cost: number;
  id: TowerId | null;
  el2?: ElementId;
}

/** DOM heads-up display. Updates are diffed so per-frame calls are cheap. */
export class Hud {
  readonly el = h('div.hud');
  private livesStat: HTMLElement;
  private livesNum = h('span');
  private coinsStat: HTMLElement;
  private coinsNum = h('span');
  private waveNum = h('span');
  private nextWrap: HTMLElement;
  private nextIcons = h('span.icons');
  private nextTimer = h('span.timer');
  private goBtn: HTMLButtonElement;
  private speedBtn: HTMLButtonElement;
  private pauseBtn: HTMLButtonElement;
  private crystalWrap = h('div.crystal-btn');
  private drawer: HTMLElement;
  private cardsEl = h('div.cards');
  private cards: CardRef[] = [];
  private fab: HTMLElement;
  private chip: HTMLElement;
  private tpanel: HTMLElement | null = null;
  private tpanelRefs: { upgrade?: HTMLButtonElement; sell?: HTMLButtonElement; target?: HTMLButtonElement; kills?: HTMLElement } = {};
  private toastEl: HTMLElement | null = null;
  private toastTimer = 0;
  private last = { lives: -1, coins: -1, wave: -1, next: '', timer: -2, crystals: -1, unlocked: '', speed: 0, paused: false, early: -1, build: '' as string, sel: -1, selLevel: 0 };
  /** Drawer stays open (desktop / tall screens) vs. slides away (phones). */
  pinned = true;
  drawerOpen = true;

  constructor(private readonly host: HudHost) {
    const a = host.atlas;
    this.livesStat = h('div.stat.lives', { title: 'Lives' }, img(atlasIconUrl(a, 'heart', 64), 'Lives'), this.livesNum);
    this.coinsStat = h('div.stat.coins', { title: 'Coins' }, img(atlasIconUrl(a, 'coin', 64), 'Coins'), this.coinsNum);
    const waveStat = h('div.stat.wave', { title: 'Wave' }, h('span.lbl', null, 'Wave'), this.waveNum);
    this.goBtn = h('button.btn.green', { onClick: () => host.sendWave(), 'aria-label': 'Send next wave' }, 'GO!');
    this.nextWrap = h('div.next-wave', { title: 'Next wave' }, this.nextIcons, this.nextTimer, this.goBtn);
    this.speedBtn = h('button.btn.round', { onClick: () => host.cycleSpeed(), 'aria-label': 'Game speed' }, '1x');
    this.pauseBtn = h('button.btn.round', { onClick: () => host.togglePause(), 'aria-label': 'Pause' }, '❚❚');
    const top = h('div.hud-top', null, this.livesStat, this.coinsStat, waveStat, h('div.hud-spacer'), this.nextWrap, this.speedBtn, this.pauseBtn);

    this.drawer = h('div.drawer.panel', { 'aria-label': 'Build towers' }, this.cardsEl);
    this.fab = h('div.build-fab', null, h('button.btn.gold', { onClick: () => this.setDrawerOpen(!this.drawerOpen), 'aria-label': 'Build' }, '🔨 Build'));
    this.chip = h('div.picked-chip.panel');
    this.chip.style.display = 'none';
    this.el.append(top, this.crystalWrap, this.drawer, this.fab, this.chip);
    // Horizontal wheel scrolling on desktop for the tower row.
    this.cardsEl.addEventListener(
      'wheel',
      (e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          this.cardsEl.scrollLeft += e.deltaY;
          e.preventDefault();
        }
      },
      { passive: false },
    );
  }

  /** Decide pinned vs sliding drawer from the viewport. */
  layout(w: number, h: number): void {
    const pinned = h >= 620 || (w >= 900 && h >= 520);
    if (pinned !== this.pinned) {
      this.pinned = pinned;
      this.drawerOpen = pinned;
    }
    this.applyDrawer();
  }

  private applyDrawer(): void {
    this.drawer.classList.toggle('closed', !this.drawerOpen);
    this.fab.style.display = this.pinned || this.drawerOpen || this.host.buildType ? 'none' : '';
    const showChip = !this.pinned && !!this.host.buildType && !this.drawerOpen;
    this.chip.style.display = showChip ? '' : 'none';
  }

  setDrawerOpen(open: boolean): void {
    if (this.pinned) open = true;
    this.drawerOpen = open;
    this.applyDrawer();
  }

  /** Pixel insets the camera should keep clear. */
  insets(): { top: number; bottom: number } {
    const top = (this.el.querySelector('.hud-top') as HTMLElement | null)?.offsetHeight ?? 56;
    const bottom = this.pinned ? this.drawer.offsetHeight + 12 : 0;
    return { top: top + 4, bottom };
  }

  // ------------------------------------------------------------ per frame

  update(): void {
    const g = this.host.game;
    const L = this.last;
    if (g.lives !== L.lives) {
      if (L.lives >= 0 && g.lives < L.lives) this.flash(this.livesStat, 'flash-bad');
      L.lives = g.lives;
      setText(this.livesNum, String(g.lives));
    }
    const coins = Math.floor(g.coins);
    if (coins !== L.coins) {
      if (L.coins >= 0 && coins > L.coins + 8) this.flash(this.coinsStat, 'flash-good');
      L.coins = coins;
      setText(this.coinsNum, String(coins));
      this.refreshAffordability();
      this.refreshPanelButtons();
    }
    if (g.waveNum !== L.wave) {
      L.wave = g.waveNum;
      setText(this.waveNum, g.totalWaves === Infinity ? `${Math.max(1, g.waveNum)}` : `${Math.max(1, g.waveNum)}/${g.totalWaves}`);
    }
    // next wave preview
    const next = g.nextWave;
    const nextKey = next ? `${next.n}` : 'none';
    if (nextKey !== L.next) {
      L.next = nextKey;
      this.nextIcons.replaceChildren();
      if (next) {
        for (const p of wavePreview(next).slice(0, 6)) {
          const def = ENEMIES[p.enemy];
          const el = def.elemental ? p.element : null;
          this.nextIcons.append(img(atlasIconUrl(this.host.atlas, enemyTexName(p.enemy, el), 64), def.name));
          this.nextIcons.append(h('span.cnt', null, `${p.count}`));
        }
        if (next.boss) this.nextIcons.append(h('span.boss-tag', null, 'BOSS'));
      }
      this.nextWrap.style.display = next ? '' : 'none';
    }
    const timer = g.nextWaveTimer > 0 ? Math.ceil(g.nextWaveTimer) : -1;
    if (timer !== L.timer) {
      L.timer = timer;
      setText(this.nextTimer, timer > 0 ? `${timer}s` : '');
    }
    const early = g.earlyBonus;
    if (early !== L.early || (g.waveNum === 0) !== (L.early === -5)) {
      L.early = g.waveNum === 0 ? -5 : early;
      if (g.waveNum === 0) {
        setText(this.goBtn, 'GO!');
        this.goBtn.classList.add('pulse');
      } else {
        this.goBtn.classList.remove('pulse');
        setText(this.goBtn, early > 0 ? `Next +${early}` : 'Next');
      }
    }
    if (g.crystals !== L.crystals) {
      L.crystals = g.crystals;
      this.crystalWrap.replaceChildren();
      if (g.crystals > 0) {
        this.crystalWrap.append(
          h(
            'button.btn.gold.pulse',
            { onClick: () => this.host.openElementPick(), 'aria-label': 'Pick an element' },
            img(atlasIconUrl(this.host.atlas, 'gem', 64)),
            g.crystals > 1 ? `Pick ${g.crystals} elements!` : 'Pick an element!',
          ),
        );
      }
    }
    const unlockedKey = g.unlocked.join(',');
    if (unlockedKey !== L.unlocked) {
      L.unlocked = unlockedKey;
      this.buildCards();
    }
    if (this.host.speed !== L.speed) {
      L.speed = this.host.speed;
      setText(this.speedBtn, `${this.host.speed}x`);
    }
    if (this.host.paused !== L.paused) {
      L.paused = this.host.paused;
      setText(this.pauseBtn, this.host.paused ? '▶' : '❚❚');
    }
    const bt = this.host.buildType ?? '';
    if (bt !== L.build) {
      L.build = bt;
      for (const c of this.cards) c.el.classList.toggle('sel', !!c.id && c.id === bt);
      this.updateChip();
      this.applyDrawer();
    }
    const sel = this.host.selected;
    const selId = sel ? sel.id : -1;
    if (selId !== L.sel || (sel && sel.level !== L.selLevel)) {
      L.sel = selId;
      L.selLevel = sel?.level ?? 0;
      this.renderPanel(sel);
    }
  }

  private flash(el: HTMLElement, cls: string): void {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  // ------------------------------------------------------------ drawer

  private buildCards(): void {
    const g = this.host.game;
    const a = this.host.atlas;
    this.cardsEl.replaceChildren();
    this.cards = [];
    let key = 1;
    const add = (id: TowerId): void => {
      const def = TOWERS[id];
      const cost = def.levels[0]!.cost;
      const els = h('span.els', null, ...def.elements.map((e) => img(elementIconUrl(a, e, 40), ELEMENTS[e].name)));
      const el = h(
        'button.card',
        { 'aria-label': `${def.name}, ${cost} coins`, title: `${def.name} — ${def.blurb}` },
        key <= 10 && !this.host.touch ? h('span.key', null, String(key % 10)) : null,
        els,
        img(towerIconUrl(id, 1, 104), def.name, 'icon'),
        h('span.nm', null, def.name),
        h('span.cost', null, img(atlasIconUrl(a, 'coin', 32)), String(cost)),
      );
      key++;
      this.attachPress(el, () => {
        this.host.selectBuild(this.host.buildType === id ? null : id);
        if (!this.pinned && this.host.buildType) this.setDrawerOpen(false);
      }, () => this.host.showTowerInfo(id));
      this.cards.push({ el, cost, id });
      this.cardsEl.append(el);
    };
    for (const id of BASIC_TOWERS) add(id);
    this.cardsEl.append(h('span.sep'));
    for (const e of g.unlocked) add(ELEMENT_TOWERS[e] as TowerId);
    // locked element slots
    for (const e of ELEMENT_ORDER) {
      if (g.unlocked.includes(e)) continue;
      const el = h(
        'button.card.locked',
        { 'aria-label': `${ELEMENTS[e].name} is locked`, title: 'Find an Element Crystal to unlock' },
        img(elementIconUrl(a, e, 80), ELEMENTS[e].name, 'icon'),
        h('span.nm', null, ELEMENTS[e].name),
        h('span.cost', null, '🔒'),
      );
      el.addEventListener('click', () => {
        if (g.crystals > 0) this.host.openElementPick();
        else this.toast('Find an Element Crystal to unlock this!');
      });
      this.cards.push({ el, cost: 0, id: null, el2: e });
      this.cardsEl.append(el);
    }
    // combos for every unlocked pair
    const combos: TowerId[] = [];
    for (let i = 0; i < g.unlocked.length; i++) {
      for (let j = i + 1; j < g.unlocked.length; j++) {
        const c = comboFor(g.unlocked[i]!, g.unlocked[j]!);
        if (c) combos.push(c);
      }
    }
    if (combos.length) this.cardsEl.append(h('span.sep'));
    for (const c of combos) add(c);
    this.last.coins = -1; // force affordability refresh
    this.last.build = '#';
  }

  /** Tap = action, long-press = info (works for touch and mouse). */
  private attachPress(el: HTMLElement, tap: () => void, long: () => void): void {
    let timer = 0;
    let longFired = false;
    let sx = 0;
    let sy = 0;
    el.addEventListener('pointerdown', (e) => {
      longFired = false;
      sx = e.clientX;
      sy = e.clientY;
      timer = window.setTimeout(() => {
        longFired = true;
        long();
      }, 480);
    });
    const cancel = (): void => clearTimeout(timer);
    el.addEventListener('pointermove', (e) => {
      if (Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel();
    });
    el.addEventListener('pointerup', cancel);
    el.addEventListener('pointercancel', cancel);
    el.addEventListener('pointerleave', cancel);
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      cancel();
      if (!longFired) long();
      longFired = true;
    });
    el.addEventListener('click', () => {
      if (longFired) return;
      tap();
    });
  }

  private refreshAffordability(): void {
    const coins = this.host.game.coins;
    for (const c of this.cards) if (c.id) c.el.classList.toggle('poor', coins < c.cost);
  }

  /** Card order for number hotkeys. */
  hotkeyTower(n: number): TowerId | null {
    const ids = this.cards.filter((c) => c.id).map((c) => c.id!);
    return ids[n - 1] ?? null;
  }

  private updateChip(): void {
    const id = this.host.buildType;
    this.chip.replaceChildren();
    if (!id) return;
    const def = TOWERS[id];
    this.chip.append(
      img(towerIconUrl(id, 1, 88), def.name),
      h('span.hint', null, this.host.touch ? `Tap a spot to build ${def.name}` : `Click to build ${def.name}`),
      h('button.btn.round.red', { onClick: () => this.host.selectBuild(null), 'aria-label': 'Cancel building' }, '✕'),
    );
  }

  // ------------------------------------------------------------ tower panel

  private renderPanel(t: Tower | null): void {
    this.tpanel?.remove();
    this.tpanel = null;
    this.tpanelRefs = {};
    if (!t) {
      this.drawer.style.visibility = '';
      return;
    }
    // On phones the panel replaces the drawer; on big screens it floats above it.
    if (!this.pinned) this.drawer.style.visibility = 'hidden';
    const def = t.def;
    const st = t.stats;
    const pips = h('span.pips', { 'aria-label': `Level ${t.level} of ${MAX_LEVEL}` });
    for (let i = 1; i <= MAX_LEVEL; i++) pips.append(h('span.pip-dot', { class: i <= t.level ? 'on' : '' }));
    const kills = h('span', null, `Poofs: ${t.kills}`);
    const info = h(
      'div.tinfo',
      null,
      h('span.chip', null, def.ability),
      h('span', null, `Range ${st.range.toFixed(1)}`),
      def.behavior === 'beam' ? h('span', null, `Power ${Math.round(st.damage)}/s`) : h('span', null, `Power ${Math.round(st.damage)}`),
      kills,
    );
    const target =
      def.behavior === 'pulse'
        ? undefined
        : h('button.btn.ghost', { onClick: () => this.host.cycleTargeting(), 'aria-label': 'Change target' }, `🎯 ${TARGET_MODE_LABEL[t.mode]}`);
    const upgrade = h('button.btn.green', { onClick: () => this.host.upgradeSelected(), 'aria-label': 'Upgrade' });
    const sell = h('button.btn.red', { onClick: () => this.host.sellSelected(), 'aria-label': 'Sell' }, `Sell +${sellValue(t.invested)}`);
    const close = h('button.btn.round.ghost.close', { onClick: () => this.host.deselect(), 'aria-label': 'Close' }, '✕');
    const panel = h(
      'div.tpanel.panel',
      null,
      img(towerIconUrl(def.id, t.level, 128), def.name, 'icon'),
      h('div.tname', null, def.name, pips, ...def.elements.map((e) => img(elementIconUrl(this.host.atlas, e, 40), ELEMENTS[e].name))),
      close,
      info,
      h('div.actions', null, target ?? null, sell, upgrade),
    );
    panel.querySelectorAll('.tname img').forEach((i) => ((i as HTMLElement).style.width = (i as HTMLElement).style.height = '22px'));
    this.tpanel = panel;
    this.tpanelRefs = { upgrade, sell, target, kills };
    this.el.append(panel);
    this.refreshPanelButtons();
  }

  refreshPanelButtons(): void {
    const t = this.host.selected;
    const r = this.tpanelRefs;
    if (!t || !r.upgrade) return;
    const g = this.host.game;
    if (t.level >= MAX_LEVEL) {
      setText(r.upgrade, '★ Max level');
      r.upgrade.disabled = true;
    } else {
      const cost = g.upgradeCost(t);
      setText(r.upgrade, `⬆ Upgrade ${cost}`);
      r.upgrade.disabled = g.coins < cost;
    }
    if (r.sell) setText(r.sell, `Sell +${sellValue(t.invested)}`);
    if (r.target) setText(r.target, `🎯 ${TARGET_MODE_LABEL[t.mode]}`);
    if (r.kills) setText(r.kills, `Poofs: ${t.kills}`);
  }

  // ------------------------------------------------------------ messages

  toast(msg: string, bad = false): void {
    this.toastEl?.remove();
    clearTimeout(this.toastTimer);
    const el = h('div.toast', { class: bad ? 'bad' : '', role: 'status' }, msg);
    this.el.append(el);
    this.toastEl = el;
    this.toastTimer = window.setTimeout(() => el.remove(), 1800);
  }

  banner(text: string, sub?: string): void {
    const el = h('div.banner', { role: 'status' }, text, sub ? h('span.small', null, sub) : null);
    this.el.append(el);
    window.setTimeout(() => el.remove(), 1900);
  }
}
