import type { ItemId } from '../data/types';
import { ITEMS } from '../data/items';
import { formatTime, ordinal } from '../core/math';
import { Kart, RespawnState } from '../sim/kart';
import type { World } from '../sim/world';
import type { RaceTracker } from '../sim/race';
import type { TrackModel } from '../sim/track/trackModel';
import type { ArenaModel } from '../sim/arena';
import type { ViewRect } from '../render/renderer';
import { BALLOON_SVG, COIN_SVG, ITEM_ICONS } from './icons';
import { Minimap, KART_COLORS } from './minimap';
import { touchHudScale } from '../input/touch/layout';

const TIER_CSS = ['#d8e6ff', '#3fa7ff', '#ff9f1c', '#ff4dd2'];
/** Spark tiers also read as words + chevron counts, not only colours. */
const TIER_WORDS = ['', 'MINI', 'SUPER', 'ULTRA'];
/** Item warnings say what is coming as well as showing its icon. */
const WARN_WORDS: Partial<Record<ItemId, string>> = {
  paperPlane: 'PLANE!',
  bumperBall: 'BALL!',
  popper: 'POPPER!',
  cloud: 'CLOUD!',
  tornado: 'TWISTER!',
};
const ROULETTE: ItemId[] = ITEMS.map((i) => i.id);

export type HudMode = 'race' | 'timeTrial' | 'battle';

export interface HudContext {
  world: World;
  kart: Kart;
  race?: RaceTracker;
  laps: number;
  /** Battle: seconds remaining. */
  timeLeft?: number;
  /** Time trial: delta vs best ghost at this point (s, negative = ahead). */
  ghostDelta?: number | null;
  screenShake: boolean;
  showSpeedLines: boolean;
  /** Settings → Reduce effects: no flashing/pulsing overlays. */
  reduceEffects?: boolean;
}

/**
 * Race HUD for one local player's viewport. DOM-based; every write is dirty-checked so per-frame cost is tiny.
 */
export class Hud {
  readonly root: HTMLDivElement;
  private readonly el: Record<string, HTMLElement> = {};
  private readonly last: Record<string, string | number | boolean> = {};
  private readonly minimap: Minimap;
  private rouletteT = 0;
  private bannerTimer = 0;
  private popTimer = 0;
  private lapFlash = 0;

