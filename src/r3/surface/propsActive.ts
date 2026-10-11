import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  Shape,
  SphereGeometry,
  type Material,
  type Sprite,
  type SpriteMaterial,
} from 'three';
import type { Theme } from '../../data/themes';
import { markShared } from '../dispose';
import { Cloth } from './propsBasic';
import {
  INK,
  M,
  bake,
  bakeGeo,
  box,
  chevronShape,
  cyl,
  ext,
  halo,
  hot,
  lath,
  ownGlow,
  rbox,
  rock,
  solid,
  sph,
  star,
  starShape,
  swapMat,
  tint,
  tor,
  wrap,
  type Kit,
  type Prop,
} from './propKit';

/**
 * Interactive surface props whose state the scene drives every frame: power orbs, color crystals,
 * doors, pressure plates, the goal marker, star-coins, hidden stickers, bumblers, landing and jump pads.
 * `update()` never allocates; `set*()` calls early-out when nothing changed.
 */

const TAU = Math.PI * 2;
let phaseSeed = 0.7;
const nextPhase = () => (phaseSeed = (phaseSeed + 2.399) % TAU);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

// ------------------------------------------------------------------ power orb

function boltShape(): Shape {
  const s = new Shape();
  s.moveTo(-0.04, 0.17);
  s.lineTo(0.08, 0.17);
  s.lineTo(0.02, 0.04);
  s.lineTo(0.1, 0.04);
  s.lineTo(-0.06, -0.19);
  s.lineTo(-0.01, -0.03);
  s.lineTo(-0.09, -0.03);
  s.closePath();
  return s;
}

/** Power orb (radius ~0.55), origin at its center: glowing core with a bolt, glass shell, swirling rings. */
export class OrbProp implements Prop {
  readonly group: Group;
  private readonly core: Group;
  private readonly rings: Group;
  private readonly glow: Sprite;
  private readonly phase = nextPhase();

  constructor() {
    const inner = new Group();
    this.core = bake('orb:core', (k) => {
      k.glow(sph(0.25, 0.25, 0.25, 20, 14), hot('#22bfff', 1.6));
      k.glow(ext(boltShape(), 0.04, 0.012, 2), hot('#ffe066', 2.1), 0, 0, 0.25);
    });
    const shell = bake('orb:shell', (k) => k.add(M.bubble(), sph(0.37, 0.37, 0.37, 24, 16), '#ffffff'));
    this.rings = bake('orb:rings', (k) => {
      k.glow(tor(0.46, 0.022, 6, 44), hot('#bff6ff', 2.4), 0, 0, 0, 1.25, 0, 0.3);
      k.glow(tor(0.42, 0.018, 6, 40), hot('#4dd4ff', 2.4), 0, 0, 0, -0.95, 0.5, -0.4);
      k.glow(sph(0.045, 0.045, 0.045, 8, 6), hot('#ffffff', 3), 0.46, 0, 0);
      k.glow(sph(0.04, 0.04, 0.04, 8, 6), hot('#ffffff', 3), -0.3, 0.3, 0.1);
    });
    this.glow = halo('#6fdcff', 1.5, 0.5);
    inner.add(this.core, shell, this.rings, this.glow);
    this.group = wrap(inner);
  }

  update(_dt: number, time: number): void {
    const t = time + this.phase;
    this.rings.rotation.set(Math.sin(t * 0.7) * 0.4, t * 2.2, Math.sin(t * 0.9) * 0.25);
    const p = 1 + Math.sin(t * 5) * 0.05;
    this.core.scale.setScalar(p);
    this.glow.scale.setScalar(1.4 + Math.sin(t * 5) * 0.12);
  }
}

// ------------------------------------------------------------------ color crystal

/** Color-puzzle crystal (~1 wide, 1.6 tall) floating over a little base; glows in its current color. */
export class CrystalProp implements Prop {
  readonly group: Group;
  private readonly gem: Group;
  private readonly mat: MeshStandardMaterial;
  private readonly ringMat = ownGlow();
  private readonly glow: Sprite;
  private readonly col = new Color('#ffffff');
  private hex = '';
  private bump = 0;
  private solved = false;
  private readonly phase = nextPhase();

