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
  private lastBuffKey = '';
  private hurtVignette: HTMLElement;
  private prompt: HTMLElement;

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

    this.root = h(
      'div',
      { class: 'hud hidden' },
      this.hurtVignette,
      h('div', { class: 'hud-tl' }, h('div', { class: 'slots' }, ...this.weaponSlots.map((s) => s.root)), h('div', { class: 'slots small' }, ...this.passiveSlots.map((s) => s.root))),
      h('div', { class: 'hud-tc' }, this.timer, h('div', { class: 'dawn' }, this.dawn, ...marks), this.bossWrap),
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

  update(w: World, dt: number, gold: number): void {
    const p = w.player;
    const hpFrac = p.hp / p.stats.maxHp;
    setWidth(this.hpFill, hpFrac);
    this.ghostHp = Math.max(hpFrac, this.ghostHp - dt * 0.6);
    setWidth(this.hpGhost, this.ghostHp);
    setText(this.hpText, `${Math.ceil(p.hp)} / ${Math.round(p.stats.maxHp)}`);
    this.hpFill.classList.toggle('low', hpFrac < 0.3);
    setWidth(this.xpFill, p.xp / p.xpNext);
    setText(this.level, String(p.level));
    setText(this.timer, formatTime(w.time));
    setWidth(this.dawn, w.time / RUN_LENGTH);
    setText(this.kills, String(w.stats.kills));
    setText(this.gold, String(gold));
    setText(this.speed, Math.hypot(p.vx, p.vz).toFixed(1));

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
      const bi = w.enemies.findUid(d.bossUid);
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
