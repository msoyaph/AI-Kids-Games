/**
 * Agentmon: boot. Creates the renderer and the app, picks the first scene (or a capture route),
 * and installs the read-only test hook.
 *
 * Capture routes (?scene=…&seed=N) show a good-looking moment and never save anything:
 *   sheet (all 52 Agentmon; &shimmer=1, &pose=happy, &small=1)
 * More routes arrive with their scenes (battle, befriend, evolution, town, dungeon, guide).
 */
import 'pixi.js/unsafe-eval'; // no eval(): the build's Content Security Policy forbids it
import './style.css';
import { GAME } from './config';
import { App } from './game/app';
import { SheetScene } from './game/scenes/sheet';
import { TitleScene } from './game/scenes/title';
import { createRenderer } from './render/renderer';
import type { PoseName } from './render/sprites';

const params = new URLSearchParams(location.search);
const sceneParam = params.get('scene');
const capture = sceneParam !== null;
const lowQuality = params.has('low') || (globalThis as { E2E_LOW?: boolean }).E2E_LOW === true;

let app: App | null = null;
let bootError = '';

// The read-only test hook: tests and the website's preview capture read the game through it.
// It exists from the very start, so a failed start is reported instead of hiding.
Object.defineProperty(window, GAME.hook, {
  value: Object.freeze({
    title: GAME.title,
    version: 1,
    snapshot: () => structuredClone({
      scene: app?.scene?.name ?? (bootError ? 'error' : 'boot'),
      error: bootError,
      renderer: app?.host.kind ?? '',
      frames: app?.frames ?? 0,
      frameMs: app ? Math.round(app.frameMs * 10) / 10 : 0,
      capture,
      ...(app?.scene?.snapshot?.() ?? {}),
    }),
  }),
});

async function boot() {
  const root = document.getElementById('app')!;
  const ui = document.getElementById('ui')!;
  const host = await createRenderer(root, lowQuality);
  app = new App(host, ui, capture);
  if (sceneParam === 'sheet') app.go(new SheetScene({ shimmer: params.get('shimmer') === '1', pose: (params.get('pose') as PoseName) ?? 'idle', small: params.get('small') === '1' }));
  else app.go(new TitleScene());
  app.start();
}

boot().catch(error => {
  bootError = String(error?.message ?? error);
  console.error(error);
  const ui = document.getElementById('ui');
  if (ui) ui.innerHTML = '<div class="screen"><p class="panel">Sorry, Agentmon could not start in this browser.</p></div>';
});
