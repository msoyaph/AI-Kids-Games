import { expect, test, type Page } from '@playwright/test';

// The style frame's contract checks (phase 1). Frame-rate independent: everything waits on the
// read-only hook (expect.poll), never on fixed timings. Full play tests arrive with the rules (phase 3).
const HOOK = '__gardenwip';
const PREFIX = 'gardenwip.';
type Snapshot = { screen: string; planted: number; tiles: { lane: number; col: number; x: number; y: number; free: boolean }[]; cards: { id: string; x: number; y: number; w: number; h: number }[]; drawCalls: number };
const snapshot = (page: Page) => page.evaluate(hook => (window as unknown as Record<string, { snapshot(): Snapshot }>)[hook]!.snapshot(), HOOK);

/** Fails the test on console errors and on any request that leaves the game's own origin. */
function watch(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', error => problems.push(`page error: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') problems.push(`console error: ${message.text()}`); });
  page.on('request', request => { const url = new URL(request.url()); if (!['127.0.0.1:4309', ''].includes(url.host) && url.protocol !== 'data:') problems.push(`request to ${request.url()}`); });
  return problems;
}

test('the title opens the garden; a tap on a free tile plants the chosen card', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/?quality=low');
  await expect(page.getByRole('heading', { name: 'Garden Defense (working title)' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Play' }).click();
  await expect.poll(async () => (await snapshot(page)).screen).toBe('play');
  const before = await snapshot(page);
  const free = before.tiles.find(t => t.free && t.col >= 5)!;
  await page.mouse.click(free.x, free.y);
  await expect.poll(async () => (await snapshot(page)).planted).toBe(1);
  expect((await snapshot(page)).tiles.find(t => t.lane === free.lane && t.col === free.col)!.free).toBe(false);
  // Escape pauses, the button resumes
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep playing' }).click();
  await expect.poll(async () => (await snapshot(page)).screen).toBe('play');
  expect(problems).toEqual([]);
});

test('the sound setting saves under the game prefix, and nothing else is stored', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/?quality=low');
  await page.getByRole('button', { name: 'Sound: on' }).click();
  await expect(page.getByRole('button', { name: 'Sound: off' })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([`${PREFIX}save`]);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sound: off' })).toBeVisible({ timeout: 30_000 });
  expect(problems).toEqual([]);
});

test('the capture routes show a moment without touching saves', async ({ page }) => {
  const problems = watch(page);
  for (const scene of ['style', 'stress', 'squint']) {
    await page.goto(`/?scene=${scene}&quality=low`);
    await expect.poll(async () => (await snapshot(page)).screen, { timeout: 30_000 }).toBe('play');
    expect((await snapshot(page)).drawCalls).toBeGreaterThan(0);
  }
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(problems).toEqual([]);
});

test('runs inside a sandboxed iframe like on the website', async ({ page }) => {
  const problems = watch(page);
  await page.route('**/host.html', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><iframe src="/?quality=low" sandbox="allow-scripts allow-same-origin allow-pointer-lock" allow="fullscreen; gamepad" style="width:960px;height:540px;border:0"></iframe>' }));
  await page.goto('/host.html');
  const frame = page.frameLocator('iframe');
  await expect(frame.getByRole('heading', { name: 'Garden Defense (working title)' })).toBeVisible({ timeout: 30_000 });
  await frame.getByRole('button', { name: 'Play' }).click();
  await expect(frame.locator('#hud')).toBeVisible();
  expect(problems).toEqual([]);
});
