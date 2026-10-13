import { expect, type Page } from '@playwright/test';

/** Collects console errors and any request that leaves the game's own origin (file:// and data: are fine). */
export function watch(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', error => problems.push(`page error: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') problems.push(`console error: ${message.text()}`); });
  page.on('request', request => {
    const url = new URL(request.url());
    if (!['127.0.0.1:4246', ''].includes(url.host) && url.protocol !== 'data:' && url.protocol !== 'blob:') problems.push(`request to ${request.url()}`);
  });
  return problems;
}

export type Spark = { index: number; angle: number; arcAt: number; arc: number };
export type Snap = { scene: string; trial?: string; room?: string; roomIndex?: number; moves?: number; solved?: boolean; ready?: boolean; spark?: Spark | null; battle?: { turn: number; outcome: string | null } | null; map?: string; x?: number; y?: number; busy?: boolean; moving?: boolean; dialogue?: boolean; flags?: string[]; team?: { species: string }[] };
export const snap = (page: Page) => page.evaluate(() => (window as unknown as { __agentmon: { snapshot(): Snap } }).__agentmon.snapshot());

/** How far the spark is from the middle of the glow, in degrees. */
const offGlow = (sp: Spark) => Math.abs((((sp.angle - sp.arcAt) % 360) + 540) % 360 - 180);

/** Press A (Z) until no dialogue or card is open and the world is free. In battles, A picks the
 *  hinted move (it has the focus). In the Spark Ring, wait until the spark is in the glow, then tap. */
export async function advance(page: Page, seconds = 20) {
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
export async function talk(page: Page) {
  await page.keyboard.press('KeyZ');
  await expect.poll(async () => { const s = await snap(page); return !!s.dialogue || !!s.busy; }, { timeout: 3000, intervals: [20] }).toBe(true);
}

/** Hold a direction key until `done`, then let go and wait until the player stands still. The game
 *  moves the player's tile at the start of each step, so letting go as soon as the target tile is
 *  reached never adds an extra step (a held key keeps walking, also through doors, as in the game). */
export async function hold(page: Page, key: string, done: (s: Snap) => boolean, timeout: number) {
  await page.keyboard.down(key);
  try {
    await expect.poll(async () => done(await snap(page)), { timeout, intervals: [15] }).toBe(true);
  } finally {
    await page.keyboard.up(key);
  }
  await expect.poll(async () => { const s = await snap(page); return (!s.busy && !s.moving) || !!s.dialogue; }, { timeout: 5000, intervals: [50] }).toBe(true);
}

/** Walk exactly `steps` tiles (stopping early if a door, map edge or story moment takes over). */
export async function walk(page: Page, key: string, steps: number) {
  const before = await snap(page);
  const [dx, dy] = DELTA[key]!;
  const tx = before.x! + dx * steps, ty = before.y! + dy * steps;
  await hold(page, key, s => (s.x === tx && s.y === ty) || s.map !== before.map || !!s.busy, 2000 + steps * 500);
}

/** Keep walking until we arrive on another map. */
export async function leave(page: Page, key: string, map: string) {
  await hold(page, key, s => s.map === map, 8000);
}

