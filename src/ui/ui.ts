import type { InputManager, MenuAction } from '../input/manager';
import type { GameAudio } from '../audio/types';

export interface Screen {
  el: HTMLElement;
  /** Called when Back/Escape/B is pressed. Return false to ignore. */
  onBack?: () => void;
  onEnter?: () => void;
  onExit?: () => void;
  /** Extra handling for menu inputs (e.g. Q/E tab switching). Return true if consumed. */
  onMenu?: (a: MenuAction) => boolean;
  /** Initial focus target. */
  focus?: HTMLElement | null;
  /** Hide the 3D menu backdrop behind this screen. */
  fullCover?: boolean;
}

type Child = Node | string | number | null | undefined | false;
type Props = Record<string, unknown> & { class?: string; style?: string; onClick?: (e: MouseEvent) => void };

/** Minimal hyperscript helper. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props | null = null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = String(v);
      else if (k === 'style') el.setAttribute('style', String(v));
      else if (k === 'onClick') el.addEventListener('click', v as EventListener);
      else if (k === 'html') el.innerHTML = String(v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      else el.setAttribute(k, String(v));
    }
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** A focusable menu button (keyboard/gamepad navigable). */
export function button(label: Child, onClick: () => void, cls = '', extra: Props = {}): HTMLButtonElement {
  const b = h('button', { class: `btn ${cls}`, 'data-nav': '1', type: 'button', tabindex: '-1', ...extra }, label);
  b.addEventListener('click', (e) => {
    e.preventDefault();
    if (b.disabled) return;
    onClick();
  });
  return b;
}

export function hex(c: number): string {
  return `#${c.toString(16).padStart(6, '0')}`;
}

/**
 * Screen manager with a back stack and spatial focus navigation (arrows / D-pad / stick),
 * confirm (Enter/A) and back (Esc/B).
 */
export class Ui {
  readonly root: HTMLDivElement;
  private current: Screen | null = null;
  private overlay: Screen | null = null;
  private focused: HTMLElement | null = null;
  usingPointer = false;
  onScreenChange?: (s: Screen | null) => void;

