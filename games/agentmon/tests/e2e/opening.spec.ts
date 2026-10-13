import { expect, test, type Page } from '@playwright/test';
import { watch } from './helpers';

type Spark = { index: number; angle: number; arcAt: number; arc: number };
type Snap = { scene: string; spark?: Spark | null; battle?: { turn: number; outcome: string | null } | null; map?: string; x?: number; y?: number; busy?: boolean; moving?: boolean; dialogue?: boolean; flags?: string[]; team?: { species: string }[] };
const snap = (page: Page) => page.evaluate(() => (window as unknown as { __agentmon: { snapshot(): Snap } }).__agentmon.snapshot());

/** How far the spark is from the middle of the glow, in degrees. */
const offGlow = (sp: Spark) => Math.abs((((sp.angle - sp.arcAt) % 360) + 540) % 360 - 180);

/** Press A (Z) until no dialogue or card is open and the world is free. In battles, A picks the
 *  hinted move (it has the focus). In the Spark Ring, wait until the spark is in the glow, then tap. */
async function advance(page: Page, seconds = 20) {
  const until = Date.now() + seconds * 1000;
  while (Date.now() < until) {
    const s = await snap(page);
    if (s.spark) {
      if (offGlow(s.spark) < s.spark.arc * 0.25) { await page.keyboard.press('Space'); await page.waitForTimeout(300); }
      else await page.waitForTimeout(8);
      continue;
    }
    // tutorial cards and Yes/No choices: the first button has the keyboard focus, Enter presses it
    const card = page.locator('.tutorial button, .dlg-choices button').first();
    if (await card.isVisible().catch(() => false)) { await page.keyboard.press('Enter'); await page.waitForTimeout(150); continue; }
    if (!s.dialogue && !s.busy) return;
    await page.keyboard.press('KeyZ');
    await page.waitForTimeout(120);
  }
  throw new Error('dialogue did not end');
}

const DELTA: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };

/** Press A (Z) to talk, and wait until the conversation has started (the game reads keys on its next frame). */
async function talk(page: Page) {
  await page.keyboard.press('KeyZ');
  await expect.poll(async () => { const s = await snap(page); return !!s.dialogue || !!s.busy; }, { timeout: 3000, intervals: [20] }).toBe(true);
}

/** Hold a direction key until `done`, then let go and wait until the player stands still. The game
 *  moves the player's tile at the start of each step, so letting go as soon as the target tile is
 *  reached never adds an extra step (a held key keeps walking, also through doors, as in the game). */
async function hold(page: Page, key: string, done: (s: Snap) => boolean, timeout: number) {
  await page.keyboard.down(key);
  try {
    await expect.poll(async () => done(await snap(page)), { timeout, intervals: [15] }).toBe(true);
  } finally {
    await page.keyboard.up(key);
  }
  await expect.poll(async () => { const s = await snap(page); return (!s.busy && !s.moving) || !!s.dialogue; }, { timeout: 5000, intervals: [50] }).toBe(true);
}

/** Walk exactly `steps` tiles (stopping early if a door, map edge or story moment takes over). */
async function walk(page: Page, key: string, steps: number) {
  const before = await snap(page);
  const [dx, dy] = DELTA[key]!;
  const tx = before.x! + dx * steps, ty = before.y! + dy * steps;
  await hold(page, key, s => (s.x === tx && s.y === ty) || s.map !== before.map || !!s.busy, 2000 + steps * 500);
}

/** Keep walking until we arrive on another map. */
async function leave(page: Page, key: string, map: string) {
  await hold(page, key, s => s.map === map, 8000);
}

test('keyboard: wake up, meet Chief Nell, choose a partner and spar with Juno', async ({ page }, info) => {
  test.skip(info.project.name.includes('phone') || info.project.name.includes('tablet'), 'keyboard play is for computers (touch has its own test)');
  const problems = watch(page);
  await page.goto('/?quickstart&fasttext');
  await expect.poll(async () => (await snap(page)).map, { timeout: 20_000 }).toBe('home');
  await expect.poll(async () => (await snap(page)).dialogue, { timeout: 5000 }).toBe(true);
  await advance(page);
  expect((await snap(page)).flags).toContain('woke-up');
  // out of Gran's house: right, then down through the door
  await walk(page, 'ArrowRight', 1);
  await leave(page, 'ArrowDown', 'brightmoor');
  expect(await snap(page)).toMatchObject({ x: 4, y: 7 });
  // along the path to the Academy door
  await walk(page, 'ArrowRight', 15);
  await leave(page, 'ArrowUp', 'academy');
  await walk(page, 'ArrowUp', 1);
  await advance(page);
  expect((await snap(page)).flags).toContain('met-nell');
  // back outside and east to the garden
  await leave(page, 'ArrowDown', 'brightmoor');
  expect(await snap(page)).toMatchObject({ x: 19, y: 7 });
  await walk(page, 'ArrowRight', 6);
  await walk(page, 'ArrowDown', 4);
  await leave(page, 'ArrowRight', 'academy-garden');
  await walk(page, 'ArrowRight', 1);
  await advance(page);
  // to Spinnet at (6, 3): from (1, 7) go right to x 6, then up to y 4 (now facing it) and press A
  await walk(page, 'ArrowRight', 5);
  await walk(page, 'ArrowUp', 3);
  expect(await snap(page)).toMatchObject({ map: 'academy-garden', x: 6, y: 4 });
  await talk(page);
  await advance(page, 120);
  const s = await snap(page);
  expect(s.flags).toEqual(expect.arrayContaining(['got-partner', 'juno-1', 'mission-1']));
  expect(s.team?.[0]?.species).toBe('spinnet');
  expect(problems).toEqual([]);
});
