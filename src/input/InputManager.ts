import { inIframe, isTypingTarget } from '../core/env';
import { defaultBindings, FIXED_KEYS, lookup, type Bindings, type GameAction } from './actions';

export type UiAction = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'pause' | 'debug';

const GAMEPAD_DEADZONE = 0.18;

/** Menus always understand these, whatever the gameplay bindings are. */
const UI_KEYS: Record<string, UiAction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

/** What a remap capture got. */
export type Captured = { key: string } | { pad: number } | null;

/**
 * The one input system. A single keyboard listener routes every key: to the open menu
 * (navigation / hotkeys via `uiKey`) or to gameplay actions through the remappable bindings.
 * Mouse look, gamepads (analog sticks + bound buttons) and remap capture live here too.
 */
export class InputManager {
  sensitivity = 1;
  invertY = false;
  /** 'lock' = pointer lock (top-level page); 'drag' = hold a mouse button to look. */
  mouseMode: 'lock' | 'drag';
  gameplay = false;
  onAction: ((a: UiAction) => void) | null = null;
  /** A menu is open: it gets first look at keys (return true = handled). */
  uiKey: ((e: KeyboardEvent) => boolean) | null = null;
  /** Slide key toggles (latched until the slide ends) instead of hold. */
  slideToggle = false;
  /** Holding jump keeps hopping. */
  autoHop = false;

