import {
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Material,
  type Texture,
} from 'three';
import { CHAR_BY_ID, type AlienLook, type CharacterDef, type HumanLook } from '../../data/characters';
import type { AstronautLook } from '../../data/types';
import { markShared } from '../dispose';
import { Flame } from '../fx/flame';
import { faceTexture, setExpression, type Expression, type FaceStyle } from './faces';

/**
 * Stylized 3D characters built from simple soft shapes: the cadet (every Creator option), the crew,
 * the robots, Tuggy and the Zephyrans. About 1 unit tall, feet at the origin, facing +z.
 * Animations are procedural (no skinning): idle breathing, blinking, looking around, waving,
 * celebrating, talking, walking/running, jumping, falling, hovering, pushing and carrying.
 */

export type Anim = 'idle' | 'wave' | 'celebrate' | 'talk' | 'walk' | 'run' | 'jump' | 'fall' | 'hover' | 'push' | 'carry';
export type Mood = 'happy' | 'wow' | 'think' | 'sleepy';

// ------------------------------------------------------------------ shared bits

const geos = new Map<string, BufferGeometry>();
function geo(key: string, make: () => BufferGeometry): BufferGeometry {
  let g = geos.get(key);
  if (!g) {
    g = markShared(make());
    geos.set(key, g);
  }
  return g;
}
const mats = new Map<string, Material>();
function soft(color: string, rough = 0.62, metal = 0): Material {
  const key = `s:${color}:${rough}:${metal}`;
  let m = mats.get(key);
  if (!m) {
    m = markShared(new MeshStandardMaterial({ color, roughness: rough, metalness: metal, envMapIntensity: 1.2 }));
    mats.set(key, m);
  }
  return m;
}
function glow(color: string, power = 2): Material {
  const key = `g:${color}:${power}`;
  let m = mats.get(key);
  if (!m) {
    m = markShared(new MeshBasicMaterial({ color: new Color(color).multiplyScalar(power) }));
    mats.set(key, m);
  }
  return m;
}
function glass(color = '#bfe9ff'): Material {
  const key = `glass:${color}`;
  let m = mats.get(key);
  if (!m) {
    m = markShared(new MeshStandardMaterial({ color, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.16, envMapIntensity: 1.8, depthWrite: false }));
    mats.set(key, m);
  }
  return m;
}

const sphere = (seg = 24) => geo(`sph:${seg}`, () => new SphereGeometry(1, seg, Math.round(seg * 0.66)));
const capsule = () => geo('cap', () => new CapsuleGeometry(0.5, 1, 8, 16));

function mesh(g: BufferGeometry, m: Material, sx = 1, sy = sx, sz = sx): Mesh {
  const o = new Mesh(g, m);
  o.scale.set(sx, sy, sz);
  return o;
}

function starShape(outer: number, inner: number): Shape {
  const s = new Shape();
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? inner : outer;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}

function starMesh(size: number, m: Material): Mesh {
  const g = geo('star', () => {
    const e = new ExtrudeGeometry(starShape(1, 0.45), { depth: 0.3, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 2 });
    e.center();
    return e;
  });
  return mesh(g, m, size);
}

/** Face decal: a slice of sphere on the front of a head of radius r. */
function faceDecal(r: number, tex: Texture, emissive: boolean, width = 1.75, height = 1.45, yShift = 0): Mesh {
  const g = new SphereGeometry(r * 1.012, 24, 16, Math.PI / 2 - width / 2, width, Math.PI / 2 - height / 2 - yShift, height);
  const m = new MeshStandardMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    roughness: 0.7,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    emissive: emissive ? new Color('#ffffff') : new Color('#000000'),
    emissiveMap: emissive ? tex : null,
    emissiveIntensity: emissive ? 1.2 : 0,
  });
  const o = new Mesh(g, m);
  o.renderOrder = 2;
  return o;
}

// ------------------------------------------------------------------ hair and accessories

function hair(style: string, color: string, R: number): Group {
  const g = new Group();
  const m = soft(color, 0.75);
  const capG = geo('hairCap', () => new SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.42));
  const cap = (s = 1.07) => {
    const c = mesh(capG, m, R * s);
    c.rotation.x = -0.25;
    g.add(c);
    return c;
  };
  switch (style) {
    case 'bald':
      break;
    case 'curly':
      cap(1.05);
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * Math.PI * 2;
        const b = mesh(sphere(14), m, R * 0.3);
        b.position.set(Math.cos(a) * R * 0.78, R * 0.62 + (i % 2) * R * 0.12, Math.sin(a) * R * 0.78 - R * 0.12);
        g.add(b);
      }
      break;
    case 'long': {
      cap();
      const back = mesh(capsule(), m, R * 1.6, R * 1.2, R * 0.7);
      back.position.set(0, -R * 0.15, -R * 0.55);
      g.add(back);
      break;
    }
    case 'bun': {
      cap();
      const bun = mesh(sphere(16), m, R * 0.42);
      bun.position.set(0, R * 1.02, -R * 0.35);
      g.add(bun);
      break;
    }
    case 'spiky':
      cap(1.04);
      for (let i = 0; i < 7; i++) {
        const sp = mesh(geo('spike', () => new ConeGeometry(0.5, 1, 8)), m, R * 0.35, R * 0.7, R * 0.35);
        const a = -0.9 + (i / 6) * 1.8;
        sp.position.set(Math.sin(a) * R * 0.55, R * 0.95, Math.cos(a) * R * 0.25 - R * 0.2);
        sp.rotation.z = -a * 0.6;
        sp.rotation.x = -0.4;
        g.add(sp);
      }
      break;
    case 'bob': {
      // Sides and back only: the face stays open.
      const shell = mesh(geo('bob', () => new SphereGeometry(1, 28, 16, Math.PI / 2 + 0.75, Math.PI * 2 - 1.5, 0, Math.PI * 0.62)), m, R * 1.1);
      g.add(shell);
      cap(1.08);
      break;
    }
    case 'puff':
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const b = mesh(sphere(14), m, R * 0.42);
        b.position.set(Math.cos(a) * R * 0.85, R * 0.45 + Math.sin(i * 1.7) * R * 0.15, Math.sin(a) * R * 0.6 - R * 0.25);
        g.add(b);
      }
      cap(1.02);
      break;
    case 'pony': {
      cap();
      const tail = mesh(capsule(), m, R * 0.36, R * 0.9, R * 0.36);
      tail.position.set(0, R * 0.2, -R * 1.05);
      tail.rotation.x = 0.5;
      g.add(tail);
      break;
    }
    default:
      cap();
  }
  return g;
}

