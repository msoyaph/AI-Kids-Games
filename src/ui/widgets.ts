/** Toasts, pickup notices, modals and the screen fader. */
import { clear, h } from './dom';
import { icon } from './icons';

export class Toasts {
  private box: HTMLElement;
  private pick: HTMLElement;
  constructor(parent: HTMLElement) {
    this.box = h('div', { class: 'toasts', 'aria-live': 'polite' });
    this.pick = h('div', { class: 'pickup' });
    parent.appendChild(this.box);
    parent.appendChild(this.pick);
  }
  show(text: string, ico?: string, ms = 3200): void {
    // de-duplicate identical toasts already visible
    for (const c of Array.from(this.box.children)) if ((c as HTMLElement).dataset.t === text) return;
    const t = h('div', { class: 'toast panel', 'data-t': text }, ico ? icon(ico, 24) : null, h('span', null, text));
    this.box.appendChild(t);
    while (this.box.children.length > 4) this.box.firstElementChild?.remove();
    setTimeout(() => t.classList.add('out'), ms);
    setTimeout(() => t.remove(), ms + 450);
  }
  pickup(ico: string, text: string): void {
    const t = h('div', { class: 'item panel' }, icon(ico, 24), h('span', null, text));
    this.pick.appendChild(t);
    while (this.pick.children.length > 5) this.pick.firstElementChild?.remove();
    setTimeout(() => t.remove(), 2200);
  }
}

export interface ModalButton {
  label: string;
  cls?: string;
  onClick?: () => void | boolean;
  /** keyboard default */
  primary?: boolean;
}

/** Modal stack; the game pauses while any modal is open. */
export class Modals {
  private layer: HTMLElement;
  private stack: { el: HTMLElement; onClose?: () => void; cancel?: () => void }[] = [];
  onChange: (open: boolean) => void = () => {};
  constructor(parent: HTMLElement) {
    this.layer = h('div', { class: 'layer', style: 'z-index:70' });
    parent.appendChild(this.layer);
  }
  get open(): boolean {
    return this.stack.length > 0;
  }
  /** Show arbitrary content; returns a close function. */
  show(content: HTMLElement, opts: { onClose?: () => void; cancel?: () => void; bare?: boolean; light?: boolean } = {}): () => void {
    const bg = h('div', { class: 'modal-bg' + (opts.light ? ' light' : '') });
    if (opts.bare) bg.appendChild(content);
    else bg.appendChild(h('div', { class: 'modal panel', role: 'dialog', 'aria-modal': 'true' }, content));
    bg.addEventListener('pointerdown', (e) => {
      if (e.target === bg && opts.cancel) {
        opts.cancel();
        close();
      }
    });
    this.layer.appendChild(bg);
    const entry = { el: bg, onClose: opts.onClose, cancel: opts.cancel };
    this.stack.push(entry);
    this.onChange(true);
    const close = () => {
      const i = this.stack.indexOf(entry);
      if (i < 0) return;
      this.stack.splice(i, 1);
      bg.remove();
      entry.onClose?.();
      this.onChange(this.stack.length > 0);
    };
    setTimeout(() => (bg.querySelector('button.primary, button, input') as HTMLElement | null)?.focus(), 30);
    return close;
  }
  /** Close the top modal via cancel (Esc). Returns true if one was closed. */
  cancelTop(): boolean {
    const top = this.stack[this.stack.length - 1];
    if (!top) return false;
    if (!top.cancel) return true; // modal requires an explicit choice
    top.cancel();
    const i = this.stack.indexOf(top);
    if (i >= 0) {
      this.stack.splice(i, 1);
      top.el.remove();
      top.onClose?.();
      this.onChange(this.stack.length > 0);
    }
    return true;
  }
  closeAll(): void {
    while (this.stack.length) {
      const t = this.stack.pop()!;
      t.el.remove();
      t.onClose?.();
    }
    this.onChange(false);
  }
  /** Simple message/choice dialog. */
  ask(title: string, body: string | HTMLElement, buttons: ModalButton[], cancellable = true): () => void {
    let close: () => void = () => {};
    const acts = h('div', { class: 'actions' });
    for (const b of buttons) {
      const btn = h('button', { class: `btn ${b.cls ?? ''} ${b.primary ? 'primary' : ''}` }, b.label);
      btn.addEventListener('click', () => {
        const keep = b.onClick?.();
        if (keep !== true) close();
      });
      acts.appendChild(btn);
    }
    const content = h('div', null, title ? h('h2', null, title) : null, typeof body === 'string' ? h('p', null, body) : body, acts);
    close = this.show(content, { cancel: cancellable ? () => {} : undefined });
    return close;
  }
}

export class Fader {
  private el: HTMLElement;
  private msg: HTMLElement;
  constructor(parent: HTMLElement) {
    this.msg = h('div', { class: 'msg' });
    this.el = h('div', { class: 'fade', style: 'z-index:60' }, this.msg);
    parent.appendChild(this.el);
  }
  async out(text = '', ms = 600): Promise<void> {
    this.msg.textContent = text;
    this.el.style.transitionDuration = ms + 'ms';
    this.el.classList.add('on');
    await wait(ms);
  }
  async in(ms = 600): Promise<void> {
    this.el.style.transitionDuration = ms + 'ms';
    this.el.classList.remove('on');
    await wait(ms);
    clear(this.msg);
  }
}

export const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
