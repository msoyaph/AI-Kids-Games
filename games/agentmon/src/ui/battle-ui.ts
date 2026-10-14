/**
 * The battle's DOM controls: an info card above each friend (name, level, element, energy, status),
 * a message line, and big command buttons. Move buttons show their element, cost and a one-line
 * description; with hints on, they also show "Super!" or "Weak" against the other side and a ★
 * on the suggested move. Every choice also works with arrows/d-pad and A.
 */
import { canBefriend, canUseMove, isAllowed, moveCost, type Battle } from '../core/battle/engine';
import { suggestMove, suggestSwitch } from '../core/battle/ai';
import { matchup } from '../core/elements';
import { canSwap, maxEnergy } from '../core/creature';
import type { BattleDex, Creature, StatusId } from '../core/types';
import { ELEMENT_INFO } from '../data/elements';
import { ITEMS } from '../data/items';
import { NICKNAMES } from '../data/names';
import { SPECIES } from '../data/species';
import { elementIcon, itemIcon, statusIcon } from '../art/icons';
import { canvasUrl } from '../render/atlas';
import type { Game } from '../game/game';
import { h } from './dom';
import { energyBar } from './parts';
import { speak } from './speech';

export type Choice =
  | { type: 'move'; move: string }
  | { type: 'rest' }
  | { type: 'switch'; to: number }
  | { type: 'item'; item: string; target: number }
  | { type: 'befriend' }
  | { type: 'leave' };

const iconCache = new Map<string, string>();
const icon = (key: string, make: () => Parameters<typeof canvasUrl>[0]) => {
  let url = iconCache.get(key);
  if (!url) { url = canvasUrl(make(), 4); iconCache.set(key, url); }
  return url;
};
export const elementImg = (e: keyof typeof ELEMENT_INFO) => h('img.px.el-icon', { src: icon(`e:${e}`, () => elementIcon(e)), alt: ELEMENT_INFO[e].name, title: ELEMENT_INFO[e].name });
const statusImg = (s: StatusId) => h('img.px.st-icon', { src: icon(`s:${s}`, () => statusIcon(s)), alt: '' });
const itemImg = (id: string) => h('img.px.it-icon', { src: icon(`i:${id}`, () => itemIcon(id)), alt: '' });

const STATUS_TEXT: Record<StatusId, string> = {
  sleepy: 'Sleepy: skips turns. A bump wakes it up.',
  dizzy: 'Dizzy: might wobble and miss a turn.',
  soaked: 'Soaked: slower, and Volt moves bump harder.',
  toasty: 'Toasty: a little more tired each turn.',
  chilly: 'Chilly: moves cost more energy.',
};

export class BattleUI {
  readonly el: HTMLElement;
  private cards: [HTMLElement, HTMLElement];
  private msg: HTMLElement;
  private panel: HTMLElement;
  private layer = { el: null as unknown as HTMLElement, back: () => this.backHandler?.() };
  private backHandler: (() => void) | null = null;

  constructor(private game: Game, private dex: BattleDex, private names: { friend: (c: Creature) => string; foe: (c: Creature) => string }) {
    this.cards = [h('div.bcard.mine'), h('div.bcard.theirs')];
    this.msg = h('div.bmsg', { 'aria-live': 'polite' });
    this.panel = h('div.bpanel');
    this.el = h('div.battle-ui', {}, this.cards[0], this.cards[1], h('div.bbottom', {}, this.msg, this.panel));
    this.layer.el = this.panel;
    game.app.ui.appendChild(this.el);
  }

  destroy(): void {
    this.el.remove();
    if (this.game.focus.top() === this.layer) this.game.focus.pop(this.layer);
  }

  /** Where the stage may draw (device px): above the bottom panel. */
  stageRect(): { x: number; y: number; w: number; h: number } {
    const dpr = this.game.app.host.dpr;
    const bottom = this.el.querySelector('.bbottom')!.getBoundingClientRect();
    return { x: 0, y: 0, w: innerWidth * dpr, h: Math.max(120, bottom.top * dpr) };
  }

