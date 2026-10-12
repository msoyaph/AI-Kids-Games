import { AdditiveBlending, Color, DoubleSide, Group, Mesh, MeshBasicMaterial, type Sprite } from 'three';
import type { MachineArt } from '../../data/levelTypes';
import {
  INK,
  M,
  bake,
  bakeGeo,
  box,
  cone,
  cyl,
  dishGeo,
  dome,
  halo,
  helix,
  hot,
  lath,
  ownGlow,
  rbox,
  sph,
  star,
  swapMat,
  tor,
  wrap,
  type Kit,
  type Prop,
} from './propKit';

/**
 * Machines that need power orbs (~2.3 × 2.3; the beacon 2.5 × 3.5). Off: lights dim, parts asleep, the
 * socket blinks to ask for an orb. Powered: an orb sits in the socket, lights glow, things spin and move.
 */

const TAU = Math.PI * 2;
let phaseSeed = 0.3;
const nextPhase = () => (phaseSeed = (phaseSeed + 2.399) % TAU);

/** Colors pass through a palette so old, dusty wrecks (decorations) reuse the same builders. */
export type Pal = (hex: string) => string | Color;
const DUST = new Color('#b9a48e');
export const CLEAN: Pal = (c) => c;
export const DUSTY: Pal = (c) => new Color(c).lerp(DUST, 0.55).multiplyScalar(0.82);

interface Built {
  body: Group;
  movers: Record<string, Group>;
  socket: [number, number, number] | null;
}

function socketKit(k: Kit, x: number, y: number, z: number): void {
  k.metal(tor(0.2, 0.05, 6, 20), '#c9d2ee', x, y, z);
  k.paint(cyl(0.17, 0.17, 0.05, 20), '#1a1238', x, y, z - 0.012, Math.PI / 2);
}

function hazard(k: Kit, w: number, h: number, y: number, z: number, c: Pal): void {
  k.paint(box(w, h, 0.02), c('#2a2440'), 0, y, z);
  const n = Math.round(w / 0.2);
  for (let i = 0; i < n; i++) k.paint(box(0.07, h * 1.25, 0.012), c('#ffd23a'), -w / 2 + (i + 0.5) * (w / n), y, z + 0.012, 0, 0, 0.6);
}

function gradBox(k: Kit, w: number, h: number, d: number, r: number, c: Pal, lo: string, hi: string, x: number, y: number, z = 0): void {
  k.grad(k.paint(rbox(w, h, d, r, 2), c(hi), x, y, z), c(lo), c(hi), y - h / 2, y + h / 2);
}

// ------------------------------------------------------------------ builders (bottom center origin, facing +z)

function buildGeneric(key: string, c: Pal): Built {
  const body = bake(key, (k) => {
    for (const sx of [-1, 1]) k.metal(rbox(0.42, 0.14, 0.86, 0.05, 1), c('#5a6080'), sx * 0.58, 0.07);
    gradBox(k, 1.72, 1.44, 1.0, 0.2, c, '#9aa4c7', '#ffffff', 0, 0.86);
    k.paint(rbox(1.76, 0.14, 1.04, 0.06, 1), c('#4c7dff'), 0, 0.25);
    k.metal(rbox(1.3, 0.56, 0.04, 0.02, 1), c('#c9d2ee'), 0, 1.22, 0.49);
    k.paint(rbox(1.2, 0.46, 0.06, 0.03, 1), c(INK), 0, 1.22, 0.5);
    socketKit(k, 0, 0.64, 0.51);
    k.metal(cyl(0.08, 0.1, 0.2, 10), c('#7a809f'), 0.45, 1.66);
    k.metal(cyl(0.025, 0.03, 0.62, 6), c('#7a809f'), -0.55, 1.88);
    k.glow(sph(0.085, 0.085, 0.04, 10, 6), '#8cff66', -0.34, 1.22, 0.54);
    k.glow(sph(0.085, 0.085, 0.04, 10, 6), '#ffe066', 0, 1.22, 0.54);
    k.glow(sph(0.085, 0.085, 0.04, 10, 6), '#4dd4ff', 0.34, 1.22, 0.54);
    k.glow(sph(0.07, 0.07, 0.07, 10, 8), '#ff5d73', -0.55, 2.22);
  });
  const radar = bake(`${key}:radar`, (k) => {
    k.paint(cyl(0.03, 0.03, 0.16, 6), c('#c9d2ee'), 0, 0.08);
    k.paint(dishGeo(0.32, 0.12, 0.025, 20), c('#f4f7ff'), 0, 0.2, 0.05, 0.75);
    k.paint(cyl(0.012, 0.012, 0.2, 5), c('#7a809f'), 0, 0.3, 0.17, 0.75);
  });
  radar.position.set(0.45, 1.76, 0);
  return { body, movers: { radar }, socket: [0, 0.64, 0.54] };
}