  constructor() {
    const inner = bake('crystal:base', (k) => {
      k.metal(lath([[0.48, 0], [0.48, 0.08], [0.42, 0.13], [0.3, 0.17], [0.28, 0.23], [0.36, 0.27], [0.34, 0.3], [0, 0.3]], 8), '#7a809f');
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + Math.PI / 4;
        k.metal(sph(0.05, 0.04, 0.05, 8, 6), '#dfe5f5', Math.sin(a) * 0.42, 0.1, Math.cos(a) * 0.42);
      }
    });
    const ring = bake('crystal:ring', (k) => k.glow(tor(0.33, 0.025, 6, 32), '#ffffff', 0, 0.3, 0, Math.PI / 2));
    swapMat(ring, M.glow(), this.ringMat);
    this.mat = new MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.55, flatShading: true, roughness: 0.1, metalness: 0.05, envMapIntensity: 2.6 });
    this.gem = bake('crystal:gem', (k) => {
      k.add(M.gem(), lath([[0, 0], [0.3, 0.22], [0.37, 0.58], [0.3, 1.0], [0, 1.26]], 6), '#ffffff');
      k.add(M.gem(), lath([[0, 0], [0.09, 0.08], [0.1, 0.24], [0, 0.36]], 5), '#ffffff', 0.33, 0.25, 0.08, 0, 0, -0.55);
      k.add(M.gem(), lath([[0, 0], [0.08, 0.07], [0.09, 0.2], [0, 0.3]], 5), '#ffffff', -0.31, 0.32, -0.05, 0, 0, 0.6);
    });
    swapMat(this.gem, M.gem(), this.mat);
    this.gem.position.y = 0.33;
    this.glow = halo('#ffffff', 1.7, 0.32, true);
    this.glow.position.y = 0.95;
    inner.add(ring, this.gem, this.glow);
    this.group = wrap(inner);
    this.setColor('#ff5d73');
  }

  setColor(hex: string): void {
    if (hex === this.hex) return;
    this.hex = hex;
    this.col.set(hex);
    this.mat.color.copy(this.col);
    this.mat.emissive.copy(this.col);
    (this.glow.material as SpriteMaterial).color.copy(this.col);
  }

  setBump(t: number): void {
    this.bump = clamp01(t);
  }

  setSolved(on: boolean): void {
    this.solved = on;
  }

  update(dt: number, time: number): void {
    const t = time + this.phase;
    const s = this.bump * this.bump;
    this.gem.scale.set(1 + 0.16 * s, 1 - 0.22 * s, 1 + 0.16 * s);
    this.gem.position.y = 0.33 + Math.sin(t * 1.6) * 0.025;
    this.gem.rotation.y += dt * (this.solved ? 1.4 : 0.45);
    const pulse = this.solved ? 1.05 + 0.5 * Math.sin(t * 4.5) : 0.5 + 0.08 * Math.sin(t * 1.5);
    this.mat.emissiveIntensity = pulse + 1.5 * s;
    this.ringMat.color.copy(this.col).multiplyScalar(1.5 + (this.solved ? 0.8 + 0.6 * Math.sin(t * 4.5) : 0) + 2 * s);
    const m = this.glow.material as SpriteMaterial;
    m.opacity = (this.solved ? 0.5 : 0.28) + 0.4 * s;
    this.glow.scale.setScalar(1.7 + (this.solved ? 0.25 * Math.sin(t * 4.5) : 0) + 0.5 * s);
  }
}

// ------------------------------------------------------------------ door

/** Sci-fi door (1 wide, heightTiles tall, origin bottom center): the striped panel retracts into the top. */
export class DoorProp implements Prop {
  readonly group: Group;
  private readonly panel: Group;
  private readonly light: Mesh;
  private amount = -1;

  constructor(heightTiles: number) {
    const H = Math.max(1, Math.round(heightTiles));
    const P = H - 0.28;
    const frame = bake(`door:frame:${H}`, (k) => {
      for (const sx of [-1, 1]) {
        k.metal(rbox(0.18, H, 0.62, 0.06, 2), '#9aa4c7', sx * 0.41, H / 2);
        k.glow(rbox(0.045, H - 0.55, 0.03, 0.02, 1), '#4dd4ff', sx * 0.41, (H - 0.28) / 2 + 0.02, 0.31);
      }
      k.metal(rbox(1.0, 0.3, 0.66, 0.08, 2), '#6a7090', 0, H - 0.15);
      k.paint(rbox(0.5, 0.08, 0.04, 0.03, 1), '#ffe066', 0, H - 0.2, 0.33);
      k.metal(rbox(0.92, 0.05, 0.56, 0.02, 1), '#4a4e6e', 0, 0.025);
    });
    this.panel = bake(`door:panel:${H}`, (k) => {
      const body = k.paint(rbox(0.66, P, 0.24, 0.06, 2), '#dfe5f5', 0, -P / 2);
      k.grad(body, '#8a94c0', '#f4f7ff', -P, 0);
      k.paint(rbox(0.5, P - 0.2, 0.03, 0.05, 1), '#5a6ac0', 0, -P / 2, 0.115);
      for (let y = 0.28; y < P - 0.12; y += 0.36) k.glow(rbox(0.42, 0.09, 0.03, 0.04, 1), hot('#ff6a1a', 1.8), 0, -P + y, 0.135);
      const band = Math.min(P * 0.5, 0.62);
      k.paint(rbox(0.7, 0.16, 0.28, 0.05, 1), '#ffd23a', 0, -P + band);
      k.paint(rbox(0.14, 0.12, 0.04, 0.03, 1), INK, 0, -P + band, 0.14);
    });
    this.panel.position.y = H - 0.28;
    const light = bake('door:light', (k) => k.glow(sph(0.06, 0.06, 0.03, 10, 6), '#ffffff', 0, 0, 0));
    this.light = light.children[0] as Mesh;
    light.position.set(0.32, H - 0.15, 0.34);
    const inner = new Group();
    inner.add(frame, this.panel, light);
    this.group = wrap(inner);
    this.setOpen(0);
  }

