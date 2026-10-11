// On-screen controls for touch play.
// - Drag anywhere to walk with a floating stick: a small push sneaks (🐾 quiet and slow, for bugs),
//   a bigger push walks, and the edge runs.
// - Tap the ground to walk there; tap a person, door or item (with empty hands) to go and use it;
//   tap the glowing ring to use your tool.
// - While a fish is on the line, a touch anywhere is the A button (tap to hook, hold to reel).
// - Buttons: a big A that says what it will do, Run, the tool ring, pockets, the Glowpad and a menu.
// Everything listens to touch events (not pointer events) so it behaves the same in every browser.
import type { App } from '../app';
import type { Command } from '../input/input';
import { item } from '../data/registry';
import { fishingRT } from '../sim/fishing';
import { placementRT } from '../sim/placement';
import { equippedTool } from '../sim/tools';
import { h } from './dom';
import { iconURL } from './icons';

const STICK_R = 56;
const SNEAK = 0.5;
const RUN = 0.95;
const TAP_MOVE = 12;
const TAP_MS = 380;

interface Track {
  id: number;
  sx: number;
  sy: number;
  t0: number;
  mode: 'pending' | 'stick' | 'hold';
}

/** Is this a touch device? (a coarse pointer, or touch points without a fine pointer) */
export function touchCapable(): boolean {
  try {
    if (matchMedia('(pointer: coarse)').matches) return true;
    return (navigator.maxTouchPoints ?? 0) > 0 && !matchMedia('(pointer: fine)').matches;
  } catch {
    return false;
  }
}

export class TouchControls {
  readonly el: HTMLElement;
  private zone = h('div', { class: 'tc-zone' });
  private knob = h('div', { class: 'tc-knob' });
  private stickLabel = h('div', { class: 'tc-stick-label' });
  private stick = h('div', { class: 'tc-stick' }, h('div', { class: 'tc-sneak-ring' }), this.knob, this.stickLabel);
  private home = h('div', { class: 'tc-home' }, h('div', { class: 'tc-home-knob' }));
  readonly cluster: HTMLElement;
  readonly topBar: HTMLElement;
  private aLabel = h('span', { class: 'tc-a-label' });
  private toolImg = h('img', { class: 'icon', alt: '' });
  private toolDur = h('div', { class: 'tc-dur' }, h('div'));
  readonly placeBar: HTMLElement;
  private placeOk: HTMLButtonElement;
  private tracks = new Map<number, Track>();
  private stickId: number | null = null;
  private lastA = '';
  private lastTool = '';
  /** touch is the input in use (keyboard / gamepad use hides the controls until the next touch) */
  active = touchCapable();

