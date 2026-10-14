import { expect, type Page } from '@playwright/test';

export const HOOK = '__fieldlark';
export const PREFIX = 'fieldlark.';
export const LOW = !!process.env.E2E_LOW;

export interface Snapshot {
  screen: string; capture: boolean; panel: boolean; t: number; season: string; coins: number; unlocked: string[];
  camera: { x: number; z: number; yawStep: number; zoom: number; yaw: number }; cursor: { x: number; z: number } | null;
  lastDevice: string; quality: string; fps: number; persistent: boolean; audio: string; drawCalls: number; triangles: number;
  xp: number; level: number; tool: string; seed: string | null; inv: Record<string, [number, number, number]>; freeSeeds: number;
  fields: { x: number; z: number; crop: string | null; ready: boolean; watered: boolean }[];
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

/** From the title screen into the farm. */
export async function startFarming(page: Page) {
  await page.getByRole('button', { name: /farming/i }).click();
  await expect.poll(async () => (await snapshot(page)).screen).toBe('farm');
}
