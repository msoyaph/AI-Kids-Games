// Remappable control bindings. Keyboard uses KeyboardEvent.code; gamepads use standard-mapping button indices.

export type Action = 'accel' | 'brake' | 'left' | 'right' | 'drift' | 'item' | 'lookBack' | 'pause';

export const ACTIONS: Action[] = ['accel', 'brake', 'left', 'right', 'drift', 'item', 'lookBack', 'pause'];

export const ACTION_LABELS: Record<Action, string> = {
  accel: 'Accelerate',
  brake: 'Brake / Reverse',
  left: 'Steer Left',
  right: 'Steer Right',
  drift: 'Drift / Hop / Trick',
  item: 'Use Item',
  lookBack: 'Look Behind',
  pause: 'Pause',
};

export type KeyBindings = Record<Action, string[]>;
export type PadBindings = Record<Action, number[]>;

/** Keyboard layouts: solo uses both WASD and arrows; split-screen splits the keyboard in two halves. */
export type KeyScheme = 'solo' | 'left' | 'right';

export const DEFAULT_KEYS: Record<KeyScheme, KeyBindings> = {
  solo: {
    accel: ['ArrowUp', 'KeyW'],
    brake: ['ArrowDown', 'KeyS'],
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    drift: ['ShiftLeft', 'ShiftRight', 'Space'],
    item: ['KeyE', 'ControlLeft', 'ControlRight'],
    lookBack: ['KeyR'],
    pause: ['Escape', 'KeyP'],
  },
  left: {
    accel: ['KeyW'],
    brake: ['KeyS'],
    left: ['KeyA'],
    right: ['KeyD'],
    drift: ['ShiftLeft', 'Space'],
    item: ['KeyE', 'ControlLeft'],
    lookBack: ['KeyQ'],
    pause: ['Escape'],
  },
  right: {
    accel: ['ArrowUp'],
    brake: ['ArrowDown'],
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    drift: ['ShiftRight', 'Slash'],
    item: ['Enter', 'ControlRight', 'Period'],
    lookBack: ['Comma'],
    pause: ['KeyP'],
  },
};

/** Standard gamepad: 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 Back, 9 Start, 12-15 D-pad. */
export const DEFAULT_PAD: PadBindings = {
  accel: [0, 7],
  brake: [1, 6],
  left: [14],
  right: [15],
  drift: [5, 2],
  item: [4, 3],
  lookBack: [10],
  pause: [9],
};

export const PAD_BUTTON_NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'L-Stick', 'R-Stick', 'D-Up', 'D-Down', 'D-Left', 'D-Right', 'Home'];

export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map: Record<string, string> = {
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    ShiftLeft: 'L-Shift',
    ShiftRight: 'R-Shift',
    ControlLeft: 'L-Ctrl',
    ControlRight: 'R-Ctrl',
    Space: 'Space',
    Escape: 'Esc',
    Enter: 'Enter',
    Slash: '/',
    Period: '.',
    Comma: ',',
  };
  return map[code] ?? code;
}

export function cloneKeys(k: KeyBindings): KeyBindings {
  const out = {} as KeyBindings;
  for (const a of ACTIONS) out[a] = [...(k[a] ?? [])];
  return out;
}

export function clonePad(p: PadBindings): PadBindings {
  const out = {} as PadBindings;
  for (const a of ACTIONS) out[a] = [...(p[a] ?? [])];
  return out;
}
