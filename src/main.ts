import './ui/styles.css';
import { Stage } from './render/Stage';
import { bakeAtlas } from './render/atlas/bake';
import { detectBakeScale, detectDeviceTier, QUALITY_PROFILES, renderResolution } from './render/quality';

const fill = document.getElementById('boot-fill') as HTMLElement | null;
const tip = document.getElementById('boot-tip') as HTMLElement | null;

function progress(p: number, text?: string): void {
  if (fill) fill.style.width = `${Math.round(4 + p * 96)}%`;
  if (text && tip) tip.textContent = text;
}

async function boot(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const tier = detectDeviceTier();
  const stage = new Stage();
  progress(0.05, 'Waking up the crystals…');
  await stage.init(document.getElementById('game')!, renderResolution(QUALITY_PROFILES[tier]));
  progress(0.15, 'Painting towers and creatures…');
  const atlas = await bakeAtlas(detectBakeScale(tier), stage.maxTextureSize, (p) => progress(0.15 + p * 0.8));
  progress(1, 'Ready!');
  document.getElementById('boot')?.remove();
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__vanex = { stage, atlas };
  if (import.meta.env.DEV && params.has('gallery')) {
    const { showGallery } = await import('./dev/Gallery');
    showGallery(stage, atlas);
    return;
  }
  const { showGallery } = await import('./dev/Gallery');
  showGallery(stage, atlas);
}

boot().catch((err: unknown) => {
  console.error(err);
  progress(1, 'Oh no! Something went wrong. Please reload the page.');
});
