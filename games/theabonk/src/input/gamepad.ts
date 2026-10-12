import type { PadFamily } from './actions';

/**
 * Gamepad normalisation. Browsers expose controllers either with the W3C "standard" mapping
 * or as raw HID layouts (Firefox does this for PlayStation pads on every OS, and for Xbox
 * pads on Linux / macOS). Everything is converted to the standard layout:
 *   buttons 0 A/Cross · 1 B/Circle · 2 X/Square · 3 Y/Triangle · 4 LB · 5 RB · 6 LT · 7 RT
 *           8 View/Share · 9 Menu/Options · 10 L3 · 11 R3 · 12–15 d-pad · 16 Home
 *   axes    0 LX · 1 LY · 2 RX · 3 RY (−1 … 1, up = −1)
 * Axes are calibrated at their resting values, so a raw trigger that rests at −1 never reads
 * as a held stick (that used to spin the camera).
 */

export const STD_BUTTONS = 17;

/** A raw layout: for each standard button the raw button index, or an axis-driven source. */
export interface RawLayout {
  name: string;
  family: PadFamily;
  /** Standard button → raw button index (-1 = none / from axes). */
  buttons: number[];
  /** Standard axes 0–3 → raw axis index. */
  axes: [number, number, number, number];
  /** Triggers on axes (raw axis index) → standard buttons 6 / 7. */
  triggerAxes?: [number, number];
  /** D-pad reported as a hat switch on one axis. */
  hatAxis?: number;
  /** D-pad reported as two axes (x, y). */
  dpadAxes?: [number, number];
}

/** Raw layouts seen in the wild (recorded from real controllers; replayed by unit tests). */
export const RAW_LAYOUTS: Array<{ match: RegExp; layout: RawLayout }> = [
  {
    // Xbox pads through Firefox on Linux / macOS (xpad-style). Checked first: see detectFamily
    match: /045e|xbox|xinput|x-box/i,
    layout: {
      name: 'Xbox controller (raw layout)',
      family: 'xbox',
      buttons: [0, 1, 2, 3, 4, 5, -1, -1, 6, 7, 9, 10, -1, -1, -1, -1, 8],
      axes: [0, 1, 3, 4],
      triggerAxes: [2, 5],
      dpadAxes: [6, 7],
    },
  },
  {
    // DualShock 4 / DualSense through Firefox (any OS): face buttons start at Square
    match: /054c|playstation|dualshock|dualsense|wireless controller/i,
    layout: {
      name: 'PlayStation controller (raw layout)',
      family: 'playstation',
      buttons: [1, 2, 0, 3, 4, 5, 6, 7, 8, 9, 10, 11, -1, -1, -1, -1, 12],
      axes: [0, 1, 2, 5],
      triggerAxes: [3, 4],
      hatAxis: 9,
    },
  },
];

/** Generic raw fallback: first four buttons as face buttons, first four axes as sticks. */
const GENERIC_RAW: RawLayout = {
  name: 'Controller (raw layout)',
  family: 'generic',
  buttons: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  axes: [0, 1, 2, 3],
};

/** Which button names to show for a controller. */
export function detectFamily(id: string): PadFamily {
  // Xbox first: "Xbox Wireless Controller" must not match the DualShock's "Wireless Controller"
  if (/045e|xbox|xinput|x-box/i.test(id)) return 'xbox';
  if (/054c|playstation|dualshock|dualsense|wireless controller/i.test(id)) return 'playstation';
  return 'generic';
}

/** The minimal gamepad shape we read (real Gamepad objects and recorded fixtures). */
export interface PadLike {
  id: string;
  index: number;
  mapping: string;
  connected: boolean;
  buttons: ReadonlyArray<{ pressed: boolean; value: number }>;
  axes: ReadonlyArray<number>;
}

/** A pad in the standard layout. */
export interface StdPad {
  index: number;
  id: string;
  family: PadFamily;
  /** Human description of how it's read ("Standard mapping", "PlayStation … (raw layout)"). */
  layoutName: string;
  pressed: boolean[];
  /** Analog button values 0..1 (triggers). */
  values: number[];
  /** LX, LY, RX, RY in −1..1 after calibration (no deadzone). */
  axes: [number, number, number, number];
}

