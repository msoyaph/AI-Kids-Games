export type UiAction = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'pause' | 'debug';

const MOVE_KEYS: Record<string, [number, number]> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

const GAMEPAD_DEADZONE = 0.18;

function inIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Collects keyboard, mouse and gamepad input. Gameplay reads continuous state
 * (move vector, look delta, slide) plus edge-triggered jump; menus receive UiActions.
 */
export class InputManager {
  sensitivity = 1;
  invertY = false;
  /** 'lock' = pointer lock (top-level page); 'drag' = hold a mouse button to look. */
  mouseMode: 'lock' | 'drag';
  gameplay = false;
  onAction: ((a: UiAction) => void) | null = null;

  private keys = new Set<string>();
  private lookX = 0;
  private lookY = 0;
  private jumpQueued = false;
  private dragging = false;
  private padPrev: boolean[] = [];
  private padMove = { x: 0, y: 0 };
  private padLook = { x: 0, y: 0 };
  private padSlide = false;
  private padNavT = 0;
  private padNavDir = '';
  private gamepadOk = true;
  usingGamepad = false;
  wheel = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.mouseMode = inIframe() ? 'drag' : 'lock';
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => {
      this.wheel += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });
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

  private onKeyDown = (e: KeyboardEvent): void => {
    this.usingGamepad = false;
    if (e.code === 'F3') {
      e.preventDefault();
      if (!e.repeat) this.onAction?.('debug');
      return;
    }
    if (this.gameplay) {
      if (e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Tab') e.preventDefault();
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (!e.repeat) this.onAction?.('pause');
        return;
      }
      if (e.code === 'Space' && !e.repeat) this.jumpQueued = true;
    }
    this.keys.add(e.code);
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
    this.padSlide = false;
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
    this.padMove.x = ax(0);
    this.padMove.y = -ax(1);
    this.padLook.x = ax(2);
    this.padLook.y = ax(3);
    if (btn(12)) this.padMove.y = 1;
    if (btn(13)) this.padMove.y = -1;
    if (btn(14)) this.padMove.x = -1;
    if (btn(15)) this.padMove.x = 1;
    this.padSlide = btn(1) || btn(7) || btn(6) || btn(10);
    const anyInput = pad.buttons.some((b) => b.pressed) || pad.axes.some((a) => Math.abs(a) > 0.4);
    if (anyInput) this.usingGamepad = true;

    if (pressed(9) || pressed(8)) this.onAction?.('pause');
    if (this.gameplay) {
      if (pressed(0)) this.jumpQueued = true;
    } else {
      if (pressed(0)) this.onAction?.('confirm');
      if (pressed(1)) this.onAction?.('back');
      // directional navigation with repeat
      let dir = '';
      const mx = this.padMove.x;
      const my = this.padMove.y;
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

  /** Local move intent: x = strafe right, y = forward. Length ≤ 1. */
  move(out: { x: number; y: number }): void {
    let x = 0;
    let y = 0;
    for (const k of this.keys) {
      const m = MOVE_KEYS[k];
      if (m) {
        x += m[0];
        y += m[1];
      }
    }
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
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.keys.has('KeyC') || this.padSlide;
  }

  consumeJump(): boolean {
    const j = this.jumpQueued;
    this.jumpQueued = false;
    return j;
  }

  /** Look delta in radians since last call (mouse + gamepad + Q/E keys). */
  consumeLook(dt: number, out: { x: number; y: number }): void {
    const s = 0.0024 * this.sensitivity;
    let x = this.lookX * s;
    let y = this.lookY * s;
    this.lookX = this.lookY = 0;
    x += this.padLook.x * 2.8 * dt * this.sensitivity;
    y += this.padLook.y * 2.0 * dt * this.sensitivity;
    if (this.keys.has('KeyQ')) x -= 2.2 * dt;
    if (this.keys.has('KeyE')) x += 2.2 * dt;
    out.x = x;
    out.y = this.invertY ? -y : y;
  }

  clearTransient(): void {
    this.lookX = this.lookY = 0;
    this.jumpQueued = false;
    this.wheel = 0;
  }
}