function buildRover(key: string, c: Pal, lights = true): Built {
  const body = bake(key, (k) => {
    for (const x of [-0.72, 0, 0.72]) {
      for (const z of [0.42, -0.42]) k.paint(cyl(0.27, 0.27, 0.18, 18), c('#3a3f5a'), x, 0.27, z, Math.PI / 2);
      k.metal(cyl(0.12, 0.12, 0.04, 12), c('#ffc83d'), x, 0.27, 0.52, Math.PI / 2);
      k.metal(box(0.08, 0.36, 0.08), c('#7a809f'), x, 0.5, 0.33);
    }
    k.metal(rbox(1.6, 0.08, 0.08, 0.03, 1), c('#7a809f'), 0, 0.64, 0.33);
    gradBox(k, 1.9, 0.56, 0.96, 0.16, c, '#e9782a', '#ffd6a8', 0, 0.9);
    k.metal(rbox(1.96, 0.06, 1.0, 0.03, 1), c('#c9d2ee'), 0, 1.19);
    k.paint(rbox(1.15, 0.05, 0.8, 0.02, 1), c('#2a3f9e'), -0.3, 1.27, 0, 0.12);
    for (const x of [-0.6, -0.3, 0]) k.metal(box(0.02, 0.055, 0.8), c('#c9d2ee'), x, 1.28, 0, 0.12);
    k.metal(cyl(0.05, 0.06, 0.62, 8), c('#c9d2ee'), 0.62, 1.52);
    k.metal(cyl(0.012, 0.02, 0.75, 5), c('#7a809f'), -0.82, 1.55, -0.2, 0, 0, 0.12);
    k.paint(rbox(0.7, 0.09, 0.02, 0.02, 1), c('#4c7dff'), 0.42, 1.02, 0.48);
    socketKit(k, -0.45, 0.9, 0.5);
    if (lights) {
      k.glow(sph(0.05, 0.05, 0.05, 8, 6), '#ff5d73', -0.86, 1.93, -0.2);
      k.glow(rbox(0.3, 0.06, 0.02, 0.02, 1), '#8cff66', 0.42, 0.8, 0.485);
    }
  });
  const head = bake(`${key}:head`, (k) => {
    gradBox(k, 0.52, 0.28, 0.32, 0.08, c, '#c9d2ee', '#ffffff', 0, 0.06);
    for (const sx of [-1, 1]) k.paint(tor(0.07, 0.022, 6, 16), c('#7a809f'), sx * 0.12, 0.06, 0.165);
    if (lights) for (const sx of [-1, 1]) k.glow(sph(0.055, 0.055, 0.025, 10, 6), '#4dd4ff', sx * 0.12, 0.06, 0.165);
  });
  head.position.set(0.62, 1.84, 0);
  return { body, movers: { head }, socket: [-0.45, 0.9, 0.53] };
}

