import {
  BufferAttribute,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Matrix4,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Material,
  type Object3D,
  type ShaderMaterial,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PART_BY_ID } from '../../data/parts';
import type { PaintColors, PartSlot, RocketLoadout } from '../../data/types';
import {
  bodyProfile,
  bodyShape,
  cargoPlacement,
  enginePlacement,
  finPlacement,
  noseShape,
  podAngles,
  radiusAt,
  rocketExtent,
  tankPlacement,
  type BodyShape,
} from '../../systems/rocketFit';
import { disposeObject, markShared } from '../dispose';
import { Flame } from '../fx/flame';
import { crystalMat, fabricMat, glassMat, glowMat, metalMat, paintMat, paintTexture } from './rocketMaterials';

const styleOf = (id: string, fallback: string) => PART_BY_ID[id]?.style ?? fallback;
const DEFAULT_PAINT: PaintColors = { main: '#f4f7ff', accent: '#ff5d73', trim: '#4c7dff', window: '#4dd4ff' };

// ------------------------------------------------------------------ shared geometry

const geos = new Map<string, BufferGeometry>();
function geo(key: string, make: () => BufferGeometry): BufferGeometry {
  let g = geos.get(key);
  if (!g) {
    g = markShared(make());
    geos.set(key, g);
  }
  return g;
}

function lathe(points: Array<[number, number]>, segments = 40, phiStart = Math.PI): LatheGeometry {
  return new LatheGeometry(points.map(([r, y]) => new Vector2(Math.max(0.004, r), y)), segments, phiStart, Math.PI * 2);
}

function starShape(outer: number, inner: number, points = 5): Shape {
  const s = new Shape();
  for (let i = 0; i <= points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? inner : outer;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  return s;
}

function roundedRect(w: number, h: number, r: number): Shape {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function extrude(shape: Shape, depth: number, bevel = 0.02): ExtrudeGeometry {
  const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 10 });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

function mesh(g: BufferGeometry, m: Material): Mesh {
  return new Mesh(g, m);
}

// ------------------------------------------------------------------ part builders

interface Ctx {
  b: BodyShape;
  paint: PaintColors;
  glossy: boolean;
  bodyTex: Material | null;
  flames: Array<{ flame: Flame; scale: number }>;
  blink: Mesh[];
  party: Mesh[];
  halo: Object3D | null;
  spinners: Object3D[];
}

function buildBody(c: Ctx, style: string): Group {
  const g = new Group();
  const b = c.b;
  const facets = b.facets;
  const body = mesh(geo(`body:${style}`, () => lathe(bodyProfile(b), facets || 48)), c.bodyTex ?? paintMat(c.paint.main, c.glossy));
  g.add(body);
  if (style === 'crystal') {
    const inner = mesh(geo('body:crystal:inner', () => lathe(bodyProfile(b).map(([r, y]) => [r * 0.7, y]), 8)), glowMat('#c89bff', 1.6));
    g.add(inner);
  }
  // Windows on the front (+z).
  for (const [fy, fr] of b.windows) {
    const y = fy * b.height;
    const rr = radiusAt(b, y);
    const wr = fr * b.rMid;
    const glass = mesh(geo('window', () => new SphereGeometry(1, 28, 16)), glassMat(c.paint.window));
    glass.scale.set(wr, wr, wr * 0.42);
    glass.position.set(0, y, rr * 0.97);
    const rim = mesh(geo('windowRim', () => new TorusGeometry(1, 0.13, 10, 36)), metalMat('bright'));
    rim.scale.setScalar(wr);
    rim.position.set(0, y, rr * 0.995);
    // Tilt with the body's slope so windows sit flush.
    const slope = (radiusAt(b, y + 0.05) - radiusAt(b, y - 0.05)) / 0.1;
    glass.rotation.x = rim.rotation.x = Math.atan(slope) * 0.9;
    // A shine on the glass.
    const shine = mesh(geo('windowShine', () => new SphereGeometry(1, 12, 8)), glowMat('#ffffff', 1.3));
    shine.scale.set(wr * 0.22, wr * 0.14, wr * 0.05);
    shine.position.set(-wr * 0.32, y + wr * 0.3, rr * 0.97 + wr * 0.4);
    g.add(glass, rim, shine);
  }
  if (style === 'armor') {
    for (const fy of [0.28, 0.52, 0.8]) {
      const y = fy * b.height;
      const band = mesh(geo(`armorBand:${fy}`, () => new TorusGeometry(radiusAt(b, y) + 0.012, 0.045, 10, 48)), metalMat('dark'));
      band.rotation.x = Math.PI / 2;
      band.position.y = y;
      g.add(band);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const rv = radiusAt(b, y) + 0.05;
        const rivet = mesh(geo('rivet', () => new SphereGeometry(0.03, 8, 6)), metalMat('bright'));
        rivet.position.set(Math.sin(a) * rv, y, Math.cos(a) * rv);
        g.add(rivet);
      }
    }
  }
  if (style === 'capsule') {
    for (const fy of [0.3, 0.86]) {
      const y = fy * b.height;
      const ring = mesh(geo(`capRing:${fy}`, () => new TorusGeometry(radiusAt(b, y) + 0.008, 0.022, 8, 48)), metalMat('bright'));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      g.add(ring);
    }
  }
  return g;
}

