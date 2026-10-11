// Pocket inventory panel + reusable item picker (gifting, selling, donating...).
import { fmt } from '../core/math';
import { item } from '../data/registry';
import type { Game } from '../sim/game';
import { removeAt, putInStorage, swapSlots } from '../sim/inventory';
import { frontTile, tileOf } from '../sim/player';
import type { InvSlot } from '../sim/state';
import { canUseNow, useSlot, useVerb } from '../sim/use';
import { isWaterGround } from '../world/types';
import { btn, clear, h, type Panel, type UIManager } from './dom';
import { iconImg } from './icons';

export interface PickerOpts {
  title: string;
  /** which slots can be picked */
  filter: (s: InvSlot) => boolean;
  /** called with the chosen slot; return true to close */
  onPick: (slot: number) => boolean | void;
  /** extra text shown for the focused item (e.g. sell price) */
  info?: (s: InvSlot) => string;
  confirmLabel?: string;
}

export function slotButton(g: Game, i: number, s: InvSlot | null | undefined, extraClass = ''): HTMLButtonElement {
  const b = h('button', { class: `slot ${extraClass}`, 'data-nav': '', 'data-slot': String(i) }) as HTMLButtonElement;
  if (s) {
    b.appendChild(iconImg(s.id));
    if (s.qty > 1) b.appendChild(h('span', { class: 'qty' }, String(s.qty)));
    const def = item(s.id);
    if (def.tool && def.tool.durability > 0 && s.dur !== undefined) {
      const pct = Math.max(0, s.dur / def.tool.durability);
      b.appendChild(h('div', { class: 'durbar' }, h('div', { style: `width:${pct * 100}%` })));
    }
    if (g.state.player.equipped === i) b.classList.add('equipped');
  }
  return b;
}

export class InventoryPanel implements Panel {
  el: HTMLElement;
  modal = true;
  private grid = h('div', { class: 'inv-grid' });
  private detail = h('div', { class: 'inv-detail' });
  private moving = -1;
  private menuFor = -1;
  private off: () => void;

  constructor(private ui: UIManager, private g: Game, private picker?: PickerOpts) {
    this.el = h(
      'div',
      { class: 'panel inv center' },
      h('h2', null, picker ? picker.title : 'Pockets', h('span', { class: 'spacer' }), btn('✕', () => ui.pop(this), 'small ghost')),
      this.grid,
      this.detail,
    );
    this.render();
    this.off = g.bus.on('inventoryChanged', () => {
      if (this.ui.has(this)) this.render();
    });
  }

  onClose(): void {
    this.off();
  }

  initialFocus(): HTMLElement | null {
    return this.grid.querySelector('.slot') as HTMLElement | null;
  }

