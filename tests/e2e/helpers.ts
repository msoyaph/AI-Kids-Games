import { expect, type Page } from '@playwright/test';

/** Collects console errors and page errors for a test. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

export async function boot(page: Page, query = '?debug'): Promise<void> {
  await page.goto(`/${query}`);
  await expect(page.getByTestId('btn-play')).toBeVisible({ timeout: 30_000 });
}

/** Click through any open dialogue boxes. */
export async function skipDialogue(page: Page, max = 40): Promise<void> {
  for (let i = 0; i < max; i++) {
    const d = page.getByTestId('dialogue');
    if (!(await d.isVisible().catch(() => false))) {
      await page.waitForTimeout(150);
      if (!(await d.isVisible().catch(() => false))) return;
    }
    await d.click({ force: true }).catch(() => {});
    await page.waitForTimeout(80);
  }
}

/** Close popups (mission complete, badges) if any are open. */
export async function closePopups(page: Page): Promise<void> {
  for (let i = 0; i < 10; i++) {
    const ok = page.locator('[data-testid=btn-popup-ok], [data-testid=btn-badge-ok], [data-testid=btn-tip-ok]').first();
    if (!(await ok.isVisible().catch(() => false))) return;
    await ok.click({ force: true }).catch(() => {});
    await page.waitForTimeout(150);
  }
}

/** Start a brand-new game in slot 0 and arrive at the hub. */
export async function newGame(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.clear());
  await page.getByTestId('btn-play').click();
  await page.getByTestId('slot-0').click();
  await expect(page.getByTestId('name-input')).toBeVisible();
  await page.getByTestId('name-input').fill('Testy');
  await page.getByTestId('btn-start').click();
  await expect(page.getByTestId('hub-banner')).toBeVisible();
  await skipDialogue(page);
  await closePopups(page);
}

export async function scene(page: Page): Promise<string> {
  return page.evaluate(() => (window as unknown as { __spacesky: { game: { sceneName: string } } }).__spacesky.game.sceneName);
}

export async function go(page: Page, name: string, params: Record<string, unknown> = {}): Promise<void> {
  await page.evaluate(([n, p]) => (window as unknown as { __spacesky: { game: { go: (a: string, b: unknown) => Promise<void> } } }).__spacesky.game.go(n as string, p), [name, params] as const);
  await page.waitForTimeout(400);
}

/** Click a button, wait until the given scene is showing, then clear any greeting dialogue. */
export async function navTo(page: Page, testId: string, sceneName: string): Promise<void> {
  await page.getByTestId(testId).click({ force: true });
  await expect.poll(() => scene(page), { timeout: 15_000 }).toBe(sceneName);
  await page.waitForTimeout(700);
  await skipDialogue(page);
  await closePopups(page);
}
