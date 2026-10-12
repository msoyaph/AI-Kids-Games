import { Box3, CircleGeometry, CylinderGeometry, PlaneGeometry, RingGeometry, Shape, Vector3, type BufferGeometry } from 'three';
import { Rng } from '../../core/rng';
import { box, cone, cyl, dome, ext, lath, rbox, sph, star, starShape, tint, tor } from '../surface/propKit';
import { AT, sub } from './academyAtlas';
import { P, panel, type AKit } from './academyKit';
import { ARCH, BACK, COLS, DOOR_TOP, DOOR_Z, F0, F1, HANGAR_X, RD, RH, RW, CEIL, archInnerY } from './academyLayout';

/**
 * The seven rooms. Each room is built in its own local frame: x 0..width (left to right), y up from
 * its floor, z 0 at the back wall .. RD at the open front; `k.at` moves it into place.
 */

const H = Math.PI / 2;
const BOOK_COLS = ['#ff5d73', '#ffc83d', '#4c7dff', '#2ed47a', '#9b6bff', '#ff9f43', '#2de0c7', '#ff7ad9', '#fff6e0', '#4dd4ff'];
const SELF = 0.24;

interface ShellStyle {
  wall: string;
  wallPat: number;
  lower?: string;
  lowerPat?: number;
  lowerH?: number;
  floor: string;
  floorPat: number;
  ceil: string;
  trim: string;
}

/** Floor, ceiling and the three walls with baked soft occlusion, baseboards and crown molding. */
function shell(k: AKit, w: number, h: number, d: number, s: ShellStyle, skipBack = false): Box3 {
  const b = new Box3(new Vector3(0, 0, 0), new Vector3(w, h, d));
  const e = 0.012;
  k.ao(k.r(panel(w, d, 12, 9), s.floor, s.floorPat, SELF, w / 2, e, d / 2, -H), b, 0.42, 1.1);
  k.ao(k.r(panel(w, d, 6, 5), s.ceil, P.none, SELF * 0.7, w / 2, h - e, d / 2, H), b, 0.3, 1.2);
  const wall = (y0: number, y1: number, col: string, pat: number) => {
    const hh = y1 - y0;
    const yc = (y0 + y1) / 2;
    const sv = Math.max(1, Math.round(hh / 1.0));
    if (!skipBack) k.ao(k.r(panel(w, hh, 12, sv), col, pat, SELF, w / 2, yc, e), b);
    k.ao(k.r(panel(d, hh, 9, sv), col, pat, SELF, e, yc, d / 2, 0, H), b);
    k.ao(k.r(panel(d, hh, 9, sv), col, pat, SELF, w - e, yc, d / 2, 0, -H), b);
  };
  const lh = s.lower ? (s.lowerH ?? 1.3) : 0;
  if (lh) {
    wall(0, lh, s.lower!, s.lowerPat ?? P.none);
    wall(lh, h, s.wall, s.wallPat);
    rails(k, w, d, lh, s.trim, 0.1, 0.07);
  } else wall(0, h, s.wall, s.wallPat);
  rails(k, w, d, 0.11, s.trim, 0.22, 0.07);
  rails(k, w, d, h - 0.09, s.trim, 0.18, 0.12);
  return b;
}

function rails(k: AKit, w: number, d: number, y: number, col: string, hh: number, t: number): void {
  k.r(box(w, hh, t), col, P.none, SELF, w / 2, y, t / 2 + 0.012);
  k.r(box(t, hh, d), col, P.none, SELF, t / 2 + 0.012, y, d / 2);
  k.r(box(t, hh, d), col, P.none, SELF, w - t / 2 - 0.012, y, d / 2);
}

// ------------------------------------------------------------------ furniture

function sofa(k: AKit, w: number, col: string, cushion: string): void {
  k.paint(rbox(w, 0.42, 1.2, 0.12, 1), tint(col, -0.18), 0, 0.27, 0);
  const n = Math.max(2, Math.round(w / 1.05));
  const cw = (w - 0.56) / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.28 + cw * (i + 0.5);
    k.paint(rbox(cw - 0.04, 0.2, 0.92, 0.09, 2), cushion, x, 0.57, 0.1);
    k.paint(rbox(cw - 0.08, 0.56, 0.24, 0.11, 2), tint(cushion, 0.12), x, 0.94, -0.3, -0.12);
  }
  k.paint(rbox(w, 0.86, 0.3, 0.13, 1), col, 0, 0.82, -0.47);
  for (const sx of [-1, 1]) k.paint(rbox(0.3, 0.66, 1.2, 0.13, 1), col, sx * (w / 2 - 0.15), 0.52, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.metal(cyl(0.05, 0.035, 0.1, 8), '#5a6080', sx * (w / 2 - 0.15), 0.05, sz * 0.48);
}

function swivel(k: AKit, col: string): void {
  k.metal(cyl(0.05, 0.05, 0.4, 8), '#c9d2ee', 0, 0.28, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    k.metal(box(0.36, 0.05, 0.07), '#5a6080', Math.cos(a) * 0.17, 0.06, Math.sin(a) * 0.17, 0, -a, 0);
  }
  k.paint(rbox(0.62, 0.14, 0.6, 0.06, 1), col, 0, 0.55, 0);
  k.paint(rbox(0.58, 0.66, 0.13, 0.06, 1), col, 0, 0.95, 0.27, 0.1);
}

export function potPlant(k: AKit, s: number, pot: string, leaf = '#3fbf5a', seed = 1): void {
  const p = lath([[0, 0], [0.22, 0], [0.26, 0.05], [0.3, 0.46], [0.34, 0.48], [0.34, 0.56], [0.28, 0.56], [0.26, 0.52], [0, 0.52]].map(([r, y]) => [r * s, y * s] as [number, number]), 12);
  k.paint(p, pot);
  const rng = new Rng(`plant${seed}`);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rng.range(-0.3, 0.3);
    const tilt = rng.range(0.35, 0.75);
    const len = rng.range(0.42, 0.62) * s;
    const g = k.paint(sph(0.12 * s, len, 0.05 * s, 6, 5), leaf, Math.cos(a) * 0.16 * s, 0.55 * s + len * 0.8, Math.sin(a) * 0.16 * s, Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
    k.grad(g, tint(leaf, -0.35), tint(leaf, 0.25), 0.5 * s, 1.4 * s);
  }
  const top = k.paint(sph(0.2 * s, 0.32 * s, 0.2 * s, 7, 5), tint(leaf, 0.05), 0, 0.92 * s, 0);
  k.grad(top, tint(leaf, -0.3), tint(leaf, 0.3), 0.6 * s, 1.24 * s);
}

function bookcase(k: AKit, w: number, h: number, d: number, wood: string, rng: Rng, shelves: number, gaps = true): void {
  const dark = tint(wood, -0.35);
  k.r(box(0.1, h, d), wood, P.none, SELF, -w / 2 + 0.05, h / 2, 0);
  k.r(box(0.1, h, d), wood, P.none, SELF, w / 2 - 0.05, h / 2, 0);
  k.r(box(w + 0.16, 0.14, d + 0.08), wood, P.none, SELF, 0, h - 0.02, 0.02);
  k.r(box(w - 0.2, h - 0.1, 0.04), dark, P.none, SELF * 0.5, 0, h / 2, -d / 2 + 0.03);
  const gap = (h - 0.25) / shelves;
  for (let i = 0; i < shelves; i++) {
    const y = 0.08 + i * gap;
    k.r(box(w - 0.12, 0.06, d), wood, P.none, SELF, 0, y, 0);
    // Books.
    let x = -w / 2 + 0.14;
    while (x < w / 2 - 0.2) {
      if (gaps && rng.chance(0.05)) {
        x += 0.3;
        continue;
      }
      const bw = rng.range(0.09, 0.17);
      const bh = gap * rng.range(0.55, 0.82);
      const c = rng.pick(BOOK_COLS);
      const lean = x > w / 2 - 0.45 && rng.chance(0.5) ? -0.25 : 0;
      k.paint(box(bw, bh, d * 0.78), c, x + bw / 2, y + 0.03 + bh / 2, 0.02, 0, 0, lean);
      if (rng.chance(0.22)) k.r(box(bw + 0.004, bh * 0.08, d * 0.78 + 0.004), '#fff6c0', P.none, 0.3, x + bw / 2, y + 0.03 + bh * 0.72, 0.02, 0, 0, lean);
      x += bw + 0.008;
    }
  }
}

