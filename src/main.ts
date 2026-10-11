import './ui/styles.css';
import { Game } from './game/Game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const game = new Game(canvas);
game.start();
(window as unknown as { __theabonk: Game }).__theabonk = game;

// Phase-1 bootstrap: click to start a run as Thea.
const start = document.getElementById('start');
start?.addEventListener('click', () => {
  start.remove();
  game.startRun('thea');
});
