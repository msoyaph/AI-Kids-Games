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

// Marketplace preview: make the existing touch input reachable on small screens.
const help = document.createElement('div');
help.style.cssText = 'position:fixed;top:16px;left:16px;z-index:100;color:#303c39;background:#fffdf4e8;border-radius:16px;padding:12px 16px;font:600 14px system-ui;max-width:230px;pointer-events:none';
help.textContent = 'Island preview · Explore with WASD or arrow keys. Hold Shift to run.';
ui.appendChild(help);
if (matchMedia('(pointer: coarse)').matches) {
  help.textContent = 'Island preview · Hold an arrow to explore.';
  const pad = document.createElement('div');
  pad.style.cssText = 'position:fixed;bottom:24px;left:24px;display:grid;grid-template-columns:repeat(3,56px);gap:6px;z-index:100;pointer-events:auto';
  for (const [label,x,z,col,row] of [['↑',0,-1,2,1],['←',-1,0,1,2],['↓',0,1,2,2],['→',1,0,3,2]] as const) {
    const button = document.createElement('button');
    button.textContent = label; button.setAttribute('aria-label', 'Move ' + label);
    button.style.cssText = `grid-column:${col};grid-row:${row};width:56px;height:56px;border:2px solid #38483c;border-radius:16px;background:#fffdf4ed;color:#283b30;font:700 26px system-ui;touch-action:none`;
    button.addEventListener('pointerdown', e => { button.setPointerCapture(e.pointerId); input.touch.x = x; input.touch.z = z; });
    for (const event of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(event, () => { input.touch.x = 0; input.touch.z = 0; });
    pad.appendChild(button);
  }
  ui.appendChild(pad);
}
