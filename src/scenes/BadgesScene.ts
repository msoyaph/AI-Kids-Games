import { Sprite } from 'pixi.js';
import { Scene } from '../app/Scene';
import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { BADGES, type BadgeDef } from '../data/badges';
import { STICKERS } from '../data/stickers';
import { drawToCanvas } from '../gfx/atlas';
import { drawGlyph } from '../gfx/art/glyphs';
import { drawLounge } from '../gfx/art/rooms';
import { drawSticker, drawStickerSlot } from '../gfx/art/stickers';
import { circle, ink, poly, radial, type Ctx } from '../gfx/canvas';
import { C, shade } from '../gfx/palette';
import { ensureTex } from '../gfx/textures';
import { clear, h } from '../ui/dom';
import { toast } from '../ui/toast';
import { button, iconEl } from '../ui/widgets';

type Tab = 'badges' | 'stickers';

export function drawBadge(ctx: Ctx, b: BadgeDef, w: number, hh: number, earned: boolean): void {
  const cx = w / 2;
  const cy = hh * 0.56;
  const r = w * 0.36;
  ink(ctx, poly([cx - r * 0.7, cy - r * 1.35, cx - r * 0.2, cy - r * 1.35, cx + r * 0.1, cy - r * 0.6, cx - r * 0.4, cy - r * 0.6]), earned ? C.blue : '#5a5280', 3);
  ink(ctx, poly([cx + r * 0.7, cy - r * 1.35, cx + r * 0.2, cy - r * 1.35, cx - r * 0.1, cy - r * 0.6, cx + r * 0.4, cy - r * 0.6]), earned ? C.red : '#5a5280', 3);
  const col = earned ? b.color : '#4a4470';
  ink(ctx, circle(cx, cy, r), radial(ctx, cx - r * 0.3, cy - r * 0.3, 2, r * 1.2, [[0, shade(col, 0.4)], [1, shade(col, -0.25)]]), 4);
  ink(ctx, circle(cx, cy, r * 0.74), 'rgba(255,255,255,0.18)', 2);
  drawGlyph(ctx, b.glyph, cx, cy, r * 0.5, earned ? C.white : '#8a84b0');
}

/** Badges and the sticker book. */
export class BadgesScene extends Scene {
  private tab: Tab = 'badges';
  private body: HTMLElement;
  private tabBtns = new Map<Tab, HTMLButtonElement>();

  constructor(params: Record<string, unknown> = {}) {
    super('badges');
    this.music = 'hub';
    const bg = new Sprite(ensureTex('room_lounge', 1600, 720, (c, w, hh) => drawLounge(c, w, hh), 0.5, 0.5, 1));
    bg.alpha = 0.5;
    this.root.addChild(bg);
    this.onResizeBg = (w, hh) => {
      bg.position.set(w / 2, hh / 2);
      bg.scale.set(Math.max(w / 1600, hh / 720));
    };
    const d = S.state.data;
    const tabs = h('div', { class: 'tabs' });
    for (const [t, label, ic] of [['badges', `Badges ${d.badges.length}/${BADGES.length}`, 'badge'], ['stickers', `Sticker Book ${d.stickers.length}/${STICKERS.length}`, 'sticker']] as Array<[Tab, string, string]>) {
      const b = button(label, ic, () => this.setTab(t), { size: 'small', color: 'white', id: `tab-${t}`, sound: 'tab' });
      b.classList.add('tab', 'wide');
      this.tabBtns.set(t, b);
      tabs.append(b);
    }
    const header = h(
      'div',
      { class: 'scr-header' },
      button('Back', 'back', () => this.back(), { round: true, color: 'white', id: 'btn-back' }),
      h('div', { class: 'title' }, 'Awards'),
      tabs,
      h('div', { class: 'spacer' }),
      button('My Journey', 'trophy', () => void S.game.go('complete'), { size: 'small', color: 'yellow', id: 'btn-journey' }),
    );
    this.body = h('div', { class: 'panel scroll awards-body', 'data-testid': 'awards' });
    this.ui.append(header, this.body);
    this.ui.classList.add('menu-screen');
    if (params.tab === 'stickers') this.tab = 'stickers';
  }

  private onResizeBg: (w: number, h: number) => void;

  override enter(): void {
    S.state.emit({ type: 'visit', place: 'badges' });
    this.setTab(this.tab);
  }

  override back(): boolean {
    void S.game.go('hub');
    return true;
  }

  override resize(w: number, hh: number): void {
    this.onResizeBg(w, hh);
  }

  private setTab(t: Tab): void {
    this.tab = t;
    for (const [k, b] of this.tabBtns) b.classList.toggle('on', k === t);
    clear(this.body);
    if (t === 'badges') this.renderBadges();
    else this.renderStickers();
  }

  private renderBadges(): void {
    const have = new Set(S.state.data.badges);
    const grid = h('div', { class: 'badge-grid' });
    for (const b of BADGES) {
      const earned = have.has(b.id);
      const pic = drawToCanvas(96, 104, (c, w, hh) => drawBadge(c, b, w, hh, earned));
      grid.append(h('div', { class: `badge-card ${earned ? 'earned' : ''}`, 'data-testid': `badge-${b.id}` }, pic, h('div', { class: 'card-name' }, b.name), h('div', { class: 'badge-desc' }, b.desc), earned ? null : iconEl('lock', 'ico badge-lock')));
    }
    this.body.append(grid);
  }

  private renderStickers(): void {
    const have = new Set(S.state.data.stickers);
    const page = h('div', { class: 'sticker-page' });
    for (const s of STICKERS) {
      const got = have.has(s.id);
      const pic = drawToCanvas(96, 96, (c, w) => (got ? drawSticker(c, s.id, w / 2, w / 2, w * 0.45) : drawStickerSlot(c, w / 2, w / 2, w * 0.45)));
      const spot = h('button', { class: `sticker-spot ${got ? 'got' : ''}`, type: 'button', 'data-testid': `sticker-${s.id}` }, pic, h('div', { class: 'sticker-name' }, got ? s.name : '???'));
      spot.addEventListener('click', () => {
        sfx(got ? 'sticker' : 'click');
        toast(got ? `${s.name}! You can put it on your rocket in the Hangar.` : s.hint, got ? 'sticker' : 'question', 2600);
      });
      page.append(spot);
    }
    this.body.append(page);
  }
}
