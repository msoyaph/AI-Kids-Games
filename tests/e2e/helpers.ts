import { expect, type Page } from '@playwright/test';

declare global {
  interface Window {
    __calex: { app: any };
  }
}

/** Collect console errors and any request that leaves localhost/file/data. */
export function watch(page: Page): { errors: string[]; external: string[] } {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    const u = r.url();
    if (!/^(http:\/\/localhost|file:|data:|blob:|about:)/.test(u)) external.push(u);
  });
  return { errors, external };
}

export async function boot(page: Page, url = '/'): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => !!window.__calex?.app);
  await expect(page.locator('#boot')).toBeHidden({ timeout: 15_000 });
}

/** Tap/click a menu button by visible text. */
export async function press(page: Page, text: string | RegExp, isTouch: boolean): Promise<void> {
  const b = page.locator('.ui-root [data-nav]').filter({ hasText: text }).first();
  await expect(b).toBeVisible();
  if (isTouch) await b.tap();
  else await b.click();
}

/** Start a quick Versus race directly through the debug hook (player kart on autopilot). */
export async function quickRace(page: Page, opts: { track?: string; ai?: number; autopilot?: boolean } = {}): Promise<void> {
  await page.evaluate(({ track, ai, autopilot }) => {
    const a = window.__calex.app;
    if (!a.saves.data) a.saves.create(3, 'E2E');
    const ids = ['pip', 'juno', 'mochi', 'grumbo', 'bo', 'fennel', 'luma'].slice(0, ai);
    a.startSession(
      {
        mode: 'versus',
        trackId: track,
        speedClass: 'pro',
        mirror: false,
        items: true,
        itemSet: 'all',
        laps: 3,
        players: [{ racerId: 'calex', kart: { body: 'zoomster', wheels: 'standard', glider: 'kite', paint: 'cherry', decal: 'none' }, source: { kind: 'any' } }],
        ai: ids.map((id: string) => ({ racerId: id, kart: { body: 'bubble', wheels: 'standard', glider: 'kite', paint: 'ocean', decal: 'none' } })),
        seed: 7,
        intro: false,
      },
      () => {},
    );
    if (autopilot) {
      const k = a.session.world.karts[0];
      k.player = -1;
      a.session.ai.takeOver(k);
      k.player = 0;
    }
  }, { track: opts.track ?? 'seashell-boardwalk', ai: opts.ai ?? 3, autopilot: opts.autopilot ?? true });
}
