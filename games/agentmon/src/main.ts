/**
 * Agentmon: boot. Creates the renderer and the app, picks the first scene (or a capture route),
 * and installs the read-only test hook.
 *
 * Capture routes (?scene=…&seed=N) show a good-looking moment and never save anything:
 *   sheet (all 52 Agentmon; &shimmer=1, &pose=happy, &small=1)
 *   battle (a super-strong bump), befriend (the Spark Ring; &mode=mood for Mood Match), evolution
 * More routes arrive with their scenes (town, dungeon, guide).
 */
import 'pixi.js/unsafe-eval'; // no eval(): the build's Content Security Policy forbids it
import './style.css';
import { GAME } from './config';
import { App } from './game/app';
import { CAPTURE_KINDS, CaptureScene, type CaptureKind } from './game/capture';
import { SheetScene } from './game/scenes/sheet';
import { startAdventure, TitleScene } from './game/scenes/title';
import { Game } from './game/game';
import { applyTestSetup } from './game/devsetup';
import { readKey } from './game/store';
import { createRenderer } from './render/renderer';
import type { PoseName } from './render/sprites';

const params = new URLSearchParams(location.search);
const sceneParam = params.get('scene');
const capture = sceneParam !== null;
const lowQuality = params.has('low') || (globalThis as { E2E_LOW?: boolean }).E2E_LOW === true;

let app: App | null = null;
let game: Game | null = null;
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
      audio: game ? { on: game.audio.ready, song: game.music.playing } : null,
      spark: game?.live.spark ?? null,
      battle: game?.live.battle ?? null,
      ...(app?.scene?.snapshot?.() ?? {}),
    }),
  }),
});

async function boot() {
  const root = document.getElementById('app')!;
  const ui = document.getElementById('ui')!;
  const host = await createRenderer(root, lowQuality);
  app = new App(host, ui, capture);
  game = new Game(app);
  const seed = Number(params.get('seed') ?? 7) >>> 0;
  if (sceneParam && (CAPTURE_KINDS as readonly string[]).includes(sceneParam)) app.go(new CaptureScene(game, sceneParam as CaptureKind, seed, params.get('mode') ?? ''));
  else if (sceneParam === 'sheet') app.go(new SheetScene({ shimmer: params.get('shimmer') === '1', pose: (params.get('pose') as PoseName) ?? 'idle', small: params.get('small') === '1' }));
  else if (params.has('quickstart')) {
    // Tests and quick tries: a new adventure in slot 3 with a default look, straight into Gran's house.
    // It saves only into an empty slot 3, so a player's real adventure there is never overwritten.
    const noSave = readKey('slot3') !== null;
    startAdventure(game, 3, 0, { skin: 1, hair: 0, hairColor: 0, outfit: 0 }, (params.get('difficulty') as 'easy' | 'normal' | 'hard') ?? 'normal', noSave, st => applyTestSetup(st, params));
  } else app.go(new TitleScene(game));
  app.start();
}

boot().catch(error => {
  bootError = String(error?.message ?? error);
  console.error(error);
  const ui = document.getElementById('ui');
  if (ui) ui.innerHTML = '<div class="screen"><p class="panel">Sorry, Agentmon could not start in this browser.</p></div>';
});
