import { expect, type Page } from '@playwright/test';
import { encodeFarm } from '../../src/save/save';
import type { Farm } from '../../src/sim/state';

export const HOOK = '__fieldlark';
export const PREFIX = 'fieldlark.';
export const LOW = !!process.env.E2E_LOW;

export interface Snapshot {
  screen: string; capture: boolean; panel: boolean; t: number; season: string; coins: number; unlocked: string[];
  camera: { x: number; z: number; yawStep: number; zoom: number; yaw: number }; cursor: { x: number; z: number } | null;
  lastDevice: string; quality: string; fps: number; persistent: boolean; audio: string; drawCalls: number; triangles: number;
  xp: number; level: number; tool: string; seed: string | null; inv: Record<string, [number, number, number]>; freeSeeds: number;
  fields: { x: number; z: number; crop: string | null; ready: boolean; watered: boolean }[];
  chapter: number; stats: Record<string, number>; ideas: number; reducedMotion: boolean;
  helpers: { name: string; job: string }[];
  stand: { item: string | null; n: number; price: number }[];
}

/** A farm saved before the page loads (built in Node with the game's own code). */
export async function withSave(page: Page, farm: Farm) {
  const text = JSON.stringify(encodeFarm(farm, Date.now()));
  await page.addInitScript(([key, value]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1'); } }, [`${PREFIX}save`, text] as const);
}

/** A pretend gamepad (standard mapping): `press(name)` taps a button for exactly one frame of the game's polling (adapted from Tuck Pop). */
export async function fakeGamepad(page: Page) {
  await page.addInitScript(() => {
    const pad = { taps: new Array(17).fill(0) as number[], axes: [0, 0, 0, 0], polls: 0 };
    (window as unknown as { __pad: typeof pad }).__pad = pad;
    navigator.getGamepads = () => {
      pad.polls++;
      const buttons = pad.taps.map(n => ({ pressed: n > 0, value: n > 0 ? 1 : 0, touched: n > 0 }));
      pad.taps = pad.taps.map(n => Math.max(0, n - 1));
      return [{ id: 'Test pad', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(), axes: pad.axes, buttons, hapticActuator: null, vibrationActuator: null } as unknown as Gamepad];
    };
  });
  const index: Record<string, number> = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, back: 8, start: 9, up: 12, down: 13, left: 14, right: 15 };
  type Pad = { __pad: { taps: number[]; polls: number } };
  const polls = () => page.evaluate(() => (window as unknown as Pad).__pad.polls);
  return async (name: keyof typeof index) => {
    // the game reads the pad once a frame: tap for one read, then wait for a released read
    const from = await page.evaluate(i => { const pad = (window as unknown as Pad).__pad; pad.taps[i] = 1; return pad.polls; }, index[name]!);
    await expect.poll(polls, { timeout: 30_000 }).toBeGreaterThanOrEqual(from + 3);
  };
}

export const snapshot = (page: Page) => page.evaluate(hook => (window as unknown as Record<string, { snapshot(): Snapshot }>)[hook]!.snapshot(), HOOK);
export const tileOnScreen = (page: Page, x: number, z: number) => page.evaluate(([hook, x, z]) => (window as unknown as Record<string, { tileOnScreen(x: number, z: number): { x: number; y: number } }>)[hook as string]!.tileOnScreen(x as number, z as number), [HOOK, x, z] as const);
export const pickAt = (page: Page, x: number, y: number) => page.evaluate(([hook, x, y]) => (window as unknown as Record<string, { pickAt(x: number, y: number): { x: number; z: number } | null }>)[hook as string]!.pickAt(x as number, y as number), [HOOK, x, y] as const);

/** Opens the game (at Low quality on software WebGL), with any extra query. */
export async function open(page: Page, query = '') {
  const q = new URLSearchParams(query);
  if (LOW && !q.has('quality')) q.set('quality', 'low');
  const s = q.toString();
  await page.goto(`/${s ? `?${s}` : ''}`);
}

/** Fails the test on console errors and on any request that leaves the game's own origin. */
export function watch(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', error => problems.push(`page error: ${error.message}`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    // software WebGL's own performance notes are not game errors
    if (/GPU stall due to ReadPixels|WebGL: CONTEXT_LOST|GroupMarkerNotSet/i.test(text)) return;
    problems.push(`console error: ${text}`);
  });
  page.on('request', request => {
    const url = new URL(request.url());
    if (!['127.0.0.1:4769', ''].includes(url.host) && url.protocol !== 'data:' && url.protocol !== 'blob:') problems.push(`request to ${request.url()}`);
  });
  return problems;
}

/** From the title screen into the farm, reading through the chapter's opening lines. */
export async function startFarming(page: Page) {
  await page.getByRole('button', { name: /farming/i }).click();
  await expect.poll(async () => (await snapshot(page)).screen).toBe('farm');
  await readStory(page);
}

/** Press through any story dialogue on screen (Next… OK!), and close a tip card if one is up. */
export async function readStory(page: Page) {
  for (let i = 0; i < 16; i++) {
    const next = page.locator('.story-card button.primary');
    if (!(await next.count())) break;
    await next.first().click();
    await page.waitForTimeout(60);
  }
  // the first tip arrives just after the opening lines: wait for it and put it away
  const tip = page.locator('.tip-card button');
  await tip.first().waitFor({ timeout: 1500 }).catch(() => {});
  if (await tip.count()) await tip.first().click();
}
