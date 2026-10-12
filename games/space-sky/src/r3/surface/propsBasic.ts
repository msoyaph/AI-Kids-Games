import {
  CanvasTexture,
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  SRGBColorSpace,
  type Material,
} from 'three';
import type { Theme } from '../../data/themes';
import { ink, softStar } from '../../gfx/canvas';
import { drawGlyph, type GlyphId } from '../../gfx/art/glyphs';
import { hashString } from '../../core/rng';
import { markShared } from '../dispose';
import {
  M,
  bake,
  cyl,
  gemGlowMat,
  halo,
  hot,
  lath,
  ownGlow,
  prism,
  rbox,
  rngFor,
  rock,
  sph,
  star,
  swapMat,
  tint,
  tor,
  wrap,
  type Kit,
  type Prop,
} from './propKit';

/**
 * Simple surface props: lamps, flags, crates, signs, hint panels, boulders, plants, geyser vents,
 * mission samples and special item tokens. Origins at the bottom center unless noted, facing +z.
 */

const TAU = Math.PI * 2;
let phaseSeed = 0;
const nextPhase = () => (phaseSeed = (phaseSeed + 2.399) % TAU);

/** Is this a Zephyra world (magic plants allowed)? */
export const isMagic = (th: Theme) => th.bumbler === 'fuzzle';

// ------------------------------------------------------------------ lamp

export function lampKit(k: Kit): void {
  k.metal(lath([[0.36, 0], [0.36, 0.07], [0.3, 0.12], [0.14, 0.2], [0.09, 0.32], [0, 0.32]], 20), '#5a6080');
  k.metal(cyl(0.055, 0.07, 1.56, 12), '#c9d2ee', 0, 1.1);
  k.paint(tor(0.075, 0.04, 6, 16), '#4c7dff', 0, 0.98, 0, Math.PI / 2);
  k.metal(cyl(0.09, 0.06, 0.1, 12), '#5a6080', 0, 1.88);
  k.metal(lath([[0, 2.14], [0.08, 2.14], [0.22, 2.13], [0.3, 2.11], [0.34, 2.15], [0.28, 2.24], [0.13, 2.31], [0, 2.32]], 20), '#5a6080');
  k.glow(sph(0.2, 0.18, 0.2, 16, 10), hot('#fff1b8', 3), 0, 2.0);
  k.glow(tor(0.22, 0.03, 6, 24), '#4dd4ff', 0, 0.08, 0, Math.PI / 2);
}

export function makeLamp(): Prop {
  const inner = bake('lamp', lampKit);
  const h = halo('#ffd98a', 1.8, 0.4);
  h.position.y = 2.0;
  inner.add(h);
  return { group: wrap(inner) };
}

// ------------------------------------------------------------------ flag

const flagMats = new Map<string, Material>();
function flagMaterial(color: string): Material {
  let m = flagMats.get(color);
  if (!m) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 84;
    const g = c.getContext('2d')!;
    g.fillStyle = color;
    g.fillRect(0, 0, 128, 84);
    g.fillStyle = 'rgba(255,255,255,0.22)';
    g.fillRect(0, 0, 128, 12);
    g.fillStyle = 'rgba(20,12,60,0.18)';
    g.fillRect(0, 70, 128, 14);
    ink(g, softStar(46, 42, 5, 25, 11), '#ffe066', 4);
    const tex = markShared(new CanvasTexture(c));
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    m = markShared(new MeshStandardMaterial({ map: tex, side: DoubleSide, roughness: 0.75, envMapIntensity: 0.8 }));
    flagMats.set(color, m);
  }
  return m;
}

function poleKit(k: Kit, h: number): void {
  k.metal(lath([[0.24, 0], [0.24, 0.06], [0.16, 0.1], [0.07, 0.16], [0, 0.16]], 16), '#5a6080');
  k.paint(cyl(0.04, 0.045, h, 10), '#f4f7ff', 0, h / 2);
  k.metal(sph(0.075, 0.075, 0.075, 12, 8), '#ffc83d', 0, h + 0.05);
}

