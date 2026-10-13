// The browser checks, on the built file, in Chromium, the way the website runs a community game:
// a page on one origin embeds the game from another, in the site's exact sandbox, under the game
// origin's security policy. Everything else is blocked and recorded. One run covers:
//   contract (the test hook, and each capture scene draws and never saves), keyboard play,
//   20 seconds of play (no console errors, no requests, storage only under the prefix),
//   flash safety (screencast frames) and 48 px touch targets (on a phone-sized screen).
import { createServer,type Server } from 'node:http';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { chromium,type BrowserContext,type Frame as PageFrame,type Page } from 'playwright';
import sharp from 'sharp';
import { GAME_CSP } from './csp';
import { blockLuminance,maxFlashesPerSecond,type Frame } from './flash';
import { result,type CheckResult,type Problem,type Submission } from './types';

export const SANDBOX = 'allow-scripts allow-same-origin allow-pointer-lock';
export interface BrowserOptions { seconds?: number; /** Save screens and a video here (the owner's review). */ record?: string }
export interface BrowserRun { checks: CheckResult[]; screens: string[]; video?: string; storageKeys: string[] }

const listen = (server: Server) => new Promise<number>(done => server.listen(0,'127.0.0.1',() => done((server.address() as AddressInfo).port)));

export async function browserChecks(s: Submission,file: string,options: BrowserOptions = {}): Promise<BrowserRun> {
  const seconds = options.seconds ?? 20, m = s.manifest!;
  const html = readFileSync(file);
  // Two origins, like the site and the play origin.
  const game = createServer((req,res) => {
    if (!req.url?.startsWith('/game/index.html')) { res.writeHead(404).end(); return; }
    res.writeHead(200,{ 'Content-Type': 'text/html; charset=utf-8','Content-Security-Policy': `${GAME_CSP}; frame-ancestors http://127.0.0.1:${hostPort}`,'X-Content-Type-Options': 'nosniff','Referrer-Policy': 'no-referrer','Cache-Control': 'no-store' }).end(html);
  });
  const gamePort = await listen(game), gameOrigin = `http://127.0.0.1:${gamePort}`;
  const host = createServer((req,res) => {
    const url = new URL(req.url ?? '/','http://x');
    if (url.pathname !== '/host.html') { res.writeHead(404).end(); return; }
    const scene = url.searchParams.get('scene') ?? '';
    res.writeHead(200,{ 'Content-Type': 'text/html; charset=utf-8','Cache-Control': 'no-store' })
      .end(`<!doctype html><meta charset="utf-8"><title>host</title><style>html,body{margin:0;height:100%;background:#000}iframe{display:block;width:100%;height:100%;border:0}</style><iframe id="game" title="game" src="${gameOrigin}/game/index.html${scene}" sandbox="${SANDBOX}" allow="fullscreen; gamepad" referrerpolicy="no-referrer"></iframe>`);
  });
  let hostPort = 0; hostPort = await listen(host);
  const hostUrl = (scene = '') => `http://127.0.0.1:${hostPort}/host.html${scene ? `?scene=${encodeURIComponent(scene)}` : ''}`;
  const allowed = (url: string) => url.startsWith(`http://127.0.0.1:${hostPort}/host.html`) || url.startsWith(`${gameOrigin}/game/index.html`);

  const browser = await chromium.launch();
  const errors: string[] = [], requests: string[] = [], screens: string[] = [];
  let video: string | undefined;
  const instrument = async (context: BrowserContext) => {
    // Every frame (the game's included) logs its storage use.
    await context.addInitScript(() => {
      const log: [string,string,string][] = [];
      Object.defineProperty(window,'__aikgStorage',{ value: log });
      for (const method of ['setItem','getItem','removeItem','clear','key'] as const) {
        const original = Storage.prototype[method] as (...args: unknown[]) => unknown;
        (Storage.prototype as unknown as Record<string,unknown>)[method] = function (this: Storage,...args: unknown[]) {
          let area = 'local'; try { if (this === window.sessionStorage) area = 'session'; } catch { /* storage blocked */ }
          log.push([method,area,String(args[0] ?? '')]);
          return original.apply(this,args);
        };
      }
    });
    await context.route('**/*',route => allowed(route.request().url()) ? route.continue() : route.abort('blockedbyclient'));
    context.on('request',request => { const url = request.url(); if (!allowed(url) && !/^(data|blob):/.test(url)) requests.push(url); });
  };
  const watch = (page: Page) => {
    page.on('console',message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror',error => errors.push(`${error.name}: ${error.message}`));
  };
  const frameOf = async (page: Page): Promise<PageFrame> => {
    await page.waitForSelector('#game');
    const handle = await page.$('#game'); const frame = await handle!.contentFrame();
    await frame!.waitForLoadState('load');
    return frame!;
  };
  const shot = async (page: Page) => page.locator('#game').screenshot({ type: 'png' });
  const blank = async (png: Buffer) => { const stats = await sharp(png).stats(); return stats.channels.slice(0,3).every(channel => channel.stdev < 3); };
  const record = (name: string,png: Buffer) => { if (!options.record) return; mkdirSync(options.record,{ recursive: true }); const path = join(options.record,`${String(screens.length+1).padStart(2,'0')}-${name}.png`); writeFileSync(path,png); screens.push(path); };

  const contract: Problem[] = [], smoke: Problem[] = [], storage: Problem[] = [], flash: Problem[] = [], access: Problem[] = [];
  const notes = { flash: [] as string[],smoke: [] as string[],access: [] as string[] };
  let storageKeys: string[] = [];
  try {
    // ---- Capture scenes: each draws something and never saves (fresh storage each time). ----
    for (const scene of m.capture?.scenes ?? []) {
      const context = await browser.newContext({ viewport: { width: 960,height: 600 } }); await instrument(context);
      const page = await context.newPage(); watch(page);
      await page.goto(hostUrl(scene)); const frame = await frameOf(page); await page.waitForTimeout(1500);
      const png = await shot(page);
      if (await blank(png)) contract.push({ message: `The capture scene ${scene} shows a blank screen.`,fix: 'Make each scene listed in game.json capture.scenes draw that screen (see the starter\'s src/main.ts).' });
      record(`scene-${scene.replace(/^\?scene=/,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')}`,png);
      const log = await frame.evaluate(() => (window as unknown as { __aikgStorage: [string,string,string][] }).__aikgStorage.filter(entry => entry[0] === 'setItem' || entry[0] === 'removeItem' || entry[0] === 'clear')).catch(() => []);
      const writes = log.filter(([,, key]) => !key.endsWith('__probe'));
      if (writes.length) contract.push({ message: `The capture scene ${scene} changed saved data (${writes.map(entry => entry[2]).join(', ')}).`,fix: 'Capture scenes must never save: skip saving when the page has ?scene= (the starter shows how).' });
      await context.close();
    }

    // ---- The main run: keyboard first, then 20 seconds of play. ----
    const context = await browser.newContext({ viewport: { width: 1024,height: 700 },...(options.record ? { recordVideo: { dir: options.record,size: { width: 1024,height: 700 } } } : {}) });
    await instrument(context);
    const page = await context.newPage(); watch(page);
    const cdp = await context.newCDPSession(page);
    const raw: { t: number; data: string }[] = [];
    cdp.on('Page.screencastFrame',frame => { raw.push({ t: frame.metadata.timestamp ?? Date.now()/1000,data: frame.data }); void cdp.send('Page.screencastFrameAck',{ sessionId: frame.sessionId }).catch(() => {}); });
    await page.goto(hostUrl()); const frame = await frameOf(page); await page.waitForTimeout(1200);
    record('start',await shot(page));
    const hook = m.hook;
    const snapshot = async () => frame.evaluate(name => { const value = (window as unknown as Record<string,{ snapshot?: () => unknown } | undefined>)[name]; return value && typeof value.snapshot === 'function' ? JSON.stringify(value.snapshot()) : null; },hook).catch(() => null);
    const before = await snapshot();
    if (before === null) contract.push({ message: `window.${hook}.snapshot() isn't there.`,fix: `Keep the starter's test hook: window.${hook} with a snapshot() that returns the game's state (src/main.ts), and use the same name in game.json.` });

    // Keyboard: can someone start and play with keys alone?
    const keyShot = await shot(page);
    await page.locator('#game').focus();
    for (const key of ['Tab','Enter','Space','ArrowRight','ArrowRight','ArrowUp','KeyD','KeyW']) { await page.keyboard.press(key); await page.waitForTimeout(120); }
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(500); await page.keyboard.up('ArrowRight');
    const afterKeys = await snapshot(), keyShot2 = await shot(page);
    const moved = (before !== null && afterKeys !== before) || Buffer.compare(keyShot,keyShot2) !== 0;
    if (!moved) access.push({ message: 'Pressing keys (Tab, Enter, Space, arrows, WASD) changed nothing.',fix: 'Make the game playable with the keyboard: Enter or Space to start, arrows or WASD to move, as in the starter.' });
    else notes.access.push('keyboard: the game responds to keys');

    // 20 seconds of play: keys, mouse and taps, and any buttons on screen.
    await cdp.send('Page.startScreencast',{ format: 'jpeg',quality: 60,maxWidth: 320,maxHeight: 220,everyNthFrame: 1 });
    const box = (await page.locator('#game').boundingBox())!;
    const startButton = frame.locator('button:visible').filter({ hasText: /play|start|go|begin|again/i }).first();
    if (await startButton.count()) await startButton.click({ timeout: 2000 }).catch(() => {});
    let seed = 7; const random = () => (seed = (seed*16807) % 2147483647)/2147483647;
    const keys = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS','Space','Enter'];
    const end = Date.now()+seconds*1000; let last = await shot(page), lastSaved = Date.now();
    while (Date.now() < end) {
      const roll = random();
      if (roll < 0.45) { const key = keys[Math.floor(random()*keys.length)]!; await page.keyboard.down(key); await page.waitForTimeout(80+random()*220); await page.keyboard.up(key); }
      else if (roll < 0.85) { await page.mouse.click(box.x+box.width*(0.15+random()*0.7),box.y+box.height*(0.15+random()*0.7)); }
      else { const buttons = frame.locator('button:visible'); const count = await buttons.count().catch(() => 0); if (count) await buttons.nth(Math.floor(random()*count)).click({ timeout: 1000 }).catch(() => {}); }
      await page.waitForTimeout(120);
      if (options.record && Date.now()-lastSaved > 900) {
        const now = await shot(page); lastSaved = Date.now();
        const [a,b] = await Promise.all([last,now].map(png => sharp(png).resize(32,20,{ fit: 'fill' }).greyscale().raw().toBuffer()));
        let diff = 0; for (let i = 0; i < a!.length; i++) diff += Math.abs(a![i]!-b![i]!);
        if (diff/a!.length > 18 && screens.length < 16) { record('screen',now); last = now; }
      }
    }
    await cdp.send('Page.stopScreencast').catch(() => {});
    record('end',await shot(page));
    const after = await snapshot();
    if (before !== null && after === before) smoke.push({ message: 'The game state didn\'t change in 20 seconds of play.',fix: 'Check that the game starts with a click, a tap, Enter or Space, and that the hook\'s snapshot() reflects the game.',severity: 'warn' });

    // Storage: everything under the prefix, never a clear.
    const log = await frame.evaluate(() => (window as unknown as { __aikgStorage: [string,string,string][] }).__aikgStorage.slice()).catch(() => [] as [string,string,string][]);
    const prefix = m.storage?.prefix ?? '';
    for (const [method,area,key] of log) {
      if (method === 'clear') storage.push({ message: `The game called ${area}Storage.clear(), which would wipe every game's saves.`,fix: 'Remove it; remove only your own keys.' });
      else if (area === 'session') storage.push({ message: `The game used sessionStorage (${method} "${key}").`,fix: 'Use only localStorage under your prefix, through src/storage.ts.' });
      else if (method !== 'key' && !key.startsWith(prefix)) storage.push({ message: `The game used the storage key "${key}", which doesn't start with "${prefix}".`,fix: 'Keep every key under your prefix (src/storage.ts does this).' });
    }
    storageKeys = await frame.evaluate(() => Object.keys(localStorage)).catch(() => []);
    const declared = new Set([...(m.storage?.keys ?? []),m.storage?.probe ?? '']);
    for (const key of storageKeys) if (key.startsWith(prefix) && !declared.has(key)) storage.push({ message: `The game saved "${key}", which isn't listed in game.json storage.keys.`,fix: 'Add it to storage.keys so parents can see everything the game stores.',severity: 'warn' });
    if (await page.evaluate(() => document.fullscreenElement !== null).catch(() => false)) notes.smoke.push('the game went fullscreen');
    if (options.record) { await page.close(); const clip = page.video(); if (clip) { video = join(options.record,'recording.webm'); await clip.saveAs(video); await clip.delete(); } }
    await context.close();

    // Flash safety from the screencast.
    const frames: Frame[] = [];
    for (const { t,data } of raw) frames.push({ t,l: await blockLuminance(Buffer.from(data,'base64')) });
    const span = frames.length > 1 ? frames.at(-1)!.t-frames[0]!.t : 0, rate = span ? frames.length/span : 0;
    const worst = maxFlashesPerSecond(frames);
    if (worst.max > 3) flash.push({ message: `Part of the screen flashed ${worst.max} times in one second (about ${worst.at.toFixed(1)} s into play).`,fix: 'Slow flashing effects to at most 3 a second, or make them smaller or softer (less change in brightness).' });
    notes.flash.push(`${frames.length} frames over ${span.toFixed(1)} s (${rate.toFixed(0)} a second); worst ${worst.max} flash${worst.max === 1 ? '' : 'es'} in a second`);
    // A low sample rate (no GPU) can miss fast flicker: report it instead of passing it.
    if (frames.length && rate < 15 && worst.max <= 3) flash.push({ message: `Only ${rate.toFixed(0)} frames a second were sampled, too few to rule out fast flicker.`,fix: 'Nothing to do; the owner\'s review run on a real GPU checks it again.',severity: 'warn' });

    // 48 px touch targets, on a phone-sized screen.
    const phone = await browser.newContext({ viewport: { width: 390,height: 760 },hasTouch: true,isMobile: true,deviceScaleFactor: 2 }); await instrument(phone);
    const mobile = await phone.newPage(); watch(mobile);
    await mobile.goto(hostUrl()); const mframe = await frameOf(mobile); await mobile.waitForTimeout(1000);
    const small = async (): Promise<{ label: string; w: number; h: number }[]> => mframe.evaluate(() => [...document.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,[role="button"],[tabindex]:not([tabindex="-1"])')]
      .filter(el => { const r = el.getBoundingClientRect(), style = getComputedStyle(el); return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'; })
      .map(el => { const r = el.getBoundingClientRect(); return { label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0,40),w: Math.round(r.width),h: Math.round(r.height) }; })
      .filter(target => target.w < 48 || target.h < 48)).catch(() => []);
    const tiny = await small();
    const go = mframe.locator('button:visible').filter({ hasText: /play|start|go|begin/i }).first();
    if (await go.count()) { await go.tap({ timeout: 2000 }).catch(() => {}); await mobile.waitForTimeout(800); tiny.push(...await small()); }
    for (const target of new Map(tiny.map(t => [t.label,t])).values()) access.push({ message: `"${target.label}" is ${target.w}×${target.h} px on a phone; touch targets need at least 48×48.`,fix: 'Make the button at least 48 px wide and tall (padding helps).' });
    await phone.close();
  } finally {
    await browser.close(); game.close(); host.close();
  }

  for (const error of [...new Set(errors)]) smoke.push({ message: `Console error: ${error.slice(0,200)}`,fix: /Content Security Policy|Refused to/i.test(error) ? 'The game tried to load or send something; remove it (games make no requests).' : 'Fix the error (open the browser console while you play: npm run dev:community).' });
  for (const url of [...new Set(requests)]) smoke.push({ message: `The game tried to reach ${url.slice(0,120)}.`,fix: 'Remove it: community games make no network requests. Everything must be in your own code.' });
  if (!smoke.length) notes.smoke.push(`${seconds} s of play in the site's sandbox: no console errors, no requests`);
  return {
    checks: [
      result('contract','Contract (test hook and capture scenes)',contract,[`${(m.capture?.scenes ?? []).length} capture scenes`]),
      result('smoke','Browser play test',smoke,notes.smoke),
      result('storage-runtime','Storage (while playing)',storage,[storageKeys.length ? `saved: ${storageKeys.join(', ')}` : 'nothing saved']),
      result('flash','Flash safety',flash,notes.flash),
      result('accessibility','Accessibility (keyboard, 48 px targets)',access,notes.access)
    ],screens,video,storageKeys
  };
}
