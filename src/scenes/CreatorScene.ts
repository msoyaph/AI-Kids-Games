import { Scene } from '../app/Scene';
import { S } from '../app/services';
import { startSession } from '../app/session';
import { sfx } from '../audio/sfx';
import { Rng } from '../core/rng';
import type { AstronautLook, Difficulty } from '../data/types';
import { drawToCanvas } from '../gfx/atlas';
import { drawAstronautBust, drawAstronautSide, FACES, HAIR_COLORS, HAIR_STYLES, HELMETS, SKIN_TONES, SUIT_COLORS } from '../gfx/art/characters';
import { Starfield } from '../gfx/starfield';
import { createSave, defaultProfile } from '../systems/save/schema';
import { clear, h } from '../ui/dom';
import { speak } from '../ui/speech';
import { button, iconEl } from '../ui/widgets';

export interface CreatorParams {
  slot: number;
}

const NAMES = ['Nova', 'Comet', 'Astro', 'Luna', 'Orbit', 'Sky', 'Zoom', 'Juno', 'Kiko', 'Remy', 'Tali', 'Pixel', 'Echo', 'Sunny', 'Ziggy', 'Rory', 'Indy', 'Mika', 'Bo', 'Starling'];

/** Make your astronaut: name, suit, helmet, face. */
export class CreatorScene extends Scene {
  private stars = new Starfield(['#4c7dff', '#ff7ad9'], 'creator');
  private look: AstronautLook;
  private difficulty: Difficulty = 'easy';
  private preview: HTMLElement;
  private side: HTMLElement;
  private nameInput: HTMLInputElement;
  private sections: HTMLElement;
  private t = 0;
  private rng = new Rng(Date.now());