/** A cloth that waves: a segmented plane whose vertices move every frame (no allocation). */
export class Cloth {
  readonly mesh: Mesh;
  private readonly base: Float32Array;
  private readonly x0: number;
  private readonly w: number;
  private readonly phase = nextPhase();

  constructor(w: number, h: number, m: Material, x0: number, yTop: number, pennant = false) {
    const g = new PlaneGeometry(w, h, 10, 3);
    g.translate(x0 + w / 2, yTop - h / 2, 0);
    const p = g.attributes.position;
    if (pennant) {
      // Taper into a triangle toward the tip.
      for (let i = 0; i < p.count; i++) {
        const u = (p.getX(i) - x0) / w;
        p.setY(i, yTop - h / 2 + (p.getY(i) - (yTop - h / 2)) * (1 - u * 0.92));
      }
    }
    this.base = new Float32Array(p.array as Float32Array);
    this.mesh = new Mesh(g, m);
    this.mesh.castShadow = true;
    this.x0 = x0;
    this.w = w;
  }

  update(time: number, strength = 1): void {
    const g = this.mesh.geometry;
    const p = g.attributes.position;
    const n = g.attributes.normal;
    const b = this.base;
    const t = time * 3.4 + this.phase;
    for (let i = 0; i < p.count; i++) {
      const x = b[i * 3];
      const u = (x - this.x0) / this.w;
      const a = 0.085 * strength * u;
      const ph = t - u * 5.2 + b[i * 3 + 1] * 1.5;
      const s = Math.sin(ph);
      p.setXYZ(i, x - u * u * 0.03, b[i * 3 + 1] - u * u * 0.05 * (1 + s * 0.4), b[i * 3 + 2] + s * a);
      const dz = (0.085 * strength * s - a * Math.cos(ph) * 5.2) / this.w;
      const l = Math.sqrt(dz * dz + 1);
      n.setXYZ(i, -dz / l, 0, 1 / l);
    }
    p.needsUpdate = true;
    n.needsUpdate = true;
  }
}

class FlagProp implements Prop {
  readonly group: Group;
  private readonly cloth: Cloth;

  constructor(color: string) {
    const inner = bake('flagpole', (k) => poleKit(k, 2.22));
    this.cloth = new Cloth(0.92, 0.6, flagMaterial(color), 0.045, 2.2);
    inner.add(this.cloth.mesh);
    this.group = wrap(inner);
    this.cloth.update(0);
  }

  update(_dt: number, time: number): void {
    this.cloth.update(time);
  }
}

export function makeFlag(color = '#4c7dff'): Prop {
  return new FlagProp(color);
}

// ------------------------------------------------------------------ crate

/** Friendly cargo crate, 1 × 1 × 0.9, bottom center at (ox, oy), scaled by s. */
export function crateKit(k: Kit, s = 1, ox = 0, oy = 0, rz = 0): void {
  const body = k.paint(rbox(0.96 * s, 0.96 * s, 0.86 * s, 0.09 * s, 2), '#ff9f43', ox, oy + 0.48 * s, 0, 0, 0, rz);
  k.grad(body, '#e9782a', '#ffb560', oy, oy + s);
  k.paint(rbox(0.66 * s, 0.6 * s, 0.06 * s, 0.05 * s, 1), '#ffd25a', ox, oy + 0.46 * s, 0.43 * s, 0, 0, rz);
  k.paint(star(0.17 * s, 0.05 * s), '#ff7a3a', ox, oy + 0.42 * s, 0.47 * s, 0, 0, rz);
  k.glow(rbox(0.5 * s, 0.07 * s, 0.03 * s, 0.03 * s, 1), '#4dd4ff', ox, oy + 0.7 * s, 0.465 * s, 0, 0, rz);
  const c = 0.26 * s;
  for (const sx of [-1, 1])
    for (const sy of [0, 1])
      for (const sz of [-1, 1])
        k.metal(rbox(c, c, c, 0.05 * s, 1), '#dfe5f5', ox + sx * 0.37 * s, oy + (sy ? 0.85 : 0.11) * s, sz * 0.33 * s, 0, 0, rz);
}

