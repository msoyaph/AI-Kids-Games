// Dialogue box: typewriter text, name tag, expression portraits and choices (promise-based).
import type { CharacterLook } from '../data/villagers';
import type { Command } from '../input/input';
import type { Line } from '../sim/talk';
import { btn, clear, h, type Panel, type UIManager } from './dom';
import { portraitURL } from './portraits';

export interface Speaker {
  id: string;
  name: string;
  look?: CharacterLook;
  voice: number;
  title?: string;
}

export class DialogueBox implements Panel {
  el: HTMLElement;
  modal = true;
  sticky = true;
  private portrait = h('img', { class: 'dlg-portrait', alt: '' }) as HTMLImageElement;
  private nameTag = h('div', { class: 'dlg-name' });
  private text = h('div', { class: 'dlg-text' });
  private more = h('div', { class: 'dlg-more' }, '▼');
  private choices = h('div', { class: 'dlg-choices' });
  private full = '';
  private shown = 0;
  private acc = 0;
  private resolveLine: (() => void) | null = null;
  private resolveChoice: ((i: number) => void) | null = null;
  private choiceCount = 0;
  private speaker: Speaker;

  constructor(
    private ui: UIManager,
    speaker: Speaker,
    private cps: () => number,
    private blip: (voice: number) => void,
  ) {
    this.speaker = speaker;
    this.el = h(
      'div',
      { class: 'dlg-wrap' },
      h('div', { class: 'dlg', onclick: () => this.advance() }, h('div', { class: 'dlg-left' }, this.portrait), h('div', { class: 'dlg-body' }, this.nameTag, this.text, this.more)),
      this.choices,
    );
    this.setSpeaker(speaker);
  }

  setSpeaker(s: Speaker): void {
    this.speaker = s;
    this.nameTag.textContent = s.name;
    this.nameTag.style.display = s.id === 'narrator' ? 'none' : '';
    this.portrait.style.display = s.look ? '' : 'none';
    if (s.look) this.portrait.src = portraitURL(s.id, s.look, 'neutral');
  }

  open(): void {
    if (!this.ui.has(this)) this.ui.push(this);
  }

  close(): void {
    if (this.ui.has(this)) this.ui.pop(this);
  }

  /** Show lines one after another; resolves after the last is dismissed. */
  async say(lines: Line[]): Promise<void> {
    this.open();
    for (const l of lines) await this.showLine(l);
  }

  private showLine(l: Line): Promise<void> {
    if (this.speaker.look) this.portrait.src = portraitURL(this.speaker.id, this.speaker.look, l.expr);
    this.portrait.classList.remove('bounce');
    void this.portrait.offsetWidth;
    this.portrait.classList.add('bounce');
    this.full = l.text;
    this.shown = 0;
    this.acc = 0;
    this.text.textContent = '';
    this.more.style.visibility = 'hidden';
    clear(this.choices);
    return new Promise((res) => (this.resolveLine = res));
  }

  /** Ask a question; resolves with the chosen option index. */
  async ask(prompt: Line, options: string[]): Promise<number> {
    this.open();
    if (this.speaker.look) this.portrait.src = portraitURL(this.speaker.id, this.speaker.look, prompt.expr);
    this.full = prompt.text;
    this.shown = 0;
    this.acc = 0;
    this.more.style.visibility = 'hidden';
    clear(this.choices);
    this.choiceCount = options.length;
    return new Promise((res) => {
      this.resolveChoice = res;
      options.forEach((o, i) => {
        const b = btn(o, () => this.choose(i), 'dlg-choice');
        b.style.display = 'none';
        this.choices.appendChild(b);
      });
    });
  }

  private choose(i: number): void {
    const r = this.resolveChoice;
    if (!r) return;
    this.resolveChoice = null;
    clear(this.choices);
    r(i);
  }

  private typing(): boolean {
    return this.shown < this.full.length;
  }

  private revealChoices(): void {
    const btns = Array.from(this.choices.children) as HTMLElement[];
    if (btns.length && btns[0]!.style.display === 'none') {
      btns.forEach((b) => (b.style.display = ''));
      this.ui.focus(btns[0]!);
    }
  }

  advance(): void {
    if (this.typing()) {
      this.shown = this.full.length;
      this.text.textContent = this.full;
      if (this.resolveChoice) this.revealChoices();
      else this.more.style.visibility = 'visible';
      return;
    }
    if (this.resolveChoice) return;
    const r = this.resolveLine;
    this.resolveLine = null;
    r?.();
  }

  command(c: Command): boolean {
    if (this.resolveChoice && !this.typing()) {
      if (c === 'back' || c === 'cancel') {
        this.choose(this.choiceCount - 1);
        return true;
      }
      return false; // default nav + confirm clicks the focused choice
    }
    if (c === 'confirm' || c === 'back' || c === 'cancel') {
      this.advance();
      return true;
    }
    return c === 'action' || c === 'pause';
  }

  update(dt: number): void {
    if (!this.typing()) return;
    this.acc += dt * this.cps();
    const before = this.shown;
    this.shown = Math.min(this.full.length, Math.floor(this.acc));
    if (this.shown !== before) {
      this.text.textContent = this.full.slice(0, this.shown);
      const ch = this.full[this.shown - 1] ?? '';
      if (this.shown % 2 === 0 && /[a-z0-9]/i.test(ch)) this.blip(this.speaker.voice);
    }
    if (!this.typing()) {
      if (this.resolveChoice) this.revealChoices();
      else this.more.style.visibility = 'visible';
    }
  }
}
