import { expect,test } from '@playwright/test';
test('home, details, favorites and reload',async ({ page }) => {
  const errors: string[] = []; page.on('pageerror',error => errors.push(error.message));
  page.on('console',message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/'); await expect(page.getByRole('heading',{ level: 1 })).toHaveText('Little games.Big adventures.');
  await expect(page.getByRole('region',{ name: 'Featured',exact: true }).getByRole('heading',{ name: 'TheaBonk' })).toBeAttached();
  await page.getByRole('region',{ name: 'Featured',exact: true }).getByRole('button',{ name: 'Add TheaBonk to favorites' }).click();
  await page.goto('/favorites'); await expect(page.getByRole('heading',{ name: 'TheaBonk' })).toBeVisible();
  await page.reload(); await expect(page.getByRole('heading',{ name: 'TheaBonk' })).toBeVisible();
  await page.locator('.game-card-link').click(); await expect(page.getByRole('heading',{ level: 1,name: 'TheaBonk' })).toBeVisible();
  await expect(page.getByRole('link',{ name: 'Play',exact: true })).toBeVisible(); expect(errors).toEqual([]);
});
test('search and category filters work',async ({ page }) => {
  await page.goto('/games'); await page.getByRole('searchbox',{ name: 'Search games' }).fill('bonk');
  await expect(page.getByRole('heading',{ name: 'TheaBonk' })).toBeVisible(); await expect(page.getByRole('heading',{ name: 'Light Crossing' })).toHaveCount(0);
  await page.getByRole('searchbox',{ name: 'Search games' }).fill('missing game'); await expect(page.getByRole('heading',{ name: 'No games found — try another word!' })).toBeVisible();
  await page.getByRole('button',{ name: 'Show all games' }).click(); await page.getByRole('button',{ name: 'Cozy',exact: true }).click(); await expect(page.getByRole('heading',{ name: 'Light Crossing' })).toBeVisible(); await expect(page.getByRole('heading',{ name: 'TheaBonk' })).toHaveCount(0);
  await page.goto('/category/action'); await expect(page.getByRole('heading',{ level: 1,name: 'Action games' })).toBeVisible(); await expect(page.getByRole('heading',{ name: 'TheaBonk' })).toBeVisible();
});
test('theme, parental clearing, mobile notice and 404',async ({ page },testInfo) => {
  await page.goto('/'); await page.getByRole('button',{ name: 'Switch to dark mode' }).click(); await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.getByRole('button',{ name: 'Switch to light mode' }).click();
  await page.goto('/parents'); await page.getByRole('button',{ name: 'Clear saved lists' }).click(); await expect(page.getByRole('status')).toHaveText('Your saved lists have been cleared.');
  await page.goto('/not-a-page'); await expect(page.getByRole('heading',{ name: 'Oops, this page wandered off!' })).toBeVisible();
  if (testInfo.project.name === 'phone') { await page.goto('/play/theabonk'); await expect(page.getByRole('note')).toContainText('This game works best on a computer'); await page.getByRole('button',{ name: 'Play anyway' }).click(); await expect(page.getByRole('note')).toHaveCount(0); }
});
test('layout, touch targets and reduced motion',async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth); expect(overflow).toBe(false);
  await expect(page.getByRole('button',{ name: 'Pause featured games' })).toHaveCount(0);
  const tiny = await page.locator('button,a.button,.category-chip,.favorite-button,.icon-button').evaluateAll(elements => elements.filter(el => { const r = el.getBoundingClientRect(); const style = getComputedStyle(el); return r.width > 0 && style.visibility !== 'hidden' && (r.width < 48 || r.height < 48); }).map(el => el.textContent || el.getAttribute('aria-label')));
  expect(tiny).toEqual([]);
});
test('outbound links require the grown-up screen',async ({ page }) => {
  await page.goto('/'); await expect(page.getByRole('heading',{ level: 1 })).toBeVisible(); await page.evaluate(() => { const a = document.createElement('a'); a.href = 'https://example.com'; a.textContent = 'Test outside link'; document.querySelector('main')!.prepend(a); });
  await page.getByRole('link',{ name: 'Test outside link' }).click(); await expect(page.getByRole('dialog')).toContainText('Ask a grown-up first!');
  await page.getByRole('button',{ name: 'Stay here' }).click(); await expect(page.getByRole('dialog')).not.toBeVisible(); await expect(page).toHaveURL(/4190\/$/);
});