export function makeCrate(): Prop {
  return { group: wrap(bake('crate', (k) => crateKit(k))) };
}

// ------------------------------------------------------------------ sign and hint panel

export function makeSign(): Prop {
  const inner = bake('sign', (k) => {
    k.matte(rbox(0.14, 1.0, 0.14, 0.04, 1), '#9a6238', 0, 0.5);
    k.matte(rbox(1.2, 0.78, 0.12, 0.08, 2), '#b5764a', 0, 1.1);
    k.paint(rbox(1.06, 0.64, 0.06, 0.06, 1), '#fff6e0', 0, 1.1, 0.05);
    k.paint(cyl(0.25, 0.25, 0.04, 24), '#4c7dff', 0, 1.1, 0.09, Math.PI / 2);
    k.glow(sph(0.055, 0.055, 0.03, 10, 6), hot('#ffffff', 1.5), 0, 1.22, 0.115);
    k.glow(rbox(0.08, 0.2, 0.03, 0.03, 1), hot('#ffffff', 1.5), 0, 1.04, 0.115);
    for (const x of [-0.45, 0.45]) k.metal(sph(0.035, 0.035, 0.02, 8, 6), '#dfe5f5', x, 1.33, 0.08);
  });
  return { group: wrap(inner) };
}

export function makePanel(colors: string[]): Prop {
  const n = Math.max(1, colors.length);
  const w = 0.6 + 0.6 * n;
  const inner = bake(`panel:${colors.join(',')}`, (k) => {
    const posts = n > 2 ? [-w / 2 + 0.3, w / 2 - 0.3] : [0];
    for (const x of posts) k.metal(rbox(0.14, 1.1, 0.14, 0.04, 1), '#7a809f', x, 0.55);
    k.metal(rbox(w + 0.08, 0.8, 0.12, 0.08, 2), '#c9d2ee', 0, 1.38);
    k.paint(rbox(w - 0.06, 0.66, 0.06, 0.06, 1), '#2b1d78', 0, 1.38, 0.05);
    colors.forEach((c, i) => {
      const x = (i - (n - 1) / 2) * 0.6;
      k.glow(cyl(0.21, 0.21, 0.02, 20), hot(c, 1.6), x, 1.38, 0.085, Math.PI / 2);
      const gem = new OctahedronGeometry(0.17, 0).scale(1, 1.25, 0.6);
      k.add(gemGlowMat(0.35), gem, tint(c, 0.15), x, 1.38, 0.15);
      k.metal(tor(0.22, 0.025, 6, 20), '#c9d2ee', x, 1.38, 0.09);
    });
  });
  return { group: wrap(inner) };
}

// ------------------------------------------------------------------ boulder

