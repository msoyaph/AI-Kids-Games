// The player: the exact verified build of one game, in a frame with the website's own sandbox.
// 1. One tap (Start, or "Try it here" on the card) asks for fullscreen when the game needs it (heavy
//    games, and every game on touch screens, where inline frames don't get vertical swipes), and starts
//    the download, so re-rendered chat history never downloads a game on its own.
// 2. The build comes from the website (the widget's CSP allows exactly that origin) or, if the host
//    blocks that, from this server through the host (resources/read). Either way its SHA-256 must match
//    the verified import, or it doesn't run.
// 3. It runs from srcdoc (same origin as the widget, so it never needs a frame-src exception), with
//    sandbox="allow-scripts allow-same-origin allow-pointer-lock", as on the website.
// The badge and notes live in a rail outside the game, so they never cover its HUD or controls.
import type { GameOutput } from '../../src/schemas';
import mark from '../../../site/public/brand/mark-96.png';
import { h } from './dom';
import type { Host } from './host';
import { gameState } from './signals';
import { storageState } from './storage';
import { BRAND,link } from './views';

type Build = NonNullable<GameOutput['game']['build']>;
const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2,'0')).join('');

/** Streams the build from the website, reporting progress. Reads at most one byte more than the verified size, so a changed file fails verification. */
export async function download(build: Build,progress: (share: number) => void) {
  const response = await fetch(build.url,{ mode: 'cors',credentials: 'omit',referrerPolicy: 'no-referrer' });
  if (!response.ok || !response.body) throw new Error(`The website answered ${response.status}.`);
  const reader = response.body.getReader(), bytes = new Uint8Array(build.bytes+1);
  let got = 0;
  for (;;) {
    const { done,value } = await reader.read();
    if (done) break;
    const take = Math.min(value.length,bytes.length-got);
    bytes.set(value.subarray(0,take),got); got += take; progress(Math.min(1,got/build.bytes));
    if (got === bytes.length) { await reader.cancel(); break; }
  }
  return bytes.subarray(0,got);
}
export const verified = async (bytes: Uint8Array,build: Build) => bytes.length === build.bytes && hex(await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>)) === build.sha256;

