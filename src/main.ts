import 'pixi.js/unsafe-eval';
import './ui/ui.css';
import { Game } from './app/Game';
import { S } from './app/services';
import { bakeCore } from './gfx/textures';
import { Input } from './input/input';
import { TouchControls } from './input/touch';
import { FlightScene, type FlightSceneParams } from './scenes/FlightScene';
import { TitleScene } from './scenes/TitleScene';
import { GameState } from './systems/state';
import { h } from './ui/dom';
import { anyModalOpen, closeTopModal } from './ui/modal';

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

async function boot(): Promise<void> {
  setLoad(8, 'Waking up the crew...');
  const host = document.getElementById('game')!;
  const game = new Game(host);
  S.game = game;
  await game.init();
  S.input = new Input();
  S.touch = new TouchControls(S.input, () => S.game.metrics.scale);
  game.hudLayer.append(S.touch.el);
  S.state = new GameState();
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

  setLoad(18, 'Painting planets...');
  const msgs = ['Painting planets...', 'Polishing star-coins...', 'Building rockets...', 'Counting stars...'];
  await bakeCore(game.metrics.bakeResolution, (p) => setLoad(18 + p * 72, msgs[Math.min(msgs.length - 1, Math.floor(p * msgs.length))]));
  setLoad(95, 'Ready for launch!');
  game.register('title', () => new TitleScene());
  game.register('flight', (p) => new FlightScene(p as unknown as FlightSceneParams));
  game.register('slots', () => new FlightScene({ from: 'earth', to: 'mars' }));
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
