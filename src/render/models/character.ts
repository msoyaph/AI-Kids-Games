// Procedural chibi characters (the player and the animal residents) with a tiny rig.
import * as THREE from 'three';
import { flatMat } from '../curve';
import { box, cone, cyl, ico, sphere, torus } from './geo';
import type { ClothSlot } from '../../data/clothing';
import type { ClothVisual } from '../../sim/wardrobe';

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
  /** worn clothes (player only) */
  clothes?: Partial<Record<ClothSlot, ClothVisual>>;
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

  // clothes (player): a dress replaces the top and bottom
  const cl = isHuman ? (spec.clothes ?? {}) : {};
  const dress = cl.dress;
  const top = dress ? undefined : cl.top;
  const bottom = dress ? undefined : cl.bottom;
  const torsoColor = dress?.color ?? top?.color ?? spec.outfit;
  const barePegs = !!dress || bottom?.shape === 'shorts' || bottom?.shape === 'skirt';
  const legColor = !isHuman ? skin : bottom && (bottom.shape === 'pants' || bottom.shape === 'overalls') ? bottom.color : barePegs ? skin : 0x6f6a8a;
  const sleeveColor = top?.shape === 'tank' || dress?.shape === 'sundress' ? skin : torsoColor;

  // torso (outfit) + belly
  const torso = mesh(cyl(0.2, 0.25, 0.42, 8), torsoColor);
  at(torso, 0, 0.45, 0);
  if (top?.shape === 'sweater' || top?.shape === 'hoodie') torso.scale.set(1.07, 1, 1.07);
  body.add(torso);
  const collar = mesh(cyl(0.21, 0.21, 0.05, 8), mixLight(torsoColor));
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
    const leg = mesh(cyl(0.065, 0.075, 0.22, 6), legColor);
    at(leg, 0, -0.12, 0);
    const foot = mesh(box(0.13, 0.07, 0.18), isHuman ? (cl.shoes?.color ?? 0x7a5a48) : darken(skin, 0.15));
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
    const sleeve = mesh(cyl(0.055, 0.06, 0.26, 6), isHuman ? sleeveColor : spec.outfit);
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

  if (isHuman) dressUp(body, head, legL, legR, armL, cl, top, bottom, dress, skin);

  const sc = spec.scale ?? 1;
  root.scale.setScalar(sc);
  return { root, body, head, armL, armR, legL, legR, hand, tail, phase: 0, bob: 0, spec };
}

/** Little front-of-shirt details for a pattern. */
function patternBits(g: THREE.Group, v: ClothVisual, y: number, z: number, w: number): void {
  const c = v.color2;
  const add = (m: THREE.Mesh, x: number, yy: number, zz: number, rx = 0, rz = 0) => g.add(at(m, x, yy, zz, rx, 0, rz));
  switch (v.pattern) {
    case 'stripe':
      for (const dy of [-0.07, 0.07]) add(mesh(cyl(w + 0.012, w + 0.016, 0.035, 8), c, false), 0, y + dy, 0);
      break;
    case 'dots':
      for (const [x, dy] of [[-0.08, 0.05], [0.07, -0.02], [-0.02, -0.08]] as const) add(mesh(sphere(0.03, 5, 4), c, false), x, y + dy, z);
      break;
    case 'check':
      add(mesh(cyl(w + 0.012, w + 0.016, 0.035, 8), c, false), 0, y, 0);
      add(mesh(box(0.035, 0.3, 0.02), c, false), 0, y, z - 0.01);
      break;
    case 'stars':
      for (const [x, dy] of [[-0.08, 0.05], [0.08, 0.0], [-0.01, -0.08]] as const) add(mesh(cone(0.035, 0.06, 5), c, false), x, y + dy, z, Math.PI / 2);
      break;
    case 'heart':
      for (const x of [-0.03, 0.03]) add(mesh(sphere(0.035, 6, 4), c, false), x, y + 0.02, z);
      add(mesh(cone(0.05, 0.07, 4), c, false), 0, y - 0.03, z, 0, Math.PI);
      break;
    case 'flower':
      for (let k = 0; k < 5; k++) add(mesh(sphere(0.022, 5, 4), c, false), Math.cos((k / 5) * Math.PI * 2) * 0.04, y + Math.sin((k / 5) * Math.PI * 2) * 0.04, z);
      add(mesh(sphere(0.02, 5, 4), 0xffd966, false), 0, y, z + 0.01);
      break;
    case 'leaf':
      for (const [x, dy, r] of [[-0.05, 0.03, 0.6], [0.05, -0.04, -0.6]] as const) {
        const m = mesh(sphere(0.045, 6, 4), c, false);
        m.scale.set(0.5, 1, 0.3);
        add(m, x, y + dy, z, 0, r);
      }
      break;
    default:
      break;
  }
}