const HAT_DIRS: Array<[number, boolean, boolean, boolean, boolean]> = [
  // value, up, down, left, right
  [-1, true, false, false, false],
  [-0.714, true, false, false, true],
  [-0.428, false, false, false, true],
  [-0.142, false, true, false, true],
  [0.142, false, true, false, false],
  [0.428, false, true, true, false],
  [0.714, false, false, true, false],
  [1, true, false, true, false],
];

/** Decode a hat-switch axis value into up / down / left / right (neutral is > 1, e.g. 3.28). */
export function decodeHat(v: number): [boolean, boolean, boolean, boolean] {
  if (!(v >= -1.05 && v <= 1.05)) return [false, false, false, false];
  let best = HAT_DIRS[0];
  for (const h of HAT_DIRS) if (Math.abs(h[0] - v) < Math.abs(best[0] - v)) best = h;
  return [best[1], best[2], best[3], best[4]];
}

/**
 * Resting-value calibration per pad, learned while it's used (so a stick or trigger held
 * when the controller connects doesn't skew it): a stick's rest is the reading closest to
 * zero seen so far (its drift); a trigger's rest is the lowest reading seen (−1 for raw
 * triggers, 0 for triggers that rest at 0).
 */
export class PadCalibration {
  private near = new Map<string, number[]>();
  private low = new Map<string, number[]>();

  private observe(pad: PadLike): [number[], number[]] {
    const key = `${pad.index}:${pad.id}`;
    let n = this.near.get(key);
    let l = this.low.get(key);
    if (!n || !l || n.length !== pad.axes.length) {
      n = pad.axes.map((v) => (Number.isFinite(v) ? v : 0));
      l = n.slice();
      this.near.set(key, n);
      this.low.set(key, l);
    }
    for (let i = 0; i < pad.axes.length; i++) {
      const v = pad.axes[i];
      if (!Number.isFinite(v) || Math.abs(v) > 1.05) continue; // hat switches park outside ±1
      if (Math.abs(v) < Math.abs(n[i])) n[i] = v;
      if (v < l[i]) l[i] = v;
    }
    return [n, l];
  }

  /** Stick rests (closest-to-zero readings). */
  restFor(pad: PadLike): number[] {
    return this.observe(pad)[0];
  }

  /** Trigger rests (lowest readings). */
  triggerRestFor(pad: PadLike): number[] {
    return this.observe(pad)[1];
  }

  forget(): void {
    this.near.clear();
    this.low.clear();
  }
}

function stick(raw: number, rest: number): number {
  if (!Number.isFinite(raw)) return 0;
  // remove a small resting offset (drift); big offsets mean it isn't a centred stick
  const off = Math.abs(rest) < 0.25 ? rest : 0;
  return Math.max(-1, Math.min(1, raw - off));
}

/** 0..1 trigger from an axis (rest −1 → 0, full +1 → 1); handles axes resting at 0 too. */
function triggerFromAxis(raw: number, rest: number): number {
  if (!Number.isFinite(raw)) return 0;
  if (rest < -0.5) return Math.max(0, Math.min(1, (raw + 1) / 2));
  return Math.max(0, Math.min(1, raw));
}

export function rawLayoutFor(id: string): RawLayout {
  for (const r of RAW_LAYOUTS) if (r.match.test(id)) return r.layout;
  return GENERIC_RAW;
}