function buildNose(c: Ctx, style: string): Group {
  const g = new Group();
  const b = c.b;
  const n = noseShape(style);
  const r = b.rTop;
  const H = n.height;
  const accent = paintMat(c.paint.accent, c.glossy);
  const key = `${style}:${r.toFixed(3)}`;
  switch (style) {
    case 'bubble': {
      const dome = mesh(geo(`nose:${key}`, () => new SphereGeometry(r * 1.0, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)), glassMat(c.paint.window));
      const collar = mesh(geo(`collar:${key}`, () => new TorusGeometry(r * 1.0, 0.05, 10, 40)), metalMat('bright'));
      collar.rotation.x = Math.PI / 2;
      const seat = mesh(geo(`seat:${key}`, () => new SphereGeometry(r * 0.38, 16, 10)), paintMat(c.paint.trim, c.glossy));
      seat.position.y = r * 0.15;
      const antenna = mesh(geo('antenna', () => new CylinderGeometry(0.012, 0.012, 0.3, 6)), metalMat('bright'));
      antenna.position.y = r + 0.12;
      const tip = mesh(geo('antennaTip', () => new SphereGeometry(0.04, 10, 8)), glowMat('#ff5d73', 2.5));
      tip.position.y = r + 0.28;
      g.add(dome, collar, seat, antenna, tip);
      break;
    }
    case 'needle': {
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        const rr = t < 0.3 ? r * (1 - (t / 0.3) * 0.62) : r * 0.38 * Math.pow(1 - (t - 0.3) / 0.7, 1.15);
        pts.push([rr, t * H]);
      }
      g.add(mesh(geo(`nose:${key}`, () => lathe(pts, 36)), accent));
      const tip = mesh(geo('needleTip', () => new SphereGeometry(0.05, 12, 8)), glowMat('#fff3b0', 2.2));
      tip.position.y = H;
      g.add(tip);
      break;
    }
    case 'star': {
      const cone = H * 0.62;
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        pts.push([r * Math.pow(1 - t, 0.7) + 0.035 * t, t * cone]);
      }
      g.add(mesh(geo(`nose:${key}`, () => lathe(pts, 36)), accent));
      const star = mesh(geo('noseStar', () => extrude(starShape(0.3, 0.13), 0.08, 0.025)), glowMat('#ffd84a', 1.6));
      star.position.y = cone + 0.26;
      g.add(star);
      c.spinners.push(star);
      break;
    }
    case 'comet': {
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        pts.push([r * Math.sqrt(Math.max(0, 1 - Math.pow(t, 1.6))), t * H]);
      }
      g.add(mesh(geo(`nose:${key}`, () => lathe(pts, 36)), paintMat('#f4f7ff', c.glossy)));
      const tip = mesh(geo('cometTip', () => new SphereGeometry(0.11, 16, 12)), glowMat('#8fe4ff', 2.0));
      tip.position.y = H - 0.05;
      g.add(tip);
      for (let i = 0; i < 3; i++) {
        const swoosh = mesh(geo(`swoosh:${key}`, () => {
          const s = new Shape();
          s.moveTo(0, 0);
          s.quadraticCurveTo(0.22, 0.05, 0.3, -0.28);
          s.quadraticCurveTo(0.12, -0.08, 0, -0.12);
          s.lineTo(0, 0);
          return extrude(s, 0.04, 0.012);
        }), paintMat(c.paint.trim, c.glossy));
        const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
        swoosh.position.set(Math.cos(a) * r * 0.92, H * 0.32, Math.sin(a) * r * 0.92);
        swoosh.rotation.y = -a;
        g.add(swoosh);
      }
      break;
    }
    case 'prism': {
      const crystal = mesh(geo(`nose:${key}`, () => new CylinderGeometry(0, r * 1.02, H, 6, 1)), crystalMat('#b07bff'));
      crystal.position.y = H / 2;
      const heart = mesh(geo(`prismHeart:${key}`, () => new CylinderGeometry(0, r * 0.55, H * 0.7, 6, 1)), glowMat('#7dffe9', 1.8));
      heart.position.y = H * 0.35;
      g.add(crystal, heart);
      break;
    }
    default: {
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        pts.push([r * Math.pow(1 - t, 0.62) + 0.03 * t, t * H]);
      }
      pts.push([0, H + 0.01]);
      g.add(mesh(geo(`nose:${key}`, () => lathe(pts, 40)), accent));
    }
  }
  g.position.y = b.height;
  return g;
}

