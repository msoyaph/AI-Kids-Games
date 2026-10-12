import './ui/styles.css';
import { App } from './game/app';
import { registerScreens } from './ui/screens/index';
import { NullAudio } from './audio/types';
import type { GameAudio } from './audio/types';
import { pickOpponents } from './game/modes/roster';

function nextFrame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

async function createAudio(): Promise<GameAudio> {
  try {
    const mod = await import('./audio/engine');
    return new mod.AudioEngine();
  } catch {
    return new NullAudio();
  }
}

async function boot(): Promise<void> {
  const bootUi = window.__boot;
  const canvas = document.getElementById('gl') as HTMLCanvasElement;
  const uiRoot = document.getElementById('ui') as HTMLDivElement;
  bootUi?.set(0.25, 'Tuning engines');
  await nextFrame();
  const audio = await createAudio();
  let app: App;
  try {
    app = new App(canvas, uiRoot, audio);
  } catch (err) {
    console.warn('Startup failed', err);
    bootUi?.fail();
    return;
  }
  bootUi?.set(0.6, 'Painting karts');
  await nextFrame();
  registerScreens(app);
  // rotate-to-landscape hint for phones held upright
  const rot = document.createElement('div');
  rot.className = 'rotate-hint';
  rot.innerHTML = '<div class="phone"></div><div>Turn your device sideways to race!</div>';
  uiRoot.appendChild(rot);

  const params = new URLSearchParams(location.search);
  // ?playtest=1 turns on anonymous on-device playtest recording (?playtest=0 turns it off).
  if (params.has('playtest')) {
    app.saves.settings.playtest = params.get('playtest') !== '0';
    app.saveSettings();
  }
  // ?testmode=1 (CI browsers, or the CALEX_TESTMODE Playwright fixture): Low quality + reduced effects.
  if (params.has('testmode') || (window as unknown as { __CALEX_TESTMODE?: boolean }).__CALEX_TESTMODE) app.enterTestMode();
  (window as unknown as { __calex: unknown }).__calex = { app };
  bootUi?.set(0.9, 'Rolling out');
  await nextFrame();
  app.start();
  // Dev shortcut: ?track=<id>[&autodrive][&mirror] or ?arena=<id> jumps straight into a race.
  const quick = params.get('track') ?? params.get('arena');
  if (import.meta.env.DEV && params.has('editor')) {
    const { openEditor } = await import('./dev/trackEditor');
    openEditor(app);
  } else if (import.meta.env.DEV && quick) {
    if (!app.saves.data) app.saves.create(3, 'Dev');
    const battle = params.has('arena');
    app.flow.racers[0] = app.save.racer;
    const src = app.inputSources(1);
    app.startSession(
      {
        mode: battle ? 'battle' : 'versus',
        trackId: battle ? undefined : quick,
        arenaId: battle ? quick : undefined,
        speedClass: (params.get('class') as 'rookie' | 'pro' | 'champion' | null) ?? 'pro',
        mirror: params.has('mirror'),
        items: !params.has('noitems'),
        itemSet: 'all',
        laps: 3,
        players: [{ racerId: app.save.racer, kart: app.save.kart, source: src[0] }],
        ai: pickOpponents([app.save.racer], Number(params.get('ai') ?? 7), 3),
        seed: 1,
        intro: !params.has('nointro'),
      },
      () => app.quitToMenu(),
    );
    const s = app.session;
    if (params.has('autodrive') && s?.ai) {
      const k = s.world.karts[0];
      k.player = -1;
      s.ai.takeOver(k);
      k.player = 0;
    }
  } else if (params.has('bench')) {
    // ?bench=1[&seconds=60][&quality=low|medium|high|auto] — performance test straight from the URL
    const { startBenchmark } = await import('./ui/screens/benchmark');
    const q = params.get('quality');
    const seconds = Math.max(5, Math.min(300, Number(params.get('seconds')) || 60));
    const c = params.get('controls');
    startBenchmark(app, () => app.screens.title(), seconds, q === 'low' || q === 'medium' || q === 'high' || q === 'auto' ? q : undefined, c === 'none' || c === 'fake' || c === 'blur' ? c : undefined);
  } else {
    app.screens.title();
  }
  bootUi?.done();
}

void boot();
