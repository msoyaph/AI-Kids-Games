import { Sprite } from 'pixi.js';
import { Scene } from '../app/Scene';
import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { CHAR_BY_ID } from '../data/characters';
import { DECOR, OUTFITS } from '../data/shop';
import { drawToCanvas } from '../gfx/atlas';
import { drawAstronautBust, drawPortrait } from '../gfx/art/characters';
import { drawDecor, drawLounge } from '../gfx/art/rooms';
import { ensureTex } from '../gfx/textures';
import { buy, canBuy, equipOutfit, isUnlocked, toggleDecor, unlockHint } from '../systems/economy';
import { clear, h, setText } from '../ui/dom';
import { speak } from '../ui/speech';
import { toast } from '../ui/toast';
import { button, iconEl } from '../ui/widgets';

type Tab = 'outfits' | 'decor';

/** Star-coin shop: astronaut outfits and decorations for your room. */
export class ShopScene extends Scene {
  private tab: Tab = 'outfits';
  private selected: string | null = null;
  private tryOutfit: string;
  private preview: HTMLElement;
  private cards: HTMLElement;
  private detail: HTMLElement;
  private coinText: HTMLElement;
  private tip: HTMLElement;
  private tabBtns = new Map<Tab, HTMLButtonElement>();

  constructor() {
    super('shop');
    this.music = 'hub';
    const bg = new Sprite(ensureTex('room_lounge', 1600, 720, (c, w, hh) => drawLounge(c, w, hh), 0.5, 0.5, 1));
    this.root.addChild(bg);
    this.onResizeBg = (w, hh) => {
      bg.position.set(w / 2, hh / 2);
      bg.scale.set(Math.max(w / 1600, hh / 720));
    };
    this.tryOutfit = S.state.data.profile.outfit;
    this.coinText = h('span', null, String(S.state.data.coins));
    const header = h(
      'div',
      { class: 'scr-header' },
      button('Back', 'back', () => this.back(), { round: true, color: 'white', id: 'btn-back' }),
      h('div', { class: 'title' }, 'Shop'),
      h('div', { class: 'spacer' }),
      h('div', { class: 'pill', 'data-testid': 'coins' }, iconEl('coin'), this.coinText),
    );
    this.preview = h('div', { class: 'shop-preview' });
    const face = drawToCanvas(110, 110, (c, w, hh) => drawPortrait(c, CHAR_BY_ID.pots, w, hh, 'happy'));
    face.className = 'tip-face';
    this.tip = h('div', { class: 'tip-text' }, 'Welcome to my shop! Spend your star-coins here.');
    const tabs = h('div', { class: 'tabs' });
    for (const [t, label, ic] of [['outfits', 'Outfits', 'person'], ['decor', 'My Room', 'home']] as Array<[Tab, string, string]>) {
      const b = button(label, ic, () => this.setTab(t), { size: 'small', color: 'white', id: `tab-${t}`, sound: 'tab' });
      b.classList.add('tab', 'wide');
      this.tabBtns.set(t, b);
      tabs.append(b);
    }
    this.cards = h('div', { class: 'cards scroll', 'data-testid': 'shop-cards' });
    this.detail = h('div', { class: 'detail' });
    const right = h('div', { class: 'panel hangar-right' }, tabs, this.cards, this.detail);
    this.ui.append(header, h('div', { class: 'hangar-main' }, h('div', { class: 'hangar-left' }, this.preview), right), h('div', { class: 'tip-box' }, face, this.tip));
    this.ui.classList.add('menu-screen');
  }

  private onResizeBg: (w: number, h: number) => void;

  override enter(): void {
    S.state.emit({ type: 'visit', place: 'shop' });
    this.setTab('outfits');
  }

  override back(): boolean {
    void S.game.go('hub');
    return true;
  }

  override resize(w: number, h: number): void {
    this.onResizeBg(w, h);
  }

  private setTab(t: Tab): void {
    this.tab = t;
    for (const [k, b] of this.tabBtns) b.classList.toggle('on', k === t);
    this.selected = null;
    this.refresh();
  }

