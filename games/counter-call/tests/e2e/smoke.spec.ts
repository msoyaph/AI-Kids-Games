import { expect, test, type Page } from '@playwright/test';

const HOOK = '__countercall';
const PREFIX = 'countercall.';
/** Stations from left to right (keys 1 to 5), and how their buttons and the order bubbles name them. */
const STATIONS = ['icecream', 'burger', 'juice', 'fries', 'pizza'];
const STATION_NAME: Record<string, string> = { icecream: 'ice cream machine', burger: 'grill', juice: 'juice bar', fries: 'fryer', pizza: 'pizza oven' };
const FOOD_LABEL: Record<string, string> = { icecream: 'ice cream', burger: 'burger', juice: 'juice', fries: 'fries', pizza: 'pizza' };

type Snapshot = {
  screen: string; served: number; coins: number; persistent: boolean; audio: string; playingAs: string; trayMax: number;
  host: { tray: string[] };
  stations: { food: string; phase: string }[];
  guests: { spot: number; phase: string; order: { food: string; done: boolean }[] }[];
};
/** A URL with the CI flag: E2E_LOW asks for the game's low quality (CI draws WebGL in software). */
const at = (path: string) => (process.env.E2E_LOW ? `${path}${path.includes('?') ? '&' : '?'}quality=low` : path);
const snapshot = (page: Page) => page.evaluate(hook => (window as unknown as Record<string, { snapshot(): Snapshot }>)[hook]!.snapshot(), HOOK);

/** Fails the test on console errors and on any request that leaves the game's own origin. */
function watch(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', error => problems.push(`page error: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') problems.push(`console error: ${message.text()}`); });
  page.on('request', request => { const url = new URL(request.url()); if (!['127.0.0.1:4342', ''].includes(url.host) && url.protocol !== 'data:') problems.push(`request to ${request.url()}`); });
  return problems;
}

/** Cook what the first waiting friend ordered, pick it up and serve it: by taps or by keys. */
async function serveFirstFriend(page: Page, touch: boolean) {
  await expect.poll(async () => (await snapshot(page)).guests.some(g => g.phase === 'waiting'), { timeout: 30_000 }).toBe(true);
  const guest = (await snapshot(page)).guests.find(g => g.phase === 'waiting')!;
  const food = guest.order[0]!.food;
  const index = STATIONS.indexOf(food);
  // The floating buttons bounce and follow the scene, so tap them where they are right now.
  const useStation = () => (touch
    ? page.getByRole('button', { name: new RegExp(`^${STATION_NAME[food]}:`) }).click({ force: true })
    : page.keyboard.press(`Digit${index + 1}`));
  await useStation();
  await expect.poll(async () => (await snapshot(page)).stations[index]!.phase, { timeout: 30_000 }).toBe('ready');
  await useStation();
  await expect.poll(async () => (await snapshot(page)).host.tray, { timeout: 15_000 }).toEqual([food]);
  if (touch) await page.getByRole('button', { name: new RegExp(`^Serve .*still wants.*${FOOD_LABEL[food]}`) }).first().click({ force: true });
  else await page.keyboard.press(`Key${'QWE'[guest.spot]}`);
  await expect.poll(async () => (await snapshot(page)).served, { timeout: 15_000 }).toBe(1);
}

test('cooks and serves an order by keys or taps, pauses and resumes, with no errors and no network', async ({ page, isMobile }) => {
  const problems = watch(page);
  await page.goto(at('/?seed=5'));
  await expect(page.getByRole('heading', { name: 'Counter Call' })).toBeVisible();
  await page.getByRole('button', { name: 'Play Day 1' }).click();
  await expect.poll(async () => (await snapshot(page)).screen).toBe('play');
  await serveFirstFriend(page, isMobile);
  expect((await snapshot(page)).coins).toBeGreaterThan(0);
  // Escape pauses, the button resumes
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep playing' }).click();
  await expect.poll(async () => (await snapshot(page)).screen).toBe('play');
  expect(problems).toEqual([]);
});

test('a finished day saves its stars under the game prefix, and they survive a reload', async ({ page }) => {
  const problems = watch(page);
  await page.goto(at('/?guests=1&seed=3'));
  await page.getByRole('button', { name: 'Play Day 1' }).click();
  await serveFirstFriend(page, false);
  await expect(page.getByRole('heading', { name: 'Perfect day!' })).toBeVisible({ timeout: 30_000 });
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys).toEqual([`${PREFIX}save`]);
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), `${PREFIX}save`);
  expect(saved).toMatchObject({ v: 2, plays: 1, days: [{ stars: 3 }] });
  expect(saved.coins).toBeGreaterThan(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Day 1, Opening Day: 3 of 3 stars' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Day 2, Burger Day: 0 of 3 stars' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Play Day 2' })).toBeVisible();
  expect(problems).toEqual([]);
});

test('picks who to play as, keeps the choice after a reload, and spends coins in the shop', async ({ page }) => {
  const problems = watch(page);
  await page.goto(at('/?guests=1&seed=3'));
  await page.getByRole('button', { name: /^Play as Double Scoop/ }).click();
  await expect(page.getByText('Double hands: Carries one more thing.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /^Play as Double Scoop/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Play Day 1' }).click();
  await expect.poll(async () => (await snapshot(page)).screen).toBe('play');
  expect(await snapshot(page)).toMatchObject({ playingAs: 'double', trayMax: 4 });
  // The shop: nothing to buy with no coins, then one upgrade once some are saved.
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ v: 2, coins: 45, host: 'single', days: [] })), `${PREFIX}save`);
  await page.reload();
  await page.getByRole('button', { name: /^Shop/ }).click();
  await expect(page.getByRole('heading', { name: 'Shop' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Buy Hot stoves for 50 coins' })).toBeDisabled();
  await page.getByRole('button', { name: 'Buy Speedy shoes for 40 coins' }).click();
  await expect(page.getByRole('button', { name: 'Buy Speedy shoes for 120 coins' })).toBeDisabled();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), `${PREFIX}save`);
  expect(saved).toMatchObject({ coins: 5, host: 'single', upgrades: { shoes: 1 } });
  expect(problems).toEqual([]);
});

test('the capture route shows a moment without touching saves', async ({ page }) => {
  const problems = watch(page);
  await page.goto(at('/?scene=play&seed=7'));
  await expect.poll(async () => (await snapshot(page)).screen).toBe('play');
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(problems).toEqual([]);
});

test('runs inside a sandboxed iframe like on the website', async ({ page }) => {
  const problems = watch(page);
  // a plain same-origin host page, like the website's play page (the game's own CSP forbids frames)
  await page.route('**/host.html', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><iframe src="${at('/')}" sandbox="allow-scripts allow-same-origin allow-pointer-lock" allow="fullscreen; gamepad" style="width:960px;height:540px;border:0"></iframe>` }));
  await page.goto('/host.html');
  const frame = page.frameLocator('iframe');
  await expect(frame.getByRole('heading', { name: 'Counter Call' })).toBeVisible();
  await frame.getByRole('button', { name: 'Play Day 1' }).click();
  await expect(frame.locator('#hud')).toBeVisible();
  expect(problems).toEqual([]);
});
