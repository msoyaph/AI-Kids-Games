// Preview capture route for the games site: `index.html?preview=<scene>` opens straight into a
// staged, UI-free scene so cover art and store previews can be captured the same way every time.
// Nothing is saved (slot -1). Scenes: cover (the default), spring, summer, autumn, winter, festival,
// home, shop, villager.
import type { App } from './app';
import type { devTools } from './dev';

export const PREVIEW_SCENES = ['cover', 'spring', 'summer', 'autumn', 'winter', 'festival', 'home', 'shop', 'villager'] as const;
export type PreviewScene = (typeof PREVIEW_SCENES)[number];

export function previewScene(search = typeof location !== 'undefined' ? location.search : ''): PreviewScene | null {
  try {
    const v = new URLSearchParams(search).get('preview');
    if (v === null) return null;
    return (PREVIEW_SCENES as readonly string[]).includes(v) ? (v as PreviewScene) : 'cover';
  } catch {
    return null;
  }
}

export function runPreview(app: App, dev: ReturnType<typeof devTools>, scene: PreviewScene): void {
  const g = dev.start(777, 'Wren', -1); // slot -1: never saved
  dev.town(['tansy', 'rusk', 'juno', 'kip', 'mochi', 'marlowe']);
  const plaza = g.world.gen.lots.plaza;
  const look = (x: number, z: number, hour: number, facing = 0) => {
    dev.goto(x, z, facing);
    dev.hour(hour);
    app.view.rig.snap(x, 0, z);
  };
  switch (scene) {
    case 'spring':
    case 'summer':
    case 'autumn':
    case 'winter':
      dev.season(scene, 3);
      look(plaza.x + plaza.w / 2, plaza.z + plaza.d + 2, 11);
      break;
    case 'festival':
      dev.season('autumn', 5);
      look(plaza.x + plaza.w / 2, plaza.z + plaza.d + 2.5, 17.5);
      break;
    case 'home':
      dev.give('furn_woven_rug');
      dev.give('furn_plank_table');
      dev.give('furn_wick_lantern');
      dev.inside('home');
      break;
    case 'shop':
      dev.hour(11);
      dev.inside('shop');
      break;
    case 'villager':
      dev.hour(12.5);
      dev.inside('villager:tansy');
      break;
    default:
      dev.season('spring', 3);
      look(plaza.x + plaza.w / 2, plaza.z + plaza.d + 2, 16.5);
  }
  g.mode = 'cutscene';
  app.ui.closeAll();
  // no HUD, buttons, tips or toasts in the picture
  document.documentElement.classList.add('preview-capture');
  (window as unknown as { __previewReady?: boolean }).__previewReady = true;
}
