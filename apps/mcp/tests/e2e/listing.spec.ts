// Directory screenshots (listing/screenshots/), only when asked: AIKG_LISTING=1 npm run test:e2e --workspace apps/mcp -- listing
//   ChatGPT: one per starter prompt, 706 px wide, 400–860 px tall, ChatGPT's look (no logo in the widget).
//   Claude:  3–5 PNGs at least 1000 px wide, cropped to the app.
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect,test,type Page } from '@playwright/test';
import { gameFrame,open } from './harness';

test.skip(!process.env.AIKG_LISTING,'Set AIKG_LISTING=1 to write the listing screenshots.');
const dir = resolve(import.meta.dirname,'../../listing/screenshots');

async function shoot(page: Page,file: string,{ maxHeight }: { maxHeight?: number } = {}) {
  mkdirSync(resolve(file,'..'),{ recursive: true });
  const box = (await page.locator('#proxy').boundingBox())!;
  await page.screenshot({ path: file,clip: { x: box.x,y: box.y,width: box.width,height: Math.min(box.height,maxHeight ?? box.height) } });
}
async function playTuckPop(page: Page,widget: Awaited<ReturnType<typeof open>>) {
  await widget.getByRole('button',{ name: /Try it here|Start Tuck Pop/ }).click();
  const game = await gameFrame(page);
  await expect.poll(() => game.evaluate(() => typeof (window as any).__tuckpop?.snapshot === 'function'),{ timeout: 30_000 }).toBe(true);
  await widget.frameLocator('iframe[title="Tuck Pop, the game"]').locator('#classic').click();
  await page.keyboard.press('Digit1'); await page.keyboard.press('Enter');
  await page.waitForTimeout(1_500);
}

test('ChatGPT: 706 px wide, one per starter prompt',async ({ page }) => {
  await page.setViewportSize({ width: 760,height: 1100 });
  const list = await open(page,{ profile: 'chatgpt',tool: 'find_games',args: { age: 8 },width: 706 });
  await expect(list.locator('.mini').first()).toBeVisible(); await page.waitForTimeout(800);
  await shoot(page,`${dir}/chatgpt/1-find-games-for-an-8-year-old.png`,{ maxHeight: 860 });
  const card = await open(page,{ profile: 'chatgpt',tool: 'show_game',args: { game: 'tuck-pop' },width: 706 });
  await expect(card.getByRole('heading',{ name: 'Tuck Pop' })).toBeVisible(); await page.waitForTimeout(800);
  await shoot(page,`${dir}/chatgpt/2-show-tuck-pop.png`,{ maxHeight: 860 });
  const player = await open(page,{ profile: 'chatgpt',tool: 'play_game',args: { game: 'tuck-pop' },width: 706 });
  await playTuckPop(page,player);
  await shoot(page,`${dir}/chatgpt/3-try-tuck-pop-together.png`,{ maxHeight: 860 });
});

test('Claude: at least 1000 px wide, cropped to the app',async ({ page }) => {
  await page.setViewportSize({ width: 1100,height: 1300 });
  const list = await open(page,{ tool: 'find_games',args: { age: 8 },width: 1000 });
  await expect(list.locator('.mini').first()).toBeVisible(); await page.waitForTimeout(800);
  await shoot(page,`${dir}/claude/1-find-games-for-an-8-year-old.png`);
  const card = await open(page,{ tool: 'show_game',args: { game: 'space-sky' },width: 1000 });
  await expect(card.getByRole('heading',{ name: 'Space Sky' })).toBeVisible(); await page.waitForTimeout(800);
  await shoot(page,`${dir}/claude/2-show-space-sky.png`);
  const player = await open(page,{ tool: 'play_game',args: { game: 'tuck-pop' },width: 1000 });
  await playTuckPop(page,player);
  await shoot(page,`${dir}/claude/3-try-tuck-pop-together.png`);
  await page.setViewportSize({ width: 1280,height: 800 });
  const space = await open(page,{ tool: 'play_game',args: { game: 'space-sky' },width: 1000 });
  await space.getByRole('button',{ name: 'Start Space Sky' }).click();
  const game = await gameFrame(page);
  await expect.poll(() => game.evaluate(() => !!document.querySelector('canvas')),{ timeout: 45_000 }).toBe(true);
  await page.waitForTimeout(9_000);
  await shoot(page,`${dir}/claude/4-space-sky-fullscreen.png`);
});
