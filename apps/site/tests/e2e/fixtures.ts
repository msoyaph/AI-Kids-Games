// The site's browser tests use this `test`: every page arrives prebuilt (scripts/generate-route-
// shells.ts) and the app takes it over on its first render (src/main.tsx), which then marks
// <html data-app="ready">. Until then the page is inert, so a tap a few milliseconds after loading
// is lost; people don't tap that fast, tests do. After every load or reload of a site page, wait
// for the app before acting. Other documents (a game file, the play origin, text files) have no
// #root and aren't waited on.
import { test as base,type Page } from '@playwright/test';

export { devices,expect,type Frame,type Locator,type Page } from '@playwright/test';

async function appReady(page: Page) {
  if (await page.locator('#root').count()) await page.locator('html[data-app="ready"]').waitFor({ state: 'attached',timeout: 30_000 });
}

export const test = base.extend({
  page: async ({ page,javaScriptEnabled },use) => {
    // Without JavaScript (the prebuilt pages' own test) the app never runs: nothing to wait for.
    if (javaScriptEnabled === false) { await use(page); return; }
    const goto = page.goto.bind(page),reload = page.reload.bind(page);
    page.goto = async (url,options) => { const response = await goto(url,options); if (options?.waitUntil !== 'commit') await appReady(page); return response; };
    page.reload = async options => { const response = await reload(options); await appReady(page); return response; };
    await use(page);
  }
});
