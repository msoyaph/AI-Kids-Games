/** Heads-up display: clock/date/weather/season, coins, energy, health, toolbar. Updates only on change. */
import { formatClock } from '../core/math';
import type { Sim } from '../sim/sim';
import { SEASON_NAMES, WEEKDAY_NAMES, dayOfSeason, seasonOf } from '../sim/state';
import { TOOL_TIERS, TUNING } from '../tuning';
import { fmt, h } from './dom';
import { icon, setIcon } from './icons';
import { iconName, itemName } from './itemview';

export class Hud {
  readonly el: HTMLElement;
  private dateText: HTMLElement;
  private timeText: HTMLElement;
  private coinText: HTMLElement;
  private seasonIco: HTMLElement;
  private weatherIco: HTMLElement;
  private energyFill: HTMLElement;
  private energyBox: HTMLElement;
  private hpBox: HTMLElement;
  private hpFill: HTMLElement;
  private slots: HTMLElement[] = [];
  private toolname: HTMLElement;
  private locText: HTMLElement;
  private cache: Record<string, string | number> = {};
  private toolnameTimer = 0;
  onSlot: (i: number) => void = () => {};
  onMenu: () => void = () => {};

  constructor(parent: HTMLElement) {
    this.seasonIco = icon('ui.season0', 24);
    this.weatherIco = icon('ui.sun', 24);
    this.dateText = h('span');
    this.timeText = h('span', { class: 'time' });
    this.coinText = h('span', { class: 'coins' });
    const clock = h(
      'div',
      { class: 'hud-clock panel', role: 'status', 'aria-live': 'off' },
      h('div', { class: 'row' }, this.seasonIco, this.dateText),
      h('div', { class: 'row' }, this.weatherIco, this.timeText),
      h('div', { class: 'row' }, icon('ui.coin', 24), this.coinText),
    );
    this.locText = h('div', { class: 'hud-loc panel' });
    const menuBtn = h('button', { class: 'btn icon-btn interactive', 'aria-label': 'Open menu', title: 'Menu (Esc)', onclick: () => this.onMenu() }, icon('ui.bag', 32));
    const left = h('div', { class: 'hud-left' }, menuBtn, this.locText);
    this.energyFill = h('div', { class: 'fill' });
    this.energyBox = h('div', { class: 'hud-energy panel', title: 'Energy' }, this.energyFill, h('span', { class: 'lbl' }, icon('ui.energy', 24)));
    this.hpFill = h('div', { class: 'fill' });
    this.hpBox = h('div', { class: 'hud-energy hud-hp panel', title: 'Health', style: 'display:none' }, this.hpFill, h('span', { class: 'lbl' }, icon('ui.heart', 24)));
    const bar = h('div', { class: 'toolbar panel', role: 'toolbar', 'aria-label': 'Toolbar' });
    for (let i = 0; i < TUNING.toolbarSize; i++) {
      const s = h('div', { class: 'slot', role: 'button', tabindex: '-1', 'aria-label': `Slot ${i + 1}` });
      s.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.onSlot(i);
      });
      this.slots.push(s);
      bar.appendChild(s);
    }
    this.toolname = h('div', { class: 'toolname panel' });
    this.el = h('div', { class: 'layer hud' }, clock, left, this.hpBox, this.energyBox, this.toolname, bar);
    parent.appendChild(this.el);
  }

  private set(key: string, v: string | number): boolean {
    if (this.cache[key] === v) return false;
    this.cache[key] = v;
    return true;
  }

  showToolName(text: string): void {
    this.toolname.textContent = text;
    this.toolname.classList.add('show');
    clearTimeout(this.toolnameTimer);
    this.toolnameTimer = window.setTimeout(() => this.toolname.classList.remove('show'), 1400);
  }

  update(sim: Sim, locName: string, inMine: boolean): void {
    const st = sim.state, p = st.player;
    const season = seasonOf(st.day);
    if (this.set('date', st.day)) this.dateText.textContent = `${SEASON_NAMES[season]} ${dayOfSeason(st.day)} · ${WEEKDAY_NAMES[st.day % 5]}`;
    if (this.set('season', season)) setIcon(this.seasonIco, `ui.season${season}`, 24);
    const tmin = Math.floor(st.min / 10) * 10;
    if (this.set('time', tmin)) {
      this.timeText.textContent = formatClock(tmin);
      this.timeText.classList.toggle('sleepy', tmin >= TUNING.sleepyMin);
    }
    if (this.set('weather', st.weather)) setIcon(this.weatherIco, `ui.${st.weather}`, 24);
    if (this.set('coins', p.coins)) this.coinText.textContent = fmt(p.coins);
    if (this.set('loc', locName)) this.locText.textContent = locName;
    const ef = Math.round((p.energy / p.maxEnergy) * 100);
    if (this.set('energy', ef)) {
      this.energyFill.style.height = Math.max(0, ef) + '%';
      this.energyFill.classList.toggle('low', ef < 25 && ef > 0);
      this.energyFill.classList.toggle('empty', ef <= 0);
      this.energyBox.title = `Energy ${Math.round(p.energy)} / ${p.maxEnergy}`;
    }
    if (this.set('mine', inMine ? 1 : 0)) this.hpBox.style.display = inMine ? '' : 'none';
    if (inMine) {
      const hf = Math.round((p.hp / p.maxHp) * 100);
      if (this.set('hp', hf)) this.hpFill.style.height = hf + '%';
    }
    for (let i = 0; i < this.slots.length; i++) {
      const s = p.inv[i];
      const key = s ? `${s.id}|${s.n}|${s.q}|${s.id.startsWith('tool.') ? p.tools[s.id.slice(5)] : ''}|${p.sel === i}|${s.id === 'tool.can' ? p.water : ''}` : `-|${p.sel === i}`;
      if (!this.set('slot' + i, key)) continue;
      const el = this.slots[i];
      el.innerHTML = '';
      el.classList.toggle('sel', p.sel === i);
      el.appendChild(h('span', { class: 'k' }, String((i + 1) % 10)));
      if (s) {
        el.appendChild(icon(iconName(s.id, p.tools), 32));
        if (s.n > 1) el.appendChild(h('span', { class: 'n' }, String(s.n)));
        if (s.q > 0) {
          const q = icon(`ui.star${s.q}`, 16);
          q.classList.add('q');
          q.style.position = 'absolute';
          el.appendChild(q);
        }
        if (s.id === 'tool.can') {
          const cap = TOOL_TIERS.canCapacity[Math.max(0, p.tools.can ?? 0)];
          el.appendChild(h('span', { class: 'water', style: `width:${Math.round((p.water / cap) * 36)}px` }));
        }
        el.title = itemName(s.id, p.tools);
        el.setAttribute('aria-label', `Slot ${(i + 1) % 10}: ${itemName(s.id, p.tools)}${s.n > 1 ? ' ×' + s.n : ''}`);
      } else {
        el.title = '';
        el.setAttribute('aria-label', `Slot ${(i + 1) % 10}: empty`);
      }
    }
  }

  show(v: boolean): void {
    this.el.style.display = v ? '' : 'none';
  }
}
