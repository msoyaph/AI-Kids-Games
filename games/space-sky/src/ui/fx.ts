import { S } from '../app/services';
import { h } from './dom';

const COLORS = ['#ff5d73', '#ffe066', '#8cff66', '#4dd4ff', '#9b6bff', '#ff7ad9', '#ff9f43'];

/** Confetti burst over the whole screen (DOM, cheap CSS animations). */
export function celebrate(count = 60): void {
  const layer = h('div', { class: 'confetti-layer' });
  for (let i = 0; i < count; i++) {
    const c = h('i', { class: 'confetti' });
    const x = Math.random() * 100;
    const delay = Math.random() * 0.35;
    const dur = 1.6 + Math.random() * 1.2;
    const rot = Math.floor(Math.random() * 720 - 360);
    c.style.cssText = `left:${x}%;background:${COLORS[i % COLORS.length]};animation-delay:${delay}s;animation-duration:${dur}s;--rot:${rot}deg;--drift:${Math.round(Math.random() * 200 - 100)}px;${i % 3 === 0 ? 'border-radius:50%;width:14px;height:14px;' : ''}`;
    layer.append(c);
  }
  S.game.topLayer.append(layer);
  setTimeout(() => layer.remove(), 3400);
}