export function cup(k: AKit, s: number, col: string): void {
  const prof: Array<[number, number]> = [[0, 0], [0.3, 0], [0.3, 0.07], [0.07, 0.2], [0.06, 0.42], [0.3, 0.6], [0.34, 0.93], [0.25, 0.64], [0, 0.54]];
  k.metal(lath(prof.map(([r, y]) => [r * s, y * s] as [number, number]), 10), col);
  for (const sx of [-1, 1]) k.metal(tor(0.13 * s, 0.028 * s, 3, 6, Math.PI), col, sx * 0.33 * s, 0.75 * s, 0, 0, 0, sx * -H);
}

function medal(k: AKit, i: number, col: string, ribbon: string, x: number, y: number, z: number): void {
  k.paint(box(0.12, 0.42, 0.02), ribbon, x - 0.08, y + 0.32, z, 0, 0, -0.3);
  k.paint(box(0.12, 0.42, 0.02), tint(ribbon, -0.2), x + 0.08, y + 0.32, z, 0, 0, 0.3);
  k.metal(cyl(0.3, 0.3, 0.06, 24), col, x, y, z + 0.03, H);
  k.decalGeo(new CircleGeometry(0.24, 24), sub(AT.medals, i, 4, 2), 0, '#ffffff', x, y, z + 0.065);
}

export function beanbag(k: AKit, col: string, s = 1): void {
  const g = k.paint(sph(0.62 * s, 0.42 * s, 0.6 * s, 14, 10), col, 0, 0.36 * s, 0);
  k.grad(g, tint(col, -0.3), tint(col, 0.2), 0, 0.8 * s);
  k.paint(sph(0.44 * s, 0.16 * s, 0.4 * s, 14, 8), tint(col, 0.1), 0, 0.66 * s, 0.08 * s);
}

function pendant(k: AKit, x: number, y: number, z: number, drop: number, shade: string, bulb = '#fff1c0'): void {
  k.metal(cyl(0.015, 0.015, drop, 6), '#3a3f66', x, y - drop / 2, z);
  k.paint(lath([[0.06, 0], [0.12, -0.04], [0.34, -0.3], [0.36, -0.34], [0.3, -0.33], [0.1, -0.08], [0.04, -0.02]], 12), shade, x, y - drop, z);
  k.glow(sph(0.13, 0.11, 0.13, 8, 6), hot2(bulb), x, y - drop - 0.25, z);
}

const hot2 = (c: string) => tint(c, 0).multiplyScalar(2.6);

/** A crisp star without bevels (cheap, for small decorations). */
export function flatStar(outer: number, depth: number): BufferGeometry {
  return ext(starShape(outer, outer * 0.48), depth, 0, 2);
}

function poster(k: AKit, i: number, w: number, x: number, y: number, z: number, ry: number): void {
  const r = sub(AT.posters, i, 4, 1);
  const h = (w * r.h) / r.w;
  k.r(box(w + 0.12, h + 0.12, 0.05), '#fff6e0', P.none, SELF, x, y, z, 0, ry);
  const dz = Math.cos(ry) * 0.03;
  const dx = Math.sin(ry) * 0.03;
  k.decal(r, w, h, 0, x + dx, y, z + dz, 0, ry);
}

/** Console desk with a slanted button panel toward +z and a little screen. */
function consoleDesk(k: AKit, w: number, col: string, screen: keyof typeof AT, phase: number): void {
  k.paint(rbox(w, 0.86, 0.9, 0.08, 1), col, 0, 0.43, 0);
  k.paint(rbox(w + 0.06, 0.06, 1.0, 0.03, 1), '#c9d2ee', 0, 0.88, 0.02);
  const tilt = 0.42;
  k.paint(rbox(w - 0.1, 0.1, 0.62, 0.04, 1), '#20124d', 0, 1.02, 0.05, tilt);
  const cols = ['#ff5d73', '#ffe066', '#2ed47a', '#4dd4ff', '#ff7ad9'];
  const n = Math.floor((w - 0.3) / 0.22);
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < n; i++) {
      const bx = -((n - 1) * 0.22) / 2 + i * 0.22;
      const bz = -0.12 + r * 0.2;
      const y = 1.08 - bz * Math.sin(tilt);
      const z = 0.05 + bz * Math.cos(tilt);
      const c = cols[(i + r * 2 + phase) % cols.length];
      k.blink(cyl(0.055, 0.055, 0.04, 8), c, ((i * 7 + r * 3 + phase) % 10) / 10, (i + r + phase) % 3 === 0 ? 1.3 : (i + phase) % 4 === 0 ? -0.6 : 0, bx, y, z, tilt);
    }
  }
  // Monitor on the back edge.
  k.metal(cyl(0.04, 0.04, 0.3, 8), '#5a6080', 0, 1.2, -0.3);
  k.paint(rbox(1.0, 0.62, 0.1, 0.05, 1), '#2a2f6a', 0, 1.62, -0.32, 0.1);
  k.decal(AT[screen], 0.88, 0.5, 1.6, 0, 1.62, -0.26, 0.1);
}

/** A curved screen (a slice of a cylinder) facing +z, centered on x = 0. */
function curvedScreen(radius: number, arc: number, h: number): BufferGeometry {
  const g = new CylinderGeometry(radius, radius, h, 40, 1, true, Math.PI - arc / 2, arc);
  g.scale(-1, 1, 1);
  g.translate(0, 0, radius);
  return g;
}

/** Upward light cone: bright (uv.y = 1) at the bottom. */
export function beamUp(r0: number, r1: number, len: number): BufferGeometry {
  const g = new CylinderGeometry(r0, r1, len, 28, 1, true);
  g.rotateX(Math.PI);
  g.translate(0, len / 2, 0);
  return g;
}

/** Downward light cone from y = 0 (bright at the top). */
function beamDown(r0: number, r1: number, len: number): BufferGeometry {
  const g = new CylinderGeometry(r0, r1, len, 28, 1, true);
  g.translate(0, -len / 2, 0);
  return g;
}

function flag(k: AKit, col: string, x: number, z: number, h: number): void {
  k.metal(lath([[0.22, 0], [0.22, 0.05], [0.14, 0.09], [0.05, 0.14], [0, 0.14]], 14), '#5a6080', x, 0, z);
  k.metal(cyl(0.035, 0.035, h, 8), '#dfe5f5', x, h / 2, z);
  k.metal(sph(0.07, 0.07, 0.07, 10, 8), '#ffc83d', x, h + 0.05, z);
  const s = new Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.4, 0.12, 0.7, -0.1, 1.15, 0.02);
  s.lineTo(1.15, -0.72);
  s.bezierCurveTo(0.7, -0.84, 0.4, -0.62, 0, -0.74);
  s.closePath();
  k.paint(ext(s, 0.03, 0.01, 6), col, x + 0.04, h - 0.1, z);
  k.paint(flatStar(0.18, 0.05), '#ffe066', x + 0.58, h - 0.47, z + 0.02);
}

// ------------------------------------------------------------------ rooms

