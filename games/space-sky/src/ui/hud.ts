import { h, setText } from './dom';
import { button, iconEl } from './widgets';

/** Heads-up display shared by flight, landing and exploration. */
export class Hud {
  readonly el: HTMLElement;
  private fuelFill: HTMLElement | null = null;
  private shieldFill: HTMLElement | null = null;
  private fuelWrap: HTMLElement | null = null;
  private coinText: HTMLElement;
  private objText: HTMLElement;
  private objIcon: HTMLElement;
  private obj: HTMLElement;
  private extra: HTMLElement;
  private lastFuel = -1;
  private lastShield = -1;
  private lastCoins = -1;

  constructor(opts: { fuel?: boolean; shield?: boolean; onPause: () => void }) {
    const left = h('div', { class: 'hud-left' });
    if (opts.fuel) {
      this.fuelFill = h('div', { class: 'meter-fill fuel' });
      this.fuelWrap = h('div', { class: 'meter', 'data-testid': 'hud-fuel', title: 'Fuel' }, iconEl('fuel'), h('div', { class: 'meter-bar' }, this.fuelFill));
      left.append(this.fuelWrap);
    }
    if (opts.shield) {
      this.shieldFill = h('div', { class: 'meter-fill shield' });
      left.append(h('div', { class: 'meter', 'data-testid': 'hud-shield', title: 'Shield' }, iconEl('shield'), h('div', { class: 'meter-bar' }, this.shieldFill)));
    }
    this.objIcon = iconEl('target');
    this.objText = h('span', { class: 'obj-text' }, '');
    this.obj = h('div', { class: 'hud-obj', 'data-testid': 'hud-objective' }, this.objIcon, this.objText);
    this.coinText = h('span', null, '0');
    this.extra = h('div', { class: 'hud-extra' });
    const right = h(
      'div',
      { class: 'hud-right' },
      h('div', { class: 'pill', 'data-testid': 'hud-coins' }, iconEl('coin'), this.coinText),
      button('Pause', 'pause', opts.onPause, { round: true, size: 'small', color: 'white', id: 'btn-pause' }),
    );
    this.el = h('div', { class: 'hud' }, left, h('div', { class: 'hud-mid' }, this.obj, this.extra), right);
  }

  setFuel(frac: number): void {
    if (!this.fuelFill) return;
    const pct = Math.round(Math.max(0, Math.min(1, frac)) * 100);
    if (pct === this.lastFuel) return;
    this.lastFuel = pct;
    this.fuelFill.style.width = `${pct}%`;
    this.fuelWrap?.classList.toggle('low', pct < 20);
  }

  setShield(frac: number): void {
    if (!this.shieldFill) return;
    const pct = Math.round(Math.max(0, Math.min(1, frac)) * 100);
    if (pct === this.lastShield) return;
    this.lastShield = pct;
    this.shieldFill.style.width = `${pct}%`;
  }

  setCoins(n: number): void {
    if (n === this.lastCoins) return;
    if (this.lastCoins >= 0 && n > this.lastCoins) {
      this.coinText.parentElement?.classList.remove('bump');
      void this.coinText.parentElement?.offsetWidth;
      this.coinText.parentElement?.classList.add('bump');
    }
    this.lastCoins = n;
    setText(this.coinText, String(n));
  }

  setObjective(text: string, icon = 'target'): void {
    setText(this.objText, text);
    this.obj.style.display = text ? '' : 'none';
    if (this.objIcon.dataset.icon !== icon) {
      const ni = iconEl(icon);
      ni.dataset.icon = icon;
      this.objIcon.replaceWith(ni);
      this.objIcon = ni;
    }
  }

  /** Extra line under the objective (timer, progress...). */
  setExtra(text: string): void {
    setText(this.extra, text);
    this.extra.style.display = text ? '' : 'none';
  }
}
