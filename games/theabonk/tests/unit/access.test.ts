import { describe, expect, it } from 'vitest';
import { bind, conflicts, defaultBindings, FIXED_KEYS, GAME_ACTIONS, keyLabel, padLabel, sanitizeBindings } from '../../src/input/actions';
import { MemoryStore } from '../../src/core/storage';
import { defaultSave, SaveManager, sanitizeSave } from '../../src/meta/save';
import { blink, FLASH_EFFECTS, MAX_FLASH_HZ, minInterval, pulse, setFlashSteady, type FlashEffect } from '../../src/render/flash';
import { newRun } from '../../src/sim/run';
import { step } from '../../src/sim/sim';
import { emptyInput } from '../../src/sim/world';

describe('flash safety', () => {
  it('no registered effect flashes faster than 3 Hz', () => {
    for (const [name, hz] of Object.entries(FLASH_EFFECTS)) {
      expect(hz, name).toBeLessThanOrEqual(MAX_FLASH_HZ);
      // sample the actual blink at 240 Hz for 10 s and count on→off→on cycles
      let changes = 0;
      let prev = blink(0, name as FlashEffect);
      for (let k = 1; k <= 2400; k++) {
        const v = blink(k / 240, name as FlashEffect);
        if (v !== prev) changes++;
        prev = v;
      }
      expect(changes / 2 / 10, name).toBeLessThanOrEqual(MAX_FLASH_HZ + 0.1);
      expect(minInterval(name as FlashEffect)).toBeGreaterThanOrEqual(1 / MAX_FLASH_HZ - 1e-9);
    }
  });

  it('reduced motion holds blinks steady', () => {
    setFlashSteady(true);
    try {
      for (let k = 0; k < 100; k++) {
        expect(blink(k * 0.037, 'iframes')).toBe(1);
        expect(pulse(k * 0.037, 'elite')).toBe(0.5);
      }
    } finally {
      setFlashSteady(false);
    }
  });
});

describe('bindings', () => {
  it('defaults are complete and conflict-free; Escape / F3 are never bindable', () => {
    const d = defaultBindings();
    expect(Object.keys(d).sort()).toEqual([...GAME_ACTIONS].sort());
    expect(conflicts(d)).toEqual([]);
    for (const a of GAME_ACTIONS) for (const k of d[a].keys) expect(FIXED_KEYS.has(k)).toBe(false);
  });

  it('sanitizes stored bindings', () => {
    const b = sanitizeBindings({ jump: { keys: ['KeyJ', 'Escape', 7, 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN'], pad: [3, -1, 99, 3] }, bogus: { keys: ['KeyZ'] } });
    expect(b.jump.keys).toEqual(['KeyJ', 'KeyK', 'KeyL', 'KeyM']);
    expect(b.jump.pad).toEqual([3]);
    expect(b.slide).toEqual(defaultBindings().slide);
    expect((b as Record<string, unknown>).bogus).toBeUndefined();
    expect(sanitizeBindings('nonsense')).toEqual(defaultBindings());
  });

  it('binding a key reports (and allows) conflicts', () => {
    const b = defaultBindings();
    const clash = bind(b, 'jump', { key: 'KeyW' }, 0);
    expect(clash).toEqual(['moveUp']);
    expect(b.jump.keys[0]).toBe('KeyW');
    expect(conflicts(b)).toEqual([{ input: 'key:KeyW', actions: ['moveUp', 'jump'] }]);
    bind(b, 'slide', { pad: 2 }, -1);
    expect(b.slide.pad).toContain(2);
  });

  it('labels keys and buttons for people', () => {
    expect(keyLabel('KeyW')).toBe('W');
    expect(keyLabel('ShiftLeft')).toBe('Left Shift');
    expect(keyLabel('Digit3')).toBe('3');
    expect(padLabel(0, 'xbox')).toBe('A');
    expect(padLabel(0, 'playstation')).toBe('Cross');
    expect(padLabel(40)).toBe('Button 41');
  });
});

describe('settings', () => {
  it('controls and accessibility survive save round-trips and progress resets', () => {
    const store = new MemoryStore();
    const m = new SaveManager(store);
    m.data.settings.controls.bindings.jump.keys = ['KeyJ'];
    m.data.settings.controls.slideToggle = true;
    m.data.settings.access = { reducedMotion: 'on', colorblind: true, largeText: true, highContrast: true };
    m.data.gold = 500;
    m.save();
    const again = new SaveManager(store);
    expect(again.data.settings.controls.bindings.jump.keys).toEqual(['KeyJ']);
    expect(again.data.settings.access.colorblind).toBe(true);
    again.reset();
    expect(again.data.gold).toBe(0);
    expect(again.data.settings.controls.slideToggle).toBe(true);
    expect(again.data.settings.access.reducedMotion).toBe('on');
  });

  it('bad values fall back to defaults', () => {
    const d = sanitizeSave({ ...defaultSave(), settings: { controls: { slideToggle: 'yes' }, access: { reducedMotion: 'sometimes', largeText: 1 } } });
    expect(d.settings.controls.slideToggle).toBe(false);
    expect(d.settings.access.reducedMotion).toBe('auto');
    expect(d.settings.access.largeText).toBe(false);
  });
});

describe('hold-to-hop', () => {
  it('automatic hops never get the bunny-hop speed bonus', () => {
    const speedAfterHop = (auto: boolean): number => {
      const w = newRun({ seed: 3, characterId: 'thea', god: true });
      w.maxEnemies = 0;
      w.player.vx = 12;
      w.player.landT = 0; // just landed: inside the bunny-hop window
      const input = emptyInput();
      input.moveX = 1;
      input.jump = true;
      input.autoHop = auto;
      step(w, input);
      return Math.hypot(w.player.vx, w.player.vz);
    };
    expect(speedAfterHop(false)).toBeGreaterThan(speedAfterHop(true));
  });
});