function missionControl(k: AKit): void {
  const w = RW;
  shell(k, w, RH, RD, { wall: '#4254c4', wallPat: P.panels, floor: '#2c3478', floorPat: P.carpet, ceil: '#2a3274', trim: '#7fd8ff' });
  // Glowing strip along the walls.
  k.glow(box(w - 0.3, 0.05, 0.03), '#4dd4ff', w / 2, 1.35, 0.06);
  k.glow(box(0.03, 0.05, RD - 0.2), '#4dd4ff', 0.06, 1.35, RD / 2);
  k.glow(box(0.03, 0.05, RD - 0.2), '#4dd4ff', w - 0.06, 1.35, RD / 2);
  // Big curved wall screen with a frame.
  const arc = 1.15;
  const R = 9.4;
  k.decalGeo(curvedScreen(R, arc, 3.5), AT.mission, 1.25, '#ffffff', w / 2, 3.45, 0.16 - R + R);
  const frameTop = new CylinderGeometry(R + 0.05, R + 0.05, 0.22, 40, 1, true, Math.PI - (arc + 0.04) / 2, arc + 0.04);
  for (const y of [1.6, 5.3]) {
    const f = frameTop.clone();
    f.scale(-1, 1, 1);
    f.translate(0, 0, R);
    k.paint(f, '#6b3fd4', w / 2, y, 0.16 - 0.08);
  }
  frameTop.dispose();
  // Side screens on the walls.
  k.paint(rbox(2.1, 1.3, 0.1, 0.06, 1), '#20124d', 0.08, 3.4, 3.2, 0, H);
  k.decal(AT.chart, 1.9, 1.1, 1.5, 0.15, 3.4, 3.2, 0, H);
  k.paint(rbox(2.1, 1.3, 0.1, 0.06, 1), '#20124d', w - 0.08, 3.4, 3.2, 0, -H);
  k.decal(AT.wave, 1.9, 1.1, 1.5, w - 0.15, 3.4, 3.2, 0, -H);
  // Consoles in a gentle arc, with chairs.
  const desks: Array<[number, number, number, keyof typeof AT]> = [[2.4, 2.7, 0.28, 'radar'], [5.5, 2.4, 0, 'rocketScreen'], [8.6, 2.7, -0.28, 'chart']];
  desks.forEach(([x, z, ry, scr], i) => {
    k.at(x, 0, z, ry, 1, () => consoleDesk(k, 2.4, '#6b7bd8', scr, i * 3));
    k.at(x + Math.sin(ry) * 1.05, 0, z + Math.cos(ry) * 1.05, ry + Math.PI, 1, () => swivel(k, ['#ff7ad9', '#ffc83d', '#2de0c7'][i]));
  });
  // Holo-table.
  const tx = 4.2;
  const tz = 5.9;
  k.paint(lath([[0, 0], [0.75, 0], [0.8, 0.08], [0.5, 0.2], [0.38, 0.75], [1.15, 0.82], [1.2, 0.92], [1.15, 1.0], [0, 1.0]], 36), '#3d4aa8', tx, 0, tz);
  k.glow(tor(1.17, 0.035, 6, 48), '#4dd4ff', tx, 0.95, tz, H);
  k.glow(cyl(0.98, 0.98, 0.02, 40), tint('#2a8aff', 0).multiplyScalar(1.3), tx, 1.0, tz);
  k.beam(beamUp(0.95, 0.75, 2.0), tint('#4dd4ff', 0).multiplyScalar(0.35), tx, 1.0, tz);
  // Flags in the back corners.
  flag(k, '#6b3fd4', 0.7, 0.8, 3.0);
  flag(k, '#2a7bff', w - 1.9, 0.8, 3.0);
  // Ceiling lights.
  for (const x of [2.8, 8.2]) k.glow(rbox(2.2, 0.08, 0.5, 0.04, 1), '#cfe8ff', x, RH - 0.1, 4.2);
  // Clock.
  k.paint(cyl(0.45, 0.45, 0.08, 28), '#fff6e0', 9.8, 5.4, 0.08, H);
  k.paint(box(0.05, 0.3, 0.02), '#20124d', 9.8, 5.5, 0.14);
  k.paint(box(0.22, 0.05, 0.02), '#20124d', 9.88, 5.4, 0.14);
}

function library(k: AKit): void {
  const w = RW;
  const rng = new Rng('library');
  shell(k, w, RH, RD, { wall: '#f6dcb4', wallPat: P.stripes, lower: '#a8683a', lowerPat: P.planks, lowerH: 1.1, floor: '#c98a52', floorPat: P.planks, ceil: '#f2dcb8', trim: '#7a4526' });
  const wood = '#9a5a30';
  // Back wall: two tall bookcases left and right of a round-top window.
  k.at(2.15, 0, 0.42, 0, 1, () => bookcase(k, 3.9, 5.4, 0.7, wood, rng, 5));
  k.at(8.85, 0, 0.42, 0, 1, () => bookcase(k, 3.9, 5.4, 0.7, wood, rng, 5));
  // Window between them.
  const win = new Shape();
  win.moveTo(-1.0, -1.4);
  win.lineTo(1.0, -1.4);
  win.lineTo(1.0, 0.4);
  win.absarc(0, 0.4, 1.0, 0, Math.PI, false);
  win.lineTo(-1.0, -1.4);
  k.r(ext(win, 0.14, 0.06, 16), '#7a4526', P.none, SELF, w / 2, 3.4, 0.1);
  const pane = new Shape();
  pane.moveTo(-0.85, -1.27);
  pane.lineTo(0.85, -1.27);
  pane.lineTo(0.85, 0.4);
  pane.absarc(0, 0.4, 0.85, 0, Math.PI, false);
  pane.lineTo(-0.85, -1.27);
  const pg = ext(pane, 0.02, 0, 16);
  // Map the window view (planar uvs from the shape's bounding box).
  const pp = pg.attributes.position;
  const uv = pg.attributes.uv;
  for (let i = 0; i < pp.count; i++) uv.setXY(i, (pp.getX(i) + 0.85) / 1.7, (pp.getY(i) + 1.27) / 2.92);
  k.decalGeo(pg, AT.window, 1.1, '#ffffff', w / 2, 3.4, 0.27);
  k.r(box(0.08, 2.9, 0.06), '#7a4526', P.none, SELF, w / 2, 3.25, 0.31);
  k.r(box(1.7, 0.08, 0.06), '#7a4526', P.none, SELF, w / 2, 3.3, 0.31);
  k.r(box(2.4, 0.14, 0.5), '#7a4526', P.none, SELF, w / 2, 1.95, 0.32);
  // Side bookcase on the left wall.
  k.at(0.42, 0, 3.4, H, 1, () => bookcase(k, 3.2, 4.6, 0.62, wood, rng, 5));
  // Rolling ladder leaning on the right bookcase, with its rail.
  k.metal(box(3.9, 0.05, 0.05), '#d9b070', 8.85, 4.9, 0.85);
  k.at(7.9, 0, 1.35, 0, 1, () => {
    for (const sx of [-0.32, 0.32]) k.r(box(0.08, 5.2, 0.08), '#c4884a', P.none, SELF, sx, 2.55, 0, -0.17);
    for (let i = 0; i < 9; i++) k.r(box(0.62, 0.06, 0.07), '#c4884a', P.none, SELF, 0, 0.35 + i * 0.55, -i * 0.093 + 0.37);
    for (const sx of [-0.32, 0.32]) k.metal(cyl(0.06, 0.06, 0.05, 10), '#3a3f66', sx, 0.06, 0.42, 0, 0, H);
  });
  // Reading desk with desk globes and a lamp (left front).
  k.at(2.4, 0, 6.5, 0.25, 1, () => {
    k.r(rbox(2.2, 0.1, 1.0, 0.04, 1), '#b06a38', P.none, SELF, 0, 0.92, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.r(box(0.09, 0.9, 0.09), '#8a4a26', P.none, SELF, sx * 0.98, 0.45, sz * 0.4);
    for (const [gx, col, land] of [[-0.6, '#4c9dff', '#5ad46a'], [0.35, '#9b6bff', '#ffc83d']] as Array<[number, string, string]>) {
      k.metal(lath([[0.14, 0], [0.14, 0.03], [0.04, 0.06], [0.03, 0.2], [0, 0.2]], 12), '#c9a050', gx, 0.97, 0);
      k.paint(sph(0.2, 0.2, 0.2, 14, 10), col, gx, 1.4, 0, 0.4, 0, 0.3);
      k.paint(sph(0.12, 0.08, 0.06, 8, 6), land, gx + 0.1, 1.46, 0.14);
      k.paint(sph(0.08, 0.1, 0.05, 8, 6), land, gx - 0.08, 1.32, 0.16);
      k.metal(tor(0.24, 0.012, 4, 24, Math.PI), '#c9a050', gx, 1.4, 0, 0, H, 0.4);
    }
    k.metal(cyl(0.025, 0.025, 0.5, 6), '#c9a050', 0.85, 1.2, -0.25);
    k.paint(cone(0.16, 0.18, 14), '#2ed47a', 0.85, 1.5, -0.25);
    k.glow(sph(0.06, 0.04, 0.06, 8, 6), '#fff1c0', 0.85, 1.42, -0.25);
    k.paint(box(0.42, 0.06, 0.3), '#ff5d73', -0.05, 1.0, 0.25, 0, 0.3, 0);
    k.paint(box(0.42, 0.06, 0.3), '#ffc83d', -0.05, 1.06, 0.25, 0, 0.1, 0);
  });
  k.at(2.6, 0, 7.5, 0.4, 1, () => swivel(k, '#2ed47a'));
  // Reading corner (right front): round rug and floor cushions.
  k.decalGeo(new CircleGeometry(1.8, 40), AT.rugRound, 0, '#ffffff', 8.6, 0.03, 6.6, -H);
  const cushions: Array<[number, number, string]> = [[7.6, 6.0, '#ff7ad9'], [9.6, 6.3, '#ffc83d'], [8.7, 7.6, '#2de0c7']];
  for (const [x, z, c] of cushions) {
    const g = k.paint(sph(0.55, 0.24, 0.55, 18, 10), c, x, 0.22, z);
    k.grad(g, tint(c, -0.3), tint(c, 0.2), 0, 0.46);
    k.paint(sph(0.08, 0.05, 0.08, 8, 6), tint(c, -0.2), x, 0.45, z);
  }
  k.paint(box(0.5, 0.08, 0.36), '#4c7dff', 8.5, 0.07, 6.7, 0, 0.5, 0);
  // Holo-projector pedestal (the lead floats a planet hologram above it).
  const px = 5.5;
  const pz = 5.8;
  k.paint(lath([[0, 0], [0.7, 0], [0.72, 0.1], [0.5, 0.18], [0.3, 0.3], [0.26, 0.85], [0.5, 0.95], [0.55, 1.08], [0, 1.08]], 32), '#6b3fd4', px, 0, pz);
  k.metal(tor(0.5, 0.04, 6, 32), '#ffc83d', px, 1.0, pz, H);
  k.glow(cyl(0.44, 0.44, 0.03, 32), tint('#7fe8ff', 0).multiplyScalar(1.8), px, 1.09, pz);
  k.beam(beamUp(0.42, 0.95, 2.4), tint('#7fe8ff', 0).multiplyScalar(0.28), px, 1.1, pz);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    k.blink(sph(0.05, 0.05, 0.05, 8, 6), '#7fe8ff', i / 4, -0.8, px + Math.cos(a) * 0.6, 0.12, pz + Math.sin(a) * 0.6);
  }
  // Skylight under the observatory dome.
  k.r(cyl(1.5, 1.5, 0.14, 40), '#7a4526', P.none, SELF, w / 2, RH - 0.06, 4.6);
  k.decalGeo(new CircleGeometry(1.32, 40), AT.window, 0.9, '#ffffff', w / 2, RH - 0.14, 4.6, H);
  // Hanging lamps.
  for (const x of [2.6, 8.4]) pendant(k, x, RH, 4.4, 1.3, '#2ed47a');
}

