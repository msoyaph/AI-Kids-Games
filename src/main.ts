import './ui/styles.css';
import './ui/glass.css';
import { AudioEngine } from './audio/Audio';
import { bindAudio } from './audio/bindAudio';
import { Game } from './game/Game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const overlay = document.getElementById('overlay') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui') as HTMLElement;
let game: Game;
try {
  game = new Game(canvas, overlay, uiRoot);
} catch (err) {
  // usually WebGL: blocked, unsupported, or the graphics chip is too busy right now
  (window as unknown as { __theabonkError: string }).__theabonkError = String(err);
  console.warn('TheaBonk could not start:', err);
  uiRoot.innerHTML = `<div class="screen"><div class="modal panel start-error"><div class="title small">TheaBonk couldn't start</div>
    <div class="subtitle">It needs 3D graphics (WebGL), and the browser said no this time. Closing other tabs or apps and reloading usually fixes it.</div>
    <button class="btn primary" onclick="location.reload()">Reload</button></div></div>`;
  throw err;
}
bindAudio(game, new AudioEngine());
game.start();
// Debug / test handle (used by the Playwright smoke test).
(window as unknown as { __theabonk: Game }).__theabonk = game;
// ?audioreport=1: offline loudness / peak report (npm run audio-report, tests/e2e/audio.spec.ts)
if (new URLSearchParams(location.search).get('audioreport') === '1') {
  void import('./audio/report').then((m) => {
    (window as unknown as { __audioReport: () => Promise<unknown> }).__audioReport = async () => {
      const rows = await m.audioReport();
      return { rows, text: m.formatReport(rows) };
    };
  });
}