function buildPod(key: string, c: Pal, lights = true): Built {
  const body = bake(key, (k) => {
    for (const sx of [-1, 0, 1]) {
      const z = sx === 0 ? -0.3 : 0.12;
      k.metal(cyl(0.035, 0.045, 0.62, 6), c('#9aa4c7'), sx * 0.5, 0.3, z, 0, 0, sx * 0.4);
      k.metal(cyl(0.12, 0.14, 0.05, 12), c('#7a809f'), sx * 0.62, 0.025, z);
    }
    if (key.indexOf('deco') < 0) {
      gradBox(k, 0.5, 0.62, 0.46, 0.08, c, '#9aa4c7', '#f4f7ff', 0.86, 0.31, 0.2);
      socketKit(k, 0.86, 0.33, 0.45);
    }
  });
  const shell = bake(`${key}:shell`, (k) => {
    k.grad(k.paint(sph(0.92, 0.76, 0.58, 24, 14), c('#2de0c7'), 0, 0.76), c('#139a8a'), c('#c9fff4'), 0, 1.52);
    k.paint(lath([[0.26, -0.16], [0.18, -0.06], [0.22, 0.06], [0, 0.06]], 16), c('#9aa4c7'), 0, 0.02);
    k.paint(tor(0.86, 0.045, 4, 36).scale(1, 0.66, 1), c('#f4f7ff'), 0, 0.62, 0, Math.PI / 2);
    k.paint(tor(0.33, 0.055, 8, 28), c('#c9d2ee'), 0.18, 0.92, 0.45, -0.32, 0.2);
    k.paint(sph(0.31, 0.27, 0.12, 16, 10), c('#7a4ae0'), 0.18, 0.92, 0.43, -0.32, 0.2);
    k.paint(sph(0.08, 0.05, 0.02, 10, 6), c('#e6ddff'), 0.09, 1.02, 0.53, -0.32, 0.2, 0.5);
    k.paint(rbox(0.06, 0.4, 0.3, 0.03, 1), c('#ff9f43'), -0.88, 0.95, 0, 0, 0, 0.3);
    if (lights) for (const [x, z] of [[-0.48, 0.44], [0, 0.585], [0.48, 0.44]] as Array<[number, number]>) k.glow(sph(0.07, 0.07, 0.04, 8, 6), '#ffe066', x, 0.62, z);
  });
  shell.position.y = 0.42;
  return { body, movers: { shell }, socket: key.indexOf('deco') < 0 ? [0.86, 0.33, 0.48] : null };
}

function buildBeacon(key: string, c: Pal): Built {
  const body = bake(key, (k) => {
    k.metal(lath([[1.0, 0], [1.0, 0.14], [0.88, 0.24], [0.64, 0.3], [0, 0.3]], 32).scale(1, 1, 0.62), c('#9aa4c7'));
    k.grad(k.paint(lath([[0.56, 0.28], [0.5, 0.9], [0.38, 2.15], [0, 2.15]], 24), c('#f4f7ff')), c('#aab4d8'), c('#ffffff'), 0.3, 2.1);
    k.paint(cyl(0.483, 0.497, 0.2, 24), c('#9b6bff'), 0, 1.2);
    k.paint(cyl(0.405, 0.419, 0.16, 24), c('#ff7ad9'), 0, 1.86);
    k.metal(cyl(0.58, 0.48, 0.12, 24), c('#ffc83d'), 0, 2.2);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      k.metal(cyl(0.035, 0.035, 0.48, 6), c('#ffc83d'), Math.sin(a) * 0.42, 2.5, Math.cos(a) * 0.42);
    }
    k.metal(lath([[0, 2.72], [0.56, 2.72], [0.52, 2.8], [0.26, 2.9], [0, 2.92]], 24), c('#ffc83d'));
    k.metal(cyl(0.06, 0.08, 0.12, 8), c('#ffc83d'), 0, 2.96);
    socketKit(k, 0, 0.62, 0.53);
    k.glow(sph(0.2, 0.22, 0.2, 16, 12), hot('#fff3b0', 2.6), 0, 2.48);
    k.glow(star(0.27, 0.12), hot('#ffe066', 2.4), 0, 3.22);
    for (const y of [1.55, 1.68]) k.glow(rbox(0.12, 0.05, 0.02, 0.02, 1), '#4dd4ff', 0, y, 0.43);
  });
  return { body, movers: {}, socket: [0, 0.62, 0.56] };
}

