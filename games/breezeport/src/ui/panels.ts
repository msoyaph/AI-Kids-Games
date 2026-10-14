// Adapted from games/fieldlark/src/ui/panels.ts (the shared engine): only comments changed.
/**
 * Menus and cards over the town: a stack of panels (the top one has the controls; the farm clock
 * stops while any is open), toasts, and focus navigation for keyboards and gamepads (arrow keys or
 * the d-pad move between buttons by where they are on screen; A or Enter presses, B or Escape goes
 * back).
 */
import { h } from './h';
import { icon } from './icons';
import { sfx } from '../audio/engine';

export interface PanelOpts {
  /** Called when the panel closes (by its ✕, Escape, B or code). */
  onClose?: () => void;
  /** 'sheet' slides up from the bottom on phones (most menus); 'card' is a small centred card. */
  kind?: 'sheet' | 'card' | 'full';
  /** Hide the ✕ (the panel closes itself, e.g. a title screen). */
  noClose?: boolean;
  /** Keep the town clock running while this is open (small hint cards). */
  keepsTime?: boolean;
  className?: string;
}

interface Open { el: HTMLElement; opts: PanelOpts; returnFocus: Element | null }

/** Where and when the last finger or mouse button came up (for the ghost-click shield). */
const lastUp = { x: -999, y: -999, t: -1e9 };
addEventListener('pointerup', e => { lastUp.x = e.clientX; lastUp.y = e.clientY; lastUp.t = performance.now(); }, true);

export class Panels {
  private stack: Open[] = [];
  private toastBox: HTMLElement;

  constructor(private root: HTMLElement) {
    this.toastBox = h('div.toasts', { role: 'status', 'aria-live': 'polite' });
    root.appendChild(this.toastBox);
  }

  get open() { return this.stack.length > 0; }
  /** True while a panel that stops the town clock is open. */
  get stopsTime() { return this.stack.some(p => !p.opts.keepsTime); }
  get topEl() { return this.stack.at(-1)?.el ?? null; }

  show(title: string | null, body: Node | Node[], opts: PanelOpts = {}): HTMLElement {
    const kind = opts.kind ?? 'sheet';
    const head = title !== null || !opts.noClose
      ? h('header.panel-head', null,
        title !== null ? h('h2', null, title) : null,
        opts.noClose ? null : h('button.icon-button.close', { 'aria-label': 'Close', onclick: () => this.close(el) }, icon('close', 26)))
      : null;
    const el = h('section.panel', { class: `panel-${kind} ${opts.className ?? ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title ?? 'Menu' },
      h('div.panel-box', null, head, h('div.panel-body', null, ...(Array.isArray(body) ? body : [body]))));
    // A tap that opens a panel is followed by the browser's own click at the same spot, which would
    // land on whatever the new panel shows there. Ignore a click right where the opening tap was, for
    // a moment (keyboard and gamepad presses have detail 0 and always go through).
    const openedAt = performance.now();
    const opener = openedAt - lastUp.t < 400 ? { ...lastUp } : null;
    if (opener) el.addEventListener('click', e => {
      if (e.detail > 0 && performance.now() - openedAt < 500 && Math.hypot(e.clientX - opener.x, e.clientY - opener.y) < 24) { e.stopPropagation(); e.preventDefault(); }
    }, true);
    this.stack.push({ el, opts, returnFocus: document.activeElement });
    this.root.appendChild(el);
    sfx.open();
    requestAnimationFrame(() => this.focusFirst(el));
    return el;
  }

  /** Close the given panel (or the top one). */
  close(el?: HTMLElement) {
    const i = el ? this.stack.findIndex(p => p.el === el) : this.stack.length - 1;
    if (i < 0) return;
    const [p] = this.stack.splice(i, 1);
    p!.el.remove();
    sfx.back();
    p!.opts.onClose?.();
    const top = this.stack.at(-1);
    if (top) this.focusFirst(top.el);
    else if (p!.returnFocus instanceof HTMLElement && p!.returnFocus.isConnected) p!.returnFocus.focus({ preventScroll: true });
  }

  closeAll() { while (this.stack.length) this.close(); }

  /** Escape or gamepad B: close the top panel unless it says no. */
  back(): boolean {
    const top = this.stack.at(-1);
    if (!top || top.opts.noClose) return false;
    this.close(top.el);
    return true;
  }

  toast(text: string, opts: { icon?: Node; ms?: number } = {}) {
    const t = h('div.toast', null, opts.icon ?? null, h('span', null, text));
    this.toastBox.appendChild(t);
    while (this.toastBox.children.length > 3) this.toastBox.firstElementChild?.remove();
    setTimeout(() => { t.classList.add('leaving'); setTimeout(() => t.remove(), 300); }, opts.ms ?? 2600);
  }

  focusFirst(el: HTMLElement) {
    // the panel's own content first (the ✕ in the header comes last)
    const body = el.querySelector<HTMLElement>('.panel-body') ?? el;
    const target = body.querySelector<HTMLElement>('[autofocus], .primary, button:not([disabled]), [tabindex="0"]') ?? el.querySelector<HTMLElement>('button');
    target?.focus({ preventScroll: true });
  }

  /** Move focus to the nearest button in a direction (arrow keys, d-pad, left stick). */
  moveFocus(dx: number, dy: number, scope: HTMLElement | null = this.topEl) {
    if (!scope) return;
    const items = [...scope.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex="0"], input, select')].filter(e => e.offsetParent !== null);
    if (!items.length) return;
    const current = document.activeElement instanceof HTMLElement && items.includes(document.activeElement) ? document.activeElement : null;
    if (!current) { items[0]!.focus(); return; }
    const a = current.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best: HTMLElement | null = null, bestScore = Infinity;
    for (const e of items) {
      if (e === current) continue;
      const b = e.getBoundingClientRect();
      const bx = b.left + b.width / 2, by = b.top + b.height / 2;
      const along = (bx - ax) * dx + (by - ay) * dy;
      if (along <= 4) continue;
      const across = Math.abs((bx - ax) * dy - (by - ay) * dx);
      const score = along + across * 2.2;
      if (score < bestScore) { bestScore = score; best = e; }
    }
    if (best) { best.focus(); best.scrollIntoView({ block: 'nearest' }); sfx.tap(); }
  }
}