/** Read any pad into the standard layout. */
export function normalizePad(pad: PadLike, cal: PadCalibration): StdPad {
  const pressed = new Array<boolean>(STD_BUTTONS).fill(false);
  const values = new Array<number>(STD_BUTTONS).fill(0);
  const rest = cal.restFor(pad);
  const family = detectFamily(pad.id);
  if (pad.mapping === 'standard') {
    for (let i = 0; i < STD_BUTTONS && i < pad.buttons.length; i++) {
      pressed[i] = !!pad.buttons[i].pressed;
      values[i] = pad.buttons[i].value ?? (pressed[i] ? 1 : 0);
    }
    return {
      index: pad.index,
      id: pad.id,
      family,
      layoutName: 'Standard mapping',
      pressed,
      values,
      axes: [stick(pad.axes[0], rest[0] ?? 0), stick(pad.axes[1], rest[1] ?? 0), stick(pad.axes[2], rest[2] ?? 0), stick(pad.axes[3], rest[3] ?? 0)],
    };
  }
  const L = rawLayoutFor(pad.id);
  const low = cal.triggerRestFor(pad);
  for (let i = 0; i < STD_BUTTONS; i++) {
    const r = L.buttons[i];
    if (r === undefined || r < 0 || r >= pad.buttons.length) continue;
    pressed[i] = !!pad.buttons[r].pressed;
    values[i] = pad.buttons[r].value ?? (pressed[i] ? 1 : 0);
  }
  if (L.triggerAxes) {
    for (let k = 0; k < 2; k++) {
      const ai = L.triggerAxes[k];
      if (ai >= pad.axes.length) continue;
      const v = triggerFromAxis(pad.axes[ai], low[ai] ?? -1);
      const b = 6 + k;
      values[b] = Math.max(values[b], v);
      pressed[b] = pressed[b] || v > 0.4;
    }
  }
  if (L.hatAxis !== undefined && L.hatAxis < pad.axes.length) {
    const [u, d, l, r] = decodeHat(pad.axes[L.hatAxis]);
    pressed[12] ||= u;
    pressed[13] ||= d;
    pressed[14] ||= l;
    pressed[15] ||= r;
  }
  if (L.dpadAxes) {
    const x = pad.axes[L.dpadAxes[0]] ?? 0;
    const y = pad.axes[L.dpadAxes[1]] ?? 0;
    pressed[12] ||= y < -0.5;
    pressed[13] ||= y > 0.5;
    pressed[14] ||= x < -0.5;
    pressed[15] ||= x > 0.5;
  }
  for (const b of [12, 13, 14, 15]) values[b] = Math.max(values[b], pressed[b] ? 1 : 0);
  const ax = (k: number): number => {
    const ai = L.axes[k];
    return ai < pad.axes.length ? stick(pad.axes[ai], rest[ai] ?? 0) : 0;
  };
  return { index: pad.index, id: pad.id, family, layoutName: L.name, pressed, values, axes: [ax(0), ax(1), ax(2), ax(3)] };
}

/** Is a normalized pad doing anything (beyond resting noise)? */
export function padActive(p: StdPad): boolean {
  return p.pressed.some(Boolean) || p.axes.some((a) => Math.abs(a) > 0.35);
}

/** With several controllers plugged in, the last one someone touched is the one we read. */
export function chooseActivePad(pads: StdPad[], current: number): number {
  for (const p of pads) if (padActive(p) && p.index !== current) return p.index;
  if (pads.some((p) => p.index === current)) return current;
  return pads[0]?.index ?? -1;
}

/**
 * Rumble through whatever the browser offers: Gamepad.vibrationActuator ('dual-rumble'),
 * or Firefox's hapticActuators[].pulse. Silently does nothing elsewhere.
 */
export function rumblePad(pad: Gamepad | null, strong: number, weak: number, ms: number): boolean {
  if (!pad) return false;
  // not every browser has these, whatever the DOM typings say
  const g = pad as unknown as {
    vibrationActuator?: { playEffect?: (t: string, p: object) => Promise<unknown> };
    hapticActuators?: Array<{ pulse?: (v: number, ms: number) => Promise<unknown> }>;
  };
  try {
    const va = g.vibrationActuator;
    if (va?.playEffect) {
      void va.playEffect('dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => undefined);
      return true;
    }
    const ha = g.hapticActuators;
    if (ha?.[0]?.pulse) {
      void ha[0].pulse(Math.max(strong, weak), ms).catch(() => undefined);
      return true;
    }
  } catch {
    /* blocked or unsupported */
  }
  return false;
}
