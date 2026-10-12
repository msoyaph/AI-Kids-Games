import { createServer, type Server } from 'node:http';
import { execFileSync, spawnSync } from 'node:child_process';
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type { Scenario, Take, TakeContext } from './types';

export const root = resolve(import.meta.dirname, '../..');
export const captureDir = (slug: string) => join(root, 'captures', slug);
export const WIDTH = 1920, HEIGHT = 1080, FPS = 60, BITRATE = 16_000_000;

const types: Record<string,string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };

/** Serve public/ so the games load exactly as they ship (unchanged single-file builds). */
export function serve(): Promise<{ server: Server; origin: string }> {
  const base = join(root,'public');
  const server = createServer((req,res) => {
    const path = normalize(decodeURIComponent(new URL(req.url || '/','http://x').pathname)).replace(/^(\.\.[/\\])+/,'');
    let file = join(base,path);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file,'index.html');
    if (!file.startsWith(base) || !existsSync(file)) { res.writeHead(404).end(); return; }
    res.writeHead(200,{ 'Content-Type': types[extname(file)] || 'application/octet-stream','Cache-Control': 'no-store' });
    createReadStream(file).pipe(res);
  });
  return new Promise(done => server.listen(0,'127.0.0.1',() => { const address = server.address(); done({ server,origin: `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}` }); }));
}

/**
 * Full Chromium with the real GPU through Metal, as the game projects test with.
 * Headed by default: headless Chromium delivers no canvas-capture frames and only
 * about 18 fps of tab capture, while a headed window captures a steady 60 fps.
 */
export function launch(headless = false): Promise<Browser> {
  return chromium.launch({
    channel: 'chromium',
    headless,
    args: ['--use-angle=metal','--enable-gpu','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required','--auto-accept-this-tab-capture','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--window-position=24,24']
  });
}

/** In-page recorder: a canvas's captureStream (HUD-free) or the whole tab (DOM menus included). */
const recorderSource = `(() => {
  if (window.__cap) return;
  let rec = null, started = 0, parts = [], blob = null, times = [], watch = null;
  window.__cap = {
    async start(source, fps, bitrate) {
      let stream;
      if (source === 'tab') stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: fps, width: ${WIDTH}, height: ${HEIGHT} }, audio: false, preferCurrentTab: true });
      else { const canvas = document.querySelector(source); if (!canvas) throw new Error('No canvas ' + source); stream = canvas.captureStream(fps); }
      const mimeType = ['video/mp4;codecs=avc1.640033','video/webm;codecs=vp9'].find(type => MediaRecorder.isTypeSupported(type));
      parts = []; rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
      rec.ondataavailable = event => { if (event.data.size) parts.push(event.data); };
      await new Promise(done => { rec.onstart = done; rec.start(1000); });
      started = performance.now();
      // Log when each frame really arrives, so moments map to video time even if frames stall.
      times = []; watch = stream.getVideoTracks()[0].clone();
      const reader = new MediaStreamTrackProcessor({ track: watch }).readable.getReader();
      (async () => { for (;;) { const next = await reader.read(); if (next.done) break; times.push((performance.now() - started) / 1000); next.value.close(); } })();
      return mimeType;
    },
    elapsed() { return (performance.now() - started) / 1000; },
    frameTimes() { return times; },
    async stop() {
      await new Promise(done => { rec.onstop = done; rec.stop(); });
      rec.stream.getTracks().forEach(track => track.stop()); watch?.stop();
      blob = new Blob(parts, { type: rec.mimeType }); parts = [];
      return blob.size;
    },
    async slice(start, end) {
      const bytes = new Uint8Array(await blob.slice(start, end).arrayBuffer()); let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(binary);
    }
  };
})()`;

const ffmpeg = (args: string[]) => execFileSync(ffmpegPath as unknown as string,['-hide_banner','-loglevel','error','-y',...args],{ stdio: ['ignore','inherit','inherit'] });

export interface TakeResult { id: string; file: string; cut: number; duration: number; fps: number; stills: { file: string; alt: string; time: number }[] }

export interface Session { context: BrowserContext; page: Page }

/** Open a game page for a chain of takes (the head take's query and storage apply). */
export async function openSession(browser: Browser, origin: string, scenario: Scenario, head: Take, log: (m: string) => void): Promise<Session> {
  const context = await browser.newContext({ viewport: { width: WIDTH,height: HEIGHT },deviceScaleFactor: 1 });
  // tsx compiles named arrow functions with an __name() helper; make it exist in the page.
  await context.addInitScript({ content: 'globalThis.__name = globalThis.__name || ((f) => f);' });
  // A headed capture window can lose focus to other apps; several games auto-pause on blur.
  // Keep the page looking focused and visible (capture-time only; builds are untouched).
  await context.addInitScript({ content: `
    Object.defineProperty(document, 'hidden', { get: () => false });
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
    document.hasFocus = () => true;
    for (const type of ['blur', 'focusout']) window.addEventListener(type, event => { if (event.target === window || event.target === document) event.stopImmediatePropagation(); }, true);
    document.addEventListener('visibilitychange', event => event.stopImmediatePropagation(), true);
  ` });
  const page = await context.newPage();
  page.on('pageerror',error => log(`  page error: ${error.message}`));
  if (head.storage) await page.addInitScript(entries => { for (const [key,value] of Object.entries(entries)) localStorage.setItem(key,value); },head.storage);
  await page.goto(`${origin}/games/${scenario.slug}/index.html${head.query || ''}`);
  return { context,page };
}

