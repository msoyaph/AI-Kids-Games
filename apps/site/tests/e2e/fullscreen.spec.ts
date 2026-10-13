import { devices,expect,test,type Page } from '@playwright/test';
import { guard as guardOrigin,instrument,pastTouchGate,startGame } from './games';
const guard = (page: Page) => guardOrigin(page,new URL(test.info().project.use.baseURL!).origin);

// Fullscreen play on the play page (src/lib/fullscreen.ts, src/pages/Play.tsx). Runs on Chromium
// (desktop, tablet, phone) and WebKit (desktop, iPad, iPhone). Playwright's WebKit phone profile has
// no element fullscreen, like a real iPhone; its iPad profile runs desktop-class WebKit at iPad size
// with touch, like iPadOS Safari. The Home Screen display mode is emulated with an init script.

const fsState = (page: Page) => page.evaluate(() => {
  const d = document as Document & { webkitFullscreenElement?: Element | null };
  const el = d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
  return el ? el.className : null;
});
const box = async (page: Page,selector: string) => (await page.locator(selector).first().boundingBox())!;
const overlaps = (a: { x: number; y: number; width: number; height: number },b: typeof a) => a.x < b.x+b.width && b.x < a.x+a.width && a.y < b.y+b.height && b.y < a.y+a.height;
/** Exit fullscreen the way Esc, a swipe or the back gesture would: from outside the page's own buttons. */
const exitFromOutside = (page: Page) => page.evaluate(async () => {
  const d = document as Document & { webkitExitFullscreen?: () => void; webkitFullscreenElement?: Element | null };
  if (d.fullscreenElement) await d.exitFullscreen(); else if (d.webkitFullscreenElement) d.webkitExitFullscreen?.();
});
const iPhoneSafari = () => {
  // iPhone Safari: no element fullscreen at all, and navigator.standalone exists (false in a tab).
  Object.defineProperty(Document.prototype,'fullscreenEnabled',{ get: () => false,configurable: true });
  Object.defineProperty(Document.prototype,'webkitFullscreenEnabled',{ get: () => false,configurable: true });
  for (const name of ['requestFullscreen','webkitRequestFullscreen','webkitRequestFullScreen']) Object.defineProperty(Element.prototype,name,{ value: undefined,configurable: true });
  Object.defineProperty(Navigator.prototype,'standalone',{ get: () => false,configurable: true });
};
const homeScreen = () => {
  Object.defineProperty(Navigator.prototype,'standalone',{ get: () => true,configurable: true });
  const real = window.matchMedia.bind(window);
  window.matchMedia = (query: string) => query === '(display-mode: standalone)' ? Object.assign(Object.create(real(query)),{ matches: true,media: query }) : real(query);
};
const isIPhone = (name: string) => name === 'webkit-phone';

async function openPlay(page: Page,slug: string) {
  await page.goto(`/play/${slug}`);
  await pastTouchGate(page);
  await expect(page.locator('.game-loading')).toBeHidden({ timeout: 60_000 });
}

