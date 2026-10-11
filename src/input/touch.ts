// Glass touch controller: an analog joystick (floating by default, or fixed) or glass ◀ ▶ pads, or tilt, plus glass
// DRIFT / ITEM / BRAKE / GO / look-back / pause buttons. Every control owns its own finger (PointerRouter), so
// steering, drifting and using an item at the same time always works. Design: docs/touch/design.md.
import type { ItemId } from '../data/types';
import { ITEM_ICONS } from '../ui/icons';
import { PointerRouter, type PointerOwner } from './touch/pointers';
import { clampKnob, floatingOrigin, stickResponse } from './touch/stick';
import { SCALE_MAX, SCALE_MIN, defaultLayout, hudRects, solveLayout, stickZone, targetSize, touchHudScale, type ControlId, type Insets, type Layout, type Rect, type Viewport } from './touch/layout';
import { DEFAULT_TOUCH_CONFIG, layoutFor, type TouchConfig, type TouchSteerMode } from './touch/config';

export interface TouchState {
  steer: number;
  accel: boolean;
  brake: boolean;
  drift: boolean;
  item: boolean;
  aimBack: boolean;
  lookBack: boolean;
  pause: boolean;
}

export type { TouchConfig, TouchSteerMode } from './touch/config';
export { DEFAULT_TOUCH_CONFIG } from './touch/config';

const TIER_WORDS = ['', 'MINI ›', 'SUPER ››', 'ULTRA ›››'];
/** Knob travel as a fraction of the base diameter. */
const TRAVEL = 0.3;

const BUTTONS: Array<{ id: Exclude<ControlId, 'stick'>; tc: string; label: string; icon: string; aria: string }> = [
  { id: 'drift', tc: 'drift', label: 'DRIFT', icon: '✨', aria: 'Drift' },
  { id: 'item', tc: 'item', label: 'ITEM', icon: '🎁', aria: 'Use item (swipe down to throw back)' },
  { id: 'brake', tc: 'brake', label: 'BRAKE', icon: '⏹', aria: 'Brake' },
  { id: 'accel', tc: 'accel', label: 'GO', icon: '', aria: 'Accelerate' },
  { id: 'look', tc: 'look', label: '', icon: '👀', aria: 'Look behind' },
  { id: 'pause', tc: 'pause', label: '', icon: 'II', aria: 'Pause' },
];

/** The controls' DOM (also used, static, by the Settings preview). Every control carries `data-ctl` for the editor. */
export const CONTROLS_MARKUP = `
  <div class="tc-zone" aria-hidden="true"></div>
  <div class="tc-stick glass" data-ctl="stick" role="slider" aria-label="Steering joystick" aria-valuemin="-1" aria-valuemax="1" aria-valuenow="0">
    <span class="tc-ticks" aria-hidden="true"><i>‹</i><i>›</i></span>
    <div class="tc-trail"></div><div class="tc-trail t2"></div>
    <div class="tc-knob"></div>
    <div class="tc-badge"></div>
    <i class="tc-handle" aria-hidden="true"></i>
  </div>
  <div class="tc-pads" data-ctl="stick">
    <div class="tc-btn tc-left" aria-label="Steer left"><div class="glass face"><span class="ico">◀</span></div></div>
    <div class="tc-btn tc-right" aria-label="Steer right"><div class="glass face"><span class="ico">▶</span></div></div>
    <i class="tc-handle" aria-hidden="true"></i>
  </div>
  ${BUTTONS.map((b) => `<div class="tc-btn tc-${b.tc}" data-tc="${b.tc}" data-ctl="${b.id}" role="button" aria-label="${b.aria}"><div class="glass face"><i class="tint"></i><span class="ico">${b.icon}</span>${b.label ? `<span class="lbl">${b.label}</span>` : ''}<i class="ripple"></i></div><i class="tc-handle" aria-hidden="true"></i></div>`).join('')}
  <div class="tc-probe" aria-hidden="true"></div>
`;