function buildEngine(c: Ctx, style: string): Group {
  const g = new Group();
  const b = c.b;
  const e = enginePlacement(b, style);
  const part = Object.values(PART_BY_ID).find((p) => p.slot === 'engine' && p.style === style);
  const [outer, inner] = part?.flame ?? ['#ff9f43', '#fff36b'];
  const skirt = mesh(geo(`skirt:${b.style}`, () => new CylinderGeometry(b.rBottom * 0.9, b.rBottom * 0.72, 0.14, 40, 1)), metalMat('dark'));
  skirt.position.y = -0.06;
  g.add(skirt);
  for (const bell of e.bells) {
    const L = e.length;
    const R = bell.r;
    const key = `bell:${style}:${R.toFixed(3)}`;
    const pts: Array<[number, number]> = [
      [R * 0.45, 0],
      [R * 0.5, -0.12 * L],
      [R * 0.66, -0.45 * L],
      [R * 0.86, -0.78 * L],
      [R, -L],
    ];
    const bellMesh = mesh(geo(key, () => lathe(pts, 32)), style === 'star' ? metalMat('gold') : metalMat('bright'));
    (bellMesh.material as Material).side = DoubleSide;
    bellMesh.position.set(bell.x, -0.12, bell.z);
    g.add(bellMesh);
    const throat = mesh(geo('throat', () => new CircleGeometry(1, 24)), glowMat(inner, 2.4));
    throat.rotation.x = Math.PI / 2;
    throat.scale.setScalar(R * 0.46);
    throat.position.set(bell.x, -0.13, bell.z);
    g.add(throat);
    if (style === 'ion' || style === 'turbo' || style === 'star') {
      const ring = mesh(geo(`bellRing:${R.toFixed(3)}`, () => new TorusGeometry(R * 1.0, 0.035, 8, 40)), style === 'ion' ? glowMat('#4dd4ff', 2.2) : style === 'star' ? glowMat('#c89bff', 2.2) : metalMat('dark'));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(bell.x, -0.12 - L, bell.z);
      g.add(ring);
      if (style === 'turbo') {
        const ring2 = ring.clone();
        ring2.scale.setScalar(0.78);
        ring2.position.y = -0.12 - L * 0.55;
        g.add(ring2);
      }
    }
    if (style === 'star') {
      const core = mesh(geo('engineStar', () => extrude(starShape(0.16, 0.07), 0.03, 0.01)), glowMat('#f3e6ff', 2.4));
      core.rotation.x = Math.PI / 2;
      core.position.set(bell.x, -0.15, bell.z);
      g.add(core);
      c.spinners.push(core);
    }
    const flame = new Flame(R * 0.92, outer, inner);
    flame.group.position.set(bell.x, -0.12 - L, bell.z);
    g.add(flame.group);
    c.flames.push({ flame, scale: 1 });
  }
  return g;
}

function finGeometry(style: string, L: number, span: number, sweep: number, tail = false): BufferGeometry {
  const s = new Shape();
  const sp = tail ? span * 0.55 : span;
  switch (style) {
    case 'round':
      s.moveTo(0, 0);
      s.lineTo(0, L);
      s.bezierCurveTo(sp * 0.9, L * 0.9, sp * 1.15, L * 0.05, sp * 0.65, -L * sweep * 0.5);
      s.quadraticCurveTo(sp * 0.25, -L * 0.25, 0, 0);
      break;
    case 'swept':
      s.moveTo(0, 0);
      s.lineTo(0, L);
      s.quadraticCurveTo(sp * 0.45, L * 0.6, sp, -L * sweep * 0.55);
      s.lineTo(sp * 0.82, -L * sweep * 0.75);
      s.quadraticCurveTo(sp * 0.35, -L * 0.15, 0, 0);
      break;
    case 'wing':
      s.moveTo(0, 0);
      s.lineTo(0, L);
      s.quadraticCurveTo(sp * 0.4, L * 0.75, sp, L * 0.05 - L * sweep * 0.4);
      s.quadraticCurveTo(sp * 1.02, -L * sweep * 0.5, sp * 0.88, -L * sweep * 0.5);
      s.quadraticCurveTo(sp * 0.4, -L * 0.1, 0, 0);
      break;
    default:
      s.moveTo(0, 0);
      s.lineTo(0, L);
      s.quadraticCurveTo(sp * 0.35, L * 0.75, sp * 0.86, L * 0.22 - L * sweep * 0.35);
      s.quadraticCurveTo(sp * 1.02, -L * sweep * 0.42, sp * 0.82, -L * sweep * 0.48);
      s.quadraticCurveTo(sp * 0.4, -L * 0.18, 0, 0);
  }
  return extrude(s, 0.07, 0.025);
}

