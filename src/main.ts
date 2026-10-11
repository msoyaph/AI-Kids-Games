import './ui/styles.css';
import { AudioEngine } from './audio/Audio';
import { bindAudio } from './audio/bindAudio';
import { Game } from './game/Game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const overlay = document.getElementById('overlay') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui') as HTMLElement;
const game = new Game(canvas, overlay, uiRoot);
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
