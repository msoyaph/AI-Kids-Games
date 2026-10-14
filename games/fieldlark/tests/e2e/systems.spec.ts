/**
 * The systems added in plan 2, in the browser: the farmhouse (Farm Book, Ledger, helpers), the
 * forecast, the farm stand, a gamepad, 48 px targets, and reduced motion. Farms are built in Node
 * with the game's own code and saved before the page loads.
 */
import { expect, test, type Page } from '@playwright/test';
import { add } from '../../src/sim/inventory';
import { newFarm } from '../../src/sim/state';
import { xpForLevel } from '../../src/data/tuning';
import { fakeGamepad, open, readStory, snapshot, watch, withSave } from './helpers';

/** A farm in chapter `ch` (its opening lines already read), with coins, levels and a barn of wheat. */
function farmAt(ch: number, seed = 5) {
  const farm = newFarm(seed);
  farm.story.chapter = ch;
  farm.story.introSeen = true;
  farm.coins = 3000;
  farm.xp = xpForLevel(8);
  farm.flags.levelSeen = 8;
  for (const k of ['move', 'plant', 'water', 'pick', 'barn', 'orders', 'farmhouse', 'weather', 'soil', 'helpers', 'shop', 'compost', 'stars', 'rain', 'animals']) farm.flags[`tip:${k}`] = 1;
  add(farm, 'wheat', 2, 30);
  add(farm, 'strawberry', 3, 10);
  return farm;
}

async function keepFarming(page: Page) {
  await page.getByRole('button', { name: /farming/i }).click();
  await expect.poll(async () => (await snapshot(page)).screen).toBe('farm');
  await readStory(page);
}

async function openFarmhouse(page: Page) {
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: /Farmhouse/ }).click();
  await expect(page.getByRole('dialog', { name: 'The Farmhouse' })).toBeVisible();
  // a panel ignores a second tap on the very spot that opened it for a moment (the ghost-click shield)
  await page.waitForTimeout(600);
}

/** Open a farmhouse entry and wait out the ghost-click shield of the new panel. */
async function hub(page: Page, id: string) {
  await page.locator(`[data-hub="${id}"]`).click();
  await page.waitForTimeout(600);
}

test('the farmhouse: the Farm Book has a real fact for each crop, and the Ledger draws its charts', async ({ page }) => {
  const problems = watch(page);
  await withSave(page, farmAt(2));
  await open(page);
  await keepFarming(page);
  await openFarmhouse(page);
  await hub(page, 'book');
  const book = page.getByRole('dialog', { name: 'Farm Book' });
  await book.getByRole('button', { name: /^Wheat/ }).click();
  await expect(book.locator('.fact')).toContainText('Wheat is a kind of grass');
  await book.getByRole('button', { name: 'Back' }).click();
  await book.getByRole('tab', { name: /Science/ }).click();
  await book.getByRole('button', { name: /Healthy soil/ }).click();
  await expect(book.getByRole('button', { name: 'Back' })).toBeVisible();
  await expect(book).toContainText('humus');
  await page.keyboard.press('Escape');
  await hub(page, 'ledger');
  const ledger = page.getByRole('dialog', { name: 'Farm Ledger' });
  await expect(ledger.locator('svg.chart')).toBeVisible();
  await ledger.getByRole('tab', { name: /Profit per crop/ }).click();
  await expect(ledger.locator('.profit-list li').first()).toContainText('a minute');
  expect(problems).toEqual([]);
});

test('helpers: welcome Fen in chapter 3 and give her a job', async ({ page }) => {
  const problems = watch(page);
  await withSave(page, farmAt(2));
  await open(page);
  await keepFarming(page);
  await openFarmhouse(page);
  await hub(page, 'helpers');
  const panel = page.getByRole('dialog', { name: 'Helpers' });
  await panel.getByRole('button', { name: /Welcome Fen/ }).click();
  await panel.getByRole('radio', { name: /Watering/ }).click();
  await expect.poll(async () => (await snapshot(page)).helpers).toEqual([{ name: 'Fen', job: 'water' }]);
  expect(problems).toEqual([]);
});