test('fullscreen: the top-bar button, the corner button, Exit fullscreen and Back',async ({ page },info) => {
  test.skip(isIPhone(info.project.name),'iPhone Safari has no element fullscreen: covered below');
  const checks = guard(page);
  await openPlay(page,'light-crossing');
  // phones and tablets ask once first; answering "Not now" keeps it away
  const tip = page.getByRole('dialog',{ name: 'Play fullscreen?' });
  if (await page.evaluate(() => matchMedia('(pointer: coarse)').matches)) {
    await expect(tip).toBeVisible();
    await tip.getByRole('button',{ name: 'Not now' }).click();
    await expect(tip).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('aikg:tips'))).toBe('["fullscreen"]');
    await page.reload(); await expect(page.locator('.game-loading')).toBeHidden({ timeout: 60_000 });
  }
  await expect(tip).toHaveCount(0);
  await page.getByRole('button',{ name: 'Enter fullscreen' }).click();
  await expect.poll(() => fsState(page)).toContain('play-shell');
  await expect(page.locator('.play-bar')).toBeHidden();
  const corner = page.getByRole('button',{ name: 'Game menu' });
  await expect(corner).toBeVisible();
  // the corner button sits in its own rail: it never covers any part of the game
  const frame = await box(page,'iframe'),button = await box(page,'.fs-corner'),rail = await box(page,'.fs-rail');
  expect(overlaps(button,frame)).toBe(false); expect(overlaps(rail,frame)).toBe(false);
  expect(Math.min(button.width,button.height)).toBeGreaterThanOrEqual(48);
  const viewport = page.viewportSize()!;
  expect(frame.width*frame.height,'the game gets nearly all of the screen').toBeGreaterThan(viewport.width*viewport.height*.8);
  await page.screenshot({ path: `test-results/fullscreen-${info.project.name}.png` });
  // the corner button reveals Back and Exit fullscreen
  await corner.click();
  const menu = page.getByRole('group',{ name: 'Game menu' });
  await expect(menu.getByRole('button',{ name: 'Back' })).toBeVisible();
  await page.screenshot({ path: `test-results/fullscreen-menu-${info.project.name}.png` });
  await menu.getByRole('button',{ name: 'Exit fullscreen' }).click();
  await expect.poll(() => fsState(page)).toBeNull();
  await expect(page.locator('.play-bar')).toBeVisible(); await expect(corner).toHaveCount(0);
  // in again, then Back from the corner menu leaves fullscreen and goes to the game's page
  await page.getByRole('button',{ name: 'Enter fullscreen' }).click();
  await expect.poll(() => fsState(page)).toContain('play-shell');
  await corner.click(); await menu.getByRole('button',{ name: 'Back' }).click();
  await expect(page).toHaveURL(/\/game\/light-crossing$/);
  await expect.poll(() => fsState(page)).toBeNull();
  expect(checks.errors).toEqual([]); expect(checks.external).toEqual([]);
});

test('fullscreen: leaving it from outside (Esc, swipe, back gesture) leaves a working page',async ({ page },info) => {
  test.skip(isIPhone(info.project.name),'iPhone Safari has no element fullscreen');
  const checks = guard(page);
  await openPlay(page,'space-sky');
  const tip = page.getByRole('dialog',{ name: 'Play fullscreen?' });
  if (await tip.isVisible()) await tip.getByRole('button',{ name: 'Play fullscreen' }).click();
  else await page.getByRole('button',{ name: 'Enter fullscreen' }).click();
  await expect.poll(() => fsState(page)).toContain('play-shell');
  await exitFromOutside(page);
  await expect.poll(() => fsState(page)).toBeNull();
  await expect(page.locator('.play-bar')).toBeVisible();
  await expect(page.getByRole('button',{ name: 'Game menu' })).toHaveCount(0);
  // and fullscreen still works afterwards
  await page.getByRole('button',{ name: 'Enter fullscreen' }).click();
  await expect.poll(() => fsState(page)).toContain('play-shell');
  await exitFromOutside(page);
  await expect.poll(() => fsState(page)).toBeNull();
  expect(checks.errors).toEqual([]); expect(checks.external).toEqual([]);
});

test('fullscreen on iPad Safari uses the webkit-prefixed API',async ({ page },info) => {
  test.skip(info.project.name !== 'webkit-tablet','iPad Safari check');
  // Older iPad Safari has only webkitRequestFullscreen / webkitExitFullscreen.
  await page.addInitScript(() => {
    Object.defineProperty(Document.prototype,'fullscreenEnabled',{ get: () => false,configurable: true });
    Object.defineProperty(Element.prototype,'requestFullscreen',{ value: undefined,configurable: true });
  });
  await openPlay(page,'light-crossing');
  const tip = page.getByRole('dialog',{ name: 'Play fullscreen?' });
  if (await tip.isVisible()) await tip.getByRole('button',{ name: 'Not now' }).click();
  await page.getByRole('button',{ name: 'Enter fullscreen' }).click();
  await expect.poll(() => fsState(page)).toContain('play-shell');
  await expect(page.getByRole('button',{ name: 'Game menu' })).toBeVisible();
  await page.getByRole('button',{ name: 'Game menu' }).click();
  await page.getByRole('group',{ name: 'Game menu' }).getByRole('button',{ name: 'Exit fullscreen' }).click();
  await expect.poll(() => fsState(page)).toBeNull();
});

