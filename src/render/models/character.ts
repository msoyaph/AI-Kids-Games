// Procedural chibi characters (the player and the animal residents) with a tiny rig.
import * as THREE from 'three';
import { flatMat } from '../curve';
import { box, cone, cyl, ico, sphere, torus } from './geo';

export const SKIN_TONES = [0xffe3c8, 0xf7d0aa, 0xe6b48a, 0xc98d62, 0x9c6845, 0x6f4a32];
export const HAIR_COLORS = [0x4a3427, 0x2b2530, 0xf1d27a, 0xd9784a, 0xf3a3c0, 0xb9a3e8, 0x9ddcc4, 0xf4f1ea];
export const OUTFIT_COLORS = [0xf6a5a5, 0xffd08a, 0xfff1a6, 0xa9e3a1, 0x9fd3f0, 0xb7a9f0, 0xf5b7e1, 0xf4efe6];
export const HAIR_STYLES = ['Cap', 'Bob', 'Tuft', 'Ponytail', 'Bun', 'Buzz'];
export const EYE_STYLES = ['Dot', 'Sparkle', 'Sleepy', 'Wide'];
export const MOUTH_STYLES = ['Smile', 'Grin', 'Kitty', 'Calm'];

export type Species =
  | 'human'
  | 'capybara'
  | 'pangolin'
  | 'bat'
  | 'redpanda'
  | 'badger'
  | 'platypus'
  | 'quokka'
  | 'armadillo'
  | 'lemur'
  | 'axolotl'
  | 'opossum';

export interface CharSpec {
  species: Species;
  /** head / fur color */
  skin: number;
  /** secondary fur color (muzzle, belly, markings) */
  accent?: number;
  outfit: number;
  hairStyle?: number;
  hairColor?: number;
  eyes?: number;
  mouth?: number;
  blush?: boolean;
  scale?: number;
}

export interface Rig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  hand: THREE.Group;
  tail?: THREE.Group;
  phase: number;
  bob: number;
  spec: CharSpec;
}

const mesh = (geo: THREE.BufferGeometry, color: number, cast = true) => {
  const m = new THREE.Mesh(geo, flatMat(color));
  m.castShadow = cast;
  m.receiveShadow = false;
  return m;
};

const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): T => {
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  return o;
};

export function buildCharacter(spec: CharSpec): Rig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const skin = spec.skin;
  const accent = spec.accent ?? 0xfff4e6;
  const isHuman = spec.species === 'human';

  // torso (outfit) + belly
  const torso = mesh(cyl(0.2, 0.25, 0.42, 8), spec.outfit);
  at(torso, 0, 0.45, 0);
  body.add(torso);
  const collar = mesh(cyl(0.21, 0.21, 0.05, 8), mixLight(spec.outfit));
  at(collar, 0, 0.66, 0);
  body.add(collar);

  // legs
  const legL = new THREE.Group();
  const legR = new THREE.Group();
  for (const [g, x] of [
    [legL, -0.1],
    [legR, 0.1],
  ] as const) {
    at(g, x, 0.25, 0);
    const leg = mesh(cyl(0.065, 0.075, 0.22, 6), isHuman ? 0x6f6a8a : skin);
    at(leg, 0, -0.12, 0);
    const foot = mesh(box(0.13, 0.07, 0.18), isHuman ? 0x7a5a48 : darken(skin, 0.15));
    at(foot, 0, -0.22, 0.03);
    g.add(leg, foot);
    body.add(g);
  }

  // arms
  const armL = new THREE.Group();
  const armR = new THREE.Group();
  const hand = new THREE.Group();
  for (const [g, x] of [
    [armL, -0.25],
    [armR, 0.25],
  ] as const) {
    at(g, x, 0.6, 0);
    const sleeve = mesh(cyl(0.055, 0.06, 0.26, 6), spec.outfit);
    at(sleeve, 0, -0.12, 0);
    const paw = mesh(ico(0.065, 0), skin);
    at(paw, 0, -0.27, 0);
    g.add(sleeve, paw);
    g.rotation.z = x < 0 ? 0.18 : -0.18;
    body.add(g);
  }
  at(hand, 0, -0.28, 0.02);
  armR.add(hand);

  // head
  const head = new THREE.Group();
  at(head, 0, 0.98, 0);
  body.add(head);
  buildHead(head, spec, skin, accent);

  let tail: THREE.Group | undefined;
  const tailBuilder = TAILS[spec.species];
  if (tailBuilder) {
    tail = new THREE.Group();
    at(tail, 0, 0.32, -0.2);
    tailBuilder(tail, skin, accent);
    body.add(tail);
  }

  const sc = spec.scale ?? 1;
  root.scale.setScalar(sc);
  return { root, body, head, armL, armR, legL, legR, hand, tail, phase: 0, bob: 0, spec };
}