  setOpen(amount: number): void {
    const a = clamp01(amount);
    if (a === this.amount) return;
    this.amount = a;
    const s = 1 - a;
    this.panel.scale.y = Math.max(0.001, s);
    this.panel.visible = s > 0.003;
    this.light.material = glowColorMat(a > 0.5 ? '#8cff66' : '#ff5d73');
  }
}

const glowMats = new Map<string, Material>();
function glowColorMat(c: string): Material {
  let m = glowMats.get(c);
  if (!m) glowMats.set(c, (m = markShared(new MeshBasicMaterial({ color: hot(c, 2.4) }))));
  return m;
}

// ------------------------------------------------------------------ pressure plate

function hazardKit(k: Kit, w: number, h: number, y: number, z: number): void {
  k.paint(box(w, h, 0.02), '#2a2440', 0, y, z);
  const n = Math.round(w / 0.16);
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (i + 0.5) * (w / n);
    const s = new Shape();
    const hw = 0.035;
    s.moveTo(x - hw - h * 0.35, y - h / 2);
    s.lineTo(x + hw - h * 0.35, y - h / 2);
    s.lineTo(x + hw + h * 0.35, y + h / 2);
    s.lineTo(x - hw + h * 0.35, y + h / 2);
    s.closePath();
    k.paint(ext(s, 0.012, 0, 1), '#ffd23a', 0, 0, z + 0.012);
  }
}

/** Pressure plate (1 wide, ~0.25 tall). Pressed: sinks and lights up green. Heavy plates are sturdier. */
export class PlateProp implements Prop {
  readonly group: Group;
  private readonly btn: Group;
  private readonly up: Group;
  private readonly down: Group;
  private pressed = false;
  private readonly y0: number;

  constructor(heavy: boolean) {
    const base = bake(`plate:${heavy}`, (k) => {
      if (heavy) {
        k.metal(rbox(1.0, 0.14, 0.86, 0.04, 1), '#4a4e6e', 0, 0.07);
        hazardKit(k, 0.92, 0.08, 0.07, 0.43);
        for (const sx of [-1, 1]) k.metal(sph(0.035, 0.035, 0.02, 8, 6), '#dfe5f5', sx * 0.44, 0.07, 0.44);
      } else {
        k.metal(rbox(0.92, 0.1, 0.7, 0.04, 1), '#5a6080', 0, 0.05);
        k.glow(rbox(0.6, 0.025, 0.02, 0.01, 1), '#4dd4ff', 0, 0.05, 0.35);
      }
    });
    const bw = heavy ? 0.82 : 0.7;
    const bd = heavy ? 0.68 : 0.52;
    const bh = heavy ? 0.13 : 0.12;
    const btn = (on: boolean) =>
      bake(`plate:btn:${heavy}:${on}`, (k) => {
        const c = on ? '#8cff66' : heavy ? '#ff9f43' : '#ff5d73';
        if (on) k.glow(rbox(bw, bh, bd, 0.05, 2), hot(c, 1.8), 0, bh / 2);
        else k.grad(k.paint(rbox(bw, bh, bd, 0.05, 2), c, 0, bh / 2), tint(c, -0.3), tint(c, 0.15), 0, bh);
        if (heavy) {
          for (const z of [-0.18, 0, 0.18]) k.paint(rbox(bw - 0.16, 0.025, 0.06, 0.012, 1), on ? '#3a8a2a' : '#8a4a1a', 0, bh + 0.005, z);
        } else {
          k.paint(cyl(0.12, 0.12, 0.02, 20), on ? '#e6ffd8' : '#fff6e0', 0, bh + 0.002, 0);
        }
      });
    this.up = btn(false);
    this.down = btn(true);
    this.down.visible = false;
    this.btn = new Group();
    this.btn.add(this.up, this.down);
    this.y0 = heavy ? 0.12 : 0.09;
    this.btn.position.y = this.y0;
    const inner = new Group();
    inner.add(base, this.btn);
    this.group = wrap(inner);
  }

