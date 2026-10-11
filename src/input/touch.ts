import { h } from '../ui/dom';

/** A coarse (finger) pointer is the main input: phones and tablets. */
export function isTouchDevice(): boolean {
  try {
    return matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints ?? 0) > 1;
  } catch {
    return false;
  }
}

/** Keep receiving a finger's moves after it leaves the zone (never throws). */
function capture(el: HTMLElement, id: number): void {
  try {
    el.setPointerCapture(id);
  } catch {
    /* not an active pointer (e.g. synthetic events) */
  }
}

/** Stick radius in CSS px at which the stick reads full deflection. */
const STICK_RADIUS = 56;

/**
 * Twin-stick touch controls (Pointer Events, multi-touch):
 *  - left half: a floating stick appears where you touch and moves you (analog)
 *  - right half: drag to turn the camera
 *  - big Jump and Slide buttons on the right, Pause at the top
 */
export class TouchControls {
  readonly root: HTMLElement;
  /** Analog move (x = right, y = forward), −1..1. */
  moveX = 0;
  moveY = 0;
  slideHeld = false;
  jumpHeld = false;
  /** Slide button toggles instead of hold (settings). */
  slideToggle = false;
  sensitivity = 1;
  onPause: (() => void) | null = null;
  /** Any touch input happened (switches HUD into touch mode). */
  onTouch: (() => void) | null = null;

  private lookDX = 0;
  private lookDY = 0;
  private jumpQueued = false;
  private stickId = -1;
  private lookId = -1;
  private ox = 0;
  private oy = 0;
  private lx = 0;
  private ly = 0;
  private base: HTMLElement;
  private knob: HTMLElement;
  private slideBtn: HTMLElement;

  constructor(parent: HTMLElement) {
    this.knob = h('div', { class: 'tstick-knob' });
    this.base = h('div', { class: 'tstick hidden' }, this.knob);
    const left = h('div', { class: 'tzone tzone-left' });
    const right = h('div', { class: 'tzone tzone-right' });
    const jump = h('button', { class: 'tbtn tbtn-jump', 'aria-label': 'Jump' }, 'Jump');
    this.slideBtn = h('button', { class: 'tbtn tbtn-slide', 'aria-label': 'Slide' }, 'Slide');
    const pause = h('button', { class: 'tbtn tbtn-pause', 'aria-label': 'Pause' }, 'II');
    this.root = h('div', { class: 'touch-ui hidden' }, left, right, this.base, jump, this.slideBtn, pause);
    parent.append(this.root);

    left.addEventListener('pointerdown', (e) => {
      if (this.stickId >= 0) return;
      this.touched(e);
      this.stickId = e.pointerId;
      capture(left, e.pointerId);
      this.ox = e.clientX;
      this.oy = e.clientY;
      this.base.style.left = `${e.clientX}px`;
      this.base.style.top = `${e.clientY}px`;
      this.base.classList.remove('hidden');
      this.setStick(e.clientX, e.clientY);
    });
    left.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.stickId) this.setStick(e.clientX, e.clientY);
    });
    const endStick = (e: PointerEvent): void => {
      if (e.pointerId !== this.stickId) return;
      this.stickId = -1;
      this.moveX = this.moveY = 0;
      this.base.classList.add('hidden');
    };
    left.addEventListener('pointerup', endStick);
    left.addEventListener('pointercancel', endStick);

    right.addEventListener('pointerdown', (e) => {
      if (this.lookId >= 0) return;
      this.touched(e);
      this.lookId = e.pointerId;
      capture(right, e.pointerId);
      this.lx = e.clientX;
      this.ly = e.clientY;
    });
    right.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookId) return;
      this.lookDX += e.clientX - this.lx;
      this.lookDY += e.clientY - this.ly;
      this.lx = e.clientX;
      this.ly = e.clientY;
    });
    const endLook = (e: PointerEvent): void => {
      if (e.pointerId === this.lookId) this.lookId = -1;
    };
    right.addEventListener('pointerup', endLook);
    right.addEventListener('pointercancel', endLook);

    jump.addEventListener('pointerdown', (e) => {
      this.touched(e);
      this.jumpQueued = true;
      this.jumpHeld = true;
      jump.classList.add('down');
    });
    const jumpUp = (): void => {
      this.jumpHeld = false;
      jump.classList.remove('down');
    };
    jump.addEventListener('pointerup', jumpUp);
    jump.addEventListener('pointercancel', jumpUp);
    jump.addEventListener('pointerleave', jumpUp);

    this.slideBtn.addEventListener('pointerdown', (e) => {
      this.touched(e);
      this.slideHeld = this.slideToggle ? !this.slideHeld : true;
      this.slideBtn.classList.toggle('down', this.slideHeld);
    });
    const slideUp = (): void => {
      if (this.slideToggle) return;
      this.slideHeld = false;
      this.slideBtn.classList.remove('down');
    };
    this.slideBtn.addEventListener('pointerup', slideUp);
    this.slideBtn.addEventListener('pointercancel', slideUp);
    this.slideBtn.addEventListener('pointerleave', slideUp);

    pause.addEventListener('pointerdown', (e) => {
      this.touched(e);
      e.preventDefault();
      this.onPause?.();
    });
    // no long-press menus / text selection on the controls
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private touched(e: PointerEvent): void {
    e.preventDefault();
    this.onTouch?.();
  }

  private setStick(x: number, y: number): void {
    let dx = x - this.ox;
    let dy = y - this.oy;
    const l = Math.hypot(dx, dy);
    if (l > STICK_RADIUS) {
      // the stick follows a finger that runs past the rim
      this.ox = x - (dx / l) * STICK_RADIUS;
      this.oy = y - (dy / l) * STICK_RADIUS;
      this.base.style.left = `${this.ox}px`;
      this.base.style.top = `${this.oy}px`;
      dx = (dx / l) * STICK_RADIUS;
      dy = (dy / l) * STICK_RADIUS;
    }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const k = 1 / STICK_RADIUS;
    // small dead zone so a resting thumb doesn't creep
    const mx = dx * k;
    const my = -dy * k;
    const m = Math.hypot(mx, my);
    const s = m < 0.12 ? 0 : (m - 0.12) / 0.88 / m;
    this.moveX = mx * s;
    this.moveY = my * s;
  }

  setVisible(on: boolean): void {
    this.root.classList.toggle('hidden', !on);
    if (!on) this.reset();
  }

  /** Forget every touch (run ended, screen opened). */
  reset(): void {
    this.stickId = this.lookId = -1;
    this.moveX = this.moveY = 0;
    this.lookDX = this.lookDY = 0;
    this.jumpQueued = this.jumpHeld = false;
    this.slideHeld = false;
    this.slideBtn.classList.remove('down');
    this.base.classList.add('hidden');
  }

  /** The game reports a slide ended (a toggled slide switches off). */
  slideEnded(): void {
    if (!this.slideToggle) return;
    this.slideHeld = false;
    this.slideBtn.classList.remove('down');
  }

  consumeJump(): boolean {
    const j = this.jumpQueued;
    this.jumpQueued = false;
    return j;
  }

  /** Camera turn since the last call, in radians. */
  consumeLook(out: { x: number; y: number }): void {
    const s = 0.0055 * this.sensitivity;
    out.x = this.lookDX * s;
    out.y = this.lookDY * s * 0.8;
    this.lookDX = this.lookDY = 0;
  }
}