function mixLight(c: number): number {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  return (Math.min(255, r + 30) << 16) | (Math.min(255, g + 30) << 8) | Math.min(255, b + 30);
}
export function darken(c: number, t: number): number {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  return (Math.round(r * (1 - t)) << 16) | (Math.round(g * (1 - t)) << 8) | Math.round(b * (1 - t));
}

function addEyes(head: THREE.Group, style: number, y: number, z: number, spread: number, big = false): void {
  for (const s of [-1, 1]) {
    const eyeG = new THREE.Group();
    let eye: THREE.Mesh;
    if (style === 2) {
      eye = mesh(box(0.08, 0.018, 0.02), 0x2c2433, false);
    } else {
      const r = style === 3 ? 0.055 : big ? 0.05 : 0.042;
      eye = mesh(sphere(r, 8, 6), 0x2c2433, false);
      eye.scale.set(1, style === 3 ? 1.25 : 1.15, 0.6);
      if (style === 1 || big) {
        const glint = mesh(sphere(0.016, 6, 4), 0xffffff, false);
        at(glint, 0.015, 0.02, 0.025);
        eye.add(glint);
      }
    }
    eyeG.add(eye);
    at(eyeG, s * spread, y, z);
    head.add(eyeG);
  }
}

function addMouth(head: THREE.Group, style: number, y: number, z: number): void {
  if (style === 3) {
    const m = mesh(box(0.06, 0.012, 0.01), 0x7a4a4a, false);
    at(m, 0, y, z);
    head.add(m);
    return;
  }
  if (style === 1) {
    const m = mesh(sphere(0.035, 8, 6), 0x9a4a55, false);
    m.scale.set(1.2, 0.8, 0.4);
    at(m, 0, y, z);
    head.add(m);
    return;
  }
  if (style === 2) {
    for (const s of [-1, 1]) {
      const m = mesh(torus(0.022, 0.007, 3, 8, Math.PI), 0x7a4a4a, false);
      at(m, s * 0.022, y + 0.01, z, 0, 0, Math.PI);
      head.add(m);
    }
    return;
  }
  const m = mesh(torus(0.035, 0.008, 3, 8, Math.PI), 0x7a4a4a, false);
  at(m, 0, y + 0.02, z, 0, 0, Math.PI);
  head.add(m);
}

function addBlush(head: THREE.Group, y: number, z: number, spread: number): void {
  for (const s of [-1, 1]) {
    const b = mesh(sphere(0.045, 8, 4), 0xff9fb0, false);
    b.scale.set(1, 0.55, 0.3);
    at(b, s * spread, y, z, 0, s * 0.5, 0);
    head.add(b);
  }
}

function buildHead(head: THREE.Group, spec: CharSpec, skin: number, accent: number): void {
  const eyes = spec.eyes ?? 0;
  const mouth = spec.mouth ?? 0;
  switch (spec.species) {
    case 'human': {
      const h = mesh(ico(0.33, 1), skin);
      h.scale.set(1, 0.95, 0.95);
      head.add(h);
      addEyes(head, eyes, 0.0, 0.29, 0.11);
      addMouth(head, mouth, -0.11, 0.3);
      if (spec.blush) addBlush(head, -0.06, 0.26, 0.19);
      const nose = mesh(sphere(0.025, 6, 4), darken(skin, 0.08), false);
      at(nose, 0, -0.04, 0.32);
      head.add(nose);
      buildHair(head, spec.hairStyle ?? 0, spec.hairColor !== undefined ? HAIR_COLORS[spec.hairColor] ?? 0x4a3427 : 0x4a3427);
      for (const s of [-1, 1]) {
        const ear = mesh(sphere(0.06, 6, 4), skin);
        at(ear, s * 0.32, -0.02, 0);
        head.add(ear);
      }
      break;
    }
    default:
      buildAnimalHead(head, spec, skin, accent, eyes, mouth);
  }
}