function trophyHall(k: AKit): void {
  const w = RW;
  shell(k, w, RH, RD, { wall: '#7048d8', wallPat: P.stars, lower: '#4a28a8', lowerPat: P.stripes, lowerH: 1.2, floor: '#f6cf78', floorPat: P.tiles, ceil: '#4a2c9c', trim: '#ffc83d' });
  // Red carpet runner to the podium.
  k.r(box(2.2, 0.03, 6.4), '#ff5d73', P.carpet, SELF, w / 2, 0.03, 5.6);
  k.r(box(2.4, 0.025, 6.4), '#ffc83d', P.none, SELF, w / 2, 0.02, 5.6);
  // Big sticker wall in the middle of the back wall.
  k.r(rbox(4.4, 3.9, 0.16, 0.08, 1), '#ffc83d', P.none, SELF, w / 2, 3.35, 0.08);
  k.decal(AT.stickers, 4.0, 3.5, 0, w / 2, 3.35, 0.18);
  // Trophy shelves left and right of it.
  const cols = ['#ffc83d', '#dfe5f5', '#d98a4a'];
  for (const sx of [1.7, 9.3]) {
    for (let r = 0; r < 3; r++) {
      const y = 1.5 + r * 1.35;
      k.r(rbox(3.0, 0.12, 0.62, 0.04, 1), '#ffe9a8', P.none, SELF, sx, y, 0.33);
      for (const bx of [-1.1, 1.1]) k.metal(box(0.06, 0.22, 0.5), '#ffc83d', sx + bx, y - 0.16, 0.3);
      for (let i = 0; i < 3; i++) {
        const c = cols[(i + r + (sx > 5 ? 1 : 0)) % 3];
        const s = i === 1 ? 0.95 : 0.7;
        k.at(sx - 0.95 + i * 0.95, y + 0.06, 0.33, 0, 1, () => {
          k.paint(rbox(0.42, 0.14, 0.36, 0.04, 1), '#3a2a7a', 0, 0.07, 0);
          k.at(0, 0.14, 0, 0, 1, () => cup(k, s, c));
        });
      }
    }
  }
  // Medals on the left wall, ribbons and all.
  k.r(rbox(0.12, 2.6, 4.2, 0.06, 1), '#3a2a7a', P.none, SELF, 0.08, 3.3, 4.5);
  const ribbons = ['#ff5d73', '#4c7dff', '#2ed47a', '#ff7ad9'];
  for (let i = 0; i < 8; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    k.at(0.2, 0, 3.0 + col * 1.0, H, 1, () => medal(k, i, cols[(i + row) % 3], ribbons[col], 0, 3.9 - row * 1.2, 0));
  }
  // Glass case with the golden rocket on the right wall.
  k.r(rbox(1.6, 1.0, 1.0, 0.05, 1), '#3a2a7a', P.none, SELF, w - 0.6, 0.5, 4.6);
  k.metal(lath([[0, 0], [0.18, 0], [0.18, 0.5], [0.08, 0.9], [0, 1.0]], 16), '#ffc83d', w - 0.6, 1.0, 4.6);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    k.metal(box(0.04, 0.32, 0.22), '#ff5d73', w - 0.6 + Math.cos(a) * 0.18, 1.14, 4.6 + Math.sin(a) * 0.18, 0, -a, 0);
  }
  k.glass(rbox(1.3, 1.3, 0.9, 0.04, 1), w - 0.6, 1.66, 4.6);
  k.decal(sub(AT.plaques, 2, 1, 7), 2.6, 0.5, 1.2, w - 0.1, 4.3, 4.6, 0, -H);
  // Podium with the giant cup, under a spotlight.
  const px = w / 2;
  const pz = 6.0;
  k.paint(rbox(2.2, 0.5, 1.6, 0.08, 1), '#fff6e0', px, 0.25, pz);
  k.paint(rbox(1.5, 0.4, 1.2, 0.08, 1), '#ffc83d', px, 0.7, pz);
  k.at(px, 0.9, pz, 0, 1, () => cup(k, 1.7, '#ffc83d'));
  k.paint(star(0.22, 0.06), '#ff5d73', px, 0.7, pz + 0.62);
  k.metal(cyl(0.22, 0.32, 0.5, 18), '#3a3f66', px, RH - 0.3, pz - 0.6, 0.35);
  k.glow(cyl(0.29, 0.29, 0.02, 18), '#fff6d0', px, RH - 0.56, pz - 0.5, 0.35);
  k.beam(beamDown(0.28, 1.3, RH - 1.3), tint('#fff1c0', 0).multiplyScalar(0.3), px, RH - 0.55, pz - 0.5, 0.18);
  // Star banners strung across the ceiling.
  const bcols = ['#ff5d73', '#ffc83d', '#2de0c7', '#ff7ad9', '#4c7dff', '#8cff66'];
  for (const z of [3.2, 6.6]) {
    k.paint(box(w - 0.4, 0.03, 0.03), '#c9b8f0', w / 2, RH - 0.55, z);
    for (let i = 0; i < 9; i++) {
      const x = 0.9 + i * 1.15;
      const tri = new Shape();
      tri.moveTo(-0.38, 0);
      tri.lineTo(0.38, 0);
      tri.lineTo(0, -0.78);
      tri.closePath();
      k.paint(ext(tri, 0.02, 0, 2), bcols[(i + (z > 5 ? 2 : 0)) % bcols.length], x, RH - 0.56, z);
      k.paint(flatStar(0.12, 0.03), '#fff6e0', x, RH - 0.8, z + 0.03);
    }
  }
}

