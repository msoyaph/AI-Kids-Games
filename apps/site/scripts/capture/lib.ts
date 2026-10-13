import { createServer, type Server } from 'node:http';
import { execFileSync, spawnSync } from 'node:child_process';
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type { Device, Scenario, Take, TakeContext } from './types';

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

/**
 * Audio tap (capture-time only): every live AudioContext node that connects to the speakers
 * also feeds a MediaStream, so the recorder can include the game's own sound effects.
 */
const audioTapSource = `(() => {
  const taps = new WeakMap(); window.__reelTaps = [];
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (target, ...rest) {
    const result = connect.call(this, target, ...rest);
    try {
      if (target instanceof AudioDestinationNode && !(this.context instanceof OfflineAudioContext)) {
        let tap = taps.get(this.context);
        if (!tap) { tap = this.context.createMediaStreamDestination(); taps.set(this.context, tap); window.__reelTaps.push(tap.stream); window.__reelOnTap?.(tap.stream); }
        connect.call(this, tap);
      }
    } catch {}
    return result;
  };
})();`;

/** In-page recorder: a canvas's captureStream (HUD-free) or the whole tab (DOM menus included). */
const recorderSource = `(() => {
  if (window.__cap) return;
  let rec = null, started = 0, parts = [], blob = null, times = [], watch = null, mix = null;
  window.__cap = {
    async start(source, fps, bitrate, width, height, audio) {
      const say = m => window.__capDebug && console.log('[cap] ' + m);
      // The sound mixer first, while the user gesture is fresh: a suspended context gives a silent
      // track that MediaRecorder waits on forever, so record without sound if it won't run.
      let out = null;
      if (audio) {
        mix = new AudioContext({ sampleRate: 48000 }); out = mix.createMediaStreamDestination();
        await Promise.race([mix.resume(), new Promise(done => setTimeout(done, 500))]);
        if (mix.state !== 'running') { console.warn('[cap] sound mixer is ' + mix.state + '; recording without sound'); await mix.close(); mix = null; out = null; }
      }
      say('start ' + source);
      let stream;
      if (source === 'tab') stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: fps, width, height }, audio: false, preferCurrentTab: true });
      else { const canvas = document.querySelector(source); if (!canvas) throw new Error('No canvas ' + source); stream = canvas.captureStream(120); } // every frame the game draws (up to 120 on a 120 Hz screen): a 60 cap here samples unevenly, the encode resamples evenly
      let types = ['video/mp4;codecs=avc1.640033','video/webm;codecs=vp9'];
      if (out) {
        // Mix every tapped game AudioContext (now or later) into one recorded track.
        const attach = tapped => mix.createMediaStreamSource(tapped).connect(out);
        (window.__reelTaps || []).forEach(attach); window.__reelOnTap = attach;
        stream = new MediaStream([...stream.getVideoTracks(), ...out.stream.getAudioTracks()]);
        types = ['video/mp4;codecs=avc1.640033,mp4a.40.2','video/mp4;codecs=avc1.640033,opus','video/webm;codecs=vp9,opus'];
      }
      say('ready');
      const mimeType = types.find(type => MediaRecorder.isTypeSupported(type));
      parts = []; rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate, audioBitsPerSecond: 192000 });
      rec.ondataavailable = event => { if (event.data.size) parts.push(event.data); };
      await new Promise(done => { rec.onstart = done; rec.start(1000); });
      started = performance.now(); say('recording ' + mimeType);
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
      rec.stream.getTracks().forEach(track => track.stop()); watch?.stop(); window.__reelOnTap = null; await mix?.close(); mix = null;
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

export interface TakeResult { id: string; file: string; cut: number; duration: number; fps: number; stills: { file: string; alt: string; time: number }[]; played?: number }

export interface Session { context: BrowserContext; page: Page; device?: Device; audio?: boolean }

/** Open a game page for a chain of takes (the head take's query and storage apply). */
export async function openSession(browser: Browser, origin: string, scenario: Scenario, head: Take, log: (m: string) => void): Promise<Session> {
  const device = head.device;
  const context = await browser.newContext(device
    ? { viewport: { width: device.width,height: device.height },deviceScaleFactor: device.scale,hasTouch: !!device.touch,isMobile: !!device.touch,...(device.userAgent ? { userAgent: device.userAgent } : {}) }
    : { viewport: { width: WIDTH,height: HEIGHT },deviceScaleFactor: 1 });
  if (head.audio) await context.addInitScript({ content: audioTapSource });
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
  if (process.env.CAPTURE_DEBUG) await page.addInitScript(() => { (window as any).__capDebug = true; });
  page.on('console',m => { if (m.text().startsWith('[cap]') && (process.env.CAPTURE_DEBUG || m.type() === 'warning')) log(`  ${m.text()}`); });
  if (head.storage) await page.addInitScript(entries => { for (const [key,value] of Object.entries(entries)) localStorage.setItem(key,value); },head.storage);
  await page.goto(`${origin}/games/${scenario.slug}/index.html${head.query || ''}`);
  return { context,page,device,audio: head.audio };
}

/** Run one take on an open session: setup (not recorded), then act while recording. */
export async function recordTake({ page,device,audio }: Session, scenario: Scenario, take: Take, log: (m: string) => void, dir = captureDir(scenario.slug)): Promise<TakeResult> {
  mkdirSync(dir,{ recursive: true });
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
  if (process.env.CAPTURE_DEBUG) log('  recorder: inject');
  await page.evaluate(recorderSource);
  // A covered or inactive window can stop presenting canvas frames: bring it forward and
  // confirm frames are flowing before recording.
  if (process.env.CAPTURE_DEBUG) log('  recorder: front');
  await page.bringToFront();
  const flowing = await page.evaluate(async source => {
    if (source === 'tab') return 60;
    const track = (document.querySelector(source) as HTMLCanvasElement).captureStream(60).getVideoTracks()[0];
    const reader = new (window as any).MediaStreamTrackProcessor({ track }).readable.getReader(); let frames = 0; const end = performance.now() + 500;
    while (performance.now() < end) { const next = await Promise.race([reader.read(),new Promise(done => setTimeout(() => done(null),600))]) as any; if (!next || next.done) break; next.value.close(); frames++; }
    reader.cancel(); track.stop(); return frames*2;
  },take.source || scenario.canvas);
  if (flowing < 30) throw new Error(`canvas frames are not flowing (${flowing} fps); is the capture window covered?`);
  const size = device ? [device.width*device.scale,device.height*device.scale] : [WIDTH,HEIGHT];
  // Tab capture (getDisplayMedia) needs a user gesture: start it through CDP with one.
  if (process.env.CAPTURE_DEBUG) log('  recorder: start');
  const cdp = await page.context().newCDPSession(page);
  const started = await cdp.send('Runtime.evaluate',{ expression: `window.__cap.start(${JSON.stringify(take.source || scenario.canvas)},${take.fps ?? FPS},${BITRATE},${size[0]},${size[1]},${!!audio})`,userGesture: true,awaitPromise: true,returnByValue: true });
  await cdp.detach();
  if (started.exceptionDetails) throw new Error(`recorder did not start: ${started.exceptionDetails.exception?.description ?? started.exceptionDetails.text}`);
  const mime = started.result.value as string;
  log(`${scenario.slug}/${take.id}: recording ${take.source === 'tab' ? 'tab' : scenario.canvas} (${mime})`);
  await take.act(ctx);
  const duration = await elapsed();
  const bytes: number = await page.evaluate(() => (window as any).__cap.stop());
  const file = join(dir,`${take.id}.${mime.includes('mp4') ? 'mp4' : 'webm'}`);
  const out = createWriteStream(file);
  for (let start = 0; start < bytes; start += 4_000_000) {
    const b64: string = await page.evaluate(([a,b]) => (window as any).__cap.slice(a,b),[start,Math.min(bytes,start+4_000_000)] as const);
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
  const result: TakeResult = { id: take.id,file,cut: cut < 0 ? 0.5 : toVideo(cut),duration: videoSeconds,fps,stills,played: duration };
  if (cut >= 0 && toVideo(cut) > videoSeconds - 2) throw new Error(`the moment at ${cut.toFixed(1)}s was not recorded (frames stalled)`);
  writeFileSync(join(dir,`${take.id}.json`),JSON.stringify(result,null,2));
  log(`${scenario.slug}/${take.id}: saved ${(statSync(file).size/1e6).toFixed(1)} MB, ${duration.toFixed(1)}s at ${fps.toFixed(0)} fps`);
  const target = take.fps ?? FPS;
  if (fps < target * 0.66) throw new Error(`only ${fps.toFixed(0)} fps recorded`);
  if (fps < target * 0.83) log(`  note: ${fps.toFixed(0)} fps recorded.`);
  return result;
}