function buildFins(c: Ctx, style: string): Group {
  const g = new Group();
  const b = c.b;
  const f = finPlacement(b, style);
  const L = f.y1 - f.y0;
  const mat = paintMat(c.paint.accent, c.glossy);
  f.fin.angles.forEach((a, i) => {
    const tail = style === 'wing' && i === 2;
    const fg = geo(`fin:${style}:${b.style}:${tail}`, () => finGeometry(style, L, f.span, f.fin.sweep, tail));
    const fin = mesh(fg, mat);
    const inset = f.rootR - 0.04;
    fin.position.set(Math.cos(a) * inset, f.y0, Math.sin(a) * inset);
    fin.rotation.y = -a;
    g.add(fin);
    if (style === 'star') {
      const star = mesh(geo('finStar', () => extrude(starShape(0.13, 0.06), 0.05, 0.015)), glowMat('#ffd84a', 1.5));
      const tipR = inset + f.span * 0.85;
      star.position.set(Math.cos(a) * tipR, f.y0 - L * f.fin.sweep * 0.42, Math.sin(a) * tipR);
      star.rotation.y = -a;
      g.add(star);
    }
  });
  return g;
}

function buildTank(c: Ctx, style: string, finStyle: string): Group {
  const g = new Group();
  const b = c.b;
  const t = tankPlacement(b, style);
  if (t.kind === 'band') {
    const y = t.y0;
    const thick = style === 'belly' ? 0.075 : 0.03;
    const band = mesh(geo(`band:${style}:${b.style}`, () => new TorusGeometry(radiusAt(b, y) + thick * 0.4, thick, 12, 56)), style === 'belly' ? paintMat(c.paint.trim, c.glossy) : metalMat('bright'));
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    g.add(band);
    if (style === 'belly') {
      const gauge = mesh(geo('gauge', () => new CylinderGeometry(0.1, 0.1, 0.04, 20)), glowMat('#8cff66', 1.6));
      gauge.rotation.x = Math.PI / 2;
      gauge.position.set(0, y, radiusAt(b, y) + thick * 1.2);
      g.add(gauge);
    }
    return g;
  }
  const len = t.y1 - t.y0;
  const podMat =
    style === 'ice' ? glassMat('#bfefff') : style === 'glow' ? crystalMat('#c89bff') : paintMat(c.paint.trim, c.glossy);
  for (const a of podAngles(finStyle)) {
    const x = Math.cos(a) * t.x;
    const z = Math.sin(a) * t.x;
    const pod = mesh(geo(`pod:${style}:${len.toFixed(3)}`, () => new CapsuleGeometry(t.r, len - t.r * 2, 8, 20)), podMat);
    pod.position.set(x, t.y0 + len / 2, z);
    g.add(pod);
    for (const fy of [0.3, 0.75]) {
      const strut = mesh(geo('strut', () => new CylinderGeometry(0.03, 0.03, 1, 8)), metalMat('dark'));
      const y = t.y0 + len * fy;
      const br = radiusAt(b, y);
      const mid = (br + t.x - t.r) / 2;
      strut.scale.set(1, t.x - t.r - br + 0.04, 1);
      strut.rotation.z = Math.PI / 2;
      strut.rotation.y = -a;
      strut.position.set(Math.cos(a) * mid, y, Math.sin(a) * mid);
      g.add(strut);
    }
    if (style === 'ice') {
      const frost = mesh(geo('frost', () => new TorusGeometry(1, 0.08, 6, 24)), glowMat('#e6fbff', 1.4));
      frost.scale.setScalar(t.r * 1.02);
      frost.rotation.x = Math.PI / 2;
      frost.position.set(x, t.y0 + len * 0.55, z);
      g.add(frost);
    }
    if (style === 'glow') {
      const core = mesh(geo(`podCore:${len.toFixed(3)}`, () => new CapsuleGeometry(t.r * 0.55, len - t.r * 2, 6, 12)), glowMat('#e2c8ff', 1.8));
      core.position.copy(pod.position);
      g.add(core);
    }
    if (style === 'boosters') {
      const bell = mesh(geo('boosterBell', () => lathe([[0.07, 0], [0.09, -0.08], [0.13, -0.18]], 16)), metalMat('bright'));
      (bell.material as Material).side = DoubleSide;
      bell.position.set(x, t.y0 + 0.02, z);
      g.add(bell);
      const flame = new Flame(0.11, '#ff9f43', '#fff36b');
      flame.group.position.set(x, t.y0 - 0.16, z);
      g.add(flame.group);
      c.flames.push({ flame, scale: 0.6 });
    }
  }
  return g;
}

