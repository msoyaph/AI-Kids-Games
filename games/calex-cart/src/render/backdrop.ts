import * as THREE from 'three';
import type { SkyData } from '../data/types';
import { Rng } from '../core/rng';

/**
 * Distant scenery ring (mountains, skyline, clouds, dunes) plus optional stars.
 * Follows the camera horizontally like the sky dome, so it always reads as "far away".
 * Built at unit radius 1 and scaled to the draw distance.
 */
export function buildBackdrop(sky: SkyData, seed: string): THREE.Group {
  const g = new THREE.Group();
  const kind = sky.backdrop ?? 'none';
  const rng = new Rng(seed + ':backdrop');
  const base = new THREE.Color(sky.backdropColor ?? 0x6a7fa8);
  const fog = new THREE.Color(sky.fog);
  const pos: number[] = [];
  const col: number[] = [];
  const c = new THREE.Color();
  const push = (x: number, y: number, z: number, color: THREE.Color): void => {
    pos.push(x, y, z);
    col.push(color.r, color.g, color.b);
  };
  const R = 1;
  if (kind === 'mountains' || kind === 'dunes') {
    const n = kind === 'mountains' ? 46 : 60;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + rng.range(-0.02, 0.02);
      const w = ((Math.PI * 2) / n) * rng.range(1.2, 2.2);
      const h = kind === 'mountains' ? rng.range(0.08, 0.22) : rng.range(0.03, 0.06);
      const peak = a0 + w * rng.range(0.35, 0.65);
      const rr = R * rng.range(0.92, 1);
      const y0 = -0.06;
      const shade = rng.range(0.85, 1.1);
      c.copy(base).multiplyScalar(shade).lerp(fog, 0.25);
      const top = c.clone().lerp(new THREE.Color(0xffffff), kind === 'mountains' && h > 0.17 ? 0.6 : 0.1);
      if (kind === 'mountains') {
        push(Math.sin(a0) * rr, y0, Math.cos(a0) * rr, c);
        push(Math.sin(peak) * rr, h, Math.cos(peak) * rr, top);
        push(Math.sin(a0 + w) * rr, y0, Math.cos(a0 + w) * rr, c);
      } else {
        const steps = 6;
        for (let k = 0; k < steps; k++) {
          const t0 = k / steps;
          const t1 = (k + 1) / steps;
          const aa = a0 + w * t0;
          const ab = a0 + w * t1;
          const ha = Math.sin(t0 * Math.PI) * h;
          const hb = Math.sin(t1 * Math.PI) * h;
          push(Math.sin(aa) * rr, y0, Math.cos(aa) * rr, c);
          push(Math.sin(aa) * rr, ha, Math.cos(aa) * rr, top);
          push(Math.sin(ab) * rr, hb, Math.cos(ab) * rr, top);
          push(Math.sin(aa) * rr, y0, Math.cos(aa) * rr, c);
          push(Math.sin(ab) * rr, hb, Math.cos(ab) * rr, top);
          push(Math.sin(ab) * rr, y0, Math.cos(ab) * rr, c);
        }
      }
    }
  } else if (kind === 'skyline') {
    const n = 70;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const w = ((Math.PI * 2) / n) * rng.range(0.6, 0.95);
      const h = rng.range(0.05, 0.2);
      const rr = R * rng.range(0.9, 1);
      c.copy(base).multiplyScalar(rng.range(0.7, 1.2));
      const x0 = Math.sin(a0) * rr;
      const z0 = Math.cos(a0) * rr;
      const x1 = Math.sin(a0 + w) * rr;
      const z1 = Math.cos(a0 + w) * rr;
      const y0 = -0.05;
      push(x0, y0, z0, c);
      push(x0, h, z0, c);
      push(x1, h, z1, c);
      push(x0, y0, z0, c);
      push(x1, h, z1, c);
      push(x1, y0, z1, c);
      // a few lit windows
      if (sky.night) {
        const lit = new THREE.Color(rng.pick([0xffe45c, 0xff6fae, 0x4ce0d2, 0xb47bff]));
        for (let k = 0; k < 3; k++) {
          const ty = rng.range(0.01, h * 0.9);
          const t0 = rng.range(0.15, 0.6);
          const t1 = t0 + 0.2;
          const ax = x0 + (x1 - x0) * t0;
          const az = z0 + (z1 - z0) * t0;
          const bx = x0 + (x1 - x0) * t1;
          const bz = z0 + (z1 - z0) * t1;
          const s = 0.994;
          push(ax * s, ty, az * s, lit);
          push(ax * s, ty + 0.006, az * s, lit);
          push(bx * s, ty + 0.006, bz * s, lit);
          push(ax * s, ty, az * s, lit);
          push(bx * s, ty + 0.006, bz * s, lit);
          push(bx * s, ty, bz * s, lit);
        }
      }
    }
  } else if (kind === 'clouds') {
    const n = 26;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.range(-0.1, 0.1);
      const y = rng.range(-0.02, 0.12);
      const rr = R * rng.range(0.85, 0.98);
      const puffs = 4;
      c.copy(base).lerp(new THREE.Color(0xffffff), 0.6);
      for (let p = 0; p < puffs; p++) {
        const pa = a + (p - puffs / 2) * 0.03;
        const s = rng.range(0.03, 0.06);
        const cx = Math.sin(pa) * rr;
        const cz = Math.cos(pa) * rr;
        // flat disc facing the centre (fan of triangles)
        const segs = 8;
        const tx = Math.cos(pa);
        const tz = -Math.sin(pa);
        for (let k = 0; k < segs; k++) {
          const t0 = (k / segs) * Math.PI * 2;
          const t1 = ((k + 1) / segs) * Math.PI * 2;
          push(cx, y, cz, c);
          push(cx + tx * Math.cos(t0) * s, y + Math.sin(t0) * s * 0.55, cz + tz * Math.cos(t0) * s, c);
          push(cx + tx * Math.cos(t1) * s, y + Math.sin(t1) * s * 0.55, cz + tz * Math.cos(t1) * s, c);
        }
      }
    }
  }
  if (pos.length) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide, depthWrite: false }));
    mesh.renderOrder = -9;
    mesh.frustumCulled = false;
    g.add(mesh);
  }
  if (sky.night || kind === 'stars') {
    const n = 700;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, Math.PI * 2);
      const e = Math.asin(rng.range(0.05, 1));
      p[i * 3] = Math.cos(e) * Math.sin(a) * 1.02;
      p[i * 3 + 1] = Math.sin(e) * 1.02;
      p[i * 3 + 2] = Math.cos(e) * Math.cos(a) * 1.02;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false, depthWrite: false }));
    stars.renderOrder = -9;
    stars.frustumCulled = false;
    g.add(stars);
  }
  return g;
}