export function makeBoulder(th: Theme, seed: number): Prop {
  const v = (seed >>> 0) % 4;
  const inner = bake(`boulder:${th.id}:${v}`, (k) => {
    const s = 31 + v * 7;
    const style = th.rockStyle;
    const main = rock(s, 0.66, 0.74, 0.52, style === 'ice' || style === 'crystal' ? 1 : 4, 0.14, true, 0, style === 'ice' || style === 'crystal' ? 0 : 7);
    const small = rock(s + 3, 0.3, 0.28, 0.28, style === 'ice' || style === 'crystal' ? 1 : 2, 0.16, true, 0, 4);
    const pebble = rock(s + 5, 0.14, 0.1, 0.12, 0, 0.25);
    const y = 0.74 * 0.5 - 0.04;
    const mx = -0.1;
    const sx = 0.6;
    if (style === 'ice') {
      const a = k.add(M.ice(), main, th.rock, mx, y);
      k.grad(a, tint(th.rock, -0.25), '#ffffff', 0, 1.1);
      k.grad(k.add(M.ice(), small, th.rock, sx, 0.12), tint(th.rock, -0.2), '#ffffff', 0, 0.4);
      k.matte(pebble, '#f4f7ff', -0.74, 0.04);
    } else if (style === 'crystal') {
      const gm = gemGlowMat(0.3);
      k.grad(k.add(gm, main, th.rock, mx, y), tint(th.rock, -0.45), tint(th.rock, 0.2), 0, 1.1);
      k.grad(k.add(gm, small, th.rock, sx, 0.12), tint(th.rock, -0.4), tint(th.rock, 0.2), 0, 0.4);
      const sh = gemGlowMat(0.9);
      k.add(sh, prism(0.1, 0.55, 6, 0.4), '#ffffff', 0.25, 0.75, 0.15, 0.3, 0, -0.5);
      k.add(sh, prism(0.08, 0.38, 6, 0.4), tint(th.rock, 0.5), -0.48, 0.62, 0.12, 0.2, 0, 0.6);
    } else {
      const grassy = th.surfaceStyle === 'grass' || th.surfaceStyle === 'moss';
      const base = grassy ? '#9a948a' : style === 'metal' ? th.ground : th.rock;
      const top = style === 'metal' && !grassy ? new Color(th.surface).lerp(new Color(th.ground), 0.45) : tint(base, 0.2);
      k.grad(k.matte(main, base, mx, y), tint(base, -0.45), top, 0, 1.15);
      k.cavity(main, mx, y, 0, 0.66, 0.74, 0.52, 3);
      k.grad(k.matte(small, base, sx, 0.12), tint(base, -0.4), top, 0, 0.42);
      k.cavity(small, sx, 0.12, 0, 0.3, 0.28, 0.28, 3);
      k.matte(pebble, tint(base, -0.1), -0.74, 0.04);
    }
  });
  const r = rngFor(seed, 'boulder');
  inner.rotation.y = r.range(-0.35, 0.35);
  inner.scale.setScalar(r.range(0.9, 1.06));
  if (r.chance(0.5)) inner.scale.x *= -1;
  return { group: wrap(inner) };
}

// ------------------------------------------------------------------ plants

class SwayProp implements Prop {
  readonly group: Group;
  private readonly phase = nextPhase();

  constructor(
    private readonly inner: Group,
    private readonly sway: number,
    private readonly glowMat: MeshStandardMaterial | MeshBasicMaterial | null = null,
    private readonly blink: Group | null = null,
  ) {
    this.group = wrap(inner);
  }

  update(_dt: number, time: number): void {
    const t = time + this.phase;
    if (this.sway) {
      this.inner.rotation.z = Math.sin(t * 0.9) * this.sway;
      this.inner.rotation.x = Math.sin(t * 0.7 + 1) * this.sway * 0.4;
    }
    const m = this.glowMat;
    if (m) {
      const p = 0.82 + Math.sin(t * 1.8) * 0.18;
      if ((m as MeshStandardMaterial).isMeshStandardMaterial) (m as MeshStandardMaterial).emissiveIntensity = 0.55 * p + 0.15;
      else m.color.setScalar(p);
    }
    if (this.blink) this.blink.visible = Math.sin(t * 2.6) > -0.2;
  }
}

