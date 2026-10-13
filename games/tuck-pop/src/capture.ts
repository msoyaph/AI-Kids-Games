/**
 * The capture route, for the website's previews and screenshots: `?scene=…` sets up a moment and
 * the game plays itself (the strong bot, with real drags), never touching saves.
 *   ?scene=play      a Classic game from the start
 *   ?scene=combo     a crowded board where a big multi-line clear and a streak come quickly
 *   ?scene=clear     a board one move from a full board clear
 *   ?scene=adventure a Candy level with gems and stones (&level=N for level N, 1–60)
 *   ?scene=map       the Adventure map with some stars (shown, never saved)
 *   &seed=N          the game's seed (default 7);  &speed=K  moves faster (K > 1) or slower;  &hud=1 shows the HUD
 */
import { strongChoice } from './sim/bot';
import { newGame, type Game } from './sim/game';
import { piece } from './sim/pieces';

const params = new URLSearchParams(location.search);
export const captureScene = params.get('scene');
export const captureSeed = Number(params.get('seed')) || 7;
export const captureSpeed = Math.min(4, Math.max(0.25, Number(params.get('speed')) || 1));

export function sceneGame(name: string, seed = captureSeed): Game {
  switch (name) {
    case 'combo': {
      const g = newGame({ mode: 'classic', difficulty: 'easy', seed, layout: [
        '11.22.33', '44.55.66', '........', '1122.334', '5566.112', '.......3', '2233.445', '66.11.22',
      ] });
      // a tray that sets up a two-line clear, then more
      g.tray = [{ piece: piece('i2v'), color: 3 }, { piece: piece('i3h'), color: 5 }, { piece: piece('dot'), color: 1 }];
      return g;
    }
    case 'clear': {
      const g = newGame({ mode: 'classic', difficulty: 'easy', seed, layout: [
        '........', '........', '........', '........', '........', '........', '1122334.', '5566112.',
      ] });
      g.tray = [{ piece: piece('i2v'), color: 4 }, { piece: piece('o2'), color: 2 }, { piece: piece('i3h'), color: 6 }];
      return g;
    }
    default: return newGame({ mode: 'classic', difficulty: 'easy', seed });
  }
}

/** The bot's next move in capture mode. */
export const autoMove = (g: Game) => strongChoice(g);
