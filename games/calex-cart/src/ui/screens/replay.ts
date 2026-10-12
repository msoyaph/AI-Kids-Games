import type { App } from '../../game/app';
import { REPLAY_CAMERAS, type ReplayCamera } from '../../game/replay';
import { formatTime } from '../../core/math';
import { button, h, type Screen } from '../ui';

const CAM_NAMES: Record<ReplayCamera, string> = { auto: '🎬 Auto', chase: '🏎 Chase', trackside: '📷 Trackside', overhead: '🚁 Overhead' };

/**
 * Instant replay controls over the finished race. Keyboard/gamepad: ←/→ = −/+10 s, Enter/A = play/pause,
 * ↑/↓ = follow previous/next racer, Q/E (LB/RB) = camera, Esc/B = back to the results.
 */
export function replayScreen(app: App, back: () => void): Screen | null {
  const s = app.session;
  const rp = s?.startReplay();
  if (!s || !rp) return null;
  const w = s.world;
  const name = h('div', { class: 'rp-name' });
  const clock = h('div', { class: 'rp-clock' });
  const bar = h('i');
  const progress = h('div', { class: 'rp-progress', role: 'progressbar', 'aria-label': 'Replay position' }, bar);
  const play = button('⏸', () => toggle(), 'small yellow', { 'aria-label': 'Play or pause' });
  const speedBtn = button('1×', () => cycleSpeed(), 'small', { 'aria-label': 'Playback speed' });
  const camBtn = button(CAM_NAMES[rp.camera], () => cycleCam(1), 'small', { 'aria-label': 'Camera' });
  const toggle = (): void => {
    if (!rp.playing && rp.t >= rp.duration - 0.05) rp.seek(0);
    rp.playing = !rp.playing;
  };
  const cycleSpeed = (): void => {
    rp.speed = rp.speed === 1 ? 2 : rp.speed === 2 ? 0.5 : 1;
  };
  const cycleCam = (d: number): void => {
    const i = REPLAY_CAMERAS.indexOf(rp.camera);
    rp.camera = REPLAY_CAMERAS[(i + d + REPLAY_CAMERAS.length) % REPLAY_CAMERAS.length];
  };
  const follow = (d: number): void => {
    // cycle racers in finishing order
    const order = [...w.karts].sort((a, b) => a.rank - b.rank).map((k) => k.index);
    const i = order.indexOf(rp.follow);
    rp.follow = order[(i + d + order.length) % order.length];
    rp.seek(rp.t);
  };
  const exit = (): void => {
    s.stopReplay();
    window.clearInterval(timer);
    back();
  };
  progress.addEventListener('pointerdown', (e) => {
    const r = progress.getBoundingClientRect();
    rp.seek(((e.clientX - r.left) / r.width) * rp.duration);
  });
  const refresh = (): void => {
    const k = w.karts[rp.follow];
    name.textContent = `${k.name} · ${k.rank}${k.rank === 1 ? 'st' : k.rank === 2 ? 'nd' : k.rank === 3 ? 'rd' : 'th'}`;
    clock.textContent = `${formatTime(rp.t)} / ${formatTime(rp.duration)}`;
    bar.style.width = `${(rp.t / Math.max(0.01, rp.duration)) * 100}%`;
    play.textContent = rp.playing ? '⏸' : '▶';
    speedBtn.textContent = `${rp.speed}×`;
    camBtn.textContent = CAM_NAMES[rp.camera];
  };
  const timer = window.setInterval(refresh, 100);
  refresh();
  const el = h(
    'div',
    { class: 'replay-ui' },
    h('div', { class: 'rp-top' }, h('div', { class: 'rp-tag' }, 'REPLAY'), name, h('div', { class: 'spacer' }), clock),
    h(
      'div',
      { class: 'rp-bottom' },
      progress,
      h(
        'div',
        { class: 'menu-row rp-buttons' },
        button('⏪ 10s', () => rp.seek(rp.t - 10), 'small', { 'aria-label': 'Back 10 seconds' }),
        play,
        button('10s ⏩', () => rp.seek(rp.t + 10), 'small', { 'aria-label': 'Forward 10 seconds' }),
        speedBtn,
        camBtn,
        button('👤 ◀', () => follow(-1), 'small', { 'aria-label': 'Follow previous racer' }),
        button('▶ 👤', () => follow(1), 'small', { 'aria-label': 'Follow next racer' }),
        button('Done', exit, 'small ghost'),
      ),
    ),
  );
  return {
    el,
    fullCover: false,
    onBack: exit,
    focus: play,
    onMenu: (a) => {
      if (a === 'left') rp.seek(rp.t - 10);
      else if (a === 'right') rp.seek(rp.t + 10);
      else if (a === 'up') follow(-1);
      else if (a === 'down') follow(1);
      else if (a === 'tabPrev') cycleCam(-1);
      else if (a === 'tabNext') cycleCam(1);
      else return false;
      refresh();
      return true;
    },
  };
}
