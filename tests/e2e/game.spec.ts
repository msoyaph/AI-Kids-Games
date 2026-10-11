import { expect, test } from '@playwright/test';
import { boot, closePopups, go, navTo, newGame, scene, skipDialogue, watchErrors } from './helpers';

test.describe.configure({ mode: 'serial' });

test('new game: creator, hub, first mission and menus', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  await newGame(page);
  await expect(page.getByTestId('hub-banner')).toContainText('Visit the Hangar');
  // Go! takes you to the hangar for the first objective.
  await navTo(page, 'btn-go', 'hangar');
  await expect(page.getByTestId('part-cards')).toBeVisible();
  await page.getByTestId('tab-engine').click();
  await navTo(page, 'btn-back', 'hub');
  await expect(page.getByTestId('hub-banner')).toContainText('Lounge');
  await navTo(page, 'nav-lounge', 'lounge');
  await page.getByTestId('crew-pip').click();
  await page.waitForTimeout(300);
  await skipDialogue(page);
  await expect(page.getByTestId('mission-done')).toBeVisible();
  await closePopups(page);
  await skipDialogue(page);
  await navTo(page, 'btn-back', 'hub');
  // Mission board, codex, badges, shop.
  for (const nav of ['board', 'codex', 'badges', 'shop']) {
    await navTo(page, `nav-${nav}`, nav);
    await navTo(page, 'btn-back', 'hub');
  }
  // Settings: change difficulty and close.
  await page.getByTestId('btn-settings').click();
  await page.getByTestId('set-diff-normal').click();
  await page.getByTestId('btn-settings-done').click();
  const diff = await page.evaluate(() => (window as unknown as { __spacesky: { state: { data: { difficulty: string } } } }).__spacesky.state.data.difficulty);
  expect(diff).toBe('normal');
  expect(errors).toEqual([]);
});

test('progress is saved and survives a reload', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  await newGame(page);
  await navTo(page, 'btn-go', 'hangar');
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.getByTestId('btn-play')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('btn-play').click();
  await expect(page.getByTestId('slot-0')).toContainText('Testy');
  await page.getByTestId('slot-play-0').click();
  await skipDialogue(page);
  await expect(page.getByTestId('hub-banner')).toContainText('Lounge');
  expect(errors).toEqual([]);
});

test('flight: steering, boost, pause, and landing on the Moon', async ({ page }, info) => {
  const errors = watchErrors(page);
  await boot(page);
  await newGame(page);
  await go(page, 'flight', { from: 'earth', to: 'earth' });
  await skipDialogue(page);
  await closePopups(page);
  const shipX = () => page.evaluate(() => (window as unknown as { __spacesky: { game: { current: { getShip: () => { x: number } } } } }).__spacesky.game.current.getShip().x);
  const x0 = await shipX();
  const touch = info.project.name !== 'desktop';
  if (touch) {
    // Drag the floating joystick to the right.
    const zone = page.getByTestId('joy-zone');
    const box = (await zone.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.3 + 80, box.y + box.height * 0.5, { steps: 5 });
    await page.waitForTimeout(1200);
    await expect(page.getByTestId('btn-boost')).toBeVisible();
    await page.getByTestId('btn-boost').dispatchEvent('pointerdown', { pointerId: 9 });
    await page.waitForTimeout(200);
    await page.getByTestId('btn-boost').dispatchEvent('pointerup', { pointerId: 9 });
    await page.mouse.up();
  } else {
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1200);
    await page.keyboard.press('Space');
    await page.keyboard.up('ArrowRight');
  }
  expect(await shipX()).toBeGreaterThan(x0 + 100);
  // Pause menu.
  await page.getByTestId('btn-pause').click();
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  await page.getByTestId('btn-resume').click();
  // Fly next to the Moon and land.
  await page.evaluate(() => {
    const sc = (window as unknown as { __spacesky: { game: { current: { getLayout: () => { world: { bodies: Array<{ id: string; x: number; y: number; r: number }> } }; getShip: () => { x: number; y: number; vx: number; vy: number } } } } }).__spacesky.game.current;
    const moon = sc.getLayout().world.bodies.find((b) => b.id === 'moon')!;
    const ship = sc.getShip();
    ship.x = moon.x + moon.r + 70;
    ship.y = moon.y;
    ship.vx = ship.vy = 0;
  });
  await expect(page.getByTestId('flight-prompt')).toBeVisible();
  if (touch) {
    await page.getByTestId('btn-action').dispatchEvent('pointerdown', { pointerId: 7 });
    await page.waitForTimeout(150);
    await page.getByTestId('btn-action').dispatchEvent('pointerup', { pointerId: 7 });
  } else await page.keyboard.press('KeyE');
  await expect.poll(() => scene(page), { timeout: 10_000 }).toBe('landing');
  await expect.poll(() => scene(page), { timeout: 30_000 }).toBe('explore');
  expect(errors).toEqual([]);
});

test('every exploration area loads and the astronaut can walk', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  await boot(page);
  await newGame(page);
  const areas: string[] = await page.evaluate(() => Object.keys((window as unknown as { __spacesky: unknown }) && (window as never)) && []);
  void areas;
  const ids = ['moon_base', 'mercury_craters', 'venus_surface', 'mars_landing', 'mars_canyon', 'mars_icecap', 'mars_olympus', 'ceres_station', 'europa_ice', 'callisto_crash', 'ganymede_caves', 'titan_lakes', 'miranda_cliffs', 'triton_geysers', 'pluto_heart', 'zephyra_village', 'zephyra_crystal', 'zephyra_bubble', 'zephyra_sky', 'zephyra_beacon'];
  for (const id of ids) {
    await go(page, 'explore', { area: id });
    await skipDialogue(page);
    await closePopups(page);
    expect(await scene(page)).toBe('explore');
    const px = () => page.evaluate(() => (window as unknown as { __spacesky: { game: { current: { player: { x: number } } } } }).__spacesky.game.current.player.x);
    const before = await px();
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(500);
    await page.keyboard.up('ArrowRight');
    expect(await px(), id).not.toBe(before);
  }
  expect(errors).toEqual([]);
});

test('star map, cutscenes, credits and the completion screen', async ({ page }) => {
  const errors = watchErrors(page);
  await boot(page);
  await newGame(page);
  await go(page, 'map');
  await expect(page.getByTestId('map-card')).toBeVisible();
  for (const id of ['zibbo', 'starpath', 'wormhole', 'finale']) {
    await go(page, 'cutscene', { id });
    await expect.poll(() => scene(page)).toBe('cutscene');
    await page.getByTestId('btn-skip').click({ force: true });
    await expect.poll(() => scene(page), { timeout: 15_000 }).not.toBe('cutscene');
    await page.waitForTimeout(300);
    await skipDialogue(page);
    await closePopups(page);
  }
  await go(page, 'credits');
  await expect(page.getByTestId('credits')).toBeVisible();
  await page.getByTestId('btn-skip-credits').click();
  await expect(page.getByTestId('complete-stats')).toBeVisible();
  await page.getByTestId('btn-keep-exploring').click();
  await expect.poll(() => scene(page)).toBe('hub');
  expect(errors).toEqual([]);
});
