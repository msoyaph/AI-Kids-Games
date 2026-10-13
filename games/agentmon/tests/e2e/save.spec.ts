import { expect, test } from '@playwright/test';
import { snap, walk, watch } from './helpers';

test('save, close and come back: the adventure carries on where it was', async ({ page }, info) => {
  test.skip(info.project.name.includes('phone') || info.project.name.includes('tablet'), 'uses the keyboard');
  const problems = watch(page);
  await page.goto('/?quickstart&fasttext&at=brightmoor,16,12&flags=got-partner,mission-1,woke-up&team=spinnet:8&coins=123');
  await expect.poll(async () => (await snap(page)).map, { timeout: 20_000 }).toBe('brightmoor');
  await walk(page, 'ArrowRight', 2);
  const before = await snap(page);
  await page.keyboard.press('KeyM');
  await page.getByRole('button', { name: /Save/ }).click();
  await page.getByRole('button', { name: /Save now/ }).click();
  await expect(page.getByText('Saved!')).toBeVisible();
  // reload the page: the title, slot 3, Continue
  await page.goto('/?fasttext');
  await page.getByRole('button', { name: 'Play' }).click();
  await page.locator('.slot').nth(2).getByRole('button', { name: 'Continue' }).click();
  await expect.poll(async () => (await snap(page)).map, { timeout: 20_000 }).toBe('brightmoor');
  const after = await snap(page);
  expect({ x: after.x, y: after.y, coins: (after as { coins?: number }).coins, team: after.team?.map(t => t.species) }).toEqual({ x: before.x, y: before.y, coins: 123, team: ['spinnet'] });
  expect(after.flags).toEqual(before.flags);
  // only Agentmon's own keys were written
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.every(k => k.startsWith('agentmon.'))).toBe(true);
  // the test shortcut never overwrites a real adventure: with slot 3 taken, it plays without saving
  // (leaving the page autosaves the real one first, so compare which adventure it is, not the bytes)
  const slot3 = () => page.evaluate(() => { const s = JSON.parse(localStorage.getItem('agentmon.slot3') ?? '{}'); return { createdAt: s.createdAt, coins: s.coins, map: s.map }; });
  const real = await slot3();
  expect(real.coins).toBe(123);
  await page.goto('/?quickstart&fasttext&coins=5');
  await expect.poll(async () => (await snap(page)).map, { timeout: 20_000 }).toBe('home');
  await page.waitForTimeout(500);
  expect(await slot3()).toEqual(real);
  expect(problems).toEqual([]);
});

test('hiding the page (a tab switch, the Home button) saves where you are', async ({ page }, info) => {
  test.skip(info.project.name.includes('phone') || info.project.name.includes('tablet'), 'uses the keyboard');
  const problems = watch(page);
  await page.goto('/?quickstart&fasttext&at=brightmoor,16,12&flags=got-partner,mission-1,woke-up&team=spinnet:8');
  await expect.poll(async () => (await snap(page)).map, { timeout: 20_000 }).toBe('brightmoor');
  const savedX = () => page.evaluate(() => JSON.parse(localStorage.getItem('agentmon.slot3') ?? '{}').x as number | undefined);
  expect(await savedX()).toBe(16);
  await walk(page, 'ArrowRight', 2);
  const now = await snap(page);
  expect(now.x).not.toBe(16);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
  });
  await expect.poll(savedX).toBe(now.x);
  expect(problems).toEqual([]);
});
