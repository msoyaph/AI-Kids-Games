import { Color, Group, Mesh, OctahedronGeometry, Shape } from 'three';
import type { DecoArt } from '../../data/levelTypes';
import type { Theme } from '../../data/themes';
import {
  INK,
  M,
  bake,
  bakeGeo,
  cyl,
  dishGeo,
  dome,
  ext,
  gemGlowMat,
  halo,
  hot,
  lath,
  prism,
  rbox,
  rngFor,
  rock,
  roundRectShape,
  sph,
  star,
  tint,
  tor,
  wrap,
  type Kit,
  type Prop,
} from './propKit';
import { crateKit, lampKit, makeFlag, mushroomKit, mushroomSpots } from './propsBasic';
import { wreck } from './propsMachines';

/**
 * Background decorations (the `deco` entities): ~1.9 × 1.9, the big ones (station, house, dome,
 * roverOld, podCrashed) ~3.1 wide × 2.7 tall. Bottom center origin, facing +z, kept shallow in z.
 */

const TAU = Math.PI * 2;
let phaseSeed = 1.1;
const nextPhase = () => (phaseSeed = (phaseSeed + 2.399) % TAU);

class Anim implements Prop {
  readonly group: Group;
  private readonly phase = nextPhase();

  constructor(
    private readonly inner: Group,
    private readonly tick: (inner: Group, t: number, dt: number) => void,
  ) {
    this.group = wrap(inner);
  }

  update(dt: number, time: number): void {
    this.tick(this.inner, time + this.phase, dt);
  }
}

const still = (inner: Group): Prop => ({ group: wrap(inner) });

function blinker(g: Group, period = 2.6): (inner: Group, t: number) => void {
  return (_i, t) => {
    g.visible = Math.sin(t * period) > -0.3;
  };
}

// ------------------------------------------------------------------ builders

function dish(k: Kit): void {
  k.metal(rbox(0.7, 0.18, 0.6, 0.05, 1), '#7a809f', 0, 0.09);
  k.metal(lath([[0.22, 0.18], [0.16, 0.3], [0.1, 0.36], [0, 0.36]], 12), '#9aa4c7');
  k.metal(cyl(0.06, 0.07, 0.75, 10), '#c9d2ee', 0, 0.7);
  k.metal(sph(0.11, 0.11, 0.11, 12, 8), '#7a809f', 0, 1.08);
  k.grad(k.paint(dishGeo(0.78, 0.26, 0.04, 28), '#f4f7ff', 0, 1.1, 0.05, 0.55, 0, 0.55), '#aab4d8', '#ffffff', 0.9, 1.7);
  k.metal(cyl(0.015, 0.015, 0.55, 5), '#7a809f', -0.17, 1.42, 0.2, 0.55, 0, 0.55);
  k.metal(sph(0.05, 0.05, 0.05, 8, 6), '#7a809f', -0.3, 1.62, 0.36);
}

function antennaMast(k: Kit): void {
  k.metal(rbox(0.5, 0.12, 0.5, 0.04, 1), '#7a809f', 0, 0.06);
  k.metal(cyl(0.04, 0.07, 1.78, 8), '#c9d2ee', 0, 1.0);
  for (const [w, y] of [[0.8, 0.85], [0.55, 1.28], [0.32, 1.62]] as Array<[number, number]>) {
    k.paint(rbox(w, 0.06, 0.06, 0.025, 1), '#ff9f43', 0, y);
    for (const sx of [-1, 1]) k.metal(sph(0.035, 0.035, 0.035, 6, 4), '#dfe5f5', (sx * w) / 2, y);
  }
}

