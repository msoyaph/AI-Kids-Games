import 'pixi.js/unsafe-eval';
import './ui/ui.css';
import { Game } from './app/Game';
import { S } from './app/services';
import { saveNow, startSession, tickSession } from './app/session';
import { bakeCore } from './gfx/textures';
import { Input } from './input/input';
import { TouchControls } from './input/touch';
import { BoardScene } from './scenes/BoardScene';
import { installDirectors } from './scenes/director';
import { ExploreScene, type ExploreParams } from './scenes/ExploreScene';
import { FlightScene, type FlightSceneParams } from './scenes/FlightScene';
import { HangarScene } from './scenes/HangarScene';
import { HubScene } from './scenes/HubScene';
import { LandingScene, type LandingParams } from './scenes/LandingScene';
import { LoungeScene } from './scenes/LoungeScene';
import { ShopScene } from './scenes/ShopScene';
import { StarMapScene } from './scenes/StarMapScene';
import { TitleScene } from './scenes/TitleScene';
import { loadSlot } from './systems/save/saveManager';
import { createSave } from './systems/save/schema';
import { loadSettings } from './systems/save/settings';
import { GameState } from './systems/state';
import { h } from './ui/dom';
import { anyModalOpen, closeTopModal } from './ui/modal';
import { pumpMessages } from './ui/presenter';
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
const PLAY_SCENES = new Set(['hub', 'map', 'flight', 'landing', 'explore', 'hangar', 'shop', 'board', 'lounge', 'codex', 'badges', 'cutscene']);

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
  // Temporary until the slot screen exists: continue the last save or start a new one.
  game.register('slots', () => {
    const last = S.settings.lastSlot >= 0 ? loadSlot(S.settings.lastSlot) : null;
    startSession(last ?? createSave(0));
    return new HubScene();
  });
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