  setPressed(on: boolean): void {
    if (on === this.pressed) return;
    this.pressed = on;
    this.up.visible = !on;
    this.down.visible = on;
  }

  update(dt: number, _time: number): void {
    const target = this.y0 - (this.pressed ? 0.075 : 0);
    this.btn.position.y += (target - this.btn.position.y) * Math.min(1, dt * 18);
  }
}

// ------------------------------------------------------------------ goal marker

function sparkleKit(k: Kit, n: number, r: number, y0: number, y1: number, size: number, color: string): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const y = y0 + ((i * 0.618) % 1) * (y1 - y0);
    k.glow(ext(starShape(size, size * 0.3, 4), 0.02, 0.008, 1), hot(i % 2 ? '#ffffff' : color, 2.6), Math.sin(a) * r, y, Math.cos(a) * r, 0, a, 0);
  }
}

/** Goal marker (~1.2 wide, 1.9 tall): a pennant on a glowing pad with a star on top; sparkles once reached. */
export class GoalProp implements Prop {
  readonly group: Group;
  private readonly glowMat = ownGlow();
  private readonly cloth: Cloth;
  private readonly sparkles: Group;
  private readonly glow: Sprite;
  private reached = false;
  private readonly phase = nextPhase();

  constructor() {
    const inner = bake('goal', (k) => {
      k.metal(lath([[0.56, 0], [0.56, 0.06], [0.5, 0.11], [0.2, 0.13], [0, 0.13]], 28), '#9aa4c7');
      k.paint(cyl(0.36, 0.36, 0.015, 28), '#4c7dff', 0, 0.13);
      k.paint(cyl(0.04, 0.045, 1.58, 10), '#f4f7ff', 0, 0.92);
      k.metal(cyl(0.07, 0.07, 0.06, 12), '#ffc83d', 0, 1.7);
    });
    const glow = bake('goal:glow', (k) => {
      k.glow(tor(0.46, 0.03, 6, 36), '#ffe066', 0, 0.115, 0, Math.PI / 2);
      k.glow(star(0.19, 0.08), '#ffe066', 0, 1.88, 0);
    });
    swapMat(glow, M.glow(), this.glowMat);
    this.cloth = new Cloth(0.72, 0.5, pennantMat(), 0.045, 1.66, true);
    this.sparkles = bake('goal:sparkles', (k) => sparkleKit(k, 8, 0.55, 0.35, 1.75, 0.09, '#ffe066'));
    this.sparkles.visible = false;
    this.glow = halo('#ffe066', 1.2, 0.45, true);
    this.glow.position.y = 1.88;
    inner.add(glow, this.cloth.mesh, this.sparkles, this.glow);
    this.group = wrap(inner);
    this.cloth.update(0);
  }

  setReached(on: boolean): void {
    if (on === this.reached) return;
    this.reached = on;
    this.sparkles.visible = on;
  }

  update(_dt: number, time: number): void {
    const t = time + this.phase;
    const r = this.reached;
    this.glowMat.color.setScalar(r ? 1.25 + 0.35 * Math.sin(t * 6) : 0.85 + 0.25 * Math.sin(t * 2.4));
    this.cloth.update(time, r ? 1.4 : 1);
    this.glow.scale.setScalar(r ? 1.7 + 0.3 * Math.sin(t * 6) : 1.1 + 0.15 * Math.sin(t * 2.4));
    if (r) {
      this.sparkles.rotation.y = t * 1.3;
      this.sparkles.position.y = Math.sin(t * 2) * 0.05;
    }
  }
}

let pennant: Material | null = null;
function pennantMat(): Material {
  if (!pennant) pennant = markShared(new MeshStandardMaterial({ color: '#ff5d73', side: DoubleSide, roughness: 0.6, emissive: new Color('#ff3050'), emissiveIntensity: 0.25 }));
  return pennant;
}

// ------------------------------------------------------------------ star-coins

let coinMat: Material | null = null;
function coinMaterial(): Material {
  if (!coinMat)
    coinMat = markShared(new MeshStandardMaterial({ vertexColors: true, metalness: 0.85, roughness: 0.26, envMapIntensity: 2.4, emissive: new Color('#ffae00'), emissiveIntensity: 0.28 }));
  return coinMat;
}

const _mat = new Matrix4();
const ZERO = new Matrix4().makeScale(0, 0, 0);