test('first play on a phone or tablet: "Play fullscreen?" once, remembered on the device',async ({ page },info) => {
  test.skip(isIPhone(info.project.name) || info.project.name.endsWith('desktop'),'phones and tablets that can go fullscreen');
  await openPlay(page,'space-sky');
  const tip = page.getByRole('dialog',{ name: 'Play fullscreen?' });
  await expect(tip).toBeVisible();
  for (const target of await tip.getByRole('button').all()) { const b = (await target.boundingBox())!; expect(Math.min(b.width,b.height)).toBeGreaterThanOrEqual(48); }
  await page.screenshot({ path: `test-results/fullscreen-tip-${info.project.name}.png` });
  await tip.getByRole('button',{ name: 'Play fullscreen' }).click();
  await expect.poll(() => fsState(page)).toContain('play-shell');
  await exitFromOutside(page);
  await page.goto('/play/light-crossing'); await expect(page.locator('.game-loading')).toBeHidden({ timeout: 60_000 });
  await expect(tip).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('aikg:tips') || '[]'))).toEqual(['fullscreen']);
});

test('desktop: no first-play prompt, the button is there',async ({ page },info) => {
  test.skip(!info.project.name.endsWith('desktop'),'desktop only');
  await openPlay(page,'light-crossing');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button',{ name: 'Enter fullscreen' })).toBeVisible();
});

test('iPhone Safari: no fullscreen button; a one-time Home Screen card instead',async ({ page },info) => {
  test.skip(!isIPhone(info.project.name),'iPhone');
  await page.addInitScript(iPhoneSafari);
  await openPlay(page,'light-crossing');
  await expect(page.getByRole('button',{ name: /fullscreen/i })).toHaveCount(0);
  const card = page.getByRole('dialog',{ name: 'Add AI Kids Games to your Home Screen to play full screen' });
  await expect(card).toBeVisible();
  await expect(card).toContainText('Add to Home Screen');
  await expect(card).toContainText('keep their own progress');
  await page.screenshot({ path: `test-results/homescreen-card-${info.project.name}.png` });
  await card.getByRole('button',{ name: 'Got it' }).tap();
  await expect(card).toHaveCount(0);
  await page.reload(); await expect(page.locator('.game-loading')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('aikg:tips') || '[]'))).toEqual(['home-screen']);
});

test('opened from the Home Screen (standalone): no card, no prompt, safe areas in the manifest and tags',async ({ page },info) => {
  test.skip(!isIPhone(info.project.name),'iPhone Home Screen web app');
  await page.addInitScript(iPhoneSafari); await page.addInitScript(homeScreen);
  await openPlay(page,'light-crossing');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button',{ name: /fullscreen/i })).toHaveCount(0);
  expect(await page.locator('meta[name="viewport"]').getAttribute('content')).toContain('viewport-fit=cover');
  expect(await page.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute('content')).toBe('yes');
  expect(await page.locator('meta[name="apple-mobile-web-app-title"]').getAttribute('content')).toBe('AI Kids Games');
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ display: 'standalone',start_url: '/',scope: '/' });
  // the play bar pads itself with the safe-area insets
  expect(await page.locator('.play-bar').evaluate(el => getComputedStyle(el).paddingTop)).not.toBe('');
  await page.screenshot({ path: `test-results/standalone-${info.project.name}.png` });
});

test('Android: entering fullscreen locks the game’s orientation; leaving unlocks it',async ({ browser,browserName }) => {
  test.skip(browserName !== 'chromium','Android Chrome emulation');
  const context = await browser.newContext({ ...devices['Pixel 7'],baseURL: test.info().project.use.baseURL });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const w = window as unknown as { __locks: string[] };
    w.__locks = [];
    const o = screen.orientation as ScreenOrientation & { lock: (v: string) => Promise<void> };
    o.lock = async (value: string) => { w.__locks.push(`lock:${value}`); };
    o.unlock = () => { w.__locks.push('unlock'); };
  });
  await openPlay(page,'space-sky');
  await page.getByRole('dialog',{ name: 'Play fullscreen?' }).getByRole('button',{ name: 'Play fullscreen' }).tap();
  await expect.poll(() => fsState(page)).toContain('play-shell');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __locks: string[] }).__locks)).toEqual(['lock:landscape']);
  // the back gesture leaves fullscreen: the lock is released
  await exitFromOutside(page);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __locks: string[] }).__locks)).toEqual(['lock:landscape','unlock']);
  // a game that turns any way up is never locked
  await page.goto('/play/light-crossing'); await expect(page.locator('.game-loading')).toBeHidden({ timeout: 60_000 });
  await page.getByRole('button',{ name: 'Enter fullscreen' }).tap();
  await expect.poll(() => fsState(page)).toContain('play-shell');
  expect(await page.evaluate(() => (window as unknown as { __locks: string[] }).__locks)).toEqual([]);
  await context.close();
});