function buildWeather(key: string, c: Pal): Built {
  const body = bake(key, (k) => {
    gradBox(k, 1.3, 0.72, 0.84, 0.12, c, '#9aa4c7', '#ffffff', 0, 0.38);
    k.paint(rbox(1.34, 0.1, 0.88, 0.04, 1), c('#2ed47a'), 0, 0.68);
    socketKit(k, -0.28, 0.36, 0.43);
    k.metal(cyl(0.05, 0.065, 1.42, 8), c('#c9d2ee'), 0, 1.45);
    k.metal(rbox(0.05, 0.4, 0.05, 0.02, 1), c('#7a809f'), 0.62, 0.92, 0, 0, 0, -0.4);
    k.paint(rbox(0.62, 0.04, 0.46, 0.02, 1), c('#2a3f9e'), 0.72, 1.12, 0, 0.5, 0, -0.35);
    k.glow(sph(0.055, 0.055, 0.03, 8, 6), '#8cff66', 0.3, 0.38, 0.43);
    k.glow(sph(0.055, 0.055, 0.03, 8, 6), '#ffe066', 0.46, 0.38, 0.43);
    k.glow(rbox(0.3, 0.05, 0.02, 0.02, 1), '#4dd4ff', 0.38, 0.22, 0.43);
  });
  const dish = bake(`${key}:dish`, (k) => {
    k.paint(rbox(0.36, 0.05, 0.05, 0.02, 1), c('#7a809f'), -0.18, 0, 0);
    k.paint(dishGeo(0.4, 0.14, 0.03, 22), c('#f4f7ff'), -0.38, 0.05, 0, 0.5, 0, 0.75);
    k.paint(cyl(0.012, 0.012, 0.32, 5), c('#7a809f'), -0.5, 0.2, 0.08, 0.5, 0, 0.75);
    k.glow(sph(0.04, 0.04, 0.04, 8, 6), '#ff5d73', -0.6, 0.32, 0.15);
  });
  dish.position.set(0, 1.3, 0);
  const cups = bake(`${key}:cups`, (k) => {
    k.paint(sph(0.07, 0.07, 0.07, 10, 8), c('#c9d2ee'), 0, 0.02);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU;
      k.paint(cyl(0.014, 0.014, 0.34, 5), c('#c9d2ee'), Math.sin(a) * 0.17, 0.02, Math.cos(a) * 0.17, Math.PI / 2, a, 0);
      k.paint(dome(0.09, 0.09, 0.09, 12, 5), c('#ff5d73'), Math.sin(a) * 0.34, 0.02, Math.cos(a) * 0.34, 0, a + Math.PI / 2, Math.PI / 2);
    }
  });
  cups.position.set(0, 2.18, 0);
  return { body, movers: { dish, cups }, socket: [-0.28, 0.36, 0.46] };
}

function buildAntenna(key: string, c: Pal): Built {
  const body = bake(key, (k) => {
    gradBox(k, 1.1, 0.62, 0.8, 0.1, c, '#9aa4c7', '#ffffff', 0, 0.31);
    k.paint(rbox(1.14, 0.08, 0.84, 0.03, 1), c('#ff9f43'), 0, 0.56);
    socketKit(k, -0.15, 0.27, 0.41);
    k.metal(cyl(0.045, 0.075, 1.82, 8), c('#c9d2ee'), 0, 1.5);
    const bars: Array<[number, number]> = [[0.95, 1.18], [0.7, 1.62], [0.46, 2.03]];
    for (const [w, y] of bars) {
      k.paint(rbox(w, 0.07, 0.07, 0.03, 1), c('#ff9f43'), 0, y);
      for (const sx of [-1, 1]) {
        k.metal(cyl(0.012, 0.012, Math.hypot(w / 2, 0.3), 4), c('#7a809f'), (sx * w) / 4, y - 0.15, 0, 0, 0, sx * Math.atan2(w / 2, 0.3));
        k.glow(sph(0.045, 0.045, 0.045, 8, 6), '#ffe066', (sx * w) / 2, y);
      }
    }
    k.paint(dishGeo(0.22, 0.08, 0.02, 16), c('#f4f7ff'), 0.16, 0.95, 0.1, 0.9, 0, -0.6);
    k.glow(sph(0.085, 0.085, 0.085, 12, 8), '#ff5d73', 0, 2.46);
    k.glow(sph(0.04, 0.04, 0.02, 8, 6), '#8cff66', 0.35, 0.3, 0.41);
  });
  return { body, movers: {}, socket: [-0.15, 0.27, 0.44] };
}