  constructor(
    parent: HTMLElement,
    readonly mode: HudMode,
    readonly playerIndex: number,
    course: { track?: TrackModel; arena?: ArenaModel },
    mirror: boolean,
    readonly split: boolean,
    touch = false,
    /** Settings → HUD size (1, 1.25, 1.5); split-screen caps it so two HUDs still fit. */
    scale = 1,
    /** Left-handed touch layout: the buttons are on the left, so the minimap moves to the right. */
    lefty = false,
  ) {
    this.root = document.createElement('div');
    this.root.className = `hud ${split ? 'split' : ''} ${touch ? 'touch' : ''} ${touch && lefty ? 'lefty' : ''} mode-${mode}`;
    const sc = split ? Math.min(scale, 1.25) : touch ? touchHudScale(scale, parent.getBoundingClientRect().height || window.innerHeight) : scale;
    this.root.style.setProperty('--hud-scale', String(sc));
    if (sc > 1) this.root.classList.add('big');
    this.root.innerHTML = `
      <div class="hud-speedlines"></div>
      <div class="hud-threat"></div>
      <div class="hud-goo"><i></i><i></i><i></i><i></i><i></i></div>
      <div class="hud-cloud"><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="hud-tl">
        <div class="hud-pos"><span class="n">1</span><span class="s">st</span></div>
        <div class="hud-lap">LAP <b>1</b>/3</div>
        <div class="hud-time">0:00.00</div>
        <div class="hud-laps"></div>
        <div class="hud-battle"><div class="balloons"></div><div class="score">★ 0</div></div>
      </div>
      <div class="hud-tr">
        <div class="hud-item"><div class="icon"></div><div class="count"></div><div class="trail">HOLDING</div></div>
      </div>
      <div class="hud-bl"></div>
      <div class="hud-br">
        <div class="hud-spark" role="img" aria-label="Drift sparks"><span class="w"></span><i></i><i></i><i></i></div>
        <div class="hud-speed"><b>0</b><span>km/h</span></div>
      </div>
      <div class="hud-center"><div class="hud-banner"></div><div class="hud-count"></div></div>
      <div class="hud-pop"></div>
      <div class="hud-warn"><div class="ic"></div><div class="w"></div></div>
      <div class="hud-player-tag">P${playerIndex + 1}</div>
    `;
    parent.appendChild(this.root);
    const q = (sel: string): HTMLElement => this.root.querySelector(sel) as HTMLElement;
    this.el.pos = q('.hud-pos .n');
    this.el.posS = q('.hud-pos .s');
    this.el.posBox = q('.hud-pos');
    this.el.lap = q('.hud-lap b');
    this.el.lapBox = q('.hud-lap');
    this.el.time = q('.hud-time');
    this.el.laps = q('.hud-laps');
    this.el.battle = q('.hud-battle');
    this.el.balloons = q('.hud-battle .balloons');
    this.el.score = q('.hud-battle .score');
    this.el.item = q('.hud-item');
    this.el.icon = q('.hud-item .icon');
    this.el.count = q('.hud-item .count');
    this.el.trail = q('.hud-item .trail');
    this.el.spark = q('.hud-spark');
    this.el.speed = q('.hud-speed b');
    this.el.banner = q('.hud-banner');
    this.el.countdown = q('.hud-count');
    this.el.pop = q('.hud-pop');
    this.el.threat = q('.hud-threat');
    this.el.warn = q('.hud-warn');
    this.el.warnIcon = q('.hud-warn .ic');
    this.el.warnWord = q('.hud-warn .w');
    this.el.sparkWord = q('.hud-spark .w');
    this.el.goo = q('.hud-goo');
    this.el.cloud = q('.hud-cloud');
    this.el.speedlines = q('.hud-speedlines');
    this.el.tag = q('.hud-player-tag');
    this.minimap = new Minimap(course, mirror);
    q('.hud-bl').appendChild(this.minimap.canvas);
    this.minimap.resize(Math.round((split || touch ? 92 : 132) * sc));
    if (mode !== 'battle') this.el.battle.style.display = 'none';
    if (mode === 'battle') {
      this.el.posBox.style.display = 'none';
      this.el.lapBox.style.display = 'none';
    }
    if (mode !== 'timeTrial') this.el.laps.style.display = 'none';
    this.el.tag.style.display = split ? '' : 'none';
    this.el.tag.style.background = KART_COLORS[playerIndex];
  }

  setRect(r: ViewRect): void {
    const s = this.root.style;
    s.left = `${r.x * 100}%`;
    s.bottom = `${r.y * 100}%`;
    s.width = `${r.w * 100}%`;
    s.height = `${r.h * 100}%`;
  }

  private set(key: string, el: HTMLElement, value: string): void {
    if (this.last[key] === value) return;
    this.last[key] = value;
    el.textContent = value;
  }

  private setHtml(key: string, el: HTMLElement, value: string): void {
    if (this.last[key] === value) return;
    this.last[key] = value;
    el.innerHTML = value;
  }

  private setOpacity(key: string, el: HTMLElement, v: number): void {
    const q = Math.round(v * 20) / 20;
    if (this.last[key] === q) return;
    this.last[key] = q;
    el.style.opacity = String(q);
    el.style.visibility = q > 0 ? 'visible' : 'hidden';
  }

  private toggle(key: string, el: HTMLElement, cls: string, on: boolean): void {
    if (this.last[key] === on) return;
    this.last[key] = on;
    el.classList.toggle(cls, on);
  }

