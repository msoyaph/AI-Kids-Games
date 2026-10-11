import type { HotkeyAction } from '../app/hotkeys';
import { ELEMENT_ORDER, ELEMENTS, type ElementId } from '../data/elements';
import { formatNumber, t, type MessageKey } from '../i18n';
import { ABILITIES, type AbilityId } from '../data/heroes';
import { commandIconUrl } from './commandIcons';
import { pipUrl } from './modals';
import { ENEMIES } from '../data/enemies';
import { BASIC_TOWERS, comboFor, ELEMENT_TOWERS, MAX_LEVEL, targetModeLabel, TOWERS, type TowerId } from '../data/towers';
import { wavePreview } from '../data/waves';
import { atlasIconUrl, elementIconUrl, enemyTexName, heroTexName, towerIconUrl, type Atlas } from '../render/atlas/bake';
import type { Tower } from '../sim/entities';
import type { Game } from '../sim/Game';
import { towerDps, statLines } from '../data/stats';
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
  /** Upgrade the selected tower; at level 2 → 3 pass the chosen spec (undefined opens the chooser). */
  upgradeSelected(spec?: 0 | 1): void;
  sellSelected(): void;
  cycleTargeting(): void;
  deselect(): void;
  /** Screen x (CSS px) of a tower's centre, used to keep the panel off it on short screens. */
  towerScreenX(t: Tower): number;
  showTowerInfo(id: TowerId): void;
  /** Breakdown of the next wave (types, counts, health, abilities). */
  openWaveIntel(): void;
  /** Commander hero + abilities. */
  readonly heroSelected: boolean;
  readonly armedAbility: AbilityId | null;
  toggleHero(): void;
  useHeroSpecial(): void;
  armAbility(id: AbilityId | null): void;
  layoutChanged(): void;
  /** Label of the key bound to an action ('' if none). */
  keyFor(action: HotkeyAction): string;
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
  private livesNum = h('span.val');
  private coinsStat: HTMLElement;
  private coinsNum = h('span.val');
  private waveNum = h('span.val');
  private nextWrap: HTMLElement;
  private nextIcons = h('button.icons', { type: 'button' });
  private nextTimer = h('span.timer');
  private goBtn: HTMLButtonElement;
  private speedBtn: HTMLButtonElement;
  private pauseBtn: HTMLButtonElement;
  private crystalWrap = h('div.crystal-btn');
  private bossBar = h('div.bossbar.panel', { 'aria-label': t('hud.bossHealth') });
  private bossPips = h('span.bpips');
  private bossBarrier = h('i.barrier');
  private bossKey = '';
  private bossName = h('span.bname');
  private bossFill = h('i');
  private bossFrame = 0;
  private drawer: HTMLElement;
  private cardsEl = h('div.cards');
  private cards: CardRef[] = [];
  private fab: HTMLElement;
  private dock: HTMLElement;
  private chip: HTMLElement;
  private tpanel: HTMLElement | null = null;
  private tpanelRefs: { upgrade?: HTMLButtonElement; sell?: HTMLButtonElement; target?: HTMLButtonElement; kills?: HTMLElement } = {};
  private toastEl: HTMLElement | null = null;
  private toastTimer = 0;
  private last = { lives: -1, coins: -1, wave: -1, next: '', timer: -2, crystals: -1, unlocked: '#', speed: 0, paused: false, early: -1, build: '' as string, sel: -1, selLevel: 0 };
  /** Drawer stays open (desktop / tall screens) vs. slides away (phones). */
  pinned = true;
  drawerOpen = true;

  constructor(private readonly host: HudHost) {
    const a = host.atlas;
    this.livesStat = h('div.stat.lives', { title: t('hud.lives') }, img(atlasIconUrl(a, 'heart', 64), ''), h('div.sv', null, h('span.lbl', null, t('hud.lives')), this.livesNum));
    this.coinsStat = h('div.stat.coins', { title: t('hud.gold') }, img(atlasIconUrl(a, 'coin', 64), ''), h('div.sv', null, h('span.lbl', null, t('hud.gold')), this.coinsNum));
    const waveStat = h('div.stat.wave', { title: t('hud.wave') }, h('div.sv', null, h('span.lbl', null, t('hud.wave')), this.waveNum));
    this.goBtn = h('button.btn.green', { onClick: () => host.sendWave(), 'aria-label': t('hud.sendWave') }, t('hud.deploy'));
    this.nextIcons.addEventListener('click', () => host.openWaveIntel());
    this.nextWrap = h('div.next-wave', { title: t('hud.nextWave') }, this.nextIcons, this.nextTimer, this.goBtn);
    this.speedBtn = h('button.btn.round', { onClick: () => host.cycleSpeed(), 'aria-label': t('hud.speed') }, t('hud.speedX', { n: 1 }));
    this.pauseBtn = h('button.btn.round', { onClick: () => host.togglePause(), 'aria-label': t('hud.pause') }, '❚❚');
    const top = h('div.hud-top', null, this.livesStat, this.coinsStat, waveStat, h('div.hud-right', null, this.nextWrap, this.speedBtn, this.pauseBtn));

    this.drawer = h('div.drawer.panel', { 'aria-label': t('hud.buildTowers') }, this.cardsEl);
    this.fab = h('div.build-fab', null, h('button.btn.gold', { onClick: () => this.setDrawerOpen(!this.drawerOpen), 'aria-label': t('hud.build') }, t('hud.build')));
    this.chip = h('div.picked-chip.panel');
    this.chip.style.display = 'none';
    this.bossBar.append(h('div.bhead', null, this.bossName, this.bossPips), h('span.bbar', null, this.bossFill, this.bossBarrier));
    this.bossBar.style.display = 'none';
    // bottom-right dock: hero/abilities sit beside the Build button and make room for longer labels
    this.dock = h('div.br-dock', null, this.fab);
    this.el.append(top, this.crystalWrap, this.bossBar, this.drawer, this.dock, this.chip);
    this.buildCommandBar();
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
    // overlays positioned under the HUD (crystal button, boss bar, tutorial) follow its real height
    document.documentElement.style.setProperty('--hud-h', `${Math.max(40, top - 6)}px`);
    const bottom = this.pinned ? this.drawer.offsetHeight + 12 : 0;
    document.documentElement.style.setProperty('--drawer-real', `${this.drawer.offsetHeight}px`);
    this.el.classList.toggle('pinned', this.pinned);
    return { top: top + 4, bottom };
  }

  // ------------------------------------------------------------ command bar (hero + abilities)

  private cmd: {
    bar: HTMLElement;
    hero?: { btn: HTMLButtonElement; lv: HTMLElement; hp: HTMLElement; special: HTMLButtonElement; cd: HTMLElement };
    abilities: { id: AbilityId; btn: HTMLButtonElement; cd: HTMLElement }[];
    targetChip: HTMLElement;
  } | null = null;
  private cmdLast = '';

  private buildCommandBar(): void {
    const g = this.host.game;
    if (!g.hero && g.abilities.length === 0) return;
    const bar = h('div.command-bar', { role: 'toolbar', 'aria-label': t('hero.stats') });
    const keyHint = (a: HotkeyAction): HTMLElement | null => (this.host.touch || !this.host.keyFor(a) ? null : h('span.key', null, this.host.keyFor(a)));
    const cmd: NonNullable<Hud['cmd']> = { bar, abilities: [], targetChip: h('div.picked-chip.panel.target-chip') };
    if (g.hero) {
      const def = g.hero.def;
      const accent = `#${def.accent.toString(16).padStart(6, '0')}`;
      const lv = h('span.lv');
      const hp = h('span.hpring');
      const btn = h(
        'button.cmd-btn.hero-btn',
        { onClick: () => this.host.toggleHero(), 'aria-label': `${def.name}, ${def.role}`, title: `${def.name} · ${def.role}` },
        img(atlasIconUrl(this.host.atlas, heroTexName(def.id), 96), def.name),
        hp,
        lv,
        keyHint('hero'),
      );
      const cd = h('span.cd');
      const special = h(
        'button.cmd-btn.special-btn',
        { onClick: () => this.host.useHeroSpecial(), 'aria-label': `${def.special.name}: ${def.special.desc}`, title: `${def.special.name}: ${def.special.desc}` },
        img(commandIconUrl(def.special.kind, accent), ''),
        cd,
        keyHint('heroSpecial'),
      );
      btn.style.setProperty('--accent', accent);
      special.style.setProperty('--accent', accent);
      cmd.hero = { btn, lv, hp, special, cd };
      bar.append(btn, special);
    }
    if (g.abilities.length) {
      if (g.hero) bar.append(h('span.sep'));
      const keys: HotkeyAction[] = ['ability1', 'ability2', 'ability3'];
      g.abilities.forEach((id, i) => {
        const a = ABILITIES[id];
        const color = `#${a.color.toString(16).padStart(6, '0')}`;
        const cd = h('span.cd');
        const btn = h(
          'button.cmd-btn.ability-btn',
          { onClick: () => this.host.armAbility(this.host.armedAbility === id ? null : id), 'aria-label': `${a.name}: ${a.desc}`, title: `${a.name}: ${a.desc}` },
          img(commandIconUrl(id, color), ''),
          cd,
          keys[i] ? keyHint(keys[i]) : null,
        );
        btn.style.setProperty('--accent', color);
        cmd.abilities.push({ id, btn, cd });
        bar.append(btn);
      });
    }
    cmd.targetChip.style.display = 'none';
    this.cmd = cmd;
    this.dock.prepend(bar);
    this.el.append(cmd.targetChip);
  }

  private updateCommandBar(): void {
    const c = this.cmd;
    if (!c) return;
    const g = this.host.game;
    const hero = g.hero;
    // cheap diff: rebuild text only when whole seconds / states change
    let key = `${this.host.heroSelected}|${this.host.armedAbility}`;
    if (hero) key += `|${hero.level}|${Math.ceil(hero.specialCooldown)}|${Math.ceil(hero.respawn)}|${Math.round((hero.hp / hero.maxHp) * 20)}|${hero.stunned > 0}`;
    for (const a of c.abilities) key += `|${Math.ceil(g.abilityCooldown[a.id])}`;
    if (key === this.cmdLast) return;
    this.cmdLast = key;
    if (hero && c.hero) {
      setText(c.hero.lv, t('hero.level', { n: hero.level }));
      c.hero.btn.classList.toggle('on', this.host.heroSelected);
      c.hero.btn.classList.toggle('down', !hero.alive);
      c.hero.hp.style.setProperty('--hp', String(hero.hp / hero.maxHp));
      const cdLeft = !hero.alive ? hero.respawn : hero.specialCooldown;
      const max = !hero.alive ? hero.def.respawn : hero.specialMax;
      c.hero.special.style.setProperty('--cd', String(Math.max(0, Math.min(1, cdLeft / max))));
      setText(c.hero.cd, cdLeft > 0 ? t('hero.cooldown', { n: Math.ceil(cdLeft) }) : '');
      c.hero.special.disabled = !hero.alive || hero.specialCooldown > 0 || hero.stunned > 0;
    }
    for (const a of c.abilities) {
      const left = g.abilityCooldown[a.id];
      a.btn.style.setProperty('--cd', String(Math.max(0, Math.min(1, left / ABILITIES[a.id].cooldown))));
      setText(a.cd, left > 0 ? t('hero.cooldown', { n: Math.ceil(left) }) : '');
      a.btn.disabled = left > 0;
      a.btn.classList.toggle('on', this.host.armedAbility === a.id);
    }
    const armed = this.host.armedAbility;
    if (armed) {
      c.targetChip.style.display = '';
      c.targetChip.replaceChildren(
        img(commandIconUrl(armed, `#${ABILITIES[armed].color.toString(16).padStart(6, '0')}`), ''),
        h('span.hint', null, t('ability.target', { name: ABILITIES[armed].name })),
        h('button.btn.round.red', { onClick: () => this.host.armAbility(null), 'aria-label': t('ability.cancel') }, '✕'),
      );
    } else c.targetChip.style.display = 'none';
  }

  // ------------------------------------------------------------ per frame

  update(): void {
    const g = this.host.game;
    const L = this.last;
    this.updateCommandBar();
    if (g.lives !== L.lives) {
      if (L.lives >= 0 && g.lives < L.lives) this.flash(this.livesStat, 'flash-bad');
      L.lives = g.lives;
      setText(this.livesNum, formatNumber(g.lives));
    }
    const coins = Math.floor(g.coins);
    if (coins !== L.coins) {
      if (L.coins >= 0 && coins > L.coins + 8) this.flash(this.coinsStat, 'flash-good');
      L.coins = coins;
      setText(this.coinsNum, formatNumber(coins));
      this.refreshAffordability();
      this.refreshPanelButtons();
    }
    if (g.waveNum !== L.wave) {
      L.wave = g.waveNum;
      setText(this.waveNum, g.totalWaves === Infinity ? formatNumber(Math.max(1, g.waveNum)) : t('hud.waveOf', { n: Math.max(1, g.waveNum), total: g.totalWaves }));
    }
    // next wave preview
    const next = g.nextWave;
    const nextKey = next ? `${next.n}` : 'none';
    if (nextKey !== L.next) {
      L.next = nextKey;
      this.nextIcons.replaceChildren();
      if (next) {
        this.nextIcons.setAttribute('aria-label', t('intel.open', { n: next.n }));
        for (const p of wavePreview(next).slice(0, 6)) {
          const def = ENEMIES[p.enemy];
          const el = def.elemental ? p.element : null;
          this.nextIcons.append(img(atlasIconUrl(this.host.atlas, enemyTexName(p.enemy, el), 64), def.name));
          this.nextIcons.append(h('span.cnt', null, formatNumber(p.count)));
        }
        if (next.boss) this.nextIcons.append(h('span.boss-tag', null, t('hud.boss')));
      }
      this.nextWrap.style.display = next ? '' : 'none';
    }
    const timer = g.nextWaveTimer > 0 ? Math.ceil(g.nextWaveTimer) : -1;
    if (timer !== L.timer) {
      L.timer = timer;
      setText(this.nextTimer, timer > 0 ? t('unit.seconds', { n: timer }) : '');
    }
    const early = g.earlyBonus;
    if (early !== L.early || (g.waveNum === 0) !== (L.early === -5)) {
      L.early = g.waveNum === 0 ? -5 : early;
      if (g.waveNum === 0) {
        setText(this.goBtn, t('hud.start'));
        this.goBtn.classList.add('pulse');
      } else {
        this.goBtn.classList.remove('pulse');
        setText(this.goBtn, early > 0 ? t('hud.callBonus', { n: early }) : t('hud.call'));
      }
    }
    if (g.crystals !== L.crystals) {
      L.crystals = g.crystals;
      this.crystalWrap.replaceChildren();
      if (g.crystals > 0) {
        this.crystalWrap.append(
          h(
            'button.btn.gold.pulse',
            { onClick: () => this.host.openElementPick(), 'aria-label': t('hud.pickElement') },
            img(atlasIconUrl(this.host.atlas, 'gem', 64)),
            t('hud.coresReady', { count: g.crystals }),
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
      setText(this.speedBtn, t('hud.speedX', { n: this.host.speed }));
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
    if (++this.bossFrame % 4 === 0) this.updateBoss();
    const sel = this.host.selected;
    const selId = sel ? sel.id : -1;
    if (selId !== L.sel || (sel && sel.level !== L.selLevel)) {
      if (selId !== L.sel || (sel && sel.level !== L.selLevel)) this.specOpen = false;
      L.sel = selId;
      L.selLevel = sel?.level ?? 0;
      this.renderPanel(sel);
    }
  }

  private updateBoss(): void {
    let boss = null;
    for (const e of this.host.game.enemies) if (e.alive && e.boss && (!boss || e.maxHp > boss.maxHp)) boss = e;
    if (!boss) {
      if (this.bossBar.style.display !== 'none') this.bossBar.style.display = 'none';
      return;
    }
    this.bossBar.style.display = '';
    const phases = (boss.def.phases?.length ?? 0) + 1;
    const key = `${boss.id}:${boss.phase}`;
    if (this.bossKey !== key) {
      this.bossKey = key;
      const ph = boss.phase > 0 ? boss.def.phases![boss.phase - 1]! : null;
      setText(this.bossName, ph ? `${boss.def.name} · ${t(`boss.${boss.def.id}.${ph.key}` as MessageKey)}` : boss.def.name);
      this.bossPips.replaceChildren(...Array.from({ length: phases }, (_, i) => h('i', { class: i <= boss!.phase ? 'on' : '' })));
      this.bossPips.setAttribute('aria-label', t('boss.phase', { n: boss.phase + 1 }));
    }
    this.bossFill.style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100).toFixed(1)}%`;
    this.bossBarrier.style.width = boss.barrier > 0 ? `${Math.min(100, (boss.barrier / boss.maxHp) * 100).toFixed(1)}%` : '0';
  }

  private flashAt = new WeakMap<HTMLElement, number>();

  /** Highlight a stat; spaced out so rapid changes never flicker (flash safety). */
  private flash(el: HTMLElement, cls: string): void {
    const now = performance.now();
    if (now - (this.flashAt.get(el) ?? -1e9) < 700) return;
    this.flashAt.set(el, now);
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
      const cost = g.buildCost(id);
      const els = h('span.els', null, ...def.elements.map((e) => img(elementIconUrl(a, e, 40), ELEMENTS[e].name)));
      const el = h(
        'button.card',
        { 'aria-label': t('hud.cardLabel', { name: def.name, cost }), title: t('hud.cardTitle', { name: def.name, blurb: def.blurb }) },
        key <= 10 && !this.host.touch && this.host.keyFor(`build${key}` as HotkeyAction) ? h('span.key', null, this.host.keyFor(`build${key}` as HotkeyAction)) : null,
        els,
        img(towerIconUrl(id, 1, 104), def.name, 'icon'),
        h('span.nm', null, def.name),
        h('span.dps', null, t('hud.dps', { n: Math.round(towerDps(def, def.levels[0]!)) })),
        h('span.cost', null, img(atlasIconUrl(a, 'coin', 32)), formatNumber(cost)),
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
        { 'aria-label': t('hud.elementLocked', { name: ELEMENTS[e].name }), title: t('hud.elementLockedTitle') },
        img(elementIconUrl(a, e, 80), ELEMENTS[e].name, 'icon'),
        h('span.nm', null, ELEMENTS[e].name),
        h('span.cost', null, '🔒'),
      );
      el.addEventListener('click', () => {
        if (g.crystals > 0) this.host.openElementPick();
        else this.toast(t('hud.lockedToast'));
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
    if (g.modifiers.includes('nocombo')) combos.length = 0;
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
      h('span.hint', null, t(this.host.touch ? 'hud.place.touch' : 'hud.place.mouse', { name: def.name })),
      h('button.btn.round.red', { onClick: () => this.host.selectBuild(null), 'aria-label': t('hud.cancelBuild') }, '✕'),
    );
  }

  // ------------------------------------------------------------ tower panel

  private renderPanel(tw: Tower | null): void {
    this.tpanel?.remove();
    this.tpanel = null;
    this.tpanelRefs = {};
    this.el.classList.toggle('panel-open', !!tw);
    if (!tw) {
      this.drawer.style.visibility = '';
      return;
    }
    // On phones the panel replaces the drawer; on big screens it floats above it.
    if (!this.pinned) this.drawer.style.visibility = 'hidden';
    const def = tw.def;
    const pips = h('span.pips', { 'aria-label': t('hud.levelOf', { n: tw.level, max: MAX_LEVEL }) });
    for (let i = 1; i <= MAX_LEVEL; i++) pips.append(h('span.pip-dot', { class: i <= tw.level ? 'on' : '' }));
    const kills = h('span', null);
    const spec = tw.spec >= 0 ? def.specs?.[tw.spec] : undefined;
    const info = h(
      'div.tinfo',
      null,
      h('span.chip', null, def.ability),
      spec ? h('span.chip.spec', null, spec.name) : null,
      def.targets === 'ground' ? h('span', null, t('hud.groundOnly')) : h('span', null, t('hud.groundAir')),
      kills,
    );
    const table = this.specOpen && this.host.game.needsSpec(tw) ? this.specChooser(tw) : this.statsTable(tw);
    const target =
      def.behavior === 'pulse'
        ? undefined
        : h('button.btn.ghost', { onClick: () => this.host.cycleTargeting(), 'aria-label': t('hud.changeTarget') }, t('hud.target', { mode: targetModeLabel(tw.mode) }));
    const upgrade = h('button.btn.green', { onClick: () => this.host.upgradeSelected(), 'aria-label': t('hud.upgrade') });
    const sell = h('button.btn.red', { onClick: () => this.host.sellSelected(), 'aria-label': t('hud.sell') }, t('hud.sellValue', { n: this.host.game.refundOf(tw) }));
    const close = h('button.btn.round.ghost.close', { onClick: () => this.host.deselect(), 'aria-label': t('common.close') }, '✕');
    const panel = h(
      'div.tpanel.panel',
      null,
      img(towerIconUrl(def.id, tw.level, 128, tw.spec), def.name, 'icon'),
      h('div', null, h('div.tname', null, def.name, pips, ...def.elements.map((e) => img(elementIconUrl(this.host.atlas, e, 40), ELEMENTS[e].name))), info),
      close,
      table,
      h('div.actions', null, target ?? null, sell, upgrade),
    );
    // Short (landscape phone) screens: a side sheet on the half away from the tower.
    if (window.innerHeight <= 520) {
      panel.classList.add('side');
      if (this.host.towerScreenX(tw) > window.innerWidth / 2) panel.classList.add('left');
    }
    panel.querySelectorAll('.tname img').forEach((i) => ((i as HTMLElement).style.width = (i as HTMLElement).style.height = '20px'));
    this.tpanel = panel;
    this.tpanelRefs = { upgrade, sell, target, kills };
    this.el.append(panel);
    this.refreshPanelButtons();
  }

  /** Whether the spec chooser is showing in the tower panel. */
  specOpen = false;

  openSpecChooser(): void {
    this.specOpen = true;
    this.renderPanel(this.host.selected);
  }

  /** Two cards: each path's level-3 numbers next to what it changes. */
  private specChooser(tw: Tower): HTMLElement {
    const def = tw.def;
    const base = statLines(def, def.levels[2]!);
    const cost = this.host.game.upgradeCost(tw);
    const cards = def.specs!.map((sp) => {
      const lines = statLines(def, sp.levels[0]);
      const changed = lines.filter((l) => l.key === 'dps' || base.find((b) => b.key === l.key)?.text !== l.text).slice(0, 5);
      return h(
        'button.spec-card',
        { onClick: () => this.host.upgradeSelected(sp.index), 'aria-label': `${sp.name}: ${sp.desc}` },
        h('span.spec-head', null, img(towerIconUrl(def.id, 3, 96, sp.index), sp.name, 'icon'), h('span', null, h('small', null, t('spec.path', { n: sp.index + 1 })), h('b', null, sp.name))),
        h('span.spec-desc', null, sp.desc),
        h(
          'span.spec-stats',
          null,
          ...changed.map((l) => h('span.kv', null, h('span', null, l.label), h('b', null, l.text))),
        ),
        h('span.spec-cost', null, img(atlasIconUrl(this.host.atlas, 'coin', 32)), formatNumber(cost)),
      );
    });
    return h('div.spec-chooser', { role: 'group', 'aria-label': t('spec.choose') }, h('p.spec-help', null, t('spec.chooseHelp')), h('div.spec-cards', null, ...cards));
  }

  /** Current vs next-level numbers, with the change highlighted. */
  private statsTable(tw: Tower): HTMLElement {
    const now = statLines(tw.def, tw.stats);
    const nextStats = tw.level < MAX_LEVEL ? tw.def.levels[tw.level]! : null;
    const next = nextStats ? statLines(tw.def, nextStats) : null;
    const rows = now.slice(0, 6).map((line) => {
      const n = next?.find((x) => x.key === line.key);
      const delta = n ? n.value - line.value : 0;
      const better = delta === 0 ? '' : (delta > 0) === (line.better === 'higher') ? 'up' : 'down';
      return h('tr', null, h('td', null, line.label), h('td', null, line.text), next ? h('td', { class: better }, n ? n.text : '—') : null);
    });
    return h(
      'table.stats-table',
      { 'aria-label': t('hud.towerStats') },
      h('thead', null, h('tr', null, h('th', null, t('hud.col.stat')), h('th', null, t('hud.col.now')), next ? h('th', null, t('hud.col.level', { n: tw.level + 1 })) : null)),
      h('tbody', null, ...rows),
    );
  }

  refreshPanelButtons(): void {
    const tw = this.host.selected;
    const r = this.tpanelRefs;
    if (!tw || !r.upgrade) return;
    const g = this.host.game;
    if (tw.level >= MAX_LEVEL) {
      setText(r.upgrade, t('hud.maxLevel'));
      r.upgrade.disabled = true;
    } else {
      const cost = g.upgradeCost(tw);
      setText(r.upgrade, g.needsSpec(tw) ? t('spec.pick', { cost }) : t('hud.upgradeCost', { cost }));
      r.upgrade.disabled = g.coins < cost;
      r.upgrade.style.display = this.specOpen && g.needsSpec(tw) ? 'none' : '';
    }
    if (this.specOpen && g.needsSpec(tw)) {
      const afford = g.coins >= g.upgradeCost(tw);
      this.tpanel?.querySelectorAll<HTMLButtonElement>('.spec-card').forEach((b) => (b.disabled = !afford));
    }
    if (r.sell) setText(r.sell, t('hud.sellValue', { n: this.host.game.refundOf(tw) }));
    if (r.target) setText(r.target, t('hud.target', { mode: targetModeLabel(tw.mode) }));
    if (r.kills) setText(r.kills, t('hud.towerRecord', { kills: tw.kills, dmg: Math.round(tw.damageDone) }));
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

  /** A PIP tip card that stays a few seconds (dismissable). */
  tip(text: string, ms = 7000): void {
    const card = h(
      'div.tip-card.panel',
      { role: 'status' },
      img(pipUrl('happy', 72), 'PIP', 'face'),
      h('span', null, text),
      h('button.btn.round.ghost', { onClick: () => card.remove(), 'aria-label': t('common.dismiss') }, '✕'),
    );
    this.el.append(card);
    window.setTimeout(() => card.remove(), ms);
  }

  /** Banners queue so two announcements never overlap. */
  banner(text: string, sub?: string): void {
    this.bannerQueue.push([text, sub]);
    if (!this.bannerBusy) this.nextBanner();
  }

  private bannerQueue: [string, string | undefined][] = [];
  private bannerBusy = false;

  private nextBanner(): void {
    const item = this.bannerQueue.shift();
    if (!item) {
      this.bannerBusy = false;
      return;
    }
    this.bannerBusy = true;
    // while a tower panel is open the banner shrinks into the top-left corner instead of covering the stats
    const el = h('div.banner', { role: 'status', class: this.el.classList.contains('panel-open') ? 'compact' : '' }, item[0], item[1] ? h('span.small', null, item[1]) : null);
    this.el.append(el);
    window.setTimeout(() => {
      el.remove();
      this.nextBanner();
    }, 1850);
  }

}
