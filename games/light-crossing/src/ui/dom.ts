// Tiny DOM helpers + a panel stack with spatial focus navigation (keyboard / gamepad).
import type { Command } from '../input/input';

type Child = Node | string | number | null | undefined | false | Child[];
type Props = Record<string, unknown> & { class?: string; style?: string | Partial<CSSStyleDeclaration> };

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Props | null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = String(v);
      else if (k === 'style') {
        if (typeof v === 'string') el.style.cssText = v;
        else Object.assign(el.style, v);
      } else if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      } else if (k === 'dataset') {
        Object.assign(el.dataset, v as object);
      } else if (k in el && typeof v !== 'string') {
        (el as unknown as Record<string, unknown>)[k] = v;
      } else {
        el.setAttribute(k, v === true ? '' : String(v));
      }
    }
  }
  append(el, children);
  return el;
}

function append(el: HTMLElement, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** A focusable button wired for mouse + keyboard/gamepad confirm. */
export function btn(label: Child, onClick: () => void, cls = '', extra: Props = {}): HTMLButtonElement {
  return h('button', { class: `btn ${cls}`, 'data-nav': '', onclick: (e: Event) => {
    e.stopPropagation();
    onClick();
  }, ...extra }, label);
}

export interface Panel {
  el: HTMLElement;
  /** short id for playtest menu timings (e.g. 'inventory', 'phone:map') */
  name?: string;
  /** pauses the game clock + blocks gameplay input */
  modal: boolean;
  /** return true if handled */
  command?(c: Command): boolean;
  onClose?(): void;
  update?(dt: number): void;
  /** prevent closing with back/escape */
  sticky?: boolean;
  /** element to focus first */
  initialFocus?(): HTMLElement | null;
  /** full-screen panel: hides the panels beneath it */
  covers?: boolean;
}

export class UIManager {
  readonly stack: Panel[] = [];
  onChange: () => void = () => {};
  sfx: (name: string) => void = () => {};

  constructor(readonly root: HTMLElement) {}

  get top(): Panel | undefined {
    return this.stack[this.stack.length - 1];
  }

  get modalOpen(): boolean {
    return this.stack.some((p) => p.modal);
  }

  /** name given to panels pushed while running `f` (see App.panels) */
  private naming: string | null = null;
  named(name: string, f: () => void): void {
    const prev = this.naming;
    this.naming = name;
    try {
      f();
    } finally {
      this.naming = prev;
    }
  }

  /** Name of the top panel (null when no panel is open). */
  get topName(): string | null {
    const t = this.top;
    return t ? (t.name ?? 'other') : null;
  }

  push(p: Panel): void {
    if (!p.name && this.naming) p.name = this.naming;
    this.root.appendChild(p.el);
    p.el.classList.add('panel-enter');
    requestAnimationFrame(() => p.el.classList.remove('panel-enter'));
    this.stack.push(p);
    this.focusFirst(p);
    this.updateCovers();
    this.onChange();
  }

  private updateCovers(): void {
    let covered = false;
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const p = this.stack[i]!;
      p.el.style.visibility = covered ? 'hidden' : '';
      if (p.covers) covered = true;
    }
  }

  pop(p?: Panel): void {
    const target = p ?? this.top;
    if (!target) return;
    const idx = this.stack.indexOf(target);
    if (idx < 0) return;
    this.stack.splice(idx, 1);
    target.el.remove();
    target.onClose?.();
    const t = this.top;
    if (t) this.restoreFocus(t);
    this.updateCovers();
    this.onChange();
  }

  closeAll(): void {
    while (this.stack.length) this.pop();
  }

  has(p: Panel): boolean {
    return this.stack.includes(p);
  }

  private lastFocus = new WeakMap<Panel, HTMLElement>();

  focusFirst(p: Panel): void {
    const el = p.initialFocus?.() ?? (p.el.querySelector('[data-nav]:not([disabled])') as HTMLElement | null);
    if (el) this.focus(el);
  }

  private restoreFocus(p: Panel): void {
    const el = this.lastFocus.get(p);
    if (el && p.el.contains(el)) this.focus(el);
    else this.focusFirst(p);
  }

  focus(el: HTMLElement): void {
    const p = this.top;
    if (p) p.el.querySelectorAll('.focus').forEach((e) => e.classList.remove('focus'));
    el.classList.add('focus');
    el.focus({ preventScroll: true });
    el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    if (p) this.lastFocus.set(p, el);
  }

  focused(): HTMLElement | null {
    const p = this.top;
    if (!p) return null;
    const el = p.el.querySelector('.focus') as HTMLElement | null;
    return el && el.isConnected ? el : null;
  }

  /** Route commands to the top panel; returns true if the UI consumed them. */
  handle(cmds: Command[]): boolean {
    const p = this.top;
    if (!p) return false;
    for (const c of cmds) {
      const cur = this.top;
      if (!cur) break;
      if (cur.command?.(c)) continue;
      switch (c) {
        case 'up':
        case 'down':
        case 'left':
        case 'right':
          this.move(c);
          break;
        case 'confirm': {
          const f = this.focused();
          if (f && !(f as HTMLButtonElement).disabled) {
            this.sfx('select');
            f.click();
          }
          break;
        }
        case 'back':
        case 'cancel':
          if (!cur.sticky) {
            this.sfx('back');
            this.pop(cur);
          }
          break;
        default:
          break;
      }
    }
    return true;
  }

  move(dir: 'up' | 'down' | 'left' | 'right'): void {
    const p = this.top;
    if (!p) return;
    const items = Array.from(p.el.querySelectorAll('[data-nav]:not([disabled])')) as HTMLElement[];
    const visible = items.filter((e) => e.offsetParent !== null);
    if (!visible.length) return;
    const cur = this.focused();
    if (!cur || !visible.includes(cur)) {
      this.focus(visible[0]!);
      return;
    }
    const a = cur.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best: HTMLElement | null = null;
    let bestScore = Infinity;
    for (const e of visible) {
      if (e === cur) continue;
      const b = e.getBoundingClientRect();
      const bx = b.left + b.width / 2, by = b.top + b.height / 2;
      const dx = bx - ax, dy = by - ay;
      let primary = 0, secondary = 0;
      switch (dir) {
        case 'up':
          if (dy >= -2) continue;
          primary = -dy;
          secondary = Math.abs(dx);
          break;
        case 'down':
          if (dy <= 2) continue;
          primary = dy;
          secondary = Math.abs(dx);
          break;
        case 'left':
          if (dx >= -2) continue;
          primary = -dx;
          secondary = Math.abs(dy);
          break;
        case 'right':
          if (dx <= 2) continue;
          primary = dx;
          secondary = Math.abs(dy);
          break;
      }
      const score = primary + secondary * 2.2;
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }
    if (best) {
      this.sfx('tick');
      this.focus(best);
    }
  }

  update(dt: number): void {
    for (const p of this.stack) p.update?.(dt);
  }
}
