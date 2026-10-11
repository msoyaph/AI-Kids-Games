import './ui/styles.css';
import { Game } from './sim/game';
import { newGameState } from './sim/state';
import { GameView } from './render/view';
import { Input } from './input/input';
import { formatTime } from './sim/clock';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLDivElement;
const input = new Input(canvas);
const view = new GameView(canvas, () => ({ shape: 'stone', color: 0xcccccc }));
const game = new Game(newGameState(12345, 'Islander'));
view.attach(game);

const hud = document.createElement('div');
hud.className = 'hud-clock';
ui.appendChild(hud);

let last = performance.now();
function loop(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const f = input.poll(dt);
  game.update(dt, { move: { x: f.moveX, z: f.moveZ, run: f.run } });
  view.frame(dt);
  hud.textContent = `Day ${game.state.clock.day} · ${formatTime(game.state.clock.minute)}`;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
(window as unknown as { __lc: unknown }).__lc = { game, view };
