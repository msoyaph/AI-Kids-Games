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
