import { expect, test, type Page } from '@playwright/test';

const HOOK = '__blockswip';
const PREFIX = 'blockswip.';
type Snapshot = { screen: string; score: number; timeLeft: number; persistent: boolean; audio: string };
const snapshot = (page: Page) => page.evaluate(hook => (window as unknown as Record<string, { snapshot(): Snapshot }>)[hook]!.snapshot(), HOOK);

/** Fails the test on console errors and on any request that leaves the game's own origin. */
function watch(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', error => problems.push(`page error: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') problems.push(`console error: ${message.text()}`); });
  page.on('request', request => { const url = new URL(request.url()); if (!['127.0.0.1:4542', ''].includes(url.host) && url.protocol !== 'data:') problems.push(`request to ${request.url()}`); });
  return problems;
}

test('plays with keyboard or touch, pauses and resumes, with no errors and no network', async ({ page, isMobile }) => {
  const problems = watch(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Blocks (working title)' })).toBeVisible();
  await page.getByRole('button', { name: 'Play' }).click();
  await expect.poll(async () => (await snapshot(page)).screen).toBe('play');
  if (isMobile) {
    // hold the pointer down and drag it around: the firefly flies toward it
    await page.mouse.move(80, 120);
    await page.mouse.down();
    for (let i = 0; i < 20; i++) { await page.mouse.move(80 + i * 12, 120 + i * 20); await page.waitForTimeout(100); }
    await page.mouse.up();
  } else {
    for (const key of ['KeyD', 'KeyS', 'KeyA', 'KeyW']) { await page.keyboard.down(key); await page.waitForTimeout(700); await page.keyboard.up(key); }
  }
  expect((await snapshot(page)).timeLeft).toBeLessThan(60);
  // Escape pauses, the button resumes
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep playing' }).click();
  await expect.poll(async () => (await snapshot(page)).screen).toBe('play');
  expect(problems).toEqual([]);
});

test('a finished round saves the best score under the game prefix, and it survives a reload', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/?seconds=4&seed=3');
  await page.getByRole('button', { name: 'Play' }).click();
  await page.keyboard.down('KeyD'); await page.waitForTimeout(1500); await page.keyboard.up('KeyD');
  await expect(page.getByRole('heading', { name: "Time's up!" })).toBeVisible({ timeout: 10_000 });
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys).toEqual([`${PREFIX}save`]);
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), `${PREFIX}save`);
  expect(saved).toMatchObject({ v: 2, plays: 1 });
  await page.reload();
  await expect(page.locator('#best')).toHaveText(String(saved.best));
  expect(problems).toEqual([]);
});

test('the capture route shows a moment without touching saves', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/?scene=play&seed=7');
  await expect.poll(async () => (await snapshot(page)).screen).toBe('play');
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(problems).toEqual([]);
});

test('runs inside a sandboxed iframe like on the website', async ({ page }) => {
  const problems = watch(page);
  // a plain same-origin host page, like the website's play page (the game's own CSP forbids frames)
  await page.route('**/host.html', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><iframe src="/" sandbox="allow-scripts allow-same-origin allow-pointer-lock" allow="fullscreen; gamepad" style="width:960px;height:540px;border:0"></iframe>' }));
  await page.goto('/host.html');
  const frame = page.frameLocator('iframe');
  await expect(frame.getByRole('heading', { name: 'Blocks (working title)' })).toBeVisible();
  await frame.getByRole('button', { name: 'Play' }).click();
  await expect(frame.locator('#hud')).toBeVisible();
  expect(problems).toEqual([]);
});