function buildHair(head: THREE.Group, style: number, color: number): void {
  const cap = mesh(new THREE.SphereGeometry(0.345, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), color);
  switch (style) {
    case 0: {
      at(cap, 0, 0.03, -0.02, -0.35, 0, 0);
      head.add(cap);
      break;
    }
    case 1: {
      at(cap, 0, 0.02, -0.02, -0.3, 0, 0);
      cap.scale.set(1.08, 1.1, 1.08);
      head.add(cap);
      const back = mesh(cyl(0.3, 0.36, 0.3, 10), color);
      at(back, 0, -0.08, -0.08);
      head.add(back);
      break;
    }
    case 2: {
      at(cap, 0, 0.03, -0.02, -0.35, 0, 0);
      head.add(cap);
      for (let k = 0; k < 4; k++) {
        const sp = mesh(cone(0.07, 0.2, 4), color);
        at(sp, (k - 1.5) * 0.08, 0.34, 0.08 - k * 0.02, 0.4, 0, (k - 1.5) * 0.3);
        head.add(sp);
      }
      break;
    }
    case 3: {
      at(cap, 0, 0.03, -0.02, -0.35, 0, 0);
      head.add(cap);
      const tail = mesh(cyl(0.06, 0.1, 0.36, 6), color);
      at(tail, 0, -0.05, -0.36, 0.5, 0, 0);
      head.add(tail);
      const tie = mesh(torus(0.06, 0.02, 4, 8), 0xff8fa8);
      at(tie, 0, 0.12, -0.3, 1.1, 0, 0);
      head.add(tie);
      break;
    }
    case 4: {
      at(cap, 0, 0.03, -0.02, -0.35, 0, 0);
      head.add(cap);
      const bun = mesh(ico(0.13, 1), color);
      at(bun, 0, 0.36, -0.08);
      head.add(bun);
      break;
    }
    default: {
      at(cap, 0, 0.0, -0.02, -0.4, 0, 0);
      cap.scale.set(1.0, 0.8, 1.0);
      head.add(cap);
    }
  }
}

type HeadBuilder = (head: THREE.Group, skin: number, accent: number) => void;