function lounge(k: AKit): void {
  const w = RW;
  shell(k, w, RH, RD, { wall: '#ffb3a1', wallPat: P.stars, lower: '#37c2b2', lowerPat: P.stripes, lowerH: 1.25, floor: '#d79a68', floorPat: P.planks, ceil: '#ffe2d4', trim: '#fff6e0' });
  // Big round window with stars above the sofa.
  const wx = 5.2;
  const wy = 3.75;
  k.paint(tor(1.5, 0.2, 8, 40), '#6b3fd4', wx, wy, 0.2);
  k.metal(tor(1.32, 0.05, 6, 48), '#ffc83d', wx, wy, 0.3);
  k.decalGeo(new CircleGeometry(1.4, 48), AT.window, 1.15, '#ffffff', wx, wy, 0.12);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.metal(sph(0.07, 0.07, 0.05, 8, 6), '#dfe5f5', wx + Math.cos(a) * 1.5, wy + Math.sin(a) * 1.5, 0.38);
  }
  // Sofa against the back wall.
  k.at(4.6, 0, 0.75, 0, 1, () => sofa(k, 3.9, '#6b3fd4', '#9b6bff'));
  k.paint(sph(0.26, 0.24, 0.12, 12, 8), '#ffc83d', 3.2, 0.92, 0.65, 0.2, 0, 0.3);
  k.paint(sph(0.26, 0.24, 0.12, 12, 8), '#2de0c7', 6.0, 0.92, 0.65, 0.2, 0, -0.3);
  // Rug and round coffee table with snacks.
  k.decalGeo(new CircleGeometry(2.1, 48), AT.rugRound, 0, '#ffffff', 4.8, 0.03, 3.4, -H);
  k.paint(lath([[0, 0], [0.45, 0], [0.46, 0.04], [0.2, 0.08], [0.14, 0.4], [0.95, 0.44], [0.98, 0.52], [0.95, 0.56], [0, 0.56]], 20), '#ff9f43', 4.8, 0, 3.3);
  k.paint(cyl(0.22, 0.16, 0.12, 16), '#fff6e0', 4.55, 0.62, 3.2);
  for (let i = 0; i < 5; i++) k.paint(sph(0.06, 0.05, 0.06, 8, 6), ['#ffc83d', '#ff7ad9', '#8cff66'][i % 3], 4.5 + (i % 3) * 0.08 - 0.06, 0.72, 3.15 + Math.floor(i / 3) * 0.1);
  k.paint(cyl(0.08, 0.07, 0.2, 12), '#ff5d73', 5.2, 0.66, 3.5);
  k.paint(cyl(0.08, 0.07, 0.2, 12), '#4dd4ff', 5.05, 0.66, 3.0);
  // Snack machine in the back-left corner.
  k.at(1.0, 0, 0.75, 0.35, 1, () => {
    k.paint(rbox(1.4, 2.5, 1.0, 0.1, 1), '#ff5d73', 0, 1.25, 0);
    k.decal(AT.snack, 0.9, 1.6, 0, -0.12, 1.45, 0.51);
    k.glass(box(0.92, 1.62, 0.04), -0.12, 1.45, 0.53);
    k.paint(rbox(0.26, 1.6, 0.06, 0.03, 1), '#20124d', 0.5, 1.45, 0.5);
    for (let i = 0; i < 6; i++) k.blink(box(0.08, 0.05, 0.02), ['#8cff66', '#ffe066', '#ff7ad9'][i % 3], i * 0.15, 1.5, 0.5, 1.9 - i * 0.12, 0.54);
    k.paint(rbox(0.9, 0.24, 0.08, 0.04, 1), '#20124d', -0.12, 0.35, 0.5);
    k.glow(box(1.3, 0.12, 0.02), '#ffe066', 0, 2.38, 0.51);
  });
  // Planet posters.
  poster(k, 0, 1.4, 0.06, 3.5, 4.2, H);
  poster(k, 2, 1.4, 0.06, 3.5, 6.2, H);
  poster(k, 1, 1.5, w - 0.06, 3.5, 5.2, -H);
  // Beanbags and plants.
  k.at(8.2, 0, 2.2, -0.4, 1, () => beanbag(k, '#2de0c7'));
  k.at(9.6, 0, 3.4, -0.9, 1, () => beanbag(k, '#ffc83d', 0.9));
  k.at(0.8, 0, 2.6, 0, 1, () => potPlant(k, 1.6, '#ffc83d', '#3fbf5a', 3));
  k.at(10.2, 0, 0.8, 0, 1, () => potPlant(k, 1.9, '#6b3fd4', '#43c86a', 4));
  // Pendant lamps.
  for (const x of [3.2, 7.4]) pendant(k, x, RH, 4.2, 1.7, '#ff9f43');
  // Shelf with a little radio and books on the right wall.
  k.r(rbox(0.5, 0.1, 2.4, 0.03, 1), '#fff6e0', P.none, SELF, w - 0.3, 2.3, 7.3);
  for (let i = 0; i < 7; i++) k.paint(box(0.32, 0.4 + (i % 3) * 0.06, 0.1), BOOK_COLS[i], w - 0.3, 2.55 + (i % 3) * 0.03, 6.4 + i * 0.12);
}

