import { expect, test, type Page } from '@playwright/test';
import { GAME } from '../../src/config';

type Rect = { x: number; y: number; w: number; h: number };
type Snapshot = {
  screen: string; score: number; moves: number; over: boolean; board: number[]; tray: ({ id: string; color: number } | null)[];
  play: { selected: number | null }; layout: { board: Rect; slots: Rect[]; cell: number }; persistent: boolean;
};
const snapshot = (page: Page) => page.evaluate(hook => (window as unknown as Record<string, { snapshot(): Snapshot }>)[hook]!.snapshot(), GAME.hook);

/** Fails the test on console errors and on any request that leaves the game's own origin. */
function watch(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', error => problems.push(`page error: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') problems.push(`console error: ${message.text()}`); });
  page.on('request', request => { const url = new URL(request.url()); if (!['127.0.0.1:4444', ''].includes(url.host) && !['data:', 'blob:'].includes(url.protocol)) problems.push(`request to ${request.url()}`); });
  return problems;
}

async function startClassic(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Tuck Pop' })).toBeVisible();
  await page.locator('#classic').click();
  await expect.poll(async () => (await snapshot(page)).screen).toBe('play');
}

/** Drags tray piece `slot` with the mouse so its center lands on the board's center. */
async function dragToCenter(page: Page, slot: number) {
  const s = await snapshot(page), r = s.layout.slots[slot]!, b = s.layout.board;
  await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(r.x + r.w / 2 + ((b.x + b.w / 2 - r.x - r.w / 2) * i) / 8, r.y + r.h / 2 + ((b.y + b.h / 2 - r.y - r.h / 2) * i) / 8);
  await page.mouse.up();
}

test('drag and drop with the mouse places a piece; Escape pauses; no errors, no network', async ({ page }) => {
  const problems = watch(page);
  await startClassic(page);
  await dragToCenter(page, 0);
  await expect.poll(async () => (await snapshot(page)).moves).toBe(1);
  const s = await snapshot(page);
  expect(s.score).toBeGreaterThan(0);
  expect(s.tray[0]).toBeNull();
  expect(s.board.filter(Boolean).length).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep playing' }).click();
  await expect.poll(async () => (await snapshot(page)).screen).toBe('play');
  expect(problems).toEqual([]);
});

test('tap a piece, then tap the board', async ({ page }) => {
  const problems = watch(page);
  await startClassic(page);
  const s = await snapshot(page), r = s.layout.slots[1]!, b = s.layout.board;
  await page.mouse.click(r.x + r.w / 2, r.y + r.h / 2);
  await expect.poll(async () => (await snapshot(page)).play.selected).toBe(1);
  await page.mouse.click(b.x + b.w / 2, b.y + b.h / 2);
  await expect.poll(async () => (await snapshot(page)).moves).toBe(1);
  expect((await snapshot(page)).tray[1]).toBeNull();
  expect(problems).toEqual([]);
});

test('keyboard only: pick with 1, place with Enter, move with the arrows', async ({ page }) => {
  const problems = watch(page);
  await startClassic(page);
  await page.keyboard.press('Digit1');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).moves).toBe(1);
  await page.keyboard.press('Digit2');
  for (const key of ['ArrowUp', 'ArrowUp', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft']) await page.keyboard.press(key);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).moves).toBe(2);
  expect(problems).toEqual([]);
});

test('a Classic game resumes exactly after a reload, and saves only under the game prefix', async ({ page }) => {
  const problems = watch(page);
  await startClassic(page);
  await page.keyboard.press('Digit1'); await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).moves).toBe(1);
  await page.keyboard.press('Digit2'); await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).moves).toBe(2);
  const before = await snapshot(page);
  const keys = await page.evaluate(() => Object.keys(localStorage).sort());
  expect(keys).toEqual([`${GAME.storagePrefix}run`, `${GAME.storagePrefix}save`]);
  await page.reload();
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect.poll(async () => (await snapshot(page)).screen).toBe('play');
  const after = await snapshot(page);
  expect({ board: after.board, tray: after.tray, score: after.score, moves: after.moves }).toEqual({ board: before.board, tray: before.tray, score: before.score, moves: before.moves });
  expect(problems).toEqual([]);
});

test('the capture route plays by itself without touching saves', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/?scene=combo&seed=7&speed=3');
  await expect.poll(async () => (await snapshot(page)).moves, { timeout: 15_000 }).toBeGreaterThan(2);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(problems).toEqual([]);
});

test('runs inside a sandboxed iframe like on the website', async ({ page }) => {
  const problems = watch(page);
  // a plain same-origin host page, like the website's play page (the game's own CSP forbids frames)
  await page.route('**/host.html', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><iframe src="/" sandbox="allow-scripts allow-same-origin allow-pointer-lock" allow="fullscreen; gamepad" style="width:960px;height:540px;border:0"></iframe>' }));
  await page.goto('/host.html');
  const frame = page.frameLocator('iframe');
  await expect(frame.getByRole('heading', { name: 'Tuck Pop' })).toBeVisible();
  await frame.locator('#classic').click();
  await expect(frame.locator('#hud')).toBeVisible();
  await frame.locator('body').press('Digit1');
  await frame.locator('body').press('Enter');
  await expect.poll(() => page.frames()[1]!.evaluate(hook => (window as unknown as Record<string, { snapshot(): { moves: number } }>)[hook]!.snapshot().moves, GAME.hook)).toBe(1);
  expect(problems).toEqual([]);
});
