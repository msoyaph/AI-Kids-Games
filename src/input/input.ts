/**
 * Unified input: keyboard, touch (on-screen joystick + buttons), mouse drag and gamepad all
 * feed one simple state: a steering vector plus Boost and Action buttons. Polled once per
 * fixed logic step; "pressed" flags are true for exactly one step.
 */
export interface InputState {
  x: number;
  y: number;
  boost: boolean;
  boostPressed: boolean;
  action: boolean;
  actionPressed: boolean;
  /** Platformer jump: boost button, Space, or Up/W on a keyboard. */
  jumpPressed: boolean;
  jump: boolean;
  pausePressed: boolean;
  /** Menu navigation edges (keyboard arrows / d-pad / stick flicks). */
  navX: number;
  navY: number;
  confirmPressed: boolean;
  backPressed: boolean;
  /** True if anything was pressed this step. */
  anyPressed: boolean;
}

const KEY_LEFT = new Set(['ArrowLeft', 'KeyA']);
const KEY_RIGHT = new Set(['ArrowRight', 'KeyD']);
const KEY_UP = new Set(['ArrowUp', 'KeyW']);
const KEY_DOWN = new Set(['ArrowDown', 'KeyS']);
const KEY_BOOST = new Set(['Space', 'ShiftLeft', 'ShiftRight', 'KeyK']);
const KEY_ACTION = new Set(['KeyE', 'Enter', 'NumpadEnter', 'KeyJ']);
const KEY_PAUSE = new Set(['Escape', 'KeyP']);

export type InputSource = 'keyboard' | 'touch' | 'gamepad' | 'mouse';

export class Input {
  readonly state: InputState = {
    x: 0, y: 0, boost: false, boostPressed: false, action: false, actionPressed: false, jumpPressed: false, jump: false,
    pausePressed: false, navX: 0, navY: 0, confirmPressed: false, backPressed: false, anyPressed: false,
  };
  /** Touch/mouse joystick and buttons write here. */
  readonly touch = { x: 0, y: 0, boost: false, action: false, boostLatch: false, actionLatch: false };
  lastSource: InputSource = 'keyboard';
  private keys = new Set<string>();
  private latched = new Set<string>();
  private prevPad = { boost: false, action: false, pause: false, back: false, navX: 0, navY: 0 };
  private prevJumpKey = false;
  enabled = true;
  readonly listeners: Array<(source: InputSource) => void> = [];

  constructor() {
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('pointerdown', (e) => this.setSource(e.pointerType === 'touch' ? 'touch' : 'mouse'), { capture: true });
  }

  private setSource(src: InputSource): void {
    if (this.lastSource === src) return;
    this.lastSource = src;
    for (const fn of this.listeners) fn(src);
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    const code = e.code;
    if (down) {
      if (!this.keys.has(code)) this.latched.add(code);
      this.keys.add(code);
      this.setSource('keyboard');
      // Keep the page from scrolling or the browser from acting on game keys.
      if (KEY_BOOST.has(code) || KEY_LEFT.has(code) || KEY_RIGHT.has(code) || KEY_UP.has(code) || KEY_DOWN.has(code)) {
        if (!(target && target.tagName === 'BUTTON' && (code === 'Space' || code === 'Enter'))) e.preventDefault();
      }
    } else {
      this.keys.delete(code);
    }
  }

  private held(set: Set<string>): boolean {
    for (const k of set) if (this.keys.has(k)) return true;
    return false;
  }

  private tapped(set: Set<string>): boolean {
    for (const k of set) if (this.latched.has(k)) return true;
    return false;
  }

