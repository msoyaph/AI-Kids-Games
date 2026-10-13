import { expect, type Page } from '@playwright/test';
import { inflateSync } from 'node:zlib';
import { GAME } from '../../src/config';

export type Rect = { x: number; y: number; w: number; h: number };
export type Snapshot = {
  screen: string; mode: string; score: number; moves: number; over: boolean; end: string; board: number[];
  tray: ({ id: string; color: number } | null)[]; bonus: string | null; streak: number;
  helpers: { undo: number; shuffle: number; single: number };
  settings: { symbols: boolean; contrast: boolean; text: number; theme: string };
  play: { selected: number | null; ghost: number; dragging: boolean; keyMode: boolean };
  layout: { board: Rect; slots: Rect[]; cell: number; portrait: boolean; lift: number; bonus: Rect };
  drag: { visible: boolean; x: number; y: number; scale: number };
  persistent: boolean; frames: number; reduced: boolean; glowsLastSecond: number; particles: number; level: string | null; theme: string;
};
export const snapshot = (page: Page) => page.evaluate(hook => (window as unknown as Record<string, { snapshot(): Snapshot }>)[hook]!.snapshot(), GAME.hook);
export const ORIGIN = '127.0.0.1:4444';

/** Collects console errors, page errors and any request that leaves the game's own origin. */
export function watch(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', error => problems.push(`page error: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') problems.push(`console error: ${message.text()}`); });
  page.on('request', request => { const url = new URL(request.url()); if (![ORIGIN, ''].includes(url.host) && !['data:', 'blob:', 'file:'].includes(url.protocol)) problems.push(`request to ${request.url()}`); });
  return problems;
}

export async function startClassic(page: Page, url = '/') {
  await page.goto(url);
  await expect(page.getByRole('heading', { name: 'Tuck Pop' })).toBeVisible();
  await page.locator('#classic').click();
  await expect.poll(async () => (await snapshot(page)).screen).toBe('play');
}

export const center = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/**
 * A finger drag. Chromium: real touch input through the DevTools protocol. WebKit: touch pointer
 * events dispatched on the canvas (Playwright has no touch-move for WebKit). `during` runs with the
 * finger down at the end point, before it lifts.
 */
export async function touchDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, during?: () => Promise<void>, steps = 10) {
  const browser = page.context().browser()?.browserType().name();
  if (browser === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y, id: 1 }] });
    for (let i = 1; i <= steps; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps, id: 1 }] });
      await page.waitForTimeout(16);
    }
    await during?.();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    return;
  }
  const fire = (type: string, x: number, y: number) => page.evaluate(([type, x, y]) => {
    const canvas = document.querySelector('#stage')!;
    canvas.dispatchEvent(new PointerEvent(type as string, { pointerId: 11, pointerType: 'touch', isPrimary: true, clientX: x as number, clientY: y as number, buttons: type === 'pointerup' ? 0 : 1, bubbles: true }));
  }, [type, x, y] as const);
  await fire('pointerdown', from.x, from.y);
  for (let i = 1; i <= steps; i++) { await fire('pointermove', from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps); await page.waitForTimeout(16); }
  await during?.();
  await fire('pointerup', to.x, to.y);
}

/**
 * A pretend gamepad (standard mapping). `press(name)` holds a button until the game has polled it
 * (it reads the pad once per frame), then releases it until the game has seen that too, so presses
 * register at any frame rate (software WebGL on CI is slow).
 */
export async function fakeGamepad(page: Page) {
  await page.addInitScript(() => {
    const pad = { buttons: new Array(17).fill(0) as number[], axes: [0, 0, 0, 0], polls: 0 };
    (window as unknown as { __pad: typeof pad }).__pad = pad;
    navigator.getGamepads = () => { pad.polls++; return [{ id: 'Test pad', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(), axes: pad.axes, buttons: pad.buttons.map(v => ({ pressed: v > 0.5, value: v, touched: v > 0 })), hapticActuator: null, vibrationActuator: null } as unknown as Gamepad]; };
  });
  const index: Record<string, number> = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, back: 8, start: 9, up: 12, down: 13, left: 14, right: 15 };
  type Pad = { __pad: { buttons: number[]; polls: number } };
  const polls = () => page.evaluate(() => (window as unknown as Pad).__pad.polls);
  // the game reads the pad (twice) every frame; wait for a full frame after the change
  const seen = async (from: number) => { await expect.poll(polls, { timeout: 30_000 }).toBeGreaterThanOrEqual(from + 3); };
  // change a button and read the poll count in one step, so no frame slips in between
  const set = (i: number, v: number) => page.evaluate(([i, v]) => { const pad = (window as unknown as Pad).__pad; pad.buttons[i!] = v!; return pad.polls; }, [i, v]);
  return async (name: keyof typeof index) => {
    await seen(await set(index[name]!, 1));
    await seen(await set(index[name]!, 0));
  };
}

/** Reads one pixel (RGB, 0–255) from a PNG screenshot (8-bit RGB or RGBA, not interlaced). */
export function pixel(png: Buffer, x: number, y: number): [number, number, number] {
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20), type = png[25]!;
  const bpp = type === 6 ? 4 : 3;
  const chunks: Buffer[] = [];
  for (let at = 8; at < png.length;) { const len = png.readUInt32BE(at), kind = png.toString('ascii', at + 4, at + 8); if (kind === 'IDAT') chunks.push(png.subarray(at + 8, at + 8 + len)); at += 12 + len; }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * bpp;
  const rows: Buffer[] = [];
  let prev = Buffer.alloc(stride);
  for (let r = 0; r < height; r++) {
    const f = raw[r * (stride + 1)]!, line = Buffer.from(raw.subarray(r * (stride + 1) + 1, (r + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp]! : 0, b = prev[i]!, c = i >= bpp ? prev[i - bpp]! : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      line[i] = (line[i]! + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]!) & 255;
    }
    rows.push(line); prev = line;
    if (r === y) break;
  }
  const line = rows[y]!;
  return [line[x * bpp]!, line[x * bpp + 1]!, line[x * bpp + 2]!];
}
