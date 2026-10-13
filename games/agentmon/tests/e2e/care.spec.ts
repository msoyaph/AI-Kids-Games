/** Pet care (1.1): pet a friend, dress it up, and play Bubble Catch with the keyboard. */
import { expect, test } from '@playwright/test';
import { snap, watch } from './helpers';

test('pet care: pet, dress up and Bubble Catch with the arrow keys', async ({ page }, info) => {
  test.skip(info.project.name.includes('phone'), 'the keyboard version; touch play is checked by hand');
  test.setTimeout(180_000);
  const problems = watch(page);
  await page.goto('/?quickstart&fasttext&at=home,6,5&flags=got-partner,mission-1,beacon-lighthouse&team=spinnet:12');
  await expect.poll(async () => (await snap(page)).scene, { timeout: 20_000 }).toBe('overworld');
  await page.keyboard.press('KeyM');
  await page.getByRole('button', { name: /Team/ }).first().click();
  await page.locator('.friend-btn').first().click();
  await page.getByRole('button', { name: /Care/ }).click();
  await expect(page.locator('.care-stage img')).toBeVisible();
  // petting: a reaction that names the friend
  await page.getByRole('button', { name: /Pet/ }).click();
  await expect(page.locator('.care-say')).toContainText('Spinnet');
  // dressing up: the Sailor Hat is earned by the Lighthouse Beacon; locked ones say how to earn them
  await page.getByRole('button', { name: /Dress up/ }).click();
  await expect(page.locator('.acc-btn.locked').first()).toBeVisible();
  await page.getByRole('button', { name: /Sailor Hat/ }).click();
  await expect(page.locator('.acc-btn.on')).toContainText('Sailor Hat');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  // Bubble Catch: the arrow keys move the friend, and it always ends happily
  await page.getByRole('button', { name: /Play/ }).click();
  const friend = page.locator('.bubble-friend');
  await expect(friend).toBeVisible();
  const x0 = await friend.evaluate(el => el.getBoundingClientRect().x);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowRight');
  await expect.poll(() => friend.evaluate(el => el.getBoundingClientRect().x)).toBeGreaterThan(x0 + 20);
  await page.getByRole('button', { name: 'Done' }).click({ timeout: 60_000 });
  await expect(page.locator('.care-say')).toContainText('fun');
  await expect(page.locator('.hearts').first()).toBeVisible();
  expect(problems).toEqual([]);
});
