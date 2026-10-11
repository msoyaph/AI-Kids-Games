import { h, setText } from '../ui/dom';
import { iconEl } from '../ui/widgets';
import type { Input } from './input';

export type ControlMode = 'flight' | 'explore' | 'landing' | 'none';

/**
 * On-screen controls: a floating joystick (touch or mouse-drag anywhere on the left side)
 * and two big buttons on the right. Works with several fingers at once.
 */
export class TouchControls {
  readonly el: HTMLElement;
  private zone: HTMLElement;
  private base: HTMLElement;
  private knob: HTMLElement;
  private boostBtn: HTMLElement;
  private actionBtn: HTMLElement;
  private boostLbl: HTMLElement;
  private actionLbl: HTMLElement;
  private boostIco: HTMLElement;
  private actionIco: HTMLElement;
  private pointerId: number | null = null;
  private ox = 0;
  private oy = 0;
  private radius = 95;
  mode: ControlMode = 'none';
  private actionLabel: string | null = '';
  private actionIcon = '';

  constructor(
    private readonly input: Input,
    private readonly scale: () => number,
  ) {
    this.base = h('div', { class: 'joy-base' });
    this.knob = h('div', { class: 'joy-knob' });
    this.base.append(this.knob);
    this.zone = h('div', { class: 'joy-zone hit', 'data-testid': 'joy-zone' }, this.base);
    this.boostIco = iconEl('boost');
    this.boostLbl = h('span', null, 'Boost');
    this.boostBtn = h('div', { class: 'tc-btn tc-boost hit', 'data-testid': 'btn-boost', role: 'button', 'aria-label': 'Boost' }, this.boostIco, this.boostLbl);
    this.actionIco = iconEl('hand');
    this.actionLbl = h('span', null, 'Action');
    this.actionBtn = h('div', { class: 'tc-btn tc-action hit', 'data-testid': 'btn-action', role: 'button', 'aria-label': 'Action' }, this.actionIco, this.actionLbl);
    this.el = h('div', { class: 'touch-controls' }, this.zone, this.boostBtn, this.actionBtn);
    this.bindJoystick();
    this.bindButton(this.boostBtn, 'boost');
    this.bindButton(this.actionBtn, 'action');
    this.setMode('none');
  }

  private toLogical(e: PointerEvent): [number, number] {
    const s = this.scale();
    return [e.clientX / s, e.clientY / s];
  }

  private bindJoystick(): void {
    const z = this.zone;
    z.addEventListener('pointerdown', (e) => {
      if (this.pointerId !== null) return;
      this.pointerId = e.pointerId;
      try {
        z.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const [x, y] = this.toLogical(e);
      this.ox = x;
      this.oy = y;
      this.base.style.transform = `translate(${x - 110}px, ${y - 110}px)`;
      this.base.classList.add('on');
      this.knob.style.transform = 'translate(0px, 0px)';
      e.preventDefault();
    });
    const move = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      const [x, y] = this.toLogical(e);
      let dx = x - this.ox;
      let dy = y - this.oy;
      const d = Math.hypot(dx, dy);
      if (d > this.radius) {
        // Let the base follow the finger a little so it never feels stuck.
        const over = d - this.radius;
        this.ox += (dx / d) * over;
        this.oy += (dy / d) * over;
        this.base.style.transform = `translate(${this.ox - 110}px, ${this.oy - 110}px)`;
        dx = (dx / d) * this.radius;
        dy = (dy / d) * this.radius;
      }
      this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const nx = dx / this.radius;
      const ny = dy / this.radius;
      const mag = Math.hypot(nx, ny);
      this.input.touch.x = mag < 0.15 ? 0 : nx;
      this.input.touch.y = mag < 0.15 ? 0 : ny;
      e.preventDefault();
    };
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerId = null;
      this.input.touch.x = 0;
      this.input.touch.y = 0;
      this.base.classList.remove('on');
    };
    z.addEventListener('pointermove', move);
    z.addEventListener('pointerup', end);
    z.addEventListener('pointercancel', end);
    z.addEventListener('lostpointercapture', end);
  }

  private bindButton(btn: HTMLElement, which: 'boost' | 'action'): void {
    const ids = new Set<number>();
    const set = (on: boolean) => {
      if (which === 'boost') {
        if (on && !this.input.touch.boost) this.input.touch.boostLatch = true;
        this.input.touch.boost = on;
      } else {
        if (on && !this.input.touch.action) this.input.touch.actionLatch = true;
        this.input.touch.action = on;
      }
      btn.classList.toggle('down', on);
    };
    btn.addEventListener('pointerdown', (e) => {
      ids.add(e.pointerId);
      try {
        btn.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      set(true);
      e.preventDefault();
      e.stopPropagation();
    });
    const up = (e: PointerEvent) => {
      ids.delete(e.pointerId);
      if (ids.size === 0) set(false);
    };
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setMode(mode: ControlMode): void {
    this.mode = mode;
    this.input.gameplay = mode !== 'none';
    this.el.dataset.mode = mode;
    this.el.style.display = mode === 'none' ? 'none' : '';
    if (mode === 'explore') this.setBoost('Jump', 'jump');
    else if (mode === 'landing') this.setBoost('Thrust', 'boost');
    else this.setBoost('Boost', 'boost');
    this.setAction(null);
    this.input.reset();
    this.pointerId = null;
    this.base.classList.remove('on');
  }

  private setBoost(label: string, icon: string): void {
    setText(this.boostLbl, label);
    this.boostIco.replaceWith((this.boostIco = iconEl(icon)));
  }

  /** Show what the Action button will do right now (null = nothing to do). */
  setAction(label: string | null, icon = 'hand'): void {
    if (label === this.actionLabel && icon === this.actionIcon) return;
    this.actionLabel = label;
    this.actionIcon = icon;
    this.actionBtn.classList.toggle('ready', !!label);
    setText(this.actionLbl, label ?? 'Action');
    this.actionIco.replaceWith((this.actionIco = iconEl(label ? icon : 'hand')));
  }
}
