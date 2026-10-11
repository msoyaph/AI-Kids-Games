import { h } from '../ui/dom';
import { minInterval } from '../render/flash';
import { GLYPHS } from './glassGlyphs';
import { resolveLayout, stickBase, type CustomLayout, type GlassSize, type Insets, type Placement, type Placed } from './glassLayout';
import { stickReading, stickResponse } from './stick';

/** Keep receiving a finger's moves after it leaves the element (never throws). */
function capture(el: HTMLElement, id: number): void {
  try {
    el.setPointerCapture(id);
  } catch {
    /* not an active pointer (e.g. synthetic events) */
  }
}

/** How the controls look (Settings → Touch controls; accessibility). */
export interface TouchLook {
  size: GlassSize;
  /** 0.4–1 */
  opacity: number;
  leftHanded: boolean;
  fixedStick: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}

export const DEFAULT_TOUCH_LOOK: TouchLook = { size: 'm', opacity: 1, leftHanded: false, fixedStick: false, highContrast: false, reducedMotion: false };

/** Real backdrop blur, or the layered "fake glass" (no blur). */
export type GlassMode = 'fake' | 'blur';

/**
 * play: live controls during a run; preview: shown (not touchable) behind the Touch controls
 * settings; edit: shown for the layout editor, which moves them with showPlacement().
 */
export type TouchMode = 'play' | 'preview' | 'edit';

/** Thumb zones start below the top HUD band (timer, boss bar, warnings). */
const ZONE_TOP = 0.22;
/** Knob travel radius as a share of the stick base. */
const TRAVEL = 0.3;

