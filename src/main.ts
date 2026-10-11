import 'pixi.js/unsafe-eval';
import './ui/ui.css';
import { Game } from './app/Game';
import { S } from './app/services';
import { bakeCore } from './gfx/textures';
import { TitleScene } from './scenes/TitleScene';
import { h } from './ui/dom';

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
  setLoad(18, 'Painting planets...');
  const msgs = ['Painting planets...', 'Polishing star-coins...', 'Building rockets...', 'Counting stars...'];
  await bakeCore(game.metrics.bakeResolution, (p) => setLoad(18 + p * 72, msgs[Math.min(msgs.length - 1, Math.floor(p * msgs.length))]));
  setLoad(95, 'Ready for launch!');
  game.register('title', () => new TitleScene());
  setupRotateHint();
  game.start();
  await game.go('title', {}, false);
  setLoad(100);
  const boot = document.getElementById('boot');
  if (boot) {
    boot.classList.add('done');
    setTimeout(() => boot.remove(), 600);
  }
}

boot().catch(showFatal);