/** Put every control of a `CONTROLS_MARKUP` root where layout `L` says (stick at its resting spot). */
export function positionControls(root: HTMLElement, L: Layout, zone: Rect): void {
  for (const b of BUTTONS) place(root.querySelector(`.tc-${b.tc}`) as HTMLElement, L[b.id].x, L[b.id].y, L[b.id].d);
  const s = L.stick;
  const stick = root.querySelector('.tc-stick') as HTMLElement;
  stick.style.width = stick.style.height = `${s.d}px`;
  stick.style.setProperty('--d', `${s.d}px`);
  stick.style.left = `${s.x - s.d / 2}px`;
  stick.style.top = `${s.y - s.d / 2}px`;
  // ◀ ▶ pads share the stick's spot
  const pads = root.querySelector('.tc-pads') as HTMLElement;
  const pd = Math.round(s.d * 0.8);
  const gap = Math.round(pd * 0.22);
  pads.style.left = `${s.x - pd - gap / 2}px`;
  pads.style.top = `${s.y - pd / 2}px`;
  pads.style.width = `${pd * 2 + gap}px`;
  pads.style.height = `${pd}px`;
  const [l, r] = [root.querySelector('.tc-left') as HTMLElement, root.querySelector('.tc-right') as HTMLElement];
  for (const p of [l, r]) {
    p.style.width = p.style.height = `${pd}px`;
    p.style.setProperty('--d', `${pd}px`);
  }
  r.style.left = `${pd + gap}px`;
  const z = root.querySelector('.tc-zone') as HTMLElement;
  Object.assign(z.style, { left: `${zone.x}px`, top: `${zone.y}px`, width: `${zone.w}px`, height: `${zone.h}px` });
}

export class TouchControls {
  readonly state: TouchState = { steer: 0, accel: false, brake: false, drift: false, item: false, aimBack: false, lookBack: false, pause: false };
  readonly root: HTMLDivElement;
  mode: TouchSteerMode = 'joystick';
  autoAccel = true;
  config: TouchConfig = { ...DEFAULT_TOUCH_CONFIG };
  /** Settings → HUD size (the item box the look button sits beside grows with it). */
  hudScale = 1;
  /** The layout in use (px), recomputed on show / resize / settings change. */
  layout: Layout | null = null;

  private readonly router = new PointerRouter();
  private readonly zone: HTMLDivElement;
  private readonly stick: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private readonly trails: HTMLDivElement[];
  private readonly badge: HTMLDivElement;
  private readonly pads: HTMLDivElement;
  private readonly leftPad: HTMLDivElement;
  private readonly rightPad: HTMLDivElement;
  private readonly btn = {} as Record<Exclude<ControlId, 'stick'>, HTMLDivElement>;
  private readonly itemIcon: HTMLSpanElement;
  private readonly itemLabel: HTMLSpanElement;
  private readonly probe: HTMLDivElement;
  private visible = false;
  private countdown = false;
  private tiltBase: number | null = null;
  private itemStartY = 0;
  // stick state
  private stickOwner: PointerOwner | null = null;
  private origin = { x: 0, y: 0 };
  private rest = { x: 0, y: 0 };
  private knobOffset = { x: 0, y: 0 };
  private last = { tier: -1, item: '' as string, rolling: false };
  private relayoutQueued = false;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'touch-controls gc-fake hidden';
    this.root.innerHTML = CONTROLS_MARKUP;
    parent.appendChild(this.root);
    const q = <T extends HTMLElement>(sel: string): T => this.root.querySelector(sel) as T;
    this.zone = q('.tc-zone');
    this.stick = q('.tc-stick');
    this.knob = q('.tc-knob');
    this.trails = [...this.root.querySelectorAll<HTMLDivElement>('.tc-trail')];
    this.badge = q('.tc-badge');
    this.pads = q('.tc-pads');
    this.leftPad = q('.tc-left');
    this.rightPad = q('.tc-right');
    this.probe = q('.tc-probe');
    for (const b of BUTTONS) this.btn[b.id] = q(`.tc-${b.tc}`);
    this.itemIcon = this.btn.item.querySelector('.ico') as HTMLSpanElement;
    this.itemLabel = this.btn.item.querySelector('.lbl') as HTMLSpanElement;

