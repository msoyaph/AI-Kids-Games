/**
 * Gamepad (standard mapping): left stick / d-pad move, A use (hold), B interact & back,
 * X bag, Y map, LB/RB switch tools, Start menu, right stick picks the target tile.
 * In menus, the d-pad moves focus between buttons and A presses them.
 */
import type { Input } from './input';

const DEAD = 0.28;

export class GamepadInput {
  private prev: boolean[] = [];
  private navCooldown = 0;
  /** right-stick target offset (-1..1 per axis, rounded) */
  aim = { x: 0, y: 0, active: false };
  connected = false;

  constructor() {
    window.addEventListener('gamepadconnected', () => (this.connected = true));
    window.addEventListener('gamepaddisconnected', () => (this.connected = false));
  }

  poll(input: Input, dt: number, modalOpen: boolean, onBack: () => void): void {
    let pads: (Gamepad | null)[] = [];
    try {
      pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
    } catch {
      return;
    }
    const gp = pads.find((p) => p && p.connected);
    if (!gp) {
      input.pad.x = 0;
      input.pad.y = 0;
      this.aim.active = false;
      return;
    }
    const b = (i: number) => !!gp.buttons[i]?.pressed;
    const pressed = (i: number) => b(i) && !this.prev[i];
    let x = Math.abs(gp.axes[0] ?? 0) > DEAD ? gp.axes[0] : 0;
    let y = Math.abs(gp.axes[1] ?? 0) > DEAD ? gp.axes[1] : 0;
    if (b(14)) x = -1;
    if (b(15)) x = 1;
    if (b(12)) y = -1;
    if (b(13)) y = 1;
    const any = x !== 0 || y !== 0 || gp.buttons.some((bt) => bt.pressed);
    if (any) input.lastDevice = 'gamepad';
    if (modalOpen) {
      input.pad.x = 0;
      input.pad.y = 0;
      this.navCooldown -= dt;
      if ((x || y) && this.navCooldown <= 0) {
        moveFocus(x + y > 0 ? 1 : -1);
        this.navCooldown = 0.18;
      }
      if (!x && !y) this.navCooldown = 0;
      if (pressed(0)) (document.activeElement as HTMLElement | null)?.click?.();
      if (pressed(1)) onBack();
    } else {
      input.pad.x = x;
      input.pad.y = y;
      if (pressed(0)) input.push('use');
      if (input.lastDevice === 'gamepad') input.holdUse = b(0);
      if (pressed(1)) input.push('interact');
      if (pressed(2)) input.push('inventory');
      if (pressed(3)) input.push('map');
      if (pressed(4)) input.push('prevTool');
      if (pressed(5)) input.push('nextTool');
      if (pressed(9)) input.push('menu');
    }
    const ax = gp.axes[2] ?? 0, ay = gp.axes[3] ?? 0;
    this.aim.active = Math.hypot(ax, ay) > 0.5;
    this.aim.x = Math.round(ax);
    this.aim.y = Math.round(ay);
    this.prev = gp.buttons.map((bt) => bt.pressed);
  }
}

function moveFocus(dir: number): void {
  const layers = document.querySelectorAll('.modal-bg');
  const top = layers[layers.length - 1] as HTMLElement | undefined;
  if (!top) return;
  const items = Array.from(top.querySelectorAll<HTMLElement>('button:not([disabled]), input, [tabindex="0"]'));
  if (!items.length) return;
  const i = items.indexOf(document.activeElement as HTMLElement);
  const next = items[(i + dir + items.length) % items.length];
  next.focus();
  next.scrollIntoView?.({ block: 'nearest' });
}
