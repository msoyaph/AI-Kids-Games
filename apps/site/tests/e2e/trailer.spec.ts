import { expect,test } from '@playwright/test';
import { guard } from './games';

// The trailer is self-hosted and lives on About only: it loads only when someone presses play,
// starts with the sound off and captions on, and has keyboard-usable controls.
test('Home has no trailer and loads nothing from it',async ({ page }) => {
  const { errors,external } = guard(page);
  const loads: string[] = [];
  page.on('request',request => { if (request.url().includes('/trailer/')) loads.push(request.url()); });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('button',{ name: 'Watch the trailer' })).toHaveCount(0);
  expect(loads).toEqual([]);
  expect(errors).toEqual([]); expect(external).toEqual([]);
});

test('About: the trailer plays from its poster, muted and captioned, with a text description',async ({ page }) => {
  const { errors,external } = guard(page);
  const loads: string[] = [];
  page.on('request',request => { if (request.url().includes('/trailer/')) loads.push(request.url()); });
  await page.goto('/about');
  const poster = page.getByRole('button',{ name: /^Play the trailer \(\d+ seconds, sound off\)$/ });
  await expect(poster).toBeVisible();
  await page.getByText('What’s in the trailer').click();
  await expect(page.locator('.trailer-description p').first()).toBeVisible();
  expect(loads.every(url => /trailer-poster/.test(url))).toBe(true);
  await poster.click();
  const video = page.locator('.trailer-inline video');
  await expect(video).toHaveJSProperty('muted',true);
  await expect(video).toHaveAttribute('controls','');
  await expect(video.locator('track')).toHaveAttribute('kind','captions');
  await expect.poll(() => video.evaluate(node => (node as HTMLVideoElement).textTracks[0]?.mode)).toBe('showing');
  await expect.poll(() => video.evaluate(node => (node as HTMLVideoElement).currentTime),{ timeout: 20_000 }).toBeGreaterThan(0.3);
  expect(loads.every(url => /\/trailer\/trailer-(720|1080)\.(webm|mp4)|trailer\.en\.vtt|trailer-poster/.test(url))).toBe(true);
  expect(errors).toEqual([]); expect(external).toEqual([]);
});

// Each game's own 15-second trailer (marketing/sizzle npm run trailers) on its page: only the
// poster loads until someone presses play; the link at the top jumps to it.
test('a game page: its own trailer plays from the poster, muted and captioned',async ({ page }) => {
  const { errors,external } = guard(page);
  const loads: string[] = [];
  page.on('request',request => { if (request.url().includes('/trailer/')) loads.push(request.url()); });
  await page.goto('/game/tuck-pop');
  await page.getByRole('link',{ name: 'Watch the 15-second trailer' }).click();
  await expect(page).toHaveURL(/#trailer$/);
  const poster = page.getByRole('button',{ name: 'Play the Tuck Pop trailer (15 seconds, sound off)' });
  await expect(poster).toBeInViewport();
  expect(loads.every(url => /\/trailer\/tuck-pop\/poster\.(webp|jpg)$/.test(url))).toBe(true);
  await poster.click();
  const video = page.locator('#trailer video');
  await expect(video).toHaveJSProperty('muted',true);
  await expect(video.locator('track')).toHaveAttribute('src','/trailer/tuck-pop/trailer.en.vtt');
  await expect.poll(() => video.evaluate(node => (node as HTMLVideoElement).currentTime),{ timeout: 20_000 }).toBeGreaterThan(0.3);
  expect(loads.every(url => /\/trailer\/tuck-pop\/(trailer-720\.(webm|mp4)|trailer\.en\.vtt|poster\.(webp|jpg))$/.test(url))).toBe(true);
  expect(errors).toEqual([]); expect(external).toEqual([]);
});
