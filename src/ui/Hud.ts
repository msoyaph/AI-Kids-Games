import { BOSS_TIMES, PASSIVE_SLOTS, RUN_LENGTH, WEAPON_SLOTS } from '../config/balance';
import { ENEMIES } from '../config/enemies';
import { SHRINES } from '../config/meta';
import { formatTime } from '../core/math';
import { nearbyShrine } from '../sim/shrines';
import type { World } from '../sim/world';
import { h, img, setText, setWidth } from './dom';
import { iconUrl } from './icons';

interface Slot {
  root: HTMLElement;
  icon: HTMLImageElement;
  pips: HTMLElement;
  key: string;
}

/** In-run heads-up display. Built once; updated with change detection each frame. */
export class Hud {
  readonly root: HTMLElement;
  private hpFill: HTMLElement;
  private hpGhost: HTMLElement;
  private hpText: HTMLElement;
  private xpFill: HTMLElement;
  private level: HTMLElement;
  private timer: HTMLElement;
  private dawn: HTMLElement;
  private kills: HTMLElement;
  private gold: HTMLElement;
  private speed: HTMLElement;
  private weaponSlots: Slot[] = [];
  private passiveSlots: Slot[] = [];
  private bossWrap: HTMLElement;
  private bossName: HTMLElement;
  private bossFill: HTMLElement;
  private buffs: HTMLElement;
  private banner: HTMLElement;
  private bannerT = 0;
  private toasts: HTMLElement;
  private ghostHp = 1;
  private lastLevel = 0;
  private lastBuffKey = '';
  private hurtVignette: HTMLElement;
  private prompt: HTMLElement;
  /** Wind warning: an arrow showing which way a gust / blizzard will shove you. */
  private gust: HTMLElement;
  private gustArrow: HTMLElement;
  private gustLabel: HTMLElement;
  private gustKey = '';
  /** Camera forward on the ground plane (set by the game each frame) for screen-relative arrows. */
  camFwd = { x: 0, z: 1 };

  constructor() {
    const slot = (): Slot => {
      const icon = img('', 'slot-icon');
      const pips = h('div', { class: 'pips' });
      const root = h('div', { class: 'slot empty' }, icon, pips);
      return { root, icon, pips, key: '' };
    };
    for (let i = 0; i < WEAPON_SLOTS; i++) this.weaponSlots.push(slot());
    for (let i = 0; i < PASSIVE_SLOTS; i++) this.passiveSlots.push(slot());

    this.hpFill = h('div', { class: 'bar-fill hp' });
    this.hpGhost = h('div', { class: 'bar-ghost' });
    this.hpText = h('div', { class: 'bar-text' });
    this.xpFill = h('div', { class: 'bar-fill xp' });
    this.level = h('div', { class: 'level-badge' }, '1');
    this.timer = h('div', { class: 'timer' }, '0:00');
    this.dawn = h('div', { class: 'dawn-fill' });
    const marks = BOSS_TIMES.map((t) => h('div', { class: 'dawn-mark', style: `left:${(t / RUN_LENGTH) * 100}%` }));
    this.kills = h('span', null, '0');
    this.gold = h('span', null, '0');
    this.speed = h('div', { class: 'speedo' }, '0');
    this.bossName = h('div', { class: 'boss-name' });
    this.bossFill = h('div', { class: 'bar-fill boss' });
    this.bossWrap = h('div', { class: 'boss-bar hidden' }, this.bossName, h('div', { class: 'bar' }, this.bossFill));
    this.buffs = h('div', { class: 'buffs' });
    this.banner = h('div', { class: 'banner hidden' });
    this.toasts = h('div', { class: 'toasts' });
    this.hurtVignette = h('div', { class: 'hurt-vignette' });
    this.prompt = h('div', { class: 'prompt hidden' });
    this.gustArrow = h('div', { class: 'gust-arrow' });
    this.gustLabel = h('div', { class: 'gust-label' });
    this.gust = h('div', { class: 'gust hidden' }, this.gustArrow, this.gustLabel);

    this.root = h(
      'div',
      { class: 'hud hidden' },
      this.hurtVignette,
      h('div', { class: 'hud-tl' }, h('div', { class: 'slots' }, ...this.weaponSlots.map((s) => s.root)), h('div', { class: 'slots small' }, ...this.passiveSlots.map((s) => s.root))),
      h('div', { class: 'hud-tc' }, this.timer, h('div', { class: 'dawn' }, this.dawn, ...marks), this.bossWrap, this.gust),
      h(
        'div',
        { class: 'hud-tr' },
        h('div', { class: 'stat' }, img(iconUrl('kills', 'misc'), 'mini-icon'), this.kills),
        h('div', { class: 'stat' }, img(iconUrl('gold', 'misc'), 'mini-icon'), this.gold),
        this.toasts,
      ),
      h(
        'div',
        { class: 'hud-bc' },
        this.buffs,
        h('div', { class: 'vitals' }, this.level, h('div', { class: 'bars' }, h('div', { class: 'bar hp-bar' }, this.hpGhost, this.hpFill, this.hpText), h('div', { class: 'bar xp-bar' }, this.xpFill))),
      ),
      h('div', { class: 'hud-br' }, this.speed, h('div', { class: 'speedo-label' }, 'speed')),
      this.banner,
      this.prompt,
    );
  }