  private refresh(): void {
    this.renderPreview();
    clear(this.cards);
    const save = S.state.data;
    const list = this.tab === 'outfits' ? OUTFITS : DECOR;
    for (const it of list) {
      const owned = it.price === 0 || save.owned.includes(it.id);
      const unlocked = isUnlocked(it.unlock, save);
      const pic = drawToCanvas(90, 90, (c, w, hh) => {
        if (this.tab === 'outfits') drawAstronautBust(c, { ...save.profile, outfit: it.style }, w / 2, hh * 0.42, w * 0.26);
        else drawDecor(c, it.style, w, hh);
      });
      if (!unlocked) pic.style.filter = 'brightness(.3) saturate(0)';
      const inUse = this.tab === 'outfits' ? save.profile.outfit === it.style : save.decorPlaced.includes(it.id);
      let status: HTMLElement;
      if (inUse) status = h('div', { class: 'card-status ok' }, iconEl('check'), this.tab === 'outfits' ? 'Wearing' : 'In room');
      else if (owned) status = h('div', { class: 'card-status' }, 'Owned');
      else if (!unlocked) status = h('div', { class: 'card-status locked' }, iconEl('lock'), 'Locked');
      else status = h('div', { class: `card-status price ${save.coins >= it.price ? '' : 'poor'}` }, iconEl('coin'), String(it.price));
      const card = h('button', { class: `card ${this.selected === it.id ? 'sel' : ''} ${inUse ? 'equipped' : ''}`, type: 'button', 'data-testid': `shop-${it.id}` }, pic, h('div', { class: 'card-name' }, it.name), status);
      card.addEventListener('click', () => {
        this.selected = it.id;
        if (this.tab === 'outfits' && unlocked) this.tryOutfit = it.style;
        sfx('select');
        this.refresh();
      });
      this.cards.append(card);
    }
    this.renderDetail();
  }

  private renderPreview(): void {
    const save = S.state.data;
    if (this.tab === 'outfits') {
      const c = drawToCanvas(300, 300, (ctx, w, hh) => drawAstronautBust(ctx, { ...save.profile, outfit: this.tryOutfit }, w / 2, hh * 0.4, w * 0.24));
      c.className = 'shop-bust';
      this.preview.replaceChildren(c);
    } else {
      const placed = save.decorPlaced;
      const grid = h('div', { class: 'room-preview' });
      if (!placed.length) grid.append(h('div', { class: 'empty-note' }, 'Your room is empty. Buy decorations to make it cozy!'));
      for (const id of placed) {
        const d = DECOR.find((x) => x.id === id);
        if (d) grid.append(drawToCanvas(110, 110, (ctx, w, hh) => drawDecor(ctx, d.style, w, hh)));
      }
      this.preview.replaceChildren(grid);
    }
  }

  private renderDetail(): void {
    clear(this.detail);
    const id = this.selected;
    const list = this.tab === 'outfits' ? OUTFITS : DECOR;
    const it = list.find((x) => x.id === id);
    if (!it) {
      this.detail.append(h('div', { class: 'detail-text' }, this.tab === 'outfits' ? 'Tap an outfit to try it on.' : 'Tap a decoration to see it.'));
      return;
    }
    const st = S.state;
    const save = st.data;
    const owned = it.price === 0 || save.owned.includes(it.id);
    let action: HTMLButtonElement;
    if (owned) {
      if (this.tab === 'outfits') {
        const wearing = save.profile.outfit === it.style;
        action = button(wearing ? 'Wearing!' : 'Wear it', 'person', () => {
          equipOutfit(st, it.id);
          sfx('equip');
          setText(this.tip, 'Looking sharp, cadet!');
          this.refresh();
        }, { color: 'green', disabled: wearing, id: 'btn-shop-action', sound: null });
      } else {
        const placed = save.decorPlaced.includes(it.id);
        action = button(placed ? 'Take out' : 'Put in room', 'home', () => {
          toggleDecor(st, it.id);
          sfx(placed ? 'click' : 'equip');
          this.refresh();
        }, { color: placed ? 'white' : 'green', id: 'btn-shop-action', sound: null });
      }
    } else {
      const check = canBuy(save, it.id);
      if (check.ok) {
        action = button(`Buy for ${it.price}`, 'coin', () => {
          if (!buy(st, it.id).ok) return;
          if (this.tab === 'outfits') equipOutfit(st, it.id);
          else toggleDecor(st, it.id);
          setText(this.coinText, String(save.coins));
          sfx('buy');
          toast(`You got the ${it.name}!`, 'gift', 2200);
          setText(this.tip, 'Thank you! Enjoy it!');
          this.refresh();
        }, { id: 'btn-shop-action', sound: null });
      } else if (check.reason === 'coins') action = button(`Need ${check.need} more`, 'coin', () => {}, { disabled: true, id: 'btn-shop-action' });
      else action = button(unlockHint(it.unlock) || 'Locked', 'lock', () => {}, { disabled: true, id: 'btn-shop-action' });
    }
    this.detail.append(
      h('div', { class: 'detail-info' }, h('div', { class: 'h3' }, it.name), h('div', { class: 'detail-text' }, it.desc)),
      button('Read to me', 'speaker', () => speak(`${it.name}. ${it.desc}`, { force: true }), { round: true, size: 'small', color: 'white', sound: null }),
      action,
    );
  }
}
