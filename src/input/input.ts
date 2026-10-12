// Unified input: keyboard + mouse, Gamepad API and on-screen touch controls.
export type Command =
  | 'action'
  | 'cancel'
  | 'inventory'
  | 'phone'
  | 'map'
  | 'pause'
  | 'toolRing'
  | 'toolNext'
  | 'toolPrev'
  | 'putAway'
  | 'tool1'
  | 'tool2'
  | 'tool3'
  | 'tool4'
  | 'tool5'
  | 'tool6'
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'confirm'
  | 'back'
  | 'rotate'
  | 'store'
  | 'tabNext'
  | 'tabPrev'
  | 'undo'
  | 'fine';

export interface InputFrame {
  moveX: number;
  moveZ: number;
  run: boolean;
  /** creep quietly (a small push on the touch stick) */
  sneak: boolean;
  actionHeld: boolean;
  commands: Command[];
}

const KEYMAP: Record<string, Command[]> = {
  KeyE: ['action', 'confirm'],
  Space: ['action', 'confirm'],
  Enter: ['confirm', 'action'],
  NumpadEnter: ['confirm', 'action'],
  Escape: ['pause', 'back'],
  Backspace: ['back'],
  KeyI: ['inventory'],
  Tab: ['phone'],
  KeyP: ['phone'],
  KeyM: ['map'],
  KeyR: ['toolRing', 'rotate'],
  KeyQ: ['putAway', 'tabPrev'],
  KeyX: ['store'],
  KeyZ: ['tabNext'],
  KeyU: ['undo'],
  KeyF: ['fine'],
  BracketRight: ['toolNext', 'tabNext'],
  BracketLeft: ['toolPrev', 'tabPrev'],
  Digit1: ['tool1'],
  Digit2: ['tool2'],
  Digit3: ['tool3'],
  Digit4: ['tool4'],
  Digit5: ['tool5'],
  Digit6: ['tool6'],
  ArrowUp: ['up'],
  ArrowDown: ['down'],
  ArrowLeft: ['left'],
  ArrowRight: ['right'],
  KeyW: ['up'],
  KeyS: ['down'],
  KeyA: ['left'],
  KeyD: ['right'],
};

// Standard gamepad mapping
const PAD: Record<number, Command[]> = {
  0: ['action', 'confirm'],
  1: ['back'],
  2: ['inventory'],
  3: ['toolRing'],
  4: ['toolPrev', 'tabPrev'],
  5: ['toolNext', 'tabNext'],
  6: ['undo'],
  8: ['map'],
  10: ['fine'],
  9: ['phone', 'pause'],
  12: ['up'],
  13: ['down'],
  14: ['left'],
  15: ['right'],
};

export class Input {
  private keys = new Set<string>();
  private queued: Command[] = [];
  private padPrev: boolean[] = [];
  private padAxesPrev = { x: 0, y: 0 };
  private padRepeat = 0;
  touch = { x: 0, z: 0, run: false, action: false, sneak: false };
  mouseAction = false;
  /** set by UI so typing in text fields doesn't move the player */
  textFocus = false;
  lastDevice: 'keyboard' | 'gamepad' | 'touch' = 'keyboard';

  constructor(target: HTMLElement) {
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.keys.clear());
    // a click on the world is the action button; a finger on it just means "touch is in use"
    // (pointer events tell them apart: the mouse events a browser fakes after a tap must not count)
    target.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') {
        this.lastDevice = 'touch';
        return;
      }
      if (e.button === 0) {
        this.mouseAction = true;
        this.queued.push('action');
        this.lastDevice = 'keyboard';
      }
    });
    window.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'touch') this.mouseAction = false;
    });
    target.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    if (this.textFocus) return;
    if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    this.lastDevice = 'keyboard';
    if (down) {
      if (!e.repeat) {
        const cmds = KEYMAP[e.code];
        if (cmds) this.queued.push(...cmds);
      } else if (e.code.startsWith('Arrow') || ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        // allow held arrows to repeat for menu navigation
        const cmds = KEYMAP[e.code];
        if (cmds) this.queued.push(...cmds);
      }
      this.keys.add(e.code);
    } else {
      this.keys.delete(e.code);
    }
  }

  /** Programmatic command (touch buttons). */
  push(c: Command): void {
    this.queued.push(c);
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  poll(dt: number): InputFrame {
    let mx = 0, mz = 0;
    if (!this.textFocus) {
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) mz -= 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) mz += 1;
    }
    let run = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    let held = this.keys.has('KeyE') || this.keys.has('Space') || this.mouseAction;
    const commands = this.queued;
    this.queued = [];

    // gamepad
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p || !p.connected) continue;
      const ax = p.axes[0] ?? 0, ay = p.axes[1] ?? 0;
      const mag = Math.hypot(ax, ay);
      if (mag > 0.2) {
        mx += ax;
        mz += ay;
        this.lastDevice = 'gamepad';
      }
      p.buttons.forEach((b, i) => {
        const was = this.padPrev[i] ?? false;
        if (b.pressed && !was) {
          const cmds = PAD[i];
          if (cmds) commands.push(...cmds);
          this.lastDevice = 'gamepad';
        }
        this.padPrev[i] = b.pressed;
      });
      if (p.buttons[0]?.pressed) held = true;
      if (p.buttons[1]?.pressed || p.buttons[7]?.pressed) run = true;
      // stick -> menu navigation with repeat
      const sx = Math.abs(ax) > 0.6 ? Math.sign(ax) : 0;
      const sy = Math.abs(ay) > 0.6 ? Math.sign(ay) : 0;
      if (sx !== this.padAxesPrev.x || sy !== this.padAxesPrev.y) {
        this.padRepeat = 0.38;
        if (sy < 0) commands.push('up');
        if (sy > 0) commands.push('down');
        if (sx < 0) commands.push('left');
        if (sx > 0) commands.push('right');
      } else if (sx || sy) {
        this.padRepeat -= dt;
        if (this.padRepeat <= 0) {
          this.padRepeat = 0.12;
          if (sy < 0) commands.push('up');
          if (sy > 0) commands.push('down');
          if (sx < 0) commands.push('left');
          if (sx > 0) commands.push('right');
        }
      }
      this.padAxesPrev = { x: sx, y: sy };
      break;
    }

    // touch stick (it decides sneak / walk / run itself)
    let sneak = false;
    if (Math.hypot(this.touch.x, this.touch.z) > 0.05) {
      mx += this.touch.x;
      mz += this.touch.z;
      sneak = this.touch.sneak;
      run = run || this.touch.run;
    }
    if (this.touch.action) held = true;
    const m = Math.hypot(mx, mz);
    if (m > 1) {
      mx /= m;
      mz /= m;
    }
    return { moveX: mx, moveZ: mz, run: run && !sneak, sneak, actionHeld: held, commands };
  }
}