  private bindings: Bindings = defaultBindings();
  private keyActions = new Map<string, GameAction[]>();
  private padActions = new Map<number, GameAction[]>();
  private keys = new Set<string>();
  private lookX = 0;
  private lookY = 0;
  private jumpQueued = false;
  private dragging = false;
  private padPrev: boolean[] = [];
  private padMove = { x: 0, y: 0 };
  private padLook = { x: 0, y: 0 };
  private padHeld = new Set<GameAction>();
  private padNavT = 0;
  private padNavDir = '';
  private gamepadOk = true;
  private slideLatched = false;
  private capture: ((c: Captured) => void) | null = null;
  usingGamepad = false;
  wheel = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.mouseMode = inIframe() ? 'drag' : 'lock';
    this.setBindings(this.bindings);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.slideLatched = false;
    });
    canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => {
      this.wheel += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });
  }

  setBindings(b: Bindings): void {
    this.bindings = b;
    const t = lookup(b);
    this.keyActions = t.keyActions;
    this.padActions = t.padActions;
  }

  /**
   * Remapping: the next key (not Escape / F3) or gamepad button goes to `cb` instead of the
   * game. Escape cancels (cb(null)).
   */
  captureNext(cb: (c: Captured) => void): void {
    this.capture = cb;
    this.padPrev = [];
  }

  cancelCapture(): void {
    const cb = this.capture;
    this.capture = null;
    cb?.(null);
  }

  get capturing(): boolean {
    return this.capture !== null;
  }

  /** 'auto' picks drag-to-look inside iframes (pointer lock is often sandboxed away). */
  setMouseMode(mode: 'auto' | 'lock' | 'drag'): void {
    this.mouseMode = mode === 'auto' ? (inIframe() ? 'drag' : 'lock') : mode;
    if (this.mouseMode === 'drag') this.releaseLock();
  }

  get pointerLocked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  requestLock(): void {
    if (this.mouseMode !== 'lock' || this.pointerLocked) return;
    try {
      const r = this.canvas.requestPointerLock() as unknown;
      if (r && typeof (r as Promise<void>).catch === 'function') {
        (r as Promise<void>).catch(() => {
          /* user gesture / cooldown — fall back to drag silently */
        });
      }
    } catch {
      /* not allowed here */
    }
  }

  releaseLock(): void {
    try {
      if (document.pointerLockElement) document.exitPointerLock();
    } catch {
      /* ignore */
    }
  }

  private has(action: GameAction, code: string): boolean {
    return this.keyActions.get(code)?.includes(action) ?? false;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.usingGamepad = false;
    if (this.capture) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat) return;
      const cb = this.capture;
      this.capture = null;
      cb(e.code === 'Escape' || FIXED_KEYS.has(e.code) ? null : { key: e.code });
      return;
    }
    // typing into a text box (tuning panel number fields, copy/import boxes)
    if (isTypingTarget(e.target) && e.code !== 'F3') return;
    // a focused slider keeps its own arrow keys
    if (e.target instanceof HTMLInputElement && e.target.type === 'range' && e.code.startsWith('Arrow')) return;
    if (e.code === 'F3') {
      e.preventDefault();
      if (!e.repeat) this.onAction?.('debug');
      return;
    }
    if (this.gameplay) {
      if (e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Tab' || this.keyActions.has(e.code)) e.preventDefault();
      if (e.code === 'Escape' || this.has('pause', e.code)) {
        if (!e.repeat) this.onAction?.('pause');
        return;
      }
      if (!e.repeat) {
        if (this.has('jump', e.code)) this.jumpQueued = true;
        if (this.slideToggle && this.has('slide', e.code)) this.slideLatched = !this.slideLatched;
      }
      this.keys.add(e.code);
      return;
    }
    // menus: the open screen first (hotkeys, Escape), then arrow / bound-move navigation
    this.keys.add(e.code);
    if (this.uiKey?.(e)) return;
    let a: UiAction | undefined = UI_KEYS[e.code];
    if (!a) {
      if (this.has('moveUp', e.code)) a = 'up';
      else if (this.has('moveDown', e.code)) a = 'down';
      else if (this.has('moveLeft', e.code)) a = 'left';
      else if (this.has('moveRight', e.code)) a = 'right';
    }
    if (a) {
      e.preventDefault();
      this.onAction?.(a);
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onMouseDown = (e: MouseEvent): void => {
    this.usingGamepad = false;
    if (!this.gameplay) return;
    if (this.mouseMode === 'lock') this.requestLock();
    else this.dragging = true;
    e.preventDefault();
  };

  private onMouseUp = (): void => {
    this.dragging = false;
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.gameplay) return;
    const active = this.pointerLocked || (this.mouseMode === 'drag' && this.dragging);
    if (!active) return;
    // clamp absurd deltas some browsers emit on lock
    const dx = Math.max(-200, Math.min(200, e.movementX));
    const dy = Math.max(-200, Math.min(200, e.movementY));
    this.lookX += dx;
    this.lookY += dy;
  };

  /** Call once per rendered frame. Reads gamepads and emits menu actions. */
  poll(dt: number): void {
    this.padMove.x = this.padMove.y = 0;
    this.padLook.x = this.padLook.y = 0;
    this.padHeld.clear();
    if (!this.gamepadOk) return;
    let pads: (Gamepad | null)[] = [];
    try {
      pads = typeof navigator.getGamepads === 'function' ? Array.from(navigator.getGamepads()) : [];
    } catch {
      this.gamepadOk = false; // blocked by permissions policy (e.g. sandboxed iframe)
      return;
    }
    const pad = pads.find((p) => p && p.connected) ?? null;
    if (!pad) return;
    const ax = (i: number): number => {
      const v = pad.axes[i] ?? 0;
      return Math.abs(v) < GAMEPAD_DEADZONE ? 0 : (v - Math.sign(v) * GAMEPAD_DEADZONE) / (1 - GAMEPAD_DEADZONE);
    };
    const btn = (i: number): boolean => !!pad.buttons[i]?.pressed;
    const pressed = (i: number): boolean => btn(i) && !this.padPrev[i];
    if (this.capture) {
      for (let i = 0; i < pad.buttons.length; i++) {
        if (!pressed(i)) continue;
        const cb = this.capture;
        this.capture = null;
        cb({ pad: i });
        break;
      }
      this.padPrev = pad.buttons.map((b) => b.pressed);
      return;
    }
    for (let i = 0; i < pad.buttons.length; i++) {
      if (!btn(i)) continue;
      const acts = this.padActions.get(i);
      if (acts) for (const a of acts) this.padHeld.add(a);
    }
    this.padMove.x = ax(0);
    this.padMove.y = -ax(1);
    this.padLook.x = ax(2);
    this.padLook.y = ax(3);
    if (this.padHeld.has('moveUp')) this.padMove.y = 1;
    if (this.padHeld.has('moveDown')) this.padMove.y = -1;
    if (this.padHeld.has('moveLeft')) this.padMove.x = -1;
    if (this.padHeld.has('moveRight')) this.padMove.x = 1;
    const anyInput = pad.buttons.some((b) => b.pressed) || pad.axes.some((a) => Math.abs(a) > 0.4);
    if (anyInput) this.usingGamepad = true;

    const padPressed = (a: GameAction): boolean => (this.bindings[a].pad.some((i) => pressed(i)));
    if (padPressed('pause')) this.onAction?.('pause');
    if (this.gameplay) {
      if (padPressed('jump')) this.jumpQueued = true;
      if (this.slideToggle && padPressed('slide')) this.slideLatched = !this.slideLatched;
    } else {
      // menus: A / B are fixed so a remap can never lock you out of the menus
      if (pressed(0)) this.onAction?.('confirm');
      if (pressed(1)) this.onAction?.('back');
      // directional navigation with repeat (stick or d-pad)
      let dir = '';
      const mx = this.padMove.x || (btn(15) ? 1 : btn(14) ? -1 : 0);
      const my = this.padMove.y || (btn(12) ? 1 : btn(13) ? -1 : 0);
      if (Math.abs(my) > 0.5 && Math.abs(my) >= Math.abs(mx)) dir = my > 0 ? 'up' : 'down';
      else if (Math.abs(mx) > 0.5) dir = mx > 0 ? 'right' : 'left';
      if (dir && dir !== this.padNavDir) {
        this.onAction?.(dir as UiAction);
        this.padNavT = 0.4;
      } else if (dir) {
        this.padNavT -= dt;
        if (this.padNavT <= 0) {
          this.onAction?.(dir as UiAction);
          this.padNavT = 0.12;
        }
      }
      this.padNavDir = dir;
    }
    this.padPrev = pad.buttons.map((b) => b.pressed);
  }

  private keyHeld(a: GameAction): boolean {
    for (const k of this.bindings[a].keys) if (this.keys.has(k)) return true;
    return false;
  }

  private held(a: GameAction): boolean {
    return this.keyHeld(a) || this.padHeld.has(a);
  }

  /** Local move intent: x = strafe right, y = forward. Length ≤ 1 (sticks stay analog). */
  move(out: { x: number; y: number }): void {
    let x = 0;
    let y = 0;
    // keyboard here; the pad's stick / d-pad arrive in padMove
    if (this.keyHeld('moveUp')) y += 1;
    if (this.keyHeld('moveDown')) y -= 1;
    if (this.keyHeld('moveLeft')) x -= 1;
    if (this.keyHeld('moveRight')) x += 1;
    x = Math.max(-1, Math.min(1, x)) + this.padMove.x;
    y = Math.max(-1, Math.min(1, y)) + this.padMove.y;
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    out.x = x;
    out.y = y;
  }

  slideHeld(): boolean {
    return this.slideToggle ? this.slideLatched : this.held('slide');
  }

  /** The game reports that a slide ended: a toggled slide switches itself off. */
  slideEnded(): void {
    this.slideLatched = false;
  }

  jumpHeld(): boolean {
    return this.held('jump');
  }

  consumeJump(): boolean {
    const j = this.jumpQueued;
    this.jumpQueued = false;
    return j;
  }

  /** Look delta in radians since last call (mouse + right stick + turn keys / bumpers). */
  consumeLook(dt: number, out: { x: number; y: number }): void {
    const s = 0.0024 * this.sensitivity;
    let x = this.lookX * s;
    let y = this.lookY * s;
    this.lookX = this.lookY = 0;
    x += this.padLook.x * 2.8 * dt * this.sensitivity;
    y += this.padLook.y * 2.0 * dt * this.sensitivity;
    if (this.held('lookLeft')) x -= 2.2 * dt;
    if (this.held('lookRight')) x += 2.2 * dt;
    out.x = x;
    out.y = this.invertY ? -y : y;
  }

  clearTransient(): void {
    this.lookX = this.lookY = 0;
    this.jumpQueued = false;
    this.slideLatched = false;
    this.wheel = 0;
  }
}
