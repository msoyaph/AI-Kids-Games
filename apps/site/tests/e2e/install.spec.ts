import { expect,test } from '@playwright/test';
import { guard } from './games';

// "Add to Home" sits beside Play on phones and tablets. Where the browser has its own install
// prompt (Chromium's beforeinstallprompt) the button opens it; elsewhere (iPhone and iPad Safari
// here) it shows the steps. Never on a computer, and never once opened from the Home Screen.
const addToHome = (page: import('@playwright/test').Page) => page.locator('.hero-actions').getByRole('button',{ name: 'Add to Home' });

test('Add to Home shows the Safari steps on an iPhone or iPad',async ({ page },info) => {
  test.skip(info.project.name === 'desktop','phones and tablets');
  const { errors,external } = guard(page);
  await page.goto('/');
  const button = addToHome(page);
  await expect(button).toBeVisible();
  const play = await page.locator('.hero-actions .button.play').boundingBox(), add = await button.boundingBox();
  expect(Math.abs(play!.y - add!.y),'beside Play').toBeLessThan(2);
  await button.click();
  const dialog = page.getByRole('dialog',{ name: 'Add Ai Kids Games to your Home Screen' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Add to Home Screen');
  await expect(dialog).toContainText('saves from Safari don’t carry over');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();
  await button.click(); await dialog.getByRole('button',{ name: 'Got it' }).click(); await expect(dialog).toBeHidden();
  expect(errors).toEqual([]); expect(external).toEqual([]);
});

test('Add to Home opens the browser’s own install prompt where there is one',async ({ page },info) => {
  test.skip(info.project.name !== 'phone','one touch device is enough');
  const { errors,external } = guard(page);
  await page.goto('/');
  await expect(addToHome(page)).toBeVisible();
  // What Chrome on Android does once the site can be installed.
  await page.evaluate(() => {
    const event = Object.assign(new Event('beforeinstallprompt',{ cancelable: true }),{ prompt: async () => { (window as any).__prompted = true; },userChoice: Promise.resolve({ outcome: 'accepted' }) });
    window.dispatchEvent(event);
  });
  await addToHome(page).click();
  await expect.poll(() => page.evaluate(() => (window as any).__prompted)).toBe(true);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(addToHome(page),'installed').toHaveCount(0);
  expect(errors).toEqual([]); expect(external).toEqual([]);
});

test('no Add to Home on a computer or when opened from the Home Screen',async ({ page },info) => {
  if (info.project.name === 'desktop') {
    await page.goto('/'); await expect(page.locator('.hero-actions .button.play')).toBeVisible();
    await expect(addToHome(page)).toHaveCount(0);
    return;
  }
  await page.addInitScript(() => Object.defineProperty(navigator,'standalone',{ value: true }));
  await page.goto('/'); await expect(page.locator('.hero-actions .button.play')).toBeVisible();
  await expect(addToHome(page)).toHaveCount(0);
});