function dressUp(body: THREE.Group, head: THREE.Group, legL: THREE.Group, legR: THREE.Group, armL: THREE.Group, cl: Partial<Record<ClothSlot, ClothVisual>>, top: ClothVisual | undefined, bottom: ClothVisual | undefined, dress: ClothVisual | undefined, skin: number): void {
  // tops
  if (top) {
    patternBits(body, top, 0.48, 0.235, 0.215);
    if (top.shape === 'hoodie' || top.shape === 'raincoat') {
      const hood = mesh(torus(0.16, 0.06, 5, 10, Math.PI), top.color);
      body.add(at(hood, 0, 0.7, -0.14, -0.4, 0, Math.PI));
    }
    if (top.shape === 'hoodie') body.add(at(mesh(box(0.22, 0.09, 0.04), mixLight(top.color), false), 0, 0.34, 0.23));
    if (top.shape === 'raincoat') body.add(at(mesh(cyl(0.255, 0.29, 0.12, 8), top.color), 0, 0.22, 0));
    if (top.shape === 'jacket') for (const s of [-1, 1]) body.add(at(mesh(box(0.08, 0.36, 0.03), top.color2, false), s * 0.08, 0.47, 0.22, 0, 0, s * 0.08));
    if (top.shape === 'buttonup') {
      for (const dy of [0.06, -0.04, -0.14]) body.add(at(mesh(sphere(0.018, 5, 4), top.color2, false), 0, 0.5 + dy, 0.24));
      for (const s of [-1, 1]) body.add(at(mesh(cone(0.05, 0.08, 3), top.color2, false), s * 0.07, 0.64, 0.17, Math.PI / 2 + 0.3, 0, 0));
    }
  }
  // bottoms
  if (bottom) {
    if (bottom.shape === 'skirt') {
      body.add(at(mesh(cone(0.31, 0.26, 10), bottom.color), 0, 0.27, 0));
      if (bottom.pattern !== 'plain') patternBits(body, bottom, 0.22, 0.27, 0.27);
    } else {
      // shorts / pants / overalls: a hip band, plus short leg sleeves for shorts
      body.add(at(mesh(cyl(0.255, 0.25, 0.1, 8), bottom.color), 0, 0.27, 0));
      if (bottom.shape === 'shorts') for (const g of [legL, legR]) g.add(at(mesh(cyl(0.08, 0.085, 0.09, 6), bottom.color), 0, -0.04, 0));
      if (bottom.shape === 'overalls') {
        body.add(at(mesh(box(0.22, 0.2, 0.04), bottom.color), 0, 0.42, 0.22));
        for (const s of [-1, 1]) body.add(at(mesh(box(0.035, 0.3, 0.02), bottom.color, false), s * 0.09, 0.55, 0.215), at(mesh(sphere(0.02, 5, 4), bottom.color2, false), s * 0.09, 0.5, 0.24));
      }
      if (bottom.pattern === 'stripe') for (const g of [legL, legR]) g.add(at(mesh(box(0.02, 0.2, 0.02), bottom.color2, false), 0.07, -0.12, 0));
      else if (bottom.pattern !== 'plain') patternBits(body, bottom, 0.27, 0.255, 0.25);
    }
  }
  // dresses
  if (dress) {
    const long = dress.shape === 'longdress';
    const puff = dress.shape === 'puffdress';
    const skirt = mesh(cone(puff ? 0.38 : 0.33, long ? 0.42 : puff ? 0.26 : 0.3, 12), dress.color);
    body.add(at(skirt, 0, long ? 0.16 : 0.24, 0));
    if (puff) body.add(at(mesh(torus(0.3, 0.04, 5, 14), dress.color2, false), 0, 0.12, 0, Math.PI / 2, 0, 0));
    patternBits(body, dress, 0.5, 0.235, 0.215);
    patternBits(body, dress, 0.15, long ? 0.3 : 0.28, 0.3);
  }
  // shoes
  const shoes = cl.shoes;
  if (shoes) {
    for (const g of [legL, legR]) {
      if (shoes.shape === 'boots' || shoes.shape === 'rainboots') g.add(at(mesh(cyl(0.085, 0.09, shoes.shape === 'rainboots' ? 0.16 : 0.11, 7), shoes.color), 0, -0.16, 0.01));
      if (shoes.shape === 'sneakers') g.add(at(mesh(box(0.14, 0.025, 0.19), shoes.color2, false), 0, -0.255, 0.03));
      if (shoes.shape === 'sandals') g.add(at(mesh(box(0.1, 0.02, 0.04), shoes.color2, false), 0, -0.19, 0.06));
      if (shoes.shape === 'slippers') for (const s of [-1, 1]) g.add(at(mesh(cone(0.025, 0.08, 4), shoes.color2, false), s * 0.035, -0.15, 0.08));
    }
  }
  // bags
  const bag = cl.bag;
  if (bag) {
    if (bag.shape === 'backpack') {
      body.add(at(mesh(box(0.3, 0.32, 0.14), bag.color), 0, 0.5, -0.28));
      body.add(at(mesh(box(0.22, 0.12, 0.05), bag.color2, false), 0, 0.42, -0.36));
      for (const s of [-1, 1]) body.add(at(mesh(box(0.035, 0.34, 0.03), bag.color2, false), s * 0.12, 0.52, 0.2));
    } else if (bag.shape === 'satchel') {
      body.add(at(mesh(box(0.08, 0.22, 0.18), bag.color), 0.27, 0.34, 0.04));
      body.add(at(mesh(box(0.035, 0.52, 0.025), bag.color2, false), 0.02, 0.5, 0.215, 0, 0, -0.75));
    } else if (bag.shape === 'pouch') {
      body.add(at(mesh(box(0.13, 0.11, 0.07), bag.color), -0.2, 0.3, 0.18));
      body.add(at(mesh(sphere(0.025, 5, 4), bag.color2, false), -0.2, 0.32, 0.22));
    } else {
      // basket on the left arm
      const b = mesh(cyl(0.11, 0.08, 0.12, 8), bag.color);
      armL.add(at(b, 0, -0.32, 0.08));
      armL.add(at(mesh(torus(0.09, 0.012, 4, 10, Math.PI), bag.color2, false), 0, -0.26, 0.08));
    }
  }
  // hats (head space: the head is ~0.33 round, top near y 0.31)
  const hat = cl.hat;
  if (hat) {
    switch (hat.shape) {
      case 'cap':
        head.add(at(mesh(new THREE.SphereGeometry(0.36, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), hat.color), 0, 0.06, -0.01, -0.12, 0, 0));
        head.add(at(mesh(box(0.34, 0.03, 0.22), hat.color2), 0, 0.1, 0.3, -0.12, 0, 0));
        break;
      case 'beanie':
        head.add(at(mesh(new THREE.SphereGeometry(0.365, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), hat.color), 0, 0.03, 0, -0.08, 0, 0));
        head.add(at(mesh(cyl(0.355, 0.36, 0.07, 10), hat.color2, false), 0, 0.06, 0));
        head.add(at(mesh(ico(0.08, 1), hat.color2), 0, 0.42, 0));
        break;
      case 'sunhat':
        head.add(at(mesh(cyl(0.6, 0.6, 0.03, 14), hat.color), 0, 0.2, 0, -0.1, 0, 0));
        head.add(at(mesh(cyl(0.27, 0.32, 0.2, 12), hat.color), 0, 0.3, -0.02, -0.1, 0, 0));
        head.add(at(mesh(cyl(0.325, 0.325, 0.05, 12), hat.color2, false), 0, 0.23, -0.01, -0.1, 0, 0));
        break;
      case 'bow':
        for (const s of [-1, 1]) head.add(at(mesh(cone(0.11, 0.2, 4), hat.color), s * 0.12, 0.32, -0.02, 0, 0, s * Math.PI / 2));
        head.add(at(mesh(sphere(0.06, 6, 4), hat.color2), 0, 0.32, -0.02));
        break;
      case 'flowercrown':
        head.add(at(mesh(torus(0.3, 0.035, 5, 14), hat.color), 0, 0.2, 0, Math.PI / 2 - 0.1, 0, 0));
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2;
          head.add(at(mesh(ico(0.05, 0), [hat.color2, 0xffa8c8, 0xfdfbf4][k % 3]!, false), Math.cos(a) * 0.3, 0.21 + Math.sin(a) * 0.03, Math.sin(a) * 0.3));
        }
        break;
      case 'bucket':
        head.add(at(mesh(cyl(0.3, 0.37, 0.24, 12), hat.color), 0, 0.24, -0.01, -0.08, 0, 0));
        head.add(at(mesh(cyl(0.48, 0.48, 0.03, 14), hat.color), 0, 0.12, 0, -0.08, 0, 0));
        head.add(at(mesh(cyl(0.375, 0.375, 0.05, 12), hat.color2, false), 0, 0.15, -0.01, -0.08, 0, 0));
        break;
      case 'beret': {
        const b = mesh(sphere(0.36, 10, 6), hat.color);
        b.scale.set(1.05, 0.38, 1.05);
        head.add(at(b, 0.04, 0.26, -0.02, 0, 0, -0.18));
        head.add(at(mesh(cyl(0.02, 0.02, 0.06, 4), hat.color), 0.07, 0.4, -0.02));
        break;
      }
      case 'crown':
        head.add(at(mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.14, 10, 1, true), hat.color), 0, 0.33, 0));
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          head.add(at(mesh(cone(0.05, 0.12, 4), hat.color), Math.cos(a) * 0.25, 0.45, Math.sin(a) * 0.25));
        }
        head.add(at(mesh(sphere(0.06, 6, 4), hat.color2), 0, 0.36, 0.26));
        break;
      default:
        // party hat
        head.add(at(mesh(cone(0.17, 0.4, 10), hat.color), 0.05, 0.48, 0, 0, 0, -0.15));
        head.add(at(mesh(cyl(0.12, 0.13, 0.04, 10), hat.color2, false), 0.03, 0.4, 0, 0, 0, -0.15));
        head.add(at(mesh(ico(0.05, 1), hat.color2), 0.1, 0.69, 0));
    }
  }
  // glasses (eyes sit around y 0.0, z 0.29)
  const gl = cl.glasses;
  if (gl) {
    if (gl.shape === 'shades') {
      for (const s of [-1, 1]) head.add(at(mesh(box(0.15, 0.09, 0.02), gl.color, false), s * 0.11, 0.01, 0.33));
      head.add(at(mesh(box(0.08, 0.02, 0.02), gl.color, false), 0, 0.03, 0.33));
    } else if (gl.shape === 'goggles') {
      for (const s of [-1, 1]) head.add(at(mesh(torus(0.075, 0.025, 6, 10), gl.color, false), s * 0.11, 0.01, 0.31));
      head.add(at(mesh(torus(0.335, 0.02, 4, 18), gl.color, false), 0, 0.01, 0, Math.PI / 2, 0, 0));
    } else if (gl.shape === 'heart' || gl.shape === 'star') {
      for (const s of [-1, 1]) {
        const lens = mesh(gl.shape === 'star' ? cone(0.08, 0.02, 5) : sphere(0.07, 6, 4), gl.color, false);
        if (gl.shape === 'star') lens.rotation.x = Math.PI / 2;
        else lens.scale.set(1, 0.85, 0.25);
        head.add(at(lens, s * 0.11, 0.01, 0.32, gl.shape === 'star' ? Math.PI / 2 : 0));
      }
    } else {
      for (const s of [-1, 1]) {
        const frame = gl.shape === 'square' ? mesh(box(0.14, 0.11, 0.015), gl.color, false) : mesh(torus(0.07, 0.014, 5, 12), gl.color, false);
        head.add(at(frame, s * 0.11, 0.01, 0.32));
      }
      head.add(at(mesh(box(0.06, 0.015, 0.015), gl.color, false), 0, 0.02, 0.33));
    }
  }
  void skin;
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
