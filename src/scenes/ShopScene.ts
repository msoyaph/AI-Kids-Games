import { Vector3 } from 'three';
import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { DECOR, OUTFITS } from '../data/shop';
import { drawToCanvas } from '../gfx/canvas';
import { drawDecor } from '../gfx/art/rooms';
import { buildCadet, type Character } from '../r3/models/characters';
import { disposeObject } from '../r3/dispose';
import { buy, canBuy, equipOutfit, isUnlocked, toggleDecor, unlockHint } from '../systems/economy';
import { clear, h, setText } from '../ui/dom';
import { speak } from '../ui/speech';
import { toast } from '../ui/toast';
import { button, iconEl } from '../ui/widgets';
import { portraitEl } from '../ui/portraits';
import { AcademyScene } from './AcademyScene';
import { focusPose, screenSpot } from './academyStage';

/** The cadet's height on the try-on stage. */
const CADET_H = 1.45;

type Tab = 'outfits' | 'decor';

/** Star-coin shop: astronaut outfits (tried on by your 3D cadet on the shop's stage) and room decorations. */
export class ShopScene extends AcademyScene {
  private tab: Tab = 'outfits';
  private selected: string | null = null;
  private tryOutfit: string;
  private preview: HTMLElement;
  private cards: HTMLElement;
  private detail: HTMLElement;
  private coinText: HTMLElement;
  private tip: HTMLElement;
  private tabBtns = new Map<Tab, HTMLButtonElement>();
  private cadet: Character | null = null;
  private cadetOutfit = '';
  private framed = false;

  constructor() {
    super('shop');
    this.music = 'hub';
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
    const face = portraitEl('pots', 110);
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

  override enter(): void {
    S.state.emit({ type: 'visit', place: 'shop' });
    this.setTab('outfits');
    this.frame(false);
  }

  /** Frame the try-on stage in the left column (where the preview box is). */
  private frame(instant: boolean): void {
    const spot = screenSpot(this.preview);
    const st = this.stage.academy.spots.shopStage;
    if (!spot) {
      this.showRoom(this.stage.academy.poses.shop, instant);
      return;
    }
    const f = focusPose(new Vector3(st.x, st.y + 0.9, st.z), 2.3, Math.min(0.62, spot.h), spot.x, spot.y, 32, 0.1);
    this.glide.to(f.pose, f.offX, f.offY, instant);
    this.framed = true;
  }

  protected override renderStage(dt: number): void {
    if (!this.cadet) return;
    const st = this.stage.academy.spots.shopStage;
    this.cadet.group.position.copy(st);
    this.cadet.group.rotation.y = Math.sin(this.time * 0.5) * 0.35;
    this.cadet.update(dt);
  }

  /** Dress the cadet on the stage (rebuilt when the outfit changes). */
  private dressCadet(outfit: string): void {
    if (this.cadet && outfit === this.cadetOutfit) return;
    if (this.cadet) {
      this.local.remove(this.cadet.group);
      disposeObject(this.cadet.group);
    }
    this.cadetOutfit = outfit;
    this.cadet = buildCadet({ ...S.state.data.profile, outfit });
    this.cadet.group.scale.setScalar(CADET_H / Math.max(0.6, this.cadet.height));
    this.cadet.setAnim('wave');
    setTimeout(() => this.cadet?.setAnim('idle'), 1400);
    this.local.add(this.cadet.group);
  }

  override back(): boolean {
    void S.game.go('hub');
    return true;
  }

  override resize(w: number, h: number): void {
    super.resize(w, h);
    if (this.framed) requestAnimationFrame(() => this.frame(true));
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
      const pic = this.tab === 'outfits' ? portraitEl('player', 90, 'happy', { ...save.profile, outfit: it.style }, { frame: 'full' }) : drawToCanvas(90, 90, (c, w, hh) => drawDecor(c, it.style, w, hh));
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
      // The 3D cadet on the shop stage shows through here.
      this.preview.replaceChildren();
      this.preview.classList.add('stage-view');
      this.dressCadet(this.tryOutfit);
      if (this.cadet) this.cadet.group.visible = true;
    } else {
      this.preview.classList.remove('stage-view');
      if (this.cadet) this.cadet.group.visible = false;
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
          this.stage.academy.setDecor(this.stage.decorStyles());
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
          else {
            toggleDecor(st, it.id);
            this.stage.academy.setDecor(this.stage.decorStyles());
          }
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
