import { expect, type Frame, type Page, type TestInfo } from '@playwright/test';

export interface Guard {
  errors: string[];
  external: string[];
}

/** Record console errors, page errors and any request that leaves the game's own origin. */
export function guard(page: Page, origin: string): Guard {
  const g: Guard = { errors: [], external: [] };
  page.on('console', (m) => {
    if (m.type() === 'error') g.errors.push(m.text());
  });
  page.on('pageerror', (e) => g.errors.push(String(e)));
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:') && !u.startsWith('about:') && !u.startsWith('file:')) g.external.push(u);
  });
  return g;
}

export function expectClean(g: Guard): void {
  expect(g.errors, `console errors: ${g.errors.join('\n')}`).toEqual([]);
  expect(g.external, `external requests: ${g.external.join('\n')}`).toEqual([]);
}

export function isTouch(info: TestInfo): boolean {
  return !!info.project.use.hasTouch;
}

export async function tap(page: Page, info: TestInfo, x: number, y: number): Promise<void> {
  if (isTouch(info)) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

type Ctx = Page | Frame;

export async function testState(ctx: Ctx): Promise<{ coins: number; lives: number; wave: number; towers: number; enemies: number; kills: number; state: string; crystals: number; unlocked: string[]; modal: boolean }> {
  return ctx.evaluate(() => (window as unknown as { __vanexTest: { state(): never } }).__vanexTest.state());
}

export async function cellCenter(ctx: Ctx, cx: number, cy: number): Promise<{ x: number; y: number }> {
  return ctx.evaluate(([x, y]) => (window as unknown as { __vanexTest: { cellCenter(a: number, b: number): { x: number; y: number } } }).__vanexTest.cellCenter(x, y), [cx, cy] as const);
}

export async function waitForGame(ctx: Ctx): Promise<void> {
  await ctx.waitForFunction(() => !!(window as unknown as { __vanexTest?: unknown }).__vanexTest, null, { timeout: 30_000 });
}

/** Choose a tower in the build drawer (opening it first on small landscape screens). */
export async function pickTower(ctx: Page | import('@playwright/test').FrameLocator, name: RegExp): Promise<void> {
  const fab = ctx.getByRole('button', { name: 'Build', exact: true });
  if (await fab.isVisible().catch(() => false)) await fab.click();
  await ctx.getByRole('button', { name }).first().click();
}