  /** Turn feedback: the card of the side that is acting (or choosing) lifts and glows. */
  turn(side: 0 | 1 | null): void {
    this.cards.forEach((c, i) => c.classList.toggle('acting', i === side));
  }

  placeCards(points: [{ x: number; y: number }, { x: number; y: number }]): void {
    const dpr = this.game.app.host.dpr;
    points.forEach((p, i) => {
      const c = this.cards[i]!;
      c.style.left = `${Math.max(8, Math.min(innerWidth - c.offsetWidth - 8, p.x / dpr - c.offsetWidth / 2))}px`;
      c.style.top = `${Math.max(8, p.y / dpr - c.offsetHeight - 6)}px`;
    });
  }

  updateCard(side: 0 | 1, c: Creature | null, status?: StatusId, name?: string): void {
    const card = this.cards[side];
    if (!c) { card.hidden = true; return; }
    card.hidden = false;
    const sp = SPECIES[c.species]!;
    const max = maxEnergy(this.dex, c);
    card.replaceChildren(
      h('div.bname', {}, elementImg(sp.element), h('b', {}, name ?? (side === 0 ? this.names.friend(c) : this.names.foe(c))), h('span.lv', {}, `Lv ${c.level}`), c.shimmer ? h('span.shimmer', { title: 'A rare shimmer!' }, '✨') : null),
      energyBar(c.energy, max),
      ...(status ? [h('div.bsub', {}, h('span.chip.soft.status', { title: STATUS_TEXT[status] }, statusImg(status), status[0]!.toUpperCase() + status.slice(1)))] : []),
    );
  }

