import './ui/styles.css';
import { App } from './app/App';
import { createNav } from './app/flow';
import { startStress } from './app/stress';
import { BadgesScreen } from './app/screens/BadgesScreen';
import { EncyclopediaScreen } from './app/screens/EncyclopediaScreen';
import { SettingsScreen } from './app/screens/SettingsScreen';
import { runPerfTest } from './app/perfTest';
import { SaveStore } from './app/save';
import { mapById } from './data/maps';
import { resolveLocale, setLocale, t } from './i18n';
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

const TEST_SCREENS = ['worlds', 'encyclopedia', 'badges', 'settings', 'research', 'daily', 'workshop'] as const;

async function boot(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const save = new SaveStore();
  // Language: saved choice, or the browser's language. Test hook: ?lang=en|fil|pseudo
  const lang = params.get('lang');
  setLocale(lang === 'en' || lang === 'fil' || lang === 'pseudo' ? lang : resolveLocale(save.data.settings.language));
  // Test hook: ?quality=low|medium|high|auto (used by the perf benchmark).
  const q = params.get('quality');
  if (q === 'low' || q === 'medium' || q === 'high' || q === 'auto') save.data.settings.quality = q;
  const tier = detectDeviceTier();
  const setting = save.data.settings.quality;
  const startTier = setting === 'auto' ? tier : setting;
  const stage = new Stage();
  progress(0.05, t('boot.power'));
  await stage.init(document.getElementById('game')!, renderResolution(QUALITY_PROFILES[startTier]));
  progress(0.12, t('boot.forge'));
  const bakeScale = detectBakeScale(startTier);
  const atlas = await bakeAtlas(bakeScale, stage.maxTextureSize, (p) => progress(0.12 + p * 0.83));
  installFonts(stage.resolution);
  progress(1, t('boot.ready'));
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
  // ?playtest=1 starts recording on this device, ?playtest=0 stops (data stays until deleted)
  const pt = params.get('playtest');
  if (pt === '1' || pt === '0') app.playtest.setEnabled(pt === '1');
  const nav = createNav(app, {
    onRunEnd: (game, won, mode) => app.achievements.checkEnd(game, won, mode),
    encyclopedia: (a, n) => new EncyclopediaScreen(a, n),
    badges: (a, n) => new BadgesScreen(a, n),
    settings: (a, n, back) => new SettingsScreen(a, back, () => n.settings(), () => runPerfTest(a, n)),
  });
  if (import.meta.env.DEV) Object.assign((window as unknown as Record<string, Record<string, unknown>>).__vanex!, { nav, mapById });
  if (import.meta.env.DEV && params.has('editor')) {
    const { MapEditor } = await import('./dev/MapEditor');
    app.show(new MapEditor(app, nav));
    return;
  }
  if (params.has('flashaudit')) {
    const { installFlashProbe } = await import('./app/flashProbe');
    installFlashProbe(app, params.has('storm'));
  }
  const stress = Number(params.get('stress') ?? 0);
  if (stress > 0) {
    startStress(app, nav, Math.min(1000, stress), { mapId: params.get('map') ?? undefined });
    return;
  }
  const play = params.get('map');
  const map = play ? mapById(play) : undefined;
  // Test hooks (layout/overflow checks): ?screen=<menu screen>, ?brief=<map id>
  const screen = params.get('screen') as (typeof TEST_SCREENS)[number] | null;
  const brief = mapById(params.get('brief') ?? '');
  if (map) nav.play(map, (params.get('diff') as Difficulty | null) ?? 'normal', map.id === 'tutorial' ? 'tutorial' : params.has('endless') ? 'endless' : 'campaign');
  else if (screen && TEST_SCREENS.includes(screen)) nav[screen]();
  else if (brief) {
    nav.worlds();
    nav.briefing(brief, 'campaign');
  } else nav.title();
}

boot().catch((err: unknown) => {
  console.error(err);
  progress(1, t('boot.error'));
});