/** Run one take on an open session: setup (not recorded), then act while recording. */
export async function recordTake({ page }: Session, scenario: Scenario, take: Take, log: (m: string) => void): Promise<TakeResult> {
  const dir = captureDir(scenario.slug); mkdirSync(dir,{ recursive: true });
  const marks: { alt: string; time: number }[] = []; let cut = -1;
  const elapsed = () => page.evaluate(() => (window as any).__cap?.elapsed() ?? 0);
  const ctx: TakeContext = {
    page, slug: scenario.slug,
    wait: ms => page.waitForTimeout(ms),
    async hold(keys,ms) { for (const key of keys) await page.keyboard.down(key); await page.waitForTimeout(ms); for (const key of keys) await page.keyboard.up(key); },
    async cut(offset = 0) { cut = Math.max(0,await elapsed()+offset); log(`  cut at ${cut.toFixed(2)}s`); },
    async still(alt) { marks.push({ alt,time: await elapsed() }); log(`  still: ${alt}`); },
    run: ((fn: any,arg?: any) => page.evaluate(fn,arg)) as TakeContext['run'],
    log
  };
  log(`${scenario.slug}/${take.id}: setup`);
  await take.setup(ctx);
  await page.evaluate(recorderSource);
  // A covered or inactive window can stop presenting canvas frames: bring it forward and
  // confirm frames are flowing before recording.
  await page.bringToFront();
  const flowing = await page.evaluate(async source => {
    if (source === 'tab') return 60;
    const track = (document.querySelector(source) as HTMLCanvasElement).captureStream(60).getVideoTracks()[0];
    const reader = new (window as any).MediaStreamTrackProcessor({ track }).readable.getReader(); let frames = 0; const end = performance.now() + 500;
    while (performance.now() < end) { const next = await Promise.race([reader.read(),new Promise(done => setTimeout(() => done(null),600))]) as any; if (!next || next.done) break; next.value.close(); frames++; }
    reader.cancel(); track.stop(); return frames*2;
  },take.source || scenario.canvas);
  if (flowing < 30) throw new Error(`canvas frames are not flowing (${flowing} fps); is the capture window covered?`);
  const mime = await page.evaluate(([source,fps,bitrate]) => (window as any).__cap.start(source,fps,bitrate),[take.source || scenario.canvas,FPS,BITRATE] as const);
  log(`${scenario.slug}/${take.id}: recording ${take.source === 'tab' ? 'tab' : scenario.canvas} (${mime})`);
  await take.act(ctx);
  const duration = await elapsed();
  const size: number = await page.evaluate(() => (window as any).__cap.stop());
  const file = join(dir,`${take.id}.${mime.includes('mp4') ? 'mp4' : 'webm'}`);
  const out = createWriteStream(file);
  for (let start = 0; start < size; start += 4_000_000) {
    const b64: string = await page.evaluate(([a,b]) => (window as any).__cap.slice(a,b),[start,Math.min(size,start+4_000_000)] as const);
    await new Promise<void>((done,fail) => out.write(Buffer.from(b64,'base64'),error => error ? fail(error) : done()));
  }
  await new Promise<void>(done => out.end(() => done()));
  const frameTimes: number[] = await page.evaluate(() => (window as any).__cap.frameTimes());
  // Presentation times of the recorded frames, in order.
  const pts = [...spawnSync(ffmpegPath as unknown as string,['-hide_banner','-i',file,'-vf','showinfo','-f','null','-']).stderr.toString().matchAll(/pts_time:([\d.]+)/g)].map(match => Number(match[1]));
  const videoSeconds = pts.at(-1) ?? duration;
  // Frames can stall (e.g. a covered window); map a page moment to the frame that arrived then.
  const toVideo = (t: number) => { let i = frameTimes.findIndex(time => time >= t); if (i < 0) i = frameTimes.length-1; return pts[Math.min(Math.max(i,0),pts.length-1)] ?? t; };
  const stalled = Math.abs(videoSeconds-duration) > 0.3;
  if (stalled) log(`  frames stalled: ${videoSeconds.toFixed(1)}s of video for ${duration.toFixed(1)}s of play; moments mapped by frame.`);
  const fps = pts.length/Math.max(videoSeconds,0.1);
  const stills = marks.map((mark,index) => { const still = join(dir,`${take.id}-${index+1}.png`); ffmpeg(['-ss',toVideo(mark.time).toFixed(3),'-i',file,'-frames:v','1',still]); return { file: still,alt: mark.alt,time: toVideo(mark.time) }; });
  const result: TakeResult = { id: take.id,file,cut: cut < 0 ? 0.5 : toVideo(cut),duration: videoSeconds,fps,stills };
  if (cut >= 0 && toVideo(cut) > videoSeconds - 2) throw new Error(`the moment at ${cut.toFixed(1)}s was not recorded (frames stalled)`);
  writeFileSync(join(dir,`${take.id}.json`),JSON.stringify(result,null,2));
  log(`${scenario.slug}/${take.id}: saved ${(statSync(file).size/1e6).toFixed(1)} MB, ${duration.toFixed(1)}s at ${fps.toFixed(0)} fps`);
  if (fps < 40) throw new Error(`only ${fps.toFixed(0)} fps recorded`);
  if (fps < 50) log(`  note: ${fps.toFixed(0)} fps recorded.`);
  return result;
}