function tent(k: Kit): void {
  const prof = new Shape();
  prof.moveTo(-0.9, 0);
  prof.lineTo(0.9, 0);
  prof.quadraticCurveTo(0.35, 0.5, 0.04, 1.3);
  prof.quadraticCurveTo(0, 1.36, -0.04, 1.3);
  prof.quadraticCurveTo(-0.35, 0.5, -0.9, 0);
  const body = k.matte(ext(prof, 0.9, 0.05, 10), '#ff9f43');
  k.grad(body, '#d9682a', '#ffc070', 0, 1.3);
  const flap = new Shape();
  flap.moveTo(-0.62, 0);
  flap.lineTo(0.62, 0);
  flap.quadraticCurveTo(0.24, 0.36, 0.03, 0.9);
  flap.lineTo(-0.03, 0.9);
  flap.quadraticCurveTo(-0.24, 0.36, -0.62, 0);
  k.matte(ext(flap, 0.03, 0.01, 8), '#fff6e0', 0, 0.02, 0.49);
  const door = new Shape();
  door.moveTo(-0.3, 0);
  door.lineTo(0.3, 0);
  door.quadraticCurveTo(0.1, 0.3, 0, 0.66);
  door.quadraticCurveTo(-0.1, 0.3, -0.3, 0);
  k.paint(ext(door, 0.02, 0, 8), '#3a1d5e', 0, 0.02, 0.52);
  k.metal(cyl(0.025, 0.025, 1.5, 6), '#c9d2ee', 0, 0.72, 0.54);
  k.metal(sph(0.05, 0.05, 0.05, 8, 6), '#ffc83d', 0, 1.48, 0.54);
  for (const sx of [-1, 1]) {
    k.matte(cyl(0.008, 0.008, 0.62, 4), '#fff6e0', sx * 0.68, 0.32, 0.4, 0, 0, sx * 0.75);
    k.metal(cyl(0.02, 0.01, 0.12, 5), '#7a809f', sx * 0.92, 0.04, 0.4);
  }
  k.glow(sph(0.07, 0.07, 0.07, 10, 8), hot('#ffe9a0', 2.6), 0.0, 0.18, 0.4);
}

function habitatDome(k: Kit): void {
  k.metal(cyl(1.5, 1.55, 0.36, 40).scale(1, 1, 0.45), '#9aa4c7', 0, 0.18);
  k.grad(k.paint(dome(1.45, 1.55, 0.65, 36, 10), '#f4f7ff', 0, 0.34), '#aab4d8', '#ffffff', 0.34, 1.9);
  for (const y of [0.85, 1.35]) {
    const r = 1.45 * Math.sqrt(1 - ((y - 0.34) / 1.55) ** 2);
    k.paint(tor(r, 0.035, 4, 40).scale(1, 0.45, 1), '#4c7dff', 0, y, 0, Math.PI / 2);
  }
  k.paint(ext(roundRectShape(0.62, 1.0, 0.28), 0.12, 0.03), '#4dd4ff', 0, 0.68, 0.62);
  k.metal(ext(roundRectShape(0.74, 1.1, 0.33), 0.06, 0.02), '#c9d2ee', 0, 0.7, 0.58);
  k.metal(cyl(0.035, 0.04, 0.62, 6), '#c9d2ee', 0.45, 2.05);
  for (const x of [-0.85, 0.85]) {
    k.metal(tor(0.2, 0.04, 6, 20), '#c9d2ee', x, 0.95, 0.47 - Math.abs(x) * 0.08, 0, x * 0.5, 0);
    k.glow(cyl(0.17, 0.17, 0.02, 20), hot('#fff3b0', 2.2), x, 0.95, 0.46 - Math.abs(x) * 0.08, Math.PI / 2, 0, -x * 0.5);
  }
  k.glow(sph(0.06, 0.06, 0.06, 8, 6), '#ff5d73', 0.45, 2.38);
}

