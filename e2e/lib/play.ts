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
  reel: { progress: number; cursor: number; cursorV: number; zone: number; zoneW: number } | null;
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
        const app = (window as unknown as { __lc: { dev: Dev } }).__lc;
        const d = app.dev;
        const y = (d.peek() as { location: string }).location === 'island' ? (d.groundY!(wx, wz) as number) : 0;
        const p = d.screen!(wx, y + up, wz) as { x: number; y: number; visible: boolean };
        // tappable = a finger there reaches the game (toasts let touches through; buttons and menus don't),
        // with a little margin from anything else you could hit by mistake
        const reaches = (x: number, y2: number) => {
          if (x < 2 || y2 < 2 || x > innerWidth - 2 || y2 > innerHeight - 2) return false;
          const e = document.elementFromPoint(x, y2);
          return !!e && (e.matches('.tc-zone, #game') || !!e.closest('.toasts'));
        };
        const ok = p.visible && [[0, 0], [10, 0], [-10, 0], [0, 10], [0, -10]].every(([dx, dy]) => reaches(p.x + dx!, p.y + dy!));
        return { x: p.x, y: p.y, ok };
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
      // a line in the water: reel it in first (while fishing, a tap is the A button)
      if (p.cast) {
        await this.a();
        await this.idle();
      }
      const route = await this.dev<{ x: number; z: number }[] | null>('route', x, z);
      if (!route) throw new Error(`no way to ${x},${z}`);
      if (route.length === 0) return;
      // with a tool in hand, a tap on or near its ring uses it (within 1.6 tiles for the rod, App.tap):
      // walk via points away from the ring
      const ring = p.tool ? await this.dev<{ x: number; z: number } | null>('target') : null;
      let tapped = false;
      for (let k = Math.min(route.length - 1, 14); k >= 0 && !tapped; k--) {
        if (ring && Math.hypot(route[k]!.x - ring.x, route[k]!.z - ring.z) < 2) continue;
        // tapping your own tile is the A button too
        if (Math.floor(route[k]!.x) === Math.floor(p.x) && Math.floor(route[k]!.z) === Math.floor(p.z)) continue;
        // only ground you can see (a tap where a building stands in front walks you into the building)
        const s = await this.spot(route[k]!.x, route[k]!.z);
        if (!s.ok || !(await this.dev<{ same: boolean } | null>('pickAt', s.x, s.y, route[k]!.x, route[k]!.z))?.same) continue;
        await this.f.tap(s.x, s.y);
        tapped = true;
      }
      if (!tapped) {
        // every route point is under the HUD or on the tool's ring (a tap there would use the tool):
        // nudge along with the stick instead
        const before = await this.peek();
        for (let k = 0; k < Math.min(route.length, 5); k++) await this.steerTo(route[k]!.x, route[k]!.z, 0.45);
        const after = await this.peek();
        if (Math.hypot(after.x - before.x, after.z - before.z) < 0.2) throw new Error('route not on screen');
      }
      await this.wait(150);
      await this.idle();
    }
    throw new Error(`could not reach ${x},${z}`);
  }

  /** Walk up to a thing (tree, weed, item, villager...) and stand facing it by tapping it. */
  async approach(x: number, z: number, lift = 0.4): Promise<void> {
    const p = await this.peek();
    if (p.location === 'island' && Math.hypot(p.x - x, p.z - z) > 6) await this.walkTo(x, z, 3.5);
    // already standing at it with the ring on it: a tap now would use it, so don't
    const ring = await this.dev<{ x: number; z: number } | null>('target');
    if (ring && Math.floor(ring.x) === Math.floor(x) && Math.floor(ring.z) === Math.floor(z)) {
      if (!p.tool) await this.a(); // empty hands: use it, as tapping it would
      await this.idle();
      return;
    }
    // outdoors, tap it only where a tap would really land on it (not on a building standing in front)
    const tapIt = async (up: number) => {
      const s = await this.spot(x, z, up);
      if (!s.ok) return false;
      if (p.location === 'island') {
        const hit = await this.dev<{ same: boolean; thing: boolean } | null>('pickAt', s.x, s.y, x, z);
        if (!hit?.same) return false;
      }
      await this.f.tap(s.x, s.y);
      return true;
    };
    if (!(await tapIt(lift)) && !(await tapIt(0))) {
      if (p.location === 'island') {
        const s = await this.spot(x, z, 0);
        const hit = s.ok ? await this.dev<{ same: boolean; thing: boolean } | null>('pickAt', s.x, s.y, x, z) : null;
        if (hit && !hit.same && hit.thing) throw new Error(`hidden behind something at ${x},${z}`);
      }
      // hidden under the HUD: steer toward it with the stick until it's right in front, then (with empty
      // hands, like a tap would) press A; with a tool in hand the next tap / A is up to the caller
      await this.steerTo(x, z, 1.0);
      if (!(await this.peek()).tool) await this.a();
    }
    await this.wait(150);
    await this.idle();
  }

  /** Walk toward a world point with the stick (watching the screen) until within `near` tiles. */
  async steerTo(x: number, z: number, near: number): Promise<void> {
    const p0 = await this.peek();
    // already there: don't touch the screen at all (a touch that doesn't move is a tap)
    if (Math.hypot(p0.x - x, p0.z - z) <= near) return;
    const vp = this.page.viewportSize()!;
    const sx = vp.width * 0.3, sy = vp.height * 0.62;
    await this.f.start(sx, sy);
    try {
      for (let k = 0; k < 80; k++) {
        const p = await this.peek();
        if (Math.hypot(p.x - x, p.z - z) <= near) break;
        const me = await this.spot(p.x, p.z), it = await this.spot(x, z);
        const dx = it.x - me.x, dy = it.y - me.y, len = Math.hypot(dx, dy) || 1;
        await this.f.move(sx + (dx / len) * 40, sy + (dy / len) * 40);
        await this.wait(80);
      }
    } finally {
      await this.f.end();
    }
    await this.wait(200);
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
    await b.tap();
    await this.wait(200);
  }

  /** Back in free play: tap through anyone still talking, close menus, until the touch buttons show. */
  async ready(ms = 20_000): Promise<void> {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (await this.talking()) await this.talkThrough();
      else if ((await this.peek()).panel) await this.closeMenus();
      else if ((await this.page.locator('.tc-tool:visible').count()) > 0) return;
      await this.wait(250);
    }
    throw new Error('the touch controls never came back');
  }

  /** The tool ring by touch: tap Tools, then the tool. */
  async equip(label: string): Promise<void> {
    const b = this.page.locator('.ring-btn', { hasText: label }).first();
    // someone may call just as you reach for the button (the controls hide while they talk): answer, try again
    for (let k = 0; ; k++) {
      await this.ready();
      try {
        await this.page.locator('.tc-tool').first().tap({ timeout: 4000 });
        await expect(b).toBeVisible({ timeout: 3000 });
        break;
      } catch (e) {
        if (k >= 4) throw e;
      }
    }
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
        // where the hook will be in a moment (it keeps moving): hold if that's below the green
        const want = q.reel.cursor + q.reel.cursorV * 0.25 < q.reel.zone;
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
  await page.waitForFunction(() => !!(window as unknown as { __lc: { game: unknown } }).__lc.game, null, { timeout: 20_000 });
  await pl.wait(1200);
}
