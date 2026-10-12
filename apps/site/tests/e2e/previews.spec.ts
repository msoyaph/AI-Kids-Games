import { expect,test,type Page } from '@playwright/test';

const playing = (page: Page) => page.evaluate(() => [...document.querySelectorAll('video')].filter(video => !video.paused && video.readyState > 2).map(video => video.dataset.game));
const videoRequests = (page: Page) => { const urls: string[] = []; page.on('request',request => { if (/\/media\/[^/]+\/loop\.(webm|mp4)/.test(request.url())) urls.push(request.url()); }); return urls; };

test('previews never play or download under reduced motion',async ({ page },info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const requests = videoRequests(page);
  for (const path of ['/','/game/theabonk']) {
    await page.goto(path); await page.waitForLoadState('networkidle');
    if (!info.project.use.hasTouch) { await page.locator('.card-link').first().hover(); await page.locator('.card-link').nth(1).focus(); }
    else await page.locator('.card').nth(1).scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    expect(await playing(page),path).toEqual([]);
    expect(await page.locator('video source').count(),path).toBe(0);
  }
  expect(requests).toEqual([]);
  // The still is shown instead: poster for the hero, cover art for cards.
  await page.goto('/'); await expect(page.locator('.hero-media picture img')).toBeVisible();
  await expect(page.locator('.card .cover img').first()).toBeVisible();
});

test('Save-Data keeps previews as stills',async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator,'connection',{ value: { saveData: true } }));
  const requests = videoRequests(page);
  await page.goto('/'); await page.waitForTimeout(1500);
  expect(await playing(page)).toEqual([]); expect(requests).toEqual([]);
});

test('no preview downloads before it is needed',async ({ page },info) => {
  test.skip(!!info.project.use.hasTouch,'Desktop: cards wait for hover or focus.');
  const requests = videoRequests(page);
  await page.goto('/'); await page.waitForTimeout(1500);
  // Only the hero's loop may load on its own; card loops wait for hover or focus.
  expect(requests.every(url => url.includes('/media/light-crossing/'))).toBe(true);
  await page.locator('.card-link').nth(2).hover();
  await expect.poll(() => playing(page),{ timeout: 10000 }).toEqual(['vanex-defense']);
  // Leaving the card hands playback back to the hero (whichever slide it is on) once it is in view.
  await page.mouse.move(2,2); await page.evaluate(() => scrollTo(0,0));
  await expect.poll(async () => { const now = await playing(page); return now.length === 1 && now[0] !== 'vanex-defense'; },{ timeout: 10000 }).toBe(true);
});

test('only one preview plays at a time on touch devices',async ({ page },info) => {
  test.skip(!info.project.use.hasTouch,'Touch devices play the preview that is mostly in view.');
  await page.goto('/');
  await expect.poll(() => playing(page),{ timeout: 10000 }).toHaveLength(1);
  const seen = new Set<string>();
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 180) {
    await page.evaluate(top => scrollTo(0,top),y); await page.waitForTimeout(450);
    const now = await playing(page); expect(now.length,`at scroll ${y}`).toBeLessThanOrEqual(1); now.forEach(slug => seen.add(slug!));
  }
  expect(seen.size).toBeGreaterThan(1);
});