function plantTree(th: Theme, v: number): Prop {
  const magic = isMagic(th);
  if (!magic) {
    const inner = bake(`tree:${v}`, (k) => {
      const trunk = k.matte(lath([[0.2, 0], [0.13, 0.12], [0.1, 0.5], [0.085, 1.0], [0.04, 1.4], [0, 1.4]], 10), '#8a5a3a');
      k.grad(trunk, '#6a4028', '#9a6a42', 0, 1.2);
      k.matte(cyl(0.03, 0.05, 0.42, 6), '#8a5a3a', 0.17, 1.02, 0, 0, 0, -0.85);
      const puffs: Array<[number, number, number, number, number]> = [
        [0, 1.5, 0, 0.6, 0.52],
        [-0.42, 1.24, 0.1, 0.42, 0.38],
        [0.46, 1.3, 0.06, 0.44, 0.4],
        [0.06, 1.92, -0.04, 0.42, 0.36],
      ];
      puffs.forEach(([x, y, z, r, ry], i) => {
        const g = k.paint(rock(100 + v * 10 + i, r, ry, r * 0.8, 2, 0.12, false), '#4cbf45', x, y, z);
        k.grad(g, '#2a8a3a', i === 3 ? '#a8f070' : '#7ee05a', y - ry, y + ry);
        k.cavity(g, x, y, z, r, ry, r * 0.8, 2);
      });
      const apples: Array<[number, number, number]> = [[-0.3, 1.5, 0.42], [0.32, 1.22, 0.4], [0.14, 1.72, 0.42]];
      for (const [x, y, z] of apples) k.paint(sph(0.07, 0.07, 0.07, 10, 8), '#ff5d73', x, y, z);
    });
    return new SwayProp(inner, 0.012);
  }
  const fruit = ownGlow();
  const inner = bake(`ztree:${v}`, (k) => {
    const trunk = k.paint(lath([[0.18, 0], [0.12, 0.1], [0.08, 0.5], [0.1, 0.9], [0.07, 1.3], [0, 1.35]], 10), '#9b6bff');
    k.grad(trunk, '#6b3fd4', '#c48aff', 0, 1.3);
    const puffs: Array<[number, number, number, number, number, string]> = [
      [0, 1.55, 0, 0.58, 0.48, '#2de0c7'],
      [-0.44, 1.3, 0.08, 0.4, 0.34, '#ff9ad9'],
      [0.44, 1.36, 0.04, 0.4, 0.34, '#c89bff'],
      [0.04, 1.94, -0.02, 0.36, 0.3, '#ff9ad9'],
    ];
    puffs.forEach(([x, y, z, r, ry, c], i) => {
      const g = k.paint(rock(140 + v * 10 + i, r, ry, r * 0.8, 2, 0.12, false), c, x, y, z);
      k.grad(g, tint(c, -0.35), tint(c, 0.35), y - ry, y + ry);
      k.cavity(g, x, y, z, r, ry, r * 0.8, 2);
    });
  });
  const lights = bake(`ztree:${v}:fruit`, (k) => {
    const pts: Array<[number, number, number]> = [[-0.28, 1.42, 0.42], [0.3, 1.62, 0.43], [0.0, 1.2, 0.36], [-0.5, 1.2, 0.36], [0.5, 1.28, 0.34], [0.12, 1.9, 0.3]];
    for (const [x, y, z] of pts) k.glow(sph(0.07, 0.07, 0.07, 10, 8), hot('#ffe066', 2.4), x, y, z);
  });
  swapMat(lights, M.glow(), fruit);
  inner.add(lights);
  return new SwayProp(inner, 0.03, fruit);
}

function plantCrystal(th: Theme, v: number, magic: boolean): Prop {
  const mat = gemGlowMat(0.6);
  const own = magic ? gemGlowMat(0.6, true) : null;
  const inner = bake(`crystal:${th.id}:${v}`, (k) => {
    const base = k.matte(rock(200 + v, 0.5, 0.2, 0.38, 1, 0.2), th.ground, 0, 0.06);
    k.grad(base, tint(th.ground, -0.3), tint(th.ground, 0.15), 0, 0.2);
    const parts: Array<[number, number, number, number, number, number, string]> = [
      [0, 0.02, 0, 0.27, 1.9, 0.06, '#c89bff'],
      [-0.34, 0.02, 0.06, 0.19, 1.2, 0.45, '#ff9ad9'],
      [0.36, 0.02, 0.04, 0.17, 1.0, -0.5, '#9bd8ff'],
      [0.14, 0.02, 0.24, 0.12, 0.62, -0.25, '#ff9ad9'],
      [-0.16, 0.02, -0.2, 0.13, 0.75, 0.2, '#c89bff'],
    ];
    parts.forEach(([x, y, z, r, h, rz, c], i) => {
      const col = i === 0 && th.rockStyle === 'crystal' ? th.rock : c;
      const g = k.add(mat, prism(r, h, 6, 0.3), col, x, y, z, i === 3 ? 0.3 : 0, i * 0.4 + v, rz);
      k.grad(g, tint(col, -0.45), tint(col, 0.45), 0, h * 0.9);
    });
  });
  if (own) swapMat(inner, mat, own);
  return new SwayProp(inner, 0, own);
}

