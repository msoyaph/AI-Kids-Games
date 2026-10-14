import { expect, test } from '@playwright/test';
import { PREFIX, at, phone, playing, press, snap, throughTips, touch, watch } from './helpers';

// Frame-rate independent: everything waits on the read-only hook (expect.poll), never on fixed
// timings, so the suite holds on CI's software WebGL at a few frames a second.

test('a first game: title, map, seeds, the welcome tip, then a card and a tile plant', async ({ page }, info) => {
  const problems = watch(page);
  await page.goto(at('/'));
  await expect(page.getByRole('heading', { name: 'Shooberry' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Level 1, 0 of 3 stars' }).click();
  await expect(page.getByRole('heading', { name: 'Meadow Picnic 1' })).toBeVisible();
  await page.getByRole('button', { name: "Let's grow!" }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to the picnic!' })).toBeVisible();
  await throughTips(page);
  const s = await snap(page);
  expect(s.mode).toBe('adventure');
  expect(s.level).toBe('meadow-1');
  // choose the Comfrey card, then a free tile in the open lane
  const card = s.cards.find(c => c.id === 'comfrey')!;
  await press(page, info, card.x + card.w / 2, card.y + card.h / 2);
  await expect.poll(async () => (await snap(page)).selected).toBe('comfrey');
  const tile = s.tiles.find(t => t.free && t.col === 1)!;
  await press(page, info, tile.x, tile.y);
  await expect.poll(async () => (await snap(page)).plants).toEqual([{ kind: 'comfrey', lane: tile.lane, col: 1, health: expect.any(Number) }]);
  // the welcome tip is remembered, and only the game's own key is stored
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([`${PREFIX}save`]);
  expect(problems).toEqual([]);
});

test('a card can be dragged onto the garden', async ({ page }, info) => {
  test.skip(touch(info), 'the mouse drag; touch drags use the same pointer events');
  const problems = watch(page);
  await page.goto(at('/?level=meadow-1&seeds=comfrey,rowan'));
  await playing(page);
  const s = await snap(page);
  const card = s.cards.find(c => c.id === 'comfrey')!, tile = s.tiles.find(t => t.free && t.col === 3)!;
  await page.mouse.move(card.x + card.w / 2, card.y + card.h / 2);
  await page.mouse.down();
  await page.mouse.move(tile.x, tile.y, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await snap(page)).plants.map(p => `${p.kind}@${p.lane},${p.col}`)).toEqual([`comfrey@${tile.lane},3`]);
  expect(problems).toEqual([]);
});

test('keyboard: number keys choose, arrows move the cursor, Enter plants, Escape pauses', async ({ page }, info) => {
  test.skip(phone(info), 'keyboards are for tablets and computers');
  const problems = watch(page);
  await page.goto(at('/?level=meadow-1&seeds=comfrey,rowan'));
  await playing(page);
  await page.keyboard.press('Digit1');
  await expect.poll(async () => (await snap(page)).selected).toBe('comfrey');
  // the cursor starts on lane 3, tile 3 (lane 2, col 2 counting from 0): two to the right
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await snap(page)).plants.map(p => `${p.kind}@${p.lane},${p.col}`)).toEqual(['comfrey@2,4']);
  // a plant can't go on a taken tile: Rowan on the same tile is refused, one to the left is fine
  await page.keyboard.press('Digit2');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await snap(page)).plants.map(p => `${p.kind}@${p.lane},${p.col}`).sort()).toEqual(['comfrey@2,4', 'rowan@2,3']);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible();
  await page.keyboard.press('Escape');
  await playing(page);
  expect(problems).toEqual([]);
});

/**
 * A pretend standard gamepad (navigator.getGamepads is replaced before the game loads). Each
 * queued press is shown for exactly one of the game's polls and released on the next, so a press
 * counts once however slow the frames are (holding a direction repeats, as it should for players).
 */
async function addPad(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __padQueue: (number | null)[] };
    w.__padQueue = [];
    const pad = { id: 'Test pad (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: [] as { pressed: boolean; touched: boolean; value: number }[], vibrationActuator: null, hapticActuators: [] };
    Object.defineProperty(navigator, 'getGamepads', {
      value: () => {
        const on = w.__padQueue.length ? w.__padQueue.shift() : null;
        pad.buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: i === on, touched: i === on, value: i === on ? 1 : 0 }));
        return [pad, null, null, null];
      },
      configurable: true,
    });
  });
}

/** Press and let go of a button (0 A, 1 B, 9 Start, 12–15 d-pad up/down/left/right). */
async function padPress(page: import('@playwright/test').Page, i: number) {
  await page.evaluate(b => (window as unknown as { __padQueue: (number | null)[] }).__padQueue.push(b, null), i);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __padQueue: unknown[] }).__padQueue.length), { timeout: 8000, intervals: [10] }).toBe(0);
}

