import { expect, test, type Page } from '@playwright/test';
import { watch } from './helpers';
import { SPECIES } from '../../src/data/species';

const HOOK = '__agentmon';
type Snapshot = { scene: string; renderer: string; frames: number; creatures?: number };
const snapshot = (page: Page) => page.evaluate(hook => (window as unknown as Record<string, { snapshot(): Snapshot }>)[hook]!.snapshot(), HOOK);

test('the title screen starts with no errors and no network', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Agentmon' })).toBeVisible();
  await expect.poll(async () => (await snapshot(page)).frames, { timeout: 20_000 }).toBeGreaterThan(10);
  expect((await snapshot(page)).scene).toBe('title');
  expect(problems).toEqual([]);
});

// every Agentmon in the data (52 in 1.0, 77 in 1.1); the last one's label proves the sheet got to the end
const ALL = Object.values(SPECIES).sort((a, b) => a.num - b.num);
const LAST = ALL[ALL.length - 1]!;

test('the creature sheet shows every Agentmon without touching saves', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/?scene=sheet');
  await expect.poll(async () => (await snapshot(page)).creatures, { timeout: 20_000 }).toBe(ALL.length);
  await expect(page.getByText(`${LAST.num} ${LAST.name}`)).toBeAttached();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('agentmon.')))).toEqual([]);
  expect(problems).toEqual([]);
});

test('runs inside a sandboxed iframe like on the website', async ({ page }) => {
  const problems = watch(page);
  await page.route('**/host.html', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><iframe src="/" sandbox="allow-scripts allow-same-origin allow-pointer-lock" allow="fullscreen; gamepad" style="width:960px;height:540px;border:0"></iframe>' }));
  await page.goto('/host.html');
  const frame = page.frameLocator('iframe');
  await expect(frame.getByRole('heading', { name: 'Agentmon' })).toBeVisible({ timeout: 20_000 });
  expect(problems).toEqual([]);
});
