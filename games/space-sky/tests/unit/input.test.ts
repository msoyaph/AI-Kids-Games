import { afterEach, describe, expect, it, vi } from 'vitest';

describe('gamepad', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('reads the stick, d-pad and buttons with a dead zone', async () => {
    const pad = {
      connected: true,
      axes: [0.1, -0.9],
      buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === 0 })),
    };
    vi.stubGlobal('navigator', { getGamepads: () => [null, pad] });
    const { readGamepad } = await import('../../src/input/input');
    const s = readGamepad()!;
    expect(s.x).toBe(0);
    expect(s.y).toBeCloseTo(-0.9);
    expect(s.boost).toBe(true);
    expect(s.action).toBe(false);
    pad.buttons[15] = { pressed: true };
    expect(readGamepad()!.x).toBe(1);
  });

  it('fails quietly when the Gamepad API is blocked (iframe policy)', async () => {
    vi.stubGlobal('navigator', {
      getGamepads: () => {
        throw new Error('SecurityError');
      },
    });
    const { readGamepad } = await import('../../src/input/input');
    expect(readGamepad()).toBeNull();
    expect(readGamepad()).toBeNull();
  });
});
