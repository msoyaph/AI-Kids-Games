/**
 * Bubble Catch (1.1 pet care): a short, gentle toy game. Twelve bubbles drift down; your friend
 * catches them. Move it with the arrows, the stick or the D-pad, by dragging, or tap anywhere to send
 * it there; a tapped bubble pops too. It can't be lost: every result is a happy one. About 20 s.
 * Resolves with how many bubbles were caught.
 */
import type { Game } from '../game/game';
import { h } from './dom';

const COUNT = 12;

export function playBubbleCatch(game: Game, pic: string, name: string): Promise<number> {
  return new Promise(resolve => {
    const area = h('div.bubble-area', { 'aria-hidden': 'true' });
    const friend = h('img.px.bubble-friend', { src: pic, alt: '' });
    const score = h('p.bubble-score', { 'aria-live': 'polite' }, `Catch the bubbles with ${name}!`);
    const done = h('button.primary', { type: 'button', hidden: true }, 'Done');
    const panel = h('div.panel.menu.bubble-game', { role: 'dialog', 'aria-label': 'Bubble Catch' }, h('h2', {}, '🫧 Bubble Catch'), area, score, done);
    const el = h('div.menu-screen.bubbles', {}, panel);
    area.append(friend);
    game.app.ui.appendChild(el);
    const layer = { el: panel, back: () => finish() };
    game.focus.push(layer, false);

    let caught = 0, fx = 0.5, target: number | null = null, last = performance.now(), t = 0, over = false, raf = 0;
    // arrow keys (and A/D): the game's own key handling is paused while a menu has the keyboard
    const keys = new Set<string>();
    const LEFT = ['ArrowLeft', 'KeyA'], RIGHT = ['ArrowRight', 'KeyD'];
    const onKey = (e: KeyboardEvent) => {
      if (![...LEFT, ...RIGHT].includes(e.code)) return;
      e.preventDefault();
      if (e.type === 'keydown') keys.add(e.code); else keys.delete(e.code);
    };
    addEventListener('keydown', onKey);
    addEventListener('keyup', onKey);
    const calm = game.settings.reducedMotion;
    const bubbles = Array.from({ length: COUNT }, (_, i) => {
      const b = h('span.bubble');
      area.append(b);
      // spread out across the width, one after another
      return { el: b, x: 0.1 + ((i * 0.37 + 0.13) % 0.8), y: -0.15, start: 0.8 + i * 1.35, speed: calm ? 0.13 : 0.16 + (i % 3) * 0.02, popped: false, gone: false };
    });
    const pop = (b: (typeof bubbles)[number]) => {
      if (b.popped || b.gone) return;
      b.popped = true;
      caught++;
      b.el.classList.add('pop');
      game.sfx('heart');
      score.textContent = `${caught} caught!`;
      setTimeout(() => b.el.remove(), 300);
    };
    area.addEventListener('pointerdown', e => {
      const r = area.getBoundingClientRect();
      const hit = (e.target as HTMLElement).closest('.bubble');
      const b = bubbles.find(x => x.el === hit);
      if (b) pop(b);
      target = Math.max(0.05, Math.min(0.95, (e.clientX - r.left) / r.width));
    });
    area.addEventListener('pointermove', e => { if (e.buttons) { const r = area.getBoundingClientRect(); target = Math.max(0.05, Math.min(0.95, (e.clientX - r.left) / r.width)); } });

    const finish = () => {
      if (over) return;
      over = true;
      cancelAnimationFrame(raf);
      removeEventListener('keydown', onKey);
      removeEventListener('keyup', onKey);
      game.focus.pop(layer);
      el.remove();
      resolve(caught);
    };
    done.addEventListener('click', finish);

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      // the scene polls the gamepad every frame; read what it saw (a second poll would eat presses)
      const d = LEFT.some(k => keys.has(k)) ? 1 : RIGHT.some(k => keys.has(k)) ? 2 : game.input.dir() ?? game.input.padHeld;
      const step = 0.65 * dt;
      if (d === 1) { fx -= step; target = null; }
      else if (d === 2) { fx += step; target = null; }
      else if (target !== null) fx += Math.max(-step, Math.min(step, target - fx));
      fx = Math.max(0.05, Math.min(0.95, fx));
      friend.style.left = `${fx * 100}%`;
      let left = 0;
      for (const b of bubbles) {
        if (b.popped || b.gone) continue;
        if (t < b.start) { left++; continue; }
        b.y += b.speed * dt;
        b.el.style.left = `${b.x * 100}%`;
        b.el.style.top = `${b.y * 100}%`;
        b.el.classList.add('on');
        // caught when it reaches the friend
        if (b.y > 0.72 && b.y < 0.92 && Math.abs(b.x - fx) < 0.11) pop(b);
        else if (b.y > 1.02) { b.gone = true; b.el.remove(); }
        else left++;
      }
      if (!left && done.hidden) {
        done.hidden = false;
        score.textContent = caught ? `You caught ${caught} bubbles! ${name} loved it.` : `${name} loved chasing the bubbles!`;
        requestAnimationFrame(() => done.focus());
      }
      if (!over) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
}