  show(on: boolean): void {
    this.root.classList.toggle('hidden', !on);
    if (on) {
      this.lastLevel = 0;
      this.last = { hp: -1, maxHp: -1, time: -1, kills: -1, gold: -1, speed: -1, xp: -1, ghost: -1 };
      this.ghostHp = 1;
      this.banner.classList.add('hidden');
      this.toasts.innerHTML = '';
    }
  }

  showBanner(text: string, boss = false): void {
    setText(this.banner, text);
    this.banner.classList.remove('hidden');
    this.banner.classList.toggle('boss', boss);
    // restart the CSS animation
    this.banner.classList.remove('pop');
    void this.banner.offsetWidth;
    this.banner.classList.add('pop');
    this.bannerT = 3.2;
  }

  private updateGust(w: World): void {
    const wt = w.weather;
    const blizzard = wt.blizzardT > 0;
    const state = blizzard ? 'blizzard' : wt.warnT > 0 ? `warn${Math.ceil(wt.warnT)}` : wt.gustT > 0 ? 'gust' : '';
    if (state !== this.gustKey) {
      this.gustKey = state;
      this.gust.classList.toggle('hidden', state === '');
      this.gust.classList.toggle('swirl', blizzard);
      setText(this.gustLabel, blizzard ? 'Blizzard!' : wt.warnT > 0 ? `Gust in ${Math.ceil(wt.warnT)}` : 'Gust!');
    }
    if (state === '' || blizzard) return;
    // arrow points where the wind pushes, relative to the camera (up = away from you)
    const f = this.camFwd;
    const fwd = wt.dirX * f.x + wt.dirZ * f.z;
    const right = wt.dirX * -f.z + wt.dirZ * f.x;
    this.gustArrow.style.transform = `rotate(${Math.round((Math.atan2(right, fwd) * 180) / Math.PI)}deg)`;
  }

  toast(title: string, body: string): void {
    const t = h('div', { class: 'toast' }, h('div', { class: 'toast-title' }, title), h('div', { class: 'toast-body' }, body));
    this.toasts.append(t);
    setTimeout(() => t.classList.add('out'), 4200);
    setTimeout(() => t.remove(), 4800);
  }

  hurt(): void {
    this.hurtVignette.classList.remove('flash');
    void this.hurtVignette.offsetWidth;
    this.hurtVignette.classList.add('flash');
  }

  private updateSlot(s: Slot, key: string, icon: string, level: number, max: number): void {
    if (s.key === key) return;
    s.key = key;
    s.root.classList.toggle('empty', !icon);
    s.icon.src = icon || '';
    s.icon.style.visibility = icon ? 'visible' : 'hidden';
    s.pips.innerHTML = '';
    if (icon && max > 1) for (let i = 0; i < max; i++) s.pips.append(h('i', { class: i < level ? 'on' : '' }));
    if (icon && max === 1) s.pips.append(h('i', { class: 'evo' }));
  }

  private last = { hp: -1, maxHp: -1, time: -1, kills: -1, gold: -1, speed: -1, xp: -1, ghost: -1 };
  private bossHint = -1;