function buildHeater(key: string, c: Pal): Built {
  const body = bake(key, (k) => {
    for (const sx of [-1, 1]) k.metal(rbox(0.36, 0.12, 0.8, 0.04, 1), c('#5a6080'), sx * 0.55, 0.06);
    gradBox(k, 1.6, 1.25, 0.9, 0.22, c, '#e0503a', '#ffb38a', 0, 0.745);
    k.paint(rbox(1.0, 0.62, 0.06, 0.08, 2), c('#2a1838'), -0.2, 0.88, 0.44);
    for (const x of [-0.45, -0.2, 0.05]) k.metal(box(0.035, 0.6, 0.03), c('#c9d2ee'), x, 0.88, 0.49);
    socketKit(k, 0.5, 0.42, 0.46);
    k.metal(cyl(0.16, 0.18, 0.55, 14), c('#9aa4c7'), 0.42, 1.6);
    k.metal(cyl(0.23, 0.2, 0.07, 14), c('#7a809f'), 0.42, 1.9);
    k.metal(rbox(0.24, 0.24, 0.04, 0.12, 2), c('#f4f7ff'), 0.5, 1.05, 0.45);
    for (const y of [0.7, 0.82, 0.94, 1.06]) k.glow(cyl(0.028, 0.028, 0.74, 8), hot('#ff4a12', 1.9), -0.2, y, 0.465, 0, 0, Math.PI / 2);
    k.glow(rbox(0.02, 0.09, 0.02, 0.008, 1), '#ff5d73', 0.5, 1.07, 0.475, 0, 0, -0.6);
  });
  return { body, movers: {}, socket: [0.5, 0.42, 0.49] };
}

function buildDrill(key: string, c: Pal): Built {
  const body = bake(key, (k) => {
    k.metal(rbox(2.0, 0.14, 1.0, 0.05, 1), c('#5a6080'), 0, 0.07);
    hazard(k, 1.9, 0.08, 0.07, 0.5, c);
    k.paint(cyl(0.3, 0.3, 0.012, 20), c('#1a1238'), 0, 0.145);
    for (const sx of [-1, 1]) {
      k.paint(rbox(0.13, 2.06, 0.13, 0.04, 1), c('#ffc83d'), sx * 0.46, 1.12, -0.32, 0, 0, -sx * 0.31);
      k.paint(rbox(0.11, 1.5, 0.11, 0.04, 1), c('#ffc83d'), sx * 0.7, 0.84, 0.12, 0.38, 0, -sx * 0.2);
      k.metal(rbox(0.1, 0.1, 0.7, 0.03, 1), c('#7a809f'), sx * 0.62, 0.6, -0.1);
    }
    k.metal(rbox(1.12, 0.07, 0.07, 0.03, 1), c('#7a809f'), 0, 0.6, -0.32);
    k.grad(k.paint(rbox(0.6, 0.3, 0.74, 0.06, 2), c('#ffc83d'), 0, 2.12), c('#e0a020'), c('#ffe08a'), 1.97, 2.27);
    gradBox(k, 0.72, 0.56, 0.7, 0.1, c, '#e9782a', '#ffc58a', 0, 1.56);
    socketKit(k, 0, 1.56, 0.36);
    k.glow(sph(0.07, 0.07, 0.07, 10, 8), '#ff9f43', -0.22, 2.32);
    k.glow(sph(0.07, 0.07, 0.07, 10, 8), '#ff9f43', 0.22, 2.32);
  });
  const bit = bake(`${key}:bit`, (k) => {
    k.metal(cyl(0.06, 0.06, 0.4, 10), c('#c9d2ee'), 0, -0.2);
    k.metal(cone(0.3, 0.7, 16), c('#dfe5f5'), 0, -0.75, 0, Math.PI);
    k.metal(helix(0.29, 0.05, 0.62, 2.4, 0.04), c('#ffc83d'), 0, -0.42);
    k.metal(cyl(0.14, 0.14, 0.08, 14), c('#7a809f'), 0, -0.38);
  });
  bit.position.y = 1.28;
  return { body, movers: { bit }, socket: [0, 1.56, 0.39] };
}

