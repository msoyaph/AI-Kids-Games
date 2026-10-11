import 'pixi.js/unsafe-eval';
import './ui/ui.css';
import { Game } from './app/Game';
import { AudioEngine } from './audio/audio';
import { sfx } from './audio/sfx';
import { settingsHooks } from './ui/settings';
import { uiHooks } from './ui/widgets';
import { S } from './app/services';
import { saveNow, tickSession } from './app/session';
import { bakeCore } from './gfx/textures';
import { Input } from './input/input';
import { TouchControls } from './input/touch';
import { installHooks } from './app/hooks';
import { BadgesScene } from './scenes/BadgesScene';
import { BoardScene } from './scenes/BoardScene';
import { CodexScene } from './scenes/CodexScene';
import { CompleteScene } from './scenes/CompleteScene';
import { CreditsScene } from './scenes/CreditsScene';
import { CutsceneScene, cutsceneWaiters, type CutsceneParams } from './scenes/CutsceneScene';
import { installDirectors } from './scenes/director';
import { ExploreScene, type ExploreParams } from './scenes/ExploreScene';
import { FlightScene, type FlightSceneParams } from './scenes/FlightScene';
import { HangarScene } from './scenes/HangarScene';
import { HubScene } from './scenes/HubScene';
import { LandingScene, type LandingParams } from './scenes/LandingScene';
import { LoungeScene } from './scenes/LoungeScene';
import { ShopScene } from './scenes/ShopScene';
import { SlotsScene } from './scenes/SlotsScene';
import { CreatorScene, type CreatorParams } from './scenes/CreatorScene';
import { hubHooks } from './scenes/hubHooks';
import { openSettings } from './ui/settings';
import { pauseHooks } from './ui/pause';
import { toast } from './ui/toast';
import { StarMapScene } from './scenes/StarMapScene';
import { TitleScene } from './scenes/TitleScene';
import { createSave } from './systems/save/schema';
import { loadSettings } from './systems/save/settings';
import { GameState } from './systems/state';
import { h } from './ui/dom';
import { anyModalOpen, closeTopModal } from './ui/modal';
import { presenterHooks, pumpMessages } from './ui/presenter';
import { initSpeech, setReadAloud } from './ui/speech';

function setLoad(pct: number, msg?: string): void {
  const fill = document.getElementById('boot-fill');
  if (fill) fill.style.width = `${Math.max(5, Math.min(100, pct))}%`;
  if (msg) {
    const m = document.getElementById('boot-msg');
    if (m) m.textContent = msg;
  }
}

function showFatal(err: unknown): void {
  console.error(err);
  document.getElementById('boot')?.remove();
  const box = h(
    'div',
    { class: 'fatal' },
    h('div', { style: 'font-size:60px' }, '🚀'),
    h('div', null, 'Oh no! Space Sky could not start on this browser.'),
    h('div', { style: 'opacity:.7;font-size:16px' }, 'Try a newer browser, or ask a grown-up to update this device.'),
    h('button', { onclick: () => location.reload() }, 'Try again'),
  );
  document.body.append(box);
}

function setupRotateHint(): void {
  const hint = h(
    'div',
    { id: 'rotate-hint' },
    h('div', { class: 'phone' }),
    h('p', null, 'Turn your screen sideways to play!'),
    h('button', { onclick: () => hint.classList.add('dismissed') }, 'Play anyway'),
  );
  document.body.append(hint);
}

/** Scenes that count as "playing" for the play-time clock. */
const PLAY_SCENES = new Set(['hub', 'map', 'flight', 'landing', 'explore', 'hangar', 'shop', 'board', 'lounge', 'codex', 'badges', 'cutscene', 'credits']);