const EARS: Partial<Record<Species, HeadBuilder>> = {
  capybara: (h, s) => {
    for (const k of [-1, 1]) {
      const e = mesh(sphere(0.06, 6, 4), darken(s, 0.1));
      at(e, k * 0.2, 0.25, -0.05);
      h.add(e);
    }
  },
  pangolin: (h, s) => {
    for (let r = 0; r < 3; r++) {
      const sc = mesh(cone(0.18 - r * 0.03, 0.12, 6), darken(s, 0.12 + r * 0.04));
      at(sc, 0, 0.28 - r * 0.02, -0.08 - r * 0.1, -0.9, 0, 0);
      h.add(sc);
    }
  },
  bat: (h, s) => {
    for (const k of [-1, 1]) {
      const e = mesh(cone(0.11, 0.3, 4), s);
      at(e, k * 0.18, 0.33, -0.02, 0, 0, -k * 0.35);
      const inner = mesh(cone(0.06, 0.2, 4), 0xf3b7c2);
      at(inner, 0, -0.02, 0.04);
      e.add(inner);
      h.add(e);
    }
  },
  redpanda: (h, s, a) => {
    for (const k of [-1, 1]) {
      const e = mesh(cone(0.11, 0.18, 5), s);
      at(e, k * 0.22, 0.27, -0.02, 0, 0, -k * 0.4);
      const inner = mesh(cone(0.07, 0.12, 5), a);
      at(inner, 0, -0.01, 0.04);
      e.add(inner);
      h.add(e);
    }
  },
  badger: (h, s, a) => {
    for (const k of [-1, 1]) {
      const e = mesh(sphere(0.06, 6, 4), a);
      at(e, k * 0.24, 0.22, -0.04);
      h.add(e);
    }
    const stripe = mesh(box(0.1, 0.05, 0.42), a);
    at(stripe, 0, 0.3, 0.02, 0.15, 0, 0);
    h.add(stripe);
    void s;
  },
  platypus: (h, s) => {
    void h;
    void s;
  },
  quokka: (h, s, a) => {
    for (const k of [-1, 1]) {
      const e = mesh(sphere(0.09, 7, 5), s);
      e.scale.set(1, 1, 0.5);
      at(e, k * 0.24, 0.24, -0.04);
      const inner = mesh(sphere(0.055, 7, 5), a);
      inner.scale.set(1, 1, 0.5);
      at(inner, 0, 0, 0.03);
      e.add(inner);
      h.add(e);
    }
  },
  armadillo: (h, s) => {
    for (const k of [-1, 1]) {
      const e = mesh(cone(0.07, 0.2, 5), darken(s, 0.05));
      at(e, k * 0.17, 0.3, -0.04, -0.2, 0, -k * 0.25);
      h.add(e);
    }
    const helm = mesh(new THREE.SphereGeometry(0.34, 9, 5, 0, Math.PI * 2, 0, Math.PI * 0.42), darken(s, 0.18));
    at(helm, 0, 0.04, -0.04, -0.3, 0, 0);
    h.add(helm);
  },
  lemur: (h, s, a) => {
    for (const k of [-1, 1]) {
      const e = mesh(cone(0.09, 0.2, 5), s);
      at(e, k * 0.26, 0.22, -0.04, 0, 0, -k * 0.8);
      h.add(e);
    }
    const mask = mesh(sphere(0.2, 8, 6), a);
    mask.scale.set(1.2, 0.8, 0.5);
    at(mask, 0, 0.02, 0.2);
    h.add(mask);
  },
  axolotl: (h, s, a) => {
    for (const k of [-1, 1])
      for (let r = 0; r < 3; r++) {
        const g = mesh(cone(0.045, 0.22, 4), a);
        at(g, k * (0.3 + r * 0.02), 0.12 - r * 0.1, -0.02, 0, 0, -k * (1.1 + r * 0.25));
        h.add(g);
      }
    void s;
  },
  opossum: (h, s) => {
    for (const k of [-1, 1]) {
      const e = mesh(sphere(0.085, 7, 5), 0x3b3340);
      e.scale.set(1, 1, 0.45);
      at(e, k * 0.23, 0.23, -0.03);
      h.add(e);
    }
    void s;
  },
};

const SNOUTS: Partial<Record<Species, HeadBuilder>> = {
  capybara: (h, s) => {
    const sn = mesh(box(0.3, 0.22, 0.24), darken(s, 0.05));
    at(sn, 0, -0.06, 0.24);
    h.add(sn);
    const nose = mesh(box(0.16, 0.05, 0.04), 0x5a4038);
    at(nose, 0, 0.03, 0.37);
    h.add(nose);
  },
  pangolin: (h) => {
    const sn = mesh(cone(0.1, 0.3, 6), 0xf2d6be);
    at(sn, 0, -0.08, 0.36, Math.PI / 2, 0, 0);
    h.add(sn);
  },
  bat: (h, s) => {
    const sn = mesh(sphere(0.1, 7, 5), darken(s, 0.1));
    at(sn, 0, -0.08, 0.26);
    h.add(sn);
  },
  redpanda: (h, _s, a) => {
    const sn = mesh(sphere(0.13, 7, 5), a);
    sn.scale.set(1.2, 0.8, 0.9);
    at(sn, 0, -0.1, 0.24);
    h.add(sn);
    const nose = mesh(sphere(0.035, 6, 4), 0x3a2a2a, false);
    at(nose, 0, -0.06, 0.36);
    h.add(nose);
  },
  badger: (h, _s, a) => {
    const sn = mesh(cone(0.12, 0.22, 6), a);
    at(sn, 0, -0.08, 0.32, Math.PI / 2, 0, 0);
    h.add(sn);
    const nose = mesh(sphere(0.04, 6, 4), 0x2a2a2a, false);
    at(nose, 0, -0.08, 0.43);
    h.add(nose);
  },
  platypus: (h) => {
    const bill = mesh(box(0.3, 0.07, 0.24), 0x6b6070);
    at(bill, 0, -0.1, 0.36);
    h.add(bill);
  },
  quokka: (h, _s, a) => {
    const sn = mesh(sphere(0.11, 7, 5), a);
    at(sn, 0, -0.1, 0.26);
    h.add(sn);
    const nose = mesh(sphere(0.035, 6, 4), 0x3a2a2a, false);
    at(nose, 0, -0.06, 0.36);
    h.add(nose);
  },
  armadillo: (h, s) => {
    const sn = mesh(cone(0.09, 0.26, 6), darken(s, 0.06));
    at(sn, 0, -0.1, 0.36, Math.PI / 2, 0, 0);
    h.add(sn);
  },
  lemur: (h) => {
    const sn = mesh(cone(0.08, 0.16, 6), 0x3b3340);
    at(sn, 0, -0.1, 0.36, Math.PI / 2, 0, 0);
    h.add(sn);
  },
  opossum: (h, _s, a) => {
    const sn = mesh(cone(0.1, 0.26, 6), a);
    at(sn, 0, -0.08, 0.36, Math.PI / 2, 0, 0);
    h.add(sn);
    const nose = mesh(sphere(0.04, 6, 4), 0xf7a1b5, false);
    at(nose, 0, -0.08, 0.5);
    h.add(nose);
  },
};

