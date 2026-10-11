import { describe, expect, it } from 'vitest';
import { EMULATED_MOUSE_MS, InputModeTracker, MOUSE_SWITCH_PX } from '../../src/input/mode';

describe('touch ↔ keyboard / mouse / gamepad mode', () => {
  it('a touch switches to touch mode; a key, a mouse click or a gamepad switches back', () => {
    const m = new InputModeTracker(false);
    const seen: boolean[] = [];
    m.onChange = (t) => seen.push(t);
    m.touched(1000);
    expect(m.touch).toBe(true);
    m.keyPressed('KeyW');
    expect(m.touch).toBe(false);
    m.touched(2000);
    m.mousePressed(2000 + EMULATED_MOUSE_MS + 1);
    expect(m.touch).toBe(false);
    m.touched(5000);
    m.padUsed();
    expect(m.touch).toBe(false);
    expect(seen).toEqual([true, false, true, false, true, false]);
  });

  it('ignores the mouse events a browser emulates right after a tap', () => {
    const m = new InputModeTracker(false);
    m.touched(1000);
    m.mousePressed(1000 + 50);
    m.mouseMoved(40, 40, 1000 + 60);
    expect(m.touch).toBe(true);
    expect(m.emulatedMouse(1000 + EMULATED_MOUSE_MS - 1)).toBe(true);
    expect(m.emulatedMouse(1000 + EMULATED_MOUSE_MS)).toBe(false);
  });

  it('a real mouse has to travel a few pixels to take over (a bumped desk is not a switch)', () => {
    const m = new InputModeTracker(true);
    const t = 10_000;
    m.mouseMoved(2, 1, t);
    expect(m.touch).toBe(true);
    m.mouseMoved(MOUSE_SWITCH_PX, 0, t + 16);
    expect(m.touch).toBe(false);
  });

  it('on-screen keyboards sending "Unidentified" keys never switch modes', () => {
    const m = new InputModeTracker(true);
    m.keyPressed('Unidentified');
    m.keyPressed('');
    expect(m.touch).toBe(true);
  });

  it('setting the mode directly does not fire onChange; repeated input does not re-fire', () => {
    const m = new InputModeTracker(false);
    let n = 0;
    m.onChange = () => n++;
    m.touch = true;
    m.touched(1);
    m.touched(2);
    expect(n).toBe(0);
    m.keyPressed('Space');
    m.keyPressed('Space');
    expect(n).toBe(1);
  });
});
