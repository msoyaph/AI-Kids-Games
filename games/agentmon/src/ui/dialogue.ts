/**
 * The dialogue box: a speaker tag, the line typing out (any press shows it all, the next press
 * goes on), a 🔊 button to hear it again, and Yes/No style choices. Lines are read aloud
 * automatically when the read-aloud setting is on. Promise-based, for the script runner.
 */
import type { Input } from '../input/input';
import { h, wait } from './dom';
import type { FocusManager } from './focus';
import { speak, speechAvailable, stopSpeaking } from './speech';

export interface DialogueOptions {
  readAloud: () => boolean;
  textSpeed: () => 'slow' | 'normal' | 'fast';
  /** Instant text (reduced motion or tests). */
  instant: () => boolean;
}

export class Dialogue {
  readonly el: HTMLElement;
  private who: HTMLElement;
  private text: HTMLElement;
  private more: HTMLElement;
  private choices: HTMLElement;
  private voice: HTMLButtonElement;
  private current = '';
  open = false;

  constructor(private input: Input, private focus: FocusManager, private opts: DialogueOptions, parent: HTMLElement) {
    this.who = h('div.dlg-who');
    this.text = h('p.dlg-text', { 'aria-live': 'polite' });
    this.more = h('div.dlg-more', { 'aria-hidden': 'true' }, '▼');
    this.choices = h('div.dlg-choices');
    this.voice = h('button.dlg-voice', { type: 'button', 'aria-label': 'Read this aloud', title: 'Read aloud' }, '🔊');
    this.voice.addEventListener('click', e => { e.stopPropagation(); speak(this.current); });
    this.el = h('div.dlg', { role: 'dialog', 'aria-label': 'Conversation', hidden: true }, this.who, this.text, this.more, this.voice, this.choices);
    parent.appendChild(this.el);
  }

  private show(who?: string): void {
    this.open = true;
    this.el.hidden = false;
    this.who.textContent = who ?? '';
    this.who.hidden = !who;
    this.voice.hidden = !speechAvailable();
    this.choices.replaceChildren();
  }

  close(): void {
    this.open = false;
    this.el.hidden = true;
    stopSpeaking();
  }

  /** Wait for A, a tap on the box, or Enter/Space. */
  private nextPress(): Promise<void> {
    return new Promise(resolve => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        this.el.removeEventListener('pointerup', onTap);
        cancelAnimationFrame(raf);
        resolve();
      };
      const onTap = (e: Event) => { if ((e.target as HTMLElement).closest('.dlg-voice, .dlg-choices')) return; finish(); };
      this.el.addEventListener('pointerup', onTap);
      this.input.clearPresses();
      let raf = 0;
      const poll = () => {
        if (this.input.consume('a') || this.input.consume('b')) return finish();
        raf = requestAnimationFrame(poll);
      };
      raf = requestAnimationFrame(poll);
    });
  }

  private async type(line: string): Promise<void> {
    this.current = line;
    this.more.hidden = true;
    if (this.opts.readAloud()) speak(line);
    if (this.opts.instant()) { this.text.textContent = line; return; }
    const cps = { slow: 28, normal: 50, fast: 110 }[this.opts.textSpeed()];
    let tapped = false;
    const onTap = (e: Event) => { if (!(e.target as HTMLElement).closest('.dlg-voice, .dlg-choices')) tapped = true; };
    this.el.addEventListener('pointerup', onTap);
    this.input.clearPresses();
    const t0 = performance.now();
    for (;;) {
      const n = Math.min(line.length, Math.floor(((performance.now() - t0) / 1000) * cps) + 1);
      this.text.textContent = line.slice(0, n);
      if (n >= line.length) break;
      if (tapped || this.input.consume('a') || this.input.consume('b')) break;
      await wait(16);
    }
    this.el.removeEventListener('pointerup', onTap);
    this.text.textContent = line;
    this.input.clearPresses();
  }

  async say(line: string, who?: string): Promise<void> {
    this.show(who);
    await this.type(line);
    this.more.hidden = false;
    await this.nextPress();
  }

  /** A question with choices (returns the index picked; B picks the last option). */
  async ask(line: string, options: string[], who?: string): Promise<number> {
    this.show(who);
    await this.type(line);
    return new Promise(resolve => {
      const layer = {
        el: this.choices,
        back: () => pick(options.length - 1),
      };
      const pick = (i: number) => {
        this.focus.pop(layer);
        this.choices.replaceChildren();
        resolve(i);
      };
      options.forEach((o, i) => this.choices.append(h('button', { type: 'button', ...(i === 0 ? { 'data-autofocus': true } : {}), onclick: () => pick(i) }, o)));
      this.focus.push(layer);
    });
  }
}
