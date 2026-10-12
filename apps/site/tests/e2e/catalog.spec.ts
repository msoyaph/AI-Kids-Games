import { expect,test } from '@playwright/test';
import { games } from '../../src/data/games';
import { gameFrame,guard,pastTouchGate } from './games';

// The catalog comes from the game manifests: every listed game has a card, a details page and a
// play page that boots its build, with no console errors and no requests to other websites.
test('home shows every game; each details and play page opens',async ({ page }) => {
  test.setTimeout(240_000);
  const { errors,external } = guard(page);
  await page.goto('/');
  await expect(page.getByRole('heading',{ level: 1 })).toContainText('The games kids love. None of the stuff parents don’t.');
  await expect(page.locator('.home-intro p')).toHaveText('No ads. No subscriptions. No sign-ups. No tracking. Just play, or build your own.');
  const grid = page.getByRole('region',{ name: 'All games',exact: true });
  await expect(grid.locator('.card')).toHaveCount(games.length);
  for (const game of games) await expect(grid.getByRole('heading',{ name: game.title })).toBeVisible();
  for (const game of games) {
    await page.goto(`/game/${game.slug}`);
    await expect(page.getByRole('heading',{ level: 1,name: game.title })).toBeVisible();
    await expect(page.locator('.facts')).toContainText(game.ageGuidance);
    await expect(page.locator('.facts')).toContainText(game.estimatedPlayTime);
    await page.goto(`/play/${game.slug}`);
    await pastTouchGate(page);
    await expect(page.locator('.game-loading')).toBeHidden({ timeout: 60_000 });
    await expect(page.frameLocator('iframe').locator('canvas').first()).toBeAttached({ timeout: 60_000 });
  }
  expect(errors).toEqual([]); expect(external).toEqual([]);
});

test('Cliff Valley starts a new farm in the site and its save survives a reload',async ({ page },info) => {
  test.skip(info.project.name !== 'desktop','the keyboard menu flow runs on desktop; touch boot is covered above');
  test.setTimeout(240_000);
  const { errors,external } = guard(page);
  await page.goto('/game/cliff-valley');
  await expect(page.locator('.facts')).toContainText('Ages 8–14');
  await expect(page.locator('.facts')).toContainText('About 8 hours, plus endless farming');
  await page.getByRole('link',{ name: 'Play',exact: true }).click();
  await expect(page.locator('.game-loading')).toBeHidden({ timeout: 60_000 });
  const frame = page.frameLocator('iframe');
  const game = await gameFrame(page,'cliff-valley');
  await game.waitForFunction(() => (window as any).__cliffvalley?.ready === true,null,{ timeout: 90_000 });
  await frame.getByRole('button',{ name: 'Start Playing' }).click();
  await frame.getByRole('button',{ name: 'New' }).first().click();
  await frame.getByLabel('Farmer nickname').fill('Tester');
  await frame.getByLabel('Farm name').fill('Sunny');
  await frame.getByLabel('Pet name').fill('Biscuit');
  await frame.getByRole('button',{ name: 'Start farming!' }).click();
  await game.waitForFunction(() => (window as any).__cliffvalley.info?.mode === 'play',null,{ timeout: 60_000 });
  // sleeping ends the day, which saves the farm (the game's own save path)
  await game.evaluate(() => (window as any).__cliffvalley.sleep());
  await game.waitForFunction(() => (window as any).__cliffvalley.info?.day === 1,null,{ timeout: 60_000 });
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('cliffvalley.slot.')))).toEqual(['cliffvalley.slot.1']);
  // every key it wrote is its own (the site may add its own aikg: lists)
  expect((await page.evaluate(() => Object.keys(localStorage))).every(key => key.startsWith('cliffvalley.') || key.startsWith('aikg:'))).toBe(true);
  await page.reload();
  await expect(page.locator('.game-loading')).toBeHidden({ timeout: 60_000 });
  const again = await gameFrame(page,'cliff-valley');
  await again.waitForFunction(() => (window as any).__cliffvalley?.ready === true,null,{ timeout: 90_000 });
  await page.frameLocator('iframe').getByRole('button',{ name: /Continue — Tester/ }).click();
  await again.waitForFunction(() => (window as any).__cliffvalley.info?.mode === 'play',null,{ timeout: 60_000 });
  expect(await again.evaluate(() => (window as any).__cliffvalley.info.day)).toBe(1);
  expect(errors).toEqual([]); expect(external).toEqual([]);
});

test('List your game: coming soon, nothing collected, GitHub behind the grown-up check',async ({ page }) => {
  const { errors,external } = guard(page);
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link',{ name: 'List your game' }).click();
  await expect(page.getByRole('heading',{ level: 1,name: 'List your game on aikids.games' })).toBeVisible();
  await expect(page.getByText('Coming soon',{ exact: true })).toBeVisible();
  await expect(page.locator('form, input, textarea')).toHaveCount(0);
  await page.getByRole('link',{ name: 'Game listing request' }).click();
  await expect(page.getByRole('dialog')).toContainText('Ask a grown-up first!');
  await page.getByRole('button',{ name: 'Stay here' }).click();
  await page.getByRole('contentinfo').getByRole('link',{ name: 'Build your own' }).click();
  await expect(page.getByRole('dialog')).toContainText('You’re leaving Ai Kids Games');
  await page.getByRole('button',{ name: 'Stay here' }).click();
  await page.goto('/parents'); await expect(page.locator('main').getByRole('link',{ name: 'List your game' })).toHaveAttribute('href','/list-your-game');
  expect(errors).toEqual([]); expect(external).toEqual([]);
});