/**
 * Glass twin-stick touch controls (Pointer Events, multi-touch). Every control owns its
 * own finger (pointerId), so moving, turning the camera, jumping and sliding all work at
 * once; captured fingers keep working when they slide off their control.
 *  - stick side: a floating (or fixed) analog stick
 *  - other side: drag to turn the camera; big Jump and Slide buttons; Pause top-right
 * Visual updates are batched into one animation frame and only touch transforms and CSS
 * variables (see ui/glass.css).
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
  /** Camera drag sensitivity. */
  sensitivity = 1;
  onPause: (() => void) | null = null;
  /** When the camera finger last lifted (performance.now ms; auto camera waits on it). */
  lookReleasedAt = -1e9;
  /** The camera swings in behind Thea's movement (settings; touch only). */
  autoCamera = true;
  /** Short vibrations on damage / level-up / boss warnings where supported (settings). */
  haptics = true;
  private lastBuzz = -1e9;

  private look: TouchLook = { ...DEFAULT_TOUCH_LOOK };
  private glass: GlassMode = 'fake';
  private glassTimer = 0;
  private lookDX = 0;
  private lookDY = 0;
  private jumpQueued = false;
  private stickId = -1;
  private lookId = -1;
  private jumpId = -1;
  private slideId = -1;
  private lx = 0;
  private ly = 0;
  /** Stick centre and knob offset (CSS px). */
  private cx = 0;
  private cy = 0;
  private kx = 0;
  private ky = 0;
  private base = 120;
  private custom: CustomLayout = {};
  private placed: Placement | null = null;
  private mode: TouchMode = 'play';
  private playVisible = false;
  private reading = stickReading();
  private painted = true;
  private raf = 0;
  private lastHurt = -1e9;
  private hurtTimer = 0;
  private hideTimer = 0;
  private fast = false;
  private zoneStick: HTMLElement;
  private zoneLook: HTMLElement;
  private stick: HTMLElement;
  private knob: HTMLElement;
  private jump: HTMLElement;
  private slide: HTMLElement;
  private pause: HTMLElement;
  private safeProbe: HTMLElement;

  constructor(parent: HTMLElement) {
    this.zoneStick = h('div', { class: 'tzone tzone-stick' });
    this.zoneLook = h('div', { class: 'tzone tzone-look' });
    this.knob = h('div', { class: 'glass gstick-knob' });
    this.stick = h('div', { class: 'glass gstick gone', html: GLYPHS.stickChevrons + '<div class="gstick-ring"></div><div class="gstick-halo"></div>' + GLYPHS.speed });
    this.stick.append(this.knob);
    const button = (cls: string, label: string, glyph: string, text: string | null): HTMLElement => {
      const b = h('button', { class: `glass gbtn ${cls}`, 'aria-label': label, html: `<div class="g-clip"></div>${cls === 'gbtn-slide' ? '<i class="g-dot"></i>' : ''}${glyph}${text ? `<span>${text}</span>` : ''}` });
      return b;
    };
    this.jump = button('gbtn-jump', 'Jump', GLYPHS.jump, 'JUMP');
    this.slide = button('gbtn-slide', 'Slide', GLYPHS.slide, 'SLIDE');
    this.pause = button('gbtn-pause', 'Pause', GLYPHS.pause, null);
    this.safeProbe = h('div', { class: 'g-safe-probe' });
    this.root = h('div', { class: 'touch-ui glass-ui hidden', 'data-size': 'm' }, this.zoneStick, this.zoneLook, this.stick, this.jump, this.slide, this.pause, this.safeProbe);
    parent.append(this.root);

    // ── stick ──
    const zs = this.zoneStick;
    zs.addEventListener('pointerdown', (e) => {
      if (this.stickId >= 0) return;
      e.preventDefault();
      this.stickId = e.pointerId;
      capture(zs, e.pointerId);
      clearTimeout(this.hideTimer);
      if (!this.look.fixedStick || !this.placed) {
        // floating: the stick appears under the thumb (kept fully on screen)
        const r = this.base / 2;
        this.cx = Math.max(r, Math.min(innerWidth - r, e.clientX));
        this.cy = Math.max(r, Math.min(innerHeight - r, e.clientY));
      }
      this.knob.classList.remove('back');
      this.stick.classList.remove('gone', 'idle');
      this.stick.classList.add('active');
      this.setKnob(e.clientX - this.cx, e.clientY - this.cy);
    });
    zs.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.stickId) return;
      let dx = e.clientX - this.cx;
      let dy = e.clientY - this.cy;
      const travel = this.base * TRAVEL;
      const l = Math.hypot(dx, dy);
      if (!this.look.fixedStick && l > travel * 1.25) {
        // a floating stick trails a thumb that runs well past the rim
        const k = (l - travel * 1.25) / l;
        this.cx += dx * k;
        this.cy += dy * k;
        dx = e.clientX - this.cx;
        dy = e.clientY - this.cy;
      }
      this.setKnob(dx, dy);
    });
    const endStick = (e: PointerEvent): void => {
      if (e.pointerId !== this.stickId) return;
      this.stickId = -1;
      this.releaseStick();
    };
    zs.addEventListener('pointerup', endStick);
    zs.addEventListener('pointercancel', endStick);
    zs.addEventListener('lostpointercapture', endStick);

    // ── camera drag ──
    const zl = this.zoneLook;
    zl.addEventListener('pointerdown', (e) => {
      if (this.lookId >= 0) return;
      e.preventDefault();
      this.lookId = e.pointerId;
      capture(zl, e.pointerId);
      this.lx = e.clientX;
      this.ly = e.clientY;
    });
    zl.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookId) return;
      this.lookDX += e.clientX - this.lx;
      this.lookDY += e.clientY - this.ly;
      this.lx = e.clientX;
      this.ly = e.clientY;
    });
    const endLook = (e: PointerEvent): void => {
      if (e.pointerId !== this.lookId) return;
      this.lookId = -1;
      this.lookReleasedAt = performance.now();
    };
    zl.addEventListener('pointerup', endLook);
    zl.addEventListener('pointercancel', endLook);
    zl.addEventListener('lostpointercapture', endLook);

    // ── buttons: each tracks its own finger; rolling off the edge doesn't release ──
    this.jump.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.jumpId >= 0) return;
      this.jumpId = e.pointerId;
      capture(this.jump, e.pointerId);
      this.jumpQueued = true;
      this.jumpHeld = true;
      this.jump.classList.add('down');
      this.ripple(this.jump, e);
    });
    const jumpUp = (e: PointerEvent): void => {
      if (e.pointerId !== this.jumpId) return;
      this.jumpId = -1;
      this.jumpHeld = false;
      this.jump.classList.remove('down');
    };
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) this.jump.addEventListener(t, jumpUp);

    this.slide.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.slideId >= 0) return;
      this.slideId = e.pointerId;
      capture(this.slide, e.pointerId);
      this.slideHeld = this.slideToggle ? !this.slideHeld : true;
      this.slide.classList.add('down');
      this.slide.classList.toggle('latched', this.slideToggle && this.slideHeld);
      this.ripple(this.slide, e);
    });
    const slideUp = (e: PointerEvent): void => {
      if (e.pointerId !== this.slideId) return;
      this.slideId = -1;
      this.slide.classList.remove('down');
      if (!this.slideToggle) this.slideHeld = false;
    };
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) this.slide.addEventListener(t, slideUp);

    this.pause.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.ripple(this.pause, e);
      this.onPause?.();
    });
    // no long-press menus / text selection on the controls
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('resize', () => this.relayout());
    window.addEventListener('orientationchange', () => this.relayout());
  }

  /** Size, opacity, handedness, stick mode, high contrast, reduced motion. */
  setLook(look: Partial<TouchLook>): void {
    Object.assign(this.look, look);
    const l = this.look;
    this.root.dataset.size = l.size;
    this.root.style.setProperty('--g-o-base', String(Math.max(0.4, Math.min(1, l.opacity))));
    this.root.classList.toggle('hc', l.highContrast);
    this.root.classList.toggle('rm', l.reducedMotion);
    this.root.classList.toggle('lefty', l.leftHanded);
    this.relayout();
  }

  getLook(): Readonly<TouchLook> {
    return this.look;
  }

  /**
   * Real blur or fake glass. The blur layer cross-fades (≈0.4 s) so a change — the player's
   * tier, or the quality governor stepping down mid-run — never pops.
   */
  setGlass(mode: GlassMode): void {
    if (mode === this.glass) return;
    this.glass = mode;
    clearTimeout(this.glassTimer);
    const c = this.root.classList;
    if (mode === 'blur') {
      c.add('blur-layer');
      // next frame, so the opacity transition runs from 0
      requestAnimationFrame(() => {
        if (this.glass === 'blur') c.add('blur-on');
      });
    } else {
      c.remove('blur-on');
      this.glassTimer = window.setTimeout(() => {
        if (this.glass === 'fake') c.remove('blur-layer');
      }, 450);
    }
  }

  get glassMode(): GlassMode {
    return this.glass;
  }

  /** Safe-area insets (notches, rounded corners, home bar), CSS px. */
  safeInsets(): Insets {
    const cs = getComputedStyle(this.safeProbe);
    return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
  }

  /** The interface's root font size (bigger with Larger text). */
  private rem(): number {
    return parseFloat(getComputedStyle(document.documentElement).fontSize) || 12;
  }

  /** The player's moved / resized controls (Settings → Touch controls → Edit layout). */
  setLayout(custom: CustomLayout): void {
    this.custom = custom;
    this.relayout();
  }

  /** Where every control is right now (centres + diameters). */
  get placement(): Placement {
    if (!this.placed) this.relayout();
    return this.placed!;
  }

  /** Where things go: the default layout + the player's own, for this screen and hand. */
  relayout(): void {
    const w = innerWidth;
    const hgt = innerHeight;
    this.base = stickBase(w, hgt, this.look.size);
    const p = resolveLayout(w, hgt, this.look.size, this.safeInsets(), this.look.leftHanded, this.custom, this.rem());
    this.showPlacement(p);
    // thumb zones: the stick side and the camera side (below the top HUD band)
    const half = `${Math.round(w * 0.5)}px`;
    const zs = this.zoneStick.style;
    const zl = this.zoneLook.style;
    zs.top = zl.top = `${Math.round(hgt * ZONE_TOP)}px`;
    zs.width = zl.width = half;
    zs.left = this.look.leftHanded ? half : '0px';
    zl.left = this.look.leftHanded ? '0px' : half;
  }

  /**
   * Put the controls at a placement (the layout editor drags them through this). The stick's
   * spot is where a fixed stick sits; in preview / edit it always shows there.
   */
  showPlacement(p: Placement): void {
    this.placed = p;
    const place = (el: HTMLElement, c: Placed): void => {
      el.style.setProperty('--x', `${c.x}px`);
      el.style.setProperty('--y', `${c.y}px`);
      el.style.setProperty('--d', `${c.d}px`);
    };
    place(this.jump, p.jump);
    place(this.slide, p.slide);
    place(this.pause, p.pause);
    // a resized stick: its base follows the placed diameter
    this.base = p.stick.d;
    this.root.style.setProperty('--g-b', `${p.stick.d}px`);
    const showStick = this.look.fixedStick || this.mode !== 'play';
    if (showStick && this.stickId < 0) {
      this.cx = p.stick.x;
      this.cy = p.stick.y;
      this.stick.classList.remove('gone');
      this.stick.classList.add('idle');
    } else if (!showStick && this.stickId < 0) {
      this.stick.classList.add('gone');
    }
    this.schedule();
  }

  /** Live play, a settings preview, or the layout editor (see TouchMode). */
  setMode(mode: TouchMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    this.reset();
    this.root.classList.toggle('preview', mode !== 'play');
    this.root.classList.toggle('hidden', mode === 'play' ? !this.playVisible : false);
    this.relayout();
  }

  get touchMode(): TouchMode {
    return this.mode;
  }

  private setKnob(dx: number, dy: number): void {
    const travel = this.base * TRAVEL;
    const r = stickResponse(dx, dy, travel, this.reading);
    this.moveX = r.x;
    this.moveY = r.y;
    const l = Math.hypot(dx, dy);
    const k = l > travel ? travel / l : 1;
    this.kx = dx * k;
    this.ky = dy * k;
    this.schedule();
  }

  private releaseStick(): void {
    this.moveX = this.moveY = 0;
    this.reading.raw = this.reading.mag = 0;
    this.kx = this.ky = 0;
    this.stick.classList.remove('active');
    // the bead springs back to the centre
    this.knob.classList.add('back');
    if (this.look.fixedStick || this.mode !== 'play') this.stick.classList.add('idle');
    else {
      clearTimeout(this.hideTimer);
      this.hideTimer = window.setTimeout(() => {
        if (this.stickId < 0 && !this.look.fixedStick) this.stick.classList.add('gone');
      }, this.look.reducedMotion ? 0 : 170);
    }
    this.schedule();
  }

  /** Batch DOM writes into the next animation frame (pointer events can outpace frames). */
  private schedule(): void {
    this.painted = false;
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.paint();
    });
  }

  private paint(): void {
    if (this.painted) return;
    this.painted = true;
    const s = this.stick.style;
    s.setProperty('--sx', `${this.cx}px`);
    s.setProperty('--sy', `${this.cy}px`);
    s.setProperty('--ang', `${this.reading.ang}deg`);
    s.setProperty('--mag', String(Math.min(1, this.reading.raw * 1.15)));
    const k = this.knob.style;
    k.setProperty('--kx', `${this.kx}px`);
    k.setProperty('--ky', `${this.ky}px`);
    // the highlight slides the other way, like light on a glass bead
    const travel = this.base * TRAVEL;
    k.setProperty('--hx', `${38 - (this.kx / travel) * 12}%`);
    k.setProperty('--hy', `${30 - (this.ky / travel) * 12}%`);
  }

  /** Thea took damage: the stick rim flashes (≤ 3 Hz; shape + brightness, not only colour). */
  hurt(): void {
    const now = performance.now();
    if (now - this.lastHurt < minInterval('stickHurt') * 1000) return;
    this.lastHurt = now;
    const c = this.stick.classList;
    c.remove('hurt');
    // restart the pulse animation
    void this.stick.offsetWidth;
    c.add('hurt');
    clearTimeout(this.hurtTimer);
    this.hurtTimer = window.setTimeout(() => c.remove('hurt'), 260);
  }

  /** Sliding fast: the rim glows, chevrons point along the movement (degrees from screen up). */
  setFast(on: boolean, angleDeg: number): void {
    if (on) this.stick.style.setProperty('--mang', `${angleDeg.toFixed(0)}deg`);
    if (on === this.fast) return;
    this.fast = on;
    this.stick.classList.toggle('fast', on);
  }

  /** The browser can vibrate (Android; iOS Safari has no web vibration). */
  static canVibrate(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  }

  /** A short vibration (quietly nothing where unsupported, before a tap, or too soon). */
  buzz(pattern: number | number[]): void {
    if (!this.haptics || !TouchControls.canVibrate()) return;
    // browsers only allow vibration after the page has been tapped
    const act = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (act && !act.hasBeenActive) return;
    const now = performance.now();
    if (now - this.lastBuzz < 70) return;
    this.lastBuzz = now;
    try {
      navigator.vibrate(pattern);
    } catch {
      /* blocked (e.g. a sandboxed iframe) */
    }
  }

  private ripple(btn: HTMLElement, e: PointerEvent): void {
    if (this.look.reducedMotion) return;
    const clip = btn.firstElementChild as HTMLElement | null;
    if (!clip) return;
    const r = btn.getBoundingClientRect();
    const dot = h('span', { class: 'g-ripple', style: `left:${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%;top:${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%` });
    clip.replaceChildren(dot);
    dot.addEventListener('animationend', () => dot.remove());
  }

  /** Show / hide the live controls (runs). A preview / edit mode keeps them on screen. */
  setVisible(on: boolean): void {
    this.playVisible = on;
    if (this.mode !== 'play') return;
    const was = !this.root.classList.contains('hidden');
    this.root.classList.toggle('hidden', !on);
    if (!on) this.reset();
    else if (!was) this.relayout();
  }

  get visible(): boolean {
    return !this.root.classList.contains('hidden');
  }

  /** Forget every touch (run ended, screen opened, input switched). */
  reset(): void {
    this.stickId = this.lookId = this.jumpId = this.slideId = -1;
    this.moveX = this.moveY = 0;
    this.lookDX = this.lookDY = 0;
    this.jumpQueued = this.jumpHeld = false;
    this.slideHeld = false;
    this.kx = this.ky = 0;
    this.reading.raw = this.reading.mag = 0;
    this.jump.classList.remove('down');
    this.slide.classList.remove('down', 'latched');
    this.stick.classList.remove('active', 'hurt', 'fast');
    this.fast = false;
    if (this.look.fixedStick || this.mode !== 'play') this.stick.classList.add('idle');
    else this.stick.classList.add('gone');
    this.schedule();
  }

  /** The game reports a slide ended (a toggled slide switches off). */
  slideEnded(): void {
    if (!this.slideToggle) return;
    this.slideHeld = false;
    this.slide.classList.remove('latched');
  }

  /** A finger is turning the camera right now. */
  get looking(): boolean {
    return this.lookId >= 0;
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