test('the forecast: tap the date for today and the next two days', async ({ page }) => {
  const problems = watch(page);
  await withSave(page, farmAt(1));
  await open(page);
  await keepFarming(page);
  await page.getByRole('button', { name: /Weather forecast/ }).click();
  const card = page.getByRole('dialog', { name: 'Weather' });
  await expect(card.locator('.forecast-days li')).toHaveCount(3);
  await expect(card).toContainText('Today');
  await expect(card).toContainText('Tomorrow');
  expect(problems).toEqual([]);
});

test('the farm stand: stock a shelf, set a price, and shoppers buy while you play', async ({ page }) => {
  const problems = watch(page);
  await withSave(page, farmAt(1));
  await open(page, 'speed=40');
  await keepFarming(page);
  await page.getByRole('button', { name: /^Town/ }).click();
  const town = page.getByRole('dialog', { name: 'Town' });
  await town.getByRole('tab', { name: 'Stand' }).click();
  await town.getByRole('button', { name: 'Stock it' }).first().click();
  await town.locator('.fair-option', { hasText: 'Wheat' }).first().click();
  await expect(town.locator('.shelf').first()).toContainText('Wheat');
  await town.getByRole('button', { name: 'Cheaper' }).first().click();
  await expect(town.locator('.price-word').first()).toContainText('Fair');
  await page.keyboard.press('Escape');
  // time passes (fast): shoppers come by
  await expect.poll(async () => (await snapshot(page)).stats['stand-sold'] ?? 0, { timeout: 60_000 }).toBeGreaterThan(0);
  expect(problems).toEqual([]);
});

test('a gamepad: X moves into the tool bar, the d-pad moves along it, A picks, B backs out', async ({ page, isMobile }) => {
  test.skip(isMobile, 'gamepads on computers and tablets');
  const problems = watch(page);
  const press = await fakeGamepad(page);
  await withSave(page, farmAt(1));
  await open(page);
  await keepFarming(page);
  await press('x');
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('nav.toolbar'))).toBe(true);
  await press('right');
  await press('a');
  await expect.poll(async () => (await snapshot(page)).tool).toBe('plow');
  // Start opens the menu; B closes it
  await press('start');
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
  await press('b');
  await expect(page.getByRole('dialog', { name: 'Menu' })).toHaveCount(0);
  expect((await snapshot(page)).lastDevice).toBe('pad');
  expect(problems).toEqual([]);
});

test('every control is at least 48 px, on the farm and in the new panels', async ({ page }) => {
  const problems = watch(page);
  await withSave(page, farmAt(2));
  await open(page);
  await keepFarming(page);
  const small = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('button, [role="tab"], [role="radio"]')]
    .filter(b => b.offsetParent !== null)
    .map(b => ({ b, r: b.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && (r.width < 47.5 || r.height < 47.5))
    .map(({ b, r }) => `${b.getAttribute('aria-label') ?? b.textContent?.trim().slice(0, 30)} ${Math.round(r.width)}×${Math.round(r.height)}`));
  expect(await small()).toEqual([]);
  await openFarmhouse(page);
  expect(await small()).toEqual([]);
  await hub(page, 'ledger');
  await page.getByRole('tab', { name: /Profit per crop/ }).click();
  expect(await small()).toEqual([]);
  await page.keyboard.press('Escape');
  await hub(page, 'helpers');
  await page.getByRole('button', { name: /Welcome Fen/ }).click();
  expect(await small()).toEqual([]);
  expect(problems).toEqual([]);
});

test('reduced motion: the setting follows the device, and "Show me" cuts instead of gliding', async ({ page }) => {
  const problems = watch(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await withSave(page, farmAt(0));
  await open(page);
  await keepFarming(page);
  const s = await snapshot(page);
  expect(s.reducedMotion).toBe(true);
  expect(await page.evaluate(() => document.documentElement.classList.contains('reduced-motion'))).toBe(true);
  // move the view away, then tap the goal: the camera is there at once
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.getByRole('button', { name: 'Goals' }).click();
  const a = (await snapshot(page)).camera;
  await page.waitForTimeout(120);
  const b = (await snapshot(page)).camera;
  expect(Math.abs(a.x - b.x) + Math.abs(a.z - b.z)).toBeLessThan(0.01);
  expect(problems).toEqual([]);
});