  async say(text: string, ms = 1100): Promise<void> {
    this.msg.textContent = text;
    if (this.game.settings.readAloud) speak(text);
    const speed = this.game.settings.battleSpeed;
    await new Promise<void>(resolve => {
      const until = performance.now() + (this.game.settings.skipAnimations ? 350 : ms) / speed;
      const tick = () => {
        if (this.game.input.consume('a') || performance.now() > until) return resolve();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /** Show buttons and wait for one. B goes back if `back` is given. */
  private choose<T>(title: string, buttons: { label: Node | string; value: T; disabled?: boolean; cls?: string; hint?: string }[], back?: () => T | null): Promise<T> {
    return new Promise(resolve => {
      // the keyboard/gamepad focus starts on the ★ suggestion (with hints on), else the first button
      const suggested = buttons.findIndex(b => !b.disabled && (b.cls ?? '').includes('suggested'));
      const first = suggested >= 0 ? suggested : buttons.findIndex(b => !b.disabled);
      this.panel.replaceChildren(
        title ? h('div.ptitle', {}, title) : '',
        h('div.pgrid', {}, ...buttons.map((b, i) => h('button', { type: 'button', class: b.cls ?? '', disabled: !!b.disabled, title: b.hint, ...(i === first ? { 'data-autofocus': true } : {}), onclick: () => done(b.value) }, b.label))),
      );
      const done = (v: T) => {
        this.backHandler = null;
        this.game.focus.pop(this.layer);
        this.panel.replaceChildren();
        resolve(v);
      };
      this.backHandler = back ? () => { const v = back(); if (v !== null) done(v); } : null;
      this.game.focus.push(this.layer);
    });
  }

  /** The main choice for this turn. */
  async chooseAction(b: Battle, side: 0 = 0): Promise<Choice> {
    const me = b.sides[0].team[b.sides[0].active]!;
    const foe = b.sides[1].team[b.sides[1].active]!;
    const foeEl = SPECIES[foe.species]!.element;
    const hints = this.game.settings.hints;
    // a friend on the bench who is much better against this foe: the hint points at Switch instead
    const switchTo = hints ? suggestSwitch(this.dex, b) : null;
    const suggested = hints && switchTo === null ? suggestMove(this.dex, b) : null;
    for (;;) {
      const moves = me.moves.map(id => {
        const m = this.dex.moves[id]!;
        const cost = moveCost(this.dex, b, side, m);
        const usable = canUseMove(this.dex, b, side, id);
        const mu = m.power > 0 ? matchup(m.element, foeEl) : 'neutral';
        const el = m.element === 'plain' ? null : elementImg(m.element);
        const tag = hints && m.power > 0 ? (mu === 'strong' ? h('span.tag.good', {}, 'Super!') : mu === 'weak' ? h('span.tag.weak', {}, 'Weak') : null) : null;
        const label = h('span.move', {}, h('span.mtop', {}, el, h('b', {}, m.name), suggested === id ? h('span.star', { title: 'A good pick!' }, '★') : null, tag),
          h('span.mdesc', {}, m.desc), h('span.mcost', {}, cost === 0 ? 'Free' : `Energy ${cost}`));
        return { label, value: { type: 'move', move: id } as Choice, disabled: !usable, cls: `movebtn${suggested === id ? ' suggested' : ''}`, hint: usable ? m.desc : 'Too tired for this one. Try Rest or a free move.' };
      });
      const extra: { label: string; value: Choice | 'switch' | 'bag'; disabled?: boolean; cls?: string; hint?: string }[] = [
        { label: '😴 Rest', value: { type: 'rest' }, disabled: me.energy >= maxEnergy(this.dex, me), hint: 'Get back some energy. It uses your turn.' },
        { label: switchTo !== null ? '🔄 Switch ★' : '🔄 Switch', value: 'switch', disabled: b.sides[0].team.filter(c => c.energy > 0).length < 2, cls: switchTo !== null ? 'suggested' : '', hint: switchTo !== null ? `${this.names.friend(b.sides[0].team[switchTo]!)} would be super strong here!` : undefined },
        { label: '🎒 Bag', value: 'bag', disabled: !Object.entries(this.game.session!.state.bag).some(([id, n]) => n > 0 && ITEMS[id]?.kind === 'berry') },
      ];
      if (b.kind === 'wild') {
        const ok = canBefriend(this.dex, b);
        extra.push({ label: ok ? '💛 Befriend' : '💛 Befriend (not tired yet)', value: { type: 'befriend' }, disabled: !ok || b.befriended !== undefined, cls: ok ? 'befriend ready' : 'befriend' });
        extra.push({ label: '👣 Walk away', value: { type: 'leave' } });
      }
      const pick = await this.choose<Choice | 'switch' | 'bag'>('', [...moves, ...extra]);
      if (pick === 'switch') {
        const s = await this.chooseSwitch(b, false, switchTo);
        if (s !== null) return { type: 'switch', to: s };
        continue;
      }
      if (pick === 'bag') {
        const it = await this.chooseItem(b);
        if (it) return it;
        continue;
      }
      return pick;
    }
  }

  async chooseSwitch(b: Battle, forced: boolean, suggested: number | null = null): Promise<number | null> {
    const team = b.sides[0].team;
    const buttons = team.map((c, i) => ({
      label: h('span', {}, elementImg(SPECIES[c.species]!.element), h('b', {}, ` ${this.names.friend(c)}`), ` Lv ${c.level} · ${c.energy > 0 ? `Energy ${c.energy}/${maxEnergy(this.dex, c)}` : 'Napping'}`, i === suggested ? h('span.star', { title: 'A good pick!' }, ' ★') : ''),
      value: i as number | null,
      disabled: i === b.sides[0].active || c.energy <= 0,
      cls: i === suggested ? 'suggested' : '',
    }));
    if (!forced) buttons.push({ label: h('span', {}, 'Back'), value: null, disabled: false, cls: '' });
    return this.choose(forced ? 'Who goes next?' : 'Switch to…', buttons, forced ? undefined : () => null as number | null);
  }

  private async chooseItem(b: Battle): Promise<Choice | null> {
    const bag = this.game.session!.state.bag;
    const berries = Object.keys(bag).filter(id => bag[id]! > 0 && ITEMS[id]?.kind === 'berry');
    const pick = await this.choose<string | null>('Use a berry', [...berries.map(id => ({ label: h('span', {}, itemImg(id), h('b', {}, ` ${ITEMS[id]!.name} ×${bag[id]}`), h('span.mdesc', {}, ITEMS[id]!.desc)), value: id as string | null })), { label: 'Back', value: null }], () => null);
    if (!pick) return null;
    const item = ITEMS[pick]!;
    const team = b.sides[0].team;
    const target = await this.choose<number | null>(`Give ${item.name} to…`, [...team.map((c, i) => ({
      label: h('span', {}, h('b', {}, this.names.friend(c)), ` ${c.energy > 0 ? `Energy ${c.energy}/${maxEnergy(this.dex, c)}` : 'Napping'}`),
      value: i as number | null,
      disabled: (c.energy <= 0 && !item.revive) || (!item.cleanse && c.energy >= maxEnergy(this.dex, c) && c.energy > 0),
    })), { label: 'Back', value: null }], () => null);
    if (target === null) return null;
    if (!isAllowed(this.dex, b, 0, { type: 'item', item: pick, target })) return null;
    return { type: 'item', item: pick, target };
  }

  /** Pick a snack to offer (or none) before befriending. */
  async chooseSnack(favorite: string): Promise<string | null | 'back'> {
    const bag = this.game.session!.state.bag;
    const snacks = Object.keys(bag).filter(id => bag[id]! > 0 && ITEMS[id]?.kind === 'snack');
    return this.choose<string | null | 'back'>('Offer a snack? Its favorite helps most!', [
      ...snacks.map(id => ({ label: h('span', {}, itemImg(id), h('b', {}, ` ${ITEMS[id]!.name} ×${bag[id]}`), id === favorite ? h('span.tag.good', {}, 'Favorite!') : null), value: id as string | null | 'back' })),
      { label: 'No snack', value: null },
      { label: 'Back', value: 'back' },
    ], () => 'back');
  }

  async yesNo(question: string, yes = 'Yes', no = 'No'): Promise<boolean> {
    return this.choose(question, [{ label: yes, value: true }, { label: no, value: false }], () => false);
  }

  /** Swap a move to learn a new one (the suggested slot is marked). */
  async learnMove(c: Creature, move: string, suggestSlot: number): Promise<number | null> {
    const m = this.dex.moves[move]!;
    const buttons: { label: Node | string; value: number | null; disabled?: boolean; cls?: string }[] = c.moves.map((id, i) => ({
      label: h('span.move', {}, h('span.mtop', {}, h('b', {}, `Swap ${this.dex.moves[id]!.name}`), i === suggestSlot ? h('span.star', {}, '★') : null), h('span.mdesc', {}, this.dex.moves[id]!.desc)),
      value: i, disabled: !canSwap(this.dex, c, move, i), cls: i === suggestSlot ? 'suggested' : '',
    }));
    buttons.push({ label: 'Keep my moves', value: null });
    return this.choose(`${this.names.friend(c)} can learn ${m.name}: ${m.desc}`, buttons, () => null);
  }

  /** A nickname from the list (no typing): a few at a time, or keep the species name. */
  async chooseNickname(c: Creature, seed: number): Promise<number> {
    let offset = seed % NICKNAMES.length;
    for (;;) {
      const picks = Array.from({ length: 6 }, (_, i) => (offset + i * 37) % NICKNAMES.length);
      const r = await this.choose<number | 'more'>(`Give ${SPECIES[c.species]!.name} a nickname?`, [
        ...picks.map(i => ({ label: NICKNAMES[i]!, value: i as number | 'more' })),
        { label: 'More names', value: 'more' },
        { label: `Keep "${SPECIES[c.species]!.name}"`, value: -1 },
      ], () => -1);
      if (r === 'more') { offset = (offset + 7) % NICKNAMES.length; continue; }
      return r;
    }
  }
}
