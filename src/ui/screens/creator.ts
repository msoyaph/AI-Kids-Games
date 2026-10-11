// Character creator: name, colors and simple face options, plus the island seed.
import { hexCss } from '../../core/math';
import type { Input } from '../../input/input';
import { EYE_STYLES, HAIR_COLORS, HAIR_STYLES, MOUTH_STYLES, OUTFIT_COLORS, SKIN_TONES } from '../../render/models/character';
import type { Appearance } from '../../sim/state';
import { btn, h, type Panel, type UIManager } from '../dom';

const NAMES = ['Wren', 'Juniper', 'Pip', 'Marlo', 'Sunny', 'Ivy', 'Rowan', 'Kit', 'Clover', 'Bea', 'Olly', 'Fern', 'Remy', 'Tali'];

export class CreatorScreen implements Panel {
  el: HTMLElement;
  modal = true;
  covers = true;
  look: Appearance;
  name: string;
  seed: string;
  private nameIn: HTMLInputElement;
  private seedIn: HTMLInputElement;

  constructor(
    private ui: UIManager,
    input: Input,
    initial: Appearance,
    private opts: { onChange: (look: Appearance) => void; onDone: (name: string, look: Appearance, seed: number) => void; onBack: () => void },
  ) {
    this.look = { ...initial };
    this.name = NAMES[Math.floor(Math.random() * NAMES.length)]!;
    this.seed = String(Math.floor(Math.random() * 999999));
    const textIn = (val: string, max: number, onInput: (v: string) => void) => {
      const el = h('input', { class: 'textin', 'data-nav': '', value: val, maxlength: String(max), spellcheck: 'false' }) as HTMLInputElement;
      el.addEventListener('focus', () => (input.textFocus = true));
      el.addEventListener('blur', () => (input.textFocus = false));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') el.blur();
        e.stopPropagation();
      });
      el.addEventListener('input', () => onInput(el.value));
      return el;
    };
    this.nameIn = textIn(this.name, 12, (v) => (this.name = v));
    this.seedIn = textIn(this.seed, 9, (v) => (this.seed = v.replace(/[^0-9]/g, '')));
    const swatches = (key: keyof Appearance, colors: number[]) =>
      h(
        'div',
        { class: 'row wrap' },
        colors.map((c, i) => {
          const b = h('button', { class: `swatch ${this.look[key] === i ? 'sel' : ''}`, 'data-nav': '', style: `background:${hexCss(c)}` });
          b.addEventListener('click', () => {
            (this.look[key] as number) = i;
            b.parentElement!.querySelectorAll('.swatch').forEach((e) => e.classList.remove('sel'));
            b.classList.add('sel');
            this.opts.onChange(this.look);
          });
          return b;
        }),
      );
    const chips = (key: keyof Appearance, labels: string[]) =>
      h(
        'div',
        { class: 'row wrap' },
        labels.map((l, i) => {
          const b = h('button', { class: `chip ${this.look[key] === i ? 'sel' : ''}`, 'data-nav': '' }, l);
          b.addEventListener('click', () => {
            (this.look[key] as number) = i;
            b.parentElement!.querySelectorAll('.chip').forEach((e) => e.classList.remove('sel'));
            b.classList.add('sel');
            this.opts.onChange(this.look);
          });
          return b;
        }),
      );
    const blush = h('button', { class: `chip ${this.look.blush ? 'sel' : ''}`, 'data-nav': '' }, 'Rosy cheeks');
    blush.addEventListener('click', () => {
      this.look.blush = !this.look.blush;
      blush.classList.toggle('sel', this.look.blush);
      this.opts.onChange(this.look);
    });
    const row = (label: string, el: HTMLElement) => h('div', { class: 'opt-row' }, h('label', null, label), el);
    this.el = h(
      'div',
      { class: 'screen', style: 'align-items:flex-end;padding-right:3vw' },
      h(
        'div',
        { class: 'panel creator scroll', style: 'position:relative' },
        h('h2', null, 'Who are you?'),
        row('Name', h('div', { class: 'row', style: 'flex:1' }, this.nameIn, btn('🎲', () => this.randomName(), 'small'))),
        row('Skin', swatches('skin', SKIN_TONES)),
        row('Hair', chips('hair', HAIR_STYLES)),
        row('Hair color', swatches('hairColor', HAIR_COLORS)),
        row('Eyes', chips('eyes', EYE_STYLES)),
        row('Mouth', chips('mouth', MOUTH_STYLES)),
        row('Extras', blush),
        row('Outfit', swatches('outfit', OUTFIT_COLORS)),
        row('Island seed', h('div', { class: 'row', style: 'flex:1' }, this.seedIn, btn('🎲', () => this.randomSeed(), 'small'))),
        h('div', { class: 'tiny muted', style: 'margin:-2px 0 10px 104px' }, 'The same seed always grows the same island.'),
        h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:8px' }, btn('Back', () => this.opts.onBack(), 'small'), btn('Set sail!', () => this.done(), 'primary')),
      ),
    );
    void this.ui;
  }

  private randomName(): void {
    this.name = NAMES[Math.floor(Math.random() * NAMES.length)]!;
    this.nameIn.value = this.name;
  }

  private randomSeed(): void {
    this.seed = String(Math.floor(Math.random() * 999999));
    this.seedIn.value = this.seed;
  }

  private done(): void {
    const name = this.name.trim() || 'Islander';
    const seed = Number(this.seed) || Math.floor(Math.random() * 999999);
    this.opts.onDone(name.slice(0, 12), this.look, seed);
  }

  command(c: string): boolean {
    if (c === 'back' || c === 'cancel') {
      this.opts.onBack();
      return true;
    }
    return false;
  }
}