function pipe(k: Kit): void {
  k.metal(cyl(0.18, 0.18, 1.6, 18), '#c9d2ee', -0.12, 0.62, 0, 0, 0, Math.PI / 2);
  k.metal(tor(0.3, 0.18, 12, 16, Math.PI / 2), '#c9d2ee', 0.68, 0.32, 0, 0, 0, 0);
  k.metal(cyl(0.18, 0.18, 0.34, 18), '#c9d2ee', 0.98, 0.17);
  for (const x of [-0.75, 0.3]) {
    k.metal(cyl(0.24, 0.24, 0.08, 18), '#9aa4c7', x, 0.62, 0, 0, 0, Math.PI / 2);
    k.metal(rbox(0.14, 0.44, 0.3, 0.04, 1), '#7a809f', x, 0.22);
  }
  k.metal(cyl(0.24, 0.26, 0.1, 18), '#9aa4c7', -0.92, 0.62, 0, 0, 0, Math.PI / 2);
  k.metal(cyl(0.03, 0.03, 0.18, 6), '#7a809f', -0.2, 0.86);
  k.paint(tor(0.13, 0.025, 6, 20), '#ff5d73', -0.2, 0.95, 0, Math.PI / 2);
  k.paint(rbox(0.26, 0.025, 0.025, 0.01, 1), '#ff5d73', -0.2, 0.95);
  k.paint(rbox(0.025, 0.025, 0.26, 0.01, 1), '#ff5d73', -0.2, 0.95);
  k.paint(cyl(0.09, 0.09, 0.04, 16), '#f4f7ff', 0.55, 0.62, 0.19, Math.PI / 2);
  k.paint(rbox(0.012, 0.07, 0.01, 0.004, 1), '#ff5d73', 0.56, 0.64, 0.215, 0, 0, -0.6);
}

function crater(k: Kit, th: Theme): void {
  const top = new Color(th.surface).lerp(new Color(th.ground), 0.35);
  const rim = k.matte(lath([[0.95, 0], [0.9, 0.1], [0.76, 0.3], [0.64, 0.38], [0.54, 0.32], [0.46, 0.14], [0.42, 0.05]], 28), th.ground);
  k.grad(rim, tint(th.ground, -0.3), top, 0, 0.38);
  k.matte(cyl(0.44, 0.44, 0.02, 24), tint(th.ground2, -0.35), 0, 0.04);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7 + 0.3;
    k.matte(rock(600 + i, 0.1, 0.08, 0.09, 0, 0.25), tint(th.ground, -0.1), Math.cos(a) * 0.98, 0.04, Math.sin(a) * 0.45);
  }
}

function crystals(k: Kit): void {
  const m = gemGlowMat(0.55);
  k.grad(k.matte(rock(650, 0.62, 0.18, 0.4, 1, 0.2), '#4a3a8a', 0, 0.05), '#2b1d5e', '#6a5aa8', 0, 0.2);
  const parts: Array<[number, number, number, number, number, string]> = [
    [0, 0, 0.27, 1.6, 0.04, '#c89bff'],
    [-0.42, 0.06, 0.2, 1.1, 0.42, '#ff9ad9'],
    [0.44, 0.02, 0.18, 1.0, -0.45, '#9bd8ff'],
    [0.16, 0.24, 0.13, 0.6, -0.2, '#ff9ad9'],
    [-0.2, -0.2, 0.14, 0.8, 0.18, '#9bd8ff'],
    [-0.62, 0.2, 0.1, 0.5, 0.75, '#c89bff'],
  ];
  parts.forEach(([x, z, r, h, rz, c], i) => k.grad(k.add(m, prism(r, h, 6, 0.3), c, x, 0.02, z, i === 3 ? 0.3 : 0, i * 0.5, rz), tint(c, -0.45), tint(c, 0.45), 0, h * 0.9));
}

