/**
 * Big-head chibi characters, built from soft shapes straight from a registry entry
 * (data/characters.ts). About 1.5 units tall, feet at the origin, facing +z.
 * Animation is procedural: a handful of joint angles eased toward a pose each frame.
 */
import * as THREE from 'three';
import type { Accessory, CharacterDef, ChibiLook } from '../data/characters';
import { Face, type Expression } from './faces';
import { at, box, capsule, cone, cyl, dome, geo, mesh, rbox, shade, soft, sphere, torus } from './kit';

export type Anim = 'idle' | 'walk' | 'cook' | 'serve' | 'cheer' | 'sad' | 'wave' | 'shrug' | 'fidget';

/** Head radius and the height of its center. The head is two thirds of the whole character. */
const R = 0.5;
const HEAD_Y = 1.0;

interface Pose {
  y: number; lean: number; squash: number;
  headX: number; headY: number; headZ: number;
  aLx: number; aLz: number; aRx: number; aRz: number;
  lL: number; lR: number; tail: number;
}
const rest = (): Pose => ({ y: 0, lean: 0, squash: 1, headX: 0, headY: 0, headZ: 0, aLx: -0.3, aLz: -0.7, aRx: -0.3, aRz: 0.7, lL: 0, lR: 0, tail: 0 });
const POSE_KEYS = Object.keys(rest()) as Array<keyof Pose>;

// ------------------------------------------------------------------ hair

function hairCap(m: THREE.Material, scale = 1.05, tilt = -0.34, frac = 0.5): THREE.Mesh {
  const g = geo(`hairCap:${frac}`, () => new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI * frac));
  const c = mesh(g, m, R * scale);
  c.rotation.x = tilt;
  return c;
}

/** A row of soft bumps along the hairline. `drop` lowers the viewer's right side, like a swept fringe. */
function fringe(g: THREE.Group, m: THREE.Material, count: number, spread: number, lift: number, size: number, drop = 0): void {
  for (let i = 0; i < count; i++) {
    const f = count === 1 ? 0.5 : i / (count - 1);
    const a = (f * 2 - 1) * spread;
    const el = lift - drop * f + Math.abs(f - 0.5) * 0.12;
    const s = size * (1 - Math.abs(f - 0.55) * 0.35);
    const b = mesh(sphere(14), m, s, s * 0.82, s * 0.6);
    b.position.set(Math.sin(a) * Math.cos(el) * R * 0.99, Math.sin(el) * R * 0.99, Math.cos(a) * Math.cos(el) * R * 0.99);
    b.rotation.set(-el * 0.7, a, 0);
    g.add(b);
  }
}

function bowShape(m: THREE.Material, size: number): THREE.Group {
  const g = new THREE.Group();
  for (const side of [-1, 1]) g.add(at(mesh(sphere(12), m, size, size * 0.74, size * 0.45), side * size * 0.95, 0, 0, 0, 0, side * 0.25));
  g.add(mesh(sphere(10), m, size * 0.42));
  return g;
}

/** A rounded block with a raised grid on both faces: a waffle. `cell` is the size of one square. */
function waffle(m: THREE.Material, lines: THREE.Material, w: number, h: number, d: number, cell: number): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(rbox(w, h, d, Math.min(w, h, d) * 0.3), m));
  const rows = Math.max(2, Math.round(h / cell)), cols = Math.max(2, Math.round(w / cell)), line = cell * 0.18;
  for (let i = 1; i < rows; i++) g.add(at(mesh(box(), lines, w * 0.94, line, d + line * 0.8), 0, (i / rows - 0.5) * h, 0));
  for (let i = 1; i < cols; i++) g.add(at(mesh(box(), lines, line, h * 0.94, d + line * 0.8), (i / cols - 0.5) * w, 0, 0));
  return g;
}

function starShape(m: THREE.Material, size: number): THREE.Mesh {
  const g = geo('star', () => {
    const s = new THREE.Shape();
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.45 : 1;
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const e = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 2 });
    e.center();
    return e;
  });
  return mesh(g, m, size);
}

