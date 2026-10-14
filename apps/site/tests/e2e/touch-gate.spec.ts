import { expect,test } from './fixtures';
import { games } from '../../src/data/games';
import { computerOnly } from '../../src/lib/devices';
// Computer-only games come from the manifests (src/lib/devices.ts). Once every game lists touch
// controls these checks have nothing to look at and skip; the unit test keeps the rule covered.
const computerGames = games.filter(computerOnly);
const touchGame = games.find(game => !computerOnly(game))!;
const touchOnly = (page: import('@playwright/test').Page) => page.evaluate(() => !matchMedia('(any-pointer: fine)').matches && (matchMedia('(any-pointer: coarse)').matches || navigator.maxTouchPoints > 0));

test('cards and details pages show computer-only games as computer games',async ({ page }) => {
  await page.goto('/');
  const cards = page.getByRole('region',{ name: 'All games',exact: true }).locator('.card');
  await expect(cards).toHaveCount(games.length);
  for (const card of await cards.all()) {
    const title = await card.locator('.card-title').innerText();
    const game = games.find(item => item.title === title)!;
    if (computerOnly(game)) await expect(card.locator('.card-meta')).toContainText('Computer game');
    else await expect(card.locator('.card-device')).toHaveCount(0);
  }
  for (const game of [...computerGames,touchGame]) {
    await page.goto(`/game/${game.slug}`);
    const note = page.locator('.facts').getByText('Needs a keyboard and mouse or a game controller. Touch controls are coming soon.');
    if (computerOnly(game)) { await expect(note).toBeVisible(); await expect(page.locator('.facts')).toContainText('Works on'); } else await expect(note).toHaveCount(0);
  }
});

for (const game of computerGames) test(`${game.slug}: a touch-only device gets the keyboard screen instead of the game`,async ({ page },info) => {
  const requested: string[] = []; page.on('request',request => { if (request.url().includes(`/games/${game.slug}/`)) requested.push(request.url()); });
  await page.goto(`/game/${game.slug}`);
  await page.getByRole('link',{ name: 'Play',exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/play/${game.slug}$`));
  if (!await touchOnly(page)) {
    expect(info.project.name).toBe('desktop');
    await expect(page.locator('iframe')).toBeAttached(); await expect(page.locator('.touch-gate')).toHaveCount(0);
    return;
  }
  const heading = page.getByRole('heading',{ name: `${game.title} needs a keyboard and mouse or a game controller for now.` });
  await expect(heading).toBeVisible();
  await expect(page.locator('.touch-gate')).toContainText('Touch controls are coming soon!');
  await expect(page.locator('iframe')).toHaveCount(0); await expect(page.locator('.game-loading')).toHaveCount(0);
  await expect(page.getByRole('button',{ name: /fullscreen/i })).toHaveCount(0);
  // Nothing is downloaded while the screen shows, and it fits without sideways scrolling.
  await page.waitForTimeout(500); expect(requested).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const target of await page.locator('.touch-gate a, .touch-gate button, .play-bar a').all()) { const box = (await target.boundingBox())!; expect(Math.min(box.width,box.height)).toBeGreaterThanOrEqual(48); }
  await page.screenshot({ path: `test-results/touch-gate-${info.project.name}.png` });
  // Back returns to the game's page.
  await page.locator('.touch-gate').getByRole('link',{ name: 'Back' }).tap();
  await expect(page).toHaveURL(new RegExp(`/game/${game.slug}$`));
  // "I have a keyboard or controller" goes on to the game, and the screen stays away for the visit.
  await page.getByRole('link',{ name: 'Play',exact: true }).tap();
  await page.getByRole('button',{ name: 'I have a keyboard or controller' }).tap();
  await expect(page.locator('.touch-gate')).toHaveCount(0);
  await expect(page.locator('iframe')).toBeAttached();
  await expect(page.getByRole('note')).toHaveCount(0);
  await page.getByRole('link',{ name: 'Back' }).first().tap();
  await page.getByRole('link',{ name: 'Play',exact: true }).tap();
  await expect(page.locator('iframe')).toBeAttached(); await expect(page.locator('.touch-gate')).toHaveCount(0);
});

test('games with touch controls never show the keyboard screen',async ({ page }) => {
  await page.goto(`/play/${touchGame.slug}`);
  await expect(page.locator('iframe')).toBeAttached();
  await expect(page.locator('.touch-gate')).toHaveCount(0);
});