  update(dt: number, c: HudContext): void {
    const k = c.kart;
    const w = c.world;
    // position & laps
    if (this.mode !== 'battle' && c.race) {
      this.set('pos', this.el.pos, String(k.rank));
      this.set('posS', this.el.posS, ordinal(k.rank).replace(String(k.rank), ''));
      this.toggle('posFirst', this.el.posBox, 'first', k.rank === 1);
      const lap = c.race.lapOf(k);
      this.set('lap', this.el.lap, String(lap));
      if (this.last.lapTotal !== c.laps) {
        this.last.lapTotal = c.laps;
        this.el.lapBox.innerHTML = `LAP <b>${lap}</b>/${c.laps}`;
        this.el.lap = this.el.lapBox.querySelector('b') as HTMLElement;
      }
      const t = k.finished ? k.finishTime : w.raceTime;
      this.set('time', this.el.time, formatTime(t));
      if (this.mode === 'timeTrial' && (this.last.ttLaps !== k.lapTimes.length || this.last.ttDelta !== c.ghostDelta)) {
        this.last.ttLaps = k.lapTimes.length;
        this.last.ttDelta = c.ghostDelta ?? -999;
        const rows = k.lapTimes.map((lt, i) => `<div>L${i + 1} ${formatTime(lt)}</div>`).join('');
        const delta = c.ghostDelta;
        const d = delta === null || delta === undefined ? '' : `<div class="delta ${delta <= 0 ? 'ahead' : 'behind'}">${delta <= 0 ? '−' : '+'}${Math.abs(delta).toFixed(2)}</div>`;
        this.setHtml('laps', this.el.laps, rows + d);
      }
    } else if (this.mode === 'battle') {
      this.set('time', this.el.time, formatTime(Math.max(0, c.timeLeft ?? 0)).slice(0, -3));
      if (this.coinMode) {
        this.set('score', this.el.score, String(k.score));
      } else {
        if (this.last.balloonCount !== k.balloons) {
          this.last.balloonCount = k.balloons;
          this.el.balloons.innerHTML = BALLOON_SVG(KART_COLORS[k.index % KART_COLORS.length]).repeat(Math.max(0, k.balloons));
        }
        this.set('score', this.el.score, `★ ${k.score}`);
      }
    }

    // item slot
    if (k.rouletteTime > 0) {
      this.rouletteT += dt;
      const idx = Math.floor(this.rouletteT * 14) % ROULETTE.length;
      this.setHtml('icon', this.el.icon, ITEM_ICONS[ROULETTE[idx]]);
      this.toggle('rolling', this.el.item, 'rolling', true);
      this.set('count', this.el.count, '');
    } else {
      this.toggle('rolling', this.el.item, 'rolling', false);
      this.setHtml('icon', this.el.icon, k.item ? ITEM_ICONS[k.item] : '');
      this.set('count', this.el.count, k.itemUses > 1 ? `×${k.itemUses}` : '');
    }
    this.toggle('hasItem', this.el.item, 'has', !!k.item);
    this.toggle('trailing', this.el.trail, 'on', k.trailing);

    // speed + drift sparks
    this.set('speed', this.el.speed, String(Math.max(0, Math.round(k.speed * 3.6))));
    const tier = k.drifting ? k.driftTier : 0;
    const sparkKey = k.drifting ? tier + 1 : 0;
    if (this.last.spark !== sparkKey) {
      const prevTier = typeof this.last.spark === 'number' ? Math.max(0, (this.last.spark as number) - 1) : 0;
      this.last.spark = sparkKey;
      const pills = this.el.spark.querySelectorAll('i');
      for (let i = 0; i < 3; i++) {
        pills[i].style.background = tier > i ? TIER_CSS[tier] : 'rgba(255,255,255,0.18)';
        pills[i].classList.toggle('lit', tier > i);
      }
      this.el.sparkWord.textContent = TIER_WORDS[tier];
      this.el.spark.setAttribute('aria-label', tier ? `Drift sparks: ${TIER_WORDS[tier].toLowerCase()} (${tier} of 3)` : 'Drift sparks');
      this.el.spark.classList.toggle('on', k.drifting);
      this.el.spark.style.setProperty('--tier', TIER_CSS[tier]);
      if (tier > prevTier && !c.reduceEffects) {
        // a new spark tier: pulse the meter in the tier colour
        this.el.spark.classList.remove('pulse');
        void this.el.spark.offsetWidth;
        this.el.spark.classList.add('pulse');
      }
    }

    // juice overlays
    const top = k.params.topSpeed;
    const fast = c.showSpeedLines && !c.reduceEffects ? Math.max(0, (k.speed - top * 1.0) / (top * 0.25)) + (k.boosting ? 0.75 : 0) : 0;
    this.setOpacity('speedlines', this.el.speedlines, Math.min(0.9, fast));
    this.toggle('calm', this.root, 'calm', !!c.reduceEffects);
    this.setOpacity('threat', this.el.threat, Math.min(1, k.threat * 1.1));
    if (k.threat > 0.25 && k.threatItem) {
      this.setHtml('warn', this.el.warnIcon, ITEM_ICONS[k.threatItem]);
      this.set('warnWord', this.el.warnWord, WARN_WORDS[k.threatItem] ?? 'LOOK OUT!');
      this.toggle('warnOn', this.el.warn, 'on', true);
    } else this.toggle('warnOn', this.el.warn, 'on', false);
    this.setOpacity('goo', this.el.goo, k.gooTime > 0 ? Math.min(1, k.gooTime) : 0);
    this.setOpacity('cloud', this.el.cloud, k.cloudTime > 0 ? Math.min(1, k.cloudTime / 0.6) * (k.cloudTime < 0.8 ? k.cloudTime / 0.8 : 1) : 0);

    // countdown
    if (w.phase === 'countdown') {
      const n = Math.ceil(w.countdownTime - w.phaseTime);
      this.set('cd', this.el.countdown, n > 0 && n <= 3 ? String(n) : '');
      this.toggle('countOn', this.el.countdown, 'on', n > 0 && n <= 3);
    } else if (w.phase === 'race' && w.phaseTime < 0.9) {
      this.set('cd', this.el.countdown, 'GO!');
      this.toggle('countOn', this.el.countdown, 'on', true);
    } else {
      this.toggle('countOn', this.el.countdown, 'on', false);
    }

    // wrong way banner (persistent while wrong)
    if (k.wrongWayTime > 1.2 && !k.finished) this.banner('WRONG WAY!', 'warn', 0.2);
    if (k.respawnState === RespawnState.Carried) this.banner('Drone to the rescue!', 'info', 0.2);

    // banners timers
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.el.banner.classList.remove('on');
    }
    if (this.popTimer > 0) {
      this.popTimer -= dt;
      if (this.popTimer <= 0) this.el.pop.classList.remove('on');
    }
    if (this.lapFlash > 0) {
      this.lapFlash -= dt;
      if (this.lapFlash <= 0) this.el.lapBox.classList.remove('flash');
    }