function shop(k: AKit): void {
  const w = RW;
  shell(k, w, RH, RD, { wall: '#62dcc6', wallPat: P.dots, lower: '#ff7ad9', lowerPat: P.stripes, lowerH: 1.0, floor: '#fff1d6', floorPat: P.tiles, ceil: '#dafff6', trim: '#ffffff' });
  // Counter (Pots stands behind it), register and coin jar.
  k.at(2.4, 0, 4.4, 0.2, 1, () => {
    k.paint(rbox(3.0, 1.15, 0.9, 0.1, 2), '#ff9f43', 0, 0.58, 0);
    k.paint(rbox(3.2, 0.1, 1.05, 0.04, 1), '#fff6e0', 0, 1.18, 0);
    k.paint(rbox(2.6, 0.5, 0.06, 0.05, 1), '#ffc83d', 0, 0.6, 0.46);
    for (let i = 0; i < 5; i++) k.paint(cyl(0.12, 0.12, 0.04, 16), '#ffe066', -1.0 + i * 0.5, 0.6, 0.5, H);
    k.paint(rbox(0.7, 0.4, 0.5, 0.06, 1), '#6b3fd4', -0.8, 1.42, 0.0);
    k.paint(rbox(0.5, 0.3, 0.06, 0.03, 1), '#20124d', -0.8, 1.78, -0.12, -0.3);
    k.blink(box(0.38, 0.18, 0.01), '#2de0c7', 0, -0.5, -0.8, 1.79, -0.08, -0.3);
    k.glass(lath([[0, 0], [0.2, 0], [0.22, 0.05], [0.22, 0.42], [0.16, 0.48], [0.16, 0.52], [0, 0.52]], 18), 0.9, 1.23, 0);
    for (let i = 0; i < 6; i++) k.metal(cyl(0.07, 0.07, 0.025, 14), '#ffc83d', 0.85 + (i % 2) * 0.08, 1.27 + i * 0.05, (i % 3) * 0.04 - 0.04, 0.3 * (i % 2), 0, 0.2);
  });
  // Glowing coin sign over the counter.
  k.decal(AT.shopSign, 3.4, 1.7, 1.4, 2.6, 4.6, 0.1);
  // Shelf with helmets on the back wall.
  k.r(rbox(4.2, 0.12, 0.7, 0.04, 1), '#fff6e0', P.none, SELF, 7.4, 2.6, 0.38);
  const hcols = ['#ff7ad9', '#4c7dff', '#ffc83d', '#2ed47a'];
  hcols.forEach((c, i) => {
    const x = 5.8 + i * 1.05;
    k.paint(dome(0.36, 0.38, 0.36, 14, 6), c, x, 2.68, 0.4);
    k.paint(sph(0.24, 0.17, 0.08, 10, 6), '#20124d', x, 2.86, 0.68);
    k.paint(tor(0.36, 0.05, 4, 16), tint(c, 0.3), x, 2.69, 0.4, H);
  });
  poster(k, 3, 1.6, 7.2, 4.6, 0.08, 0);
  // Outfit rack with capes and scarves along the right wall.
  k.at(w - 0.9, 0, 4.3, -H, 1, () => {
    for (const sx of [-1.4, 1.4]) k.metal(cyl(0.04, 0.05, 2.2, 8), '#c9d2ee', sx, 1.1, 0);
    k.metal(cyl(0.035, 0.035, 2.9, 8), '#c9d2ee', 0, 2.18, 0, 0, 0, H);
    for (const sx of [-1.4, 1.4]) k.metal(rbox(0.6, 0.06, 0.5, 0.02, 1), '#5a6080', sx, 0.04, 0);
    const outfits: Array<[string, boolean]> = [['#ff5d73', true], ['#6b3fd4', true], ['#ffc83d', false], ['#2de0c7', true], ['#ff9f43', false], ['#4c7dff', true]];
    outfits.forEach(([c, cape], i) => {
      const x = -1.15 + i * 0.46;
      k.metal(tor(0.07, 0.012, 4, 10, Math.PI), '#dfe5f5', x, 2.2, 0);
      k.metal(box(0.42, 0.025, 0.025), '#dfe5f5', x, 2.08, 0, 0, H);
      if (cape) {
        const s = new Shape();
        s.moveTo(-0.2, 0);
        s.lineTo(0.2, 0);
        s.quadraticCurveTo(0.34, -0.7, 0.3, -1.2);
        s.quadraticCurveTo(0, -1.3, -0.3, -1.2);
        s.quadraticCurveTo(-0.34, -0.7, -0.2, 0);
        k.paint(ext(s, 0.05, 0, 5), c, x, 2.08, 0, 0, H);
        k.paint(flatStar(0.1, 0.03), '#fff6e0', x, 1.55, 0, 0, H);
      } else {
        k.paint(rbox(0.06, 1.1, 0.26, 0.03, 1), c, x, 1.55, 0);
        for (let j = 0; j < 3; j++) k.paint(box(0.07, 0.06, 0.27), '#fff6e0', x, 1.3 + j * 0.25, 0);
      }
    });
  });
  // Two mannequins showing outfits.
  const mannequin = (x: number, z: number, suit: string, extra: string, cape: boolean) => {
    k.at(x, 0, z, 0.3, 1, () => {
      k.metal(lath([[0.32, 0], [0.32, 0.05], [0.06, 0.1], [0, 0.1]], 18), '#5a6080');
      k.metal(cyl(0.04, 0.04, 0.6, 8), '#c9d2ee', 0, 0.4, 0);
      k.paint(caps2(0.26, 0.55), suit, 0, 1.1, 0);
      k.paint(sph(0.24, 0.24, 0.24, 16, 12), '#f4f7ff', 0, 1.72, 0);
      k.paint(sph(0.17, 0.12, 0.06, 12, 8), '#20124d', 0, 1.74, 0.2);
      if (cape) {
        const s = new Shape();
        s.moveTo(-0.24, 0);
        s.lineTo(0.24, 0);
        s.quadraticCurveTo(0.4, -0.6, 0.36, -1.0);
        s.quadraticCurveTo(0, -1.08, -0.36, -1.0);
        s.quadraticCurveTo(-0.4, -0.6, -0.24, 0);
        k.paint(ext(s, 0.05, 0, 5), extra, 0, 1.46, -0.27, -0.12);
      } else {
        k.paint(tor(0.22, 0.08, 8, 20), extra, 0, 1.46, 0, H);
        k.paint(rbox(0.16, 0.5, 0.06, 0.03, 1), extra, 0.1, 1.2, 0.26, 0, 0, 0.15);
      }
    });
  };
  mannequin(5.2, 2.3, '#4c7dff', '#ff5d73', true);
  mannequin(9.6, 1.8, '#fff6e0', '#ffc83d', false);
  // Try-on stage with a mirror.
  const sx = 7.8;
  const sz = 5.5;
  k.paint(lath([[0, 0], [1.1, 0], [1.15, 0.05], [1.15, 0.28], [1.08, 0.35], [0, 0.35]], 40), '#ff7ad9', sx, 0, sz);
  k.blink(tor(1.13, 0.035, 6, 48), '#ffe066', 0, -0.5, sx, 0.2, sz, H);
  k.decalGeo(new CircleGeometry(0.95, 40), AT.padMark, 0, '#ffffff', sx, 0.36, sz, -H);
  const ov = new Shape();
  ov.absellipse(0, 0, 0.62, 1.05, 0, Math.PI * 2, false, 0);
  k.at(sx + 0.3, 0, sz - 1.9, -0.2, 1, () => {
    k.paint(ext(ov, 0.1, 0.06, 32), '#ffc83d', 0, 1.6, 0);
    const inner = new Shape();
    inner.absellipse(0, 0, 0.52, 0.95, 0, Math.PI * 2, false, 0);
    k.metal(ext(inner, 0.02, 0, 32), '#e8f4ff', 0, 1.6, 0.07);
    for (const s of [-1, 1]) k.metal(cyl(0.035, 0.035, 0.6, 8), '#c9d2ee', s * 0.4, 0.3, -0.05, 0, 0, s * 0.25);
  });
  // Ceiling lights.
  for (const x of [3, 8]) k.glow(rbox(1.6, 0.08, 1.6, 0.3, 1), '#f4fbff', x, RH - 0.08, 4.4);
}

/** Friendly cargo crate, 1 × 0.96 × 0.86, bottom center origin. */
function crate(k: AKit): void {
  const body = k.paint(rbox(0.96, 0.96, 0.86, 0.09, 1), '#ff9f43', 0, 0.48, 0);
  k.grad(body, '#e9782a', '#ffb560', 0, 1);
  k.paint(box(0.66, 0.6, 0.04), '#ffd25a', 0, 0.46, 0.44);
  k.paint(flatStar(0.17, 0.05), '#ff7a3a', 0, 0.42, 0.47);
  k.glow(box(0.5, 0.07, 0.03), '#4dd4ff', 0, 0.72, 0.465);
  for (const sx of [-1, 1]) k.metal(box(0.08, 0.98, 0.88), '#dfe5f5', sx * 0.44, 0.48, 0);
}

/** Capsule-ish torso (a rounded box would look boxy). */
function caps2(r: number, h: number): BufferGeometry {
  return lath([[0, -h / 2 - r * 0.6], [r * 0.6, -h / 2 - r * 0.45], [r, -h / 2], [r * 1.05, h / 4], [r * 0.85, h / 2], [r * 0.4, h / 2 + r * 0.25], [0, h / 2 + r * 0.3]], 18);
}