function buildAnimalHead(head: THREE.Group, spec: CharSpec, skin: number, accent: number, eyes: number, mouth: number): void {
  const wide = spec.species === 'axolotl' || spec.species === 'capybara';
  const h = mesh(ico(0.33, 1), skin);
  h.scale.set(wide ? 1.12 : 1, 0.92, 0.95);
  head.add(h);
  const big = spec.species === 'lemur' || spec.species === 'bat';
  addEyes(head, eyes, 0.04, 0.27, spec.species === 'capybara' ? 0.15 : 0.12, big);
  const snout = SNOUTS[spec.species];
  if (snout) snout(head, skin, accent);
  else addMouth(head, mouth, -0.11, 0.3);
  if (spec.blush) addBlush(head, -0.06, 0.25, 0.2);
  EARS[spec.species]?.(head, skin, accent);
}

const TAILS: Partial<Record<Species, HeadBuilder>> = {
  redpanda: (t, s, a) => {
    for (let k = 0; k < 4; k++) {
      const seg = mesh(cyl(0.1, 0.11, 0.13, 7), k % 2 ? a : s);
      at(seg, 0, 0.02 + k * 0.03, -k * 0.12, -1.2, 0, 0);
      t.add(seg);
    }
  },
  lemur: (t, s, a) => {
    for (let k = 0; k < 6; k++) {
      const seg = mesh(cyl(0.06, 0.065, 0.11, 6), k % 2 ? 0x3b3340 : a);
      at(seg, 0, 0.05 + k * 0.08, -0.1 - k * 0.04, -0.5, 0, 0);
      t.add(seg);
    }
    void s;
  },
  badger: (t, s) => {
    const seg = mesh(cone(0.07, 0.18, 6), s);
    at(seg, 0, 0, -0.05, -2.0, 0, 0);
    t.add(seg);
  },
  platypus: (t, s) => {
    const seg = mesh(box(0.22, 0.05, 0.3), darken(s, 0.1));
    at(seg, 0, -0.18, -0.1, 0.2, 0, 0);
    t.add(seg);
  },
  quokka: (t, s) => {
    const seg = mesh(cone(0.06, 0.3, 6), s);
    at(seg, 0, -0.14, -0.08, -2.2, 0, 0);
    t.add(seg);
  },
  armadillo: (t, s) => {
    const shell = mesh(new THREE.SphereGeometry(0.3, 9, 5, 0, Math.PI * 2, 0, Math.PI * 0.5), darken(s, 0.2));
    at(shell, 0, 0.12, 0.12, -1.3, 0, 0);
    t.add(shell);
    const tl = mesh(cone(0.05, 0.25, 6), darken(s, 0.1));
    at(tl, 0, -0.15, -0.05, -2.3, 0, 0);
    t.add(tl);
  },
  axolotl: (t, s) => {
    const seg = mesh(cone(0.1, 0.4, 5), s);
    seg.scale.set(0.5, 1, 1.3);
    at(seg, 0, -0.1, -0.15, -1.9, 0, 0);
    t.add(seg);
  },
  opossum: (t) => {
    const seg = mesh(cone(0.045, 0.45, 6), 0xf3c2c9);
    at(seg, 0, -0.1, -0.15, -2.0, 0, 0);
    t.add(seg);
  },
  pangolin: (t, s) => {
    for (let k = 0; k < 3; k++) {
      const seg = mesh(cone(0.13 - k * 0.03, 0.18, 6), darken(s, 0.12 + k * 0.05));
      at(seg, 0, -0.1 - k * 0.05, -k * 0.13, -2.0, 0, 0);
      t.add(seg);
    }
  },
  capybara: () => {},
  bat: (t, s) => {
    for (const k of [-1, 1]) {
      const wing = mesh(cone(0.25, 0.5, 3), darken(s, 0.2));
      wing.scale.set(1, 1, 0.15);
      at(wing, k * 0.22, 0.25, 0.05, 0, 0, k * 1.9);
      t.add(wing);
    }
  },
};