function buildCargo(c: Ctx, style: string): Group {
  const g = new Group();
  const b = c.b;
  const p = cargoPlacement(b);
  const z = p.r;
  const trim = paintMat(c.paint.trim, c.glossy);
  switch (style) {
    case 'pod': {
      const box = mesh(geo('cargoPod', () => extrude(roundedRect(0.42, 0.3, 0.07), 0.22, 0.03)), trim);
      box.position.set(0, p.y, z + 0.08);
      const line = mesh(geo('cargoPodLine', () => new CylinderGeometry(0.012, 0.012, 0.3, 6)), metalMat('dark'));
      line.position.set(0, p.y, z + 0.21);
      g.add(box, line);
      break;
    }
    case 'bags':
      for (const s of [-1, 1]) {
        const a = Math.PI / 2 - s * 0.95;
        const bag = mesh(geo('bag', () => extrude(roundedRect(0.3, 0.38, 0.12), 0.18, 0.05)), fabricMat('#c99a5b'));
        const rr = radiusAt(b, p.y) + 0.08;
        bag.position.set(Math.cos(a) * rr, p.y, Math.sin(a) * rr);
        bag.rotation.y = Math.PI / 2 - a;
        const strap = mesh(geo('strap', () => new TorusGeometry(0.16, 0.018, 6, 20, Math.PI)), fabricMat('#7a5230'));
        strap.position.copy(bag.position);
        strap.position.y += 0.08;
        strap.rotation.y = bag.rotation.y;
        g.add(bag, strap);
      }
      break;
    case 'magnet': {
      const arc = mesh(geo('magnet', () => new TorusGeometry(0.15, 0.06, 10, 24, Math.PI)), paintMat('#ff4060', c.glossy));
      arc.rotation.z = Math.PI;
      arc.position.set(0, p.y + 0.06, z + 0.07);
      g.add(arc);
      for (const s of [-1, 1]) {
        const tip = mesh(geo('magnetTip', () => new CylinderGeometry(0.06, 0.06, 0.08, 12)), metalMat('bright'));
        tip.position.set(s * 0.15, p.y + 0.02, z + 0.07);
        g.add(tip);
      }
      break;
    }
    case 'big': {
      const door = mesh(geo('bigBay', () => extrude(roundedRect(0.62, 0.42, 0.08), 0.08, 0.03)), trim);
      door.position.set(0, p.y, z + 0.02);
      g.add(door);
      for (const dy of [-0.1, 0, 0.1]) {
        const stripe = mesh(geo('bayStripe', () => new CylinderGeometry(0.012, 0.012, 0.5, 6)), metalMat('dark'));
        stripe.rotation.z = Math.PI / 2;
        stripe.position.set(0, p.y + dy, z + 0.08);
        g.add(stripe);
      }
      break;
    }
    case 'treasure': {
      const chest = mesh(geo('chest', () => extrude(roundedRect(0.44, 0.28, 0.04), 0.22, 0.02)), fabricMat('#8a5a2b'));
      chest.position.set(0, p.y, z + 0.08);
      const lid = mesh(geo('chestLid', () => new CylinderGeometry(0.11, 0.11, 0.46, 16, 1, false, 0, Math.PI)), metalMat('gold'));
      lid.rotation.z = Math.PI / 2;
      lid.position.set(0, p.y + 0.14, z + 0.08);
      const lock = mesh(geo('chestLock', () => new SphereGeometry(0.04, 10, 8)), metalMat('gold'));
      lock.position.set(0, p.y, z + 0.21);
      g.add(chest, lid, lock);
      break;
    }
    default: {
      const hatch = mesh(geo('hatch', () => extrude(roundedRect(0.3, 0.26, 0.08), 0.03, 0.015)), paintMat(new Color(c.paint.main).multiplyScalar(0.82).getStyle(), c.glossy));
      hatch.position.set(0, p.y, z);
      const handle = mesh(geo('hatchHandle', () => new TorusGeometry(0.05, 0.012, 6, 12, Math.PI)), metalMat('bright'));
      handle.position.set(0, p.y - 0.06, z + 0.03);
      g.add(hatch, handle);
    }
  }
  return g;
}

