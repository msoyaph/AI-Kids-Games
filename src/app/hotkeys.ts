/**
 * Remappable keyboard shortcuts. Keys are stored as `KeyboardEvent.code`
 * (the physical key, so AZERTY/QWERTZ players get the same positions), and
 * only changes from the defaults are saved (`settings.hotkeys`).
 * Escape (back/cancel), Space (pause) and Enter (send wave) always work too.
 */
export const HOTKEY_ACTIONS = [
  'pause',
  'speed',
  'sendWave',
  'upgrade',
  'sell',
  'target',
  'element',
  'intel',
  'hero',
  'heroSpecial',
  'ability1',
  'ability2',
  'ability3',
  'build1',
  'build2',
  'build3',
  'build4',
  'build5',
  'build6',
  'build7',
  'build8',
  'build9',
  'build10',
] as const;
export type HotkeyAction = (typeof HOTKEY_ACTIONS)[number];

export const DEFAULT_HOTKEYS: Readonly<Record<HotkeyAction, string>> = {
  pause: 'KeyP',
  speed: 'KeyF',
  sendWave: 'KeyN',
  upgrade: 'KeyU',
  sell: 'KeyS',
  target: 'KeyT',
  element: 'KeyE',
  intel: 'KeyI',
  hero: 'KeyH',
  heroSpecial: 'KeyQ',
  ability1: 'KeyZ',
  ability2: 'KeyX',
  ability3: 'KeyC',
  build1: 'Digit1',
  build2: 'Digit2',
  build3: 'Digit3',
  build4: 'Digit4',
  build5: 'Digit5',
  build6: 'Digit6',
  build7: 'Digit7',
  build8: 'Digit8',
  build9: 'Digit9',
  build10: 'Digit0',
};

/** Keys with a fixed job (or that browsers/assistive tech need) — never bindable. */
export const RESERVED_KEYS = new Set(['Escape', 'Space', 'Enter', 'NumpadEnter', 'Tab', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'CapsLock', 'ContextMenu', 'F5', 'F11', 'F12']);

/** Bindable: letters, digits, numpad digits, punctuation, arrows, F1–F10. */
export function bindable(code: string): boolean {
  if (RESERVED_KEYS.has(code)) return false;
  return /^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Arrow(Up|Down|Left|Right)|F([1-9]|10)|Minus|Equal|BracketLeft|BracketRight|Semicolon|Quote|Backquote|Backslash|Comma|Period|Slash)$/.test(code);
}

const isAction = (k: string): k is HotkeyAction => (HOTKEY_ACTIONS as readonly string[]).includes(k);

/**
 * Effective bindings: defaults + saved changes. Damaged saves are repaired:
 * unknown actions / unbindable keys are ignored, and a key claimed twice
 * stays with the first action (the other one goes unbound, '').
 */
export function resolveHotkeys(saved: Record<string, string> | undefined): Record<HotkeyAction, string> {
  const out = { ...DEFAULT_HOTKEYS } as Record<HotkeyAction, string>;
  for (const [a, code] of Object.entries(saved ?? {})) if (isAction(a) && (code === '' || bindable(code))) out[a] = code;
  const used = new Set<string>();
  for (const a of HOTKEY_ACTIONS) {
    const c = out[a];
    if (!c) continue;
    if (used.has(c)) out[a] = '';
    else used.add(c);
  }
  return out;
}

/**
 * Bind `action` to `code`. If another action had that key, the two swap, so
 * nothing is ever lost. Returns the new saved overrides (changes only).
 */
export function rebind(saved: Record<string, string> | undefined, action: HotkeyAction, code: string): Record<string, string> {
  if (!bindable(code)) return { ...(saved ?? {}) };
  const cur = resolveHotkeys(saved);
  const old = cur[action];
  for (const a of HOTKEY_ACTIONS) if (a !== action && cur[a] === code) cur[a] = old;
  cur[action] = code;
  return diffFromDefaults(cur);
}

export function diffFromDefaults(map: Record<HotkeyAction, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of HOTKEY_ACTIONS) if (map[a] !== DEFAULT_HOTKEYS[a]) out[a] = map[a];
  return out;
}

/** Reverse lookup, built once per settings change. */
export function actionsByCode(map: Record<HotkeyAction, string>): Map<string, HotkeyAction> {
  const m = new Map<string, HotkeyAction>();
  for (const a of HOTKEY_ACTIONS) if (map[a]) m.set(map[a], a);
  return m;
}

const ARROWS: Record<string, string> = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
const PUNCT: Record<string, string> = { Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Backquote: '`', Backslash: '\\', Comma: ',', Period: '.', Slash: '/' };

/** Short label for a key code ("KeyP" → "P", "Digit1" → "1", "Numpad4" → "Num 4"). */
export function keyLabel(code: string): string {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  return ARROWS[code] ?? PUNCT[code] ?? code;
}