/** All star-coins of a level in ONE instanced draw call, spinning with a phase each. */
export class CoinSet implements Prop {
  readonly group = new Group();
  readonly mesh: InstancedMesh;
  private readonly pos: Float32Array;
  private readonly hidden: Uint8Array;

  constructor(points: Array<{ x: number; y: number; z: number }>) {
    const n = points.length;
    const geo = bakeGeo('coin', (k) => {
      k.add(M.metal(), lath([[0, -0.035], [0.25, -0.035], [0.27, -0.052], [0.3, -0.046], [0.31, 0], [0.3, 0.046], [0.27, 0.052], [0.25, 0.035], [0, 0.035]], 28), '#ffb21a', 0, 0, 0, Math.PI / 2);
      k.add(M.metal(), star(0.17, 0.04, 0.08, 0.02), '#ffe066', 0, 0, 0.03);
      k.add(M.metal(), star(0.17, 0.04, 0.08, 0.02), '#ffe066', 0, 0, -0.03, 0, Math.PI, 0);
    });
    this.mesh = new InstancedMesh(geo, coinMaterial(), Math.max(1, n));
    this.mesh.count = n;
    this.mesh.frustumCulled = false;
    this.pos = new Float32Array(n * 3);
    this.hidden = new Uint8Array(n);
    points.forEach((p, i) => {
      this.pos[i * 3] = p.x;
      this.pos[i * 3 + 1] = p.y;
      this.pos[i * 3 + 2] = p.z;
    });
    this.group.add(this.mesh);
    this.update(0, 0);
  }

