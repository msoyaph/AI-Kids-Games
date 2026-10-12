import type { UiAction } from '../input/InputManager';
import { canBanish } from '../sim/upgrades';
import type { UpgradeChoice, World } from '../sim/world';
import { choiceCard, describeChoice } from './cards';
import { isTypingTarget } from '../core/env';
import { h, img } from './dom';
import { iconUrl } from './icons';
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
  /** Input arriving before this time (ms) is ignored for confirm-type actions. */
  private graceUntil = 0;
  /** Game can veto Escape (e.g. right after Escape released pointer lock). */
  escapeAllowed: () => boolean = () => true;

  constructor(readonly root: HTMLElement) {
    root.innerHTML = '';
    this.debug = h('pre', { class: 'debug hidden' });
    root.append(this.hud.root, this.debug);
  }

  /**
   * Keys while a screen is open (called by the InputManager, the one keyboard listener):
   * hotkeys and Escape. Returns true when handled; navigation keys fall through to actions.
   */
  handleKey(e: KeyboardEvent): boolean {
    if (!this.screen || e.defaultPrevented || isTypingTarget(e.target)) return false;
    // a key held from gameplay (jump, 1–4, Enter) must not instantly pick something
    const settling = performance.now() < this.graceUntil;
    if (settling && (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter')) {
      e.preventDefault();
      return true;
    }
    const fn = this.hotkeys.get(e.key) ?? this.hotkeys.get(e.code);
    if (fn) {
      e.preventDefault();
      if (!e.repeat && !settling) fn();
      return true;
    }
    if (e.code === 'Escape') {
      if (this.nav.onBack && !e.repeat && this.escapeAllowed()) {
        e.preventDefault();
        this.nav.onBack();
      }
      return true;
    }
    return false;
  }

  get hasScreen(): boolean {
    return this.screen !== null;
  }

  /**
   * Show a modal screen. `modal` screens pop up mid-action (level-up, chest, game over):
   * they get a short input grace period and no initial button focus, so a held jump /
   * confirm key can't pick something by accident (arrows / d-pad focus the first item).
   */
  show(name: string, el: HTMLElement, onBack: (() => void) | null = null, hotkeys: Record<string, () => void> = {}, modal = false): void {
    this.close();
    this.screenName = name;
    const wrap = h('div', { class: `screen screen-${name}`, tabindex: -1 }, el);
    this.screen = wrap;
    this.root.append(wrap);
    this.hotkeys = new Map(Object.entries(hotkeys));
    this.graceUntil = modal ? performance.now() + 450 : 0;
    this.nav.attach(wrap, onBack, !modal);
  }

  close(): void {
    if (this.screen) this.screen.remove();
    this.screen = null;
    this.screenName = '';
    this.hotkeys.clear();
    this.nav.detach();
  }

  handleAction(a: UiAction): boolean {
    if (!this.screen) return false;
    if (a === 'confirm' && performance.now() < this.graceUntil) return true;
    return this.nav.handle(a);
  }

  // ───────────────────────────── in-run screens ─────────────────────────────

  /**
   * Level-up picker. Rerolls, skips and banishes are limited charges (shop ranks, 1 free
   * skip per run, +1 each on Relaxed); their buttons show what is left.
   */
  showLevelUp(w: World, pick: (c: UpgradeChoice | null) => void, reroll: () => void, banish: (index: number) => void): void {
    const p = w.player;
    const bn = p.banishes;
    const cards = w.choices.map((c, i) => {
      const card = choiceCard(c, i, () => pick(c));
      if (bn <= 0 || !canBanish(c)) return h('div', { class: 'card-wrap' }, card);
      return h('div', { class: 'card-wrap' }, card, h('button', { class: 'btn tiny ghost banish', onclick: () => banish(i), title: 'Never offer this again this run' }, `Banish (${bn})`));
    });
    const hot: Record<string, () => void> = {};
    w.choices.forEach((c, i) => (hot[String(i + 1)] = () => pick(c)));
    const rr = p.rerolls;
    const sk = p.skips;
    hot.r = () => rr > 0 && reroll();
    // no hotkey for skip: S is a movement key and may still be held when the picker opens
    const el = h(
      'div',
      { class: 'modal levelup' },
      h('div', { class: 'levelup-head' }, h('div', { class: 'title' }, 'Level up!'), h('div', { class: 'subtitle' }, `Level ${p.level - w.pendingLevels + 1} · choose a boon`)),
      h('div', { class: 'cards' }, ...cards),
      h(
        'div',
        { class: 'row levelup-actions' },
        h('button', { class: 'btn small', onclick: reroll, disabled: rr <= 0 }, img(iconUrl('reroll', 'misc'), 'mini-icon'), `Reroll (${rr})`),
        h('button', { class: 'btn small ghost', onclick: () => pick(null), disabled: sk <= 0 }, img(iconUrl('skip', 'misc'), 'mini-icon'), `Skip (${sk})`),
      ),
      h('div', { class: 'hint' }, h('span', { class: 'hint-keys' }, `Press 1–${w.choices.length} or click a card · R to reroll`), h('span', { class: 'hint-touch' }, 'Tap a card to choose it')),
    );
    this.show('levelup', el, null, hot, true);
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
    this.show('chest', el, onClose, { Enter: onClose, ' ': onClose }, true);
  }
}
