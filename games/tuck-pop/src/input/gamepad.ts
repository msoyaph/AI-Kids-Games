/**
 * Gamepad polling (standard mapping), turned into presses: the d-pad or left stick (with a
 * dead zone and key-like repeat), A, B, X, Y, LB, RB, Start and Back. Missing or blocked gamepad
 * support (a sandboxed iframe without the permission) just means no presses.
 */
export type PadButton = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'x' | 'y' | 'lb' | 'rb' | 'start' | 'back';

const BUTTONS: [PadButton, number][] = [['a', 0], ['b', 1], ['x', 2], ['y', 3], ['lb', 4], ['rb', 5], ['back', 8], ['start', 9], ['up', 12], ['down', 13], ['left', 14], ['right', 15]];
const DEAD = 0.45, FIRST = 0.32, REPEAT = 0.11;

const held = new Map<PadButton, number>();
let connected = false;

/** Presses since the last poll (`dt` seconds ago). */
export function pollPad(dt: number, out: PadButton[]): PadButton[] {
  out.length = 0;
  let pads: (Gamepad | null)[] = [];
  try { pads = navigator.getGamepads?.() ? [...navigator.getGamepads()] : []; } catch { pads = []; }
  const down = new Set<PadButton>();
  for (const pad of pads) {
    if (!pad || !pad.connected) continue;
    connected = true;
    for (const [name, i] of BUTTONS) if (pad.buttons[i]?.pressed) down.add(name);
    const [x = 0, y = 0] = pad.axes;
    if (x < -DEAD) down.add('left'); if (x > DEAD) down.add('right');
    if (y < -DEAD) down.add('up'); if (y > DEAD) down.add('down');
  }
  for (const name of [...held.keys()]) if (!down.has(name)) held.delete(name);
  for (const name of down) {
    const t = held.get(name);
    if (t === undefined) { out.push(name); held.set(name, -FIRST); continue; }
    const directional = name === 'up' || name === 'down' || name === 'left' || name === 'right';
    const next = t + dt;
    if (directional && next >= REPEAT) { out.push(name); held.set(name, 0); } else held.set(name, next);
  }
  return out;
}

export const padConnected = () => connected;
