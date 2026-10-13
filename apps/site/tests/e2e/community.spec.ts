import { expect,test,type Page } from '@playwright/test';
import { guard } from './games';

// Community games (apps/play, scripts/lib/community.ts). CI and local test builds set
// AIKG_COMMUNITY_ROOT=apps/site/tests/fixtures/community: Test Garden stands for a submitted game
// (shown as a preview) and Test Gone is unlisted. The play origin runs on 127.0.0.1:4320, a second
// origin, as the hosted games run from their own addresses. Without community games (the live site
// until the owner approves one) only the empty Community page applies.
const PLAY = process.env.AIKG_PLAY_BASE || 'http://127.0.0.1:4320';
const fixtures = !process.env.AIKG_BASE_URL && !!process.env.AIKG_COMMUNITY_ROOT;
const SANDBOX = 'allow-scripts allow-same-origin allow-pointer-lock';

async function noFullscreenTip(page: Page) {
  const tip = page.getByRole('dialog',{ name: 'Play fullscreen?' });
  if (await tip.isVisible()) await tip.getByRole('button',{ name: 'Not now' }).click();
}

test('Community page without community games: a friendly empty state',async ({ page }) => {
  test.skip(fixtures,'this build has community games');
  const { errors,external } = guard(page);
  await page.goto('/community');
  await expect(page.getByRole('heading',{ level: 1,name: 'Community games' })).toBeVisible();
  await expect(page.getByRole('heading',{ name: 'No community games yet.' })).toBeVisible();
  await page.getByRole('link',{ name: 'How to submit a game' }).click();
  await expect(page).toHaveURL(/\/list-your-game$/);
  await page.goto('/'); await expect(page.getByRole('heading',{ name: 'Community games' })).toHaveCount(0);
  expect(errors).toEqual([]); expect(external).toEqual([]);
});

