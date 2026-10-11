// A test "player" that plays by touch. It looks at the game (positions, what's on screen, what the
// prompt says) through window.__lc.dev's read-only helpers, the way a child looks at the screen, and
// acts only with taps, holds and drags (see touch.ts).
import { expect, type Page } from '@playwright/test';
import { Fingers } from './touch';

export interface Peek {
  mode: string;
  location: string;
  x: number;
  z: number;
  facing: number;
  minute: number;
  day: number;
  action: string | null;
  tool: string | null;
  cast: string | null;
  reel: { progress: number; cursor: number; zone: number; zoneW: number } | null;
  walking: boolean;
  panel: string | null;
  prompt: string | null;
  glints: number;
  chapter: number;
  active: string[];
  done: string[];
  stats: Record<string, number>;
  creeping: boolean;
  running: boolean;
  speed: number;
}

type Dev = Record<string, (...a: unknown[]) => unknown>;

export class Player {
  readonly f: Fingers;
  constructor(
    readonly page: Page,
    engine: string,
  ) {
    this.f = new Fingers(page, engine);
  }

  peek(): Promise<Peek> {
    return this.page.evaluate(() => (window as unknown as { __lc: { dev: { peek(): unknown } } }).__lc.dev.peek()) as Promise<Peek>;
  }

  /** Call a dev helper (looking only, or staging a test situation). */
  dev<T>(name: string, ...args: unknown[]): Promise<T> {
    return this.page.evaluate(([n, a]) => (window as unknown as { __lc: { dev: Record<string, (...x: unknown[]) => unknown> } }).__lc.dev[n]!(...(a as unknown[])), [name, args] as const) as Promise<T>;
  }

  async wait(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  async until(f: () => Promise<boolean>, ms = 10_000, what = 'condition'): Promise<void> {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (await f()) return;
      await this.page.waitForTimeout(100);
    }
    throw new Error(`timed out waiting for ${what}`);
  }

  /** Screen position of a world point (tile centre + height) and whether it's tappable there. */
  async spot(x: number, z: number, lift = 0): Promise<{ x: number; y: number; ok: boolean }> {
    return this.page.evaluate(
      ([wx, wz, up]) => {
        const app = (window as unknown as { __lc: { dev: Dev; hudLayout: { free(x: number, y: number, pad: number): boolean } } }).__lc;
        const d = app.dev;
        const y = (d.peek() as { location: string }).location === 'island' ? (d.groundY!(wx, wz) as number) : 0;
        const p = d.screen!(wx, y + up, wz) as { x: number; y: number; visible: boolean };
        return { x: p.x, y: p.y, ok: p.visible && app.hudLayout.free(p.x, p.y, 6) };
      },
      [x, z, lift] as const,
    );
  }

  /** Tap a world point (if it's on screen and not under the HUD). */
  async tapWorld(x: number, z: number, lift = 0): Promise<boolean> {
    const s = await this.spot(x, z, lift);
    if (!s.ok) return false;
    await this.f.tap(s.x, s.y);
    return true;
  }

  async idle(ms = 12_000): Promise<void> {
    await this.until(async () => {
      const p = await this.peek();
      return !p.walking && !p.action;
    }, ms, 'the walk to finish');
  }

  /** Walk to a tile by tapping the farthest point of the route that's on screen. */
  async walkTo(x: number, z: number, near = 0.75): Promise<void> {
    for (let tries = 0; tries < 30; tries++) {
      const p = await this.peek();
      if (Math.hypot(p.x - x, p.z - z) <= near) return;
      const route = await this.dev<{ x: number; z: number }[] | null>('route', x, z);
      if (!route) throw new Error(`no way to ${x},${z}`);
      if (route.length === 0) return;
      let tapped = false;
      for (let k = Math.min(route.length - 1, 14); k >= 0 && !tapped; k--) tapped = await this.tapWorld(route[k]!.x, route[k]!.z);
      if (!tapped) throw new Error('route not on screen');
      await this.wait(150);
      await this.idle();
    }
    throw new Error(`could not reach ${x},${z}`);
  }

  /** Walk up to a thing (tree, weed, item, villager...) and stand facing it by tapping it. */
  async approach(x: number, z: number, lift = 0.4): Promise<void> {
    const p = await this.peek();
    if (p.location === 'island' && Math.hypot(p.x - x, p.z - z) > 6) await this.walkTo(x, z, 3.5);
    if (!(await this.tapWorld(x, z, lift)) && !(await this.tapWorld(x, z, 0))) throw new Error('target not on screen');
    await this.wait(150);
    await this.idle();
  }

  /** Is a conversation open? */
  async talking(): Promise<boolean> {
    return (await this.page.locator('.dlg').count()) > 0;
  }

