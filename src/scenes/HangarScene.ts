import { Sprite } from 'pixi.js';
import { Scene } from '../app/Scene';
import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { PARTS, PART_BY_ID } from '../data/parts';
import { STICKER_BY_ID } from '../data/stickers';
import { STAT_KEYS, type PartSlot, type RocketLoadout, type StatKey } from '../data/types';
import { drawToCanvas } from '../gfx/canvas';
import { drawRocket, ROCKET_H, ROCKET_W } from '../gfx/art/rocket';
import { drawPlatform, drawHangar } from '../gfx/art/rooms';
import { drawSticker } from '../gfx/art/stickers';
import { drawPortrait } from '../gfx/art/characters';
import { CHAR_BY_ID } from '../data/characters';
import { ensureTex, updateRocketTex } from '../gfx/textures';
import { buy, canBuy, equipPart, equipSticker, isUnlocked, unlockHint } from '../systems/economy';
import { statStars } from '../systems/rocketStats';
import { clear, h, setText } from '../ui/dom';
import { icon } from '../ui/icons';
import { speak } from '../ui/speech';
import { toast } from '../ui/toast';
import { button, iconEl, starIcon } from '../ui/widgets';

type Tab = PartSlot | 'stickers';

const TABS: Array<{ tab: Tab; label: string; icon: string }> = [
  { tab: 'nose', label: 'Nose', icon: 'cone' },
  { tab: 'body', label: 'Body', icon: 'capsule' },
  { tab: 'engine', label: 'Engine', icon: 'nozzle' },
  { tab: 'fins', label: 'Fins', icon: 'fin' },
  { tab: 'tank', label: 'Tank', icon: 'fuel' },
  { tab: 'cargo', label: 'Cargo', icon: 'box' },
  { tab: 'lights', label: 'Lights', icon: 'bulb' },
  { tab: 'paint', label: 'Paint', icon: 'paint' },
  { tab: 'stickers', label: 'Stickers', icon: 'sticker' },
];

const STAT_INFO: Record<StatKey, { label: string; icon: string }> = {
  speed: { label: 'Speed', icon: 'boost' },
  fuel: { label: 'Fuel', icon: 'fuel' },
  cargo: { label: 'Cargo', icon: 'box' },
  shield: { label: 'Shield', icon: 'shield' },
};

export class HangarScene extends Scene {
  private bg: Sprite;
  private tab: Tab = 'nose';
  private tryLoadout: RocketLoadout;
  private selected: string | null = null;
  private preview: HTMLCanvasElement;
  private statRows: Record<StatKey, HTMLElement> = {} as Record<StatKey, HTMLElement>;
  private tabBtns = new Map<Tab, HTMLButtonElement>();
  private cards: HTMLElement;
  private detail: HTMLElement;
  private coinText: HTMLElement;
  private tip: HTMLElement;
  private t = 0;

  constructor() {
    super('hangar');
    this.music = 'hub';
    const st = S.state.data;
    this.tryLoadout = { ...st.loadout, stickers: [...st.loadout.stickers] };
    this.bg = new Sprite(ensureTex('room_hangar', 1600, 720, (c, w, hh) => drawHangar(c, w, hh), 0.5, 0.5, 1));
    this.root.addChild(this.bg);

    this.coinText = h('span', null, String(st.coins));
    const header = h(
      'div',
      { class: 'scr-header' },
      button('Back', 'back', () => this.back(), { round: true, color: 'white', id: 'btn-back' }),
      h('div', { class: 'title' }, 'Hangar'),
      h('div', { class: 'spacer' }),
      h('div', { class: 'pill', 'data-testid': 'coins' }, iconEl('coin'), this.coinText),
    );
    this.preview = document.createElement('canvas');
    this.preview.className = 'hangar-rocket';
    const stats = h('div', { class: 'panel stats-panel' });
    for (const k of STAT_KEYS) {
      const row = h('div', { class: 'stat-row', 'data-testid': `stat-${k}` });
      this.statRows[k] = row;
      stats.append(row);
    }
    const boltzy = drawToCanvas(110, 110, (c, w, hh) => drawPortrait(c, CHAR_BY_ID.boltzy, w, hh, 'happy'));
    boltzy.className = 'tip-face';
    this.tip = h('div', { class: 'tip-text' }, 'Tap a part to try it on!');
    const tipBox = h('div', { class: 'tip-box' }, boltzy, this.tip);
    const plat = drawToCanvas(300, 100, (c, w, hh) => drawPlatform(c, w, hh));
    plat.className = 'hangar-platform';
    const left = h('div', { class: 'hangar-left' }, h('div', { class: 'preview-wrap' }, this.preview, plat), stats);
    const tabs = h('div', { class: 'tabs' });
    for (const t of TABS) {
      const b = button(t.label, t.icon, () => this.setTab(t.tab), { size: 'small', color: 'white', id: `tab-${t.tab}`, sound: 'tab' });
      b.classList.add('tab');
      this.tabBtns.set(t.tab, b);
      tabs.append(b);
    }
    this.cards = h('div', { class: 'cards scroll', 'data-testid': 'part-cards' });
    this.detail = h('div', { class: 'detail' });
    const right = h('div', { class: 'panel hangar-right' }, tabs, this.cards, this.detail);
    this.ui.append(header, h('div', { class: 'hangar-main' }, left, right), tipBox);
    this.ui.classList.add('menu-screen');
  }

