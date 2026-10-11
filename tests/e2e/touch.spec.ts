import { expect, test, type Page } from '@playwright/test';

/** Touch devices (run under the webkit-tablet, webkit-phone and chromium-tablet projects). */

type G = {
  world: {
    player: { x: number; z: number; vx: number; vz: number; character: { id: string } };
    stats: { jumps: number };
    mods: { crowd: number };
    difficulty: string;
    time: number;
  } | null;
  paused: boolean;
  renderer: { quality: string };
};

function watch(page: Page): string[] {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`[error] ${m.text()}`);
  });
  return problems;
}

/** A synthetic finger (Pointer Events with pointerType 'touch') on an element. */
async function finger(page: Page, selector: string, path: Array<[number, number]>, holdMs = 600): Promise<void> {
  await page.evaluate(
    async ({ selector, path, holdMs }) => {
      const el = document.querySelector(selector) as HTMLElement;
      const r = el.getBoundingClientRect();
      const at = (k: number): { clientX: number; clientY: number } => ({ clientX: r.left + path[k][0], clientY: r.top + path[k][1] });
      const opts = (k: number): PointerEventInit => ({ pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true, ...at(k) });
      el.dispatchEvent(new PointerEvent('pointerdown', opts(0)));
      for (let k = 1; k < path.length; k++) {
        await new Promise((res) => setTimeout(res, 30));
        el.dispatchEvent(new PointerEvent('pointermove', opts(k)));
      }
      await new Promise((res) => setTimeout(res, holdMs));
      el.dispatchEvent(new PointerEvent('pointerup', opts(path.length - 1)));
    },
    { selector, path, holdMs },
  );
}

/** Open the game and wait until it has started (WebKit can take a while on a busy machine). */
async function open(page: Page, url = '/'): Promise<void> {
  await page.goto(url);
  // a failed start reports why (window.__theabonkError) instead of just timing out
  await page.waitForFunction(() => (window as unknown as { __theabonk?: unknown; __theabonkError?: string }).__theabonk || (window as unknown as { __theabonkError?: string }).__theabonkError, null, { timeout: 60_000 });
  const err = await page.evaluate(() => (window as unknown as { __theabonkError?: string }).__theabonkError ?? null);
  expect(err, 'the game failed to start').toBeNull();
}

const game = (page: Page): Promise<G> => page.evaluate(() => {
  const g = (window as unknown as { __theabonk: G }).__theabonk;
  return { world: g.world ? { player: { ...g.world.player, character: { id: g.world.player.character.id } }, stats: { jumps: g.world.stats.jumps }, mods: { crowd: g.world.mods.crowd }, difficulty: g.world.difficulty, time: g.world.time } : null, paused: g.paused, renderer: { quality: g.renderer.quality } };
});

test('a first run on a touch device: tablet tier, Relaxed, twin-stick controls', async ({ page }) => {
  const problems = watch(page);
  await open(page);
  await expect(page.locator('html')).toHaveClass(/touch/);
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  // Relaxed is preselected the first time on a touch device
  await expect(page.locator('.diff-tab.sel')).toHaveText('Relaxed');
  await page.getByRole('button', { name: 'Start run' }).tap();
  await expect(page.locator('.touch-ui')).toBeVisible();
  await page.waitForTimeout(500);
  let g = await game(page);
  expect(g.renderer.quality).toBe('tablet');
  expect(g.world!.mods.crowd).toBeCloseTo(0.65);
  expect(g.world!.difficulty).toBe('relaxed');
  const x0 = g.world!.player.x;
  const z0 = g.world!.player.z;
  // left thumb: push the stick forward
  await finger(page, '.tzone-stick', [[120, 200], [120, 170], [120, 130]], 1600);
  g = await game(page);
  expect(Math.hypot(g.world!.player.x - x0, g.world!.player.z - z0)).toBeGreaterThan(1.2);
  // jump button
  await page.locator('.gbtn-jump').dispatchEvent('pointerdown', { pointerId: 8, pointerType: 'touch' });
  await page.waitForTimeout(200);
  await page.locator('.gbtn-jump').dispatchEvent('pointerup', { pointerId: 8, pointerType: 'touch' });
  await page.waitForTimeout(400);
  expect((await game(page)).world!.stats.jumps).toBeGreaterThan(0);
  // pause button
  await page.locator('.gbtn-pause').dispatchEvent('pointerdown', { pointerId: 9, pointerType: 'touch' });
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  expect(problems, problems.join('\n')).toEqual([]);
});

test('portrait shows the rotate hint and pauses the run', async ({ page }) => {
  const problems = watch(page);
  await open(page);
  await page.getByRole('button', { name: 'Play', exact: true }).tap();
  await page.getByRole('button', { name: 'Start run' }).tap();
  await expect(page.locator('.touch-ui')).toBeVisible();
  const vp = page.viewportSize()!;
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await expect(page.locator('.rotate-hint')).toBeVisible();
  await page.waitForTimeout(300);
  expect((await game(page)).paused).toBe(true);
  await page.setViewportSize(vp);
  await expect(page.locator('.rotate-hint')).toBeHidden();
  expect(problems, problems.join('\n')).toEqual([]);
});
