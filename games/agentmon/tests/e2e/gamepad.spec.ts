import { expect, test, type Page } from '@playwright/test';
import { snap, watch } from './helpers';

/** A pretend standard gamepad the test can press (navigator.getGamepads is replaced before the game loads). */
async function addPad(page: Page) {
  await page.addInitScript(() => {
    const button = () => ({ pressed: false, touched: false, value: 0 });
    const pad = { id: 'Test pad (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, button), vibrationActuator: null, hapticActuators: [] };
    const w = window as unknown as { __pad: typeof pad; __padPolls: number };
    w.__pad = pad;
    w.__padPolls = 0;
    // count the game's polls, so a press can be held until the game has really seen it
    Object.defineProperty(navigator, 'getGamepads', { value: () => { w.__padPolls++; return [pad, null, null, null]; }, configurable: true });
  });
}

/**
 * Press and let go of a button (0 A, 1 B, 9 Start, 12–15 d-pad up/down/left/right). The button is
 * held until the game has polled the pad at least twice, and released for two more polls, so the
 * press counts once however slow the frames are (CI draws in software at ~15 fps).
 */
async function press(page: Page, i: number) {
  const polls = () => page.evaluate(() => (window as unknown as { __padPolls: number }).__padPolls);
  const set = (on: boolean) => page.evaluate(([b, v]) => { (window as unknown as { __pad: { buttons: unknown[] } }).__pad.buttons[b as number] = { pressed: v, touched: v, value: v ? 1 : 0 }; return (window as unknown as { __padPolls: number }).__padPolls; }, [i, on] as const);
  const down = await set(true);
  await expect.poll(polls, { timeout: 8000, intervals: [10] }).toBeGreaterThanOrEqual(down + 2);
  const up = await set(false);
  await expect.poll(polls, { timeout: 8000, intervals: [10] }).toBeGreaterThanOrEqual(up + 2);
  await page.waitForTimeout(100);
}

const focused = (page: Page) => page.evaluate(() => (document.activeElement as HTMLElement | null)?.textContent?.trim() ?? '');

test('gamepad: the title and the menus', async ({ page }, info) => {
  test.skip(info.project.name.includes('phone'), 'controllers are for tablets and computers');
  const problems = watch(page);
  await addPad(page);
  await page.goto('/?fasttext');
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await press(page, 0);
  await expect(page.getByText('Your adventures')).toBeVisible();
  // in an adventure: Start opens the menu, the d-pad moves, A opens, B goes back
  await page.goto('/?quickstart&fasttext&at=brightmoor,16,12&flags=got-partner,mission-1&team=spinnet:8,druzling:8');
  await expect.poll(async () => (await snap(page)).map, { timeout: 20_000 }).toBe('brightmoor');
  await press(page, 9);
  await expect(page.locator('.pause')).toBeVisible();
  await expect.poll(() => focused(page)).toContain('Team');
  await press(page, 15);
  await expect.poll(() => focused(page)).toContain('Bag');
  await press(page, 14);
  await press(page, 0);
  await expect(page.locator('.pause h2')).toHaveText('Team');
  await press(page, 1);
  await expect(page.locator('.pause h2')).toHaveText('Menu');
  await press(page, 1);
  await expect(page.locator('.pause')).toHaveCount(0);
  expect(problems).toEqual([]);
});
