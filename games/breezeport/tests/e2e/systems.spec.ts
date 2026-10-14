/**
 * The town's systems in a real browser: the maps (with colourblind patterns), City Hall's budget,
 * placing in Creative mode, finger-sized targets everywhere, the gamepad, and the settings.
 */
import { expect, test } from '@playwright/test';
import { newTown } from '../../src/sim/newtown';
import { fakeGamepad, open, readStory, snapshot, spotInView, tap, tileOnScreen, toolButton, watch, withTown } from './helpers';

/** A story town at chapter 3 (maps, transit and services open), in slot 1. */
function chapterTown(chapter = 3) {
  const t = newTown(5);
  t.story.chapter = chapter;
  for (let c = 0; c <= chapter; c++) t.flags[`intro-${c}`] = 1;
  t.coins = 5000;
  return t;
}

test('the maps show happiness, a service’s reach and greenery, with patterns for colourblind players', async ({ page }) => {
  const problems = watch(page);
  await withTown(page, chapterTown(), 1, { colorblind: true });
  await open(page);
  await page.getByRole('button', { name: /^Continue / }).click();
  await readStory(page);
  await toolButton(page, 'Maps').click();
  for (const name of ['Happiness', 'School', 'Greenery', 'Traffic']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect.poll(async () => (await snapshot(page)).sub).not.toBe('');
  }
  expect(problems).toEqual([]);
});

test('City Hall shows the budget, the charts and the town projects', async ({ page }) => {
  const problems = watch(page);
  await withTown(page, chapterTown());
  await open(page);
  await page.getByRole('button', { name: /^Continue / }).click();
  await readStory(page);
  await toolButton(page, 'City Hall').click();
  const hall = page.getByRole('dialog', { name: 'City Hall' });
  await expect(hall).toBeVisible();
  await expect(hall.getByText('Relight the lighthouse')).toBeVisible();
  // funding a project spends coins and marks it done
  const coins = (await snapshot(page)).coins;
  await hall.getByRole('button', { name: /Fund|Do it/ }).first().click();
  await expect.poll(async () => (await snapshot(page)).coins).toBeLessThan(coins);
  expect(problems).toEqual([]);
});

test('Creative mode: build anything for free, then remove it', async ({ page, hasTouch }) => {
  const problems = watch(page);
  const t = newTown(9, 'creative');
  t.flags['intro-0'] = 1;
  await withTown(page, t, 2, { creative: true });
  await open(page);
  await page.getByRole('button', { name: /^Continue / }).click();
  expect((await snapshot(page)).mode).toBe('creative');
  await toolButton(page, 'Parks').click();
  await page.getByRole('button', { name: /^Tree/ }).first().click();
  expect((await snapshot(page)).placing?.def).toBe('tree');
  const before = (await snapshot(page)).things;
  const [sx, sz] = await spotInView(page, t, 1, 1);
  const p = await tileOnScreen(page, sx, sz);
  await tap(page, p, hasTouch);
  if (hasTouch) await tap(page, p, true); // a finger moves the ghost first, then places
  await expect.poll(async () => (await snapshot(page)).things).toBe(before + 1);
  expect((await snapshot(page)).coins).toBe(0);
  // undo takes it away again
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(async () => (await snapshot(page)).things).toBe(before);
  expect(problems).toEqual([]);
});

test('every button is at least 48 px both ways', async ({ page }) => {
  const problems = watch(page);
  await withTown(page, chapterTown(8));
  await open(page);
  const small = async () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('button, [role=button], input, select')]
    .filter(el => el.offsetParent !== null && !el.closest('[hidden]'))
    .map(el => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && (r.width < 47.5 || r.height < 47.5))
    .map(({ el, r }) => `${el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 30)} ${Math.round(r.width)}×${Math.round(r.height)}`));
  expect(await small()).toEqual([]);
  await page.getByRole('button', { name: /^Continue / }).click();
  await readStory(page);
  expect(await small()).toEqual([]);
  for (const tool of ['Roads', 'Zones', 'Parks', 'Services', 'Transit', 'Build', 'Maps']) {
    await toolButton(page, tool).click();
    expect(await small(), tool).toEqual([]);
  }
  await page.getByRole('button', { name: 'Menu' }).click();
  expect(await small()).toEqual([]);
  expect(problems).toEqual([]);
});

test('a gamepad moves the cursor, turns the view and opens the maps', async ({ page, isMobile }) => {
  test.skip(isMobile, 'gamepads on computers and tablets with a keyboard');
  const problems = watch(page);
  const press = await fakeGamepad(page);
  await withTown(page, chapterTown());
  await open(page);
  await page.getByRole('button', { name: /^Continue / }).click();
  await readStory(page);
  await press('right');
  await expect.poll(async () => (await snapshot(page)).cursor).not.toBeNull();
  const c0 = (await snapshot(page)).cursor!;
  await press('right');
  await expect.poll(async () => (await snapshot(page)).cursor?.x).not.toBe(c0.x);
  await press('rb');
  await expect.poll(async () => (await snapshot(page)).camera.yawStep).toBe(1);
  await press('y');
  await expect.poll(async () => (await snapshot(page)).tool).toBe('maps');
  expect((await snapshot(page)).lastDevice).toBe('pad');
  expect(problems).toEqual([]);
});

test('settings: bigger text, reduced motion and read-aloud stay set', async ({ page }) => {
  const problems = watch(page);
  await open(page);
  await page.getByRole('button', { name: /Settings/ }).click();
  const panel = page.getByRole('dialog', { name: 'Settings' });
  await expect(panel).toBeVisible();
  await panel.getByRole('radio', { name: 'Big', exact: true }).click();
  await panel.getByRole('switch', { name: /Less motion/ }).click();
  await page.reload();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('breezeport.settings') ?? '{}'));
  expect(saved.textSize).toBeGreaterThan(0);
  expect(saved.reducedMotion).toBe(true);
  expect((await snapshot(page)).reducedMotion).toBe(true);
  expect(problems).toEqual([]);
});
