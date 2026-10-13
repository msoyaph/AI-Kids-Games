import { expect, test } from '@playwright/test';
import { fakeGamepad, snapshot, watch } from './helpers';

test('a gamepad works the menus and the board', async ({ page }) => {
  const problems = watch(page);
  const press = await fakeGamepad(page);
  await page.goto('/');
  await expect(page.locator('#classic')).toBeFocused();
  await press('down'); // to Easy
  await expect(page.locator('.segmented button').first()).toBeFocused();
  await press('up');
  await expect(page.locator('#classic')).toBeFocused();
  await press('a');
  await expect.poll(async () => (await snapshot(page)).screen).toBe('play');
  await press('rb');
  await expect.poll(async () => (await snapshot(page)).play.selected).not.toBeNull();
  await press('left'); await press('up');
  await press('a');
  await expect.poll(async () => (await snapshot(page)).moves).toBe(1);
  await press('start');
  await expect.poll(async () => (await snapshot(page)).screen).toBe('pause');
  await press('b');
  await expect.poll(async () => (await snapshot(page)).screen).toBe('play');
  await press('x'); // Undo
  await expect.poll(async () => (await snapshot(page)).moves).toBe(0);
  expect(problems).toEqual([]);
});