    // steering: floating zone, fixed stick, or the ◀ ▶ pads
    this.zone.addEventListener('pointerdown', (e) => this.stickDown(e, true));
    this.stick.addEventListener('pointerdown', (e) => this.stickDown(e, false));
    this.pads.addEventListener('pointerdown', this.padDown);
    // buttons
    this.bindHold('drift', (v) => (this.state.drift = v));
    this.bindHold('brake', (v) => (this.state.brake = v));
    this.bindHold('accel', (v) => (this.state.accel = v));
    this.bindHold('look', (v) => (this.state.lookBack = v));
    this.bindHold('pause', (v) => {
      if (v) this.state.pause = true;
    });
    this.bindHold(
      'item',
      (v) => {
        this.state.item = v;
        if (!v) setTimeout(() => (this.state.aimBack = false), 50);
        else this.state.aimBack = false;
      },
      (e) => {
        // swipe down on the item button to throw it backwards
        if (this.state.item) this.state.aimBack = e.clientY - this.itemStartY > 28;
      },
      (e) => (this.itemStartY = e.clientY),
    );
    // Block page gestures (scroll / zoom / long-press menus) over the controls.
    this.root.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('deviceorientation', this.onOrientation);
    window.addEventListener('resize', this.queueRelayout);
    window.addEventListener('orientationchange', this.queueRelayout);
  }

  // ------------------------------------------------------------------------------------------------ settings
  /** Apply Settings → Touch controls (+ HUD size). Re-lays out immediately if the controls are showing. */
  configure(config: TouchConfig, hudScale = this.hudScale): void {
    this.config = { ...config };
    this.hudScale = hudScale;
    const r = this.root.classList;
    r.toggle('gc-hc', config.highContrast);
    r.toggle('lefty', config.leftHanded);
    r.toggle('fixed', config.stick === 'fixed');
    this.root.style.setProperty('--tc-opacity', String(Math.min(1, Math.max(0.4, config.opacity))));
    if (this.visible) this.relayout();
  }

  /** Reduce effects: no shimmer, ripple, pulse or trail animation. */
  setCalm(on: boolean): void {
    this.root.classList.toggle('calm', on);
  }

  setMode(mode: TouchSteerMode): void {
    this.mode = mode;
    this.releaseSteer();
    this.state.steer = 0;
    this.tiltBase = null;
    this.root.classList.toggle('tilt', mode === 'tilt');
    this.root.classList.toggle('buttons', mode === 'buttons');
    this.root.classList.toggle('joystick', mode === 'joystick');
  }

  setAutoAccel(on: boolean): void {
    this.autoAccel = on;
    this.syncAccel();
  }

  /** During the countdown the GO button is shown (with a glass pulse) so touch players can try a rocket start. */
  setCountdown(on: boolean): void {
    if (this.countdown === on) return;
    this.countdown = on;
    this.syncAccel();
  }

  private syncAccel(): void {
    const show = !this.autoAccel || this.countdown;
    this.btn.accel.classList.toggle('off', !show);
    this.btn.accel.classList.toggle('pulse', this.autoAccel && this.countdown);
  }

  /** Race feedback inside the glass: drift tier on the stick ring (colour + chevrons + word), held item icon. */
  setRaceState(driftTier: number, item: ItemId | null, rolling: boolean): void {
    if (this.last.tier !== driftTier) {
      this.last.tier = driftTier;
      this.stick.classList.remove('tier1', 'tier2', 'tier3');
      this.pads.classList.remove('tier1', 'tier2', 'tier3');
      if (driftTier > 0) {
        this.stick.classList.add(`tier${driftTier}`);
        this.pads.classList.add(`tier${driftTier}`);
      }
      this.badge.textContent = TIER_WORDS[driftTier] ?? '';
    }
    const key = rolling ? '?' : item ?? '';
    if (this.last.item !== key) {
      this.last.item = key;
      this.btn.item.classList.toggle('has', !!item && !rolling);
      this.btn.item.classList.toggle('rolling', rolling);
      this.itemIcon.innerHTML = rolling ? '…' : item ? ITEM_ICONS[item] : '🎁';
      if (this.itemLabel) this.itemLabel.style.display = item && !rolling ? 'none' : '';
    }
  }

  show(on: boolean): void {
    if (this.visible === on) return;
    this.visible = on;
    this.root.classList.toggle('hidden', !on);
    if (on) this.relayout();
    else this.reset();
  }

  get shown(): boolean {
    return this.visible;
  }

  reset(): void {
    this.router.releaseAll();
    const s = this.state;
    s.steer = 0;
    s.accel = s.brake = s.drift = s.item = s.aimBack = s.lookBack = s.pause = false;
    this.root.querySelectorAll('.down').forEach((el) => el.classList.remove('down'));
    this.setKnob(0, 0, false);
    this.stick.classList.remove('active');
    this.placeStick(this.rest.x, this.rest.y);
  }

  consumePause(): boolean {
    const p = this.state.pause;
    this.state.pause = false;
    return p;
  }

  // ------------------------------------------------------------------------------------------------ layout
  private readonly queueRelayout = (): void => {
    if (!this.visible || this.relayoutQueued) return;
    this.relayoutQueued = true;
    requestAnimationFrame(() => {
      this.relayoutQueued = false;
      if (this.visible) this.relayout();
    });
  };

  /** Viewport + safe-area insets (read once per layout, never per frame). */
  viewport(): Viewport {
    const r = this.root.getBoundingClientRect();
    const cs = getComputedStyle(this.probe);
    const px = (v: string): number => parseFloat(v) || 0;
    const safe: Insets = { l: px(cs.paddingLeft), t: px(cs.paddingTop), r: px(cs.paddingRight), b: px(cs.paddingBottom) };
    const h = r.height || window.innerHeight;
    return { w: r.width || window.innerWidth, h, safe, hudScale: touchHudScale(this.hudScale, h) };
  }

  /** The default layout for these settings (sizes the editor scales from). */
  defaultFor(vp = this.viewport()): Layout {
    return defaultLayout(vp, this.config.size, this.config.leftHanded);
  }

  /** The layout these settings would produce right now: the player's edited layout for this orientation, or the
   * default — always made legal (safe area, off the HUD, no overlaps). */
  computeLayout(vp = this.viewport()): Layout {
    return layoutFor(vp, this.config, this.hudRects(vp));
  }

  /** The race HUD's real boxes when it's on screen (exact), otherwise the layout model's estimate. */
  hudRects(vp: Viewport): Rect[] {
    const hud = document.querySelector('.hud.touch');
    if (!hud) return hudRects(vp, this.config.leftHanded);
    const me = this.root.getBoundingClientRect();
    const out: Rect[] = [];
    for (const sel of ['.hud-tl', '.hud-tr .hud-item', '.hud-minimap', '.hud-br']) {
      const el = hud.querySelector(sel);
      const b = el?.getBoundingClientRect();
      if (b && b.width > 0 && b.height > 0) out.push({ x: b.left - me.left, y: b.top - me.top, w: b.width, h: b.height });
    }
    return out.length ? out : hudRects(vp, this.config.leftHanded);
  }

  relayout(): void {
    const vp = this.viewport();
    this.apply(this.editing ? this.editing.layout : this.computeLayout(vp), vp);
  }

  /** Position everything for layout L (the stick's spot is also the floating stick's resting "ghost" spot). */
  private apply(L: Layout, vp = this.viewport()): void {
    this.layout = L;
    this.rest = { x: L.stick.x, y: L.stick.y };
    positionControls(this.root, L, stickZone(vp, this.config.leftHanded));
  }

  // ------------------------------------------------------------------------------------------------ layout editor
  private editing: { layout: Layout; onChange: (L: Layout, blocked: boolean) => void } | null = null;
  /** The editor's toolbar steps out of the way while a control is being dragged. */
  onEditDrag?: (dragging: boolean) => void;

  get isEditing(): boolean {
    return !!this.editing;
  }

  /**
   * Edit layout: drag a control to move it, drag its corner handle to resize it (0.8–1.4×). The others make room;
   * nothing may leave the safe area, cover the HUD or overlap. `onChange` reports each change (and whether the
   * finger is asking for a spot that isn't allowed, so the editor can flash it).
   */
  startEditing(onChange: (L: Layout, blocked: boolean) => void, from?: Layout): void {
    this.releaseSteer();
    this.reset();
    const L = from ?? this.computeLayout();
    this.editing = { layout: L, onChange };
    this.root.classList.add('editing');
    this.root.addEventListener('pointerdown', this.editDown, { capture: true });
    this.apply(L);
  }

  stopEditing(): void {
    if (!this.editing) return;
    this.editing = null;
    this.root.classList.remove('editing');
    this.root.removeEventListener('pointerdown', this.editDown, { capture: true });
    this.root.querySelectorAll('.selected, .blocked').forEach((el) => el.classList.remove('selected', 'blocked'));
    if (this.visible) this.relayout();
  }

  /** The layout being edited. */
  get editedLayout(): Layout | null {
    return this.editing?.layout ?? null;
  }

  private readonly editDown = (e: PointerEvent): void => {
    const ed = this.editing;
    const t = e.target as HTMLElement;
    const ctlEl = t.closest('[data-ctl]') as HTMLElement | null;
    if (!ed || !ctlEl) return;
    // in edit mode a control never acts (no drifting, no pausing): it only moves
    e.preventDefault();
    e.stopPropagation();
    const id = ctlEl.dataset.ctl as ControlId;
    const resize = t.classList.contains('tc-handle');
    const vp = this.viewport();
    const hud = this.hudRects(vp);
    const def = this.defaultFor(vp)[id].d;
    const start = { ...ed.layout[id] };
    const off = { x: e.clientX - start.x, y: e.clientY - start.y };
    const startDist = Math.max(10, Math.hypot(e.clientX - start.x, e.clientY - start.y));
    this.root.querySelectorAll('.selected').forEach((el) => el.classList.remove('selected'));
    this.root.querySelectorAll(`[data-ctl="${id}"]`).forEach((el) => el.classList.add('selected'));
    const update = (ev: PointerEvent, final: boolean): void => {
      const want = { ...ed.layout[id] };
      if (resize) {
        const k = Math.hypot(ev.clientX - start.x, ev.clientY - start.y) / startDist;
        want.d = Math.round(Math.min(def * SCALE_MAX, Math.max(def * SCALE_MIN, start.d * k)));
      } else {
        want.x = ev.clientX - off.x;
        want.y = ev.clientY - off.y;
      }
      // while dragging the moved control is pinned (the others make room); on release everything settles
      const solved = solveLayout({ ...ed.layout, [id]: want }, vp, hud, final ? [] : [id]);
      const got = solved.layout[id];
      const blocked = Math.hypot(got.x - want.x, got.y - want.y) > 6 || got.d !== want.d;
      this.root.querySelectorAll(`[data-ctl="${id}"]`).forEach((el) => el.classList.toggle('blocked', blocked && !final));
      ed.layout = solved.layout;
      this.apply(ed.layout, vp);
      ed.onChange(ed.layout, blocked);
    };
    this.onEditDrag?.(true);
    this.router.claim(
      e,
      {
        move: (ev) => update(ev, false),
        up: (ev) => {
          if (ev) update(ev, true);
          this.onEditDrag?.(false);
        },
      },
      ctlEl,
    );
  };

  private placeStick(x: number, y: number): void {
    const d = this.layout?.stick.d ?? 132;
    this.stick.style.left = `${x - d / 2}px`;
    this.stick.style.top = `${y - d / 2}px`;
  }

  // ------------------------------------------------------------------------------------------------ joystick
  private stickDown(e: PointerEvent, fromZone: boolean): void {
    if (this.mode !== 'joystick' || !this.layout) return;
    const floating = this.config.stick === 'floating';
    if (fromZone !== floating) return;
    e.preventDefault();
    // one finger per stick: a second finger in the zone is ignored
    if (this.stickOwner) return;
    const owner: PointerOwner = {
      move: (ev) => this.stickMove(ev),
      up: () => this.releaseSteer(),
    };
    if (!this.router.claim(e, owner, fromZone ? this.zone : this.stick)) return;
    this.stickOwner = owner;
    const d = this.layout.stick.d;
    if (floating) {
      const vp = this.viewport();
      const o = floatingOrigin(e.clientX, e.clientY, d / 2, { left: vp.safe.l + 4, top: vp.safe.t + 4, right: vp.w - vp.safe.r - 4, bottom: vp.h - vp.safe.b - 4 });
      this.origin = o;
      this.placeStick(o.x, o.y);
    } else this.origin = { x: this.layout.stick.x, y: this.layout.stick.y };
    this.stick.classList.add('active');
    this.stickMove(e);
  }

  private stickMove(e: PointerEvent): void {
    const d = this.layout?.stick.d ?? 132;
    const travel = d * TRAVEL;
    const k = clampKnob(e.clientX - this.origin.x, e.clientY - this.origin.y, travel);
    this.state.steer = stickResponse(k.x, travel);
    this.setKnob(k.x, k.y, true);
  }

  private setKnob(x: number, y: number, held: boolean): void {
    const travel = (this.layout?.stick.d ?? 132) * TRAVEL;
    this.knobOffset = { x, y };
    this.knob.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    this.knob.style.setProperty('--kx', (x / travel).toFixed(2));
    this.knob.style.setProperty('--ky', (y / travel).toFixed(2));
    this.knob.classList.toggle('held', held);
    this.stick.setAttribute('aria-valuenow', this.state.steer.toFixed(2));
  }

  /** Thumb lifted (or controls hidden): the knob glides home leaving a short fading trail. */
  private releaseSteer(): void {
    if (this.stickOwner) {
      this.stickOwner = null;
      const { x, y } = this.knobOffset;
      if (Math.hypot(x, y) > 6 && !this.root.classList.contains('calm')) {
        this.trails.forEach((t, i) => {
          const f = i === 0 ? 1 : 0.5;
          t.style.transform = `translate(${(x * f).toFixed(1)}px, ${(y * f).toFixed(1)}px)`;
          t.classList.remove('fade');
          void t.offsetWidth;
          t.classList.add('fade');
        });
      }
    }
    this.state.steer = 0;
    this.setKnob(0, 0, false);
    this.stick.classList.remove('active');
    if (this.config.stick === 'floating') this.placeStick(this.rest.x, this.rest.y);
    this.padOwner = null;
    this.leftPad.classList.remove('down');
    this.rightPad.classList.remove('down');
  }

  // ------------------------------------------------------------------------------------------------ ◀ ▶ pads
  private padOwner: PointerOwner | null = null;

  private readonly padDown = (e: PointerEvent): void => {
    if (this.mode !== 'buttons' || this.padOwner) return;
    e.preventDefault();
    const owner: PointerOwner = { move: (ev) => this.padSteer(ev.clientX), up: () => this.releaseSteer() };
    if (!this.router.claim(e, owner, this.pads)) return;
    this.padOwner = owner;
    this.padSteer(e.clientX);
  };

  /** Pads steer by how far the thumb is from the middle of the pair (rolling the thumb = analog steering). */
  private padSteer(clientX: number): void {
    const r = this.pads.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const v = (clientX - cx) / (r.width * 0.3);
    const dz = 0.12;
    const s = Math.abs(v) < dz ? 0 : Math.max(-1, Math.min(1, (v - Math.sign(v) * dz) / (1 - dz)));
    this.state.steer = s;
    this.leftPad.classList.toggle('down', s < -0.05);
    this.rightPad.classList.toggle('down', s > 0.05);
  }

  // ------------------------------------------------------------------------------------------------ buttons
  private bindHold(name: Exclude<ControlId, 'stick'>, set: (v: boolean) => void, onMove?: (e: PointerEvent) => void, onDown?: (e: PointerEvent) => void): void {
    const el = this.btn[name];
    let owner: PointerOwner | null = null;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (owner) return;
      const o: PointerOwner = {
        move: (ev) => onMove?.(ev),
        up: () => {
          owner = null;
          set(false);
          el.classList.remove('down');
        },
      };
      if (!this.router.claim(e, o, el)) return;
      owner = o;
      onDown?.(e);
      set(true);
      el.classList.remove('down');
      void el.offsetWidth; // restart the ripple
      el.classList.add('down');
    });
  }

  // ------------------------------------------------------------------------------------------------ tilt
  private onOrientation = (e: DeviceOrientationEvent): void => {
    if (this.mode !== 'tilt' || e.beta == null || e.gamma == null) return;
    const angle = (screen.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 90) as number;
    // In landscape, tilting the device like a steering wheel changes beta.
    let tilt = angle === 90 ? e.beta : angle === -90 || angle === 270 ? -e.beta : e.gamma;
    if (this.tiltBase === null) this.tiltBase = 0;
    tilt -= this.tiltBase;
    const dz = 3;
    const v = Math.abs(tilt) < dz ? 0 : (tilt - Math.sign(tilt) * dz) / 22;
    this.state.steer = Math.max(-1, Math.min(1, v));
  };

  /** iOS needs explicit permission from a user gesture. Returns whether tilt is available. */
  static async requestTiltPermission(): Promise<boolean> {
    const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    if (!DOE) return false;
    if (typeof DOE.requestPermission === 'function') {
      try {
        return (await DOE.requestPermission()) === 'granted';
      } catch {
        return false;
      }
    }
    return true;
  }
}

/** Position a control: the element is the touch target (≥ 48 px) centred on (x, y); the face is the visual size. */
function place(el: HTMLElement, x: number, y: number, d: number): void {
  const t = targetSize(d);
  el.style.left = `${x - t / 2}px`;
  el.style.top = `${y - t / 2}px`;
  el.style.width = el.style.height = `${t}px`;
  el.style.setProperty('--d', `${d}px`);
}
