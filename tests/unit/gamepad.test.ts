import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { chooseActivePad, decodeHat, detectFamily, normalizePad, PadCalibration, rumblePad, type PadLike } from '../../src/input/gamepad';

interface Frame {
  buttons?: string;
  press?: number[];
  values?: Record<string, number>;
  axes: number[];
}
interface Recorded {
  name: string;
  id: string;
  mapping: string;
  frames: Frame[];
  expect: Array<{ pressed: number[]; axes: number[]; lt?: number; rt?: number }>;
}

const recorded = (JSON.parse(readFileSync('tests/fixtures/gamepads.json', 'utf8')) as { pads: Recorded[] }).pads;

/** Rebuild a Gamepad-like reading from a recorded frame. */
function toPad(r: Recorded, f: Frame, buttonCount: number): PadLike {
  const buttons = Array.from({ length: buttonCount }, (_, i) => {
    const v = f.values?.[String(i)];
    const pressed = (f.press ?? []).includes(i) || (v !== undefined && v > 0.1);
    return { pressed, value: v ?? (pressed ? 1 : 0) };
  });
  return { id: r.id, index: 0, mapping: r.mapping, connected: true, buttons, axes: f.axes };
}

describe('recorded controller layouts', () => {
  for (const r of recorded) {
    it(`${r.name} reads as the standard layout`, () => {
      const cal = new PadCalibration();
      const count = Number(r.frames[0].buttons!.split(':')[1]);
      r.frames.forEach((f, k) => {
        const p = normalizePad(toPad(r, f, count), cal);
        const want = r.expect[k];
        const pressedIdx = p.pressed.flatMap((on, i) => (on ? [i] : []));
        expect(pressedIdx.sort((a, b) => a - b), `frame ${k} buttons`).toEqual([...want.pressed].sort((a, b) => a - b));
        p.axes.forEach((a, i) => expect(a, `frame ${k} axis ${i}`).toBeCloseTo(want.axes[i], 1));
        if (want.lt !== undefined) expect(p.values[6]).toBeCloseTo(want.lt, 2);
        if (want.rt !== undefined) expect(p.values[7]).toBeCloseTo(want.rt, 2);
      });
    });
  }

  it('a raw trigger resting at −1 never reads as a stick (no spinning camera)', () => {
    const cal = new PadCalibration();
    const ps = recorded.find((r) => r.id.includes('09cc'))!;
    const p = normalizePad(toPad(ps, ps.frames[0], 14), cal);
    expect(p.axes.every((a) => Math.abs(a) < 0.05)).toBe(true);
    expect(p.values[6]).toBe(0);
    expect(p.values[7]).toBe(0);
  });

  it('calibration learns the rests even if a trigger / stick is held when the pad appears', () => {
    const cal = new PadCalibration();
    const ps = recorded.find((r) => r.id.includes('09cc'))!;
    const held = { ...toPad(ps, ps.frames[1], 14) }; // L2 half-pressed, right stick pushed
    expect(normalizePad(held, cal).values[6]).toBeCloseTo(0, 1); // can't know yet
    normalizePad(toPad(ps, ps.frames[0], 14), cal); // released once
    const again = normalizePad(held, cal);
    expect(again.values[6]).toBeCloseTo(0.5, 2);
    expect(again.axes[2]).toBeCloseTo(0.9, 1);
  });

  it('detects the controller family from the id', () => {
    expect(detectFamily('Xbox 360 Controller (XInput STANDARD GAMEPAD)')).toBe('xbox');
    expect(detectFamily('045e-0b13-Xbox Wireless Controller')).toBe('xbox');
    expect(detectFamily('DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)')).toBe('playstation');
    expect(detectFamily('USB Gamepad (Vendor: 0079 Product: 0011)')).toBe('generic');
  });

  it('decodes hat-switch d-pads', () => {
    expect(decodeHat(-1)).toEqual([true, false, false, false]);
    expect(decodeHat(-0.428)).toEqual([false, false, false, true]);
    expect(decodeHat(0.714)).toEqual([false, false, true, false]);
    expect(decodeHat(3.2857)).toEqual([false, false, false, false]);
  });

  it('the controller used last wins', () => {
    const cal = new PadCalibration();
    const xb = recorded[0];
    const idle = (i: number): ReturnType<typeof normalizePad> => normalizePad({ ...toPad(xb, xb.frames[0], 17), index: i }, cal);
    const busy = (i: number): ReturnType<typeof normalizePad> => normalizePad({ ...toPad(xb, xb.frames[1], 17), index: i }, cal);
    expect(chooseActivePad([idle(0), idle(1)], -1)).toBe(0);
    expect(chooseActivePad([idle(0), busy(1)], 0)).toBe(1);
    expect(chooseActivePad([idle(0), idle(1)], 1)).toBe(1); // stays until someone else moves
    expect(chooseActivePad([busy(0), busy(1)], 1)).toBe(0);
    expect(chooseActivePad([], 1)).toBe(-1);
  });
});

describe('rumble', () => {
  it('uses the vibration actuator, Firefox haptics, or nothing', () => {
    const playEffect = vi.fn(() => Promise.resolve('complete'));
    expect(rumblePad({ vibrationActuator: { playEffect } } as unknown as Gamepad, 0.7, 0.4, 160)).toBe(true);
    expect(playEffect).toHaveBeenCalledWith('dual-rumble', expect.objectContaining({ duration: 160, strongMagnitude: 0.7, weakMagnitude: 0.4 }));
    const pulse = vi.fn(() => Promise.resolve(true));
    expect(rumblePad({ hapticActuators: [{ pulse }] } as unknown as Gamepad, 0.3, 0.6, 90)).toBe(true);
    expect(pulse).toHaveBeenCalledWith(0.6, 90);
    expect(rumblePad({} as Gamepad, 1, 1, 100)).toBe(false);
    expect(rumblePad(null, 1, 1, 100)).toBe(false);
  });
});
