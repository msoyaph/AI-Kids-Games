import { expect,test } from './fixtures';
import { boot,guard,instrument,launchGames,startGame,verifySaveReload } from './games';
for (const game of launchGames) test(`${game.slug}: home → details → play, 20 seconds clean, durable save`,async ({ page },info) => {
  await instrument(page); const checks = guard(page);
  await page.goto('/');
  const card = page.getByRole('region',{ name:'All games',exact:true }).locator('.game-card-link').filter({ has: page.getByRole('heading',{ name:game.title,exact:true }) });
  await card.click();
  await expect(page.getByRole('heading',{ level:1,name:game.title })).toBeVisible();
  await expect(page.getByRole('link',{ name:'Play',exact:true })).toHaveAttribute('href',`/play/${game.slug}`);
  if (game.slug === 'calex-cart') await expect(page.getByRole('region',{ name:'Safety and privacy' })).toContainText(/Split-screen needs a keyboard or gamepads/);
  const f = await startGame(page,game.slug,!!info.project.use.hasTouch);
  await expect(page.locator('iframe')).toHaveAttribute('sandbox','allow-scripts allow-same-origin allow-pointer-lock');
  await expect(page.locator('iframe')).toHaveAttribute('allow','fullscreen; gamepad');
  expect(await f.evaluate(() => navigator.getGamepads().length >= 0)).toBe(true);
  await page.waitForTimeout(20000);
  const ops: { method:string;key:string }[] = await f.evaluate(() => (window as any).__qaStorage);
  expect(ops.filter(op => op.method === 'clear' || !game.prefix.test(op.key))).toEqual([]);
  await verifySaveReload(f,game.slug);
  expect(checks.errors).toEqual([]); expect(checks.external).toEqual([]);
  await page.screenshot({ path:`test-results/${game.slug}-${info.project.name}.png` });
});
test('every game preserves favorites, recent history and one another’s saves',async ({ page },info) => {
  test.setTimeout(300000); await instrument(page); const checks = guard(page);
  await page.goto('/');
  for (const game of launchGames) await page.getByRole('region',{ name:'All games',exact:true }).getByRole('button',{ name:`Add ${game.title} to favorites` }).click();
  const saved = new Map<string,string>();
  for (const game of launchGames) {
    const f = await startGame(page,game.slug,!!info.project.use.hasTouch);
    await expect.poll(() => f.evaluate(key => localStorage.getItem(key),game.key)).not.toBeNull();
    await page.goto('/games');
    for (const [key,value] of saved) expect(await page.evaluate(key => localStorage.getItem(key),key)).toBe(value);
    saved.set(game.key,(await page.evaluate(key => localStorage.getItem(key),game.key))!);
  }
  await page.reload();
  const lists = await page.evaluate(() => ({ favorites:JSON.parse(localStorage.getItem('aikg:favorites')!),recent:JSON.parse(localStorage.getItem('aikg:recent')!) }));
  expect(lists.favorites).toEqual(launchGames.map(g => g.slug)); expect(lists.recent).toEqual(launchGames.map(g => g.slug).reverse());
  await page.goto('/parents'); await page.getByRole('button',{ name:'Clear saved lists' }).click();
  for (const [key,value] of saved) expect(await page.evaluate(key => localStorage.getItem(key),key)).toBe(value);
  expect(checks.errors).toEqual([]); expect(checks.external).toEqual([]);
});
test('age filtering and new categories',async ({ page }) => {
  await page.goto('/games'); await page.getByLabel('Player age').selectOption('6');
  await expect(page.locator('.game-grid h3')).toHaveText(['Light Crossing','Space Sky','Tuck Pop']);
  await page.reload(); await expect(page.getByLabel('Player age')).toHaveValue('6');
  await page.getByLabel('Player age').selectOption('10'); await expect(page.locator('.game-grid h3')).toHaveCount(launchGames.length);
  for (const name of ['Strategy','Racing','Learning','Cozy','Farming','Puzzle','Casual','RPG']) await expect(page.getByRole('button',{ name,exact:true })).toBeVisible();
});
test('fullscreen works in the embedding browser',async ({ page },info) => {
  test.skip(info.project.name !== 'desktop','Native Safari behavior is covered by the real-device checklist.');
  for (const game of launchGames) {
    const f = await boot(page,game.slug); expect(await f.evaluate(() => document.fullscreenEnabled)).toBe(true);
    await page.getByRole('button',{ name:'Enter fullscreen' }).click();
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
    // in fullscreen the top bar hides; the corner button's menu leaves it (tests/e2e/fullscreen.spec.ts)
    await page.getByRole('button',{ name:'Game menu' }).click();
    await page.getByRole('group',{ name:'Game menu' }).getByRole('button',{ name:'Exit fullscreen' }).click();
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  }
});