function house(k: Kit): void {
  const walls = k.paint(lath([[1.0, 0], [1.08, 0.25], [1.1, 0.8], [1.02, 1.32], [0.9, 1.45], [0, 1.45]], 28).scale(1, 1, 0.5), '#ff7ad9');
  k.grad(walls, '#d9489f', '#ffb0ea', 0, 1.45);
  const roof = k.paint(lath([[0, 1.3], [1.3, 1.3], [1.36, 1.38], [1.24, 1.6], [0.9, 1.95], [0.45, 2.2], [0, 2.28]], 32).scale(1, 1, 0.56), '#2de0c7');
  k.grad(roof, '#139a8a', '#9bfff0', 1.3, 2.28);
  k.paint(sph(0.14, 0.14, 0.14, 12, 8), '#ffe066', 0, 2.36);
  k.paint(ext(roundRectShape(0.56, 0.96, 0.27), 0.08, 0.03), '#9b6bff', 0.12, 0.48, 0.55);
  k.paint(sph(0.045, 0.045, 0.03, 8, 6), '#ffe066', 0.3, 0.5, 0.61);
  for (const [x, r] of [[-0.6, 0.23], [0.72, 0.16]] as Array<[number, number]>) {
    k.paint(tor(r, 0.05, 6, 20), '#9b6bff', x, 0.95, 0.5 - Math.abs(x) * 0.12, 0, x * 0.5, 0);
    k.glow(cyl(r - 0.02, r - 0.02, 0.02, 20), hot('#ffe066', 2.2), x, 0.95, 0.49 - Math.abs(x) * 0.12, Math.PI / 2, 0, -x * 0.5);
  }
  k.paint(cyl(0.13, 0.15, 0.5, 12), '#9b6bff', -0.62, 2.0);
  k.paint(tor(0.14, 0.04, 6, 14), '#ffe066', -0.62, 2.25, 0, Math.PI / 2);
  for (const [x, z] of [[0.12, 0.8], [0.35, 1.0]] as Array<[number, number]>) k.matte(cyl(0.16, 0.18, 0.04, 12).scale(1, 1, 0.6), '#c89bff', x, 0.02, z);
}

function statue(k: Kit): void {
  k.metal(lath([[0.5, 0], [0.5, 0.12], [0.42, 0.18], [0.36, 0.2], [0.36, 0.56], [0.42, 0.6], [0.44, 0.66], [0, 0.66]], 8).scale(1, 1, 0.75), '#9aa4c7');
  k.paint(rbox(0.36, 0.14, 0.03, 0.03, 1), INK, 0, 0.38, 0.29);
  k.metal(star(0.08, 0.02), '#ffc83d', 0, 0.38, 0.31);
  k.metal(cyl(0.06, 0.09, 0.3, 10), '#ffc83d', 0, 0.8);
  k.metal(star(0.62, 0.22), '#ffc83d', 0, 1.5);
}

function vent(k: Kit): void {
  k.metal(rbox(1.0, 0.56, 0.72, 0.08, 2), '#5a6080', 0, 0.28);
  k.paint(rbox(0.74, 0.34, 0.03, 0.04, 1), '#2a2440', 0, 0.3, 0.36);
  for (const y of [0.2, 0.28, 0.36, 0.44]) k.metal(rbox(0.68, 0.03, 0.03, 0.01, 1), '#9aa4c7', 0, y, 0.38);
  k.metal(cyl(0.22, 0.26, 0.16, 16), '#7a809f', 0.1, 0.64);
  k.paint(rbox(0.12, 0.08, 0.02, 0.02, 1), '#ffe066', -0.38, 0.5, 0.37);
}

