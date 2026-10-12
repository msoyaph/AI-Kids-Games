/**
 * Unified touch + mouse gestures on the game canvas:
 * tap, long-press, drag-to-pan, pinch-to-zoom, wheel zoom, mouse hover.
 */
export interface GestureHandlers {
  tap(sx: number, sy: number, touch: boolean): void;
  longPress(sx: number, sy: number): void;
  hover(sx: number, sy: number): void;
  pan(dx: number, dy: number): void;
  zoom(factor: number, sx: number, sy: number): void;
  /** Called when a drag/pinch starts (e.g. to hide tooltips). */
  gestureStart?(): void;
}

interface Pt {
  id: number;
  x: number;
  y: number;
  sx: number;
  sy: number;
  t: number;
  type: string;
}

const TAP_SLOP = 10;
const LONG_PRESS_MS = 480;

export class Gestures {
  private pts = new Map<number, Pt>();
  private moved = false;
  private pinchDist = 0;
  private longTimer = 0;
  private longFired = false;
  private enabled = true;
  private readonly el: HTMLElement;

  constructor(el: HTMLElement, private readonly h: GestureHandlers) {
    this.el = el;
    el.addEventListener('pointerdown', this.down);
    el.addEventListener('pointermove', this.move);
    el.addEventListener('pointerup', this.up);
    el.addEventListener('pointercancel', this.cancel);
    el.addEventListener('pointerleave', this.leave);
    el.addEventListener('wheel', this.wheel, { passive: false });
    el.addEventListener('contextmenu', this.ctx);
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.reset();
  }

  destroy(): void {
    const el = this.el;
    el.removeEventListener('pointerdown', this.down);
    el.removeEventListener('pointermove', this.move);
    el.removeEventListener('pointerup', this.up);
    el.removeEventListener('pointercancel', this.cancel);
    el.removeEventListener('pointerleave', this.leave);
    el.removeEventListener('wheel', this.wheel);
    el.removeEventListener('contextmenu', this.ctx);
    clearTimeout(this.longTimer);
  }

  private local(e: PointerEvent | WheelEvent): { x: number; y: number } {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private reset(): void {
    this.pts.clear();
    this.moved = false;
    this.longFired = false;
    clearTimeout(this.longTimer);
  }

  private ctx = (e: Event): void => e.preventDefault();

  private down = (e: PointerEvent): void => {
    if (!this.enabled) return;
    const p = this.local(e);
    try {
      this.el.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    this.pts.set(e.pointerId, { id: e.pointerId, x: p.x, y: p.y, sx: p.x, sy: p.y, t: performance.now(), type: e.pointerType });
    if (this.pts.size === 1) {
      this.moved = false;
      this.longFired = false;
      clearTimeout(this.longTimer);
      this.longTimer = window.setTimeout(() => {
        if (!this.moved && this.pts.size === 1) {
          this.longFired = true;
          this.h.longPress(p.x, p.y);
        }
      }, LONG_PRESS_MS);
    } else if (this.pts.size === 2) {
      clearTimeout(this.longTimer);
      this.moved = true;
      const [a, b] = [...this.pts.values()];
      this.pinchDist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      this.h.gestureStart?.();
    }
  };

  private move = (e: PointerEvent): void => {
    if (!this.enabled) return;
    const p = this.local(e);
    const pt = this.pts.get(e.pointerId);
    if (!pt) {
      if (e.pointerType === 'mouse') this.h.hover(p.x, p.y);
      return;
    }
    const dx = p.x - pt.x;
    const dy = p.y - pt.y;
    pt.x = p.x;
    pt.y = p.y;
    if (this.pts.size === 1) {
      if (!this.moved && Math.hypot(p.x - pt.sx, p.y - pt.sy) > TAP_SLOP) {
        this.moved = true;
        clearTimeout(this.longTimer);
        this.h.gestureStart?.();
      }
      if (this.moved) this.h.pan(dx, dy);
      if (e.pointerType === 'mouse') this.h.hover(p.x, p.y);
    } else if (this.pts.size === 2) {
      const [a, b] = [...this.pts.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      const mx = (a!.x + b!.x) / 2;
      const my = (a!.y + b!.y) / 2;
      if (this.pinchDist > 0 && d > 0) this.h.zoom(d / this.pinchDist, mx, my);
      this.pinchDist = d;
      this.h.pan(dx / 2, dy / 2);
    }
  };

  private up = (e: PointerEvent): void => {
    const pt = this.pts.get(e.pointerId);
    if (!pt) return;
    this.pts.delete(e.pointerId);
    clearTimeout(this.longTimer);
    if (!this.enabled) return;
    if (this.pts.size === 0) {
      const quick = performance.now() - pt.t < LONG_PRESS_MS + 200;
      if (!this.moved && !this.longFired && quick && (e.button === 0 || e.pointerType !== 'mouse')) {
        this.h.tap(pt.x, pt.y, pt.type !== 'mouse');
      }
      this.moved = false;
      this.longFired = false;
    } else {
      // one finger lifted from a pinch: keep panning with the other without a jump
      this.pinchDist = 0;
    }
  };

  private cancel = (e: PointerEvent): void => {
    this.pts.delete(e.pointerId);
    clearTimeout(this.longTimer);
    if (this.pts.size === 0) {
      this.moved = false;
      this.longFired = false;
    }
  };

  private leave = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && !this.pts.has(e.pointerId)) this.h.hover(-9999, -9999);
  };

  private wheel = (e: WheelEvent): void => {
    if (!this.enabled) return;
    e.preventDefault();
    const p = this.local(e);
    if (e.ctrlKey) {
      // trackpad pinch
      this.h.zoom(Math.exp(-e.deltaY * 0.01), p.x, p.y);
    } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.8 && e.deltaMode === 0 && Math.abs(e.deltaX) > 0) {
      this.h.pan(-e.deltaX, -e.deltaY);
    } else {
      this.h.zoom(Math.exp(-e.deltaY * 0.0015), p.x, p.y);
    }
  };
}
