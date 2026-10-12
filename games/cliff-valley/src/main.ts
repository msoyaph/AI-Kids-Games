import { Game } from './game/game';
import { CAPTURE_SCENES, installHook, type CaptureScene } from './game/hook';
import { installPlaytest } from './game/playtest';

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
    if (params.get('playtest') === '1') installPlaytest(game);
    game.showTitle();
    if (params.get('bench') === '1') setTimeout(() => game.testPerformance(), 600);
    // preview capture: ?scene=farmHarvest (&hud=0 hides the HUD, &zoom=-2…2 frames wider/closer) — never touches saves
    const scene = params.get('scene') as CaptureScene | null;
    if (scene && CAPTURE_SCENES.includes(scene)) {
      setTimeout(() => {
        (window as unknown as { __cliffvalley: { scene(n: string): boolean } }).__cliffvalley.scene(scene);
        if (params.get('hud') === '0') game.hud.show(false);
        const zoom = Number(params.get('zoom'));
        if (zoom >= -2 && zoom <= 2 && zoom !== 0) {
          game.host.zoomBias = zoom;
          game.host.resize();
          game.snapCamera();
        }
      }, 300);
    }
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