/** Builds the hair onto the head and returns any parts that should sway (twin tails, ponytail). */
function buildHair(head: THREE.Group, look: ChibiLook): THREE.Group[] {
  const g = new THREE.Group();
  head.add(g);
  const m = soft(look.hair, 0.78);
  const dark = soft(shade(look.hair, -0.12), 0.78);
  const accent = soft(look.accent, 0.6);
  const sway: THREE.Group[] = [];
  const has = (a: Accessory) => !!look.accessories?.includes(a);

  switch (look.hairStyle) {
    case 'twintailBun': {
      // From the design sheet: a puffy swept fringe, two big droopy tails with scalloped ends,
      // and a bun up top with a hair stick through it.
      g.add(hairCap(m, 1.06, -0.4, 0.53));
      fringe(g, m, 5, 0.95, 0.84, 0.235, 0.13);
      for (const side of [-1, 1]) {
        const tail = new THREE.Group();
        tail.position.set(side * R * 0.97, R * 0.36, -R * 0.26);
        tail.add(mesh(sphere(12), accent, 0.08));
        tail.add(at(mesh(sphere(18), m, 0.17, 0.25, 0.15), side * 0.11, -0.18, 0, 0, 0, side * 0.32));
        tail.add(at(mesh(sphere(20), m, 0.25, 0.29, 0.19), side * 0.25, -0.44, 0, 0, 0, side * 0.12));
        for (const j of [-1, 0, 1]) tail.add(at(mesh(sphere(12), m, 0.1), side * 0.26 + j * 0.135, -0.69 + Math.abs(j) * 0.045, 0));
        g.add(tail);
        sway.push(tail);
      }
      const bun = new THREE.Group();
      bun.position.set(R * 0.44, R * 1.0, -R * 0.06);
      bun.rotation.z = -0.4;
      bun.add(at(mesh(sphere(18), m, 0.2), 0, 0.12, 0));
      bun.add(at(mesh(torus(0.3), accent, 0.11), 0, -0.02, 0, Math.PI / 2));
      bun.add(at(bowShape(accent, 0.055), -0.02, -0.01, 0.13));
      if (has('hairpin')) {
        const stick = soft(shade(look.accent, -0.25), 0.5);
        bun.add(at(mesh(cyl(0.45, 1, 8), stick, 0.022, 0.6, 0.022), 0.03, 0.2, 0.02, 0, 0, -0.35));
        bun.add(at(mesh(sphere(10), soft('#ffd35c', 0.4), 0.04), 0.135, 0.485, 0.02));
      }
      g.add(bun);
      break;
    }
    case 'scoopBun': {
      // Single Scoop's sheet: one big scoop of a bun with a ruffled edge, a fringe swept to one
      // side, and two short chunky tails with zigzag ties.
      g.add(hairCap(m, 1.06, -0.4, 0.53));
      fringe(g, m, 5, 0.95, 0.86, 0.235, 0.22);
      const scoop = new THREE.Group();
      scoop.position.set(-R * 0.52, R * 0.98, -R * 0.06);
      scoop.rotation.z = 0.42;
      scoop.add(at(mesh(sphere(20), m, 0.3, 0.27, 0.28), 0, 0.2, 0));
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        scoop.add(at(mesh(sphere(10), i % 2 ? dark : m, 0.09), Math.cos(a) * 0.25, 0.04, Math.sin(a) * 0.23));
      }
      g.add(scoop);
      const wedge = geo('scoopTail', () => {
        const w = new THREE.CylinderGeometry(0.62, 1, 1, 4).rotateY(Math.PI / 4).toNonIndexed();
        w.computeVertexNormals();
        return w;
      });
      for (const side of [-1, 1]) {
        const tail = new THREE.Group();
        tail.position.set(side * R * 0.98, R * 0.3, -R * 0.24);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          tail.add(at(mesh(cone(6), accent, 0.05, 0.11, 0.05), side * 0.04 + Math.cos(a) * 0.085, 0.02, Math.sin(a) * 0.085));
        }
        tail.add(at(mesh(wedge, m, 0.3, 0.5, 0.2), side * 0.2, -0.3, 0, 0, 0, side * 0.36));
        g.add(tail);
        sway.push(tail);
      }
      break;
    }
    case 'doubleScoop': {
      // Double Scoop's sheet: two scoop buns (one with a waffle wafer stuck in it) and two big
      // waffle-block twin tails.
      g.add(hairCap(m, 1.06, -0.4, 0.53));
      fringe(g, m, 5, 0.95, 0.88, 0.22, 0.16);
      g.add(at(mesh(sphere(18), m, 0.25), -R * 0.5, R * 1.16, -R * 0.1));
      g.add(at(mesh(sphere(18), m, 0.23), R * 0.46, R * 1.2, -R * 0.08));
      if (has('wafer')) g.add(at(waffle(soft('#edb872', 0.7), soft('#c98b45', 0.7), 0.27, 0.27, 0.05, 0.09), R * 0.9, R * 1.58, -R * 0.06, 0, 0, -0.6));
      for (const side of [-1, 1]) {
        const tail = new THREE.Group();
        tail.position.set(side * R * 0.96, R * 0.34, -R * 0.26);
        tail.add(mesh(sphere(12), accent, 0.085));
        tail.add(at(waffle(m, dark, 0.46, 0.68, 0.2, 0.15), side * 0.27, -0.33, 0, 0, 0, side * 0.1));
        g.add(tail);
        sway.push(tail);
      }
      break;
    }
    case 'vanillaCurls': {
      // Vanilla's sheet: soft golden waves down both sides that end in a curl, one big bun on top
      // with a wafer stick in it, and a flower clip.
      g.add(hairCap(m, 1.06, -0.4, 0.53));
      fringe(g, m, 5, 0.95, 0.86, 0.23, 0.12);
      for (const side of [-1, 1]) {
        const lock = new THREE.Group();
        lock.position.set(side * R * 0.95, R * 0.3, -R * 0.2);
        [0.2, 0.185, 0.17, 0.15].forEach((r, k) => lock.add(at(mesh(sphere(14), k % 2 ? dark : m, r, r * 1.05, r * 0.85), side * (0.06 + (k % 2) * 0.07), -0.1 - k * 0.19, 0)));
        lock.add(at(mesh(torus(0.36), m, 0.085), side * 0.17, -0.83, 0.02));
        g.add(lock);
        sway.push(lock);
      }
      const bun = new THREE.Group();
      bun.position.set(-R * 0.42, R * 0.98, -R * 0.06);
      bun.rotation.z = 0.3;
      if (has('waferstick')) bun.add(at(waffle(soft('#edb872', 0.7), soft('#c98b45', 0.7), 0.1, 0.66, 0.05, 0.1), 0.36, 0.4, 0, 0, 0, -1.15));
      bun.add(at(mesh(sphere(20), m, 0.3, 0.27, 0.28), 0, 0.2, 0));
      bun.add(at(mesh(sphere(14), dark, 0.17, 0.11, 0.16), 0.03, 0.4, 0.03));
      g.add(bun);
      const clip = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const t = (i / 5) * Math.PI * 2;
        clip.add(at(mesh(sphere(10), soft('#ffffff', 0.7), 0.085, 0.085, 0.045), Math.cos(t) * 0.1, Math.sin(t) * 0.1, 0));
      }
      clip.add(mesh(sphere(10), accent, 0.06));
      g.add(at(clip, R * 0.7, R * 0.74, R * 0.5, -0.55, 0.7, 0));
      break;
    }
    case 'berryBow': {
      // Raspberry's sheet: a bow bigger than her head, a bun like a raspberry on top, a swept
      // fringe and short side locks.
      g.add(hairCap(m, 1.06, -0.4, 0.53));
      fringe(g, m, 5, 0.95, 0.86, 0.235, 0.2);
      for (const side of [-1, 1]) g.add(at(mesh(sphere(16), m, 0.17, 0.3, 0.2), side * R * 0.98, -R * 0.12, -R * 0.12, 0, 0, side * 0.12));
      const fold = soft(shade(look.accent, -0.15), 0.6);
      const loop = geo('bowLoop', () => {
        const w = new THREE.CylinderGeometry(1, 0.42, 1, 4).rotateY(Math.PI / 4).toNonIndexed();
        w.computeVertexNormals();
        return w;
      });
      const big = new THREE.Group();
      big.position.set(0, R * 0.42, -R * 0.62);
      for (const side of [-1, 1]) {
        // a wedge on its side: narrow at the knot, wide at the tip
        big.add(at(mesh(loop, accent, 0.4, 0.62, 0.11), side * 0.62, 0, 0, 0, 0, side * -Math.PI / 2));
        big.add(at(mesh(box(), fold, 0.05, 0.3, 0.13), side * 0.5, 0, 0));
      }
      big.add(mesh(sphere(12), fold, 0.12, 0.15, 0.1));
      g.add(big);
      // the raspberry: a little ball covered in drupelets, on the viewer's right
      const berry = new THREE.Group();
      berry.position.set(R * 0.5, R * 1.04, -R * 0.02);
      const drupe = soft(shade(look.hair, -0.1), 0.6);
      berry.add(at(mesh(sphere(14), m, 0.16), 0, 0.1, 0));
      for (let i = 0; i < 16; i++) {
        const y = 1 - (i / 15) * 1.55, r = Math.sqrt(Math.max(0, 1 - y * y)), t = i * 2.4;
        berry.add(at(mesh(sphere(8), i % 2 ? drupe : m, 0.072), Math.cos(t) * r * 0.15, 0.1 + y * 0.15, Math.sin(t) * r * 0.15));
      }
      berry.add(at(mesh(sphere(8), soft('#6fc48a', 0.7), 0.05, 0.025, 0.05), 0, 0.27, 0));
      g.add(berry);
      break;
    }
    case 'cookieCream': {
      // Cookie Cream's sheet: two clouds of cream hair dotted with cookie crumbs, a fringe striped
      // with cookie, a cookie of a bun on top and two chocolate wafer sticks through it.
      const cookie = soft(look.accent, 0.8), crumb = soft(shade(look.accent, -0.3), 0.8);
      g.add(hairCap(m, 1.06, -0.4, 0.53));
      for (let i = 0; i < 6; i++) {
        const f = i / 5, a = (f * 2 - 1) * 0.95, el = 0.86 - 0.14 * f + Math.abs(f - 0.5) * 0.12, s = 0.21 * (1 - Math.abs(f - 0.55) * 0.3);
        const lock = mesh(sphere(14), i % 2 ? cookie : m, s, s * 0.82, s * 0.6);
        lock.position.set(Math.sin(a) * Math.cos(el) * R * 0.99, Math.sin(el) * R * 0.99, Math.cos(a) * Math.cos(el) * R * 0.99);
        lock.rotation.set(-el * 0.7, a, 0);
        g.add(lock);
      }
      for (const side of [-1, 1]) {
        const cloud = new THREE.Group();
        cloud.position.set(side * R, R * 0.1, -R * 0.18);
        for (const [x, y, r] of [[0.08, 0.1, 0.22], [0.24, -0.05, 0.2], [0.1, -0.24, 0.23], [0.26, -0.4, 0.19], [0.08, -0.52, 0.17]]) cloud.add(at(mesh(sphere(14), m, r, r, r * 0.85), side * x, y, 0));
        [[0.2, 0.02], [0.14, -0.3], [0.3, -0.36], [0.05, -0.1], [0.1, -0.5]].forEach(([x, y], i) => cloud.add(at(mesh(sphere(8), i % 2 ? cookie : crumb, 0.03), side * x, y, 0.17)));
        g.add(cloud);
        sway.push(cloud);
      }
      const bun = new THREE.Group();
      bun.position.set(R * 0.3, R * 1.0, -R * 0.04);
      bun.rotation.z = -0.25;
      if (has('wafersticks')) for (const k of [0, 1]) bun.add(at(waffle(cookie, crumb, 0.085, 0.6, 0.05, 0.085), 0.3 + k * 0.06, 0.27 - k * 0.14, k ? 0.05 : -0.03, 0, 0, -1.2));
      bun.add(at(mesh(sphere(18), cookie, 0.25, 0.18, 0.24), 0, 0.14, 0));
      for (let i = 0; i < 7; i++) {
        const t = i * 2.4, r = 0.05 + (i % 3) * 0.055;
        bun.add(at(mesh(sphere(8), crumb, 0.036, 0.03, 0.036), Math.cos(t) * r, 0.14 + 0.17 * Math.sqrt(Math.max(0, 1 - (r / 0.25) ** 2)), Math.sin(t) * r));
      }
      g.add(bun);
      break;
    }
    case 'bob':
      g.add(mesh(geo('bobShell', () => new THREE.SphereGeometry(1, 28, 16, Math.PI / 2 + 0.8, Math.PI * 2 - 1.6, 0, Math.PI * 0.66)), m, R * 1.1));
      g.add(hairCap(m, 1.09, -0.3));
      fringe(g, m, 5, 0.85, 0.66, 0.2);
      break;
    case 'long':
      g.add(mesh(geo('bobShell', () => new THREE.SphereGeometry(1, 28, 16, Math.PI / 2 + 0.8, Math.PI * 2 - 1.6, 0, Math.PI * 0.66)), m, R * 1.1));
      g.add(hairCap(m, 1.09, -0.3));
      g.add(at(mesh(capsule(), m, R * 1.5, R * 0.62, R * 0.7), 0, -R * 0.62, -R * 0.5));
      fringe(g, m, 4, 0.7, 0.68, 0.2);
      break;
    case 'short':
      g.add(hairCap(m, 1.06, -0.3));
      fringe(g, m, 4, 0.72, 0.68, 0.19);
      g.add(at(mesh(cone(8), m, 0.07, 0.16, 0.07), 0.04, R * 1.06, -0.04, 0, 0, -0.3));
      break;
    case 'spiky':
      g.add(hairCap(m, 1.05, -0.3));
      for (let i = 0; i < 7; i++) {
        const a = -1 + (i / 6) * 2;
        g.add(at(mesh(cone(8), m, 0.13, 0.34, 0.13), Math.sin(a) * R * 0.62, R * (0.98 - Math.abs(a) * 0.22), R * 0.2 - Math.abs(a) * 0.08, 0.35, 0, -a * 0.75));
      }
      for (let i = 0; i < 5; i++) {
        const a = -0.8 + (i / 4) * 1.6;
        g.add(at(mesh(cone(8), m, 0.12, 0.3, 0.12), Math.sin(a) * R * 0.6, R * 0.86, -R * 0.45, -0.7, 0, -a * 0.7));
      }
      break;
    case 'pony': {
      g.add(hairCap(m, 1.06, -0.3));
      fringe(g, m, 4, 0.72, 0.68, 0.19);
      const tail = new THREE.Group();
      tail.position.set(0, R * 0.55, -R * 0.98);
      tail.add(mesh(sphere(10), accent, 0.08));
      tail.add(at(mesh(capsule(), m, 0.2, 0.2, 0.2), 0, -0.2, -0.1, 0.45));
      tail.add(at(mesh(sphere(12), m, 0.11), 0, -0.42, -0.2));
      g.add(tail);
      sway.push(tail);
      break;
    }
    case 'puffs':
      g.add(hairCap(m, 1.04, -0.3));
      for (const side of [-1, 1]) g.add(at(mesh(sphere(16), m, 0.25), side * R * 0.82, R * 0.8, -R * 0.1));
      break;
    case 'curly':
      g.add(hairCap(m, 1.05, -0.3));
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.add(at(mesh(sphere(12), i % 2 ? dark : m, 0.16), Math.sin(a) * R * 0.86, R * (0.5 + (i % 2) * 0.1 - Math.cos(a) * 0.14), Math.cos(a) * R * 0.8 - R * 0.14));
      }
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        g.add(at(mesh(sphere(12), m, 0.17), Math.sin(a) * R * 0.42, R * 0.98, Math.cos(a) * R * 0.42 - R * 0.1));
      }
      break;
    case 'bun':
      g.add(hairCap(m, 1.06, -0.3));
      fringe(g, m, 3, 0.55, 0.7, 0.2);
      g.add(at(mesh(sphere(16), m, 0.2), 0, R * 1.2, -R * 0.2));
      break;
    case 'bald':
      for (const side of [-1, 1]) g.add(at(mesh(sphere(12), m, 0.1, 0.13, 0.15), side * R * 0.97, R * 0.1, -R * 0.2));
      break;
  }
  return sway;
}

