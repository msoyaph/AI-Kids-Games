import { expect,test } from '@playwright/test';
import { games } from '../../src/data/games';
import { faq } from '../../src/data/faq';
import { guides } from '../../src/data/guides';
import { guard } from './games';

// Every page is built as static HTML from the app's own components, so search engines and AI
// assistants read it without running JavaScript; the app then takes over without a flash.
test.describe('without JavaScript',() => {
  test.use({ javaScriptEnabled: false });
  test('pages have their real words, headings and links',async ({ page },info) => {
    test.skip(info.project.name !== 'desktop','The static HTML is the same for every device.');
    await page.goto('/');
    await expect(page.getByRole('heading',{ level: 1 })).toHaveText('AI Kids Games: The games kids love. None of the stuff parents don’t.');
    for (const game of games) await expect(page.getByRole('region',{ name: 'All games',exact: true }).getByRole('heading',{ name: game.title })).toBeVisible();
    await page.getByRole('contentinfo').getByRole('link',{ name: 'Parent FAQ' }).click();
    await expect(page).toHaveURL(/\/faq$/);
    for (const item of faq(games)) await expect(page.getByRole('heading',{ level: 2,name: item.question })).toBeVisible();
    const tuckPop = games.find(game => game.slug === 'tuck-pop')!;
    await page.goto('/game/tuck-pop');
    await expect(page.getByRole('heading',{ level: 1,name: 'Tuck Pop' })).toBeVisible();
    await expect(page.getByText(tuckPop.description)).toBeVisible();
    const safety = page.getByRole('region',{ name: 'Safety and privacy' });
    await expect(safety).toContainText(tuckPop.ageGuidance);
    await expect(safety).toContainText(tuckPop.contentNotes);
    for (const promise of ['No ads','No purchases','No chat or messages','No accounts or sign-ups','Nothing sent anywhere']) await expect(safety).toContainText(promise);
    await expect(safety.locator('code')).toHaveText(tuckPop.storage.prefix);
    await expect(page.getByRole('link',{ name: 'Play',exact: true })).toHaveAttribute('href','/play/tuck-pop');
    await page.goto(`/guides/${guides[0]!.slug}`);
    await expect(page.getByRole('heading',{ level: 1,name: guides[0]!.title })).toBeVisible();
    await expect(page.locator('article .prose h2').first()).toBeVisible();
  });
});

test('the app takes over the prebuilt page with no loading screen or layout shift',async ({ page },info) => {
  test.skip(info.project.name === 'tablet','Desktop and phone cover both layouts.');
  const { errors,external } = guard(page);
  // Record any loading screen the app shows, and every layout shift.
  await page.addInitScript(() => {
    const seen = { loading: false,shift: 0 };
    (window as any).__takeover = seen;
    new MutationObserver(() => { if (document.querySelector('.route-loading')) seen.loading = true; }).observe(document,{ childList: true,subtree: true });
    new PerformanceObserver(list => { for (const entry of list.getEntries() as any[]) if (!entry.hadRecentInput) seen.shift += entry.value; }).observe({ type: 'layout-shift',buffered: true });
  });
  for (const path of ['/','/game/tuck-pop','/faq',`/guides/${guides[2]!.slug}`]) {
    await page.goto(path);
    await page.waitForLoadState('networkidle'); await page.waitForTimeout(500);
    const seen = await page.evaluate(() => (window as any).__takeover) as { loading: boolean; shift: number };
    expect(seen.loading,`${path}: loading screen`).toBe(false);
    expect(seen.shift,`${path}: layout shift`).toBeLessThan(0.05);
  }
  expect(errors).toEqual([]); expect(external).toEqual([]);
});

test('the FAQ, the guides and the About page link where they say',async ({ page },info) => {
  test.skip(info.project.name !== 'desktop','One layout is enough for links.');
  const { errors,external } = guard(page);
  await page.goto('/faq');
  const questions = page.getByRole('navigation',{ name: 'Questions' }).getByRole('link');
  await expect(questions).toHaveCount(faq(games).length);
  await questions.filter({ hasText: 'What ages is each game for?' }).click();
  await expect(page).toHaveURL(/#ages$/);
  for (const game of games) await expect(page.locator('#ages + * , section:has(#ages)').getByRole('link',{ name: game.title })).toBeVisible();
  await page.goto('/guides');
  await expect(page.locator('.guide-card')).toHaveCount(guides.length);
  await page.getByRole('link',{ name: new RegExp(guides[1]!.title) }).click();
  await expect(page.getByRole('heading',{ level: 1,name: guides[1]!.title })).toBeVisible();
  await page.locator('article').getByRole('link',{ name: 'parent FAQ',exact: true }).click();
  await expect(page).toHaveURL(/\/faq$/);
  await page.goto('/about');
  for (const game of games) await expect(page.locator('.prose').getByRole('link',{ name: game.title,exact: true })).toHaveAttribute('href',`/game/${game.slug}`);
  // Links that leave the site ask a grown-up first.
  await page.locator('.prose').getByRole('link',{ name: 'YouTube' }).click();
  await expect(page.getByRole('dialog')).toContainText('You’re leaving AI Kids Games');
  expect(errors).toEqual([]); expect(external).toEqual([]);
});
