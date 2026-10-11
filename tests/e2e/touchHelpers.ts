import type { CDPSession, Page } from '@playwright/test';

/**
 * Real multi-touch for Chromium: CDP Input.dispatchTouchEvent goes through the browser's
 * input pipeline (touch → pointer events with pointerType 'touch', hit-testing, capture),
 * unlike synthetic DOM events. Playwright itself only offers single taps.
 */
export class Fingers {
  private active = new Map<number, { x: number; y: number }>();

  private constructor(private cdp: CDPSession) {}

  static async attach(page: Page): Promise<Fingers> {
    return new Fingers(await page.context().newCDPSession(page));
  }

  private points(): Array<{ x: number; y: number; id: number }> {
    return [...this.active].map(([id, p]) => ({ x: p.x, y: p.y, id }));
  }

  async down(id: number, x: number, y: number): Promise<void> {
    this.active.set(id, { x, y });
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: this.points() });
  }

  async move(id: number, x: number, y: number): Promise<void> {
    this.active.set(id, { x, y });
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: this.points() });
  }

  /** Move in `steps` small moves (a real thumb, not a teleport). */
  async drag(id: number, x: number, y: number, steps = 6): Promise<void> {
    const from = this.active.get(id)!;
    for (let k = 1; k <= steps; k++) await this.move(id, from.x + ((x - from.x) * k) / steps, from.y + ((y - from.y) * k) / steps);
  }

  async up(id: number): Promise<void> {
    this.active.delete(id);
    // touchEnd lists the fingers still down
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: this.points() });
  }

  async tap(x: number, y: number, id = 9): Promise<void> {
    await this.down(id, x, y);
    await this.up(id);
  }
}

/**
 * Pretend to be a touchscreen laptop: a fine (mouse) primary pointer plus a touchscreen.
 * Chromium's touch emulation reports a coarse primary pointer, so the media queries are
 * stubbed before the game loads.
 */
export async function emulateTouchLaptop(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    const fake: Record<string, boolean> = {
      '(pointer: coarse)': false,
      '(pointer: fine)': true,
      '(any-pointer: fine)': true,
      '(any-pointer: coarse)': true,
      '(hover: none)': false,
    };
    window.matchMedia = (q: string): MediaQueryList => {
      const mql = real(q);
      return q in fake ? Object.assign(Object.create(mql) as MediaQueryList, { matches: fake[q], media: q }) : mql;
    };
  });
}
