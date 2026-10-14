import { expect, type Page, type TestInfo } from '@playwright/test';

export const PORT = 4338;
export const PREFIX = 'shooberry.';

/** A URL with the CI flags: E2E_LOW draws at the Low tier (CI draws WebGL in software). */
export const at = (path: string) => {
  if (!process.env.E2E_LOW) return path;
  return `${path}${path.includes('?') ? '&' : '?'}quality=low`;
};

export interface Tile { lane: number; col: number; x: number; y: number; free: boolean; visible?: boolean }
export interface Snap {
  screen: string; mode: string | null; level: string | null; t: number; result: string | null; stars: number;
  compost: number; snacks: number; wave: number; progress: number;
  plants: { kind: string; lane: number; col: number }[];
  pickups: { id: number; lane: number; x: number; screen: { x: number; y: number } }[];
  tiles: Tile[]; cards: { id: string; x: number; y: number; w: number; h: number; ready: boolean }[];
  selected: string; taps: number; tier: string; drawCalls: number; triangles: number; programs: number;
  frameMs: { p50: number; p95: number }; cpuMs: { p50: number; p95: number };
  settings: { autoCollect: boolean; music: number; sfx: number }; saved: { stars: Record<string, number>; partyBest: number };
  persistent: boolean; noSave: boolean;
}
export const snap = (page: Page) => page.evaluate(() => (window as unknown as { __shooberry: { snapshot(): Snap } }).__shooberry.snapshot());

/** Collects console errors and any request that leaves the game's own origin (file:, data: and blob: are fine). */
export function watch(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', error => problems.push(`page error: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') problems.push(`console error: ${message.text()}`); });
  page.on('request', request => {
    const url = new URL(request.url());
    if (![`127.0.0.1:${PORT}`, ''].includes(url.host) && !['data:', 'blob:', 'file:'].includes(url.protocol)) problems.push(`request to ${request.url()}`);
  });
  return problems;
}

export const touch = (info: TestInfo) => !!info.project.use.hasTouch;
export const phone = (info: TestInfo) => info.project.name.endsWith('phone');

/** A tap on touch screens, a click elsewhere. */
export async function press(page: Page, info: TestInfo, x: number, y: number) {
  if (touch(info)) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

/** Waits until the garden is being played (no menu or tip in front of it). */
export async function playing(page: Page) {
  await expect.poll(async () => (await snap(page)).screen, { timeout: 30_000 }).toBe('play');
}

/** Presses "Got it!" on every tip until the garden is being played. */
export async function throughTips(page: Page) {
  for (let i = 0; i < 6; i++) {
    const s = await snap(page);
    if (s.screen === 'play') return;
    if (s.screen === 'tip') await page.getByRole('button', { name: 'Got it!' }).click();
    else await page.waitForTimeout(100);
  }
  await playing(page);
}
