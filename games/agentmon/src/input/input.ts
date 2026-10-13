/**
 * One input layer for every device. Scenes ask for a held direction and for button presses
 * (A = talk/confirm, B = back/run, Menu); the most recent device wins, so touchscreen laptops
 * and controllers mix freely.
 *  - Keyboard: arrows/WASD move; Z, Space, Enter = A; X, Escape, Backspace = B; M, Tab = Menu.
 *  - Gamepad (standard mapping): stick or d-pad move; A = A; B = B; Start or Y = Menu.
 *  - Touch: the glass stick, big A/B buttons and a Menu button (ui/touch.ts), plus tap-to-move.
 *  - Mouse: click a spot to walk there (tap-to-move), click people to talk.
 * When a DOM menu is open, arrows/d-pad move the focus between its buttons and A presses them
 * (see ui/focus.ts); the game world doesn't see those presses.
 */
import type { Dir } from '../core/state';

export type Button = 'a' | 'b' | 'menu';
export type Device = 'keyboard' | 'gamepad' | 'touch' | 'mouse';

const KEY_DIR: Record<string, Dir> = { ArrowDown: 0, KeyS: 0, ArrowLeft: 1, KeyA: 1, ArrowRight: 2, KeyD: 2, ArrowUp: 3, KeyW: 3 };
const KEY_BTN: Record<string, Button> = { KeyZ: 'a', Space: 'a', Enter: 'a', NumpadEnter: 'a', KeyX: 'b', Escape: 'b', Backspace: 'b', KeyM: 'menu', Tab: 'menu' };

export class Input {
  /** Held directions, most recent last. */
  private held: Dir[] = [];
  private pressed = new Set<Button>();
  private down = new Set<Button>();
  /** Touch / gamepad analog stick (x right, y down), magnitude 0–1. */
  stick = { x: 0, y: 0 };
  padDir: Dir | null = null;
  device: Device = matchMedia?.('(pointer: coarse)').matches ? 'touch' : 'keyboard';
  /** A tap or click on the world (CSS pixels), for tap-to-move. */
  tap: { x: number; y: number } | null = null;
  /** True while a DOM menu has the keyboard (the world ignores keys). */
  uiFocus = false;
  private padPrev: boolean[] = [];
  /** The d-pad/stick direction last frame, for menu navigation (one move per press). */
  private navPrev: Dir | null = null;
  onDevice: ((d: Device) => void)[] = [];

  constructor() {
    addEventListener('keydown', e => {
      if (e.repeat && KEY_BTN[e.code]) return;
      const d = KEY_DIR[e.code];
      if (d !== undefined || KEY_BTN[e.code]) this.setDevice('keyboard');
      if (this.uiFocus) return;
      if (d !== undefined) {
        this.held = this.held.filter(h => h !== d);
        this.held.push(d);
        e.preventDefault();
      }
      const b = KEY_BTN[e.code];
      if (b) {
        if (!this.down.has(b)) this.pressed.add(b);
        this.down.add(b);
        if (b === 'menu' || e.code === 'Space' || e.code === 'Backspace') e.preventDefault();
      }
    });
    addEventListener('keyup', e => {
      const d = KEY_DIR[e.code];
      if (d !== undefined) this.held = this.held.filter(h => h !== d);
      const b = KEY_BTN[e.code];
      if (b) this.down.delete(b);
    });
    addEventListener('blur', () => this.reset());
    addEventListener('pointerdown', e => this.setDevice(e.pointerType === 'touch' || e.pointerType === 'pen' ? 'touch' : 'mouse'), { capture: true, passive: true });
  }

  setDevice(d: Device): void {
    if (this.device === d) return;
    this.device = d;
    for (const f of this.onDevice) f(d);
  }

  reset(): void {
    this.held = [];
    this.pressed.clear();
    this.down.clear();
    this.stick = { x: 0, y: 0 };
    this.tap = null;
  }

  /** Simulated presses from on-screen buttons. */
  press(b: Button): void { this.pressed.add(b); }
  hold(b: Button, on: boolean): void { if (on) this.down.add(b); else this.down.delete(b); }

  /** Was this button pressed since the last check? (Consumes it.) */
  consume(b: Button): boolean {
    const had = this.pressed.has(b);
    this.pressed.delete(b);
    return had;
  }

  isDown(b: Button): boolean { return this.down.has(b); }

  clearPresses(): void { this.pressed.clear(); this.tap = null; }

  /** The direction being held right now: keyboard, gamepad, or the touch stick. */
  dir(): Dir | null {
    if (this.held.length) return this.held[this.held.length - 1]!;
    if (this.padDir !== null) return this.padDir;
    const { x, y } = this.stick;
    if (Math.hypot(x, y) < 0.35) return null;
    return Math.abs(x) > Math.abs(y) ? (x > 0 ? 2 : 1) : y > 0 ? 0 : 3;
  }

  /** The stick or D-pad direction held at the last poll, even while a menu has focus (1.1: Bubble Catch). */
  get padHeld(): Dir | null { return this.navPrev; }

  /** Poll gamepads once per frame. Returns menu-navigation presses for DOM menus. */
  pollGamepad(): { nav: Dir | null; a: boolean; b: boolean; menu: boolean } {
    const none = { nav: null, a: false, b: false, menu: false };
    let pads: (Gamepad | null)[] = [];
    try { pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : []; } catch { return none; }
    const gp = pads.find(p => p && p.connected);
    if (!gp) { this.padDir = null; return none; }
    const b = (i: number) => !!gp.buttons[i]?.pressed;
    const edge = (i: number) => b(i) && !this.padPrev[i];
    const ax = gp.axes[0] ?? 0, ay = gp.axes[1] ?? 0;
    let dir: Dir | null = null;
    if (b(12)) dir = 3; else if (b(13)) dir = 0; else if (b(14)) dir = 1; else if (b(15)) dir = 2;
    else if (Math.hypot(ax, ay) > 0.45) dir = Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 2 : 1) : ay > 0 ? 0 : 3;
    const any = dir !== null || gp.buttons.some(x => x.pressed);
    if (any) this.setDevice('gamepad');
    const prevNav = this.navPrev;
    this.navPrev = dir;
    const out = { nav: dir !== null && dir !== prevNav ? dir : null, a: edge(0), b: edge(1), menu: edge(9) || edge(3) };
    if (!this.uiFocus) {
      this.padDir = dir;
      if (out.a) this.pressed.add('a');
      if (out.b) this.pressed.add('b');
      if (out.menu) this.pressed.add('menu');
      if (b(1)) this.down.add('b'); else if (this.padPrev[1]) this.down.delete('b');
    } else this.padDir = null;
    this.padPrev = gp.buttons.map(x => x.pressed);
    return out;
  }
}
