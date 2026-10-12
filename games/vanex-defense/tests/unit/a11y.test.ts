import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { actionsByCode, bindable, DEFAULT_HOTKEYS, HOTKEY_ACTIONS, keyLabel, rebind, resolveHotkeys } from '../../src/app/hotkeys';
import { motionReduced } from '../../src/app/a11y';
import { FlashLimiter, MAX_FLASHES_PER_SECOND, MAX_PULSE_HZ, mixColor, pulse } from '../../src/render/flash';

describe('hotkeys', () => {
  it('defaults are unique and bindable', () => {
    const codes = Object.values(DEFAULT_HOTKEYS);
    expect(new Set(codes).size).toBe(codes.length);
    for (const c of codes) expect(bindable(c), c).toBe(true);
    expect(actionsByCode(resolveHotkeys({})).get('KeyP')).toBe('pause');
  });

  it('rebinding swaps instead of losing a key, and saves only changes', () => {
    let saved = rebind({}, 'pause', 'KeyO');
    expect(saved).toEqual({ pause: 'KeyO' });
    // F belongs to speed: pause takes it, speed gets pause's old key
    saved = rebind(saved, 'pause', 'KeyF');
    const map = resolveHotkeys(saved);
    expect(map.pause).toBe('KeyF');
    expect(map.speed).toBe('KeyO');
    expect(new Set(Object.values(map)).size).toBe(HOTKEY_ACTIONS.length);
    // back to defaults → nothing stored
    expect(rebind(rebind(saved, 'speed', 'KeyF'), 'pause', 'KeyP')).toEqual({});
  });

  it('refuses reserved keys and repairs damaged saves', () => {
    for (const c of ['Escape', 'Space', 'Enter', 'Tab', 'MetaLeft', 'F12']) expect(bindable(c), c).toBe(false);
    expect(rebind({}, 'sell', 'Escape')).toEqual({});
    const map = resolveHotkeys({ bogus: 'KeyA', sell: 'Tab', upgrade: 'KeyP' } as Record<string, string>);
    expect(map.sell).toBe('KeyS'); // invalid key ignored
    expect(map.pause).toBe('KeyP'); // first action keeps a doubled key
    expect(map.upgrade).toBe(''); // the other goes unbound
  });

  it('labels keys briefly', () => {
    expect(keyLabel('KeyQ')).toBe('Q');
    expect(keyLabel('Digit0')).toBe('0');
    expect(keyLabel('Numpad5')).toBe('Num 5');
    expect(keyLabel('ArrowLeft')).toBe('←');
    expect(keyLabel('')).toBe('—');
  });
});

describe('reduced motion setting', () => {
  it('on/off override the system; auto follows it', () => {
    expect(motionReduced({ reducedMotion: 'on' })).toBe(true);
    expect(motionReduced({ reducedMotion: 'off' })).toBe(false);
    expect(typeof motionReduced({ reducedMotion: 'auto' })).toBe('boolean');
  });
});

describe('flash safety', () => {
  it('allows at most 3 full flashes in any one-second window', () => {
    const f = new FlashLimiter();
    const allowedAt: number[] = [];
    // a burst every 50 ms for 5 seconds
    for (let t = 0; t < 5; t += 0.05) if (f.allow(t)) allowedAt.push(t);
    for (const t0 of allowedAt) expect(allowedAt.filter((t) => t >= t0 && t < t0 + 1).length).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND);
    expect(f.dimmed).toBeGreaterThan(0);
    expect(allowedAt.length).toBeGreaterThanOrEqual(13); // still lively: ~3 per second get through
  });

  it('pulses are smooth and capped', () => {
    expect(pulse(0, 10)).toBeCloseTo(0);
    // capped at MAX_PULSE_HZ: a full cycle takes at least 1 / MAX_PULSE_HZ seconds
    expect(pulse(1 / MAX_PULSE_HZ / 2, 50)).toBeCloseTo(1);
    expect(mixColor(0x000000, 0xffffff, 0.5)).toBe(0x808080);
  });

  it('render code has no fast flicker (audit)', () => {
    // Brightness changes driven by time must be smooth and ≤ MAX_PULSE_HZ:
    //  - no hard on/off toggles like `Math.floor(time * n) % 2` or `sin(t * k) > 0 ? a : b`
    //  - alpha/tint oscillations `sin(t * k)` need k ≤ 2π·MAX_PULSE_HZ
    const dir = 'src/render';
    const files = readdirSync(dir).filter((f) => f.endsWith('.ts'));
    const kMax = 2 * Math.PI * MAX_PULSE_HZ;
    const bad: string[] = [];
    for (const f of files) {
      readFileSync(`${dir}/${f}`, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          const where = `${f}:${i + 1}: ${line.trim()}`;
          if (/\b(time|t|now)\s*\*\s*[\d.]+\)\s*%\s*2/.test(line)) bad.push(`toggle — ${where}`);
          if (/Math\.sin\([^)]*\)\s*>\s*0\s*\?/.test(line)) bad.push(`toggle — ${where}`);
          if (/\.(alpha|tint)\s*=/.test(line)) {
            for (const m of line.matchAll(/Math\.sin\(\s*(?:this\.)?(?:time|t|now)\s*\*\s*([\d.]+)/g)) {
              if (Number(m[1]) > kMax) bad.push(`${(Number(m[1]) / (2 * Math.PI)).toFixed(1)} Hz — ${where}`);
            }
          }
        });
    }
    expect(bad).toEqual([]);
  });
});