  constructor(private app: App, root: HTMLElement) {
    const press = (cmds: Command[], hold?: (down: boolean) => void, cls = '', label: (HTMLElement | string)[] = [], aria = '') => {
      const b = h('button', { class: `tc-btn ${cls}`, 'aria-label': aria }, ...label);
      b.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.touched();
        for (const c of cmds) app.input.push(c);
        hold?.(true);
        b.classList.add('down');
      });
      const up = (e: Event) => {
        e.preventDefault();
        hold?.(false);
        b.classList.remove('down');
      };
      b.addEventListener('touchend', up);
      b.addEventListener('touchcancel', up);
      // a mouse or stylus on a touch screen still works
      b.addEventListener('click', () => {
        for (const c of cmds) app.input.push(c);
      });
      return b;
    };
    const a = press(['action', 'confirm'], (d) => (app.input.touch.action = d), 'tc-a', [h('span', { class: 'tc-a-dot' }, 'A'), this.aLabel], 'Action');
    const run = press([], (d) => (app.input.touch.run = d), 'tc-run', [h('span', { class: 'tc-ico' }, '💨'), h('span', { class: 'tc-cap' }, 'Run')], 'Run');
    const tool = h('button', { class: 'tc-btn tc-tool', 'aria-label': 'Tools' }, this.toolImg, this.toolDur, h('span', { class: 'tc-cap' }, 'Tools'));
    const openRing = (e: Event) => {
      e.preventDefault();
      this.touched();
      app.panels.toolRing?.();
    };
    tool.addEventListener('touchend', openRing);
    tool.addEventListener('click', openRing);
    const bag = press(['inventory'], undefined, 'tc-bag', [h('span', { class: 'tc-ico' }, '🎒'), h('span', { class: 'tc-cap' }, 'Bag')], 'Pockets');
    const pad = press(['phone'], undefined, 'tc-pad', [h('span', { class: 'tc-ico' }, '📱')], 'Glowpad');
    const menu = h('button', { class: 'tc-btn tc-menu', 'aria-label': 'Menu' }, h('span', { class: 'tc-ico' }, '☰'));
    const openMenu = (e: Event) => {
      e.preventDefault();
      this.touched();
      app.openPause();
    };
    menu.addEventListener('touchend', openMenu);
    menu.addEventListener('click', openMenu);
    this.cluster = h('div', { class: 'tc-cluster' }, bag, tool, run, a);
    this.topBar = h('div', { class: 'tc-top' }, pad, menu);
    this.placeOk = press(['action'], undefined, 'tc-place-ok', ['✔ Place'], 'Place here');
    this.placeBar = h('div', { class: 'tc-place' }, press(['back'], undefined, 'tc-place-no', ['✕ Cancel'], 'Cancel'), this.placeOk);
    this.el = h('div', { class: 'touch' }, this.zone, this.home, this.stick, this.cluster, this.topBar, this.placeBar);
    root.appendChild(this.el);

    this.zone.addEventListener('touchstart', (e) => this.start(e), { passive: false });
    this.zone.addEventListener('touchmove', (e) => this.move(e), { passive: false });
    this.zone.addEventListener('touchend', (e) => this.end(e), { passive: false });
    this.zone.addEventListener('touchcancel', (e) => this.end(e, true), { passive: false });
    // any touch makes touch the current input; the keyboard or a gamepad hides the controls
    window.addEventListener('touchstart', () => this.touched(), { capture: true, passive: true });
    if (this.active) app.input.lastDevice = 'touch';
    document.documentElement.classList.toggle('touch-ui', this.active);
    this.update();
  }

  private touched(): void {
    this.active = true;
    document.documentElement.classList.add('touch-ui');
    this.app.input.lastDevice = 'touch';
    this.app.audio.unlock();
  }

  /** Fishing: while a line is out, the whole screen is the A button. */
  private fishing(): boolean {
    const g = this.app.game;
    return !!g && g.state.player.location === 'island' && !!fishingRT(g).cast;
  }

  private start(e: TouchEvent): void {
    e.preventDefault();
    this.touched();
    for (const t of Array.from(e.changedTouches)) {
      // fishing, or a second finger while steering: it's the A button
      if (this.fishing() || this.stickId !== null) {
        this.tracks.set(t.identifier, { id: t.identifier, sx: t.clientX, sy: t.clientY, t0: performance.now(), mode: 'hold' });
        this.app.input.push('action');
        this.app.input.touch.action = true;
        continue;
      }
      this.tracks.set(t.identifier, { id: t.identifier, sx: t.clientX, sy: t.clientY, t0: performance.now(), mode: 'pending' });
    }
  }

  private move(e: TouchEvent): void {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      const tr = this.tracks.get(t.identifier);
      if (!tr || tr.mode === 'hold') continue;
      const dx = t.clientX - tr.sx, dy = t.clientY - tr.sy;
      if (tr.mode === 'pending' && Math.hypot(dx, dy) > TAP_MOVE && this.stickId === null) {
        tr.mode = 'stick';
        this.stickId = tr.id;
        this.app.tapMove?.cancel();
        this.stick.style.left = `${tr.sx}px`;
        this.stick.style.top = `${tr.sy}px`;
        this.stick.classList.add('on');
      }
      if (tr.mode === 'stick') this.steer(dx, dy);
    }
  }

  private end(e: TouchEvent, cancel = false): void {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      const tr = this.tracks.get(t.identifier);
      this.tracks.delete(t.identifier);
      if (!tr) continue;
      if (tr.mode === 'hold') {
        if (![...this.tracks.values()].some((x) => x.mode === 'hold')) this.app.input.touch.action = false;
      } else if (tr.mode === 'stick') {
        this.stickId = null;
        this.steer(0, 0);
        this.stick.classList.remove('on');
      } else if (!cancel && performance.now() - tr.t0 < TAP_MS) this.app.tap(t.clientX, t.clientY);
    }
  }

  /** Stick vector → movement: small push sneaks, bigger push walks, the edge runs. */
  private steer(dx: number, dy: number): void {
    const d = Math.min(STICK_R, Math.hypot(dx, dy));
    const m = d / STICK_R;
    const ang = Math.atan2(dy, dx);
    this.knob.style.transform = `translate(${Math.cos(ang) * d}px, ${Math.sin(ang) * d}px)`;
    const tc = this.app.input.touch;
    if (m < 0.12) {
      tc.x = tc.z = 0;
      tc.sneak = tc.run = false;
      this.stick.dataset.mode = '';
      this.stickLabel.textContent = '';
      return;
    }
    const sneak = m < SNEAK;
    const run = m >= RUN;
    // full speed in each zone (the zone, not the exact push, decides the speed)
    const k = sneak ? 1 : 0.55 + ((m - SNEAK) / (1 - SNEAK)) * 0.45;
    tc.x = Math.cos(ang) * k;
    tc.z = Math.sin(ang) * k;
    tc.sneak = sneak;
    tc.run = run;
    const mode = sneak ? 'sneak' : run ? 'run' : 'walk';
    if (this.stick.dataset.mode !== mode) {
      this.stick.dataset.mode = mode;
      this.stickLabel.textContent = sneak ? '🐾 Sneak' : run ? '💨 Run' : '';
    }
  }

  update(): void {
    const app = this.app;
    const g = app.game;
    const s = app.settings.touch;
    if (app.input.lastDevice !== 'touch' && this.tracks.size === 0) this.active = false;
    const want = s === 'on' || (s === 'auto' && this.active);
    const show = !!g && app.mode === 'game' && want && !app.ui.modalOpen && g.mode !== 'cutscene' && !app.view.festival.active;
    this.el.style.display = show ? '' : 'none';
    document.documentElement.classList.toggle('touch-play', show);
    if (!show) {
      if (this.stickId !== null || this.tracks.size) {
        this.tracks.clear();
        this.stickId = null;
        this.steer(0, 0);
        this.stick.classList.remove('on');
        app.input.touch.action = false;
      }
      return;
    }
    app.hud.device = 'touch';
    // the A button says what it will do
    const inter = g.mode === 'play' && !g.action ? g.resolve() : null;
    const fish = this.fishing() ? fishingRT(g).cast!.phase : '';
    const label = fish === 'reel' ? 'Reel!' : fish === 'bite' ? 'Hook!' : fish ? 'Wait…' : inter ? inter.label.split(/[ (]/)[0]! : '';
    if (label !== this.lastA) {
      this.lastA = label;
      this.aLabel.textContent = label;
      this.aLabel.style.display = label ? '' : 'none';
    }
    // the tool button shows what's in your hand
    const t = equippedTool(g);
    const key = t ? `${t.s.id}|${t.s.dur}` : 'none';
    if (key !== this.lastTool) {
      this.lastTool = key;
      if (t) {
        this.toolImg.src = iconURL(t.s.id);
        this.toolImg.style.display = '';
        const def = item(t.s.id);
        const pct = def.tool && def.tool.durability > 0 && t.s.dur !== undefined ? Math.max(0, Math.min(1, t.s.dur / def.tool.durability)) : -1;
        this.toolDur.style.display = pct < 0 ? 'none' : '';
        (this.toolDur.firstChild as HTMLElement).style.width = `${pct * 100}%`;
        (this.toolDur.firstChild as HTMLElement).style.background = pct < 0.25 ? '#f2a07b' : '#8fd18a';
      } else {
        this.toolImg.style.display = 'none';
        this.toolDur.style.display = 'none';
      }
      this.el.querySelector('.tc-tool')?.classList.toggle('empty', !t);
    }
    // placing a home, bridge or ramp: big Place / Cancel buttons
    const pl = placementRT(g) as { valid: boolean } | null;
    this.placeBar.style.display = pl ? '' : 'none';
    if (pl) this.placeOk.disabled = !pl.valid;
    this.home.style.display = this.stickId === null && !pl ? '' : 'none';
  }
}
