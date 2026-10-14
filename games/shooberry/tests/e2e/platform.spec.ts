import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PREFIX, at, playing, snap, watch } from './helpers';

const desktopOnly = (name: string) => name !== 'chromium-desktop' && name !== 'webkit-desktop';

test('works opened straight from the file (file://), with no network', async ({ page }, info) => {
  test.skip(desktopOnly(info.project.name), 'one check per browser');
  const problems = watch(page);
  const file = pathToFileURL(resolve('dist/index.html')).href;
  await page.goto(`${file}${process.env.E2E_LOW ? '?quality=low' : ''}`);
  await expect(page.getByRole('heading', { name: 'Shooberry' })).toBeVisible({ timeout: 30_000 });
  await page.goto(`${file}?level=meadow-1&seeds=comfrey${process.env.E2E_LOW ? '&quality=low' : ''}`);
  await playing(page);
  expect(problems).toEqual([]);
});

test('runs inside a sandboxed iframe like on the website', async ({ page }) => {
  const problems = watch(page);
  await page.route('**/host.html', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><body style="margin:0"><iframe src="${at('/')}" sandbox="allow-scripts allow-same-origin allow-pointer-lock" allow="fullscreen; gamepad" style="width:100vw;height:100vh;border:0"></iframe>` }));
  await page.goto('/host.html');
  const frame = page.frameLocator('iframe');
  await expect(frame.getByRole('heading', { name: 'Shooberry' })).toBeVisible({ timeout: 30_000 });
  await frame.getByRole('button', { name: 'Play', exact: true }).click();
  await frame.getByRole('button', { name: 'Level 1, 0 of 3 stars' }).click();
  await expect(frame.getByRole('button', { name: "Let's grow!" })).toBeVisible();
  expect(problems).toEqual([]);
});

test('the capture routes show a moment without touching saves', async ({ page }, info) => {
  test.skip(desktopOnly(info.project.name), 'one check per browser');
  const problems = watch(page);
  for (const scene of ['title', 'wave', 'boss', 'planting', 'world&w=desert', 'stress']) {
    await page.goto(at(`/?scene=${scene}`));
    await expect.poll(async () => (await snap(page)).drawCalls, { timeout: 30_000 }).toBeGreaterThan(0);
  }
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(problems).toEqual([]);
});

test('settings apply at once and save; test shortcuts never overwrite a real save', async ({ page }, info) => {
  test.skip(desktopOnly(info.project.name), 'one check per browser');
  const problems = watch(page);
  await page.goto(at('/'));
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Bigger text').check();
  await page.getByLabel('Patterns for colourblind players').check();
  expect(await page.evaluate(() => [...document.body.classList].sort())).toEqual(expect.arrayContaining(['large', 'patterns']));
  const saved = await page.evaluate(key => localStorage.getItem(key), `${PREFIX}save`);
  expect(saved).toContain('"largeText":true');
  expect(saved).toContain('"patterns":true');
  await page.goto(at('/?level=meadow-1&seeds=comfrey,rowan&testmode=1&speed=16&bot=good'));
  await playing(page);
  expect((await snap(page)).noSave).toBe(true);
  await expect.poll(async () => (await snap(page)).result, { timeout: 180_000, intervals: [500] }).not.toBeNull();
  await page.goto(at('/'));
  expect(await page.evaluate(key => localStorage.getItem(key), `${PREFIX}save`)).toBe(saved);
  expect(problems).toEqual([]);
});

test('without storage the game still plays, and says progress lasts until it closes', async ({ page }, info) => {
  test.skip(desktopOnly(info.project.name), 'one check per browser');
  const problems = watch(page);
  await page.addInitScript(() => {
    const fail = () => { throw new DOMException('blocked', 'SecurityError'); };
    Object.defineProperty(window, 'localStorage', { get: fail, configurable: true });
  });
  await page.goto(at('/'));
  await expect(page.getByText("This browser can't save progress")).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Level 1, 0 of 3 stars' }).click();
  await page.getByRole('button', { name: "Let's grow!" }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to the picnic!' })).toBeVisible();
  expect(problems).toEqual([]);
});
