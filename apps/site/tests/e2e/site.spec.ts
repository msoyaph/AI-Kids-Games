import { expect,test } from './fixtures';
import { games } from '../../src/data/games';
const allGames = (page: import('@playwright/test').Page) => page.getByRole('region',{ name: 'All games',exact: true });
test('home, details, favorites and reload',async ({ page }) => {
  const errors: string[] = []; page.on('pageerror',error => errors.push(error.message));
  page.on('console',message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/'); await expect(page.getByRole('heading',{ level: 1 })).toHaveText('AI Kids Games: The games kids love. None of the stuff parents don’t.');
  await expect(page.getByRole('region',{ name: 'Featured games' }).getByRole('link',{ name: 'Play',exact: true })).toBeVisible();
  await expect(allGames(page).getByRole('heading',{ name: 'TheaBonk' })).toBeVisible();
  await allGames(page).getByRole('button',{ name: 'Add TheaBonk to favorites' }).click();
  await page.goto('/favorites'); await expect(page.getByRole('heading',{ name: 'TheaBonk' })).toBeVisible();
  await page.reload(); await expect(page.getByRole('heading',{ name: 'TheaBonk' })).toBeVisible();
  await page.locator('.game-card-link').click(); await expect(page.getByRole('heading',{ level: 1,name: 'TheaBonk' })).toBeVisible();
  await expect(page.getByRole('link',{ name: 'Play',exact: true })).toBeVisible();
  await expect(page.getByRole('button',{ name: 'Saved: remove TheaBonk from favorites' })).toHaveAttribute('aria-pressed','true');
  expect(errors).toEqual([]);
});
test('cards show the same information for every game and no leftover labels',async ({ page }) => {
  await page.goto('/');
  const cards = allGames(page).locator('.card');
  await expect(cards).toHaveCount(games.length);
  for (const card of await cards.all()) {
    await expect(card.locator('.card-title')).not.toBeEmpty(); await expect(card.locator('.card-meta')).not.toBeEmpty(); await expect(card.locator('.card-badge')).toHaveText(/^Ages /); await expect(card.locator('.heart')).toBeVisible();
  }
  const text = await page.locator('body').innerText();
  for (const noise of ['Ready to play','Original game illustration','02 / 02','LET’S FIND SOME FUN','YOUR NEXT ADVENTURE']) expect(text).not.toContain(noise);
});
test('search and category filters work',async ({ page }) => {
  await page.goto('/games'); await page.getByRole('searchbox',{ name: 'Search games' }).fill('bonk');
  await expect(page.getByRole('heading',{ name: 'TheaBonk' })).toBeVisible(); await expect(page.getByRole('heading',{ name: 'Light Crossing' })).toHaveCount(0);
  await page.getByRole('searchbox',{ name: 'Search games' }).fill('missing game'); await expect(page.getByRole('heading',{ name: 'No games found. Try another word.' })).toBeVisible();
  await page.getByRole('button',{ name: 'Show all games' }).click(); await page.getByRole('button',{ name: 'Cozy',exact: true }).click(); await expect(page.getByRole('heading',{ name: 'Light Crossing' })).toBeVisible(); await expect(page.getByRole('heading',{ name: 'TheaBonk' })).toHaveCount(0);
  await page.goto('/category/action'); await expect(page.getByRole('heading',{ level: 1,name: 'Action games' })).toBeVisible(); await expect(page.getByRole('heading',{ name: 'TheaBonk' })).toBeVisible();
});
test('home filters: category and player age',async ({ page }) => {
  await page.goto('/');
  await allGames(page).getByRole('button',{ name: 'Racing',exact: true }).click();
  await expect(allGames(page).locator('.card-title')).toHaveText(['Calex Cart']);
  await allGames(page).getByRole('button',{ name: 'All',exact: true }).click();
  await allGames(page).getByLabel('Player age').selectOption('7');
  await expect(allGames(page).locator('.card-title')).toHaveText(['Shooberry','Agentmon','Tuck Pop','Light Crossing','Space Sky']);
});
test('theme, parental clearing, privacy and 404',async ({ page }) => {
  await page.goto('/'); await page.getByRole('button',{ name: 'Switch to dark mode' }).click(); await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.getByRole('button',{ name: 'Switch to light mode' }).click();
  await page.getByRole('contentinfo').getByRole('link',{ name: 'Privacy' }).click(); await expect(page.getByRole('heading',{ level: 1,name: 'Privacy' })).toBeVisible();
  await expect(page.locator('main')).toContainText('no accounts, sign-ups, ads, analytics, tracking');
  await expect(page.locator('main')).toContainText('IP addresses');
  await page.goto('/parents'); await expect(page.locator('main').getByRole('link',{ name: 'privacy page' })).toHaveAttribute('href','/privacy');
  await page.getByRole('button',{ name: 'Clear saved lists' }).click(); await expect(page.getByRole('status')).toHaveText('Your saved lists have been cleared.');
  await page.goto('/not-a-page'); await expect(page.getByRole('heading',{ name: 'This page wandered off.' })).toBeVisible();
});
test('layout, touch targets and reduced motion',async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of ['/','/game/light-crossing','/games','/parents']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth); expect(overflow,path).toBe(false);
    const tiny = await page.locator('button,a.button,.chip,.heart,.icon-button,.slide-pick,.nav-link,.text-link,.back-link').evaluateAll(elements => elements.filter(el => { const r = el.getBoundingClientRect(); const style = getComputedStyle(el); return r.width > 0 && style.visibility !== 'hidden' && (r.width < 48 || r.height < 48); }).map(el => el.textContent || el.getAttribute('aria-label')));
    expect(tiny,path).toEqual([]);
  }
  await page.goto('/'); await expect(page.getByRole('button',{ name: 'Pause featured games' })).toHaveCount(0);
});