  override enter(): void {
    S.state.emit({ type: 'visit', place: 'hangar' });
    if (!S.state.flag('hangarHello')) {
      S.state.setFlag('hangarHello');
      S.state.post({ kind: 'dialogue', id: 'hangar_hello' });
    }
    this.setTab('nose');
    this.redrawPreview();
  }

  override back(): boolean {
    void S.game.go('hub');
    return true;
  }

  override resize(w: number, h: number): void {
    this.bg.position.set(w / 2, h / 2);
    this.bg.scale.set(Math.max(w / 1600, h / 720));
  }

  override update(dt: number): void {
    this.t += dt;
    this.preview.style.transform = `translateY(${Math.sin(this.t * 2) * 6}px)`;
  }

  private setTab(tab: Tab): void {
    this.tab = tab;
    for (const [t, b] of this.tabBtns) b.classList.toggle('on', t === tab);
    this.selected = tab === 'stickers' ? null : (this.tryLoadout[tab] as string);
    this.renderCards();
    this.renderDetail();
  }

  private renderCards(): void {
    clear(this.cards);
    const save = S.state.data;
    if (this.tab === 'stickers') {
      if (!save.stickers.length) {
        this.cards.append(h('div', { class: 'empty-note' }, 'Find stickers on planets. Then stick them on your rocket!'));
        return;
      }
      for (const id of save.stickers) {
        const def = STICKER_BY_ID[id];
        if (!def) continue;
        const pic = drawToCanvas(72, 72, (c, w) => drawSticker(c, id, w / 2, w / 2, w * 0.45));
        const on = this.tryLoadout.stickers.includes(id);
        const card = h('button', { class: `card ${on ? 'equipped' : ''}`, type: 'button', 'data-testid': `sticker-${id}` }, pic, h('div', { class: 'card-name' }, def.name), on ? h('div', { class: 'card-status ok' }, iconEl('check'), 'On rocket') : null);
        card.addEventListener('click', () => this.toggleSticker(id));
        this.cards.append(card);
      }
      return;
    }
    const slot = this.tab;
    for (const p of PARTS.filter((q) => q.slot === slot)) {
      const owned = save.owned.includes(p.id);
      const equipped = save.loadout[slot] === p.id;
      const unlocked = isUnlocked(p.unlock, save);
      const thumb = drawToCanvas(64, 88, (c) => {
        c.scale(64 / ROCKET_W, 88 / ROCKET_H);
        drawRocket(c, { ...this.tryLoadout, [slot]: p.id });
      });
      if (!unlocked) thumb.style.filter = 'brightness(.3) saturate(0)';
      let status: HTMLElement;
      if (equipped) status = h('div', { class: 'card-status ok' }, iconEl('check'), 'Equipped');
      else if (owned) status = h('div', { class: 'card-status' }, 'Owned');
      else if (!unlocked) status = h('div', { class: 'card-status locked' }, iconEl('lock'), 'Locked');
      else status = h('div', { class: `card-status price ${save.coins >= p.price ? '' : 'poor'}` }, iconEl('coin'), String(p.price));
      const card = h('button', { class: `card ${this.selected === p.id ? 'sel' : ''} ${equipped ? 'equipped' : ''}`, type: 'button', 'data-testid': `part-${p.id}` }, thumb, h('div', { class: 'card-name' }, p.name), status);
      card.addEventListener('click', () => this.select(p.id));
      this.cards.append(card);
    }
  }

  private select(id: string): void {
    const p = PART_BY_ID[id];
    if (!p) return;
    this.selected = id;
    sfx('select');
    if (isUnlocked(p.unlock, S.state.data)) {
      (this.tryLoadout as unknown as Record<string, string>)[p.slot] = id;
      setText(this.tip, S.state.data.owned.includes(id) ? 'Looking good! Tap Equip to use it.' : 'Trying it on! Buy it to keep it.');
    } else setText(this.tip, 'That part is still locked. Keep exploring!');
    this.redrawPreview();
    this.renderCards();
    this.renderDetail();
  }