function buildLift(key: string, c: Pal): Built {
  const body = bake(key, (k) => {
    k.metal(rbox(2.1, 0.24, 1.0, 0.06, 2), c('#7a809f'), 0, 0.12);
    hazard(k, 1.4, 0.08, 0.12, 0.5, c);
    for (const sx of [-1, 1]) {
      k.metal(rbox(0.16, 1.98, 0.22, 0.05, 2), c('#c9d2ee'), sx * 0.78, 1.21);
      k.glow(rbox(0.04, 1.6, 0.02, 0.015, 1), '#4dd4ff', sx * 0.78, 1.22, 0.115);
    }
    k.grad(k.paint(rbox(1.74, 0.18, 0.28, 0.06, 2), c('#ffc83d'), 0, 2.2), c('#e0a020'), c('#ffe08a'), 2.11, 2.29);
    k.glow(sph(0.06, 0.06, 0.04, 10, 6), '#ff9f43', 0, 2.2, 0.15);
    gradBox(k, 0.5, 0.82, 0.32, 0.08, c, '#9aa4c7', '#ffffff', -0.98, 0.41, 0.26);
    socketKit(k, -0.98, 0.44, 0.43);
  });
  const platform = bake(`${key}:platform`, (k) => {
    k.grad(k.paint(rbox(1.36, 0.12, 0.9, 0.04, 2), c('#ffc83d'), 0, 0.06), c('#e0a020'), c('#ffe08a'), 0, 0.12);
    k.glow(rbox(1.2, 0.035, 0.02, 0.012, 1), '#8cff66', 0, 0.06, 0.455);
    for (const sx of [-1, 1]) k.paint(rbox(0.1, 0.16, 0.24, 0.03, 1), c('#9aa4c7'), sx * 0.66, 0.06);
  });
  platform.position.y = 0.25;
  return { body, movers: { platform }, socket: [-0.98, 0.44, 0.46] };
}

export function buildMachine(art: MachineArt, c: Pal = CLEAN, deco = false): Built {
  const key = `m:${art}${deco ? ':deco' : ''}`;
  switch (art) {
    case 'rover':
      return buildRover(key, c, !deco);
    case 'pod':
      return buildPod(key, c, !deco);
    case 'beacon':
      return buildBeacon(key, c);
    case 'weather':
      return buildWeather(key, c);
    case 'antenna':
      return buildAntenna(key, c);
    case 'heater':
      return buildHeater(key, c);
    case 'drill':
      return buildDrill(key, c);
    case 'lift':
      return buildLift(key, c);
    default:
      return buildGeneric(key, c);
  }
}

// ------------------------------------------------------------------ the prop

/** A machine the player powers up by bringing orbs to its socket. */
export class MachineProp implements Prop {
  readonly group: Group;
  private readonly lit: Mesh[] = [];
  private readonly onMat = ownGlow();
  private readonly ringMat = ownGlow();
  private readonly orb: Group;
  private readonly mv: Record<string, Group>;
  private readonly fx: Array<Mesh | Sprite> = [];
  private readonly fxMats: MeshBasicMaterial[] = [];
  private powered = false;
  private p = 0;
  private readonly phase = nextPhase();

