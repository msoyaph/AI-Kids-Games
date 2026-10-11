import { describe, expect, it } from 'vitest';
import { SETTINGS_VERSION, defaultSettings, migrateSettings } from '../../src/save/save';
import { resolveAssist } from '../../src/tuning/balance';

describe('settings migration', () => {
  it('v1 steering assist ON becomes Light (same behaviour as before)', () => {
    const s = migrateSettings({ v: 1, master: 0.3, steeringAssist: true, quality: 'low' });
    expect(s.v).toBe(SETTINGS_VERSION);
    expect(s.assist).toBe('light');
    expect(s.master).toBe(0.3);
    expect(s.quality).toBe('low');
    expect((s as unknown as Record<string, unknown>).steeringAssist).toBeUndefined();
  });
  it('v1 steering assist OFF becomes Auto', () => {
    expect(migrateSettings({ v: 1, steeringAssist: false }).assist).toBe('auto');
    expect(migrateSettings({ steeringAssist: false }).assist).toBe('auto');
  });
  it('current settings pass through and bad values are repaired', () => {
    expect(migrateSettings({ ...defaultSettings(), assist: 'full' }).assist).toBe('full');
    expect(migrateSettings({ v: 2, assist: 'banana' }).assist).toBe('auto');
  });
  it('Auto = Light on touch, Off on keyboard and gamepad', () => {
    expect(resolveAssist('auto', 'touch')).toBe('light');
    expect(resolveAssist('auto', 'keyboard')).toBe('off');
    expect(resolveAssist('auto', 'gamepad')).toBe('off');
    expect(resolveAssist('full', 'keyboard')).toBe('full');
  });
  it('HUD size and the controls card: old settings get defaults, bad values are repaired, choices are kept', () => {
    const old = migrateSettings({ v: 2, assist: 'light', master: 0.5 });
    expect(old.hudSize).toBe(1);
    expect(old.controlsSeen).toEqual({});
    expect(old.master).toBe(0.5);
    expect(migrateSettings({ v: 2, hudSize: 7 }).hudSize).toBe(1);
    expect(migrateSettings({ v: 2, controlsSeen: 'yes' }).controlsSeen).toEqual({});
    const kept = migrateSettings({ ...defaultSettings(), hudSize: 1.5, controlsSeen: { touch: true } });
    expect(kept.hudSize).toBe(1.5);
    expect(kept.controlsSeen).toEqual({ touch: true });
  });
  it('v2 → v3: Buttons (the old default) becomes the glass Joystick, Tilt stays, touch options get defaults', () => {
    const fromButtons = migrateSettings({ v: 2, touchSteer: 'buttons', master: 0.4 });
    expect(fromButtons.touchSteer).toBe('joystick');
    expect(fromButtons.touch).toEqual({ stick: 'floating', size: 'medium', opacity: 1, leftHanded: false, highContrast: false });
    expect(fromButtons.master).toBe(0.4);
    expect(migrateSettings({ v: 2, touchSteer: 'tilt' }).touchSteer).toBe('tilt');
    // v3 choices are kept as they are
    const kept = migrateSettings({ ...defaultSettings(), touchSteer: 'buttons', touch: { stick: 'fixed', size: 'large', opacity: 0.7, leftHanded: true, highContrast: true } });
    expect(kept.touchSteer).toBe('buttons');
    expect(kept.touch.leftHanded).toBe(true);
    expect(kept.touch.size).toBe('large');
    expect(migrateSettings({ ...defaultSettings(), touchSteer: 'banana' }).touchSteer).toBe('joystick');
  });
});
