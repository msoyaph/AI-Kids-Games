/**
 * Gamepads (the browser's standard mapping). Polled once a frame: sticks and triggers as numbers,
 * buttons as "held" and "pressed this frame". Never throws when the Gamepad API is missing.
 */

export type PadButton = 'a' | 'b' | 'x' | 'y' | 'lb' | 'rb' | 'back' | 'start' | 'up' | 'down' | 'left' | 'right';
const BUTTONS: [PadButton, number][] = [['a', 0], ['b', 1], ['x', 2], ['y', 3], ['lb', 4], ['rb', 5], ['back', 8], ['start', 9], ['up', 12], ['down', 13], ['left', 14], ['right', 15]];

export interface PadState {
  lx: number; ly: number; rx: number; ry: number;
  /** Triggers, 0..1. */
  lt: number; rt: number;
  held: Set<PadButton>;
  pressed: Set<PadButton>;
}

const DEAD = 0.22;
const axis = (v: number | undefined) => (v === undefined || Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD));

export class Pads {
  private before = new Set<PadButton>();
  /** True once any pad has been used (the HUD then shows pad hints). */
  used = false;

  poll(): PadState | null {
    let pads: (Gamepad | null)[] = [];
    try { pads = navigator.getGamepads ? [...navigator.getGamepads()] : []; } catch { return null; }
    const pad = pads.find(p => p && p.connected);
    if (!pad) { this.before.clear(); return null; }
    const held = new Set<PadButton>();
    for (const [name, i] of BUTTONS) if (pad.buttons[i]?.pressed) held.add(name);
    const pressed = new Set([...held].filter(b => !this.before.has(b)));
    this.before = held;
    const s: PadState = {
      lx: axis(pad.axes[0]), ly: axis(pad.axes[1]), rx: axis(pad.axes[2]), ry: axis(pad.axes[3]),
      lt: pad.buttons[6]?.value ?? 0, rt: pad.buttons[7]?.value ?? 0, held, pressed,
    };
    if (pressed.size || s.lx || s.ly || s.rx || s.ry || s.lt > 0.1 || s.rt > 0.1) this.used = true;
    return s;
  }
}

/**
 * Turns a held direction into steps: one at once, then repeats after a pause, like a keyboard.
 * Returns how many steps to take this frame (0 or 1).
 */
export class Repeater {
  private heldFor = -1;
  private nextAt = 0;
  constructor(private delay = 0.38, private every = 0.12) {}
  update(active: boolean, dt: number): number {
    if (!active) { this.heldFor = -1; return 0; }
    if (this.heldFor < 0) { this.heldFor = 0; this.nextAt = this.delay; return 1; }
    this.heldFor += dt;
    if (this.heldFor >= this.nextAt) { this.nextAt += this.every; return 1; }
    return 0;
  }
}