function registerScenes(game: Game): void {
  game.register('title', () => new TitleScene());
  game.register('hub', () => new HubScene());
  game.register('board', (p) => new BoardScene(p));
  game.register('lounge', () => new LoungeScene());
  game.register('map', () => new StarMapScene());
  game.register('flight', (p) => new FlightScene(p as unknown as FlightSceneParams));
  game.register('landing', (p) => new LandingScene(p as unknown as LandingParams));
  game.register('explore', (p) => new ExploreScene(p as unknown as ExploreParams));
  game.register('hangar', () => new HangarScene());
  game.register('shop', () => new ShopScene());
  game.register('codex', () => new CodexScene());
  game.register('badges', (p) => new BadgesScene(p));
  game.register('cutscene', (p) => new CutsceneScene(p as unknown as CutsceneParams));
  game.register('credits', () => new CreditsScene());
  game.register('complete', () => new CompleteScene());
  presenterHooks.cutscene = (id) =>
    new Promise<void>((resolve) => {
      cutsceneWaiters.push(resolve);
      void game.go('cutscene', { id });
    });
  game.register('slots', () => new SlotsScene());
  game.register('creator', (p) => new CreatorScene(p as unknown as CreatorParams));
}

async function boot(): Promise<void> {
  setLoad(8, 'Waking up the crew...');
  const host = document.getElementById('game')!;
  const game = new Game(host);
  S.game = game;
  await game.init();
  S.settings = loadSettings();
  initSpeech();
  setReadAloud(S.settings.readAloud);
  const audio = new AudioEngine();
  S.audio = audio;
  audio.setVolumes(S.settings.music, S.settings.sfx);
  settingsHooks.volume = (m, v) => audio.setVolumes(m, v);
  uiHooks.sfx = (name) => sfx(name);
  game.onVisibility.push((visible) => audio.setHidden(!visible));
  game.onSceneChange.push(() => audio.playMusic(game.current?.music ?? null));
  S.input = new Input();
  S.touch = new TouchControls(S.input, () => S.game.metrics.scale);
  game.hudLayer.append(S.touch.el);
  // A placeholder state until a save slot is chosen.
  S.state = new GameState(createSave(-1));
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  game.uiRoot.classList.toggle('touch-on', coarse);
  S.input.listeners.push((src) => {
    if (src === 'touch') game.uiRoot.classList.add('touch-on');
    else if (src === 'keyboard' || src === 'gamepad') game.uiRoot.classList.remove('touch-on');
  });
  game.preStep.push(() => {
    S.input.poll();
    const st = S.input.state;
    if (st.pausePressed || st.backPressed) {
      if (anyModalOpen()) closeTopModal();
      else game.current?.back();
    }
  });
  game.postStep.push((dt) => {
    pumpMessages();
    tickSession(dt, PLAY_SCENES.has(game.sceneName) && !game.isHidden);
  });
  game.onVisibility.push((visible) => {
    if (!visible) saveNow();
  });
  game.onSceneChange.push(() => saveNow());
  window.addEventListener('pagehide', () => saveNow());

  setLoad(18, 'Painting planets...');
  const msgs = ['Painting planets...', 'Polishing star-coins...', 'Building rockets...', 'Counting stars...'];
  await bakeCore(game.metrics.bakeResolution, (p) => setLoad(18 + p * 72, msgs[Math.min(msgs.length - 1, Math.floor(p * msgs.length))]));
  setLoad(95, 'Ready for launch!');
  registerScenes(game);
  installDirectors();
  installHooks();
  hubHooks.settings = () => openSettings();
  pauseHooks.settings = () => openSettings();
  pauseHooks.goHome = () => {
    S.state.data.location = 'earth';
    S.state.bump('tows');
    S.state.emit({ type: 'tow' });
    toast('Beep boop! Tuggy towed you home to the Academy!', 'tow', 3000);
    void game.go('hub');
  };
  setupRotateHint();
  if (new URLSearchParams(location.search).has('debug')) (window as unknown as { __spacesky: unknown }).__spacesky = S;
  game.start();
  await game.go('title', {}, false);
  setLoad(100);
  const bootEl = document.getElementById('boot');
  if (bootEl) {
    bootEl.classList.add('done');
    setTimeout(() => bootEl.remove(), 600);
  }
}

boot().catch(showFatal);
