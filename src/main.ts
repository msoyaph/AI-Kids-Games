import './ui/styles.css';
import { Game } from './game/Game';
import { h } from './ui/dom';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const overlay = document.getElementById('overlay') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui') as HTMLElement;
const game = new Game(canvas, overlay, uiRoot);
game.start();
(window as unknown as { __theabonk: Game }).__theabonk = game;

// Temporary bootstrap until the menus land (phase 6).
const start = h('button', { class: 'btn primary', style: 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)', id: 'start' }, 'Play');
start.addEventListener('click', () => {
  start.remove();
  game.startRun('thea');
});
uiRoot.append(start);
