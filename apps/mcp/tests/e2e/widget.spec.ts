// The widget in a host-like sandbox (harness/): a light game plays inline, a heavy one opens
// fullscreen, and neither logs an error or reaches outside the harness's origins.
import { expect,test } from '@playwright/test';
import { gameFrame,KNOWN,open,state,tamper,watch } from './harness';

const SITE = 'http://127.0.0.1:4332';

test('a light game plays inline: Tuck Pop from its card, with no errors and no other requests',async ({ page }) => {
  const problems = watch(page);
  const widget = await open(page,{ tool: 'show_game',args: { game: 'tuck-pop' } });
  await expect(widget.getByRole('heading',{ name: 'Tuck Pop' })).toBeVisible();
  await expect(widget.getByText('A kid-safe game for your child')).toBeVisible();
  await widget.getByRole('button',{ name: 'Try it here' }).click();
  const game = await gameFrame(page);
  await expect.poll(() => game.evaluate(() => typeof (window as any).__tuckpop?.snapshot === 'function'),{ timeout: 30_000 }).toBe(true);
  // Play: Classic, pick the first piece with 1 and place it with Enter.
  await widget.frameLocator('iframe[title="Tuck Pop, the game"]').locator('#classic').click();
  await expect.poll(() => game.evaluate(() => (window as any).__tuckpop.snapshot().screen)).toBe('play');
  await page.keyboard.press('Digit1'); await page.keyboard.press('Enter');
  await expect.poll(() => game.evaluate(() => (window as any).__tuckpop.snapshot().moves)).toBe(1);
  expect((await state(page)).modes).toEqual([]); // inline on a computer
  // Paused (Escape first puts a held piece back, then pauses): the gentle note offers the website.
  for (let i = 0; i < 3 && await game.evaluate(() => (window as any).__tuckpop.snapshot().screen) !== 'pause'; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
  await expect(widget.getByText('Keep your progress:')).toBeVisible();
  await expect(widget.getByRole('link',{ name: 'play on AI Kids Games' })).toBeVisible();
  expect(problems).toEqual([]);
});

test('a heavy game opens fullscreen: Space Sky, only after a tap',async ({ page,browserName }) => {
  // WebKit only: Space Sky's own fullscreen request is refused in assistant frames (harness.ts KNOWN).
  const problems = watch(page,{ allow: browserName === 'webkit' ? KNOWN.slice(2) : [] });
  const widget = await open(page,{ tool: 'play_game',args: { game: 'space-sky' } });
  const start = widget.getByRole('button',{ name: 'Start Space Sky' });
  await expect(start).toBeVisible();
  await expect(widget.getByText('Opens full screen')).toBeVisible();
  await page.waitForTimeout(1_000);
  expect((await state(page)).modes).toEqual([]); // nothing downloads or changes until the tap
  await start.click();
  await expect.poll(async () => (await state(page)).modes).toEqual(['fullscreen']);
  await expect(page.locator('#proxy')).toHaveClass(/fullscreen/);
  const game = await gameFrame(page);
  await expect.poll(() => game.evaluate(() => { const canvas = document.querySelector('canvas'); return !!canvas && canvas.width > 0; }),{ timeout: 45_000 }).toBe(true);
  await page.waitForTimeout(5_000); // let it run
  const box = await page.locator('#proxy').boundingBox();
  expect(box!.height).toBeGreaterThan(800);
  await expect(widget.getByRole('button',{ name: 'Exit full screen' })).toBeVisible();
  expect(problems).toEqual([]);
});

test('cards and lists keep to each host\'s rules: two actions, at most two links, our links only',async ({ page }) => {
  const problems = watch(page);
  const claude = await open(page,{ tool: 'show_game',args: { game: 'tuck-pop' } });
  await expect(claude.locator('.brand')).toContainText('AI Kids Games');
  await expect(claude.locator('.brand')).toContainText('Free · No ads · Open source');
  await expect(claude.locator('.actions > *')).toHaveCount(2);
  await expect(claude.locator('.actions > *').first()).toHaveText('Play on AI Kids Games');
  expect(await claude.locator('a').count()).toBeLessThanOrEqual(2);
  await claude.getByRole('link',{ name: 'Play on AI Kids Games' }).click();
  await expect.poll(async () => (await state(page)).links).toEqual([`${SITE}/game/tuck-pop`]);

  const chatgpt = await open(page,{ profile: 'chatgpt',tool: 'show_game',args: { game: 'tuck-pop' } });
  await expect(chatgpt.getByRole('heading',{ name: 'Tuck Pop' })).toBeVisible();
  await expect(chatgpt.locator('.brand')).toHaveCount(0); // ChatGPT shows our name and icon itself
  await expect(chatgpt.locator('.actions > *')).toHaveCount(2);
  await chatgpt.getByRole('link',{ name: 'Play on AI Kids Games' }).click();
  await expect.poll(async () => (await state(page)).links).toEqual([`${SITE}/game/tuck-pop`]); // through window.openai.openExternal

  const site = await open(page,{ tool: 'show_game',args: { game: 'cliff-valley' } });
  await expect(site.locator('.actions > *')).toHaveText(['Play on AI Kids Games','See all games']);

  const list = await open(page,{ tool: 'find_games',args: { age: 8 } });
  const items = list.locator('.mini');
  expect(await items.count()).toBeGreaterThan(2);
  for (let i = 0; i < await items.count(); i++) await expect(items.nth(i).locator('button,a')).toHaveCount(1);
  expect(await list.locator('a').count()).toBeLessThanOrEqual(2);
  await items.first().getByRole('button',{ name: 'Show me' }).click();
  await expect.poll(async () => (await state(page)).messages[0]).toMatch(/^Show me .+ from AI Kids Games\.$/);
  expect(problems).toEqual([]);
});

test('a host that blocks the fetch: the build comes through the host, still verified',async ({ page }) => {
  const problems = watch(page,{ allow: [/Content Security Policy|Refused to connect|Failed to fetch|Load failed/i] });
  const widget = await open(page,{ profile: 'strict',tool: 'show_game',args: { game: 'tuck-pop' } });
  await widget.getByRole('button',{ name: 'Try it here' }).click();
  const game = await gameFrame(page);
  await expect.poll(() => game.evaluate(() => typeof (window as any).__tuckpop?.snapshot === 'function'),{ timeout: 30_000 }).toBe(true);
  expect((await state(page)).reads).toEqual(['aikg://games/tuck-pop/index.html']);
  expect(problems).toEqual([]);
});

test('a changed build never runs',async ({ page }) => {
  await tamper(true);
  try {
    const widget = await open(page,{ tool: 'show_game',args: { game: 'tuck-pop' } });
    await widget.getByRole('button',{ name: 'Try it here' }).click();
    await expect(widget.getByText('didn\'t match the verified game')).toBeVisible();
    await expect(widget.locator('iframe')).toHaveCount(0);
    await expect(widget.getByRole('link',{ name: 'Play on AI Kids Games' }).first()).toBeVisible();
  } finally { await tamper(false); }
});

test('a gentle note when progress may not be saved',async ({ page }) => {
  const claude = await open(page,{ tool: 'play_game',args: { game: 'tuck-pop' } });
  await expect(claude.getByText('Your progress may not be saved here.')).toBeVisible();
  await expect(claude.getByRole('link',{ name: 'Play on AI Kids Games' })).toBeVisible();
  await claude.getByRole('button',{ name: 'Hide this note' }).click();
  await expect(claude.getByText('Your progress may not be saved here.')).toBeHidden();
  const none = await open(page,{ profile: 'nostorage',tool: 'play_game',args: { game: 'tuck-pop' } });
  await expect(none.getByText('This assistant can\'t save game progress.')).toBeVisible();
});

test('on touch screens every game plays fullscreen (inline frames get no vertical swipes)',async ({ page }) => {
  const widget = await open(page,{ tool: 'show_game',args: { game: 'tuck-pop' },touch: true });
  await widget.getByRole('button',{ name: 'Try it here' }).click();
  await expect.poll(async () => (await state(page)).modes).toEqual(['fullscreen']);
});

test('readable from 320 px, in light and dark',async ({ page }) => {
  for (const theme of ['light','dark']) {
    await page.setViewportSize({ width: 360,height: 900 });
    const widget = await open(page,{ tool: 'show_game',args: { game: 'agentmon' },theme,width: 320 });
    await expect(widget.getByRole('heading',{ name: 'Agentmon' })).toBeVisible();
    const overflow = await widget.locator('html').evaluate(root => root.scrollWidth-root.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await widget.locator('html').getAttribute('data-theme')).toBe(theme);
    await page.locator('#proxy').screenshot({ path: test.info().outputPath(`card-320-${theme}.png`) });
  }
});
