/**
 * Unified input: keyboard + mouse, touch and gamepad all feed the same intents.
 * The game reads `moveX/moveY` every frame and drains one-shot `actions`.
 */
export type Action =
  | 'use' // use tool / item on target tile
  | 'interact' // talk, open, harvest, pick up
  | 'menu'
  | 'cancel'
  | 'inventory'
  | 'map'
  | 'journal'
  | 'prevTool'
  | 'nextTool'
  | `slot${number}`;

export class Input {
  moveX = 0;
  moveY = 0;
  /** world-space pointer target provided by the game (tile), when pointer is active */
  pointer = { x: 0, y: 0, active: false, down: false, kind: 'mouse' as 'mouse' | 'touch' };
  private keys = new Set<string>();
  private queue: Action[] = [];
  /** extra analog sources (touch joystick, gamepad) */
  stick = { x: 0, y: 0 };
  pad = { x: 0, y: 0 };
  /** true while the "use" button is held (for repeat actions & fishing) */
  holdUse = false;
  holdKeys = false;
  lastDevice: 'keyboard' | 'mouse' | 'touch' | 'gamepad' = 'keyboard';
  enabled = true;
  /** listeners for raw events (UI hooks) */
  onAction: ((a: Action) => void) | null = null;

  constructor() {
    window.addEventListener('keydown', (e) => this.keyDown(e));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.holdUse = false;
    });
  }

  private keyDown(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    this.lastDevice = 'keyboard';
    const code = e.code;
    if (!e.repeat) {
      const a = KEYMAP[code];
      this.fromPointer = false;
      if (a) {
        this.push(a);
        if (a === 'use') this.holdUse = true;
      }
      if (code.startsWith('Digit')) {
        const n = parseInt(code.slice(5), 10);
        this.push(`slot${n === 0 ? 9 : n - 1}`);
      }
    }
    this.keys.add(code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(code)) e.preventDefault();
  }

  /** set when the latest 'use'/'interact' came from a pointer click (use the hovered tile) */
  fromPointer = false;

  /** Mouse + pen pointer handling on the game canvas (touch is handled by the touch module). */
  attachCanvas(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      this.pointer.x = e.offsetX;
      this.pointer.y = e.offsetY;
      this.pointer.active = true;
      this.pointer.kind = 'mouse';
      this.lastDevice = 'mouse';
    });
    canvas.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'touch') this.pointer.active = false;
    });
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      this.pointer.x = e.offsetX;
      this.pointer.y = e.offsetY;
      this.pointer.active = true;
      this.pointer.kind = 'mouse';
      this.lastDevice = 'mouse';
      this.fromPointer = true;
      if (e.button === 0) {
        this.holdUse = true;
        this.push('use');
      } else if (e.button === 2) this.push('interact');
    });
    window.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'touch' && e.button === 0 && this.lastDevice === 'mouse') this.holdUse = false;
    });
  }

  push(a: Action): void {
    if (!this.enabled) return;
    this.queue.push(a);
    this.onAction?.(a);
  }

  /** Drain all pending actions. */
  drain(): Action[] {
    if (this.queue.length === 0) return EMPTY;
    const q = this.queue;
    this.queue = [];
    return q;
  }

  clear(): void {
    this.queue.length = 0;
  }

  keyHeld(code: string): boolean {
    return this.keys.has(code);
  }

  frame(): void {
    let x = 0, y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    this.holdKeys = x !== 0 || y !== 0;
    if (x === 0 && y === 0) {
      x = this.stick.x + this.pad.x;
      y = this.stick.y + this.pad.y;
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    this.moveX = x;
    this.moveY = y;
    if (this.lastDevice === 'keyboard' && !this.keys.has('Space') && !this.keys.has('KeyC')) this.holdUse = false;
  }
}

const EMPTY: Action[] = [];

const KEYMAP: Record<string, Action> = {
  Space: 'use',
  KeyC: 'use',
  KeyE: 'interact',
  KeyX: 'interact',
  Enter: 'interact',
  Escape: 'menu',
  KeyI: 'inventory',
  Tab: 'inventory',
  KeyM: 'map',
  KeyJ: 'journal',
  KeyQ: 'prevTool',
  KeyR: 'nextTool',
};
