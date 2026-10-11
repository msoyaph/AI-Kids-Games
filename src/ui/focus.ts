import type { UiAction } from '../input/InputManager';

/**
 * Spatial focus navigation for menus (arrow keys / d-pad / stick). Moves between
 * focusable elements in the active screen by picking the nearest one in the pressed
 * direction.
 */
export class FocusNav {
  private root: HTMLElement | null = null;
  onBack: (() => void) | null = null;

  attach(root: HTMLElement, onBack: (() => void) | null = null): void {
    this.root = root;
    this.onBack = onBack;
    const first = (root.querySelector('[data-autofocus]') as HTMLElement | null) ?? this.items()[0];
    first?.focus({ preventScroll: true });
  }

  detach(): void {
    this.root = null;
    this.onBack = null;
  }

  private items(): HTMLElement[] {
    if (!this.root) return [];
    return Array.from(this.root.querySelectorAll<HTMLElement>('button:not([disabled]), [data-nav], input[type="range"], select')).filter((el) => el.offsetParent !== null);
  }

  handle(action: UiAction): boolean {
    if (!this.root) return false;
    if (action === 'back') {
      this.onBack?.();
      return true;
    }
    const items = this.items();
    if (items.length === 0) return false;
    let cur = document.activeElement as HTMLElement | null;
    if (!cur || !items.includes(cur)) {
      items[0].focus({ preventScroll: true });
      return true;
    }
    if (action === 'confirm') {
      cur.click();
      return true;
    }
    // range inputs: left/right adjusts the value
    if (cur instanceof HTMLInputElement && cur.type === 'range' && (action === 'left' || action === 'right')) {
      const step = Number(cur.step || 1);
      cur.value = String(Number(cur.value) + (action === 'right' ? step : -step));
      cur.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    const r = cur.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let best: HTMLElement | null = null;
    let bestScore = Infinity;
    for (const el of items) {
      if (el === cur) continue;
      const b = el.getBoundingClientRect();
      const dx = b.left + b.width / 2 - cx;
      const dy = b.top + b.height / 2 - cy;
      let primary: number;
      let secondary: number;
      switch (action) {
        case 'up':
          primary = -dy;
          secondary = Math.abs(dx);
          break;
        case 'down':
          primary = dy;
          secondary = Math.abs(dx);
          break;
        case 'left':
          primary = -dx;
          secondary = Math.abs(dy);
          break;
        case 'right':
          primary = dx;
          secondary = Math.abs(dy);
          break;
        default:
          return false;
      }
      if (primary <= 2) continue;
      const score = primary + secondary * 2.2;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    if (best) {
      best.focus({ preventScroll: true });
      best.scrollIntoView({ block: 'nearest' });
    }
    return true;
  }
}