  /** Tap through a conversation, picking choices that match `pick` (else the first one). */
  async talkThrough(pick: (RegExp | string)[] = [], max = 60): Promise<void> {
    for (let k = 0; k < max; k++) {
      if (!(await this.talking())) return;
      const choices = this.page.locator('.dlg-choice');
      const n = await choices.count();
      if (n > 0) {
        const labels = await choices.allTextContents();
        let i = labels.findIndex((l) => pick.some((p) => (typeof p === 'string' ? l.includes(p) : p.test(l))));
        if (i < 0) i = labels.findIndex((l) => !/Bye|Not right now|Just saying hi/.test(l));
        if (i < 0) i = 0;
        const box = await choices.nth(i).boundingBox();
        if (box) await this.f.tap(box.x + box.width / 2, box.y + box.height / 2);
      } else {
        const box = await this.page.locator('.dlg').first().boundingBox();
        if (box) await this.f.tap(box.x + box.width / 2, box.y + box.height / 2);
      }
      await this.wait(260);
    }
  }

  /** Close every open menu with its ✕ / Close / Done button. */
  async closeMenus(): Promise<void> {
    for (let k = 0; k < 6; k++) {
      const p = await this.peek();
      if (!p.panel) return;
      const close = this.page.locator('button:visible', { hasText: /^(✕|Close|✔ Done|Done|Resume)$/ }).last();
      if ((await close.count()) === 0) return;
      const b = await close.boundingBox();
      if (!b) return;
      await this.f.tap(b.x + b.width / 2, b.y + b.height / 2);
      await this.wait(250);
    }
  }

  /** Tap a visible button by its text. */
  async button(text: string | RegExp): Promise<void> {
    const b = this.page.locator('button:visible', { hasText: text }).first();
    await expect(b).toBeVisible();
    await b.scrollIntoViewIfNeeded();
    const box = (await b.boundingBox())!;
    await this.f.tap(box.x + box.width / 2, box.y + box.height / 2);
    await this.wait(200);
  }

  /** The tool ring by touch: tap Tools, then the tool. */
  async equip(label: string): Promise<void> {
    await this.f.tapEl('.tc-tool');
    await this.wait(250);
    const b = this.page.locator('.ring-btn', { hasText: label }).first();
    await expect(b).toBeVisible();
    const box = (await b.boundingBox())!;
    await this.f.tap(box.x + box.width / 2, box.y + box.height / 2);
    await this.wait(200);
  }

  /**
   * Fish once like a child would: walk to the water by the nearest fish shadow (tapping it walks up
   * to the bank and faces it), cast with A, wait for the bite, tap anywhere to hook, and hold
   * anywhere to reel a big one in. Returns true when a fish was caught.
   */
  async fishOnce(maxWait = 45_000): Promise<boolean> {
    const before = (await this.peek()).stats.fishCaught ?? 0;
    const p = await this.peek();
    const shadows = await this.dev<{ x: number; z: number; size: number }[]>('shadows');
    // the nearest fish you can reach from the bank
    for (const s of shadows.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))) {
      const spot = await this.dev<{ x: number; z: number; wx: number; wz: number } | null>('castSpot', s.x, s.z);
      if (!spot) continue;
      try {
        await this.walkTo(spot.x, spot.z, 0.4);
      } catch {
        continue;
      }
      await this.tapWorld(spot.wx, spot.wz); // face the water (a tool in hand never casts by itself)
      await this.wait(150);
      await this.idle();
      break;
    }
    await this.a(); // cast
    const vp = this.page.viewportSize()!;
    const hx = vp.width / 2, hy = vp.height * 0.45;
    await this.until(async () => {
      const q = await this.peek();
      return q.cast === 'bite' || q.cast === null;
    }, maxWait, 'a bite').catch(() => {});
    if ((await this.peek()).cast === 'bite') {
      await this.f.tap(hx, hy);
      await this.wait(120);
      // reel: hold while the hook is below the green, let go above it
      let holding = false;
      for (let k = 0; k < 1200; k++) {
        const q = await this.peek();
        if (!q.reel) break;
        const want = q.reel.cursor < q.reel.zone;
        if (want && !holding) await this.f.start(hx, hy);
        if (!want && holding) await this.f.end();
        holding = want;
        await this.wait(40);
      }
      if (holding) await this.f.end();
    } else if ((await this.peek()).cast) await this.a(); // nothing bit: reel in
    await this.idle(20_000);
    return ((await this.peek()).stats.fishCaught ?? 0) > before;
  }

  /** Press A (tap). */
  async a(): Promise<void> {
    await this.f.tapEl('.tc-a');
    await this.wait(120);
  }

  /** Steer with the stick from its home spot: `push` 0..1 of the stick's reach, for `ms`. */
  async stick(dx: number, dy: number, push: number, ms: number): Promise<void> {
    const vp = this.page.viewportSize()!;
    const sx = 90, sy = vp.height - 120;
    const len = Math.hypot(dx, dy) || 1;
    const r = 56 * push;
    await this.f.drag(sx, sy, sx + (dx / len) * r, sy + (dy / len) * r, 5, ms);
  }
}

/** From the title screen to a fresh island, by touch only. */
export async function newGameByTouch(pl: Player): Promise<void> {
  const { page } = pl;
  await expect(page.locator('.logo')).toContainText('Light Crossing');
  await pl.button(/Start|Continue/);
  await pl.button('New Game');
  // a random name with the dice button (no typing needed), then sail
  await pl.f.tapEl('button:has-text("🎲")');
  await pl.button('Set sail!');
  await page.waitForFunction(() => !!(window as unknown as { __lc: { game: unknown } }).__lc.game);
  await pl.wait(1200);
}
