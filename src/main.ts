import './ui/styles.css';
import { App } from './app';
import { give } from './sim/inventory';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLDivElement;
const app = new App(canvas, ui);

// Temporary until the story missions hand out tools (phase 6).
app.onNewGame = (g) => {
  for (const id of ['net_flimsy', 'rod_flimsy', 'axe_flimsy', 'shovel_flimsy', 'can_flimsy']) give(g, id, 1, 'start');
};

(window as unknown as { __lc: unknown }).__lc = app;