  constructor(private readonly p: CreatorParams) {
    super('creator');
    this.music = 'title';
    this.root.addChild(this.stars);
    this.look = { ...defaultProfile(), name: '' };
    this.look.skin = SKIN_TONES[this.rng.int(0, SKIN_TONES.length - 1)];
    this.look.suit = SUIT_COLORS[this.rng.int(0, SUIT_COLORS.length - 1)];
    this.preview = h('div', { class: 'creator-preview' });
    this.side = h('div', { class: 'creator-side' });
    this.nameInput = h('input', { class: 'name-input', type: 'text', maxlength: '12', placeholder: 'Your name', 'data-testid': 'name-input', 'aria-label': 'Your name', autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false' }) as HTMLInputElement;
    this.nameInput.addEventListener('input', () => {
      this.look.name = this.nameInput.value;
    });
    this.nameInput.addEventListener('keydown', (e) => e.stopPropagation());
    this.sections = h('div', { class: 'creator-sections scroll' });
    const header = h(
      'div',
      { class: 'scr-header' },
      button('Back', 'back', () => this.back(), { round: true, color: 'white', id: 'btn-back' }),
      h('div', { class: 'title' }, 'Make your astronaut'),
    );
    const start = button('Start!', 'rocket', () => this.start(), { color: 'green', size: 'big', id: 'btn-start' });
    this.ui.append(header, h('div', { class: 'board-main' }, h('div', { class: 'creator-left' }, this.preview, this.side, start), h('div', { class: 'panel creator-right' }, this.sections)));
    this.ui.classList.add('menu-screen');
  }

  override enter(): void {
    this.build();
    this.refresh();
    speak('Make your astronaut! Pick a name and colors.');
  }

  override back(): boolean {
    void S.game.go('slots');
    return true;
  }

  override resize(w: number, hh: number): void {
    this.stars.resize(w, hh);
  }

  override render(): void {
    this.t += 1 / 60;
    this.stars.update(this.t * 15, 0, 1 / 60);
  }

  private section(title: string, body: HTMLElement): HTMLElement {
    return h('div', { class: 'cr-section' }, h('div', { class: 'cr-title' }, title), body);
  }

  private swatches(colors: readonly string[], get: () => string, set: (c: string) => void, testId: string): HTMLElement {
    const row = h('div', { class: 'swatches' });
    colors.forEach((c, i) => {
      const b = h('button', { class: `swatch ${get() === c ? 'on' : ''}`, type: 'button', style: `background:${c}`, 'data-testid': `${testId}-${i}`, 'aria-label': `Color ${i + 1}` });
      b.addEventListener('click', () => {
        set(c);
        sfx('select');
        for (const x of row.children) x.classList.toggle('on', x === b);
        this.refresh();
      });
      row.append(b);
    });
    return row;
  }

  private choices<T extends string>(opts: readonly T[], get: () => T | string, set: (v: T) => void, draw: (v: T) => HTMLCanvasElement, testId: string): HTMLElement {
    const row = h('div', { class: 'choices' });
    for (const o of opts) {
      const b = h('button', { class: `choice ${get() === o ? 'on' : ''}`, type: 'button', 'data-testid': `${testId}-${o}` }, draw(o));
      b.addEventListener('click', () => {
        set(o);
        sfx('select');
        for (const x of row.children) x.classList.toggle('on', x === b);
        this.refresh();
      });
      row.append(b);
    }
    return row;
  }

  private build(): void {
    clear(this.sections);
    const L = this.look;
    const mini = (patch: Partial<AstronautLook>) => drawToCanvas(64, 64, (c, w) => drawAstronautBust(c, { ...L, ...patch }, w / 2, w * 0.45, w * 0.3));
    const dice = button('Pick for me', 'sparkle', () => {
      this.nameInput.value = NAMES[this.rng.int(0, NAMES.length - 1)];
      this.look.name = this.nameInput.value;
      sfx('select');
    }, { size: 'small', color: 'white', id: 'btn-random-name' });
    this.sections.append(
      this.section('Your name', h('div', { class: 'row' }, this.nameInput, dice)),
      this.section('Suit color', this.swatches(SUIT_COLORS, () => L.suit, (c) => (L.suit = c), 'suit')),
      this.section('Stripe color', this.swatches(SUIT_COLORS, () => L.accent, (c) => (L.accent = c), 'accent')),
      this.section('Helmet', this.choices(HELMETS, () => L.helmet, (v) => (L.helmet = v), (v) => mini({ helmet: v }), 'helmet')),
      this.section('Skin', this.swatches(SKIN_TONES, () => L.skin, (c) => (L.skin = c), 'skin')),
      this.section('Hair', this.choices(HAIR_STYLES, () => L.hairStyle, (v) => (L.hairStyle = v), (v) => mini({ hairStyle: v }), 'hair')),
      this.section('Hair color', this.swatches(HAIR_COLORS, () => L.hair, (c) => (L.hair = c), 'haircolor')),
      this.section('Face', this.choices(FACES, () => L.face, (v) => (L.face = v), (v) => mini({ face: v }), 'face')),
      this.section('How hard?', this.difficultyPicker()),
    );
  }

  private difficultyPicker(): HTMLElement {
    const row = h('div', { class: 'row wrap' });
    const mk = (d: Difficulty, label: string, sub: string, icon: string) => {
      const b = h('button', { class: `diff-card ${this.difficulty === d ? 'on' : ''}`, type: 'button', 'data-testid': `diff-${d}` }, iconEl(icon), h('div', { class: 'h3' }, label), h('div', { class: 'muted' }, sub));
      b.addEventListener('click', () => {
        this.difficulty = d;
        sfx('select');
        for (const x of row.children) x.classList.toggle('on', x === b);
      });
      return b;
    };
    row.append(mk('easy', 'Easy', 'Lots of help. Great for ages 6-7.', 'heart'), mk('normal', 'Normal', 'A bit more challenge.', 'star'));
    row.append(h('div', { class: 'muted' }, 'You can change this any time in Settings.'));
    return row;
  }

  private refresh(): void {
    const L = this.look;
    this.preview.replaceChildren(drawToCanvas(260, 260, (c, w) => drawAstronautBust(c, L, w / 2, w * 0.4, w * 0.26)));
    this.side.replaceChildren(drawToCanvas(110, 134, (c, w, hh) => {
      c.scale(w / 72, hh / 88);
      drawAstronautSide(c, L, 'idle', 72, 88);
    }));
  }

  private start(): void {
    const name = (this.nameInput.value || '').replace(/[^\p{L}\p{N} '-]/gu, '').trim().slice(0, 12) || NAMES[this.rng.int(0, NAMES.length - 1)];
    this.look.name = name;
    const save = createSave(this.p.slot, { ...this.look }, this.difficulty);
    sfx('launchUi');
    startSession(save);
    void S.game.go('hub');
  }
}
