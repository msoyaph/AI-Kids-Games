import { Game } from './game/game';
import { installHook } from './game/hook';

const params = new URLSearchParams(location.search);
const game = new Game({
  bench: params.get('bench') === '1',
  playtest: params.get('playtest') === '1',
  lowq: params.get('lowq') === '1',
  seed: params.has('seed') ? Number(params.get('seed')) : undefined,
});

game
  .init(document.getElementById('game')!)
  .then(() => {
    document.getElementById('boot')?.remove();
    installHook(game);
    game.showTitle();
    if (params.get('bench') === '1') setTimeout(() => game.testPerformance(), 600);
    if (import.meta.env.DEV) {
      (window as unknown as { __cvdev: Game }).__cvdev = game;
      void Promise.all([import('./sim/mine'), import('./sim/actions'), import('./sim/npcs'), import('./sim/animals'), import('./sim/story')]).then(([mine, actions, npcs, animals, story]) => {
        (window as unknown as { __cvmods: unknown }).__cvmods = { mine, actions, npcs, animals, story };
      });
    }
  })
  .catch((err) => {
    console.error(err);
    const boot = document.getElementById('boot');
    if (boot) boot.textContent = 'Sorry! Cliff Valley could not start on this device.';
  });
