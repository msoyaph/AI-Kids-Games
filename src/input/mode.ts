/**
 * Which input the player is using right now: touch (on-screen glass controls) or desktop
 * (keyboard / mouse / gamepad). Phones and tablets start in touch mode; hybrid devices
 * (touchscreen laptops, an iPad with a keyboard) switch whenever the player changes hands.
 *
 * Browsers fire emulated mouse events right after a touch; mouse input that soon after a
 * touch never counts as "the player picked up the mouse".
 */

/** Mouse input within this long after a touch is the browser's touch emulation. */
export const EMULATED_MOUSE_MS = 800;
/** A real mouse has to travel this far (CSS px) to take over from touch. */
export const MOUSE_SWITCH_PX = 6;

/** Touch-first device: the primary pointer is a finger (phones and tablets). */
export function touchFirstDevice(): boolean {
  try {
    return matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

/** Any touchscreen at all (also touchscreen laptops, whose primary pointer is the mouse). */
export function hasTouchScreen(): boolean {
  try {
    return (navigator.maxTouchPoints ?? 0) > 0 || 'ontouchstart' in window || matchMedia('(any-pointer: coarse)').matches;
  } catch {
    return false;
  }
}

export class InputModeTracker {
  /** Touch mode is on. */
  touch: boolean;
  /** Called when the mode flips (not when it's set directly). */
  onChange: ((touch: boolean) => void) | null = null;
  private lastTouch = -1e9;
  private travel = 0;

  constructor(touch = false) {
    this.touch = touch;
  }

  /** A finger or pen touched the screen. */
  touched(now: number): void {
    this.lastTouch = now;
    this.travel = 0;
    this.set(true);
  }

  /** Mouse input this soon after a touch is emulated, not a real mouse. */
  emulatedMouse(now: number): boolean {
    return now - this.lastTouch < EMULATED_MOUSE_MS;
  }

  /** A real mouse moved by (dx, dy) CSS px. */
  mouseMoved(dx: number, dy: number, now: number): void {
    if (!this.touch || this.emulatedMouse(now)) return;
    this.travel += Math.abs(dx) + Math.abs(dy);
    if (this.travel > MOUSE_SWITCH_PX) this.set(false);
  }

  /** A real mouse button went down. */
  mousePressed(now: number): void {
    if (!this.emulatedMouse(now)) this.set(false);
  }

  /** A real key went down (not the "Unidentified" keys some on-screen keyboards send). */
  keyPressed(code: string): void {
    if (code && code !== 'Unidentified') this.set(false);
  }

  /** A gamepad button / stick past the dead zone. */
  padUsed(): void {
    this.set(false);
  }

  private set(touch: boolean): void {
    this.travel = 0;
    if (this.touch === touch) return;
    this.touch = touch;
    this.onChange?.(touch);
  }
}