function accessory(kind: string | undefined, R: number, hairColor: string, outfit: string): Group {
  const g = new Group();
  if (!kind) return g;
  const ink = soft('#2a2f55', 0.4, 0.2);
  switch (kind) {
    case 'glasses':
      for (const s of [-1, 1]) {
        const ring = mesh(geo('glassRing', () => new TorusGeometry(1, 0.12, 8, 24)), ink, R * 0.2);
        ring.position.set(s * R * 0.32, R * 0.12, R * 0.95);
        g.add(ring);
      }
      break;
    case 'goggles': {
      const strap = mesh(geo('strap', () => new TorusGeometry(1, 0.06, 8, 40)), soft('#3a3f66'), R * 1.03);
      strap.rotation.x = Math.PI / 2 - 0.35;
      strap.position.y = R * 0.42;
      g.add(strap);
      for (const s of [-1, 1]) {
        const lens = mesh(geo('goggle', () => new CylinderGeometry(1, 1, 0.6, 20)), soft('#ffc83d', 0.3, 0.6), R * 0.22);
        lens.rotation.x = Math.PI / 2 - 0.5;
        lens.position.set(s * R * 0.28, R * 0.68, R * 0.78);
        const glassDisc = mesh(geo('goggleGlass', () => new CylinderGeometry(0.8, 0.8, 0.62, 20)), soft('#7fe0ff', 0.05, 0.3), R * 0.22);
        glassDisc.rotation.copy(lens.rotation);
        glassDisc.position.copy(lens.position);
        g.add(lens, glassDisc);
      }
      break;
    }
    case 'headset': {
      const band = mesh(geo('band', () => new TorusGeometry(1, 0.07, 8, 32, Math.PI)), ink, R * 1.08);
      g.add(band);
      for (const s of [-1, 1]) {
        const cup = mesh(sphere(14), soft('#4dd4ff', 0.4), R * 0.22, R * 0.26, R * 0.16);
        cup.position.set(s * R * 1.02, 0, 0);
        g.add(cup);
      }
      const mic = mesh(sphere(10), ink, R * 0.08);
      mic.position.set(-R * 0.55, -R * 0.45, R * 0.75);
      g.add(mic);
      break;
    }
    case 'beard': {
      const b = mesh(sphere(18), soft(hairColor, 0.8), R * 0.62, R * 0.5, R * 0.45);
      b.position.set(0, -R * 0.55, R * 0.55);
      g.add(b);
      break;
    }
    case 'mustache':
      for (const s of [-1, 1]) {
        const m = mesh(capsule(), soft(hairColor, 0.8), R * 0.12, R * 0.22, R * 0.12);
        m.rotation.z = s * 1.2;
        m.position.set(s * R * 0.16, -R * 0.12, R * 0.97);
        g.add(m);
      }
      break;
    case 'cap': {
      const dome = mesh(geo('capDome', () => new SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45)), soft(outfit, 0.6), R * 1.08);
      const brim = mesh(geo('brim', () => new CylinderGeometry(1, 1, 0.08, 24, 1, false, -Math.PI / 2, Math.PI)), soft(outfit, 0.6), R * 0.75, R, R * 0.75);
      brim.position.set(0, R * 0.42, R * 0.45);
      g.add(dome, brim);
      break;
    }
    default:
      break;
  }
  return g;
}

// ------------------------------------------------------------------ the character

interface Joints {
  root: Group;
  hips: Group;
  torso: Group;
  head: Group;
  lShoulder: Group;
  lElbow: Group;
  rShoulder: Group;
  rElbow: Group;
  lHip: Group;
  lKnee: Group;
  rHip: Group;
  rKnee: Group;
}

interface Pose {
  hipsY: number;
  lean: number;
  torsoYaw: number;
  headX: number;
  headY: number;
  headZ: number;
  lShZ: number;
  lShX: number;
  lEl: number;
  rShZ: number;
  rShX: number;
  rEl: number;
  lHipX: number;
  lKnee: number;
  rHipX: number;
  rKnee: number;
  squash: number;
}