test.describe('with community games',() => {
  test.skip(!fixtures,'needs a build with AIKG_COMMUNITY_ROOT=apps/site/tests/fixtures/community');

  test('the shelf: Home and the Community page credit the maker; unlisted games appear nowhere',async ({ page }) => {
    const { errors,external } = guard(page);
    await page.goto('/');
    const shelf = page.getByRole('region',{ name: 'Community games' });
    const card = shelf.getByRole('link',{ name: /Test Garden/ }).first();
    await expect(card).toBeVisible();
    await expect(shelf).toContainText('Made by @aikg-tests');
    await expect(shelf.locator('.card-community')).toHaveText('Preview');
    await shelf.getByRole('link',{ name: 'See all community games' }).click();
    await expect(page.getByRole('heading',{ level: 1,name: 'Community games' })).toBeVisible();
    await expect(page.locator('main')).toContainText('Test Garden');
    // First-party lists stay first-party: the catalog and its count are unchanged.
    await page.goto('/games'); await expect(page.locator('main')).not.toContainText('Test Garden');
    for (const path of ['/','/community','/games']) { await page.goto(path); await expect(page.locator('main')).not.toContainText('Test Gone'); }
    expect((await page.goto('/game/test-gone'))?.status()).toBe(404);
    expect((await page.goto('/play/test-gone'))?.status()).toBe(404);
    await expect(page.getByRole('heading',{ level: 1 })).toBeVisible();
    expect(errors).toEqual([]); expect(external).toEqual([]);
  });

  test('details: credit, preview note, safety, favorites and the report link behind the grown-up check',async ({ page }) => {
    const { errors,external } = guard(page);
    await page.goto('/game/test-garden');
    await expect(page.getByRole('heading',{ level: 1,name: 'Test Garden' })).toBeVisible();
    await expect(page.locator('.credit')).toContainText('Made by @aikg-tests');
    await expect(page.getByRole('note')).toContainText('hasn’t been reviewed yet');
    await expect(page.getByRole('link',{ name: 'Community games' }).first()).toHaveAttribute('href','/community');
    const safety = page.getByRole('region',{ name: 'Safety and privacy' });
    await expect(safety).toContainText('runs from that separate address, so it can’t reach this site or other games');
    await expect(safety).toContainText(new URL(PLAY).host);
    const report = page.getByRole('link',{ name: 'Report a problem with this game' });
    await expect(report).toHaveAttribute('href',/\/issues\/new\?template=community-game-report\.yml&game=test-garden&title=Problem%20with%20Test%20Garden$/);
    await report.click();
    await expect(page.getByRole('dialog')).toContainText('Ask a grown-up first!');
    await page.getByRole('button',{ name: 'Stay here' }).click();
    await page.getByRole('button',{ name: 'Save Test Garden to favorites' }).click();
    await page.goto('/favorites');
    await expect(page.locator('main')).toContainText('Test Garden');
    // JSON-LD credits the maker, and the page sits under Community in the breadcrumbs.
    await page.goto('/game/test-garden');
    const data = (await page.locator('script[type="application/ld+json"]').allTextContents()).join('\n');
    expect(data).toContain('"@type":"Person","name":"@aikg-tests"');
    expect(data).toContain('"name":"Community"');
    expect(errors).toEqual([]); expect(external).toEqual([]);
  });

  test('play: the game runs from its own origin, in the same sandbox, and can’t reach the site',async ({ page }) => {
    const { errors,external } = guard(page,undefined,new URL(PLAY).origin);
    await page.goto('/game/test-garden');
    await page.getByRole('link',{ name: /^Play/ }).first().click();
    await expect(page).toHaveURL(/\/play\/test-garden$/);
    await noFullscreenTip(page);
    const iframe = page.locator('iframe');
    await expect(iframe).toHaveAttribute('src',`${PLAY}/test-garden/`);
    await expect(iframe).toHaveAttribute('sandbox',SANDBOX);
    await expect(iframe).toHaveAttribute('allow','fullscreen; gamepad');
    await expect(page.locator('.game-loading')).toBeHidden({ timeout: 30_000 });
    await noFullscreenTip(page);
    const frame = (await iframe.elementHandle())!.contentFrame();
    const game = (await frame)!;
    await game.waitForFunction(() => typeof (window as any).__testgarden?.snapshot === 'function',null,{ timeout: 30_000 });
    await expect(page.frameLocator('iframe').locator('canvas').first()).toBeVisible();
    // A different origin: the game can't read the page around it, and its saves never land in the site's storage.
    expect(await game.evaluate(() => { try { return window.parent.document.title; } catch { return 'blocked'; } })).toBe('blocked');
    await game.evaluate(() => localStorage.setItem('testgarden.save','{"best":1}'));
    expect(await page.evaluate(() => Object.keys(localStorage).filter(key => !key.startsWith('aikg:')))).toEqual([]);
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain(`frame-src 'self' ${new URL(PLAY).origin};`);
    await page.getByRole('link',{ name: 'Back' }).first().click();
    await expect(page).toHaveURL(/\/game\/test-garden$/);
    expect(errors).toEqual([]); expect(external).toEqual([]);
  });

  test('the play origin: strict headers, no connections, one game per address',async ({ page,request }) => {
    const response = await request.get(`${PLAY}/test-garden/`);
    expect(response.status()).toBe(200);
    const headers = response.headers(), csp = headers['content-security-policy'] ?? '';
    for (const rule of ["default-src 'none'","connect-src 'none'","frame-src 'none'","form-action 'none'",'frame-ancestors ']) expect(csp).toContain(rule);
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('no-referrer');
    expect((await request.get(`${PLAY}/test-gone/`)).status()).toBe(404);
    expect((await request.get(`${PLAY}/nothing-here/`)).status()).toBe(404);
    // The policy blocks every connection, even to its own address.
    await page.goto(`${PLAY}/test-garden/`);
    expect(await page.evaluate(() => fetch('/test-garden/').then(() => 'connected',() => 'blocked'))).toBe('blocked');
  });

  test('search and AI assistants: the sitemap and llms.txt list the community game, not the unlisted one',async ({ request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text(), llms = await (await request.get('/llms.txt')).text();
    for (const path of ['/community','/game/test-garden']) expect(sitemap).toContain(`${path}</loc>`);
    expect(llms).toContain('## Community games'); expect(llms).toContain('Made by @aikg-tests');
    for (const text of [sitemap,llms]) { expect(text).not.toContain('test-gone'); expect(text).not.toContain('/play/test-garden'); }
  });
});