  constructor(
    parent: HTMLElement,
    readonly input: InputManager,
    private readonly audio: GameAudio,
  ) {
    this.root = h('div', { class: 'ui-root' });
    parent.appendChild(this.root);
    input.onMenu((a) => this.onMenu(a));
    this.root.addEventListener('pointerdown', () => {
      this.usingPointer = true;
      this.root.classList.add('pointer');
    });
    window.addEventListener('keydown', () => {
      this.usingPointer = false;
      this.root.classList.remove('pointer');
    });
    this.root.addEventListener('focusin', (e) => {
      const t = e.target as HTMLElement;
      if (t.dataset.nav) this.setFocus(t, false);
    });
    this.root.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest('[data-nav]') as HTMLElement | null;
      if (t && !(t as HTMLButtonElement).disabled) {
        this.audio.ui('select');
        if (e.isTrusted) t.blur();
      }
    });
  }

  get screen(): Screen | null {
    return this.overlay ?? this.current;
  }

  show(s: Screen): void {
    this.current?.onExit?.();
    this.current?.el.remove();
    this.closeOverlay(false);
    this.current = s;
    s.el.classList.add('screen');
    this.root.appendChild(s.el);
    s.onEnter?.();
    this.focusInitial(s);
    this.onScreenChange?.(s);
  }

  /** Modal overlay (pause menu, unlock pop-ups, confirm dialogs). */
  showOverlay(s: Screen): void {
    this.closeOverlay(false);
    this.overlay = s;
    s.el.classList.add(s.fullCover ? 'overlay-full' : 'overlay');
    this.root.appendChild(s.el);
    s.onEnter?.();
    this.focusInitial(s);
  }

  closeOverlay(refocus = true): void {
    if (!this.overlay) return;
    this.overlay.onExit?.();
    this.overlay.el.remove();
    this.overlay = null;
    if (refocus && this.current) this.focusInitial(this.current);
  }

  get hasOverlay(): boolean {
    return this.overlay !== null;
  }

  clear(): void {
    this.closeOverlay(false);
    this.current?.onExit?.();
    this.current?.el.remove();
    this.current = null;
    this.onScreenChange?.(null);
  }

  private focusInitial(s: Screen): void {
    const target = s.focus ?? (s.el.querySelector('[data-nav]:not([disabled])') as HTMLElement | null);
    if (target) this.setFocus(target, false);
  }

  setFocus(el: HTMLElement, sound = true): void {
    if (this.focused === el) return;
    this.focused?.classList.remove('focus');
    // text fields take real focus so you can type; leaving one gives it back
    if (this.focused?.tagName === 'INPUT') this.focused.blur();
    this.focused = el;
    el.classList.add('focus');
    if (el.tagName === 'INPUT' && document.activeElement !== el) {
      // like tabbing into a field: select the text so typing replaces the suggestion
      el.focus({ preventScroll: true });
      (el as HTMLInputElement).select();
    }
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (sound) this.audio.ui('move');
  }

  private navigables(): HTMLElement[] {
    const s = this.screen;
    if (!s) return [];
    return Array.from(s.el.querySelectorAll<HTMLElement>('[data-nav]')).filter((e) => !(e as HTMLButtonElement).disabled && e.offsetParent !== null);
  }

  private move(dx: number, dy: number): void {
    const items = this.navigables();
    if (items.length === 0) return;
    const cur = this.focused && items.includes(this.focused) ? this.focused : null;
    if (!cur) {
      this.setFocus(items[0]);
      return;
    }
    const r = cur.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    if (dy !== 0) {
      // Up/down: go to the nearest ROW fully above/below, then the button in it closest across. (Plain distance
      // skipped rows that sit off to one side, e.g. the Settings tabs above right-aligned sliders.)
      let rowGap = Infinity;
      const rows: Array<{ el: HTMLElement; gap: number; across: number }> = [];
      for (const el of items) {
        if (el === cur) continue;
        const b = el.getBoundingClientRect();
        const gap = dy > 0 ? b.top - r.bottom : r.top - b.bottom;
        if (gap < -4) continue;
        const g = Math.max(0, gap);
        rows.push({ el, gap: g, across: Math.abs(b.left + b.width / 2 - cx) });
        rowGap = Math.min(rowGap, g);
      }
      let pick: { el: HTMLElement; gap: number; across: number } | null = null;
      for (const c of rows) if (c.gap <= rowGap + 12 && (!pick || c.across < pick.across || (c.across === pick.across && c.gap < pick.gap))) pick = c;
      if (pick) {
        this.setFocus(pick.el);
        return;
      }
    }
    let best: HTMLElement | null = null;
    let bestScore = Infinity;
    for (const el of items) {
      if (el === cur) continue;
      const b = el.getBoundingClientRect();
      const ex = b.left + b.width / 2;
      const ey = b.top + b.height / 2;
      const ddx = ex - cx;
      const ddy = ey - cy;
      const along = ddx * dx + ddy * dy;
      if (along <= 4) continue;
      const across = Math.abs(ddx * dy) + Math.abs(ddy * dx);
      const score = along + across * 2.2;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    if (best) this.setFocus(best);
  }

  /** Tab / Shift+Tab: the next / previous button in reading order (wraps). */
  private step(d: number): void {
    const items = this.navigables();
    if (items.length === 0) return;
    const i = this.focused ? items.indexOf(this.focused) : -1;
    this.setFocus(items[i < 0 ? (d > 0 ? 0 : items.length - 1) : (i + d + items.length) % items.length]);
  }

  private onMenu(a: MenuAction): void {
    const s = this.screen;
    if (!s) return;
    if (s.onMenu?.(a)) return;
    switch (a) {
      case 'nextItem':
        this.step(1);
        break;
      case 'prevItem':
        this.step(-1);
        break;
      case 'up':
        this.move(0, -1);
        break;
      case 'down':
        this.move(0, 1);
        break;
      case 'left':
        if (this.focused?.dataset.slider) this.focused.dispatchEvent(new CustomEvent('nudge', { detail: -1 }));
        else this.move(-1, 0);
        break;
      case 'right':
        if (this.focused?.dataset.slider) this.focused.dispatchEvent(new CustomEvent('nudge', { detail: 1 }));
        else this.move(1, 0);
        break;
      case 'confirm':
        if (this.focused && this.navigables().includes(this.focused)) this.focused.click();
        break;
      case 'back':
      case 'pause':
        if (s.onBack) {
          this.audio.ui('back');
          s.onBack();
        }
        break;
    }
  }
}
