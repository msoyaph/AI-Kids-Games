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
  expect(problems).toEqual([]);
});