test('gamepad: the menus, then the d-pad, A to plant, Start to pause and B to go back', async ({ page }, info) => {
  test.skip(phone(info), 'controllers are for tablets and computers');
  const problems = watch(page);
  await addPad(page);
  await page.goto(at('/'));
  await expect(page.getByRole('heading', { name: 'Shooberry' })).toBeVisible({ timeout: 30_000 });
  // the title focuses Play; the d-pad moves down to Books and back up, A presses Play
  const focused = () => page.evaluate(() => document.activeElement?.textContent);
  await padPress(page, 13);
  await expect.poll(focused).toBe('Books');
  await padPress(page, 12);
  await expect.poll(focused).toBe('Play');
  await padPress(page, 0);
  await expect(page.getByRole('heading', { name: 'Adventure' })).toBeVisible();
  await padPress(page, 1);
  await expect(page.getByRole('heading', { name: 'Shooberry' })).toBeVisible();
  // in the garden: right twice, then A
  await page.goto(at('/?level=meadow-1&seeds=comfrey,rowan'));
  await playing(page);
  await padPress(page, 15);
  await padPress(page, 15);
  await padPress(page, 0);
  await expect.poll(async () => (await snap(page)).plants.map(p => `${p.kind}@${p.lane},${p.col}`)).toEqual(['comfrey@2,4']);
  await padPress(page, 9);
  await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible();
  await padPress(page, 1);
  await playing(page);
  expect(problems).toEqual([]);
});

test('compost: with auto-collect off, a tap on a pile collects it', async ({ page }, info) => {
  const problems = watch(page);
  await page.goto(at('/'));
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Collect compost by itself').uncheck();
  await expect.poll(async () => (await snap(page)).settings.autoCollect).toBe(false);
  await page.goto(at('/?level=meadow-1&seeds=comfrey,rowan&testmode=1&speed=3'));
  await playing(page);
  // worms leave compost piles every few seconds; collect one
  let collected = false;
  for (let i = 0; i < 40 && !collected; i++) {
    const s = await snap(page);
    const pile = s.pickups[0];
    if (!pile) { await page.waitForTimeout(200); continue; }
    await press(page, info, pile.screen.x, pile.screen.y);
    collected = await expect.poll(async () => (await snap(page)).compost, { timeout: 3000 }).toBeGreaterThan(s.compost).then(() => true, () => false);
  }
  expect(collected).toBe(true);
  expect(problems).toEqual([]);
});

test('a whole level played to the end; the stars are saved and survive a reload', async ({ page }) => {
  const problems = watch(page);
  // the test autopilot (the good bot) plays through the real game loop at 16×
  await page.goto(at('/?level=meadow-1&testmode=1&speed=16&bot=good'));
  await page.getByRole('button', { name: "Let's grow!" }).click();
  await playing(page);
  await expect.poll(async () => (await snap(page)).result, { timeout: 180_000, intervals: [500] }).toBe('won');
  await expect(page.locator('#result')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Next level' })).toBeVisible();
  const s = await snap(page);
  expect(s.saved.stars['meadow-1']).toBe(s.stars);
  expect(s.stars).toBeGreaterThanOrEqual(1);
  await page.goto(at('/'));
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: `Level 1, ${s.stars} of 3 stars` })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Level 2, 0 of 3 stars' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Level 3, locked' })).toBeDisabled();
  expect(problems).toEqual([]);
});

test('the modes and the books open', async ({ page }) => {
  const problems = watch(page);
  await page.goto(at('/?unlockall'));
  await expect(page.getByRole('heading', { name: 'Shooberry' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Books' }).click();
  await expect(page.getByRole('tab', { name: 'Seed Book' })).toBeVisible();
  await expect(page.locator('#books .grid button')).toHaveCount(24);
  await page.getByRole('button', { name: 'Bluebell Chime' }).click();
  await expect(page.locator('#books .page h3')).toHaveText('Bluebell Chime');
  await page.getByRole('tab', { name: 'Invader Book' }).click();
  await expect(page.locator('#books .grid button')).toHaveCount(26);
  await page.getByRole('button', { name: 'Seagull' }).click();
  await expect(page.locator('#books .page h3')).toHaveText('Seagull');
  await page.locator('#books').getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Challenges' }).click();
  await expect(page.locator('#challenges .list button')).toHaveCount(20);
  await page.locator('#challenges').getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Daily Garden' }).click();
  await expect(page.getByRole('button', { name: "Let's grow!" })).toBeVisible();
  await page.locator('#seeds').getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Garden Party' }).click();
  await page.getByRole('button', { name: "Let's grow!" }).click();
  await throughTips(page);
  expect((await snap(page)).mode).toBe('party');
  expect(problems).toEqual([]);
});

test('a phone held upright asks to be turned sideways, and the garden waits', async ({ page }, info) => {
  test.skip(!phone(info), 'phones only');
  const problems = watch(page);
  await page.goto(at('/?level=meadow-1&seeds=comfrey'));
  await playing(page);
  const size = page.viewportSize()!;
  await page.setViewportSize({ width: size.height, height: size.width });
  await expect(page.getByText('Turn your phone sideways to play')).toBeVisible();
  await expect.poll(async () => (await snap(page)).screen).toBe('paused');
  await page.setViewportSize(size);
  await expect(page.getByText('Turn your phone sideways to play')).toBeHidden();
  await page.getByRole('button', { name: 'Keep playing' }).click();
  await playing(page);
  expect(problems).toEqual([]);
});