// The featured row's thumbnails once set the hero's width, pushing it past the gutter (and a
// 375 px page sideways); they now share the row and wrap on the narrowest phones.
test('home fits narrow phones: the hero stays inside the gutters',async ({ page },info) => {
  test.skip(info.project.name !== 'phone','phone widths');
  for (const width of [320,375,390]) {
    await page.setViewportSize({ width,height: 740 }); await page.goto('/');
    await expect(page.locator('.hero-media')).toBeVisible();
    const fit = await page.evaluate(() => {
      const hero = document.querySelector('.hero')!.getBoundingClientRect();
      const parts = [...document.querySelectorAll('.hero-media,.hero-copy,.slide-picks,.slide-pick')].map(el => el.getBoundingClientRect().right);
      return { sideways: document.documentElement.scrollWidth - innerWidth, past: Math.max(...parts) - hero.right, gutter: innerWidth - hero.right };
    });
    expect(fit,`${width} px`).toEqual({ sideways: 0,past: expect.any(Number),gutter: 16 });
    expect(fit.past,`${width} px`).toBeLessThanOrEqual(0.5);
  }
});
test('outbound links require the grown-up screen',async ({ page }) => {
  await page.goto('/'); const home = page.url(); await expect(page.getByRole('heading',{ level: 1 })).toBeAttached(); await page.evaluate(() => { const a = document.createElement('a'); a.href = 'https://example.com'; a.textContent = 'Test outside link'; document.querySelector('main')!.prepend(a); });
  await page.getByRole('link',{ name: 'Test outside link' }).click(); await expect(page.getByRole('dialog')).toContainText('Ask a grown-up first!');
  await page.getByRole('button',{ name: 'Stay here' }).click(); await expect(page.getByRole('dialog')).not.toBeVisible(); await expect(page).toHaveURL(home);
});
test('details page: facts, gallery lightbox, quick start and all controls',async ({ page }) => {
  await page.goto('/game/space-sky');
  for (const fact of ['Age','Play time','Works on','Controls']) await expect(page.locator('.facts')).toContainText(fact);
  await page.getByRole('button',{ name: /View screenshot/ }).first().click();
  const dialog = page.getByRole('dialog',{ name: 'Screenshot' }); await expect(dialog).toBeVisible();
  const first = await dialog.locator('figcaption p').innerText();
  await page.keyboard.press('ArrowRight'); await expect(dialog.locator('figcaption p')).not.toHaveText(first);
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
  await expect(page.locator('.steps li')).toHaveCount(3);
  await page.getByText('All controls').click(); await expect(page.locator('.all-controls li').first()).toBeVisible();
});