  hide(i: number): void {
    if (i < 0 || i >= this.hidden.length || this.hidden[i]) return;
    this.hidden[i] = 1;
    this.mesh.setMatrixAt(i, ZERO);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  update(_dt: number, time: number): void {
    const p = this.pos;
    for (let i = 0; i < this.hidden.length; i++) {
      if (this.hidden[i]) continue;
      const ph = i * 0.9 + p[i * 3] * 0.35;
      _mat.makeRotationY(time * 2.4 + ph);
      _mat.setPosition(p[i * 3], p[i * 3 + 1] + Math.sin(time * 2.2 + ph) * 0.04, p[i * 3 + 2]);
      this.mesh.setMatrixAt(i, _mat);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ hidden sticker

/** Hidden sticker: a big glowing pink and gold star (~0.9 across), origin at its center, bobbing & rocking. */
export class StickerProp implements Prop {
  readonly group: Group;
  private readonly inner: Group;
  private readonly glints: Group;
  private readonly glow: Sprite;
  private readonly phase = nextPhase();

  constructor() {
    this.inner = bake('sticker', (k) => {
      k.metal(star(0.47, 0.1, 0.24, 0.05), '#ffc83d', 0, 0, -0.05);
      k.add(solid('#ff7ad9', 0.3, 0.05, '#ff4fc0', 0.75), star(0.37, 0.16, 0.18, 0.06), '#ffffff', 0, 0.005, 0.02);
      k.glow(sph(0.07, 0.035, 0.02, 10, 6), hot('#ffffff', 1.6), -0.1, 0.13, 0.12, 0, 0, 0.6);
    });
    this.glints = bake('sticker:glints', (k) => sparkleKit(k, 4, 0.55, -0.3, 0.35, 0.08, '#ffe066'));
    this.glow = halo('#ff7ad9', 1.9, 0.5);
    this.inner.add(this.glow);
    const g = new Group();
    g.add(this.inner, this.glints);
    this.group = wrap(g);
  }

  update(_dt: number, time: number): void {
    const t = time + this.phase;
    this.inner.position.y = Math.sin(t * 2.2) * 0.08;
    this.inner.rotation.z = Math.sin(t * 1.7) * 0.16;
    this.inner.rotation.y = Math.sin(t * 1.1) * 0.45;
    this.glints.rotation.y = t * 0.9;
    this.glints.position.y = this.inner.position.y;
    this.glow.scale.setScalar(1.8 + Math.sin(t * 3.1) * 0.15);
  }
}

// ------------------------------------------------------------------ bumblers

/** A fluffy ball: an icosphere with lots of small soft tufts (push only depends on direction). */
function fluff(rx: number, ry: number, rz: number): ReturnType<typeof rock> {
  const g = rock(77, 1, 1, 1, 5, 0, false);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const n = Math.sin(x * 11 + 1.3) * Math.sin(y * 11 + 0.4) * Math.sin(z * 11 + 2.1);
    const s = 1 + 0.07 * n + 0.03 * Math.sin(x * 23 + y * 19 + z * 17);
    p.setXYZ(i, x * s * rx, y * s * ry, z * s * rz);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Friendly patrolling bumbler (~1.15 wide, 1.1 tall): a cute dust-bot on real worlds, a fuzzle critter on
 * Zephyra. Faces where it walks (3/4 toward the camera), squashes when bumped.
 */
export class BumblerProp implements Prop {
  readonly group: Group;
  private readonly inner = new Group();
  private readonly body: Group;
  private readonly eyes: Group;
  private readonly wheels: Group | null = null;
  private readonly antenna: Group | null = null;
  private yaw = 0.35;
  private targetYaw = 0.35;
  private vx = 0;
  private squish = 0;
  private readonly phase = nextPhase();

  constructor(
    private readonly kind: 'dustbot' | 'fuzzle',
    th: Theme,
  ) {
    this.body = new Group();
    if (kind === 'dustbot') {
      const shell = bake('dustbot', (k) => {
        const b = k.paint(sph(0.5, 0.38, 0.44, 24, 16), '#ffb347', 0, 0.54);
        k.grad(b, '#ff8a2a', '#fff3b0', 0.16, 0.92);
        k.matte(tor(0.48, 0.055, 6, 28).scale(1, 0.9, 1), '#4a4e6e', 0, 0.44, 0, Math.PI / 2);
        k.paint(new SphereGeometry(1, 16, 8, Math.PI / 2 - 0.68, 1.36, Math.PI / 2 - 0.58, 0.76).scale(0.512, 0.392, 0.452), INK, 0, 0.54);
        k.paint(cyl(0.06, 0.08, 0.06, 10), '#c9d2ee', 0.1, 0.92);
        k.paint(rbox(0.52, 0.07, 0.12, 0.03, 1), '#4c7dff', 0, 0.13, 0.36);
        k.matte(rbox(0.48, 0.06, 0.05, 0.02, 1), '#fff3b0', 0, 0.06, 0.4);
      });
      this.eyes = bake('dustbot:eye', (k) => {
        k.glow(sph(0.145, 0.155, 0.03, 18, 10), hot('#4dd4ff', 2.2));
        k.glow(sph(0.075, 0.08, 0.02, 14, 8), hot('#1a6a9a', 1), 0.01, -0.01, 0.022);
        k.glow(sph(0.035, 0.035, 0.02, 8, 6), hot('#ffffff', 2.6), -0.045, 0.05, 0.03);
      });
      this.eyes.position.set(0, 0.62, 0.448);
      this.eyes.rotation.x = -0.2;
      const wheels = bake('dustbot:wheels', (k) => {
        for (const sx of [-1, 1]) {
          k.matte(cyl(0.17, 0.17, 0.12, 16), '#3a3f5a', sx * 0.36, 0, 0, 0, 0, Math.PI / 2);
          k.matte(cyl(0.08, 0.08, 0.02, 10), '#ffc83d', sx * 0.43, 0, 0, 0, 0, Math.PI / 2);
          k.matte(rbox(0.02, 0.2, 0.05, 0.01, 1), '#ffc83d', sx * 0.44, 0, 0);
        }
      });
      wheels.position.y = 0.17;
      this.wheels = wheels;
      const ant = bake('dustbot:antenna', (k) => {
        k.glow(cyl(0.014, 0.02, 0.14, 6), new Color(0.45, 0.48, 0.6), 0, 0.07);
        k.glow(sph(0.05, 0.05, 0.05, 10, 8), hot('#8cff66', 2.4), 0, 0.16);
      });
      ant.position.set(0.1, 0.94, 0);
      this.antenna = ant;
      this.body.add(shell, this.eyes, ant);
      this.inner.add(this.body, wheels);
    } else {
      const fur = th.goo === '#ff7ad9' ? '#c9a0ff' : '#ff9ad9';
      const shell = bake(`fuzzle:${fur}`, (k) => {
        const b = k.paint(fluff(0.52, 0.46, 0.46), fur, 0, 0.56);
        k.grad(b, tint(fur, -0.35), tint(fur, 0.45), 0.12, 1.0);
        for (const sx of [-1, 1]) {
          k.paint(sph(0.15, 0.09, 0.2, 14, 8), tint(fur, -0.3), sx * 0.2, 0.07, 0.08);
          k.paint(sph(0.07, 0.045, 0.02, 10, 6), '#ff6fa8', sx * 0.3, 0.5, 0.39, 0, sx * 0.6, 0);
          k.paint(cyl(0.015, 0.02, 0.16, 6), tint(fur, -0.15), sx * 0.15, 1.02, 0, 0, 0, -sx * 0.35);
          k.glow(sph(0.05, 0.05, 0.05, 10, 8), hot('#ffe066', 2.2), sx * 0.19, 1.1, 0);
        }
        k.paint(tor(0.06, 0.016, 5, 12, Math.PI), INK, 0, 0.47, 0.455, 0, 0, Math.PI);
      });
      this.eyes = bake('fuzzle:eyes', (k) => {
        for (const sx of [-1, 1]) {
          k.paint(sph(0.13, 0.15, 0.08, 14, 10), '#ffffff', sx * 0.16, 0, 0.42);
          k.paint(sph(0.08, 0.1, 0.05, 12, 8), INK, sx * 0.15, -0.015, 0.47);
          k.glow(sph(0.028, 0.028, 0.012, 8, 6), hot('#ffffff', 1.4), sx * 0.15 - 0.03, 0.03, 0.515);
        }
      });
      this.eyes.position.y = 0.64;
      this.body.add(shell, this.eyes);
      this.inner.add(this.body);
    }
    this.inner.rotation.y = this.yaw;
    this.group = wrap(this.inner);
  }

  setMotion(vx: number, squish: number): void {
    this.vx = vx;
    this.squish = squish;
  }

  update(dt: number, time: number): void {
    if (this.vx > 0.05) this.targetYaw = 0.7;
    else if (this.vx < -0.05) this.targetYaw = -0.7;
    this.yaw += (this.targetYaw - this.yaw) * Math.min(1, dt * 7);
    this.inner.rotation.y = this.yaw;
    const s = this.squish < 0 ? 0 : this.squish > 0.3 ? 0.3 : this.squish;
    this.inner.scale.set(1 + s * 0.7, 1 - s, 1 + s * 0.7);
    const moving = Math.min(1, Math.abs(this.vx) / 1.2);
    const t = time + this.phase;
    if (this.kind === 'dustbot') {
      if (this.wheels) this.wheels.rotation.x += (Math.abs(this.vx) * dt) / 0.17;
      this.body.position.y = Math.abs(Math.sin(t * 13)) * 0.02 * moving + Math.sin(t * 2.2) * 0.008;
      this.body.rotation.x = 0.07 * moving;
      if (this.antenna) this.antenna.rotation.z = Math.sin(t * 7) * (0.08 + 0.18 * moving);
    } else {
      const hop = Math.abs(Math.sin(t * 7));
      this.body.position.y = hop * 0.1 * moving;
      this.body.scale.set(1 - (hop - 0.5) * 0.05 * moving, 1 + (hop - 0.5) * 0.1 * moving + Math.sin(t * 2.4) * 0.02, 1);
    }
    const bl = (t * 0.27) % 1;
    this.eyes.scale.y = bl < 0.035 ? 0.12 : 1;
  }
}

// ------------------------------------------------------------------ landing pad

/** Round launch/landing pad with a flat top at y ≈ 0.18, chasing rim lights and a target marking. */
export class LandingPadProp implements Prop {
  readonly group: Group;
  private readonly matA = ownGlow();
  private readonly matB = ownGlow();
  private readonly matC = ownGlow();
  private readonly col = new Color('#4dd4ff');
  private t = 0;

  constructor(radius = 1.8) {
    const r = Math.round(Math.max(0.8, radius) * 20) / 20;
    const sc = r / 1.8;
    const inner = bake(`pad:${r}`, (k) => {
      const rim = k.metal(lath([[r, 0], [r, 0.07], [r - 0.04, 0.13], [r - 0.12, 0.17], [r - 0.16, 0.175], [0, 0.175]], 48), '#9aa4c7');
      k.grad(rim, '#6a7090', '#c9d2ee', 0, 0.17);
      k.paint(cyl(r - 0.2, r - 0.2, 0.012, 48), '#3a3f5a', 0, 0.178);
      k.paint(new RingGeometry(r * 0.52, r * 0.6, 48).rotateX(-Math.PI / 2), '#ffd23a', 0, 0.186);
      k.paint(rbox(0.13 * sc, 0.012, 0.72 * sc, 0.005, 1), '#f4f7ff', -0.24 * sc, 0.186);
      k.paint(rbox(0.13 * sc, 0.012, 0.72 * sc, 0.005, 1), '#f4f7ff', 0.24 * sc, 0.186);
      k.paint(rbox(0.36 * sc, 0.012, 0.12 * sc, 0.005, 1), '#f4f7ff', 0, 0.186);
    });
    const n = Math.max(8, Math.round(r * 9)) & ~1;
    const lights = (odd: number) =>
      bake(`pad:${r}:lights${odd}`, (k) => {
        for (let i = odd; i < n; i += 2) {
          const a = (i / n) * TAU;
          k.glow(sph(0.06, 0.045, 0.035, 10, 6), '#ffffff', Math.sin(a) * (r - 0.02), 0.09, Math.cos(a) * (r - 0.02), 0, a, 0);
        }
      });
    const la = lights(0);
    const lb = lights(1);
    swapMat(la, M.glow(), this.matA);
    swapMat(lb, M.glow(), this.matB);
    const ring = bake(`pad:${r}:ring`, (k) => k.glow(new RingGeometry(r * 0.8, r * 0.84, 48).rotateX(-Math.PI / 2), '#ffffff', 0, 0.186));
    swapMat(ring, M.glow(), this.matC);
    inner.add(la, lb, ring);
    inner.scale.z = Math.min(1, 1.3 / r);
    this.group = wrap(inner);
    this.update(0, 0);
  }

  setGlow(color: string): void {
    this.col.set(color);
    this.update(0, this.t);
  }

  update(_dt: number, time: number): void {
    this.t = time;
    const a = Math.sin(time * 5);
    this.matA.color.copy(this.col).multiplyScalar(1.1 + 1.6 * (a > 0 ? a : 0));
    this.matB.color.copy(this.col).multiplyScalar(1.1 + 1.6 * (a < 0 ? -a : 0));
    this.matC.color.copy(this.col).multiplyScalar(1.3 + 0.5 * Math.sin(time * 2));
  }
}

// ------------------------------------------------------------------ jump pad

/** Spring pad sitting on top of a tile (1 wide, ~0.3 tall) with green glowing chevrons; boing() squashes it. */
export class JumpPadProp implements Prop {
  readonly group: Group;
  private readonly spring: Group;
  private readonly top: Group;
  private readonly holo: Group;
  private readonly holoMat: MeshBasicMaterial;
  private t = 9;
  private readonly phase = nextPhase();

  constructor() {
    const base = bake('jump:base', (k) => {
      k.metal(rbox(0.94, 0.08, 0.74, 0.03, 1), '#4a4e6e', 0, 0.04);
      for (const sx of [-1, 1]) k.metal(rbox(0.1, 0.1, 0.5, 0.03, 1), '#7a809f', sx * 0.36, 0.08);
    });
    this.spring = bake('jump:spring', (k) => {
      for (let i = 0; i < 3; i++) k.metal(tor(0.2, 0.026, 6, 22), '#dfe5f5', 0, 0.02 + i * 0.035, 0, Math.PI / 2, 0, 0.12);
    });
    this.spring.position.y = 0.07;
    this.top = bake('jump:top', (k) => {
      const p = k.paint(rbox(0.9, 0.13, 0.7, 0.05, 2), '#2a3550', 0, 0.065);
      k.grad(p, '#1e2740', '#3a4870', 0, 0.13);
      for (const x of [-0.26, 0, 0.26]) k.glow(ext(chevronShape(0.2, 0.09, 0.035), 0.02, 0.006, 1), '#8cff66', x, 0.065, 0.352);
      k.glow(rbox(0.72, 0.012, 0.05, 0.006, 1), '#8cff66', 0, 0.131, 0.24);
      k.glow(rbox(0.72, 0.012, 0.05, 0.006, 1), '#8cff66', 0, 0.131, -0.24);
    });
    this.top.position.y = 0.17;
    this.holoMat = new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, blending: AdditiveBlending, depthWrite: false });
    this.holo = bake('jump:holo', (k) => {
      k.glow(ext(chevronShape(0.42, 0.16, 0.06), 0.01, 0, 1), hot('#8cff66', 1.6), 0, 0, 0);
      k.glow(ext(chevronShape(0.42, 0.16, 0.06), 0.01, 0, 1), hot('#8cff66', 1.6), 0, 0.15, 0);
    });
    swapMat(this.holo, M.glow(), this.holoMat);
    this.holo.position.set(0, 0.5, -0.15);
    const inner = new Group();
    inner.add(base, this.spring, this.top, this.holo);
    this.group = wrap(inner);
  }

  boing(): void {
    this.t = 0;
  }

  update(dt: number, time: number): void {
    this.t += dt;
    const t = this.t;
    const s = t < 0.8 ? -Math.sin(t * 20) * Math.exp(-t * 5.5) : 0;
    const k = Math.max(0.35, 1 + s * 1.5);
    this.spring.scale.y = k;
    this.top.position.y = 0.07 + 0.1 * k;
    this.top.scale.set(1 - s * 0.1, 1 + s * 0.2, 1 - s * 0.1);
    const c = (time * 0.9 + this.phase) % 1;
    this.holo.position.y = 0.42 + c * 0.3;
    this.holoMat.opacity = Math.sin(c * Math.PI) * (t < 0.4 ? 0.9 : 0.45);
  }
}

