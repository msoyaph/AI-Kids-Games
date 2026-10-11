import type { AbilityId } from '../data/tuning';
import type { App } from './App';
import { GameScreen } from './GameScreen';

/**
 * `?flashaudit=1` — flash-safety audit probe (tests/e2e/a11y.spec.ts).
 * After every rendered frame the game canvas is shrunk to 32×18 and the mean
 * relative luminance (WCAG formula) of 4×3 screen blocks is recorded; each
 * block is about the WCAG "small area" limit (341×256 px at 1024×768).
 * `&storm=1` also drops a meteor every 0.15 s (far more big bursts than real
 * play) to prove the flash limiter holds. Test-only; never on in normal play.
 */
export function installFlashProbe(app: App, storm: boolean): void {
  const W = 32;
  const H = 18;
  const BX = 4;
  const BY = 3;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const lin = (v: number): number => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const frames: { t: number; l: number[] }[] = [];
  let nextStorm = 0;
  app.afterRender = (canvas) => {
    ctx.drawImage(canvas, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data;
    const sums = new Array<number>(BX * BY).fill(0);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const L = 0.2126 * lin(d[i]!) + 0.7152 * lin(d[i + 1]!) + 0.0722 * lin(d[i + 2]!);
        sums[Math.floor((y * BY) / H) * BX + Math.floor((x * BX) / W)]! += L;
      }
    }
    const per = (W / BX) * (H / BY);
    const now = performance.now() / 1000;
    frames.push({ t: now, l: sums.map((s) => s / per) });
    if (frames.length > 4000) frames.shift();
    const screen = app.current;
    if (storm && screen instanceof GameScreen && now >= nextStorm) {
      nextStorm = now + 0.15;
      const g = screen.game;
      if (!g.abilities.includes('meteor')) (g.abilities as AbilityId[]).push('meteor');
      g.abilityCooldown.meteor = 0;
      g.castAbility('meteor', 3 + ((now * 7) % (g.grid.cols - 6)), 3 + ((now * 3) % (g.grid.rows - 6)));
    }
  };
  (window as unknown as Record<string, unknown>).__vanexFlash = { frames: () => frames, clear: () => (frames.length = 0) };
}