function station(k: Kit): void {
  for (const x of [-1.0, 1.0]) {
    for (const z of [-0.3, 0.3]) k.metal(cyl(0.05, 0.06, 0.62, 8), '#7a809f', x, 0.31, z, 0, 0, x * 0.12);
    k.metal(cyl(0.16, 0.18, 0.05, 12), '#5a6080', x * 1.04, 0.025, 0);
  }
  const body = k.paint(lath([[0, -1.55], [0.55, -1.5], [0.72, -1.3], [0.75, -1.0], [0.75, 1.0], [0.72, 1.3], [0.55, 1.5], [0, 1.55]], 32).scale(1, 1, 0.72), '#f4f7ff', 0, 1.3, 0, 0, 0, Math.PI / 2);
  k.grad(body, '#9aa4c7', '#ffffff', 0.55, 2.05);
  for (const x of [-1.05, 1.05]) k.paint(cyl(0.77, 0.77, 0.12, 32).scale(1, 1, 0.72), '#ff5d73', x, 1.3, 0, 0, 0, Math.PI / 2);
  k.paint(ext(roundRectShape(0.5, 0.82, 0.2), 0.08, 0.03), '#4c7dff', 0, 1.08, 0.52);
  k.metal(ext(roundRectShape(0.6, 0.92, 0.25), 0.05, 0.02), '#c9d2ee', 0, 1.1, 0.49);
  for (const x of [-0.65, 0.65]) {
    k.metal(tor(0.17, 0.04, 6, 20), '#c9d2ee', x, 1.45, 0.53);
    k.glow(cyl(0.15, 0.15, 0.02, 18), hot('#4dd4ff', 2), x, 1.45, 0.52, Math.PI / 2);
  }
  k.metal(cyl(0.035, 0.04, 0.55, 6), '#c9d2ee', -0.4, 2.3);
  k.paint(rbox(1.1, 0.04, 0.5, 0.02, 1), '#2a3f9e', -0.4, 2.58, 0, 0.35);
  k.metal(rbox(1.14, 0.02, 0.02, 0.01, 1), '#c9d2ee', -0.4, 2.6, 0.0, 0.35);
  k.paint(dishGeo(0.26, 0.09, 0.02, 16), '#f4f7ff', 0.75, 2.1, 0, 0.5, 0, -0.5);
  k.metal(cyl(0.03, 0.03, 0.25, 6), '#7a809f', 0.7, 1.98);
  k.glow(sph(0.055, 0.055, 0.055, 8, 6), '#ff5d73', -0.4, 2.62, 0.2);
}

function spaceWindow(k: Kit): void {
  const frame = roundRectShape(1.8, 1.6, 0.36);
  frame.holes.push(roundRectShape(1.46, 1.26, 0.22));
  k.metal(ext(frame, 0.16, 0.05), '#9aa4c7', 0, 0.95);
  k.paint(rbox(1.5, 1.3, 0.04, 0.2, 2), '#1d1456', 0, 0.95, -0.03);
  k.paint(sph(0.24, 0.24, 0.05, 20, 12), '#4c7dff', 0.36, 1.2, 0.0);
  k.paint(sph(0.11, 0.08, 0.02, 12, 6), '#2ed47a', 0.3, 1.26, 0.045, 0, 0, 0.4);
  const stars: Array<[number, number]> = [[-0.55, 1.4], [-0.25, 1.15], [-0.6, 0.6], [0.1, 0.6], [0.5, 0.5], [-0.05, 1.45], [0.62, 0.85], [-0.4, 0.88]];
  for (const [x, y] of stars) k.glow(new OctahedronGeometry(0.035, 0).scale(1, 1, 0.3), hot('#ffffff', 2.2), x, y, 0);
  k.add(M.mist(), rbox(0.08, 0.9, 0.01, 0.01, 1), '#ffffff', -0.3, 1.0, 0.03, 0, 0, -0.6);
  k.add(M.mist(), rbox(0.04, 0.6, 0.01, 0.01, 1), '#ffffff', -0.12, 0.95, 0.03, 0, 0, -0.6);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) k.metal(sph(0.045, 0.045, 0.03, 8, 6), '#dfe5f5', sx * 0.8, 0.95 + sy * 0.7, 0.1);
  k.metal(rbox(0.5, 0.2, 0.3, 0.05, 1), '#7a809f', 0, 0.06);
}