function plantIcicle(v: number): Prop {
  const inner = bake(`icicle:${v}`, (k) => {
    k.grad(k.matte(rock(300 + v, 0.55, 0.18, 0.36, 1, 0.2), '#f4f7ff', 0, 0.04), '#c9d8f0', '#ffffff', 0, 0.2);
    const parts: Array<[number, number, number, number, number]> = [
      [-0.08, 0.26, 1.8, 0.04, 0],
      [-0.42, 0.18, 1.1, 0.32, 0.1],
      [0.36, 0.17, 0.9, -0.36, -0.12],
      [0.12, 0.12, 0.6, -0.15, 0.3],
    ];
    parts.forEach(([x, r, h, rz, rx], i) => {
      const g = k.add(M.ice(), prism(r, h, 6, 0.62), '#bff6ff', x, 0, i === 3 ? 0.22 : 0, rx, i * 0.5 + v, rz);
      k.grad(g, '#5fb4e8', '#ffffff', 0, h * 0.9);
    });
  });
  return { group: wrap(inner) };
}

function plantMushroom(v: number, magic: boolean): Prop {
  const spots = magic ? ownGlow() : null;
  const inner = bake(`mushroom:${v}`, (k) => {
    mushroomKit(k, -0.12, 1, '#ff7ad9', 0);
    mushroomKit(k, 0.5, 0.5, '#2de0c7', 0.22);
    mushroomSpots(k, -0.12, 1, 0);
    mushroomSpots(k, 0.5, 0.5, 0.22);
  });
  if (spots) swapMat(inner, M.glow(), spots);
  return new SwayProp(inner, magic ? 0.02 : 0, spots);
}

export function mushroomKit(k: Kit, x: number, s: number, cap: string, z: number): void {
  const stem = k.paint(lath([[0.17 * s, 0], [0.14 * s, 0.1 * s], [0.12 * s, 0.6 * s], [0.16 * s, 0.95 * s], [0, 1.0 * s]], 12), '#fff6e0', x, 0, z);
  k.grad(stem, '#e0c9a8', '#fffaf0', 0, s);
  const h = 1.42 * s;
  const capG = k.paint(
    lath([[0, h - 0.36 * s], [0.4 * s, h - 0.4 * s], [0.66 * s, h - 0.44 * s], [0.7 * s, h - 0.34 * s], [0.58 * s, h - 0.15 * s], [0.32 * s, h - 0.03 * s], [0, h]], 20),
    cap,
    x,
    0,
    z,
  );
  k.grad(capG, tint(cap, -0.4), tint(cap, 0.2), h - 0.44 * s, h);
}

/** Cap top profile (radius → drop below the top) used to sit spots on the cap. */
const CAP: Array<[number, number]> = [[0, 0], [0.32, -0.03], [0.58, -0.15], [0.7, -0.34]];
function capDrop(r: number): [number, number] {
  for (let i = 1; i < CAP.length; i++) {
    const [r0, y0] = CAP[i - 1];
    const [r1, y1] = CAP[i];
    if (r <= r1 || i === CAP.length - 1) {
      const m = (y1 - y0) / (r1 - r0);
      return [y0 + (r - r0) * m, m];
    }
  }
  return [0, 0];
}

export function mushroomSpots(k: Kit, x: number, s: number, z: number): void {
  const h = 1.42 * s;
  const spots: Array<[number, number]> = [[-0.3, 0.42], [0.26, 0.4], [0.02, 0.22], [0.5, 0.18], [-0.52, 0.16], [-0.1, -0.1]];
  for (const [sx, sz] of spots) {
    const r = Math.hypot(sx, sz);
    const [dy, slope] = capDrop(r);
    const nx = (-slope * sx) / (r || 1);
    const nz = (-slope * sz) / (r || 1);
    k.glow(sph(0.08 * s, 0.035 * s, 0.08 * s, 10, 6), hot('#fff6e0', 1.7), x + sx * s, h + dy * s + 0.005, z + sz * s, Math.atan2(nz, 1), 0, -Math.atan2(nx, 1));
  }
}

