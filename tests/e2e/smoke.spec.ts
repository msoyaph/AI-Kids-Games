import { expect, test } from './fixtures';
import { cellCenter, pickTower, expectClean, guard, isTouch, tap, testState, waitForGame } from './helpers';

test('title screen loads with no errors and no network requests', async ({ page, baseURL }) => {
  const g = guard(page, baseURL!);
  await page.goto('/');
  await expect(page.locator('.logo')).toBeVisible();
  await expect(page.getByRole('button', { name: /Campaign/ })).toBeVisible();
  // big touch targets
  const box = await page.getByRole('button', { name: /Campaign/ }).boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(48);
  await page.waitForTimeout(500);
  expectClean(g);
});

test('menus → map → build a tower → creatures poof', async ({ page, baseURL }, info) => {
  const g = guard(page, baseURL!);
  await page.goto('/');
  await page.getByRole('button', { name: /Campaign/ }).click();
  // first-time players are offered the tutorial — skip it here
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.getByRole('button', { name: 'Breach Point' }).click();
  await page.getByRole('button', { name: /Deploy/ }).click();
  await waitForGame(page);
  // the first element pick opens automatically
  await page.getByRole('button', { name: 'Water', exact: true }).click();
  expect((await testState(page)).unlocked).toEqual(['water']);

  // build a Bolt Turret next to the path
  await pickTower(page, /Bolt Turret/);
  const c = await cellCenter(page, 6, 4);
  await tap(page, info, c.x, c.y);
  if (isTouch(info)) await page.getByRole('button', { name: 'Build here' }).click();
  await expect.poll(async () => (await testState(page)).towers).toBe(1);

  await page.getByRole('button', { name: 'Send next wave' }).click();
  await expect.poll(async () => (await testState(page)).wave).toBe(1);
  await expect.poll(async () => (await testState(page)).kills, { timeout: 60_000 }).toBeGreaterThan(0);

  // select the tower and open its panel
  await page.keyboard.press('Escape').catch(() => {});
  const t = await cellCenter(page, 6, 4);
  await tap(page, info, t.x, t.y);
  await expect(page.getByRole('button', { name: 'Upgrade' })).toBeVisible();

  // pause and resume
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
  await page.getByRole('button', { name: /Resume/ }).click();
  await expect(page.getByRole('dialog', { name: 'Paused' })).toHaveCount(0);
  expectClean(g);
});

test('blocking the path shows a friendly message', async ({ page, baseURL }, info) => {
  const g = guard(page, baseURL!);
  await page.goto('/?map=w1m1&diff=easy'); // easy: enough coins for a whole wall
  await waitForGame(page);
  await page.getByRole('button', { name: 'Fire', exact: true }).click();
  await pickTower(page, /Bolt Turret/);
  // wall off column 17 except one cell, then try to close it
  for (let y = 1; y <= 10; y++) {
    const c = await cellCenter(page, 17, y);
    await tap(page, info, c.x, c.y);
    if (isTouch(info)) {
      const build = page.getByRole('button', { name: 'Build here' });
      if (await build.isEnabled().catch(() => false)) await build.click();
    }
  }
  await expect(page.getByText(/Blocked: that would seal/).first()).toBeVisible();
  expect((await testState(page)).towers).toBeLessThan(10);
  expectClean(g);
});

test('settings are saved and survive a reload', async ({ page, baseURL }) => {
  const g = guard(page, baseURL!);
  await page.goto('/');
  await page.getByRole('button', { name: /Settings/ }).click();
  const shake = page.locator('.setting', { hasText: 'Screen shake' });
  await shake.getByRole('radio', { name: 'Off' }).click();
  await page.waitForTimeout(400); // debounced save
  await page.reload();
  await page.getByRole('button', { name: /Settings/ }).click();
  await expect(page.locator('.setting', { hasText: 'Screen shake' }).getByRole('radio', { name: 'Off' })).toHaveAttribute('aria-checked', 'true');
  expectClean(g);
});

test('encyclopedia and badges open', async ({ page, baseURL }) => {
  const g = guard(page, baseURL!);
  await page.goto('/');
  await page.getByRole('button', { name: /Codex/ }).click();
  await expect(page.getByText('Eclipse Beam')).toBeVisible();
  await page.getByRole('tab', { name: /Constructs/ }).click();
  await expect(page.getByText('Archon Null')).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: /Badges/ }).click();
  await expect(page.getByText('First Contact')).toBeVisible();
  expectClean(g);
});

test('tutorial guides the first steps', async ({ page, baseURL }, info) => {
  const g = guard(page, baseURL!);
  await page.goto('/');
  await page.getByRole('button', { name: /training/i }).click();
  await waitForGame(page);
  await expect(page.getByText(/PIP online/)).toBeVisible();
  await page.getByRole('button', { name: /Next/ }).click();
  await pickTower(page, /Bolt Turret/);
  await expect(page.locator('.tutorial .bubble')).toContainText('highlighted plate');
  const c = await cellCenter(page, 5, 3);
  await tap(page, info, c.x, c.y);
  if (isTouch(info)) await page.getByRole('button', { name: 'Build here' }).click();
  await expect(page.locator('.tutorial .bubble')).toContainText('Start');
  expectClean(g);
});

test('stress mode runs with 100 creatures', async ({ page, baseURL }) => {
  const g = guard(page, baseURL!);
  await page.goto('/?stress=100');
  await expect(page.getByText(/fps/)).toBeVisible();
  await expect.poll(async () => (await testState(page)).enemies, { timeout: 30_000 }).toBeGreaterThan(80);
  expectClean(g);
});