function bench(k: Kit): void {
  for (const sx of [-1, 1]) {
    k.metal(rbox(0.08, 0.44, 0.08, 0.03, 1), '#4a4e6e', sx * 0.65, 0.22, 0.12);
    k.metal(rbox(0.08, 0.92, 0.08, 0.03, 1), '#4a4e6e', sx * 0.65, 0.46, -0.2, -0.12);
    k.metal(rbox(0.08, 0.06, 0.46, 0.02, 1), '#4a4e6e', sx * 0.65, 0.42, -0.02);
  }
  for (const z of [0.14, -0.06]) k.grad(k.matte(rbox(1.6, 0.06, 0.17, 0.025, 1), '#b5764a', 0, 0.48, z), '#8a5a3a', '#d9945a', 0.45, 0.51);
  for (const y of [0.68, 0.84]) k.grad(k.matte(rbox(1.6, 0.11, 0.05, 0.025, 1), '#b5764a', 0, y, -0.2 - (y - 0.5) * 0.12, -0.12), '#8a5a3a', '#d9945a', y - 0.06, y + 0.06);
}

function cloud(k: Kit): void {
  const puffs: Array<[number, number, number, number]> = [
    [0, 0.42, 0.48, 0.42],
    [-0.5, 0.3, 0.36, 0.3],
    [0.52, 0.3, 0.38, 0.32],
    [-0.88, 0.2, 0.22, 0.2],
    [0.88, 0.2, 0.24, 0.2],
    [0.22, 0.62, 0.3, 0.26],
  ];
  puffs.forEach(([x, y, r, ry], i) => {
    const g = k.paint(rock(700 + i, r, ry, r * 0.7, 2, 0.06, false), '#ffffff', x, y, 0);
    k.grad(g, '#c9cff0', '#ffffff', 0.05, 0.8);
  });
}

// ------------------------------------------------------------------ public