function zeroPose(): Pose {
  return { hipsY: 0, lean: 0, torsoYaw: 0, headX: 0, headY: 0, headZ: 0, lShZ: 0.12, lShX: 0, lEl: 0, rShZ: -0.12, rShX: 0, rEl: 0, lHipX: 0, lKnee: 0, rHipX: 0, rKnee: 0, squash: 1 };
}

const POSE_KEYS = Object.keys(zeroPose()) as Array<keyof Pose>;

export interface CharacterOptions {
  /** Draw the cadet's helmet (on by default; off to show hair clearly in Creator thumbnails). */
  helmet?: boolean;
  /** Portrait framing: 'bust' (face) or 'wide' (whole head with helmet decorations). */
  frame?: 'bust' | 'wide' | 'full';
}

export class Character {
  readonly group = new Group();
  readonly id: string;
  readonly height: number;
  readonly j: Joints;
  anim: Anim = 'idle';
  mood: Mood = 'happy';
  /** Walk/run speed factor (1 = normal). */
  speed = 1;
  /** Hold something over the head (arms only), whatever the legs are doing. */
  carrying = false;
  private face: Texture | null = null;
  private t = Math.random() * 10;
  private blinkT = 2 + Math.random() * 3;
  private talking = false;
  private talkT = 0;
  private readonly pose = zeroPose();
  private readonly target = zeroPose();
  private animT = 0;
  private jet: Flame[] = [];
  private cape: Mesh | null = null;
  private bobber: Object3D | null = null;
  /** Height of the head's center (for portraits and speech bubbles). */
  readonly headY: number;
  readonly headR: number;

  constructor(id: string, profile?: AstronautLook, opts: CharacterOptions = {}) {
    this.id = id;
    const def: CharacterDef = CHAR_BY_ID[id] ?? CHAR_BY_ID.player;
    const root = new Group();
    const hips = new Group();
    const torso = new Group();
    const head = new Group();
    const lShoulder = new Group();
    const lElbow = new Group();
    const rShoulder = new Group();
    const rElbow = new Group();
    const lHip = new Group();
    const lKnee = new Group();
    const rHip = new Group();
    const rKnee = new Group();
    this.j = { root, hips, torso, head, lShoulder, lElbow, rShoulder, rElbow, lHip, lKnee, rHip, rKnee };
    root.add(hips);
    hips.add(torso, lHip, rHip);
    torso.add(head, lShoulder, rShoulder);
    lShoulder.add(lElbow);
    rShoulder.add(rElbow);
    lHip.add(lKnee);
    rHip.add(rKnee);
    this.group.add(root);
    const kind = def.kind;
    let headY = 0.72;
    let headR = 0.24;
    if (kind === 'alien' || kind === 'elder' || kind === 'critter') {
      ({ headY, headR } = this.buildAlien(def, kind));
    } else if (kind === 'robot' || kind === 'tuggy') {
      ({ headY, headR } = this.buildRobot(def));
    } else {
      ({ headY, headR } = this.buildHuman(def, kind === 'player' ? profile : undefined, opts));
    }
    this.headY = headY;
    this.headR = headR;
    this.height = headY + headR * 1.3;
    this.group.userData.onDispose = () => this.face?.dispose();
  }

  // ---------------------------------------------------------------- builders

  private limbs(armColor: string, handColor: string, legColor: string, shoeColor: string, shoulderX: number, shoulderY: number, hipX: number, legLen: number, armLen: number, thick: number): void {
    const j = this.j;
    const armM = soft(armColor);
    const handM = soft(handColor, 0.55);
    for (const [sh, el, s] of [[j.lShoulder, j.lElbow, 1], [j.rShoulder, j.rElbow, -1]] as const) {
      sh.position.set(s * shoulderX, shoulderY, 0);
      const upper = mesh(capsule(), armM, thick, armLen * 0.5, thick);
      upper.position.y = -armLen * 0.25;
      sh.add(upper);
      el.position.y = -armLen * 0.5;
      const lower = mesh(capsule(), armM, thick * 0.95, armLen * 0.45, thick * 0.95);
      lower.position.y = -armLen * 0.22;
      const hand = mesh(sphere(14), handM, thick * 0.75);
      hand.position.y = -armLen * 0.48;
      el.add(lower, hand);
    }
    const legM = soft(legColor);
    const shoeM = soft(shoeColor, 0.5);
    for (const [hp, kn, s] of [[j.lHip, j.lKnee, 1], [j.rHip, j.rKnee, -1]] as const) {
      hp.position.set(s * hipX, 0, 0);
      const thigh = mesh(capsule(), legM, thick * 1.15, legLen * 0.5, thick * 1.15);
      thigh.position.y = -legLen * 0.25;
      hp.add(thigh);
      kn.position.y = -legLen * 0.5;
      const shin = mesh(capsule(), legM, thick * 1.1, legLen * 0.45, thick * 1.1);
      shin.position.y = -legLen * 0.22;
      const shoe = mesh(sphere(16), shoeM, thick * 1.2, thick * 0.8, thick * 1.6);
      shoe.position.set(0, -legLen * 0.48, thick * 0.4);
      kn.add(shin, shoe);
    }
    j.hips.position.y = legLen + thick * 0.7;
  }