const PARTY = ['#ff5d73', '#ff9f43', '#ffe066', '#8cff66', '#4dd4ff', '#9b6bff'];

function buildLights(c: Ctx, style: string, noseStyle: string): Group {
  const g = new Group();
  const b = c.b;
  switch (style) {
    case 'blink':
      for (const s of [-1, 1]) {
        const m = new Mesh(geo('blinkBulb', () => new SphereGeometry(0.06, 12, 10)), new MeshBasicMaterial({ color: new Color(s < 0 ? '#ff4060' : '#40ff80').multiplyScalar(3) }));
        const y = b.height * 0.93;
        m.position.set(s * (radiusAt(b, y) + 0.03), y, 0);
        g.add(m);
        c.blink.push(m);
      }
      break;
    case 'strip': {
      const prof = bodyProfile(b).slice(3, -3).map(([r, y]) => [r + 0.012, y] as [number, number]);
      const strip = mesh(geo(`strip:${b.style}`, () => new LatheGeometry(prof.map(([r, y]) => new Vector2(r, y)), 2, -0.05, 0.1)), glowMat('#7ff0ff', 2.0));
      g.add(strip);
      break;
    }
    case 'halo': {
      const ring = mesh(geo(`halo:${b.style}`, () => new TorusGeometry(b.rTop + 0.18, 0.03, 8, 48)), glowMat('#ffe066', 2.4));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = b.height + noseShape(noseStyle).height * 0.35;
      g.add(ring);
      c.halo = ring;
      break;
    }
    case 'party':
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const y = b.height * (0.25 + (i % 2) * 0.35);
        const r = radiusAt(b, y) + 0.02;
        const m = new Mesh(geo('partyBulb', () => new SphereGeometry(0.05, 10, 8)), new MeshBasicMaterial({ color: new Color(PARTY[i % PARTY.length]).multiplyScalar(2.6) }));
        m.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
        g.add(m);
        c.party.push(m);
      }
      break;
    case 'head': {
      const lamp = mesh(geo('headLamp', () => new SphereGeometry(0.09, 16, 12)), glowMat('#fff3b0', 3));
      const y = b.height * 0.86;
      lamp.position.set(0, y, radiusAt(b, y) + 0.04);
      const hood = mesh(geo('headHood', () => new TorusGeometry(0.1, 0.025, 8, 20)), metalMat('bright'));
      hood.position.copy(lamp.position);
      g.add(lamp, hood);
      break;
    }
    default:
      break;
  }
  return g;
}

// ------------------------------------------------------------------ the rocket

export interface RocketOptions {
  /** Glossy clear-coat paint (High quality). */
  glossy?: boolean;
  /** Draw thin panel lines on the body. */
  detail?: boolean;
  /** Merge each part's static pieces per material (fewer draw calls). On by default; one-shot snapshots skip it. */
  merge?: boolean;
}

const _inv = new Matrix4();
const _rel = new Matrix4();

/**
 * Merge the static meshes of one part (sharing a material) into a single mesh in the part's space.
 * Animated pieces (blinkers, party lights, spinners, the halo, flames) are left alone, and the part
 * group itself stays, so snap-on animations still work.
 */