  update(w: World, dt: number, gold: number): void {
    const p = w.player;
    const L = this.last;
    this.updateGust(w);
    const hpFrac = p.hp / p.stats.maxHp;
    this.ghostHp = Math.max(hpFrac, this.ghostHp - dt * 0.6);
    // only touch the DOM when a displayed value actually changes
    const hpShown = Math.ceil(p.hp);
    if (hpShown !== L.hp || p.stats.maxHp !== L.maxHp) {
      L.hp = hpShown;
      L.maxHp = p.stats.maxHp;
      setWidth(this.hpFill, hpFrac);
      setText(this.hpText, `${hpShown} / ${Math.round(p.stats.maxHp)}`);
    }
    if (Math.abs(this.ghostHp - L.ghost) > 0.002) {
      L.ghost = this.ghostHp;
      setWidth(this.hpGhost, this.ghostHp);
    }
    this.hpFill.classList.toggle('low', hpFrac < 0.3);
    this.hurtVignette.classList.toggle('low', hpFrac < 0.25 && p.alive);
    if (p.level !== this.lastLevel) {
      if (this.lastLevel > 0) {
        this.level.classList.remove('bump');
        void this.level.offsetWidth;
        this.level.classList.add('bump');
      }
      this.lastLevel = p.level;
    }
    const xpk = Math.round((p.xp / p.xpNext) * 500);
    if (xpk !== L.xp) {
      L.xp = xpk;
      setWidth(this.xpFill, p.xp / p.xpNext);
      setText(this.level, String(p.level));
    }
    const sec = Math.floor(w.time);
    if (sec !== L.time) {
      L.time = sec;
      setText(this.timer, formatTime(w.time));
      setWidth(this.dawn, w.time / RUN_LENGTH);
    }
    if (w.stats.kills !== L.kills) {
      L.kills = w.stats.kills;
      setText(this.kills, String(w.stats.kills));
    }
    if (gold !== L.gold) {
      L.gold = gold;
      setText(this.gold, String(gold));
    }
    const spd = Math.round(Math.hypot(p.vx, p.vz) * 10);
    if (spd !== L.speed) {
      L.speed = spd;
      setText(this.speed, (spd / 10).toFixed(1));
    }

    for (let i = 0; i < WEAPON_SLOTS; i++) {
      const wi = w.weapons[i];
      if (wi) this.updateSlot(this.weaponSlots[i], `${wi.def.id}:${wi.level}`, iconUrl(wi.def.id, 'weapon'), wi.level, wi.def.levels.length + 1);
      else this.updateSlot(this.weaponSlots[i], '', '', 0, 0);
    }
    for (let i = 0; i < PASSIVE_SLOTS; i++) {
      const pi = w.passives[i];
      if (pi) this.updateSlot(this.passiveSlots[i], `${pi.def.id}:${pi.level}`, iconUrl(pi.def.id, 'passive'), pi.level, pi.def.maxLevel);
      else this.updateSlot(this.passiveSlots[i], '', '', 0, 0);
    }

    // boss bar
    const d = w.director;
    if (d.bossUid) {
      const bi = w.enemies.findUid(d.bossUid, this.bossHint);
      this.bossHint = bi;
      if (bi >= 0) {
        this.bossWrap.classList.remove('hidden');
        setText(this.bossName, ENEMIES[w.enemies.type[bi]].name);
        setWidth(this.bossFill, w.enemies.hp[bi] / w.enemies.maxHp[bi]);
      } else this.bossWrap.classList.add('hidden');
    } else this.bossWrap.classList.add('hidden');

    // buffs
    const b = p.buffs;
    const parts: string[] = [];
    if (b.might > 0) parts.push(`might:${Math.ceil(b.might)}`);
    if (b.haste > 0) parts.push(`haste:${Math.ceil(b.haste)}`);
    if (b.ward > 0) parts.push(`ward:${Math.ceil(b.ward)}`);
    if (b.fortune > 0) parts.push(`fortune:${Math.ceil(b.fortune)}`);
    const key = parts.join('|');
    if (key !== this.lastBuffKey) {
      this.lastBuffKey = key;
      this.buffs.innerHTML = '';
      for (const part of parts) {
        const [kind, secs] = part.split(':');
        const def = SHRINES.find((s) => s.kind === kind);
        const color = def ? `#${def.color.toString(16).padStart(6, '0')}` : '#fff';
        this.buffs.append(h('div', { class: 'buff', style: `--c:${color}` }, h('b', null, def?.name.replace('Shrine of ', '') ?? kind), h('span', null, `${secs}s`)));
      }
    }

    // shrine hint
    const sh = nearbyShrine(w, 7);
    if (sh) {
      const def = SHRINES.find((d) => d.kind === sh.kind)!;
      setText(this.prompt, `${def.name} — bonk it! · ${def.description}`);
      this.prompt.style.setProperty('--c', `#${def.color.toString(16).padStart(6, '0')}`);
      this.prompt.classList.remove('hidden');
    } else this.prompt.classList.add('hidden');

    if (this.bannerT > 0) {
      this.bannerT -= dt;
      if (this.bannerT <= 0) this.banner.classList.add('hidden');
    }
  }
}
