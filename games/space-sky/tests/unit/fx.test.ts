import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { Particles3 } from '../../src/r3/fx/particles';
import { Trail } from '../../src/r3/fx/trail';

describe('trail ribbon', () => {
  it('lays points down as the head moves and never grows past its size', () => {
    const t = new Trail(10, 0.2, '#fff', '#00f', 0.1);
    const cam = new PerspectiveCamera();
    cam.position.set(0, 5, 10);
    const p = new Vector3();
    for (let i = 0; i < 3; i++) t.push(p.set(i * 0.04, 0, 0));
    // Slow movement: still just the anchor and the live head.
    expect((t as unknown as { count: number }).count).toBe(2);
    for (let i = 0; i < 200; i++) t.push(p.set(i * 0.06, 0, 0));
    expect((t as unknown as { count: number }).count).toBe(10);
    t.update(cam);
    const g = t.mesh.geometry;
    expect(g.drawRange.count).toBe(9 * 6);
    const pos = g.attributes.position.array as Float32Array;
    for (const v of pos) expect(Number.isFinite(v)).toBe(true);
  });
});

describe('particle pool', () => {
  it('spawns up to its size, ages particles out and reuses slots', () => {
    const ps = new Particles3(20, 'spark');
    ps.burst(0, 0, 0, 50, 2, 0.5, 0.1, '#ff0');
    expect(ps.alive).toBe(20);
    for (let i = 0; i < 40; i++) ps.update(1 / 60);
    expect(ps.alive).toBe(0);
    ps.spawn(1, 2, 3, 0, 0, 0, 1, 0.1, '#fff');
    ps.update(1 / 60);
    expect(ps.alive).toBe(1);
  });
});