export interface AnimState {
  /** horizontal speed in tiles/sec */
  speed: number;
  /** 0..1 progress of a one-shot tool action, or -1 */
  action: number;
  actionKind?: string;
  sneaking?: boolean;
  talking?: boolean;
}

export function animateRig(r: Rig, dt: number, a: AnimState): void {
  const moving = a.speed > 0.15;
  r.phase += dt * (moving ? 3.2 + a.speed * 1.9 : 0);
  const swing = moving ? Math.min(1, a.speed / 3.5) * 0.75 : 0;
  const s = Math.sin(r.phase);
  r.legL.rotation.x = s * swing;
  r.legR.rotation.x = -s * swing;
  r.armL.rotation.x = -s * swing * 0.8;
  r.armR.rotation.x = s * swing * 0.8;
  r.bob += dt;
  const idle = Math.sin(r.bob * 2.2) * 0.012;
  r.body.position.y = moving ? Math.abs(Math.cos(r.phase)) * 0.06 : idle;
  r.body.rotation.x = a.sneaking ? 0.25 : moving ? Math.min(0.12, a.speed * 0.02) : 0;
  r.head.rotation.z = a.talking ? Math.sin(r.bob * 6) * 0.06 : 0;
  r.head.rotation.x = a.sneaking ? -0.15 : 0;
  if (r.tail) r.tail.rotation.y = Math.sin(r.bob * (moving ? 8 : 2.5)) * 0.25;
  if (a.action >= 0) {
    const t = a.action;
    switch (a.actionKind) {
      case 'chop':
      case 'dig':
      case 'net': {
        // wind-up then strike
        const k = t < 0.4 ? -t / 0.4 : -1 + ((t - 0.4) / 0.6) * 2.4;
        r.armR.rotation.x = Math.max(-2.6, Math.min(0.9, k * 2.2));
        r.armL.rotation.x = r.armR.rotation.x * 0.6;
        break;
      }
      case 'cast': {
        const k = t < 0.5 ? -t * 5 : -2.5 + (t - 0.5) * 6;
        r.armR.rotation.x = Math.max(-2.6, Math.min(0.4, k));
        break;
      }
      case 'water':
        r.armR.rotation.x = -0.9;
        r.armR.rotation.z = -0.4 - Math.sin(t * Math.PI) * 0.3;
        break;
      case 'pickup':
        r.body.rotation.x = Math.sin(t * Math.PI) * 0.5;
        r.armR.rotation.x = -Math.sin(t * Math.PI) * 1.2;
        r.armL.rotation.x = -Math.sin(t * Math.PI) * 1.2;
        break;
      case 'shake':
        r.armR.rotation.x = -2.2;
        r.armL.rotation.x = -2.2;
        r.body.rotation.z = Math.sin(t * 30) * 0.08;
        break;
      case 'hold':
        r.armR.rotation.x = -1.0;
        break;
      case 'celebrate':
        r.armR.rotation.x = -2.8;
        r.armL.rotation.x = -2.8;
        r.body.position.y = Math.abs(Math.sin(t * Math.PI * 2)) * 0.15;
        break;
      case 'climb':
        r.armR.rotation.x = -2.5 + Math.sin(t * 20) * 0.4;
        r.armL.rotation.x = -2.5 - Math.sin(t * 20) * 0.4;
        break;
      default:
        break;
    }
  } else if (a.actionKind === 'hold') {
    r.armR.rotation.x = -0.6;
  }
}