  private toggleSticker(id: string): void {
    const st = S.state;
    const on = st.data.loadout.stickers.includes(id);
    if (on) {
      const idx = st.data.loadout.stickers.indexOf(id) as 0 | 1;
      equipSticker(st, idx, null);
      sfx('click');
    } else {
      const slot = (st.data.loadout.stickers.length >= 2 ? 1 : st.data.loadout.stickers.length) as 0 | 1;
      equipSticker(st, slot, id);
      sfx('sticker');
    }
    this.tryLoadout.stickers = [...st.data.loadout.stickers];
    updateRocketTex(st.data.loadout);
    this.redrawPreview();
    this.renderCards();
  }

  private renderDetail(): void {
    clear(this.detail);
    if (this.tab === 'stickers') {
      this.detail.append(h('div', { class: 'detail-text' }, 'Tap a sticker to put it on your rocket. Tap again to take it off. You can use two!'));
      return;
    }
    const id = this.selected;
    const p = id ? PART_BY_ID[id] : null;
    if (!p) return;
    const save = S.state.data;
    const st = S.state;
    const speakBtn = button('Read to me', 'speaker', () => speak(`${p.name}. ${p.desc}`, { force: true }), { round: true, size: 'small', color: 'white', sound: null });
    let action: HTMLButtonElement;
    const equipped = save.loadout[p.slot] === p.id;
    if (equipped) action = button('Equipped!', 'check', () => {}, { color: 'green', disabled: true, id: 'btn-part-action' });
    else if (save.owned.includes(p.id)) {
      action = button('Equip', 'wrench', () => {
        equipPart(st, p.id);
        updateRocketTex(save.loadout);
        this.tryLoadout = { ...save.loadout, stickers: [...save.loadout.stickers] };
        sfx('equip');
        toast(`${p.name} equipped!`, 'wrench', 1800);
        setText(this.tip, 'Great choice, cadet!');
        this.renderCards();
        this.renderDetail();
        this.redrawPreview();
      }, { color: 'green', id: 'btn-part-action', sound: null });
    } else {
      const check = canBuy(save, p.id);
      if (check.ok) {
        action = button(`Buy for ${p.price}`, 'coin', () => {
          const r = buy(st, p.id);
          if (!r.ok) return;
          equipPart(st, p.id);
          updateRocketTex(save.loadout);
          this.tryLoadout = { ...save.loadout, stickers: [...save.loadout.stickers] };
          setText(this.coinText, String(save.coins));
          sfx('buy');
          toast(`You got the ${p.name}!`, 'gift', 2200);
          setText(this.tip, 'Woo-hoo! It is yours now!');
          this.renderCards();
          this.renderDetail();
          this.redrawPreview();
        }, { color: 'yellow', id: 'btn-part-action', sound: null });
      } else if (check.reason === 'coins') {
        action = button(`Need ${check.need} more`, 'coin', () => {}, { disabled: true, id: 'btn-part-action' });
      } else {
        action = button(unlockHint(p.unlock) || 'Locked', 'lock', () => {}, { disabled: true, id: 'btn-part-action' });
      }
    }
    this.detail.append(
      h('div', { class: 'detail-info' }, h('div', { class: 'h3' }, p.name), h('div', { class: 'detail-text' }, p.desc)),
      speakBtn,
      action,
    );
  }

  private redrawPreview(): void {
    const res = Math.min(2, window.devicePixelRatio || 1) * 1.6;
    const W = ROCKET_W * 1.6;
    const H = ROCKET_H * 1.6;
    this.preview.width = Math.ceil(W * res);
    this.preview.height = Math.ceil(H * res);
    this.preview.style.width = `${W}px`;
    this.preview.style.height = `${H}px`;
    const c = this.preview.getContext('2d')!;
    c.setTransform(res * 1.6, 0, 0, res * 1.6, 0, 0);
    c.clearRect(0, 0, ROCKET_W, ROCKET_H);
    drawRocket(c, this.tryLoadout, 0);
    // Stats: equipped vs. trying on.
    const now = statStars(S.state.data.loadout);
    const next = statStars(this.tryLoadout);
    for (const k of STAT_KEYS) {
      const row = this.statRows[k];
      clear(row);
      row.append(iconEl(STAT_INFO[k].icon), h('span', { class: 'stat-label' }, STAT_INFO[k].label));
      const stars = h('span', { class: 'stars big' });
      for (let i = 1; i <= 5; i++) {
        const nextIco = starIcon(next[k], i);
        const nowIco = starIcon(now[k], i);
        const rank = (x: string) => (x === 'star' ? 2 : x === 'starHalf' ? 1 : 0);
        const cls = rank(nextIco) > rank(nowIco) ? 'up' : rank(nextIco) < rank(nowIco) ? 'down' : '';
        const s = h('span', { class: `star ${cls}` });
        s.innerHTML = icon(nextIco);
        stars.append(s);
      }
      row.append(stars);
      row.setAttribute('aria-label', `${STAT_INFO[k].label}: ${next[k]} stars`);
    }
  }
}
