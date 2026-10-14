import { expect,test,type Page } from './fixtures';

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
  // The still is shown instead: the hero's poster, cover art for cards.
  await page.goto('/'); await expect(page.locator('.hero-media img').first()).toBeVisible();
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
  // Only the hero's own loop may load on its own (the first featured game); card loops wait for hover or focus.
  const heroVideo = page.locator('.hero video');
  const hero = await heroVideo.count() ? await heroVideo.first().getAttribute('data-game') : null;
  expect(requests.every(url => !!hero && url.includes(`/media/${hero}/`))).toBe(true);
  // A card with a captured loop (every game has one; games on temporary art keep a screenshot cover).
  const card = page.locator('.card-link').filter({ has: page.locator('video[data-game="theabonk"]') }).first();
  await card.hover();
  await expect.poll(() => playing(page),{ timeout: 10000 }).toEqual(['theabonk']);
  // Leaving the card stops it; the hero takes over again if its current slide has a loop.
  await page.mouse.move(2,2); await page.evaluate(() => scrollTo(0,0));
  await expect.poll(async () => { const now = await playing(page); return now.length <= 1 && !now.includes('theabonk'); },{ timeout: 10000 }).toBe(true);
});

test('only one preview plays at a time on touch devices',async ({ page },info) => {
  test.skip(!info.project.use.hasTouch,'Touch devices play the preview that is mostly in view.');
  await page.goto('/');
  // at most one plays at the top
  await expect.poll(async () => (await playing(page)).length <= 1,{ timeout: 10000 }).toBe(true);
  // Sweep the page: never more than one preview at a time.
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 180) {
    await page.evaluate(top => scrollTo(0,top),y); await page.waitForTimeout(300);
    expect((await playing(page)).length,`at scroll ${y}`).toBeLessThanOrEqual(1);
  }
  // Scroll each card with a captured loop to the middle: exactly one preview plays, from that card's
  // row (cards side by side on a tablet tie on height; the one nearest the centre plays).
  const videos = page.locator('.card video[data-game]');
  const slugs = await videos.evaluateAll(list => list.map(video => (video as HTMLVideoElement).dataset.game!));
  expect(slugs.length).toBeGreaterThan(1);
  const rowOf = (slug: string) => page.locator(`.card video[data-game="${slug}"]`).evaluate(video => Math.round(video.closest('.preview')!.getBoundingClientRect().top));
  const played = new Set<string>();
  for (const slug of slugs) {
    await page.locator(`.card video[data-game="${slug}"]`).evaluate(video => video.closest('.preview')!.scrollIntoView({ block: 'center' }));
    await expect.poll(async () => {
      const now = await playing(page);
      if (now.length !== 1) return `${now.length} playing`;
      return Math.abs(await rowOf(now[0]!)-await rowOf(slug)) <= 2 ? 'its row' : `${now[0]} (another row)`;
    },{ timeout: 15000,message: `${slug} centred` }).toBe('its row');
    played.add((await playing(page))[0]!);
  }
  expect(played.size).toBeGreaterThan(1);
});