test('TheaBonk in fullscreen: pointer lock, Esc and pause still work together, and gamepads keep working',async ({ page },info) => {
  test.skip(info.project.name !== 'desktop','mouse, pointer lock and gamepad: desktop Chromium');
  // It plays TheaBonk with pointer lock, like interactions.spec: on a real GPU before each release
  // (GitHub's headless Linux runners refuse to re-take pointer lock after fullscreen ends).
  test.skip(!!process.env.CI && !process.env.AIKG_FULL,'runs locally on a real GPU before each release');
  test.setTimeout(180_000);
  await instrument(page); const checks = guard(page);
  await page.addInitScript(() => {
    const pad = { id: 'QA Standard Pad',index: 0,connected: true,mapping: 'standard',axes: [0,0,0,0],buttons: Array.from({ length: 17 },() => ({ pressed: false,value: 0,touched: false })),timestamp: 0 };
    (window as unknown as { __qaPad: typeof pad }).__qaPad = pad;
    navigator.getGamepads = () => [pad as unknown as Gamepad];
  });
  const f = await startGame(page,'theabonk',false);
  const time = () => f.evaluate(() => (window as any).__theabonk.world?.time ?? 0);
  const paused = () => f.evaluate(() => !!(window as any).__theabonk.paused);
  await page.getByRole('button',{ name: 'Enter fullscreen' }).click();
  await expect.poll(() => fsState(page)).toContain('play-shell');
  // keys still reach the game after the site's button: P pauses (Esc is the browser's while fullscreen)
  await f.locator('canvas#game').press('p');
  await expect.poll(paused).toBe(true);
  // mouse lock from the game's own settings, then resume: the canvas takes the pointer
  await f.getByRole('button',{ name: 'Settings',exact: true }).click();
  const camera = f.locator('.setting').filter({ hasText: 'Camera control' });
  if (!(await camera.innerText()).includes('Mouse lock')) await camera.getByRole('button').click();
  await f.getByRole('button',{ name: 'Done',exact: true }).click();
  await f.getByRole('button',{ name: 'Resume',exact: true }).click();
  await expect.poll(() => f.evaluate(() => document.pointerLockElement?.id)).toBe('game');
  const before = await time();
  await expect.poll(time).toBeGreaterThan(before);
  // Esc in a real browser drops the pointer lock and leaves fullscreen together
  await f.evaluate(() => document.exitPointerLock());
  await exitFromOutside(page);
  await expect.poll(() => fsState(page)).toBeNull();
  await expect(page.locator('.play-bar')).toBeVisible();
  // the game is fine: Escape pauses (TheaBonk pauses on its own when the pointer is released)
  if (!(await paused())) await f.locator('canvas#game').press('Escape');
  await expect.poll(paused).toBe(true);
  await f.getByRole('button',{ name: 'Resume',exact: true }).click();
  await expect.poll(paused).toBe(false);
  await expect.poll(() => f.evaluate(() => document.pointerLockElement?.id)).toBe('game');
  await f.evaluate(() => document.exitPointerLock());
  // a real Escape keypress while fullscreen: the browser leaves fullscreen or the game pauses; either way nothing breaks
  await page.getByRole('button',{ name: 'Enter fullscreen' }).click();
  await expect.poll(() => fsState(page)).toContain('play-shell');
  await f.locator('canvas#game').press('Escape');
  await expect.poll(async () => (await fsState(page)) === null || await paused()).toBe(true);
  if (await fsState(page)) await exitFromOutside(page);
  await expect(page.locator('.play-bar')).toBeVisible();
  if (await paused()) { await f.getByRole('button',{ name: 'Resume',exact: true }).click(); await f.evaluate(() => document.exitPointerLock()); }
  // gamepads keep working, in and out of fullscreen
  await page.getByRole('button',{ name: 'Enter fullscreen' }).click();
  await expect.poll(() => fsState(page)).toContain('play-shell');
  await f.evaluate(() => { const w = window as any; w.__qaPad.axes[0] = 1; w.__qaPad.timestamp = performance.now(); });
  await expect.poll(() => f.evaluate(() => (window as any).__theabonk.input.usingGamepad)).toBe(true);
  await exitFromOutside(page);
  await expect.poll(() => fsState(page)).toBeNull();
  expect(checks.errors).toEqual([]); expect(checks.external).toEqual([]);
});

