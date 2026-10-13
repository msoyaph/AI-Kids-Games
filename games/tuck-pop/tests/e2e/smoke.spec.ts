import { expect, test, type Page } from '@playwright/test';
import { GAME } from '../../src/config';
import { snapshot, startClassic, watch } from './helpers';

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
  // like a player: if it doesn't fit there (the first piece is in the way), move it and try again
  for (let tries = 0; tries < 10 && (await snapshot(page)).moves < 2; tries++) {
    await page.keyboard.press('Enter');
    if ((await snapshot(page)).moves < 2) await page.keyboard.press(tries < 5 ? 'ArrowDown' : 'ArrowRight');
  }
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

test('Relax gives a free Undo; the Daily puzzle counts its 40 moves down and is the same after a reload', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/');
  await page.locator('#relax').click();
  await expect.poll(async () => (await snapshot(page)).screen).toBe('play');
  await expect(page.locator('#undo-count')).toHaveText('free');
  await page.keyboard.press('Digit1'); await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).moves).toBe(1);
  await page.locator('#undo').click();
  await expect.poll(async () => (await snapshot(page)).moves).toBe(0);
  await expect(page.locator('#undo-count')).toHaveText('2'); // the free one is used; the supply is untouched
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Home' }).click();
  await page.locator('#daily').click();
  await expect(page.locator('#moves-left')).toBeVisible();
  await expect(page.locator('#moves')).toHaveText('40');
  const first = (await snapshot(page)).board;
  await page.keyboard.press('Digit1'); await page.keyboard.press('Enter');
  await expect(page.locator('#moves')).toHaveText('39');
  await page.reload();
  await page.locator('#daily').click();
  await expect(page.locator('#moves')).toHaveText('39');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'New game' }).click();
  expect((await snapshot(page)).board).toEqual(first); // today's puzzle again, from the start
  expect(problems).toEqual([]);
});

test('Adventure: the map opens level 1, the card shows the goal, and play shows its progress', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/');
  await page.locator('#adventure').click();
  await expect(page.getByRole('heading', { name: 'Adventure' })).toBeVisible();
  await expect(page.getByRole('listitem', { name: /Level 2, locked/ })).toBeDisabled();
  await page.getByRole('listitem', { name: /^Level 1,/ }).click();
  await expect(page.locator('#intro-title')).toHaveText('Clear 3 lines!');
  await expect(page.locator('#intro-tip')).toBeVisible();
  await page.locator('#intro-start').click();
  await expect.poll(async () => (await snapshot(page)).screen).toBe('play');
  await expect(page.locator('#goal-text')).toHaveText('Lines');
  await expect(page.locator('#goal-count')).toHaveText('0/3');
  await page.keyboard.press('Digit1'); await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).moves).toBe(1);
  expect(await page.evaluate(() => Object.keys(localStorage).every(k => k.startsWith('tuckpop.')))).toBe(true);
  expect(problems).toEqual([]);
});

test('themes: only Sunny is open at first; settings turn on symbols and high contrast', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/');
  await page.locator('#themes-btn').click();
  const cards = page.locator('.theme-card');
  await expect(cards).toHaveCount(6);
  await expect(cards.nth(0)).toBeEnabled();
  for (let i = 1; i < 6; i++) await expect(cards.nth(i)).toBeDisabled();
  await expect(cards.nth(0)).toHaveAttribute('aria-checked', 'true');
  await page.locator('#themes-back').click();
  await page.locator('#settings-btn').click();
  await page.locator('#set-symbols').check();
  await page.locator('#set-contrast').check();
  await page.locator('#set-text').selectOption('2');
  await page.locator('#settings-done').click();
  const s = await page.evaluate(() => (window as unknown as { __tuckpop: { snapshot(): { settings: { symbols: boolean; contrast: boolean; text: number } } } }).__tuckpop.snapshot().settings);
  expect(s).toMatchObject({ symbols: true, contrast: true, text: 2 });
  await expect(page.locator('body')).toHaveClass(/hc/);
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tuckpop.save')!).settings)).toMatchObject({ symbols: true, contrast: true, text: 2 });
  expect(problems).toEqual([]);
});