  private buildHuman(def: CharacterDef, player: AstronautLook | undefined, opts: CharacterOptions): { headY: number; headR: number } {
    const j = this.j;
    const isPlayer = def.kind === 'player';
    const look: HumanLook = def.human ?? { skin: '#c68a5e', hair: '#2b1a12', hairStyle: 'short', outfit: '#4c7dff' };
    const p = player;
    const skin = p?.skin ?? look.skin;
    const hairColor = p?.hair ?? look.hair;
    const hairStyle = p?.hairStyle ?? look.hairStyle;
    const outfit = isPlayer ? p?.suit ?? '#f4f7ff' : look.outfit;
    const accent = p?.accent ?? '#4c7dff';
    const R = 0.235;
    const legLen = 0.26;
    const thick = 0.075;
    this.limbs(outfit, isPlayer ? accent : skin, isPlayer ? outfit : '#3a3f66', isPlayer ? accent : '#2a2f55', 0.15, 0.2, 0.065, legLen, 0.26, thick);
    // Torso.
    const body = mesh(capsule(), soft(outfit, isPlayer ? 0.45 : 0.6), 0.26, 0.2, 0.2);
    body.position.y = 0.12;
    j.torso.add(body);
    if (isPlayer) {
      // Suit details: chest stripe, belt, backpack.
      const stripe = mesh(geo('stripe', () => new TorusGeometry(1, 0.08, 8, 32)), soft(accent, 0.5), 0.125, 0.125, 0.105);
      stripe.rotation.x = Math.PI / 2;
      stripe.position.y = 0.06;
      const panel = mesh(geo('panel', () => new CylinderGeometry(1, 1, 0.2, 20)), soft('#2a2f55', 0.4), 0.05);
      panel.rotation.x = Math.PI / 2;
      panel.position.set(0.04, 0.17, 0.1);
      const light = mesh(sphere(10), glow('#8cff66', 2.2), 0.014);
      light.position.set(0.04, 0.17, 0.12);
      const pack = mesh(capsule(), soft('#d6dcf0', 0.35, 0.5), 0.2, 0.16, 0.12);
      pack.position.set(0, 0.15, -0.12);
      j.torso.add(stripe, panel, light, pack);
      const style = p?.outfit ?? 'none';
      this.outfit(style, accent);
    } else if (look.accessory === 'star') {
      const pin = starMesh(0.028, glow('#ffd84a', 1.4));
      pin.position.set(0.07, 0.2, 0.105);
      j.torso.add(pin);
    } else if (look.accessory === 'bowtie') {
      for (const s of [-1, 1]) {
        const c = mesh(geo('bow', () => new ConeGeometry(0.5, 1, 12)), soft('#ff5d73'), 0.04, 0.06, 0.04);
        c.rotation.z = s * Math.PI / 2;
        c.position.set(s * 0.03, 0.27, 0.09);
        j.torso.add(c);
      }
    }
    // Head.
    j.head.position.y = 0.3 + R * 0.95;
    const headM = soft(skin, 0.6);
    const h = mesh(sphere(32), headM, R, R * 0.97, R * 0.95);
    j.head.add(h);
    for (const s of [-1, 1]) {
      const ear = mesh(sphere(12), headM, R * 0.16, R * 0.22, R * 0.12);
      ear.position.set(s * R * 0.96, -R * 0.05, 0);
      j.head.add(ear);
    }
    const base = (p?.face ?? 'smile') as 'smile';
    const style: FaceStyle = { kind: 'human', base: isPlayer ? base : 'smile', blush: true, brows: hairColor === '#f4f7ff' ? '#9aa4c7' : hairColor };
    this.face = faceTexture(style);
    this.face.userData = {};
    j.head.add(faceDecal(R * 0.96, this.face, false, 1.7, 1.5, -0.05));
    j.head.add(hair(hairStyle, hairColor, R));
    j.head.add(accessory(isPlayer ? undefined : look.accessory, R, hairColor, outfit));
    if (isPlayer && opts.helmet !== false) this.helmet(p?.helmet ?? 'round', accent, R);
    const headY = j.hips.position.y + j.torso.position.y + j.head.position.y;
    return { headY, headR: R };
  }

  private helmet(style: string, accent: string, R: number): void {
    const j = this.j;
    const bubble = mesh(sphere(32), glass(), R * 1.42);
    bubble.position.set(0, R * 0.05, R * 0.05);
    bubble.renderOrder = 3;
    const collar = mesh(geo('collar', () => new TorusGeometry(1, 0.22, 10, 32)), soft('#d6dcf0', 0.3, 0.6), R * 0.85);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = -R * 1.05;
    j.head.add(bubble, collar);
    const accM = soft(accent, 0.45);
    switch (style) {
      case 'visor': {
        const visor = mesh(geo('visor', () => new SphereGeometry(1, 28, 10, Math.PI * 0.2, Math.PI * 0.6, Math.PI * 0.25, Math.PI * 0.18)), soft('#ffc83d', 0.15, 0.8), R * 1.45);
        visor.rotation.y = Math.PI;
        visor.position.z = R * 0.05;
        j.head.add(visor);
        break;
      }
      case 'ears':
        for (const s of [-1, 1]) {
          const ear = mesh(geo('catEar', () => new ConeGeometry(0.5, 1, 4)), accM, R * 0.45, R * 0.55, R * 0.25);
          ear.position.set(s * R * 0.75, R * 1.3, 0);
          ear.rotation.z = -s * 0.4;
          j.head.add(ear);
        }
        break;
      case 'antenna': {
        const rod = mesh(geo('rod', () => new CylinderGeometry(0.5, 0.5, 1, 8)), soft('#d6dcf0', 0.3, 0.6), 0.012, R * 0.7, 0.012);
        rod.position.set(R * 0.4, R * 1.6, 0);
        const ball = mesh(sphere(12), glow(accent, 1.8), R * 0.14);
        ball.position.set(R * 0.4, R * 1.98, 0);
        j.head.add(rod, ball);
        this.bobber = ball;
        break;
      }
      case 'star': {
        const st = starMesh(R * 0.28, glow('#ffd84a', 1.5));
        st.position.set(0, R * 1.62, 0);
        j.head.add(st);
        this.bobber = st;
        break;
      }
      case 'fin': {
        const fin = mesh(geo('crestFin', () => new CylinderGeometry(0.02, 1, 1, 3, 1)), accM, R * 0.1, R * 0.6, R * 0.9);
        fin.position.set(0, R * 1.55, -R * 0.2);
        fin.rotation.x = 0.3;
        j.head.add(fin);
        break;
      }
      default:
        break;
    }
  }

