import './ui/styles.css';
import { Game } from './game/Game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const overlay = document.getElementById('overlay') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui') as HTMLElement;
const game = new Game(canvas, overlay, uiRoot);
game.start();
// Debug / test handle (used by the Playwright smoke test).
(window as unknown as { __theabonk: Game }).__theabonk = game;