  render(): void {
    const p = this.g.state.player;
    const focusedSlot = Number(this.ui.focused()?.dataset.slot ?? -1);
    clear(this.grid);
    for (let i = 0; i < p.invSize; i++) {
      const s = p.inv[i];
      const ok = !this.picker || (s && this.picker.filter(s));
      const b = slotButton(this.g, i, s, `${this.moving === i ? 'picked' : ''} ${!ok ? 'locked' : ''}`);
      b.addEventListener('focus', () => this.showDetail(i));
      b.addEventListener('mouseenter', () => {
        this.ui.focus(b);
        this.showDetail(i);
      });
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this.choose(i);
      });
      this.grid.appendChild(b);
    }
    const again = this.grid.querySelector(`[data-slot="${focusedSlot}"]`) as HTMLElement | null;
    if (again) this.ui.focus(again);
    else if (this.ui.top === this) this.ui.focusFirst(this);
    this.showDetail(focusedSlot >= 0 ? focusedSlot : 0);
  }

  private showDetail(i: number): void {
    if (this.menuFor >= 0 && this.menuFor !== i) this.menuFor = -1;
    if (this.menuFor >= 0) return;
    clear(this.detail);
    const s = this.g.state.player.inv[i];
    if (!s) {
      this.detail.append(h('div', { class: 'muted' }, this.moving >= 0 ? 'Choose where to move it.' : 'Empty pocket.'));
      return;
    }
    const def = item(s.id);
    const info = this.picker?.info?.(s) ?? (def.price > 0 && !def.key ? `Sells for ✦ ${fmt(def.price)}` : def.key ? 'Important item' : '');
    this.detail.append(
      iconImg(s.id, 'icon big'),
      h(
        'div',
        { style: 'flex:1' },
        h('div', { class: 'name' }, def.name, s.qty > 1 ? ` ×${s.qty}` : ''),
        h('div', { class: 'desc' }, def.desc),
        h('div', { class: 'tag' }, info),
      ),
    );
  }

  private choose(i: number): void {
    const p = this.g.state.player;
    const s = p.inv[i];
    if (this.picker) {
      if (s && this.picker.filter(s)) {
        if (this.picker.onPick(i) !== false) this.ui.pop(this);
        else this.render();
      }
      return;
    }
    if (this.moving >= 0) {
      if (this.moving !== i) swapSlots(this.g, this.moving, i);
      this.moving = -1;
      this.render();
      return;
    }
    if (!s) return;
    this.openMenu(i);
  }

  private openMenu(i: number): void {
    const g = this.g;
    const s = g.state.player.inv[i]!;
    const def = item(s.id);
    this.menuFor = i;
    clear(this.detail);
    const verb = useVerb(g, i);
    const actions = h('div', { class: 'row wrap' });
    if (verb) {
      const b = btn(verb, () => {
        this.menuFor = -1;
        const ok = useSlot(g, i);
        if (ok && (verb === 'Plant' || verb === 'Place')) this.ui.pop(this);
        else this.render();
      }, 'primary small');
      if (!canUseNow(g, i)) b.disabled = true;
      actions.append(b);
    }
    actions.append(
      btn('Move', () => {
        this.menuFor = -1;
        this.moving = i;
        this.render();
      }, 'small'),
    );
    if (g.state.player.location === 'home' && !def.key)
      actions.append(
        btn('Store', () => {
          this.menuFor = -1;
          putInStorage(g, i);
          this.render();
        }, 'small'),
      );
    if (!def.key && g.state.player.location === 'island')
      actions.append(
        btn('Drop', () => {
          this.menuFor = -1;
          if (dropSlot(g, i)) this.ui.pop(this);
          else this.render();
        }, 'small'),
      );
    actions.append(
      btn('Cancel', () => {
        this.menuFor = -1;
        this.render();
      }, 'small ghost'),
    );
    this.detail.append(iconImg(s.id, 'icon big'), h('div', { class: 'col', style: 'flex:1' }, h('div', { class: 'name' }, def.name), actions));
    const first = actions.querySelector('button:not([disabled])') as HTMLElement | null;
    if (first) this.ui.focus(first);
  }

  command(c: string): boolean {
    if ((c === 'back' || c === 'cancel') && (this.menuFor >= 0 || this.moving >= 0)) {
      this.menuFor = -1;
      this.moving = -1;
      this.render();
      return true;
    }
    if (c === 'inventory') {
      this.ui.pop(this);
      return true;
    }
    return false;
  }
}

/** Drop an item from pockets onto the ground in front of the player. */
export function dropSlot(g: Game, i: number): boolean {
  const w = g.world;
  const p = g.state.player;
  const s = p.inv[i];
  if (!s) return false;
  const front = frontTile(w, p);
  const here = tileOf(w, p.x, p.z);
  let target = -1;
  for (const t of [front, here]) {
    if (!w.obj(t) && !w.structure(t) && !isWaterGround(w.ground(t)) && w.height(t) === p.level) {
      target = t;
      break;
    }
  }
  if (target < 0) {
    g.toast("There's no room to drop that here.", 'warn');
    return false;
  }
  const taken = removeAt(g, i, s.qty, 'drop');
  if (!taken) return false;
  w.setObj(target, { k: 'item', item: taken.id, q: taken.qty });
  g.emit('objectsChanged', { tiles: [target] });
  g.emit('sfx', { name: 'drop' });
  return true;
}