function plantAntenna(v: number): Prop {
  const inner = bake(`antennaPlant:${v}`, (k) => {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + 0.5;
      k.metal(cyl(0.025, 0.03, 0.62, 6), '#7a809f', Math.sin(a) * 0.2, 0.28, Math.cos(a) * 0.2, Math.cos(a) * 0.45, 0, -Math.sin(a) * 0.45);
    }
    k.metal(cyl(0.035, 0.045, 1.7, 8), '#c9d2ee', 0, 1.25);
    k.paint(rbox(0.36, 0.26, 0.26, 0.05, 1), '#f4f7ff', 0, 0.62, 0.02);
    k.glow(sph(0.035, 0.035, 0.02, 8, 6), '#8cff66', 0.09, 0.66, 0.15);
    k.paint(rbox(0.6, 0.05, 0.05, 0.02, 1), '#ff9f43', 0, 1.62);
    k.paint(lath([[0, -0.04], [0.16, -0.02], [0.3, 0.06], [0.32, 0.09], [0.22, 0.05], [0, 0]], 16), '#f4f7ff', 0.16, 1.32, 0.12, 0.7, 0, -0.6);
  });
  const tip = bake('antennaPlant:tip', (k) => k.glow(sph(0.07, 0.07, 0.07, 12, 8), hot('#ff5d73', 2.6), 0, 2.13));
  inner.add(tip);
  return new SwayProp(inner, 0, null, tip);
}

function plantSpire(th: Theme, v: number): Prop {
  const inner = bake(`spire:${th.id}:${v}`, (k) => {
    const base = th.rockStyle === 'metal' ? th.ground : th.rock;
    const top = tint(base, 0.25);
    const bottom = tint(base, -0.35);
    const parts: Array<[number, number, number, number, number]> = [
      [0, 0.42, 1.0, 0, 0],
      [0.46, 0.3, 0.62, 0.05, -0.1],
      [-0.44, 0.26, 0.45, -0.02, 0.12],
    ];
    parts.forEach(([x, r, ry, z, rz], i) => {
      const g = k.add(M.rock(), rock(400 + v * 5 + i, r, ry, r * 0.9, 1, 0.18, true, 0.62), base, x, ry * 0.52, z, 0, 0, rz);
      k.grad(g, bottom, top, 0, ry * 1.9);
    });
  });
  return { group: wrap(inner) };
}

/** Decoration for 'T' tiles: depends on th.plant (and glows/sways on Zephyra worlds). */
export function makePlant(th: Theme, seed: number): Prop {
  const v = (seed >>> 0) % 3;
  let p: Prop;
  switch (th.plant) {
    case 'tree':
      p = plantTree(th, v);
      break;
    case 'crystal':
      p = plantCrystal(th, v, isMagic(th));
      break;
    case 'icicle':
      p = plantIcicle(v);
      break;
    case 'mushroom':
      p = plantMushroom(v, isMagic(th));
      break;
    case 'antenna':
      p = plantAntenna(v);
      break;
    default:
      p = plantSpire(th, v);
  }
  const r = rngFor(seed, 'plant');
  const inner = p.group.children[0];
  inner.scale.setScalar(r.range(0.88, 1.08));
  if (th.plant !== 'antenna' && r.chance(0.5)) inner.scale.x *= -1;
  return p;
}

// ------------------------------------------------------------------ geyser vent

