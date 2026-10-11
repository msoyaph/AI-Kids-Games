// Touch input for tests. Taps go through Playwright's touchscreen (real, trusted touch events in both
// browsers). Holds and drags need touchstart/move/end, which Playwright can't press directly:
// Chromium gets real touches through the DevTools protocol, WebKit gets TouchEvents dispatched on
// the element under the finger (the same events the game listens to).
import type { CDPSession, ElementHandle, Page } from '@playwright/test';

export class Fingers {
  private cdp: CDPSession | null = null;
  private down = new Map<number, { x: number; y: number; target: ElementHandle | null }>();

  constructor(private page: Page, private engine: string) {}

  private async session(): Promise<CDPSession | null> {
    if (this.engine !== 'chromium') return null;
    if (!this.cdp) this.cdp = await this.page.context().newCDPSession(this.page);
    return this.cdp;
  }

  async tap(x: number, y: number): Promise<void> {
    await this.page.touchscreen.tap(Math.round(x), Math.round(y));
  }

  /** Tap the middle of an element. */
  async tapEl(selector: string): Promise<void> {
    const el = this.page.locator(selector).first();
    // (a child would scroll the menu with a finger; the test scrolls it for them)
    await el.scrollIntoViewIfNeeded();
    const box = await el.boundingBox();
    if (!box) throw new Error(`nothing to tap: ${selector}`);
    await this.tap(box.x + box.width / 2, box.y + box.height / 2);
  }

  private points(): { id: number; x: number; y: number }[] {
    return [...this.down].map(([id, p]) => ({ id, x: p.x, y: p.y }));
  }

  private async webkit(type: 'touchstart' | 'touchmove' | 'touchend', id: number, x: number, y: number): Promise<void> {
    let st = this.down.get(id);
    if (type === 'touchstart') {
      const target = (await this.page.evaluateHandle(([px, py]) => document.elementFromPoint(px, py) ?? document.body, [x, y] as const)) as ElementHandle;
      st = { x, y, target };
      this.down.set(id, st);
    }
    if (!st) return;
    st.x = x;
    st.y = y;
    const t = (p: { id: number; x: number; y: number }) => ({ identifier: p.id, clientX: p.x, clientY: p.y, pageX: p.x, pageY: p.y, screenX: p.x, screenY: p.y, radiusX: 8, radiusY: 8, force: 1 });
    const changed = [t({ id, x, y })];
    if (type === 'touchend') this.down.delete(id);
    const all = this.points().map(t);
    await st.target!.dispatchEvent(type, { touches: all, targetTouches: all, changedTouches: changed, bubbles: true, cancelable: true });
  }

  private async chromium(type: 'touchStart' | 'touchMove' | 'touchEnd', id: number, x: number, y: number): Promise<void> {
    const s = (await this.session())!;
    if (type === 'touchEnd') this.down.delete(id);
    else this.down.set(id, { x, y, target: null });
    await s.send('Input.dispatchTouchEvent', { type, touchPoints: this.points().map((p) => ({ x: p.x, y: p.y, id: p.id, radiusX: 8, radiusY: 8, force: 1 })) });
  }

  async start(x: number, y: number, id = 1): Promise<void> {
    if (this.engine === 'chromium') await this.chromium('touchStart', id, x, y);
    else await this.webkit('touchstart', id, x, y);
  }

  async move(x: number, y: number, id = 1): Promise<void> {
    if (this.engine === 'chromium') await this.chromium('touchMove', id, x, y);
    else await this.webkit('touchmove', id, x, y);
  }

  async end(id = 1): Promise<void> {
    const p = this.down.get(id);
    if (!p) return;
    if (this.engine === 'chromium') await this.chromium('touchEnd', id, p.x, p.y);
    else await this.webkit('touchend', id, p.x, p.y);
  }

  /** Press and hold for `ms`. */
  async hold(x: number, y: number, ms: number, id = 1): Promise<void> {
    await this.start(x, y, id);
    await this.page.waitForTimeout(ms);
    await this.end(id);
  }

  /** Drag from (x1,y1) to (x2,y2) over `steps` moves, then hold there for `holdMs` before lifting. */
  async drag(x1: number, y1: number, x2: number, y2: number, steps = 6, holdMs = 0, id = 1): Promise<void> {
    await this.start(x1, y1, id);
    for (let k = 1; k <= steps; k++) {
      await this.move(x1 + ((x2 - x1) * k) / steps, y1 + ((y2 - y1) * k) / steps, id);
      await this.page.waitForTimeout(16);
    }
    if (holdMs) await this.page.waitForTimeout(holdMs);
    await this.end(id);
  }
}
