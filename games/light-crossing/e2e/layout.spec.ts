// Every screen on every phone and tablet size, portrait and landscape, with a simulated notch / home
// bar: nothing off screen or under the notch, no overlapping or tiny tap targets, readable text,
// and the HUD never covering a menu. LAYOUT_SHOTS=<dir> also saves a screenshot of each.
import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SCREENS, VIEWPORTS, checkLayout, setInsets } from './lib/screens';

const LOW = !!process.env.E2E_LOW;
const SHOTS = process.env.LAYOUT_SHOTS;

for (const v of VIEWPORTS) {
  test(`every screen fits: ${v.name}`, async ({ browser, browserName }, info) => {
    test.setTimeout((LOW ? 40_000 : 12_000) * SCREENS.length);
    const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, baseURL: info.project.use.baseURL });
    const page = await ctx.newPage();
    if (SHOTS) mkdirSync(SHOTS, { recursive: true });
    const problems: string[] = [];
    for (const s of SCREENS) {
      await page.goto(LOW ? '/?quality=low' : '/');
      await page.waitForFunction(() => !!(window as unknown as { __lc?: { dev?: unknown } }).__lc?.dev);
      await setInsets(page, v);
      await s.setup(page);
      await page.waitForTimeout(LOW ? 2500 : 1200);
      for (const i of await checkLayout(page, v.insets)) problems.push(`${s.name}: ${i.kind} ${i.what} ${i.detail}`);
      if (SHOTS) await page.screenshot({ path: join(SHOTS, `${browserName}-${v.name}-${s.name}.jpg`), type: 'jpeg', quality: 70 });
    }
    await ctx.close();
    expect(problems).toEqual([]);
  });
}