// Four games carry their own fullscreen button. Inside the site the game's iframe goes fullscreen
// (the iframe allows it); the site must follow along and come back cleanly, alone or on top of the
// site's own fullscreen.
type Frame = import('@playwright/test').Frame;
const ownButtons: { slug: string; title: string; open: (f: Frame) => Promise<void>; button: (f: Frame) => import('@playwright/test').Locator }[] = [
  { slug: 'space-sky',title: 'Space Sky',open: async () => {},button: f => f.getByTestId('btn-fullscreen') },
  { slug: 'vanex-defense',title: 'Vanex Defense',open: async () => {},button: f => f.getByRole('button',{ name: 'Full screen',exact: true }) },
  { slug: 'calex-cart',title: 'Calex Cart',open: async f => {
    // the main menu (where the button lives) comes after the title and a new racer
    await f.locator('.title-screen').click();
    await f.getByRole('button',{ name: 'New Game',exact: true }).first().click();
    await f.getByRole('textbox',{ name: 'Racer name' }).fill('FullscreenTest');
    await f.getByRole('button',{ name: "Let's go!" }).click();
  },button: f => f.locator('.ui-root [data-nav]').filter({ hasText: /fullscreen/i }).first() },
  { slug: 'light-crossing',title: 'Light Crossing',open: async f => { await f.getByRole('button',{ name: 'Settings',exact: true }).click(); },button: f => f.getByRole('button',{ name: /Full screen/ }) }
];
for (const game of ownButtons) test(`${game.slug}: its own fullscreen button works inside the site`,async ({ page },info) => {
  test.skip(!info.project.name.endsWith('desktop'),'mouse click on the game’s own button: desktop Chromium and Safari');
  const checks = guard(page);
  await openPlay(page,game.slug);
  const frame = (await (await page.locator('iframe').elementHandle())!.contentFrame())!;
  const parentFs = () => page.evaluate(() => { const d = document as Document & { webkitFullscreenElement?: Element | null }; const el = d.fullscreenElement ?? d.webkitFullscreenElement ?? null; return el ? el.tagName : null; });
  await game.open(frame);
  await expect(game.button(frame)).toBeVisible({ timeout: 30_000 });
  // alone: the game's iframe fills the screen, and its button brings it back
  await game.button(frame).click();
  await expect.poll(parentFs).toBe('IFRAME');
  await expect(page.locator('.play-shell')).not.toHaveClass(/is-full/);
  await game.button(frame).click();
  await expect.poll(parentFs).toBeNull();
  await expect(page.locator('.play-bar')).toBeVisible();
  // on top of the site's fullscreen: back to the site's fullscreen (with its corner button) after
  await page.getByRole('button',{ name: 'Enter fullscreen' }).click();
  await expect.poll(parentFs).toBe('DIV');
  await game.button(frame).click();
  await expect.poll(parentFs).toBe('IFRAME');
  await game.button(frame).click();
  const after = await (async () => { await page.waitForTimeout(800); return parentFs(); })();
  if (after === 'DIV') await expect(page.getByRole('button',{ name: 'Game menu' })).toBeVisible();
  else { expect(after).toBeNull(); await expect(page.locator('.play-bar')).toBeVisible(); }
  const note = `${game.title} (${info.project.name}): after the game's own exit on top of the site's fullscreen → ${after === 'DIV' ? 'back in the site’s fullscreen' : 'out of fullscreen'}`;
  test.info().annotations.push({ type: 'info',description: note }); console.log(note);
  if (after) { await exitFromOutside(page); await expect.poll(parentFs).toBeNull(); }
  expect(checks.errors).toEqual([]); expect(checks.external).toEqual([]);
});