  constructor(private readonly art: MachineArt) {
    const b = buildMachine(art);
    this.mv = b.movers;
    const inner = new Group();
    inner.add(b.body);
    for (const m of Object.values(b.movers)) inner.add(m);
    const glow = M.glow();
    const off = M.glowOff();
    inner.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh && m.material === glow) {
        m.material = off;
        this.lit.push(m);
      }
    });
    const ring = bake('socket:ring', (k) => k.glow(tor(0.13, 0.022, 5, 20), '#ffffff'));
    swapMat(ring, glow, this.ringMat);
    this.orb = bake('socket:orb', (k) => {
      k.glow(sph(0.13, 0.13, 0.13, 12, 8), hot('#7fe6ff', 2.2));
      k.glow(sph(0.05, 0.05, 0.03, 8, 6), hot('#ffffff', 3), -0.04, 0.05, 0.11);
    });
    this.orb.visible = false;
    if (b.socket) {
      ring.position.set(b.socket[0], b.socket[1], b.socket[2] - 0.015);
      this.orb.position.set(b.socket[0], b.socket[1], b.socket[2] - 0.04);
      inner.add(ring, this.orb);
    }
    this.addFx(inner);
    this.group = wrap(inner);
    this.update(0, 0);
  }

  private addFx(inner: Group): void {
    if (this.art === 'beacon') {
      const geo = bakeGeo('beam', (k) => k.glow(cone(0.5, 3.2, 18), '#ffffff', 1.6, 0, 0, 0, 0, Math.PI / 2));
      const m = new MeshBasicMaterial({ color: new Color('#ffe9a0').multiplyScalar(0.7), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
      this.fxMats.push(m);
      const beams = new Group();
      for (const ry of [0, Math.PI]) {
        const beam = new Mesh(geo, m);
        beam.rotation.y = ry;
        beam.position.x = 0;
        beams.add(beam);
      }
      beams.position.y = 2.48;
      this.mv.beams = beams;
      const h = halo('#ffe066', 2.6, 0.5, true);
      h.position.y = 2.6;
      inner.add(beams, h);
      this.fx.push(h);
    } else if (this.art === 'antenna') {
      const geo = bakeGeo('signalRing', (k) => k.glow(tor(0.4, 0.02, 6, 40), '#ffffff'));
      for (let i = 0; i < 2; i++) {
        const m = new MeshBasicMaterial({ color: hot('#8cf0ff', 1.8), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
        this.fxMats.push(m);
        const r = new Mesh(geo, m);
        r.position.y = 2.46;
        inner.add(r);
        this.fx.push(r);
      }
    } else if (this.art === 'heater') {
      const geo = bakeGeo('puff', (k) => k.add(M.mist(), sph(0.16, 0.14, 0.16, 12, 8), '#ffffff'));
      for (let i = 0; i < 3; i++) {
        const p = new Mesh(geo, M.mist());
        p.position.set(0.42, 2.0, 0);
        inner.add(p);
        this.fx.push(p);
      }
    }
  }

  setPowered(on: boolean): void {
    if (on === this.powered) return;
    this.powered = on;
    const m = on ? this.onMat : M.glowOff();
    for (const o of this.lit) o.material = m;
    this.orb.visible = on;
  }

  update(dt: number, time: number): void {
    this.p += ((this.powered ? 1 : 0) - this.p) * Math.min(1, dt * 2.5);
    const p = this.p;
    const t = time + this.phase;
    this.onMat.color.setScalar(1.15 + 0.2 * Math.sin(t * 3.2));
    if (this.powered) this.ringMat.color.setRGB(0.6, 1.9, 2.4);
    else {
      const b = 0.5 + 0.5 * Math.sin(t * 4);
      this.ringMat.color.setRGB(0.5 + 1.9 * b, 0.25 + 0.8 * b, 0.08 + 0.1 * b);
    }
    const mv = this.mv;
    const fx = this.fx;
    switch (this.art) {
      case 'machine':
        mv.radar.rotation.y += dt * 1.6 * p;
        break;
      case 'rover':
        mv.head.rotation.x = 0.42 * (1 - p);
        mv.head.rotation.y = Math.sin(t * 0.8) * 0.6 * p;
        break;
      case 'pod':
        mv.shell.rotation.z = 0.3 * (1 - p);
        mv.shell.position.y = 0.42 + p * (0.05 + Math.sin(t * 2) * 0.03);
        break;
      case 'beacon':
        mv.beams.rotation.y = t * 1.3;
        this.fxMats[0].opacity = 0.13 * p;
        fx[0].scale.setScalar(0.4 + 2.4 * p + 0.2 * p * Math.sin(t * 5));
        fx[0].visible = p > 0.02;
        break;
      case 'weather':
        mv.cups.rotation.y += dt * 9 * p;
        mv.dish.rotation.y = Math.sin(t * 0.6) * 0.6 * p;
        break;
      case 'antenna':
        for (let i = 0; i < 2; i++) {
          const c = (t * 0.55 + i * 0.5) % 1;
          fx[i].scale.setScalar(0.3 + c * 2.2);
          this.fxMats[i].opacity = (1 - c) * 0.7 * p;
          fx[i].visible = p > 0.02;
        }
        break;
      case 'heater':
        for (let i = 0; i < 3; i++) {
          const c = (t * 0.45 + i / 3) % 1;
          const o = fx[i];
          o.position.set(0.42 + Math.sin(c * 6 + i) * 0.08, 2.0 + c * 0.9, 0);
          o.scale.setScalar((0.5 + c * 1.1) * p);
          o.visible = p > 0.02;
        }
        break;
      case 'drill':
        mv.bit.rotation.y += dt * 11 * p;
        mv.bit.position.y = 1.28 - 0.08 * p + Math.sin(t * 7) * 0.035 * p;
        break;
      case 'lift':
        mv.platform.position.y = 0.25 + p * (0.25 + 0.35 * (0.5 - 0.5 * Math.cos(t * 1.1)));
        break;
    }
  }
}

/** An old, dusty machine as a decoration (roverOld, podCrashed): no lights, no socket glow. */
export function wreck(art: 'rover' | 'pod'): Group {
  const b = buildMachine(art, DUSTY, true);
  const g = new Group();
  g.add(b.body);
  for (const m of Object.values(b.movers)) g.add(m);
  if (art === 'rover') b.movers.head.rotation.set(0.5, -0.4, 0.1);
  return g;
}