function mergePart(part: Group, keep: Set<Object3D>): void {
  part.updateMatrixWorld(true);
  _inv.copy(part.matrixWorld).invert();
  const byMat = new Map<Material, Mesh[]>();
  const walk = (o: Object3D) => {
    for (const c of o.children) {
      if (keep.has(c)) continue;
      const m = c as Mesh;
      if (m.isMesh && !Array.isArray(m.material) && !(m.material as ShaderMaterial).isShaderMaterial && !c.children.length) {
        let list = byMat.get(m.material);
        if (!list) byMat.set(m.material, (list = []));
        list.push(m);
      } else if (!m.isMesh) walk(c);
    }
  };
  walk(part);
  for (const [mat, list] of byMat) {
    if (list.length < 2) continue;
    const geos: BufferGeometry[] = [];
    let order = 0;
    let cast = false;
    for (const m of list) {
      let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
      if (!g.attributes.uv) g.setAttribute('uv', new BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (!g.attributes.normal) g.computeVertexNormals();
      g.morphAttributes = {};
      g.clearGroups();
      _rel.multiplyMatrices(_inv, m.matrixWorld);
      g.applyMatrix4(_rel);
      geos.push(g);
      order = Math.max(order, m.renderOrder);
      cast ||= m.castShadow;
    }
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    for (const m of list) m.removeFromParent();
    const out = new Mesh(merged, mat);
    out.renderOrder = order;
    out.castShadow = cast;
    part.add(out);
  }
}

const SLOT_DIR: Record<string, Vector3> = {
  nose: new Vector3(0, 1.6, 0),
  body: new Vector3(0, 0, 0),
  engine: new Vector3(0, -1.4, 0),
  fins: new Vector3(0, -0.4, -1.2),
  tank: new Vector3(1.4, 0.3, 0),
  cargo: new Vector3(0, 0, 1.2),
  lights: new Vector3(0, 0.6, 0.6),
  paint: new Vector3(0, 0, 0),
};

function easeOutBack(t: number): number {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * A 3D rocket made from a loadout. `group` is centered on the body's middle; the nose points +y and
 * the window side faces +z. Swapping a part (`setLoadout(next, slot)`) snaps the new part on.
 */
export class RocketModel {
  readonly group = new Group();
  private readonly pivot = new Group();
  private parts: Partial<Record<PartSlot | 'body', Group>> = {};
  private loadout: RocketLoadout;
  private c!: Ctx;
  private bodyTexMat: Material | null = null;
  private anims: Array<{ obj: Object3D; from: Vector3; t: number; dur: number; s0: number }> = [];
  private time = 0;
  private wobble = 0;
  private readonly opts: RocketOptions;
  /** Called when a part lands in place (for sparkles and a clunk sound). Local position. */
  onSnap: ((slot: string, local: Vector3) => void) | null = null;
  bodyHeight = 2.2;

  constructor(loadout: RocketLoadout, opts: RocketOptions = {}) {
    this.opts = opts;
    this.loadout = { ...loadout, stickers: [...loadout.stickers] };
    this.group.add(this.pivot);
    this.build();
    this.group.userData.onDispose = () => this.disposeOwned();
  }

  /** Height from the lowest point (engine/fins) to the nose tip, and half width. */
  get extent(): { bottom: number; top: number; halfWidth: number } {
    const l = this.loadout;
    const e = rocketExtent(styleOf(l.body, 'classic'), styleOf(l.nose, 'cone'), styleOf(l.engine, 'single'), styleOf(l.fins, 'basic'), styleOf(l.tank, 'mini'));
    const mid = this.bodyHeight / 2;
    return { bottom: e.bottom - mid, top: e.top - mid, halfWidth: e.halfWidth };
  }

  get flameCount(): number {
    return this.c.flames.length;
  }

  private paint(): PaintColors {
    return PART_BY_ID[this.loadout.paint]?.colors ?? DEFAULT_PAINT;
  }

  private build(): void {
    for (const k of Object.keys(this.parts) as Array<keyof typeof this.parts>) {
      const g = this.parts[k];
      if (g) {
        this.pivot.remove(g);
        disposeObject(g);
      }
    }
    this.anims.length = 0;
    this.disposeOwned();
    this.parts = {};
    const l = this.loadout;
    const bodyStyle = styleOf(l.body, 'classic');
    const b = bodyShape(bodyStyle);
    this.bodyHeight = b.height;
    const paint = this.paint();
    const glossy = !!this.opts.glossy;
    if (bodyStyle !== 'crystal') {
      const tex = paintTexture(paint, l.stickers, b.height, b.rMid, this.opts.detail !== false);
      const M = glossy
        ? paintMat(paint.main, true).clone()
        : paintMat(paint.main, false).clone();
      (M as unknown as { map: unknown; color: Color }).map = tex;
      (M as unknown as { color: Color }).color = new Color('#ffffff');
      M.userData = {};
      this.bodyTexMat = M;
    } else this.bodyTexMat = crystalMat(paint.main);
    this.c = { b, paint, glossy, bodyTex: this.bodyTexMat, flames: [], blink: [], party: [], halo: null, spinners: [] };
    const c = this.c;
    this.parts.body = buildBody(c, bodyStyle);
    this.parts.nose = buildNose(c, styleOf(l.nose, 'cone'));
    this.parts.engine = buildEngine(c, styleOf(l.engine, 'single'));
    this.parts.fins = buildFins(c, styleOf(l.fins, 'basic'));
    this.parts.tank = buildTank(c, styleOf(l.tank, 'mini'), styleOf(l.fins, 'basic'));
    this.parts.cargo = buildCargo(c, styleOf(l.cargo, 'hatch'));
    this.parts.lights = buildLights(c, styleOf(l.lights, 'none'), styleOf(l.nose, 'cone'));
    for (const g of Object.values(this.parts)) if (g) this.pivot.add(g);
    this.pivot.position.y = -b.height / 2;
    if (this.opts.merge !== false) {
      const keep = new Set<Object3D>([...c.blink, ...c.party, ...c.spinners, ...c.flames.map((f) => f.flame.group)]);
      if (c.halo) keep.add(c.halo);
      for (const g of Object.values(this.parts)) if (g) mergePart(g, keep);
    }
  }

  /** The body texture material is owned by this rocket (shared ones are not). */
  private disposeOwned(): void {
    if (this.bodyTexMat && !this.bodyTexMat.userData.shared) {
      const map = (this.bodyTexMat as unknown as { map?: { dispose(): void } }).map;
      map?.dispose();
      this.bodyTexMat.dispose();
    }
    this.bodyTexMat = null;
  }

  /** Change the loadout; `slot` animates that part snapping on. */
  setLoadout(next: RocketLoadout, slot?: PartSlot | 'stickers'): void {
    const changedBody = next.body !== this.loadout.body;
    this.loadout = { ...next, stickers: [...next.stickers] };
    this.build();
    if (!slot) return;
    if (changedBody || slot === 'paint' || slot === 'stickers') {
      this.wobble = 1;
      const local = new Vector3(0, this.bodyHeight / 2, 0.6);
      this.onSnap?.(slot, local);
      return;
    }
    const g = this.parts[slot as PartSlot];
    if (g) {
      const from = SLOT_DIR[slot] ?? new Vector3(0, 1, 0);
      this.anims.push({ obj: g, from: from.clone(), t: 0, dur: 0.38, s0: 0.55 });
      g.position.copy(from);
      g.scale.setScalar(0.55);
    }
  }

  /** thrust 0..1, boost 0..1. Call every frame while visible. */
  update(dt: number, thrust = 0.6, boost = 0): void {
    this.time += dt;
    const t = this.time;
    for (const f of this.c.flames) f.flame.set(t, thrust * f.scale, boost);
    const on = t % 1 < 0.5;
    if (this.c.blink.length) {
      this.c.blink[0].visible = on;
      this.c.blink[1].visible = !on;
    }
    for (let i = 0; i < this.c.party.length; i++) {
      const m = this.c.party[i].material as MeshBasicMaterial;
      m.color.set(PARTY[(i + Math.floor(t * 4)) % PARTY.length]).multiplyScalar(2.6);
    }
    if (this.c.halo) this.c.halo.position.y += Math.sin(t * 2.4) * 0.0015;
    for (const s of this.c.spinners) s.rotation.y = t * 1.6;
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i];
      a.t += dt;
      const u = Math.min(1, a.t / a.dur);
      const e = easeOutBack(u);
      a.obj.position.copy(a.from).multiplyScalar(1 - e);
      a.obj.scale.setScalar(a.s0 + (1 - a.s0) * e);
      if (u >= 1) {
        a.obj.position.set(0, 0, 0);
        a.obj.scale.setScalar(1);
        this.anims.splice(i, 1);
        this.wobble = 0.7;
        this.onSnap?.('part', new Vector3(0, this.bodyHeight / 2, 0.5));
      }
    }
    if (this.wobble > 0) {
      this.wobble = Math.max(0, this.wobble - dt * 3);
      const w = Math.sin(t * 40) * this.wobble * 0.04;
      this.pivot.scale.set(1 - w, 1 + w, 1 - w);
    } else this.pivot.scale.set(1, 1, 1);
  }

  /** Engine nozzle positions in the rocket's local space (for trails). */
  nozzles(out: Vector3[] = []): Vector3[] {
    out.length = 0;
    for (const f of this.c.flames) {
      if (f.scale < 1) continue;
      const v = new Vector3();
      f.flame.group.getWorldPosition(v);
      this.group.worldToLocal(v);
      out.push(v);
    }
    return out;
  }

  dispose(): void {
    disposeObject(this.group);
  }
}
