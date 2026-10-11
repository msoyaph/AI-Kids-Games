import { Game } from './game/game';

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
    game.startNew();
    if (import.meta.env.DEV) (window as unknown as { __cvdev: Game }).__cvdev = game;
  })
  .catch((err) => {
    console.error(err);
    const boot = document.getElementById('boot');
    if (boot) boot.textContent = 'Sorry! Cliff Valley could not start on this device.';
  });