function lobby(k: AKit): void {
  const w = RW;
  shell(k, w, RH, RD, { wall: '#fff0c2', wallPat: P.siding, lower: '#7b4ff0', lowerPat: P.none, lowerH: 1.3, floor: '#9a7ae6', floorPat: P.tiles, ceil: '#fff8e8', trim: '#ffc83d' });
  // Entrance: glass double doors in the back wall with a round transom.
  const dx = 2.8;
  k.r(rbox(3.2, 4.6, 0.3, 0.1, 1), '#6b3fd4', P.none, SELF, dx, 2.3, 0.1);
  k.paint(rbox(2.9, 0.12, 0.34, 0.04, 1), '#ffc83d', dx, 3.4, 0.12);
  k.decal(AT.doorView, 2.6, 3.3, 0.95, dx, 1.7, 0.27);
  for (const s of [-1, 1]) {
    const cx = dx + s * 0.68;
    for (const sx of [-1, 1]) k.paint(box(0.13, 3.3, 0.14), '#fff6e0', cx + sx * 0.6, 1.68, 0.32);
    for (const y of [0.1, 1.15, 3.26]) k.paint(box(1.3, 0.13, 0.14), '#fff6e0', cx, y, 0.32);
    k.glass(box(1.08, 3.1, 0.03), cx, 1.68, 0.32);
    k.metal(cyl(0.035, 0.035, 0.7, 8), '#ffc83d', dx + s * 0.2, 1.65, 0.42);
  }
  const tr = new CircleGeometry(1.25, 32, 0, Math.PI);
  k.decalGeo(tr, AT.window, 0.8, '#ffffff', dx, 3.55, 0.3);
  k.r(box(2.2, 0.03, 1.2), '#ff7ad9', P.carpet, SELF, dx, 0.03, 1.2);
  k.paint(star(0.3, 0.02), '#ffe066', dx, 0.055, 1.2, -H);
  // The Academy crest on the wall.
  k.r(cyl(1.65, 1.65, 0.12, 48), '#fff6e0', P.none, SELF, 7.6, 4.4, 0.06, H);
  k.decal(AT.logo, 3.2, 3.2, 1.15, 7.6, 4.3, 0.14);
  // Reception desk.
  k.at(6.6, 0, 4.4, 0, 1, () => {
    const d = new Shape();
    d.moveTo(-1.8, 0.45);
    d.quadraticCurveTo(0, -0.2, 1.8, 0.45);
    d.lineTo(1.8, -0.45);
    d.quadraticCurveTo(0, -1.1, -1.8, -0.45);
    d.closePath();
    const body = ext(d, 1.1, 0.06, 16);
    body.rotateX(-H);
    k.paint(body, '#6b3fd4', 0, 0.55, 0);
    const top = ext(d, 0.1, 0.04, 16);
    top.rotateX(-H);
    k.paint(top, '#fff6e0', 0, 1.15, 0.0);
    k.blink(box(3.2, 0.06, 0.04), '#2de0c7', 0.2, -0.4, 0, 0.8, 0.35);
    k.paint(rbox(0.7, 0.45, 0.06, 0.04, 1), '#20124d', -0.6, 1.45, -0.25, -0.25);
    k.decal(AT.rocketScreen, 0.6, 0.36, 1.4, -0.6, 1.45, -0.21, -0.25);
    k.paint(cyl(0.14, 0.12, 0.2, 14), '#ff9f43', 0.8, 1.3, -0.1);
    for (let i = 0; i < 3; i++) k.paint(sph(0.09, 0.09, 0.09, 8, 6), ['#ff5d73', '#ffe066', '#ff7ad9'][i], 0.75 + i * 0.05, 1.45 + (i % 2) * 0.06, -0.12 + i * 0.03);
  });
  // Welcome screen on the right wall.
  k.paint(rbox(0.12, 1.7, 3.1, 0.06, 1), '#20124d', w - 0.08, 3.5, 3.8);
  k.decal(AT.welcome, 2.9, 1.5, 1.3, w - 0.16, 3.5, 3.8, 0, -H);
  // Tuggy's charging dock in the back-right corner.
  k.at(8.9, 0, 2.8, 0, 1, () => {
    k.paint(lath([[0, 0], [0.95, 0], [1.0, 0.06], [0.95, 0.16], [0, 0.16]], 32), '#4a4e8a');
    k.blink(tor(0.82, 0.04, 6, 36), '#ffe066', 0, -0.7, 0, 0.17, 0, H);
    k.glow(cyl(0.6, 0.6, 0.01, 28), tint('#ffe066', 0).multiplyScalar(0.9), 0, 0.17, 0);
    k.paint(rbox(0.4, 2.0, 0.3, 0.1, 1), '#fff6e0', 0.9, 1.0, -0.8);
    k.blink(box(0.18, 0.5, 0.02), '#8cff66', 0, -0.9, 0.9, 1.4, -0.64);
    k.paint(star(0.16, 0.04), '#ffc83d', 0.9, 1.85, -0.64);
  });
  // Big plants by the doors and a bench on the left wall.
  k.at(0.65, 0, 0.75, 0, 1, () => potPlant(k, 1.8, '#ff7ad9', '#3fbf5a', 7));
  k.at(4.95, 0, 0.75, 0, 1, () => potPlant(k, 1.8, '#ff7ad9', '#3fbf5a', 8));
  k.at(0.55, 0, 5.2, H, 1, () => {
    k.paint(rbox(2.6, 0.14, 0.7, 0.05, 1), '#ff9f43', 0, 0.58, 0);
    k.paint(rbox(2.6, 0.55, 0.12, 0.05, 1), '#ff9f43', 0, 0.95, -0.32, -0.1);
    for (const s of [-1.1, 1.1]) k.metal(rbox(0.1, 0.5, 0.6, 0.03, 1), '#5a6080', s, 0.26, 0);
  });
  // Star chandelier.
  k.metal(cyl(0.02, 0.02, 1.0, 6), '#3a3f66', 4.6, RH - 0.5, 4.6);
  k.glow(star(0.55, 0.14), '#fff1b8', 4.6, RH - 1.2, 4.6);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.glow(sph(0.1, 0.1, 0.1, 8, 6), '#fff1b8', 4.6 + Math.cos(a) * 0.95, RH - 1.4, 4.6 + Math.sin(a) * 0.95);
    k.metal(cyl(0.012, 0.012, 1.3, 4), '#3a3f66', 4.6 + Math.cos(a) * 0.95, RH - 0.75, 4.6 + Math.sin(a) * 0.95);
  }
}

