/** Shared helpers for Breezeport's browser tests (adapted from Fieldlark's). */
import { expect, type Page } from '@playwright/test';
import { encodeTown } from '../../src/save/codec';
import type { Town } from '../../src/sim/state';

export const HOOK = '__breezeport';
export const PREFIX = 'breezeport.';
export const PORT = 4715;
export const LOW = !!process.env.E2E_LOW;

export interface Snapshot {
  screen: string; capture: boolean; slot: number | null; mode: string; name: string; t: number; coins: number;
  population: number; happy: number | null; chapter: number; things: number; roads: number; routes: number;
  tool: string; sub: string; placing: { def: string; x: number; z: number; rot: number } | null; panel: boolean;
  camera: { x: number; z: number; yawStep: number; zoom: number; yaw: number }; cursor: { x: number; z: number } | null; lastDevice: string;
  quality: string; fps: number; persistent: boolean; audio: string; reducedMotion: boolean; season: string; drawCalls: number; triangles: number;
}

export const snapshot = (page: Page) => page.evaluate(hook => (window as unknown as Record<string, { snapshot(): Snapshot }>)[hook]!.snapshot(), HOOK);
export const tileOnScreen = (page: Page, x: number, z: number) => page.evaluate(([hook, x, z]) => (window as unknown as Record<string, { tileOnScreen(x: number, z: number): { x: number; y: number } }>)[hook as string]!.tileOnScreen(x as number, z as number), [HOOK, x, z] as const);
export const pickAt = (page: Page, x: number, y: number) => page.evaluate(([hook, x, y]) => (window as unknown as Record<string, { pickAt(x: number, y: number): { x: number; z: number } | null }>)[hook as string]!.pickAt(x as number, y as number), [HOOK, x, y] as const);

/** A town saved in slot `n` before the page loads (built in Node with the game's own code). */
export async function withTown(page: Page, town: Town, n = 1, settings: Record<string, unknown> = {}) {
  const text = encodeTown(town, 0);
  const s = JSON.stringify({ v: 1, textSize: 0, readAloud: false, reducedMotion: false, colorblind: false, hints: true, volume: { master: 0, music: 0, sfx: 0 }, quality: 'auto', leftHanded: false, creative: false, lastSlot: n, ...settings });
  await page.addInitScript(([slotKey, value, setKey, set]) => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.setItem(slotKey, value);
    localStorage.setItem(setKey, set);
    sessionStorage.setItem('seeded', '1');
  }, [`${PREFIX}slot${n}`, text, `${PREFIX}settings`, s] as const);
}

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
    if (![`127.0.0.1:${PORT}`, ''].includes(url.host) && url.protocol !== 'data:' && url.protocol !== 'blob:') problems.push(`request to ${request.url()}`);
  });
  return problems;
}

/** Press through any story dialogue on screen (Next… OK!). */
export async function readStory(page: Page) {
  for (let i = 0; i < 20; i++) {
    const next = page.locator('.story-card button.primary');
    if (!(await next.count())) break;
    await next.first().click();
    await page.waitForTimeout(50);
  }
}

/** From the title screen to a new story town in slot 1, through the opening lines. */
export async function newStoryTown(page: Page) {
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'New town' }).first().click();
  await page.getByRole('button', { name: /^Story/ }).click();
  await page.getByRole('button', { name: 'Become the mayor!' }).click();
  await expect.poll(async () => (await snapshot(page)).screen).toBe('city');
  await readStory(page);
}

/** A tool on the tool bar, by its label (its accessible name is "Roads (2)" and so on). */
export const toolButton = (page: Page, label: string) => page.getByRole('button', { name: new RegExp(`^${label} \\(\\d\\)$`) });

/** A tap (touch on phones and tablets, a click with a mouse). */
export async function tap(page: Page, p: { x: number; y: number }, touch: boolean) {
  if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
}

/** A drag from one tile to another: with the mouse, or one finger (synthetic touch events on the canvas). */
export async function dragTiles(page: Page, from: [number, number], to: [number, number], touch: boolean) {
  const a = await tileOnScreen(page, ...from), b = await tileOnScreen(page, ...to);
  if (!touch) {
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(a.x + ((b.x - a.x) * i) / 10, a.y + ((b.y - a.y) * i) / 10);
    await page.mouse.up();
    return;
  }
  const cdp = await page.context().newCDPSession(page).catch(() => null);
  if (cdp) {
    const pt = (x: number, y: number) => [{ x, y, id: 1 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(a.x, a.y) });
    for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(a.x + ((b.x - a.x) * i) / 10, a.y + ((b.y - a.y) * i) / 10) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    return;
  }
  // WebKit has no CDP: pointer events with pointerType touch, as a finger sends them
  await page.evaluate(([ax, ay, bx, by]) => {
    const el = document.querySelector('#town')!;
    const ev = (type: string, x: number, y: number) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1 }));
    ev('pointerdown', ax!, ay!);
    for (let i = 1; i <= 10; i++) ev('pointermove', ax! + ((bx! - ax!) * i) / 10, ay! + ((by! - ay!) * i) / 10);
    ev('pointerup', bx!, by!);
  }, [a.x, a.y, b.x, b.y]);
}

/** A pretend gamepad (standard mapping): `press(name)` taps a button for exactly one frame of the game's polling (from Fieldlark). */
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
    const from = await page.evaluate(i => { const pad = (window as unknown as Pad).__pad; pad.taps[i] = 1; return pad.polls; }, index[name]!);
    await expect.poll(polls, { timeout: 30_000 }).toBeGreaterThanOrEqual(from + 3);
  };
}
