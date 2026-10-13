/**
 * Glass touch controls (the TheaBonk family look, ui/glass.css): a floating stick in the left thumb
 * zone, big A and B buttons on the right and a Menu button at the top. A quick tap in the stick zone
 * (no drag) walks to that spot instead (tap-to-move), like tapping anywhere else on the world.
 * Shown on touch devices; hidden for keyboard, mouse and gamepad play (they reappear on a touch).
 */
import type { Input } from '../input/input';
import { stickReading, stickResponse } from '../input/stick';
import { h } from './dom';
import './glass.css';

const TRAVEL = 0.3;

export interface TouchOptions {
  onTap: (clientX: number, clientY: number) => void;
}

export class TouchControls {
  readonly el: HTMLElement;
  private zone: HTMLElement;
  private stick: HTMLElement;
  private knob: HTMLElement;
  private reading = stickReading();
  private pointer: number | null = null;
  private start = { x: 0, y: 0, t: 0, moved: false };
  private visible = true;
  private worldActive = true;

  constructor(private input: Input, private opts: TouchOptions) {
    this.knob = h('div.glass.gstick-knob', {}, h('div.gstick-shine'));
    this.stick = h('div.glass.gstick.idle', { 'aria-hidden': 'true' }, h('div.gstick-ring'), this.knob);
    this.zone = h('div.tzone', { 'aria-hidden': 'true' });
    const btn = (cls: string, label: string, sub: string, b: 'a' | 'b' | 'menu') => {
      const el = h(`button.glass.gbtn.${cls}` as 'button', { 'aria-label': `${label} button`, type: 'button' }, label, sub ? h('small', {}, sub) : null);
      const down = (e: PointerEvent) => { e.preventDefault(); e.stopPropagation(); el.classList.add('down'); this.input.setDevice('touch'); this.input.press(b); this.input.hold(b, true); try { el.setPointerCapture(e.pointerId); } catch { /* synthetic */ } };
      const up = () => { el.classList.remove('down'); this.input.hold(b, false); };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('click', e => e.preventDefault());
      return el;
    };
    this.el = h('div.glass-ui', { 'data-size': 'm' }, this.zone, this.stick, btn('gbtn-a', 'A', 'talk', 'a'), btn('gbtn-b', 'B', 'back', 'b'), btn('gbtn-menu', 'Menu', '', 'menu'));
    this.zone.addEventListener('pointerdown', e => this.down(e));
    this.zone.addEventListener('pointermove', e => this.move(e));
    this.zone.addEventListener('pointerup', e => this.up(e));
    this.zone.addEventListener('pointercancel', e => this.up(e, true));
    input.onDevice.push(d => this.setVisible(d === 'touch'));
    this.setVisible(input.device === 'touch');
    addEventListener('resize', () => this.layout());
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.el.classList.toggle('hidden', !v || !this.worldActive);
    if (v) this.layout();
  }

  /** The world's controls only show while walking (dialogues and menus have their own buttons). */
  setWorldActive(active: boolean): void {
    this.worldActive = active;
    this.el.classList.toggle('hidden', !this.visible || !active);
    if (!active) this.release();
  }

  layout(): void {
    const W = innerWidth, H = innerHeight;
    const b = Math.min(Math.max(112, Math.min(W, H) * 0.3), 168);
    const ab = Math.max(64, b * 0.56);
    const pad = 18;
    const safeB = 14, safeR = 14;
    const ax = W - safeR - pad - ab / 2, ay = H - safeB - pad - ab * 0.9;
    const bx = ax - ab * 1.05, by = ay + ab * 0.45;
    const set = (sel: string, x: number, y: number) => {
      const el = this.el.querySelector<HTMLElement>(sel)!;
      el.style.setProperty('--x', `${x}px`);
      el.style.setProperty('--y', `${y}px`);
    };
    set('.gbtn-a', ax, ay);
    set('.gbtn-b', bx, by);
    set('.gbtn-menu', W - safeR - 30, Math.max(14, 0) + 34);
    this.zone.style.width = `${Math.max(W * 0.5, b * 1.6)}px`;
    this.zone.style.height = `${H * 0.62}px`;
    if (this.pointer === null) this.idleStick();
  }

  private idleStick(): void {
    const b = Math.min(Math.max(112, Math.min(innerWidth, innerHeight) * 0.3), 168);
    this.stick.style.setProperty('--sx', `${18 + 14 + b / 2}px`);
    this.stick.style.setProperty('--sy', `${innerHeight - 18 - 14 - b / 2}px`);
    this.stick.classList.add('idle');
    this.stick.classList.remove('active');
    this.knob.classList.add('back');
    this.knob.style.setProperty('--kx', '0px');
    this.knob.style.setProperty('--ky', '0px');
  }

  private down(e: PointerEvent): void {
    if (this.pointer !== null) return;
    e.preventDefault();
    this.input.setDevice('touch');
    this.pointer = e.pointerId;
    try { this.zone.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
    this.start = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
    this.stick.style.setProperty('--sx', `${e.clientX}px`);
    this.stick.style.setProperty('--sy', `${e.clientY}px`);
  }

  private move(e: PointerEvent): void {
    if (e.pointerId !== this.pointer) return;
    const dx = e.clientX - this.start.x, dy = e.clientY - this.start.y;
    if (!this.start.moved && Math.hypot(dx, dy) < 10) return;
    this.start.moved = true;
    const base = this.stick.getBoundingClientRect().width || 140;
    const travel = base * TRAVEL;
    const r = stickResponse(dx, dy, travel, this.reading);
    const k = Math.min(1, Math.hypot(dx, dy) / travel);
    const len = Math.hypot(dx, dy) || 1;
    this.knob.classList.remove('back');
    this.knob.style.setProperty('--kx', `${(dx / len) * k * travel}px`);
    this.knob.style.setProperty('--ky', `${(dy / len) * k * travel}px`);
    this.stick.classList.remove('idle');
    this.stick.classList.add('active');
    this.stick.style.setProperty('--ang', `${r.ang}deg`);
    this.stick.style.setProperty('--mag', String(r.mag));
    this.input.stick = { x: r.x, y: -r.y };
  }

  private up(e: PointerEvent, cancelled = false): void {
    if (e.pointerId !== this.pointer) return;
    const quick = !this.start.moved && performance.now() - this.start.t < 400;
    this.release();
    if (quick && !cancelled) this.opts.onTap(e.clientX, e.clientY);
  }

  private release(): void {
    this.pointer = null;
    this.input.stick = { x: 0, y: 0 };
    this.idleStick();
  }
}
