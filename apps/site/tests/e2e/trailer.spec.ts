import { expect,test } from '@playwright/test';
import { guard } from './games';

// The trailer is self-hosted and loads only when someone presses play: it starts with the sound
// off and captions on, has keyboard-usable controls, and Escape closes it (focus goes back).
test('Home: Watch the trailer opens a muted, captioned player; Escape closes it',async ({ page }) => {
  const { errors,external } = guard(page);
  const loads: string[] = [];
  page.on('request',request => { if (request.url().includes('/trailer/')) loads.push(request.url()); });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(loads).toEqual([]);
  const open = page.getByRole('button',{ name: 'Watch the trailer' });
  await open.click();
  const dialog = page.getByRole('dialog',{ name: 'Ai Kids Games trailer' });
  await expect(dialog).toBeVisible();
  const video = dialog.locator('video');
  await expect(video).toHaveJSProperty('muted',true);
  await expect(video).toHaveAttribute('controls','');
  await expect(video.locator('track')).toHaveAttribute('kind','captions');
  await expect.poll(() => video.evaluate(node => (node as HTMLVideoElement).textTracks[0]?.mode)).toBe('showing');
  await expect.poll(() => video.evaluate(node => (node as HTMLVideoElement).currentTime),{ timeout: 20_000 }).toBeGreaterThan(0.3);
  expect(loads.every(url => /\/trailer\/trailer-(720|1080)\.(webm|mp4)|trailer\.en\.vtt|trailer-poster/.test(url))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();
  expect(errors).toEqual([]); expect(external).toEqual([]);
});

test('About: the trailer plays from its poster, with a text description',async ({ page }) => {
  const { errors,external } = guard(page);
  await page.goto('/about');
  const poster = page.getByRole('button',{ name: /^Play the trailer \(\d+ seconds, sound off\)$/ });
  await expect(poster).toBeVisible();
  await page.getByText('What’s in the trailer').click();
  await expect(page.locator('.trailer-description p').first()).toBeVisible();
  await poster.click();
  const video = page.locator('.trailer-inline video');
  await expect(video).toHaveJSProperty('muted',true);
  await expect.poll(() => video.evaluate(node => (node as HTMLVideoElement).currentTime),{ timeout: 20_000 }).toBeGreaterThan(0.3);
  expect(errors).toEqual([]); expect(external).toEqual([]);
});