function hangar(k: AKit): void {
  const w = HANGAR_X[1] - HANGAR_X[0];
  const h = CEIL - F0;
  const b = new Box3(new Vector3(0, 0, 0), new Vector3(w, h, RD));
  const e = 0.012;
  // Floor with a hazard border, walls of metal panels (the right wall has the big door).
  k.ao(k.r(panel(w, RD, 14, 9), '#767ca2', P.concrete, SELF * 0.6, w / 2, e, RD / 2, -H), b, 0.4, 1.2);
  k.r(box(w - 0.6, 0.02, 0.5), '#ffc83d', P.hazard, SELF * 0.6, w / 2, 0.025, 0.55);
  k.r(box(0.5, 0.02, RD - 0.8), '#ffc83d', P.hazard, SELF * 0.6, 0.55, 0.025, RD / 2 + 0.2);
  // Painted rings around the turntable and guide lines to the door.
  k.r(new RingGeometry(3.0, 3.25, 64), '#ffc83d', P.none, SELF, ARCH.x - HANGAR_X[0], 0.03, 4.4, -H);
  k.r(new RingGeometry(3.45, 3.55, 64), '#fff6e0', P.none, SELF, ARCH.x - HANGAR_X[0], 0.03, 4.4, -H);
  k.glow(box(4.0, 0.02, 0.1), '#ffe066', w - 2.0, 0.03, 4.4);
  for (let i = 0; i < 3; i++) k.glow(new PlaneGeometry(0.42, 0.42), '#ffe066', w - 3.4 + i * 1.3, 0.035, 4.4, -H, 0, Math.PI / 4);
  const wallLo = '#5d68b4';
  const wallC = '#a9b4e8';
  k.ao(k.r(panel(w, 2.4, 14, 2), wallLo, P.panels, SELF * 0.6, w / 2, 1.2, e), b);
  k.ao(k.r(panel(w, h - 2.4, 14, 10), wallC, P.panels, SELF * 0.35, w / 2, 2.4 + (h - 2.4) / 2, e), b);
  k.ao(k.r(panel(RD, 2.4, 9, 2), wallLo, P.panels, SELF * 0.6, e, 1.2, RD / 2, 0, H), b);
  k.ao(k.r(panel(RD, h - 2.4, 9, 10), wallC, P.panels, SELF * 0.35, e, 2.4 + (h - 2.4) / 2, RD / 2, 0, H), b);
  k.r(box(w, 0.36, 0.06), '#ff9f43', P.none, SELF, w / 2, 2.55, 0.04);
  k.r(box(0.06, 0.36, RD), '#ff9f43', P.none, SELF, 0.04, 2.55, RD / 2);
  // Catwalk along the back wall with a ladder, railing and a few barrels.
  const cy = 6.6;
  k.r(box(w - 0.4, 0.16, 1.5), '#4a5288', P.panels, SELF * 0.5, w / 2, cy, 0.8);
  k.r(box(w - 0.4, 0.22, 0.08), '#ffc83d', P.none, SELF, w / 2, cy - 0.04, 1.56);
  for (let i = 0; i <= 10; i++) {
    const x = 0.4 + i * ((w - 0.8) / 10);
    k.metal(box(0.06, 1.0, 0.06), '#ffc83d', x, cy + 0.55, 1.52);
    if (i % 2 === 0) k.metal(box(0.08, 0.08, 1.4), '#5a6080', x, cy - 0.5, 0.8, -0.6);
  }
  k.metal(box(w - 0.6, 0.07, 0.07), '#ffc83d', w / 2, cy + 1.05, 1.52);
  k.metal(box(w - 0.6, 0.05, 0.05), '#ffc83d', w / 2, cy + 0.58, 1.52);
  for (const sx of [-0.3, 0.3]) k.metal(box(0.07, cy + 1.0, 0.07), '#ffc83d', 4.2 + sx, (cy + 1.0) / 2, 1.7);
  for (let i = 0; i < 11; i++) k.metal(box(0.6, 0.05, 0.05), '#ffc83d', 4.2, 0.4 + i * 0.6, 1.7);
  for (const [x, c] of [[6.4, '#4c7dff'], [7.1, '#ff5d73'], [11.6, '#2ed47a']] as Array<[number, string]>) {
    k.paint(cyl(0.3, 0.3, 0.8, 14), c, x, cy + 0.48, 0.6);
    k.paint(cyl(0.31, 0.31, 0.08, 14), '#fff6e0', x, cy + 0.6, 0.6);
  }
  // Big banners hanging from the arch.
  const bannerCols = ['#2de0c7', '#ff7ad9'];
  [w / 2 - 5.4, w / 2 + 5.4].forEach((x, i) => {
    const top = archInnerY(HANGAR_X[0] + x) - F0;
    k.metal(cyl(0.04, 0.04, 1.8, 8), '#dfe5f5', x, top - 0.6, 0.6, 0, 0, H);
    const s = new Shape();
    s.moveTo(-0.75, 0);
    s.lineTo(0.75, 0);
    s.lineTo(0.75, -3.2);
    s.lineTo(0, -2.7);
    s.lineTo(-0.75, -3.2);
    s.closePath();
    k.paint(ext(s, 0.04, 0, 2), bannerCols[i], x, top - 0.65, 0.6);
    k.paint(flatStar(0.45, 0.05), '#fff6e0', x, top - 1.9, 0.65);
  });
  // Right wall pieces around the door (local z: door from DOOR_Z[0] - BACK to DOOR_Z[1] - BACK).
  const d0 = DOOR_Z[0] - BACK;
  const d1 = DOOR_Z[1] - BACK;
  const dt = DOOR_TOP - F0;
  k.r(panel(d0, h, 2, 12), wallC, P.panels, SELF * 0.35, w - e, h / 2, d0 / 2, 0, -H);
  k.r(panel(RD - d1, h, 2, 12), wallC, P.panels, SELF * 0.35, w - e, h / 2, (d1 + RD) / 2, 0, -H);
  k.r(panel(d1 - d0, h - dt, 4, 4), wallC, P.panels, SELF * 0.35, w - e, (dt + h) / 2, (d0 + d1) / 2, 0, -H);
  // Hazard door frame and the rolled-up door.
  const fw = 0.4;
  k.r(box(0.3, dt + fw, fw), '#ffc83d', P.hazard, SELF, w - 0.1, (dt + fw) / 2, d0 - fw / 2 + 0.01);
  k.r(box(0.3, dt + fw, fw), '#ffc83d', P.hazard, SELF, w - 0.1, (dt + fw) / 2, d1 + fw / 2 - 0.01);
  k.r(box(0.3, fw, d1 - d0 + fw * 2), '#ffc83d', P.hazard, SELF, w - 0.1, dt + fw / 2, (d0 + d1) / 2);
  k.metal(cyl(0.55, 0.55, d1 - d0 + 0.6, 24), '#8a94c0', w - 0.7, dt + 0.9, (d0 + d1) / 2, H);
  for (let i = 0; i < 2; i++) k.blink(sph(0.16, 0.16, 0.16, 10, 8), '#ff9f43', i * 0.5, 1.2, w - 0.25, dt + 0.75, i ? d1 + 0.5 : d0 - 0.5);
  // Base trim.
  k.r(box(w, 0.3, 0.1), '#5a6290', P.none, SELF, w / 2, 0.15, 0.06);
  k.r(box(0.1, 0.3, RD), '#5a6290', P.none, SELF, 0.06, 0.15, RD / 2);
  // HANGAR 1 sign high on the back wall.
  k.r(rbox(7.4, 2.0, 0.16, 0.12, 1), '#20124d', P.none, 0, w / 2, h - 2.6, 0.08);
  k.decal(AT.hangarSign, 7.0, 1.75, 1.25, w / 2, h - 2.6, 0.18);
  // Tool wall on the left: pegboard with tools.
  k.at(0.1, 0, 3.2, H, 1, () => {
    k.r(rbox(3.6, 2.0, 0.08, 0.04, 1), '#ffb560', P.dots, SELF, 0, 2.6, 0);
    const tools: Array<[number, number, string, number]> = [[-1.4, 2.9, '#ff5d73', 0.4], [-0.9, 2.7, '#4c7dff', -0.2], [-0.3, 3.0, '#2ed47a', 0], [0.4, 2.6, '#ffc83d', 0.5], [1.1, 2.9, '#9b6bff', -0.4]];
    for (const [x, y, c, r] of tools) {
      k.metal(box(0.08, 0.8, 0.05), '#c9d2ee', x, y, 0.07, 0, 0, r);
      k.paint(rbox(0.18, 0.3, 0.08, 0.04, 1), c, x - Math.sin(r) * -0.35, y - Math.cos(r) * 0.35, 0.08, 0, 0, r);
    }
    k.metal(tor(0.2, 0.05, 6, 16, Math.PI * 1.6), '#c9d2ee', 0.9, 2.1, 0.08);
    k.metal(tor(0.15, 0.04, 6, 16, Math.PI * 1.6), '#ff9f43', -1.1, 2.0, 0.08);
  });
  // Rolling toolbox.
  k.at(0.9, 0, 6.4, H, 1, () => {
    k.paint(rbox(1.4, 1.2, 0.7, 0.06, 1), '#ff5d73', 0, 0.7, 0);
    for (let i = 0; i < 4; i++) {
      k.paint(box(1.28, 0.02, 0.02), '#c43a50', 0, 0.35 + i * 0.26, 0.36);
      k.metal(box(0.4, 0.04, 0.05), '#dfe5f5', 0, 0.46 + i * 0.26, 0.38);
    }
    for (const s of [-0.55, 0.55]) k.metal(cyl(0.08, 0.08, 0.06, 12), '#3a3f66', s, 0.08, 0.2, 0, 0, H);
  });
  // Crates in the back-left corner.
  k.at(1.1, 0, 0.9, 0.2, 1.5, () => crate(k));
  k.at(2.7, 0, 0.9, -0.1, 1.2, () => crate(k));
  k.at(1.4, 1.5, 0.9, 0.5, 1, () => crate(k));
  // Fuel tanks in the back-right corner.
  for (const [x, z, s] of [[w - 1.0, 0.9, 1], [w - 2.3, 0.75, 0.85]] as Array<[number, number, number]>) {
    k.paint(caps2(0.55 * s, 2.0 * s), '#ff9f43', x, 1.45 * s, z);
    k.paint(box(1.16 * s, 0.25 * s, 1.16 * s), '#fff6e0', x, 1.7 * s, z);
    k.metal(cyl(0.12, 0.12, 0.3, 10), '#c9d2ee', x, 2.95 * s, z);
    k.metal(rbox(1.0 * s, 0.12, 1.0 * s, 0.04, 1), '#5a6080', x, 0.06, z);
  }
  // Crane rail across the hangar (the trolley and hook are animated separately).
  k.metal(rbox(w - 0.4, 0.5, 0.45, 0.05, 1), '#ffc83d', w / 2, h - 1.6, 2.2);
  k.metal(box(w - 0.6, 0.08, 0.6), '#5a6080', w / 2, h - 1.9, 2.2);
  // Light bars hanging from the arch.
  for (const z of [2.0, 5.0, 7.6]) {
    for (const x of [w / 2 - 3.5, w / 2 + 3.5]) {
      const top = archInnerY(HANGAR_X[0] + x) - F0;
      const len = top - (h + 0.8);
      k.metal(cyl(0.015, 0.015, len, 4), '#3a3f66', x, h + 0.8 + len / 2, z);
      k.metal(rbox(3.0, 0.16, 0.4, 0.05, 1), '#5a6080', x, h + 0.75, z);
      k.glow(box(2.8, 0.04, 0.26), '#e8f4ff', x, h + 0.66, z);
    }
  }
  // Work bench (front right).
  k.at(w - 1.6, 0, 7.4, -0.25, 1, () => {
    k.paint(rbox(2.2, 0.12, 0.9, 0.04, 1), '#4c7dff', 0, 0.95, 0);
    for (const sx of [-1, 1]) k.metal(rbox(0.1, 0.9, 0.8, 0.03, 1), '#5a6080', sx * 0.95, 0.45, 0);
    k.paint(rbox(0.6, 0.35, 0.4, 0.06, 1), '#ffc83d', -0.5, 1.18, 0);
    k.metal(cyl(0.12, 0.12, 0.5, 12), '#c9d2ee', 0.5, 1.12, 0, 0, 0, H);
    k.blink(sph(0.05, 0.05, 0.05, 8, 6), '#8cff66', 0.3, 1.0, -0.5, 1.4, 0.21);
  });
}

/** All seven rooms, in place. */
export function buildRooms(k: AKit): void {
  k.at(COLS[0][0], F1, BACK, 0, 1, () => missionControl(k));
  k.at(COLS[1][0], F1, BACK, 0, 1, () => library(k));
  k.at(COLS[2][0], F1, BACK, 0, 1, () => trophyHall(k));
  k.at(COLS[0][0], F0, BACK, 0, 1, () => lounge(k));
  k.at(COLS[1][0], F0, BACK, 0, 1, () => shop(k));
  k.at(COLS[2][0], F0, BACK, 0, 1, () => lobby(k));
  k.at(HANGAR_X[0], F0, BACK, 0, 1, () => hangar(k));
}

