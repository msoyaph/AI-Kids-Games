import type { UiAction } from '../input/InputManager';
import type { UpgradeChoice, World } from '../sim/world';
import { choiceCard, describeChoice } from './cards';
import { h, img } from './dom';
import { FocusNav } from './focus';
import { Hud } from './Hud';

/** Owns the DOM overlay: HUD + one modal screen at a time + debug overlay. */
export class UI {
  readonly hud = new Hud();
  readonly nav = new FocusNav();
  private screen: HTMLElement | null = null;
  private hotkeys = new Map<string, () => void>();
  readonly debug: HTMLElement;
  screenName = '';

  constructor(readonly root: HTMLElement) {
    root.innerHTML = '';
    this.debug = h('pre', { class: 'debug hidden' });
    root.append(this.hud.root, this.debug);
    window.addEventListener('keydown', (e) => {
      if (!this.screen) return;
      const fn = this.hotkeys.get(e.key) ?? this.hotkeys.get(e.code);
      if (fn) {
        e.preventDefault();
        fn();
        return;
      }
      if (e.code === 'Escape') {
        if (this.nav.onBack) {
          e.preventDefault();
          this.nav.onBack();
        }
        return;
      }
      const map: Record<string, UiAction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right' };
      const a = map[e.code];
      if (a) {
        e.preventDefault();
        this.nav.handle(a);
      }
    });
  }

  get hasScreen(): boolean {
    return this.screen !== null;
  }

  show(name: string, el: HTMLElement, onBack: (() => void) | null = null, hotkeys: Record<string, () => void> = {}): void {
    this.close();
    this.screenName = name;
    const wrap = h('div', { class: `screen screen-${name}` }, el);
    this.screen = wrap;
    this.root.append(wrap);
    this.hotkeys = new Map(Object.entries(hotkeys));
    this.nav.attach(wrap, onBack);
  }

  close(): void {
    if (this.screen) this.screen.remove();
    this.screen = null;
    this.screenName = '';
    this.hotkeys.clear();
    this.nav.detach();
  }

  handleAction(a: UiAction): boolean {
    return this.screen ? this.nav.handle(a) : false;
  }

  // ───────────────────────────── in-run screens ─────────────────────────────

  showLevelUp(w: World, pick: (c: UpgradeChoice | null) => void, reroll: () => void): void {
    const cards = w.choices.map((c, i) => choiceCard(c, i, () => pick(c)));
    const hot: Record<string, () => void> = {};
    w.choices.forEach((c, i) => (hot[String(i + 1)] = () => pick(c)));
    const rr = w.player.rerolls;
    hot.r = () => rr > 0 && reroll();
    const el = h(
      'div',
      { class: 'modal' },
      h('div', { class: 'title' }, 'Level up!'),
      h('div', { class: 'subtitle' }, `Level ${w.player.level - w.pendingLevels + 1} · choose a boon`),
      h('div', { class: 'cards' }, ...cards),
      h(
        'div',
        { class: 'row' },
        h('button', { class: 'btn small', onclick: reroll, disabled: rr <= 0 }, `Reroll (${rr})`),
        h('button', { class: 'btn small ghost', onclick: () => pick(null) }, 'Skip'),
      ),
      h('div', { class: 'hint' }, 'Press 1–4 or click a card'),
    );
    this.show('levelup', el, null, hot);
  }

  showChest(rewards: UpgradeChoice[], onClose: () => void): void {
    const list = rewards.map((c, i) => {
      const info = describeChoice(c);
      return h('div', { class: `reward${info.evolve ? ' evolve' : ''}`, style: `animation-delay:${0.15 + i * 0.18}s` }, img(info.icon, 'reward-icon'), h('div', null, h('div', { class: 'card-tag' }, info.tag), h('div', { class: 'card-name' }, info.name)));
    });
    const el = h(
      'div',
      { class: 'modal chest' },
      h('div', { class: 'title' }, rewards.length > 1 ? 'Treasure trove!' : 'Treasure!'),
      h('div', { class: 'rewards' }, ...list),
      h('button', { class: 'btn', onclick: onClose, 'data-autofocus': true }, 'Continue'),
    );
    this.show('chest', el, onClose, { Enter: onClose, ' ': onClose });
  }
}