// ------------------------------------------------------------------ accessories

function headAccessories(head: THREE.Group, look: ChibiLook): void {
  const accent = soft(look.accent, 0.6);
  for (const a of look.accessories ?? []) {
    switch (a) {
      case 'glasses': {
        const ink = soft('#3a3550', 0.4);
        for (const side of [-1, 1]) head.add(at(mesh(torus(0.13), ink, 0.125), side * 0.215, -0.03, R * 0.93, 0, side * 0.42, 0));
        head.add(at(mesh(cyl(1, 1, 8), ink, 0.014, 0.12, 0.014), 0, -0.02, R * 0.99, 0, 0, Math.PI / 2));
        break;
      }
      case 'cap': {
        const m = soft(look.outfit, 0.65);
        head.add(at(mesh(dome(), m, R * 1.1, R * 1.02, R * 1.1), 0, R * 0.2, 0, -0.18));
        head.add(at(mesh(cyl(1, 1, 24), soft(shade(look.outfit, -0.15), 0.65), R * 0.72, 0.035, R * 0.62), 0, R * 0.34, R * 0.78, 0.12));
        head.add(at(mesh(sphere(10), soft(look.accent, 0.6), 0.05), 0, R * 1.2, -R * 0.2));
        break;
      }
      case 'flower': {
        const f = new THREE.Group();
        for (let i = 0; i < 5; i++) {
          const t = (i / 5) * Math.PI * 2;
          f.add(at(mesh(sphere(10), accent, 0.055, 0.055, 0.03), Math.cos(t) * 0.07, Math.sin(t) * 0.07, 0));
        }
        f.add(mesh(sphere(10), soft('#ffd35c', 0.5), 0.045));
        head.add(at(f, R * 0.74, R * 0.6, R * 0.6, -0.5, 0.75, 0));
        break;
      }
      case 'headband':
        head.add(at(mesh(torus(0.045, Math.PI), accent, R * 1.12), 0, R * 0.05, R * 0.1, -0.2));
        break;
      case 'mustache':
        for (const side of [-1, 1]) head.add(at(mesh(capsule(), soft(look.hair, 0.8), 0.07, 0.075, 0.06), side * 0.08, -0.17, R * 0.96, 0, 0, side * 1.15));
        break;
      case 'star':
        head.add(at(starShape(soft('#ffd35c', 0.4), 0.085), -R * 0.72, R * 0.66, R * 0.56, -0.5, -0.7, 0.2));
        break;
      case 'bow':
        head.add(at(bowShape(accent, 0.11), 0.05, R * 1.02, R * 0.3, -0.5));
        break;
      default:
        break;
    }
  }
}

