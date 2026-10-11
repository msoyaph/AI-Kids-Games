import { expect, test, type Frame, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIST = resolve('dist/index.html');
const ORIGIN = 'http://localhost:4181';

type Hook = {
  ready: boolean;
  info: { mode: string; day: number; location: string; tile: { x: number; y: number }; renderer: string; modalOpen: boolean; blocked: boolean } | null;
  screenOf(x: number, y: number): { x: number; y: number };
  newGame(o?: object): boolean;
  sleep(): void;
  closeModals(): void;
  scene(name: string): boolean;
  warp(loc: string, x: number, y: number): void;
};
declare global {
  interface Window {
    __cliffvalley: Hook;
  }
}

/** Collect console errors, page errors and any request that leaves the page's own origin. */
function watch(page: Page) {
  const errors: string[] = [];
  const outside: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('request', (r) => {
    const u = r.url();
    if (!/^(data|blob|file|about):/.test(u) && !u.startsWith(ORIGIN)) outside.push(u);
  });
  return { errors, outside };
}

async function ready(target: Page | Frame) {
  await target.waitForFunction(() => window.__cliffvalley?.ready === true, null, { timeout: 90_000 });
}

async function waitFree(page: Page) {
  await page.waitForFunction(() => {
    const i = window.__cliffvalley.info;
    return !!i && i.mode === 'play' && !i.modalOpen && !i.blocked;
  }, null, { timeout: 60_000 });
}

/** Wait until the camera stops gliding (so screen positions are stable). */
async function settle(page: Page) {
  let last = { x: -1, y: -1 };
  let same = 0;
  for (let i = 0; i < 60 && same < 3; i++) {
    const p = await page.evaluate(() => {
      const t = window.__cliffvalley.info!.tile;
      return window.__cliffvalley.screenOf(t.x, t.y);
    });
    same = Math.abs(p.x - last.x) < 0.5 && Math.abs(p.y - last.y) < 0.5 ? same + 1 : 0;
    last = p;
    await page.waitForTimeout(250);
  }
}

/** Click through any dialogue boxes (the intro cutscene) until none show up for a moment. */
async function clickThroughDialogue(page: Page) {
  for (let i = 0; i < 60; i++) {
    const btn = page.locator('.dlg .acts button').first();
    try {
      await btn.waitFor({ state: 'visible', timeout: 2500 });
    } catch {
      return;
    }
    await page.locator('.dlg .text').first().click({ force: true }).catch(() => {});
    await btn.click({ force: true }).catch(() => {});
  }
}

test.describe('Cliff Valley', () => {
  test('boots to the title with no errors and no outside requests', async ({ page }) => {
    const w = watch(page);
    await page.goto('/?lowq=1');
    await ready(page);
    await expect(page.getByRole('button', { name: /Start Playing|Choose a Farm/ })).toBeVisible();
    const info = await page.evaluate(() => ({ mode: window.__cliffvalley.info?.mode }));
    expect(info.mode).toBe('title');
    await page.waitForTimeout(1500);
    expect(w.errors).toEqual([]);
    expect(w.outside).toEqual([]);
  });

  test('a new farm through the real menus, then walk, sleep, and the save survives a reload', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'keyboard flow runs on desktop');
    const w = watch(page);
    await page.goto('/?lowq=1');
    await ready(page);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await ready(page);
    await page.getByRole('button', { name: 'Start Playing' }).click();
    await page.getByRole('button', { name: 'New' }).first().click();
    await page.getByLabel('Farmer nickname').fill('Tester');
    await page.getByLabel('Farm name').fill('Sunny');
    await page.getByLabel('Pet name').fill('Biscuit');
    await page.getByRole('button', { name: 'Start farming!' }).click();
    await page.waitForFunction(() => window.__cliffvalley.info?.mode === 'play', null, { timeout: 60_000 });
    // the intro cutscene: click through the dialogue until we can move
    for (let i = 0; i < 5; i++) {
      await clickThroughDialogue(page);
      if (await page.evaluate(() => !window.__cliffvalley.info?.blocked && !window.__cliffvalley.info?.modalOpen)) break;
    }
    await waitFree(page);
    // walk a few steps with the keyboard
    const before = await page.evaluate(() => window.__cliffvalley.info!.tile);
    await page.keyboard.down('s');
    await page.waitForTimeout(1200);
    await page.keyboard.up('s');
    const after = await page.evaluate(() => window.__cliffvalley.info!.tile);
    expect(after.y !== before.y || after.x !== before.x).toBe(true);
    // sleep → day 2 → saved
    await page.evaluate(() => window.__cliffvalley.sleep());
    await page.waitForFunction(() => window.__cliffvalley.info?.day === 1, null, { timeout: 60_000 });
    await page.waitForTimeout(1500);
    const saved = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('cliffvalley.slot.'));
      return keys.map((k) => [k, localStorage.getItem(k)!.length] as const);
    });
    expect(saved.length).toBe(1);
    expect(saved[0][1]).toBeLessThan(300 * 1024);
    expect(Object.keys(await page.evaluate(() => ({ ...localStorage }))).every((k) => k.startsWith('cliffvalley.'))).toBe(true);
    await page.reload();
    await ready(page);
    await page.getByRole('button', { name: /Continue — Tester/ }).click();
    await page.waitForFunction(() => window.__cliffvalley.info?.mode === 'play', null, { timeout: 60_000 });
    expect(await page.evaluate(() => window.__cliffvalley.info!.day)).toBe(1);
    expect(w.errors).toEqual([]);
    expect(w.outside).toEqual([]);
  });

  test('touch: tap the ground to walk there', async ({ page }, info) => {
    test.skip(info.project.name === 'desktop', 'touch devices only');
    const w = watch(page);
    await page.goto('/?lowq=1');
    await ready(page);
    await page.evaluate(() => {
      window.__cliffvalley.newGame({ seed: 7, slot: 3 });
      window.__cliffvalley.closeModals();
    });
    await page.waitForFunction(() => window.__cliffvalley.info?.mode === 'play', null, { timeout: 60_000 });
    await waitFree(page);
    const before = await page.evaluate(() => window.__cliffvalley.info!.tile);
    // tap the floor two tiles below the farmer (re-tap if a slow frame moved the camera)
    const box = (await page.locator('#game canvas').boundingBox())!;
    let moved = false;
    for (let attempt = 0; attempt < 3 && !moved; attempt++) {
      await settle(page);
      const at = await page.evaluate(([x, y]) => window.__cliffvalley.screenOf(x, y), [before.x, before.y + 2]);
      await page.touchscreen.tap(box.x + at.x, box.y + at.y);
      moved = await page
        .waitForFunction((y0) => window.__cliffvalley.info!.tile.y > y0, before.y, { timeout: 15_000 })
        .then(() => true)
        .catch(() => false);
    }
    expect(moved).toBe(true);
    await expect(page.locator('.touch.on')).toBeVisible();
    expect(w.errors).toEqual([]);
  });

  test('the HUD fits on screen', async ({ page }) => {
    await page.goto('/?lowq=1');
    await ready(page);
    await page.evaluate(() => {
      window.__cliffvalley.newGame({ seed: 5, slot: 3 });
      window.__cliffvalley.closeModals();
    });
    await waitFree(page);
    await page.waitForTimeout(500);
    const out = await page.evaluate(() =>
      ['.toolbar', '.clock', '.touch .tool', '.touch .hand']
        .map((sel) => [sel, document.querySelector(sel)?.getBoundingClientRect()] as const)
        .filter(([, r]) => r && r.width > 0)
        .filter(([, r]) => r!.left < -1 || r!.right > innerWidth + 1 || r!.bottom > innerHeight + 1)
        .map(([sel]) => sel),
    );
    expect(out).toEqual([]);
  });

  test('every capture scene renders without errors', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'one size is enough');
    const w = watch(page);
    await page.goto('/?lowq=1');
    await ready(page);
    for (const name of ['spring', 'summer', 'autumn', 'winter', 'farmHarvest', 'town', 'festival', 'mine', 'fishingSunset', 'title']) {
      await page.evaluate((n) => window.__cliffvalley.scene(n), name);
      await page.waitForTimeout(400);
    }
    expect(w.errors).toEqual([]);
  });

  test('works from file:// with no requests', async ({ page }) => {
    const w = watch(page);
    await page.goto(pathToFileURL(DIST).href + '?lowq=1');
    await ready(page);
    await expect(page.getByRole('button', { name: /Start Playing|Choose a Farm/ })).toBeVisible();
    await page.evaluate(() => window.__cliffvalley.newGame({ seed: 3, slot: 3 }));
    await page.waitForFunction(() => window.__cliffvalley.info?.mode === 'play');
    await page.waitForTimeout(1000);
    expect(w.errors).toEqual([]);
    expect(w.outside).toEqual([]);
  });

  test('works inside a sandboxed iframe (no storage access) over http and file://', async ({ page }, info) => {
    const w = watch(page);
    // over http: an opaque-origin iframe where localStorage throws → memory saves
    await page.setContent(`<iframe id="g" sandbox="allow-scripts" src="${ORIGIN}/index.html?lowq=1" style="width:100%;height:600px;border:0"></iframe>`);
    let frame = page.frameLocator('#g');
    void frame;
    let f = page.frames().find((x) => x.url().startsWith(ORIGIN))!;
    await ready(f);
    await f.evaluate(() => window.__cliffvalley.newGame({ seed: 4, slot: 3 }));
    await f.waitForFunction(() => window.__cliffvalley.info?.mode === 'play');
    await f.evaluate(() => window.__cliffvalley.sleep());
    await f.waitForFunction(() => window.__cliffvalley.info?.day === 1, null, { timeout: 60_000 });
    // over file://
    const dir = resolve('test-results', `iframe-${info.project.name}`);
    mkdirSync(dir, { recursive: true });
    const wrapper = resolve(dir, 'wrapper.html');
    writeFileSync(wrapper, `<!doctype html><iframe id="g" sandbox="allow-scripts" src="${pathToFileURL(DIST).href}?lowq=1" style="width:100%;height:600px;border:0"></iframe>`);
    await page.goto(pathToFileURL(wrapper).href);
    f = await (async () => {
      for (let i = 0; i < 50; i++) {
        const fr = page.frames().find((x) => x.url().startsWith('file:') && x.url().includes('index.html'));
        if (fr) return fr;
        await page.waitForTimeout(200);
      }
      throw new Error('iframe did not load');
    })();
    await ready(f);
    expect(await f.evaluate(() => window.__cliffvalley.info?.mode)).toBe('title');
    expect(w.errors).toEqual([]);
    expect(w.outside).toEqual([]);
  });
});
