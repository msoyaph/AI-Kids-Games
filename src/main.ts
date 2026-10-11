import './ui/styles.css';
import { App } from './app/App';
import { createNav } from './app/flow';
import { SaveStore } from './app/save';
import { mapById } from './data/maps';
import type { Difficulty } from './data/difficulty';
import { bakeAtlas } from './render/atlas/bake';
import { installFonts } from './render/FloatingText';
import { detectBakeScale, detectDeviceTier, QUALITY_PROFILES, renderResolution } from './render/quality';
import { Stage } from './render/Stage';

const fill = document.getElementById('boot-fill') as HTMLElement | null;
const tip = document.getElementById('boot-tip') as HTMLElement | null;

function progress(p: number, text?: string): void {
  if (fill) fill.style.width = `${Math.round(4 + p * 96)}%`;
  if (text && tip) tip.textContent = text;
}

async function boot(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const save = new SaveStore();
  const tier = detectDeviceTier();
  const setting = save.data.settings.quality;
  const startTier = setting === 'auto' ? tier : setting;
  const stage = new Stage();
  progress(0.05, 'Waking up the crystals…');
  await stage.init(document.getElementById('game')!, renderResolution(QUALITY_PROFILES[startTier]));
  progress(0.12, 'Painting towers and creatures…');
  const bakeScale = detectBakeScale(startTier);
  const atlas = await bakeAtlas(bakeScale, stage.maxTextureSize, (p) => progress(0.12 + p * 0.83));
  installFonts(stage.resolution);
  progress(1, 'Ready!');
  const app = new App(stage, atlas, save, document.getElementById('ui')!, tier, bakeScale);
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__vanex = { stage, atlas, app };

  const boot = document.getElementById('boot');
  if (boot) {
    boot.style.opacity = '0';
    setTimeout(() => boot.remove(), 400);
  }

  if (import.meta.env.DEV && params.has('gallery')) {
    const { showGallery } = await import('./dev/Gallery');
    showGallery(stage, atlas);
    return;
  }
  const nav = createNav(app, {});
  const play = params.get('map');
  const map = play ? mapById(play) : undefined;
  if (map) nav.play(map, (params.get('diff') as Difficulty | null) ?? 'normal', map.id === 'tutorial' ? 'tutorial' : params.has('endless') ? 'endless' : 'campaign');
  else nav.title();
}

boot().catch((err: unknown) => {
  console.error(err);
  progress(1, 'Oh no! Something went wrong. Please reload the page.');
});