// ------------------------------------------------------------------ the character

export class Chibi {
  readonly group = new THREE.Group();
  /** How tall they stand, hair and hats included (for speech bubbles). */
  readonly top: number;
  anim: Anim = 'idle';
  expression: Expression = 'neutral';
  /** Holding the tray out in front. */
  carrying = false;

  private readonly body = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly arms: THREE.Group[] = [];
  private readonly legs: THREE.Group[] = [];
  private readonly sway: THREE.Group[];
  private readonly tray = new THREE.Group();
  private readonly trayItems = new THREE.Group();
  private readonly face: Face;
  private readonly pose = rest();
  private t = Math.random() * 10;
  private stride = 0;
  private blink = 1 + Math.random() * 3;
  private talk = 0;

  constructor(readonly def: CharacterDef) {
    const look = def.look;
    const skin = soft(look.skin, 0.78);
    const outfit = soft(look.outfit, 0.82);
    const outfit2 = soft(look.outfit2 ?? shade(look.outfit, -0.2), 0.82);
    const accent = soft(look.accent, 0.6);
    const trousers = look.outfitStyle === 'overalls' || look.outfitStyle === 'hoodie' || look.outfitStyle === 'coat';
    this.group.add(this.body);

    // Legs: short pegs with rounded shoes.
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.09, 0.27, 0);
      leg.add(at(mesh(capsule(), trousers ? outfit2 : skin, 0.125, 0.105, 0.125), 0, -0.1, 0));
      if (look.socks && !trousers) leg.add(at(mesh(cyl(1, 1, 14), soft(look.socks, 0.8), 0.068, 0.07, 0.068), 0, -0.15, 0));
      if (look.outfitStyle === 'coat') leg.add(at(mesh(cyl(1, 1, 14), accent, 0.07, 0.035, 0.07), 0, -0.155, 0));
      leg.add(at(mesh(sphere(14), soft(look.shoes, 0.55), 0.085, 0.062, 0.125), 0, -0.208, 0.035));
      this.body.add(leg);
      this.legs.push(leg);
    }

    // Torso.
    const torso = new THREE.Group();
    this.body.add(torso);
    switch (look.outfitStyle) {
      case 'bubble': {
        // Single Scoop's dress: a buttoned top and a big round skirt with a zigzag trim.
        torso.add(at(mesh(sphere(18), outfit, 0.185, 0.19, 0.155), 0, 0.52, 0));
        torso.add(at(mesh(sphere(24), outfit2, 0.34, 0.17, 0.31), 0, 0.3, 0));
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const tooth = mesh(cone(6), accent, 0.055, 0.11, 0.055);
          tooth.position.set(Math.sin(a) * 0.255, 0.418, Math.cos(a) * 0.232);
          tooth.rotation.order = 'YXZ';
          tooth.rotation.set(Math.PI - 0.8, a, 0);
          torso.add(tooth);
        }
        const button = soft('#8a8f9e', 0.5);
        torso.add(at(mesh(sphere(8), button, 0.02), 0, 0.495, 0.158));
        torso.add(at(mesh(sphere(8), button, 0.02), 0, 0.458, 0.165));
        break;
      }
      case 'bell': {
        // Vanilla's outfit: a buttoned top, a short skirt and a curly ribbon at each hip
        // (the wide bell sleeves are built with the arms).
        torso.add(at(mesh(sphere(18), outfit, 0.19, 0.2, 0.16), 0, 0.5, 0));
        torso.add(at(mesh(cyl(0.62, 1, 22), outfit2, 0.26, 0.17, 0.24), 0, 0.345, 0));
        const button = soft(shade(look.accent, -0.1), 0.5);
        torso.add(at(mesh(sphere(8), button, 0.02), 0, 0.5, 0.157));
        torso.add(at(mesh(sphere(8), button, 0.02), 0, 0.45, 0.16));
        for (const side of [-1, 1]) {
          torso.add(at(mesh(capsule(), accent, 0.035, 0.07, 0.035), side * 0.25, 0.31, 0.02, 0, 0, side * 0.5));
          torso.add(at(mesh(torus(0.34), accent, 0.06), side * 0.33, 0.24, 0.02));
        }
        break;
      }
      case 'apron': {
        // Raspberry's outfit: a top and skirt under a white apron with a pocket and a scalloped hem.
        const white = soft('#ffffff', 0.82), pocket = soft(shade(look.outfit2 ?? look.accent, 0.55), 0.8);
        torso.add(at(mesh(sphere(18), outfit, 0.19, 0.2, 0.16), 0, 0.5, 0));
        torso.add(at(mesh(cyl(0.62, 1, 22), outfit2, 0.27, 0.17, 0.25), 0, 0.345, 0));
        torso.add(at(mesh(rbox(0.19, 0.15, 0.05, 0.02), white), 0, 0.5, 0.14));
        torso.add(at(mesh(rbox(0.08, 0.06, 0.02, 0.008), pocket), 0, 0.49, 0.172));
        torso.add(at(mesh(sphere(16), white, 0.19, 0.12, 0.1), 0, 0.37, 0.165));
        for (const x of [-0.11, 0, 0.11]) torso.add(at(mesh(sphere(10), white, 0.062, 0.05, 0.04), x, 0.285, 0.215 - Math.abs(x) * 0.25));
        break;
      }
      case 'coat': {
        // Cookie Cream's outfit: a buttoned, belted coat with two flared tails dotted with cookie
        // crumbs, over trousers.
        const crumb = soft(shade(look.accent, -0.25), 0.8);
        torso.add(at(mesh(sphere(18), outfit, 0.195, 0.2, 0.165), 0, 0.5, 0));
        torso.add(at(mesh(cyl(0.95, 1.02, 20), outfit2, 0.185, 0.14, 0.16), 0, 0.345, 0));
        torso.add(at(mesh(cyl(1, 1, 20), accent, 0.176, 0.035, 0.153), 0, 0.432, 0));
        for (const y of [0.545, 0.495]) torso.add(at(mesh(sphere(8), accent, 0.02), 0, y, 0.158));
        for (const side of [-1, 1]) {
          const tail = new THREE.Group();
          tail.position.set(side * 0.15, 0.43, 0);
          tail.rotation.z = side * 0.55;
          tail.add(at(mesh(rbox(0.15, 0.3, 0.2, 0.04), outfit), 0, -0.15, 0));
          [[0.02, -0.09], [-0.03, -0.19], [0.04, -0.25]].forEach(([x, y], i) => tail.add(at(mesh(sphere(8), i % 2 ? crumb : accent, 0.028), side * x, y, 0.1)));
          torso.add(tail);
        }
        break;
      }
      case 'dress':
        torso.add(at(mesh(cyl(0.5, 1, 22), outfit, 0.3, 0.36, 0.28), 0, 0.44, 0));
        torso.add(at(mesh(sphere(16), outfit, 0.17, 0.12, 0.15), 0, 0.6, 0));
        torso.add(at(mesh(torus(0.16), accent, 0.2, 0.2, 0.19), 0, 0.275, 0, Math.PI / 2));
        break;
      case 'overalls':
        torso.add(at(mesh(sphere(18), outfit, 0.19, 0.2, 0.16), 0, 0.5, 0));
        torso.add(at(mesh(cyl(0.9, 1.02, 20), outfit2, 0.2, 0.2, 0.17), 0, 0.38, 0));
        torso.add(at(mesh(rbox(0.2, 0.16, 0.05, 0.02), outfit2), 0, 0.53, 0.14));
        for (const side of [-1, 1]) torso.add(at(mesh(sphere(8), accent, 0.02), side * 0.07, 0.585, 0.165));
        break;
      case 'hoodie':
        torso.add(at(mesh(sphere(18), outfit, 0.205, 0.21, 0.175), 0, 0.5, 0));
        torso.add(at(mesh(cyl(0.95, 1.02, 20), outfit2, 0.19, 0.13, 0.165), 0, 0.345, 0));
        torso.add(at(mesh(torus(0.32), outfit, 0.15, 0.15, 0.13), 0, 0.64, -0.03, Math.PI / 2 - 0.25));
        torso.add(at(mesh(rbox(0.2, 0.09, 0.04, 0.02), soft(shade(look.outfit, -0.12), 0.82)), 0, 0.44, 0.16));
        break;
      case 'tee':
        torso.add(at(mesh(sphere(18), outfit, 0.19, 0.2, 0.16), 0, 0.5, 0));
        torso.add(at(mesh(cyl(0.95, 1.05, 20), outfit2, 0.195, 0.14, 0.168), 0, 0.35, 0));
        break;
      default: {
        // shirt: a buttoned top, a belt and a little skirt (Minty's uniform)
        torso.add(at(mesh(sphere(18), outfit, 0.19, 0.2, 0.16), 0, 0.5, 0));
        torso.add(at(mesh(cyl(0.62, 1, 22), outfit2, 0.27, 0.17, 0.25), 0, 0.345, 0));
        torso.add(at(mesh(cyl(1, 1, 20), accent, 0.172, 0.035, 0.15), 0, 0.432, 0));
        const button = soft(shade(look.accent, -0.1), 0.5);
        torso.add(at(mesh(sphere(8), button, 0.02), 0, 0.535, 0.152));
        torso.add(at(mesh(sphere(8), button, 0.02), 0, 0.475, 0.158));
      }
    }
    if (look.accessories?.includes('bowtie')) torso.add(at(bowShape(accent, 0.1), 0, 0.565, 0.225));
    if (look.accessories?.includes('cravat')) {
      // a bow with a little white ruffle under it
      torso.add(at(bowShape(accent, 0.09), 0, 0.585, 0.225));
      for (const x of [-0.035, 0.035]) torso.add(at(mesh(sphere(10), soft('#ffffff', 0.8), 0.04, 0.035, 0.025), x, 0.528, 0.2));
    }
    if (look.accessories?.includes('flowerbow')) {
      // a flower at the collar
      const flower = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const t = (i / 5) * Math.PI * 2 + Math.PI / 2;
        flower.add(at(mesh(sphere(10), accent, 0.05, 0.05, 0.028), Math.cos(t) * 0.06, Math.sin(t) * 0.06, 0));
      }
      flower.add(mesh(sphere(10), soft('#ffffff', 0.7), 0.035));
      torso.add(at(flower, 0, 0.585, 0.225, -0.15));
    }
    if (look.accessories?.includes('gembow')) {
      // a white collar bow with a red gem in the middle
      torso.add(at(bowShape(soft('#ffffff', 0.8), 0.085), 0, 0.58, 0.222));
      torso.add(at(mesh(sphere(10), soft(look.accent, 0.3), 0.04), 0, 0.58, 0.262));
    }
    if (look.accessories?.includes('backbow')) {
      // a big bow tied at the back, showing on both sides
      torso.add(at(bowShape(accent, 0.2), 0, 0.52, -0.16));
      torso.add(at(bowShape(soft(shade(look.accent, -0.12), 0.6), 0.15), 0, 0.38, -0.15));
    }
    if (look.accessories?.includes('scarf')) {
      torso.add(at(mesh(torus(0.3), accent, 0.15, 0.15, 0.14), 0, 0.62, 0, Math.PI / 2));
      torso.add(at(mesh(rbox(0.08, 0.2, 0.04, 0.02), accent), 0.09, 0.5, 0.16, 0, 0, 0.12));
    }

    // Arms: stubby and held out a little, like the drawing.
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.175, 0.585, 0.03);
      if (look.outfitStyle === 'bell') {
        // a wide bell sleeve with a trim at its open end
        arm.add(at(mesh(cyl(0.45, 1, 16), outfit, 0.12, 0.21, 0.1), 0, -0.115, 0));
        arm.add(at(mesh(cyl(1, 1, 16), accent, 0.123, 0.03, 0.103), 0, -0.215, 0));
      } else arm.add(at(mesh(capsule(), outfit, 0.11, 0.12, 0.11), 0, -0.12, 0));
      if (look.outfitStyle === 'shirt' || look.outfitStyle === 'bubble' || look.outfitStyle === 'apron' || look.outfitStyle === 'coat') arm.add(at(mesh(cyl(1, 1, 12), accent, 0.06, 0.03, 0.06), 0, -0.205, 0));
      if (look.outfitStyle === 'bubble') arm.add(at(mesh(sphere(12), outfit, 0.085), 0, -0.04, 0));
      arm.add(at(mesh(sphere(12), skin, 0.066), 0, -0.265, 0));
      this.body.add(arm);
      this.arms.push(arm);
    }

    // The big head.
    this.head.position.y = HEAD_Y;
    this.body.add(this.head);
    const skull = new THREE.Group();
    skull.scale.set(1.05, 0.95, 1);
    this.head.add(skull);
    skull.add(mesh(sphere(32), skin, R));
    for (const side of [-1, 1]) skull.add(at(mesh(sphere(10), skin, 0.07, 0.08, 0.05), side * R * 0.98, -0.07, 0));
    this.face = new Face(look);
    const decal = new THREE.Mesh(
      geo('faceDecal', () => new THREE.SphereGeometry(R * 1.012, 28, 20, Math.PI / 2 - 1, 2, Math.PI / 2 - 0.85 + 0.13, 1.7)),
      new THREE.MeshStandardMaterial({ map: this.face.texture, transparent: true, depthWrite: false, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 }),
    );
    decal.renderOrder = 2;
    skull.add(decal);
    this.sway = buildHair(this.head, look);
    headAccessories(this.head, look);

    // The tray she carries.
    this.tray.position.set(0, 0.47, 0.37);
    this.tray.add(mesh(cyl(1, 0.92, 24), soft('#fff3dc', 0.6), 0.27, 0.025, 0.17));
    this.tray.add(this.trayItems);
    this.tray.visible = false;
    this.body.add(this.tray);

    this.group.scale.setScalar(look.scale ?? 1);
    this.top = new THREE.Box3().setFromObject(this.group).max.y;
  }

  /** Open and close the mouth for a moment. */
  say(seconds: number): void {
    this.talk = seconds;
  }

  /** Put these models on the tray (an empty list hides it). */
  setTray(items: THREE.Object3D[]): void {
    this.trayItems.clear();
    // Up to three sit side by side; a bigger tray squeezes them together a little.
    const gap = Math.min(0.16, 0.42 / Math.max(1, items.length - 1));
    items.forEach((item, i) => {
      item.position.set((i - (items.length - 1) / 2) * gap, 0.014, i % 2 ? 0.035 : -0.015);
      item.scale.setScalar(items.length > 3 ? 0.62 : 0.72);
      this.trayItems.add(item);
    });
    this.tray.visible = items.length > 0;
    this.carrying = items.length > 0;
  }

  update(dt: number): void {
    this.t += dt;
    const t = this.t, p = rest();
    switch (this.anim) {
      case 'walk': {
        this.stride += dt * 12.5;
        const s = Math.sin(this.stride);
        p.lL = s * 0.8; p.lR = -s * 0.8;
        p.aLx = -s * 0.7; p.aRx = s * 0.7;
        p.y = Math.abs(Math.cos(this.stride)) * 0.055;
        p.lean = 0.1; p.headZ = s * 0.04; p.tail = 0.3;
        break;
      }
      case 'cook': {
        const s = Math.sin(t * 12);
        p.aLx = -1.05 + s * 0.32; p.aRx = -1.05 - s * 0.32;
        p.aLz = -0.15; p.aRz = 0.15;
        p.lean = 0.13; p.headX = 0.13; p.y = Math.abs(s) * 0.012;
        break;
      }
      case 'serve':
        p.aLx = p.aRx = -1.45;
        p.aLz = -0.1; p.aRz = 0.1;
        p.lean = 0.2;
        break;
      case 'cheer': {
        const b = Math.abs(Math.sin(t * 8));
        p.y = b * 0.2; p.squash = 1 + b * 0.06;
        p.aLx = p.aRx = -2.35;
        p.aLz = -0.75; p.aRz = 0.75;
        p.headZ = Math.sin(t * 8) * 0.09; p.tail = 0.25 * b;
        break;
      }
      case 'sad':
        p.headX = 0.3; p.lean = 0.08;
        p.aLx = p.aRx = 0;
        p.aLz = -0.2; p.aRz = 0.2;
        break;
      case 'wave':
        p.aRx = -1.85;
        p.aRz = 0.75 + Math.sin(t * 10) * 0.4;
        p.headZ = -0.1; p.y = Math.abs(Math.sin(t * 5)) * 0.025;
        break;
      case 'shrug':
        p.aLx = p.aRx = -0.9;
        p.aLz = -1.3; p.aRz = 1.3;
        p.headZ = 0.17; p.y = 0.02;
        break;
      case 'fidget':
        p.headZ = Math.sin(t * 5) * 0.1;
        p.lL = Math.max(0, Math.sin(t * 9)) * 0.3;
        p.y = Math.abs(Math.sin(t * 4.5)) * 0.018;
        break;
      default:
        p.y = Math.sin(t * 2.2) * 0.012;
        p.headZ = Math.sin(t * 0.9) * 0.035;
        p.aLz = -0.7 - Math.sin(t * 2.2) * 0.04;
        p.aRz = 0.7 + Math.sin(t * 2.2) * 0.04;
    }
    if (this.carrying && this.anim !== 'serve' && this.anim !== 'cheer' && this.anim !== 'shrug') {
      p.aLx = p.aRx = -1.2;
      p.aLz = -0.12; p.aRz = 0.12;
    }
    const k = 1 - Math.exp(-dt * 16), q = this.pose;
    for (const key of POSE_KEYS) q[key] += (p[key] - q[key]) * k;

    this.body.position.y = q.y;
    this.body.rotation.x = q.lean;
    this.body.scale.set(2 - q.squash, q.squash, 2 - q.squash);
    this.head.rotation.set(q.headX, q.headY, q.headZ);
    this.arms[0].rotation.set(q.aLx, 0, q.aLz);
    this.arms[1].rotation.set(q.aRx, 0, q.aRz);
    this.legs[0].rotation.x = q.lL;
    this.legs[1].rotation.x = q.lR;
    this.sway.forEach((part, i) => {
      const side = this.sway.length > 1 ? (i ? 1 : -1) : 0;
      part.rotation.z = side * (0.03 + q.tail * 0.45) + Math.sin(t * 1.8 + i * 2) * 0.035;
      part.rotation.x = -q.tail * 0.5 + Math.sin(this.stride * 2 + i) * q.tail * 0.35;
    });

    this.blink -= dt;
    const blinking = this.blink < 0.13;
    if (this.blink <= 0) this.blink = 2.2 + Math.random() * 3.4;
    let talking = false;
    if (this.talk > 0) {
      this.talk -= dt;
      talking = Math.sin(t * 24) > 0;
    }
    this.face.draw(this.expression, blinking, talking);
  }

  dispose(): void {
    this.group.removeFromParent();
    this.face.texture.dispose();
    // Shapes and plain materials are shared; only the face material belongs to this character.
    this.group.traverse(o => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m?.map === this.face.texture) m.dispose();
    });
  }
}