  /** Called once per logic step. */
  poll(): void {
    const s = this.state;
    const prevBoost = s.boost;
    const prevAction = s.action;
    let x = 0;
    let y = 0;
    if (this.held(KEY_LEFT)) x -= 1;
    if (this.held(KEY_RIGHT)) x += 1;
    if (this.held(KEY_UP)) y -= 1;
    if (this.held(KEY_DOWN)) y += 1;
    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    let boost = this.held(KEY_BOOST);
    let action = this.held(KEY_ACTION);
    let boostTap = this.tapped(KEY_BOOST);
    let actionTap = this.tapped(KEY_ACTION);
    let pauseTap = this.tapped(KEY_PAUSE);
    let navX = (this.tapped(KEY_LEFT) ? -1 : 0) + (this.tapped(KEY_RIGHT) ? 1 : 0);
    let navY = (this.tapped(KEY_UP) ? -1 : 0) + (this.tapped(KEY_DOWN) ? 1 : 0);
    let backTap = this.latched.has('Escape') || this.latched.has('Backspace');
    const jumpKey = this.held(KEY_UP);
    let jumpTap = this.tapped(KEY_UP);

    // Touch / mouse joystick.
    const t = this.touch;
    if (t.x !== 0 || t.y !== 0) {
      x = t.x;
      y = t.y;
    }
    if (t.boost) boost = true;
    if (t.action) action = true;
    if (t.boostLatch) boostTap = true;
    if (t.actionLatch) actionTap = true;
    t.boostLatch = false;
    t.actionLatch = false;

    // Gamepad.
    const pad = readGamepad();
    if (pad) {
      if (Math.abs(pad.x) > 0 || Math.abs(pad.y) > 0) {
        x = pad.x;
        y = pad.y;
        this.setSource('gamepad');
      }
      if (pad.boost) boost = true;
      if (pad.action) action = true;
      if (pad.boost && !this.prevPad.boost) {
        boostTap = true;
        this.setSource('gamepad');
      }
      if (pad.action && !this.prevPad.action) {
        actionTap = true;
        this.setSource('gamepad');
      }
      if (pad.pause && !this.prevPad.pause) pauseTap = true;
      if (pad.back && !this.prevPad.back) backTap = true;
      const pnx = pad.x > 0.6 ? 1 : pad.x < -0.6 ? -1 : 0;
      const pny = pad.y > 0.6 ? 1 : pad.y < -0.6 ? -1 : 0;
      if (pnx !== this.prevPad.navX && pnx !== 0) navX = pnx;
      if (pny !== this.prevPad.navY && pny !== 0) {
        navY = pny;
        if (pny < 0) jumpTap = jumpTap || false;
      }
      this.prevPad = { boost: pad.boost, action: pad.action, pause: pad.pause, back: pad.back, navX: pnx, navY: pny };
    }

    if (!this.enabled) {
      x = 0;
      y = 0;
      boost = action = boostTap = actionTap = jumpTap = false;
    }
    s.x = x;
    s.y = y;
    s.boost = boost;
    s.action = action;
    s.boostPressed = boostTap || (boost && !prevBoost);
    s.actionPressed = actionTap || (action && !prevAction);
    s.jump = boost || jumpKey;
    s.jumpPressed = s.boostPressed || jumpTap || (jumpKey && !this.prevJumpKey);
    this.prevJumpKey = jumpKey;
    s.pausePressed = pauseTap;
    s.navX = navX;
    s.navY = navY;
    s.confirmPressed = actionTap || boostTap;
    s.backPressed = backTap;
    s.anyPressed = s.boostPressed || s.actionPressed || pauseTap || navX !== 0 || navY !== 0;
    this.latched.clear();
  }

  /** Forget held keys (e.g. after a scene change). */
  reset(): void {
    this.keys.clear();
    this.latched.clear();
    this.touch.x = this.touch.y = 0;
    this.touch.boost = this.touch.action = false;
  }
}

interface PadState {
  x: number;
  y: number;
  boost: boolean;
  action: boolean;
  pause: boolean;
  back: boolean;
}

let gamepadBlocked = false;
const padOut: PadState = { x: 0, y: 0, boost: false, action: false, pause: false, back: false };

/** Reads the first connected gamepad. Fails quietly if the Gamepad API is blocked (e.g. iframe policy). */
export function readGamepad(): PadState | null {
  if (gamepadBlocked || typeof navigator === 'undefined' || !navigator.getGamepads) return null;
  let pads: (Gamepad | null)[];
  try {
    pads = navigator.getGamepads();
  } catch {
    gamepadBlocked = true;
    return null;
  }
  for (const gp of pads) {
    if (!gp || !gp.connected) continue;
    const dz = 0.22;
    let x = gp.axes[0] ?? 0;
    let y = gp.axes[1] ?? 0;
    if (Math.abs(x) < dz) x = 0;
    if (Math.abs(y) < dz) y = 0;
    const b = (i: number) => !!gp.buttons[i]?.pressed;
    if (b(14)) x = -1;
    if (b(15)) x = 1;
    if (b(12)) y = -1;
    if (b(13)) y = 1;
    padOut.x = x;
    padOut.y = y;
    padOut.boost = b(0) || b(7) || b(5);
    padOut.action = b(2) || b(3) || b(6) || b(4);
    padOut.back = b(1);
    padOut.pause = b(9) || b(8);
    return padOut;
  }
  return null;
}
