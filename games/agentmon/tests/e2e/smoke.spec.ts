import { expect, test, type Page } from '@playwright/test';

const HOOK = '__agentmon';
type Snapshot = { scene: string; renderer: string; frames: number; creatures?: number };
const snapshot = (page: Page) => page.evaluate(hook => (window as unknown as Record<string, { snapshot(): Snapshot }>)[hook]!.snapshot(), HOOK);

/** Fails the test on console errors and on any request that leaves the game's own origin. */
export function watch(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', error => problems.push(`page error: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') problems.push(`console error: ${message.text()}`); });
  page.on('request', request => {
    const url = new URL(request.url());
    if (!['127.0.0.1:4246', ''].includes(url.host) && url.protocol !== 'data:' && url.protocol !== 'blob:') problems.push(`request to ${request.url()}`);
  });
  return problems;
}

test('the title screen starts with no errors and no network', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Agentmon' })).toBeVisible();
  await expect.poll(async () => (await snapshot(page)).frames, { timeout: 20_000 }).toBeGreaterThan(10);
  expect((await snapshot(page)).scene).toBe('title');
  expect(problems).toEqual([]);
});

test('the creature sheet shows all 52 Agentmon without touching saves', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/?scene=sheet');
  await expect.poll(async () => (await snapshot(page)).creatures, { timeout: 20_000 }).toBe(52);
  await expect(page.getByText('52 Aurelune')).toBeAttached();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('agentmon.')))).toEqual([]);
  expect(problems).toEqual([]);
});

test('runs inside a sandboxed iframe like on the website', async ({ page }) => {
  const problems = watch(page);
  await page.route('**/host.html', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><iframe src="/" sandbox="allow-scripts allow-same-origin allow-pointer-lock" allow="fullscreen; gamepad" style="width:960px;height:540px;border:0"></iframe>' }));
  await page.goto('/host.html');
  const frame = page.frameLocator('iframe');
  await expect(frame.getByRole('heading', { name: 'Agentmon' })).toBeVisible({ timeout: 20_000 });
  expect(problems).toEqual([]);
});
