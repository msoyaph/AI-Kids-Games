import { describe, expect, it } from 'vitest';
import { SYSTEMS } from '../../src/data/bodies';
import { focusDistance, MAP_SLOTS, orbitCameraPosition, pickTarget, slotPosition, SUN_SIZE } from '../../src/systems/orbitMap';
import { recipeFor } from '../../src/r3/space/recipes';

describe('star map layout', () => {
  it('has a slot for every system, ordered outward from the Sun', () => {
    const ordered = SYSTEMS.slice().sort((a, b) => a.order - b.order);
    let last = SUN_SIZE;
    for (const s of ordered) {
      const slot = MAP_SLOTS[s.id];
      expect(slot, s.id).toBeTruthy();
      expect(slot.orbit, s.id).toBeGreaterThan(last);
      last = slot.orbit;
    }
  });

  it('keeps planets apart so they never overlap', () => {
    const ids = SYSTEMS.map((s) => s.id);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = slotPosition(ids[i]);
        const b = slotPosition(ids[j]);
        const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
        expect(d, `${ids[i]}-${ids[j]}`).toBeGreaterThan(MAP_SLOTS[ids[i]].size + MAP_SLOTS[ids[j]].size + 2);
      }
    }
  });

  it('places the camera on its orbit around the target', () => {
    const p = orbitCameraPosition(1, 2, 3, 0.4, 0.8, 10, { x: 0, y: 0, z: 0 });
    expect(Math.hypot(p.x - 1, p.y - 2, p.z - 3)).toBeCloseTo(10);
    expect(p.y).toBeGreaterThan(2);
    expect(focusDistance(2.3)).toBeGreaterThan(focusDistance(0.5));
  });
});

describe('tap picking', () => {
  const targets = [
    { id: 'earth', x: 100, y: 100, r: 10, visible: true },
    { id: 'moon', x: 130, y: 100, r: 4, visible: true },
    { id: 'jupiter', x: 400, y: 300, r: 60, visible: true },
    { id: 'hidden', x: 600, y: 600, r: 30, visible: false },
  ];
  it('picks a small planet even with a slightly-off finger tap', () => {
    expect(pickTarget(targets, 100, 135)).toBe('earth');
    expect(pickTarget(targets, 400, 300)).toBe('jupiter');
    expect(pickTarget(targets, 400 + 70, 300)).toBe('jupiter');
  });
  it('prefers the one you are closest to', () => {
    expect(pickTarget(targets, 128, 101)).toBe('moon');
  });
  it('ignores empty space and things behind the camera', () => {
    expect(pickTarget(targets, 250, 600)).toBeNull();
    expect(pickTarget(targets, 600, 600)).toBeNull();
  });
});

describe('3D planet recipes', () => {
  it('every real body has a hand-made, real-looking recipe', () => {
    for (const s of SYSTEMS) {
      for (const id of s.bodies) {
        const r = recipeFor(id);
        expect(r.colors.length, id).toBeGreaterThanOrEqual(3);
        if (s.id !== 'zephyra' && s.id !== 'wormhole') expect(r.real, id).toBe(true);
      }
    }
    expect(recipeFor('saturn').rings).toBeTruthy();
    expect(recipeFor('uranus').tilt).toBeGreaterThan(1.5);
    expect(recipeFor('zephyra').real).toBe(false);
    expect(recipeFor('jupiter').kind).toBe('banded');
  });
});