  private outfit(style: string, accent: string): void {
    const j = this.j;
    switch (style) {
      case 'scarf': {
        const s = mesh(geo('scarf', () => new TorusGeometry(1, 0.35, 10, 28)), soft('#ff5d73', 0.8), 0.11, 0.11, 0.1);
        s.rotation.x = Math.PI / 2;
        s.position.y = 0.27;
        const end = mesh(capsule(), soft('#ff5d73', 0.8), 0.05, 0.14, 0.03);
        end.position.set(0.06, 0.18, 0.11);
        end.rotation.z = 0.2;
        j.torso.add(s, end);
        break;
      }
      case 'cape': {
        const cape = new Mesh(geo('cape', () => {
          const g = new PlaneGeometry(0.34, 0.42, 4, 6);
          g.translate(0, -0.21, 0);
          return g;
        }), new MeshStandardMaterial({ color: '#ff5d73', roughness: 0.7, side: DoubleSide }));
        cape.position.set(0, 0.28, -0.13);
        j.torso.add(cape);
        this.cape = cape;
        break;
      }
      case 'jetpack':
        for (const s of [-1, 1]) {
          const tank = mesh(capsule(), soft('#ff9f43', 0.35, 0.3), 0.07, 0.18, 0.07);
          tank.position.set(s * 0.06, 0.15, -0.2);
          j.torso.add(tank);
          const f = new Flame(0.03, '#ff9f43', '#fff36b');
          f.group.position.set(s * 0.06, 0.02, -0.2);
          j.torso.add(f.group);
          this.jet.push(f);
        }
        break;
      case 'stars':
        for (let i = 0; i < 7; i++) {
          const st = starMesh(0.018, glow('#ffe066', 1.2));
          const a = -1.2 + (i / 6) * 2.4;
          st.position.set(Math.sin(a) * 0.13, 0.04 + (i % 3) * 0.08, Math.cos(a) * 0.105);
          st.rotation.y = a;
          j.torso.add(st);
        }
        break;
      case 'crown': {
        const crown = new Group();
        const ring = mesh(geo('crownRing', () => new CylinderGeometry(1, 1, 0.5, 20, 1, true)), soft('#ffc83d', 0.25, 0.85), 0.1, 0.06, 0.1);
        crown.add(ring);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const pt = mesh(geo('crownPt', () => new ConeGeometry(0.5, 1, 6)), soft('#ffc83d', 0.25, 0.85), 0.04, 0.07, 0.04);
          pt.position.set(Math.cos(a) * 0.09, 0.05, Math.sin(a) * 0.09);
          crown.add(pt);
        }
        crown.position.y = 0.385;
        j.head.add(crown);
        this.bobber = crown;
        break;
      }
      case 'sash': {
        const sash = mesh(geo('sash', () => new TorusGeometry(1, 0.12, 8, 32)), soft('#b07bff', 0.5), 0.14, 0.2, 0.12);
        sash.rotation.set(Math.PI / 2, 0.7, 0);
        sash.position.y = 0.12;
        j.torso.add(sash);
        break;
      }
      default:
        void accent;
    }
  }

  private buildRobot(def: CharacterDef): { headY: number; headR: number } {
    const j = this.j;
    const tuggy = def.kind === 'tuggy';
    const color = tuggy ? '#ffc83d' : def.id === 'pots' ? '#ff9f43' : '#4dd4ff';
    const metal = soft('#c9d2ee', 0.25, 0.85);
    const bodyM = soft(color, 0.35, 0.25);
    const R = tuggy ? 0.32 : 0.21;
    if (tuggy) {
      // Tuggy floats: no legs, two thrusters.
      j.hips.position.y = 0.45;
      const body = mesh(sphere(32), bodyM, 0.36, 0.32, 0.33);
      j.torso.add(body);
      for (const s of [-1, 1]) {
        const pod = mesh(capsule(), soft('#2a2f55', 0.5, 0.4), 0.08, 0.1, 0.08);
        pod.position.set(s * 0.42, -0.02, -0.02);
        j.torso.add(pod);
        const f = new Flame(0.035, '#4dd4ff', '#e6fbff');
        f.group.position.set(s * 0.42, -0.1, -0.02);
        j.torso.add(f.group);
        this.jet.push(f);
      }
      const band = mesh(geo('tugBand', () => new TorusGeometry(1, 0.1, 10, 40)), soft('#2a2f55', 0.5, 0.4), 0.35);
      band.rotation.x = Math.PI / 2;
      j.torso.add(band);
      // Tow hook underneath.
      const arm = mesh(geo('hookArm', () => new CylinderGeometry(0.5, 0.5, 1, 8)), metal, 0.03, 0.16, 0.03);
      arm.position.y = -0.38;
      const claw = mesh(geo('hookClaw', () => new TorusGeometry(1, 0.28, 8, 16, Math.PI * 1.4)), metal, 0.07);
      claw.position.y = -0.5;
      claw.rotation.z = Math.PI * 0.8;
      j.torso.add(arm, claw);
      j.head.position.y = 0;
    } else {
      this.limbs(color, '#d6dcf0', '#8c94b8', '#3a3f66', 0.16, 0.2, 0.07, 0.24, 0.24, 0.06);
      const body = mesh(sphere(28), bodyM, 0.2, 0.2, 0.17);
      body.position.y = 0.12;
      const belly = mesh(geo('bellyPanel', () => new CylinderGeometry(1, 1, 0.2, 24)), soft('#2a2f55', 0.4, 0.4), 0.08);
      belly.rotation.x = Math.PI / 2;
      belly.position.set(0, 0.1, 0.16);
      const dot = mesh(sphere(10), glow('#8cff66', 2.2), 0.02);
      dot.position.set(0, 0.1, 0.18);
      j.torso.add(body, belly, dot);
      j.head.position.y = 0.32 + R * 0.95;
      const neck = mesh(geo('neck', () => new CylinderGeometry(0.5, 0.5, 1, 12)), metal, 0.05, 0.08, 0.05);
      neck.position.y = -R * 0.95;
      j.head.add(neck);
    }
    const head = tuggy ? new Group() : mesh(sphere(28), bodyM, R * 1.15, R, R);
    j.head.add(head);
    const style: FaceStyle = { kind: 'robot', color: tuggy ? '#7dffe9' : '#8cfff0' };
    this.face = faceTexture(style);
    this.face.userData = {};
    const faceR = tuggy ? 0.33 : R * 1.02;
    j.head.add(faceDecal(faceR, this.face, true, tuggy ? 1.5 : 1.7, tuggy ? 1.15 : 1.35, 0.02));
    // Antenna with a glowing tip.
    const rod = mesh(geo('rod2', () => new CylinderGeometry(0.5, 0.5, 1, 8)), metal, 0.012, 0.16, 0.012);
    rod.position.y = (tuggy ? 0.33 : R) + 0.08;
    const tip = mesh(sphere(12), glow(tuggy ? '#ff5d73' : '#ffe066', 2.4), 0.03);
    tip.position.y = (tuggy ? 0.33 : R) + 0.17;
    j.head.add(rod, tip);
    this.bobber = tip;
    if (def.id === 'pots') {
      const hat = mesh(capsule(), soft('#ffffff', 0.8), R * 0.9, R * 0.6, R * 0.9);
      hat.position.y = R * 1.15;
      j.head.add(hat);
    }
    if (def.id === 'boltzy') {
      const wrench = mesh(capsule(), metal, 0.025, 0.14, 0.025);
      wrench.position.set(0, -0.14, 0.03);
      j.rElbow.add(wrench);
    }
    const headY = j.hips.position.y + j.torso.position.y + j.head.position.y;
    return { headY, headR: tuggy ? 0.33 : R };
  }

  private buildAlien(def: CharacterDef, kind: string): { headY: number; headR: number } {
    const j = this.j;
    const look: AlienLook = def.alien ?? { body: '#fff3b0', belly: '#ffffff', eyes: 2, antenna: '#ffe066' };
    const critter = kind === 'critter';
    const elder = kind === 'elder';
    const bodyM = critter ? glow('#fff3b0', 1.6) : soft(look.body, 0.5);
    const R = critter ? 0.2 : elder ? 0.3 : 0.32;
    // Round body (the head and body are one bouncy blob), small feet and arms.
    j.hips.position.y = critter ? 0.3 : 0.08;
    const blob = mesh(sphere(32), bodyM, R, R * 1.05, R * 0.95);
    blob.position.y = R * 0.95;
    j.torso.add(blob);
    if (!critter) {
      const belly = mesh(sphere(24), soft(look.belly, 0.55), R * 0.62, R * 0.45, R * 0.42);
      belly.position.set(0, R * 0.42, R * 0.56);
      j.torso.add(belly);
      for (const s of [-1, 1]) {
        const foot = mesh(sphere(16), bodyM, R * 0.22, R * 0.14, R * 0.3);
        foot.position.set(s * R * 0.42, R * 0.05, R * 0.15);
        j.hips.add(foot);
        j[s > 0 ? 'lShoulder' : 'rShoulder'].position.set(s * R * 0.9, R * 0.85, 0);
        const arm = mesh(capsule(), bodyM, R * 0.16, R * 0.4, R * 0.16);
        arm.position.y = -R * 0.2;
        j[s > 0 ? 'lShoulder' : 'rShoulder'].add(arm);
      }
      if (elder) {
        const robe = mesh(geo('robe', () => new ConeGeometry(1, 1, 24, 1, true)), soft('#6b3fd4', 0.7), R * 1.15, R * 1.2, R * 1.15);
        robe.position.y = R * 0.45;
        j.torso.add(robe);
      }
    }
    // Antennae with glowing tips.
    const ant = soft(look.antenna, 0.5);
    const n = critter ? 0 : look.eyes === 3 ? 1 : 2;
    for (let i = 0; i < n; i++) {
      const s = n === 1 ? 0 : i ? 1 : -1;
      const stalk = mesh(geo('stalk', () => new CylinderGeometry(0.5, 0.5, 1, 8)), ant, 0.018, R * 0.6, 0.018);
      stalk.position.set(s * R * 0.35, R * 2.0, 0);
      stalk.rotation.z = -s * 0.35;
      const ball = mesh(sphere(14), glow(look.antenna, 1.8), R * 0.13);
      ball.position.set(s * R * 0.47, R * 2.3, 0);
      j.torso.add(stalk, ball);
      if (i === 0) this.bobber = ball;
    }
    if (look.extra === 'scarf') {
      const scarf = mesh(geo('scarf2', () => new TorusGeometry(1, 0.2, 10, 28)), soft('#ff7ad9', 0.8), R * 0.93, R * 0.93, R * 0.86);
      scarf.rotation.x = Math.PI / 2 + 0.12;
      scarf.position.y = R * 0.78;
      j.torso.add(scarf);
    } else if (look.extra === 'crown') {
      const crown = mesh(geo('crown2', () => new CylinderGeometry(1, 0.85, 0.6, 6, 1, true)), soft('#ffc83d', 0.25, 0.85), R * 0.45, R * 0.35, R * 0.45);
      crown.position.y = R * 1.95;
      j.torso.add(crown);
    } else if (look.extra === 'bow') {
      for (const s of [-1, 1]) {
        const c = mesh(geo('bow2', () => new ConeGeometry(0.5, 1, 12)), soft('#ff5d73'), R * 0.25, R * 0.35, R * 0.18);
        c.rotation.z = s * Math.PI / 2;
        c.position.set(s * R * 0.2, R * 1.9, R * 0.2);
        j.torso.add(c);
      }
    } else if (look.extra === 'leaf') {
      const leaf = mesh(sphere(12), soft('#2ed47a', 0.6), R * 0.22, R * 0.06, R * 0.12);
      leaf.position.set(R * 0.35, R * 2.42, 0);
      j.torso.add(leaf);
    }
    const style: FaceStyle = critter ? { kind: 'critter' } : { kind: 'alien', eyes: look.eyes, elder };
    this.face = faceTexture(style);
    this.face.userData = {};
    const decal = faceDecal(R, this.face, critter, 1.75, 1.15, 0.42);
    decal.scale.set(1, 1.05, 0.95);
    decal.position.y = R * 0.95;
    j.torso.add(decal);
    // For aliens the "head" joint is the whole blob; keep it at the body center for look-around.
    const headY = j.hips.position.y + R * 1.15;
    return { headY, headR: R * 1.05 };
  }

  // ---------------------------------------------------------------- animation

  setAnim(a: Anim): void {
    if (a !== this.anim) {
      this.anim = a;
      this.animT = 0;
    }
  }

  talk(on: boolean): void {
    this.talking = on;
  }

  private expression(e: Expression): void {
    if (this.face) setExpression(this.face, e);
  }

  private computeTarget(t: number): void {
    const p = this.target;
    const z = zeroPose();
    for (const k of POSE_KEYS) p[k] = z[k];
    const breath = Math.sin(t * 1.8);
    p.squash = 1 + breath * 0.012;
    p.headY = Math.sin(t * 0.37) * 0.25;
    p.headX = Math.sin(t * 0.53) * 0.06;
    p.lShZ = 0.14 + breath * 0.02;
    p.rShZ = -0.14 - breath * 0.02;
    const a = this.anim;
    const at = this.animT;
    if (a === 'wave') {
      p.rShZ = -2.5;
      p.rEl = 0;
      p.rShX = -0.2;
      p.headZ = 0.12;
      p.rEl = -0.2 + Math.sin(t * 9) * 0.45;
    } else if (a === 'celebrate') {
      const hop = Math.abs(Math.sin(t * 5.5));
      p.hipsY = hop * 0.09;
      p.lShZ = 2.6 + Math.sin(t * 11) * 0.15;
      p.rShZ = -2.6 - Math.sin(t * 11) * 0.15;
      p.lKnee = p.rKnee = (1 - hop) * 0.5;
      p.lHipX = p.rHipX = -(1 - hop) * 0.25;
      p.squash = 1 + (hop - 0.5) * 0.06;
      p.headX = -0.15;
    } else if (a === 'talk') {
      p.rShZ = -0.5 - Math.sin(t * 3) * 0.2;
      p.rEl = -0.8;
      p.rShX = -0.5;
      p.headX = Math.sin(t * 6) * 0.05;
    } else if (a === 'walk' || a === 'run') {
      const run = a === 'run';
      const ph = t * (run ? 11 : 7.5) * this.speed;
      const sw = run ? 0.75 : 0.5;
      p.lHipX = Math.sin(ph) * sw;
      p.rHipX = -Math.sin(ph) * sw;
      p.lKnee = Math.max(0, -Math.cos(ph)) * (run ? 1.1 : 0.7);
      p.rKnee = Math.max(0, Math.cos(ph)) * (run ? 1.1 : 0.7);
      p.lShX = -Math.sin(ph) * sw * 0.9;
      p.rShX = Math.sin(ph) * sw * 0.9;
      p.lEl = p.rEl = -(run ? 0.9 : 0.35);
      p.hipsY = Math.abs(Math.cos(ph)) * (run ? 0.03 : 0.018);
      p.lean = run ? 0.18 : 0.05;
      p.headY = 0;
    } else if (a === 'jump') {
      p.lHipX = p.rHipX = -0.6;
      p.lKnee = p.rKnee = 0.9;
      p.lShZ = 1.4;
      p.rShZ = -1.4;
      p.headX = -0.1;
    } else if (a === 'fall') {
      p.lHipX = 0.2;
      p.rHipX = -0.1;
      p.lKnee = 0.3;
      p.rKnee = 0.5;
      p.lShZ = 2.2 + Math.sin(t * 9) * 0.2;
      p.rShZ = -2.2 - Math.sin(t * 9) * 0.2;
      p.headX = 0.12;
    } else if (a === 'hover') {
      p.lHipX = p.rHipX = -0.2;
      p.lKnee = p.rKnee = 0.4;
      p.lShZ = 0.9;
      p.rShZ = -0.9;
      p.hipsY = Math.sin(t * 6) * 0.01;
    } else if (a === 'push') {
      p.lean = 0.35;
      p.lShX = p.rShX = -1.45;
      p.lEl = p.rEl = -0.3;
      p.lShZ = 0.2;
      p.rShZ = -0.2;
      const ph = t * 6;
      p.lHipX = Math.sin(ph) * 0.35 - 0.15;
      p.rHipX = -Math.sin(ph) * 0.35 - 0.15;
      p.lKnee = Math.max(0, -Math.cos(ph)) * 0.6;
      p.rKnee = Math.max(0, Math.cos(ph)) * 0.6;
    } else if (a === 'carry') {
      p.lShZ = 2.75;
      p.rShZ = -2.75;
      p.lEl = p.rEl = -0.5;
      p.lShX = p.rShX = -0.2;
    }
    if (this.carrying && a !== 'carry') {
      p.lShZ = 2.75;
      p.rShZ = -2.75;
      p.lEl = p.rEl = -0.5;
      p.lShX = p.rShX = -0.2;
    }
    void at;
  }

  update(dt: number): void {
    this.t += dt;
    this.animT += dt;
    this.computeTarget(this.t);
    // Smoothly blend toward the target pose.
    const k = 1 - Math.exp(-14 * dt);
    const p = this.pose;
    const g = this.target;
    for (const key of POSE_KEYS) p[key] += (g[key] - p[key]) * k;
    this.apply(dt);
  }

  /** Strike a still pose right away (portraits, thumbnails): no blending, eyes open, looking ahead. */
  freeze(mood: Mood = 'happy', anim: Anim = 'idle'): void {
    this.mood = mood;
    this.anim = anim;
    this.t = 0;
    this.computeTarget(0);
    for (const key of POSE_KEYS) this.pose[key] = this.target[key];
    this.blinkT = 99;
    this.apply(0);
  }

  private apply(dt: number): void {
    const p = this.pose;
    const t = this.t;
    const j = this.j;
    j.root.position.y = p.hipsY;
    j.torso.rotation.set(p.lean, p.torsoYaw, 0);
    j.torso.scale.set(1 / Math.sqrt(p.squash), p.squash, 1 / Math.sqrt(p.squash));
    j.head.rotation.set(p.headX, p.headY, p.headZ);
    j.lShoulder.rotation.set(p.lShX, 0, p.lShZ);
    j.rShoulder.rotation.set(p.rShX, 0, p.rShZ);
    j.lElbow.rotation.x = p.lEl;
    j.rElbow.rotation.x = p.rEl;
    j.lHip.rotation.x = p.lHipX;
    j.rHip.rotation.x = p.rHipX;
    j.lKnee.rotation.x = p.lKnee;
    j.rKnee.rotation.x = p.rKnee;
    if (this.cape) this.cape.rotation.x = -0.15 - p.lean * 0.8 - Math.sin(t * 2.2) * 0.06 - (this.anim === 'run' || this.anim === 'fall' ? 0.6 : 0);
    if (this.bobber) this.bobber.position.y += Math.sin(t * 4) * 0.0006 * (dt > 0 ? 1 : 0);
    for (const f of this.jet) f.set(t, this.anim === 'hover' || this.anim === 'jump' || this.id === 'tuggy' ? 0.9 : 0.15, 0);
    // Face: blink every few seconds, flap the mouth while talking, mood otherwise.
    this.blinkT -= dt;
    if (this.blinkT < -0.12) this.blinkT = 2.4 + Math.random() * 3;
    let e: Expression = this.mood === 'happy' ? 'happy' : this.mood;
    if (this.anim === 'celebrate') e = 'cheer';
    if (this.talking) {
      this.talkT += dt;
      const f = Math.floor(this.talkT * 9) % 3;
      e = f === 0 ? 'talk' : f === 1 ? 'talk2' : e === 'cheer' ? 'cheer' : 'happy';
    }
    if (this.blinkT < 0 && e !== 'cheer' && e !== 'sleepy') e = 'blink';
    this.expression(e);
  }
}

/** The player's cadet built from their saved profile. */
export function buildCadet(profile: AstronautLook, opts: CharacterOptions = {}): Character {
  return new Character('player', profile, opts);
}