export function makeGeyserVent(th: Theme): Prop {
  const icy = th.rockStyle === 'ice' || th.surfaceStyle === 'ice' || th.surfaceStyle === 'snow';
  const inner = bake(`vent:${th.id}`, (k) => {
    const rim = k.matte(lath([[0.5, 0], [0.47, 0.07], [0.38, 0.2], [0.3, 0.26], [0.24, 0.22], [0.2, 0.1], [0.18, 0.06]], 18), th.ground);
    k.grad(rim, tint(th.ground, -0.25), new Color(th.surface).lerp(new Color(th.ground), 0.4), 0, 0.26);
    k.matte(cyl(0.2, 0.2, 0.02, 16), '#1a1238', 0, 0.07);
    k.glow(tor(0.19, 0.025, 6, 20), hot(icy ? '#bff6ff' : '#ffb38a', 1.8), 0, 0.1, 0, Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + 0.4;
      k.matte(rock(500 + i, 0.09, 0.07, 0.08, 0, 0.25), tint(th.ground, -0.1), Math.cos(a) * 0.48, 0.03, Math.sin(a) * 0.3);
    }
  });
  inner.scale.z = 0.8;
  return { group: wrap(inner) };
}

// ------------------------------------------------------------------ samples and item tokens

class Floater implements Prop {
  readonly group: Group;
  private readonly phase = nextPhase();

  constructor(
    private readonly inner: Group,
    private readonly bob: number,
    private readonly spin: number,
    /** Swing back and forth (radians) instead of spinning all the way round. */
    private readonly swing = 0,
  ) {
    this.group = wrap(inner);
  }

  update(_dt: number, time: number): void {
    const t = time + this.phase;
    this.inner.position.y = Math.sin(t * 2.1) * this.bob;
    this.inner.rotation.y = this.swing ? Math.sin(t * this.spin) * this.swing : t * this.spin;
  }
}

/** Mission rock sample: chunky faceted rock with a soft glow, origin at its center. */
export function makeSample(color: string): Prop {
  const inner = bake(`sample:${color}`, (k) => {
    const g = k.add(M.rock(), rock(hashString(color) % 997, 0.27, 0.23, 0.24, 1, 0.24, false), color);
    k.grad(g, tint(color, -0.45), tint(color, 0.3), -0.22, 0.24);
    k.glow(new OctahedronGeometry(0.05, 0).scale(1, 1.6, 0.5), hot('#ffffff', 2.4), 0.12, 0.2, 0.18, 0, 0, 0.3);
  });
  inner.add(halo(color, 1.1, 0.38));
  return new Floater(inner, 0.06, 0.6);
}

function tokenTexture(glyph: GlyphId, color: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const col = new Color(color);
  const light = col.r * 0.2126 + col.g * 0.7152 + col.b * 0.0722 > 0.6;
  const grad = g.createRadialGradient(54, 50, 6, 64, 64, 64);
  if (light) {
    grad.addColorStop(0, '#6b8dff');
    grad.addColorStop(1, '#2a3f9e');
  } else {
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#e6e9fa');
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  drawGlyph(g, glyph, 64, 66, 44, color);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A special mission item: a floating glowing token showing its glyph, origin at its center. */
export function makeItemToken(glyph: GlyphId, color: string): Prop {
  const inner = bake(`token:${color}`, (k) => {
    k.paint(lath([[0, -0.07], [0.3, -0.07], [0.35, -0.035], [0.35, 0.035], [0.3, 0.07], [0, 0.07]], 28), tint(color, -0.1), 0, 0, 0, Math.PI / 2);
    k.metal(tor(0.3, 0.025, 6, 32), '#ffc83d', 0, 0, 0.065);
    k.metal(tor(0.3, 0.025, 6, 32), '#ffc83d', 0, 0, -0.065);
  });
  const tex = tokenTexture(glyph, color);
  const face = new MeshBasicMaterial({ map: tex, color: new Color(1.15, 1.15, 1.15) });
  const disc = new CircleGeometry(0.28, 32);
  const front = new Mesh(disc, face);
  front.position.z = 0.072;
  const back = new Mesh(disc, face);
  back.position.z = -0.072;
  back.rotation.y = Math.PI;
  inner.add(front, back, halo(color, 1.35, 0.42));
  return new Floater(inner, 0.07, 1.1, 0.75);
}

