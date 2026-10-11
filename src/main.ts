import './ui/styles.css';
import { App } from './app';
import { questRT } from './sim/quests';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLDivElement;
const app = new App(canvas, ui);

// Opening narration for a brand-new island.
app.onNewGame = (g) => {
  questRT(g).inbox.unshift({
    speaker: '',
    lines: [
      '[neutral]After many quiet days at sea, your little boat bumps against a weathered dock.',
      '[happy]Driftlight Isle! Somewhere past the plaza, a lantern is glowing in the window of Lantern Hall.',
    ],
  });
};

(window as unknown as { __lc: unknown }).__lc = app;