/** One decoration; seed varies little things (sizes, which way it faces). */
export function makeDeco(art: DecoArt, th: Theme, seed: number): Prop {
  const r = rngFor(seed, `deco:${art}`);
  let p: Prop;
  switch (art) {
    case 'dish':
      p = still(bake('deco:dish', dish));
      break;
    case 'antenna': {
      const inner = bake('deco:antenna', antennaMast);
      const tip = bake('deco:antenna:tip', (k) => k.glow(sph(0.08, 0.08, 0.08, 10, 8), hot('#ff5d73', 2.6), 0, 1.93));
      inner.add(tip, halo('#ff5d73', 0.5, 0.35));
      inner.children[inner.children.length - 1].position.y = 1.93;
      p = new Anim(inner, blinker(tip));
      break;
    }
    case 'tent':
      p = still(bake('deco:tent', tent));
      break;
    case 'dome':
      p = still(bake('deco:dome', habitatDome));
      break;
    case 'crate':
      p = still(
        bake('deco:crate', (k) => {
          crateKit(k, 1, -0.38);
          crateKit(k, 0.72, 0.5, 0, -0.08);
          crateKit(k, 0.62, -0.32, 1.0, 0.05);
        }),
      );
      break;
    case 'pipe':
      p = still(bake('deco:pipe', pipe));
      break;
    case 'crater':
      p = still(bake(`deco:crater:${th.id}`, (k) => crater(k, th)));
      p.group.children[0].scale.z = 0.55;
      break;
    case 'crystals':
      p = still(bake('deco:crystals', crystals));
      break;
    case 'mushroom':
      p = still(
        bake('deco:mushroom', (k) => {
          mushroomKit(k, -0.3, 1.05, '#ff7ad9', 0);
          mushroomKit(k, 0.42, 0.62, '#9b6bff', 0.18);
          mushroomKit(k, 0.78, 0.38, '#2de0c7', -0.1);
          mushroomSpots(k, -0.3, 1.05, 0);
          mushroomSpots(k, 0.42, 0.62, 0.18);
        }),
      );
      break;
    case 'house':
      p = still(bake('deco:house', house));
      break;
    case 'flagpole':
      p = makeFlag(r.pick(['#4c7dff', '#ff5d73', '#2ed47a', '#9b6bff']));
      break;
    case 'statue':
      p = still(bake('deco:statue', statue));
      p.group.children[0].add(halo('#ffe066', 1.8, 0.18));
      p.group.children[0].children[p.group.children[0].children.length - 1].position.y = 1.5;
      break;
    case 'lamp': {
      const inner = bake('lamp', lampKit);
      const h = halo('#ffd98a', 1.8, 0.4);
      h.position.y = 2.0;
      inner.add(h);
      p = still(inner);
      break;
    }
    case 'icicle':
      p = still(
        bake('deco:icicle', (k) => {
          k.grad(k.matte(rock(330, 0.7, 0.2, 0.42, 1, 0.2), '#f4f7ff', 0, 0.04), '#c9d8f0', '#ffffff', 0, 0.2);
          const parts: Array<[number, number, number, number, number]> = [
            [-0.1, 0.28, 1.75, 0.05, 0],
            [-0.5, 0.2, 1.15, 0.3, 0.1],
            [0.38, 0.2, 1.3, -0.25, -0.12],
            [0.7, 0.13, 0.7, -0.5, 0],
            [0.12, 0.13, 0.62, -0.15, 0.35],
          ];
          parts.forEach(([x, rr, h, rz, rx], i) => k.grad(k.add(M.ice(), prism(rr, h, 6, 0.62), '#bff6ff', x, 0, i === 4 ? 0.22 : 0, rx, i * 0.6, rz), '#5fb4e8', '#ffffff', 0, h * 0.9));
        }),
      );
      break;
    case 'vent': {
      const inner = bake('deco:vent', vent);
      const geo = bakeGeo('puff', (k) => k.add(M.mist(), sph(0.16, 0.14, 0.16, 12, 8), '#ffffff'));
      const puffs: Mesh[] = [];
      for (let i = 0; i < 3; i++) {
        const m = new Mesh(geo, M.mist());
        puffs.push(m);
        inner.add(m);
      }
      p = new Anim(inner, (_i, t) => {
        for (let i = 0; i < 3; i++) {
          const c = (t * 0.4 + i / 3) % 1;
          puffs[i].position.set(0.1 + Math.sin(c * 5 + i) * 0.1, 0.75 + c * 1.1, 0);
          puffs[i].scale.setScalar(0.5 + c * 1.3);
        }
      });
      break;
    }
    case 'station':
      p = still(bake('deco:station', station));
      break;
    case 'window':
      p = still(bake('deco:window', spaceWindow));
      break;
    case 'bench':
      p = still(bake('deco:bench', bench));
      break;
    case 'cloud': {
      const inner = bake('deco:cloud', cloud);
      inner.scale.z = 0.8;
      p = new Anim(inner, (i, t) => {
        i.position.y = Math.sin(t * 0.8) * 0.08;
        i.position.x = Math.sin(t * 0.3) * 0.12;
      });
      break;
    }
    case 'roverOld': {
      const inner = wreck('rover');
      inner.scale.setScalar(1.4);
      inner.rotation.z = 0.06;
      inner.position.y = -0.08;
      p = still(inner);
      break;
    }
    case 'podCrashed': {
      const inner = wreck('pod');
      inner.scale.setScalar(1.3);
      inner.rotation.z = -0.5;
      inner.position.set(0.3, -0.15, 0);
      const rocks = bake('deco:podRocks', (k) => {
        for (let i = 0; i < 4; i++) k.matte(rock(800 + i, 0.18 - i * 0.02, 0.13, 0.15, 0, 0.25), '#8a7f74', -1.1 + i * 0.7, 0.06, 0.35 - (i % 2) * 0.6);
      });
      const g = new Group();
      g.add(inner, rocks);
      p = still(g);
      break;
    }
    default:
      p = still(bake('crate', (k) => crateKit(k)));
  }
  if (art !== 'window' && art !== 'flagpole' && art !== 'lamp' && art !== 'station' && art !== 'house' && art !== 'dome' && r.chance(0.5)) {
    const inner = p.group.children[0];
    inner.scale.x *= -1;
  }
  return p;
}