    const hi = [k.index];
    this.minimap.draw(w.karts, hi, dt);
  }

  banner(text: string, cls: 'info' | 'warn' | 'big' | 'gold' | 'final', time = 1.8): void {
    const b = this.el.banner;
    if (this.last.bannerText !== text || !b.classList.contains('on')) {
      this.last.bannerText = text;
      b.textContent = text;
      b.className = `hud-banner on ${cls}`;
    }
    this.bannerTimer = Math.max(this.bannerTimer, time);
  }

  positionPop(from: number, to: number): void {
    const up = to < from;
    this.el.pop.textContent = `${up ? '▲' : '▼'} ${ordinal(to)}`;
    this.el.pop.className = `hud-pop on ${up ? 'up' : 'down'}`;
    this.popTimer = 1.1;
    this.el.posBox.classList.remove('bump', 'gain', 'loss');
    void this.el.posBox.offsetWidth;
    this.el.posBox.classList.add('bump', up ? 'gain' : 'loss');
  }

  /** Driving School: no position or lap counter (one learner; lessons are timed or one lap). */
  hideLaps(): void {
    this.el.lapBox.style.display = 'none';
    this.el.laps.style.display = 'none';
    this.el.posBox.style.display = 'none';
  }

  /** Coin Rush: show a coin counter instead of balloons. */
  private coinMode = false;

  setCoinMode(): void {
    this.coinMode = true;
    this.el.balloons.innerHTML = COIN_SVG;
    this.el.battle.classList.add('coins');
  }

  /** A coin was picked up: bounce the counter. */
  coinPop(): void {
    this.el.score.classList.remove('bump');
    void this.el.score.offsetWidth;
    this.el.score.classList.add('bump');
  }

  lapPop(): void {
    this.el.lapBox.classList.add('flash');
    this.lapFlash = 1.2;
  }

  destroy(): void {
    this.root.remove();
  }
}