export function player(host: Host,data: GameOutput,{ autostart }: { autostart: boolean }) {
  const { game,site } = data, build = game.build!;
  const chatgpt = host.state.kind === 'chatgpt';
  const title = h('h1',{ id: 'player-title',class: 'rail-title' },game.title);
  const toggle = h('button',{ class: 'button ghost',type: 'button',onclick: () => void host.requestDisplayMode(host.state.displayMode === 'fullscreen' ? 'inline' : 'fullscreen') });
  const rail = h('div',{ class: 'rail' },
    chatgpt ? null : h('span',{ class: 'badge' },h('img',{ src: mark,alt: '',width: 20,height: 20 }),BRAND),
    title,h('span',{ class: 'spacer' }),toggle);
  const note = h('p',{ class: 'note',role: 'status',hidden: true });
  const stage = h('div',{ class: 'stage',style: `--accent:${game.accentColor}` });
  const root = h('section',{ class: 'player','aria-labelledby': 'player-title','data-embed': game.embed },rail,note,stage);

  // Notes: saving first (dismissible), "keep your progress" while paused or after a round. One link at a time.
  const storage = storageState(host.state.kind);
  let dismissed = storage === 'kept',paused = false;
  const showNote = () => {
    if (paused) note.replaceChildren('Keep your progress: ',link(host,site,game.url,`play on ${site.label}`));
    else if (!dismissed) note.replaceChildren(storage === 'missing' ? 'This assistant can\'t save game progress. ' : 'Your progress may not be saved here. ',
      link(host,site,game.url,`Play on ${site.label}`),' to keep it.',
      h('button',{ class: 'dismiss',type: 'button','aria-label': 'Hide this note',onclick: () => { dismissed = true; showNote(); } },'×'));
    note.hidden = !paused && dismissed;
  };
  const layout = () => {
    const full = host.state.displayMode === 'fullscreen';
    toggle.textContent = full ? 'Exit full screen' : 'Full screen';
    toggle.hidden = !host.canFullscreen;
    // Inline: the game's shape, within the height the host gives us.
    if (full) { stage.style.height = ''; return; }
    const ratio = game.embed === 'inline' && game.devices.includes('Phone') ? 4/3 : 16/9;
    const room = (host.state.maxHeight ?? 640)-rail.offsetHeight-(note.hidden ? 0 : note.offsetHeight);
    stage.style.height = `${Math.max(240,Math.min(root.clientWidth/ratio || 360,room))}px`;
  };
  host.onChange(layout); addEventListener('resize',layout);

  const fallback = (text: string) => {
    stage.replaceChildren(h('div',{ class: 'fallback' },h('p',{},text),link(host,site,game.url,`Play on ${site.label}`,'button primary')));
    layout();
  };
  let timer: ReturnType<typeof setInterval> | undefined, frame: HTMLIFrameElement | undefined;
  // A round's end can be brief (a battle result), so its note stays up for ten seconds.
  let endedAt = -Infinity;
  const watch = () => {
    timer = setInterval(() => {
      const state = frame ? gameState(game.slug,frame) : 'playing';
      if (state === 'ended') endedAt = Date.now();
      const now = state === 'paused' || Date.now()-endedAt < 10_000;
      if (now !== paused) { paused = now; showNote(); layout(); }
    },500);
  };
  host.onTeardown(() => { clearInterval(timer); frame?.remove(); });

  const mount = (html: string) => {
    frame = h('iframe',{ title: `${game.title}, the game`,sandbox: 'allow-scripts allow-same-origin allow-pointer-lock',allow: 'fullscreen; gamepad',referrerpolicy: 'no-referrer' });
    stage.replaceChildren(frame);
    frame.srcdoc = html;
    frame.addEventListener('load',() => {
      // If the host's CSP refused the srcdoc document, write the same bytes into the blank frame instead.
      let ok = false;
      try { ok = frame!.contentWindow?.location.href === 'about:srcdoc'; } catch { /* blocked */ }
      if (!ok && frame!.dataset.written !== '1') {
        const blank = h('iframe',{ title: `${game.title}, the game`,sandbox: 'allow-scripts allow-same-origin allow-pointer-lock',allow: 'fullscreen; gamepad',referrerpolicy: 'no-referrer','data-written': '1' });
        stage.replaceChildren(blank); frame = blank;
        const doc = blank.contentDocument!; doc.open(); doc.write(html); doc.close();
      }
      frame!.focus();
    },{ once: true });
    stage.addEventListener('pointerdown',() => frame?.focus());
    watch();
  };

  let started = false;
  const start = async () => {
    if (started) return; started = true;
    const wantFull = game.embed === 'fullscreen' || host.state.touch;
    if (wantFull && host.state.displayMode !== 'fullscreen') {
      const mode = host.canFullscreen ? await host.requestDisplayMode('fullscreen') : host.state.displayMode;
      if (mode !== 'fullscreen' && game.embed === 'fullscreen') return fallback(`${game.title} needs the full screen, which isn't available here.`);
    }
    const bar = h('progress',{ max: 1,value: 0,'aria-label': `Loading ${game.title}` });
    stage.replaceChildren(h('div',{ class: 'loading-game' },h('p',{},`Loading ${game.title}…`),bar)); layout();
    let bytes: Uint8Array | undefined;
    try { bytes = await download(build,share => { bar.value = share; }); }
    catch {
      if (host.canReadResources) { try { bytes = await host.readResource(build.uri); } catch { /* below */ } }
    }
    if (!bytes) return fallback(`${game.title} couldn't load here.`);
    if (!(await verified(bytes,build))) return fallback(`This copy of ${game.title} didn't match the verified game, so it won't run here.`);
    mount(new TextDecoder().decode(bytes));
  };

  stage.append(h('div',{ class: 'ready' },
    h('img',{ class: 'ready-cover',src: game.cover,alt: '',onerror: (event: Event) => (event.target as HTMLElement).remove() }),
    h('button',{ class: 'button primary start',type: 'button',onclick: () => void start() },`Start ${game.title}`),
    game.embed === 'fullscreen' || host.state.touch ? h('p',{ class: 'small' },'Opens full screen') : null));
  showNote();
  requestAnimationFrame(layout);
  if (autostart) void start();
  return root;
}
