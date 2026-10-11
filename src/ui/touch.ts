// On-screen controls for touch devices: floating joystick + action buttons.
import type { App } from '../app';
import type { Command } from '../input/input';
import { h } from './dom';

export class TouchControls {
  readonly el: HTMLElement;
  private stick = h('div', { class: 'tc-stick' }, h('div', { class: 'tc-knob' }));
  private stickId: number | null = null;
  private origin = { x: 0, y: 0 };

  constructor(private app: App, root: HTMLElement) {
    const btn = (label: string, cls: string, cmd: Command | null, hold?: (down: boolean) => void) => {
      const b = h('button', { class: `tc-btn ${cls}` }, label);
      b.addEventListener('touchstart', (e) => {
        e.preventDefault();
        app.audio.unlock();
        if (cmd) app.input.push(cmd);
        if (cmd === 'action') app.input.push('confirm');
        hold?.(true);
      });
      b.addEventListener('touchend', (e) => {
        e.preventDefault();
        hold?.(false);
      });
      return b;
    };
    const pad = h('div', { class: 'tc-pad' });
    this.el = h(
      'div',
      { class: 'touch' },
      pad,
      this.stick,
      h(
        'div',
        { class: 'tc-buttons' },
        btn('A', 'a', 'action', (d) => (app.input.touch.action = d)),
        btn('B', 'b', 'back', (d) => (app.input.touch.run = d)),
        btn('Tool', 'tool', 'toolNext'),
        btn('Bag', 'bag', 'inventory'),
        btn('Pad', 'pad2', 'phone'),
      ),
    );
    root.appendChild(this.el);
    pad.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0]!;
      this.stickId = t.identifier;
      this.origin = { x: t.clientX, y: t.clientY };
      this.stick.style.left = `${t.clientX}px`;
      this.stick.style.top = `${t.clientY}px`;
      this.stick.classList.add('on');
      app.audio.unlock();
      e.preventDefault();
    });
    pad.addEventListener('touchmove', (e) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier !== this.stickId) continue;
        const dx = t.clientX - this.origin.x, dy = t.clientY - this.origin.y;
        const r = 50;
        const d = Math.min(r, Math.hypot(dx, dy));
        const a = Math.atan2(dy, dx);
        (this.stick.firstChild as HTMLElement).style.transform = `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px)`;
        app.input.touch.x = (Math.cos(a) * d) / r;
        app.input.touch.z = (Math.sin(a) * d) / r;
      }
      e.preventDefault();
    });
    const end = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier !== this.stickId) continue;
        this.stickId = null;
        app.input.touch.x = 0;
        app.input.touch.z = 0;
        this.stick.classList.remove('on');
        (this.stick.firstChild as HTMLElement).style.transform = '';
      }
    };
    pad.addEventListener('touchend', end);
    pad.addEventListener('touchcancel', end);
    this.update();
  }

  update(): void {
    const s = this.app.settings.touch;
    const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
    const show = this.app.game !== null && (s === 'on' || (s === 'auto' && coarse)) && !this.app.ui.modalOpen;
    this.el.style.display = show ? '' : 'none';
    if (show) this.app.hud.device = 'touch';
  }
}
