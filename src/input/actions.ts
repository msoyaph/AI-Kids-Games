/**
 * Gameplay actions and their (remappable) bindings: keyboard codes (KeyboardEvent.code) and
 * standard-mapping gamepad button indices. Escape (pause / back) and F3 (debug) are fixed.
 * Menus always also accept arrows / Enter / Escape and the d-pad / A / B.
 */

export const GAME_ACTIONS = ['moveUp', 'moveDown', 'moveLeft', 'moveRight', 'jump', 'slide', 'lookLeft', 'lookRight', 'pause'] as const;
export type GameAction = (typeof GAME_ACTIONS)[number];

export interface Binding {
  keys: string[];
  pad: number[];
}

export type Bindings = Record<GameAction, Binding>;

export const ACTION_LABELS: Record<GameAction, string> = {
  moveUp: 'Move forward',
  moveDown: 'Move back',
  moveLeft: 'Move left',
  moveRight: 'Move right',
  jump: 'Jump',
  slide: 'Slide',
  lookLeft: 'Turn camera left',
  lookRight: 'Turn camera right',
  pause: 'Pause',
};

export function defaultBindings(): Bindings {
  return {
    moveUp: { keys: ['KeyW', 'ArrowUp'], pad: [12] },
    moveDown: { keys: ['KeyS', 'ArrowDown'], pad: [13] },
    moveLeft: { keys: ['KeyA', 'ArrowLeft'], pad: [14] },
    moveRight: { keys: ['KeyD', 'ArrowRight'], pad: [15] },
    jump: { keys: ['Space'], pad: [0] },
    slide: { keys: ['ShiftLeft', 'ShiftRight', 'KeyC'], pad: [1, 6, 7, 10] },
    lookLeft: { keys: ['KeyQ'], pad: [4] },
    lookRight: { keys: ['KeyE'], pad: [5] },
    pause: { keys: ['KeyP'], pad: [9, 8] },
  };
}

/** Keys that can never be bound (they always do their own thing). */
export const FIXED_KEYS: ReadonlySet<string> = new Set(['Escape', 'F3']);

export const MAX_BINDS = 4;

/** Any object → valid Bindings (unknown actions dropped, missing ones defaulted, capped). */
export function sanitizeBindings(raw: unknown): Bindings {
  const out = defaultBindings();
  if (typeof raw !== 'object' || raw === null) return out;
  for (const a of GAME_ACTIONS) {
    const b = (raw as Record<string, unknown>)[a];
    if (typeof b !== 'object' || b === null) continue;
    const keys = (b as { keys?: unknown }).keys;
    const pad = (b as { pad?: unknown }).pad;
    if (Array.isArray(keys)) out[a].keys = Array.from(new Set(keys.filter((k): k is string => typeof k === 'string' && k.length > 0 && k.length <= 24 && !FIXED_KEYS.has(k)))).slice(0, MAX_BINDS);
    if (Array.isArray(pad)) out[a].pad = Array.from(new Set(pad.filter((p): p is number => Number.isInteger(p) && p >= 0 && p < 32))).slice(0, MAX_BINDS);
  }
  return out;
}

/** Inputs bound to more than one action ("key:Space", "pad:0"). */
export function conflicts(b: Bindings): Array<{ input: string; actions: GameAction[] }> {
  const by = new Map<string, GameAction[]>();
  for (const a of GAME_ACTIONS) {
    for (const k of b[a].keys) by.set(`key:${k}`, [...(by.get(`key:${k}`) ?? []), a]);
    for (const p of b[a].pad) by.set(`pad:${p}`, [...(by.get(`pad:${p}`) ?? []), a]);
  }
  return [...by].filter(([, as]) => as.length > 1).map(([input, actions]) => ({ input, actions }));
}

/** Bind `input` to `action` (replacing it if already there); returns the actions that also use it. */
export function bind(b: Bindings, action: GameAction, input: { key?: string; pad?: number }, slot: number): GameAction[] {
  const list = input.key !== undefined ? b[action].keys : b[action].pad;
  const v = (input.key ?? input.pad) as never;
  const at = (list as unknown[]).indexOf(v);
  if (at >= 0) (list as unknown[]).splice(at, 1);
  if (slot >= 0 && slot < list.length) (list as unknown[])[slot] = v;
  else if (list.length < MAX_BINDS) (list as unknown[]).push(v);
  else (list as unknown[])[MAX_BINDS - 1] = v; // full: the newest replaces the last
  return GAME_ACTIONS.filter((a) => a !== action && (input.key !== undefined ? b[a].keys.includes(input.key) : b[a].pad.includes(input.pad!)));
}

const KEY_NAMES: Record<string, string> = {
  Space: 'Space',
  ShiftLeft: 'Left Shift',
  ShiftRight: 'Right Shift',
  ControlLeft: 'Left Ctrl',
  ControlRight: 'Right Ctrl',
  AltLeft: 'Left Alt',
  AltRight: 'Right Alt',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Enter: 'Enter',
  Tab: 'Tab',
  Backspace: 'Backspace',
  CapsLock: 'Caps Lock',
};

export function keyLabel(code: string): string {
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  return code;
}

export type PadFamily = 'xbox' | 'playstation' | 'generic';

const PAD_NAMES: Record<PadFamily, string[]> = {
  xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'L-Stick', 'R-Stick', 'D-Up', 'D-Down', 'D-Left', 'D-Right', 'Xbox'],
  playstation: ['Cross', 'Circle', 'Square', 'Triangle', 'L1', 'R1', 'L2', 'R2', 'Share', 'Options', 'L3', 'R3', 'D-Up', 'D-Down', 'D-Left', 'D-Right', 'PS'],
  generic: ['Button 1', 'Button 2', 'Button 3', 'Button 4', 'L1', 'R1', 'L2', 'R2', 'Select', 'Start', 'L3', 'R3', 'D-Up', 'D-Down', 'D-Left', 'D-Right', 'Home'],
};

export function padLabel(index: number, family: PadFamily = 'generic'): string {
  return PAD_NAMES[family][index] ?? `Button ${index + 1}`;
}

/** Fast lookup tables for the input manager. */
export function lookup(b: Bindings): { keyActions: Map<string, GameAction[]>; padActions: Map<number, GameAction[]> } {
  const keyActions = new Map<string, GameAction[]>();
  const padActions = new Map<number, GameAction[]>();
  for (const a of GAME_ACTIONS) {
    for (const k of b[a].keys) keyActions.set(k, [...(keyActions.get(k) ?? []), a]);
    for (const p of b[a].pad) padActions.set(p, [...(padActions.get(p) ?? []), a]);
  }
  return { keyActions, padActions };
}
