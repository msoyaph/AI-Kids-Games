import { Sprite } from 'pixi.js';
import { Scene } from '../app/Scene';
import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { CATEGORY_NAMES, CODEX, CODEX_BY_ID, type CodexCategory } from '../data/codex';
import { factsFor } from '../data/facts';
import { codexPicture } from '../ui/pictures';
import { drawLounge } from '../gfx/art/rooms';
import { ensureTex } from '../gfx/textures';
import { codexPercent } from '../systems/codex';
import { clear, h } from '../ui/dom';
import { speak } from '../ui/speech';
import { button, iconEl } from '../ui/widgets';

const TABS: Array<{ cat: CodexCategory; icon: string }> = [
  { cat: 'planet', icon: 'planet' },
  { cat: 'moon', icon: 'eye' },
  { cat: 'dwarf', icon: 'star' },
  { cat: 'star', icon: 'sparkle' },
  { cat: 'space', icon: 'target' },
  { cat: 'tech', icon: 'rocket' },
  { cat: 'story', icon: 'alien' },
];


/** The Space Codex: an encyclopedia of everything you have discovered. */
export class CodexScene extends Scene {
  private cat: CodexCategory = 'planet';
  private selected: string | null = null;
  private grid: HTMLElement;
  private detail: HTMLElement;
  private tabBtns = new Map<CodexCategory, HTMLButtonElement>();

  constructor() {
    super('codex');
    this.music = 'hub';
    const bg = new Sprite(ensureTex('room_lounge', 1600, 720, (c, w, hh) => drawLounge(c, w, hh), 0.5, 0.5, 1));
    bg.alpha = 0.5;
    this.root.addChild(bg);
    this.onResizeBg = (w, hh) => {
      bg.position.set(w / 2, hh / 2);
      bg.scale.set(Math.max(w / 1600, hh / 720));
    };
    const d = S.state.data;
    const known = d.codex.filter((c) => CODEX_BY_ID[c]).length;
    const tabs = h('div', { class: 'tabs' });
    for (const t of TABS) {
      const b = button(CATEGORY_NAMES[t.cat], t.icon, () => this.setCat(t.cat), { size: 'small', color: 'white', id: `codex-tab-${t.cat}`, sound: 'tab' });
      b.classList.add('tab');
      this.tabBtns.set(t.cat, b);
      tabs.append(b);
    }
    const header = h(
      'div',
      { class: 'scr-header' },
      button('Back', 'back', () => this.back(), { round: true, color: 'white', id: 'btn-back' }),
      h('div', { class: 'title' }, 'Space Codex'),
      h('div', { class: 'spacer' }),
      h('div', { class: 'pill', 'data-testid': 'codex-progress' }, iconEl('book'), `${known} / ${CODEX.length} (${codexPercent(d.codex)}%)`),
    );
    this.grid = h('div', { class: 'cards scroll codex-grid', 'data-testid': 'codex-grid' });
    this.detail = h('div', { class: 'panel codex-detail scroll' });
    this.ui.append(header, h('div', { class: 'board-main' }, h('div', { class: 'panel col codex-left' }, tabs, this.grid), this.detail));
    this.ui.classList.add('menu-screen');
  }

  private onResizeBg: (w: number, h: number) => void;

  override enter(): void {
    S.state.emit({ type: 'visit', place: 'codex' });
    this.setCat('planet');
  }

  override back(): boolean {
    void S.game.go('hub');
    return true;
  }

  override resize(w: number, hh: number): void {
    this.onResizeBg(w, hh);
  }

  private setCat(cat: CodexCategory): void {
    this.cat = cat;
    for (const [k, b] of this.tabBtns) b.classList.toggle('on', k === cat);
    const list = CODEX.filter((e) => e.category === cat);
    const found = list.find((e) => S.state.data.codex.includes(e.id));
    this.selected = found?.id ?? list[0]?.id ?? null;
    this.renderGrid();
    this.renderDetail();
  }

  private renderGrid(): void {
    clear(this.grid);
    const have = new Set(S.state.data.codex);
    for (const e of CODEX.filter((x) => x.category === this.cat)) {
      const known = have.has(e.id);
      const pic = codexPicture(e, 80);
      if (!known) pic.style.filter = 'brightness(0) opacity(.45)';
      const card = h('button', { class: `card codex-card ${this.selected === e.id ? 'sel' : ''}`, type: 'button', 'data-testid': `codex-${e.id}` }, pic, h('div', { class: 'card-name' }, known ? e.name : '???'));
      card.addEventListener('click', () => {
        this.selected = e.id;
        sfx('select');
        this.renderGrid();
        this.renderDetail();
      });
      this.grid.append(card);
    }
  }

  private renderDetail(): void {
    clear(this.detail);
    const e = this.selected ? CODEX_BY_ID[this.selected] : null;
    if (!e) return;
    const known = S.state.data.codex.includes(e.id);
    const pic = codexPicture(e, 170);
    if (!known) {
      pic.style.filter = 'brightness(0) opacity(.45)';
      this.detail.append(h('div', { class: 'row' }, pic, h('div', { class: 'grow' }, h('div', { class: 'h2' }, 'Not found yet!'), h('div', { class: 'detail-text' }, e.hint))));
      return;
    }
    const tag = e.id === 'wormhole' ? h('span', { class: 'tag story' }, 'Science idea') : e.real ? h('span', { class: 'tag real' }, 'Real') : h('span', { class: 'tag story' }, 'Story (made up)');
    const facts = factsFor(e.id);
    const list = h('div', { class: 'fact-list' });
    for (const f of facts) {
      list.append(h('div', { class: 'fact' }, button('Read', 'speaker', () => speak(f.text, { force: true }), { round: true, size: 'small', color: 'white', sound: null }), h('span', null, f.text)));
    }
    const readAll = button('Read to me', 'speaker', () => speak([e.name, e.blurb, ...facts.map((f) => f.text)].join(' '), { force: true }), { size: 'small', color: 'white', id: 'btn-codex-read', sound: null });
    this.detail.append(h('div', { class: 'row' }, pic, h('div', { class: 'grow col' }, h('div', { class: 'h2' }, e.name), h('div', { class: 'row' }, tag), h('div', { class: 'detail-text' }, e.blurb), readAll)));
    if (facts.length) this.detail.append(h('div', { class: 'h3' }, 'Fun facts'), list);
  }
}
