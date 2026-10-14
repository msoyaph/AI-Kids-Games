/**
 * Keyboard and gamepad navigation for DOM menus: arrows / d-pad move the focus to the nearest
 * button in that direction, A (Enter/Space/Z) presses it, B (Escape/X/Backspace) goes back.
 * The top-most open layer owns the focus; layers stack (a menu over the world, a choice over a menu).
 */
import type { Dir } from '../core/state';
import type { Input } from '../input/input';

export interface Layer {
  el: HTMLElement;
  /** Called for B / Escape. Return false to ignore. */
  back?: () => void;
}

const FOCUSABLE = 'button:not([disabled]), [tabindex="0"], input, select';

export class FocusManager {
  private layers: Layer[] = [];

  constructor(private input: Input) {
    addEventListener('keydown', e => {
      const top = this.top();
      if (!top) return;
      const dirs: Record<string, Dir> = { ArrowDown: 0, ArrowLeft: 1, ArrowRight: 2, ArrowUp: 3 };
      if (e.code in dirs) {
        if ((e.target as HTMLElement)?.tagName === 'INPUT' && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) return;
        e.preventDefault();
        this.move(dirs[e.code]!);
      } else if (e.code === 'Escape' || e.code === 'KeyX' || e.code === 'Backspace') {
        e.preventDefault();
        top.back?.();
      } else if (e.code === 'KeyZ') {
        e.preventDefault();
        (document.activeElement as HTMLElement | null)?.click();
      } else if (e.code === 'Tab' || e.code === 'KeyM') {
        // keep focus inside the layer
        if (e.code === 'Tab') { e.preventDefault(); this.move(e.shiftKey ? 3 : 0); }
      }
    }, { capture: true });
  }

  top(): Layer | undefined { return this.layers[this.layers.length - 1]; }

  push(layer: Layer, focusFirst = true): void {
    this.layers.push(layer);
    this.input.uiFocus = true;
    this.input.reset();
    if (focusFirst) requestAnimationFrame(() => this.focusFirst(layer.el));
  }

  pop(layer: Layer): void {
    this.layers = this.layers.filter(l => l !== layer);
    this.input.uiFocus = this.layers.length > 0;
    this.input.reset();
    const t = this.top();
    if (t) requestAnimationFrame(() => this.focusFirst(t.el));
    else (document.activeElement as HTMLElement | null)?.blur?.();
  }

  focusFirst(el: HTMLElement): void {
    const preferred = el.querySelector<HTMLElement>('[data-autofocus]') ?? el.querySelector<HTMLElement>(FOCUSABLE);
    preferred?.focus({ preventScroll: false });
  }

  /** Move focus to the nearest focusable element in a direction (spatial navigation). */
  move(dir: Dir): void {
    const top = this.top();
    if (!top) return;
    const items = [...top.el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(e => e.offsetParent !== null);
    if (!items.length) return;
    const cur = document.activeElement as HTMLElement;
    if (!items.includes(cur)) { items[0]!.focus(); return; }
    const r = cur.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let best: HTMLElement | null = null, bestScore = Infinity;
    for (const it of items) {
      if (it === cur) continue;
      const q = it.getBoundingClientRect();
      const x = q.left + q.width / 2, y = q.top + q.height / 2;
      const dx = x - cx, dy = y - cy;
      const along = dir === 0 ? dy : dir === 3 ? -dy : dir === 2 ? dx : -dx;
      const across = dir === 0 || dir === 3 ? Math.abs(dx) : Math.abs(dy);
      if (along <= 2) continue;
      const score = along + across * 2.2;
      if (score < bestScore) { bestScore = score; best = it; }
    }
    if (!best) {
      // wrap around in lists
      const i = items.indexOf(cur);
      best = dir === 0 || dir === 2 ? items[(i + 1) % items.length]! : items[(i - 1 + items.length) % items.length]!;
    }
    best.focus();
    best.scrollIntoView?.({ block: 'nearest' });
  }

  /** Gamepad menu navigation (called every frame with the polled presses). */
  gamepad(p: { nav: Dir | null; a: boolean; b: boolean }): void {
    const top = this.top();
    if (!top) return;
    if (p.nav !== null) this.move(p.nav);
    if (p.a) (document.activeElement as HTMLElement | null)?.click();
    if (p.b) top.back?.();
  }

  get open(): boolean { return this.layers.length > 0; }
}
