import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Mesh,
  Points,
  Shape,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { Rng } from '../../core/rng';
import { OUTPUT_GLSL } from '../materials';
import { box, cyl, dishGeo, dome, ext, hot, lath, rbox, rock, roundRectShape, sph, tor } from '../surface/propKit';
import { AT, sub } from './academyAtlas';
import { P, type AKit } from './academyKit';
import { ARCH, BACK, CEIL, COLS, DOOR_TOP, DOOR_Z, F0, GANTRY, HANGAR_X, LEFT_OUT, PAD, RH, RIGHT_OUT, ROOF, SLAB, WT } from './academyLayout';

/**
 * Everything around the rooms: the building's structure (walls, slabs, roof, the hangar's barrel
 * roof, the cut-away front trims), the roof (observatory dome, antennas, the glowing sign), the
 * grassy hill with paths, trees, lamps and flowers, the launch pad and gantry, distant hills, the
 * dusk sky with stars, and soft glow halos (one Points draw for all of them).
 */

const H = Math.PI / 2;
const CREAM = '#fff6e0';
const PURPLE = '#6b3fd4';
const TEAL = '#2de0c7';

// ------------------------------------------------------------------ structure

export function buildStructure(k: AKit): void {
  const zf = 0.3;
  const mainR = COLS[2][1] + WT;
  // Foundation plinth with steps in front of the lobby and the hangar.
  k.r(rbox(RIGHT_OUT - LEFT_OUT + 0.8, F0 + 0.4, -BACK + 1.6, 0.1, 1), '#b9a8e0', P.bricks, 0, (LEFT_OUT + RIGHT_OUT) / 2, (F0 - 0.4) / 2, (BACK - 0.8 + 0.8) / 2);
  for (let i = 0; i < 2; i++) k.r(rbox(5.2 - i * 0.6, 0.25, 0.7, 0.05, 1), '#d8cdf2', P.none, 0, (COLS[2][0] + COLS[2][1]) / 2, 0.12 + i * 0.25 - 0.05, 1.15 - i * 0.35);
  // Slab between the floors (main block) with a candy stripe on its cut face.
  k.r(box(mainR - LEFT_OUT, SLAB, -BACK + WT + zf), CREAM, P.none, 0.1, (LEFT_OUT + mainR) / 2, F0 + RH + SLAB / 2, (BACK - WT + zf) / 2);
  k.r(box(mainR - LEFT_OUT - 0.1, 0.2, 0.06), PURPLE, P.none, 0.2, (LEFT_OUT + mainR) / 2, F0 + RH + SLAB / 2, zf + 0.03);
  // Roof slab over the main block with an overhang and a parapet.
  const roofW = mainR - LEFT_OUT + 0.6;
  k.r(rbox(roofW, SLAB + 0.1, -BACK + WT + 0.9, 0.08, 1), '#5b34c8', P.none, 0.15, (LEFT_OUT + mainR) / 2, CEIL + (SLAB + 0.1) / 2, (BACK - WT + 0.6) / 2);
  k.r(box(roofW - 0.2, 0.08, 0.04), '#ffe066', P.none, 0.3, (LEFT_OUT + mainR) / 2, CEIL + 0.42, 0.62);
  k.r(box(roofW - 0.4, 0.2, -BACK + WT), '#e8e0f8', P.concrete, 0, (LEFT_OUT + mainR) / 2, ROOF + 0.02, (BACK - WT) / 2);
  for (const [x, z, w, d] of [[(LEFT_OUT + mainR) / 2, 0.35, roofW - 0.3, 0.3], [(LEFT_OUT + mainR) / 2, BACK - WT + 0.15, roofW - 0.3, 0.3], [LEFT_OUT - 0.15, (BACK - WT + 0.5) / 2, 0.3, -BACK + WT + 0.2]] as Array<[number, number, number, number]>) {
    k.r(rbox(w, 0.6, d, 0.08, 1), CREAM, P.none, 0.1, x, ROOF + 0.3, z);
  }
  // Walls: outer left, between rooms, hangar sides, back.
  const wallZ = (BACK - WT + zf) / 2;
  const wallD = -BACK + WT + zf;
  k.r(box(WT, ROOF - F0, wallD), CREAM, P.siding, 0.05, LEFT_OUT + WT / 2, (F0 + ROOF) / 2, wallZ);
  k.r(box(WT, CEIL - F0, wallD), CREAM, P.none, 0.05, (COLS[0][1] + COLS[1][0]) / 2, (F0 + CEIL) / 2, wallZ);
  k.r(box(WT, CEIL - F0, wallD), CREAM, P.none, 0.05, (COLS[1][1] + COLS[2][0]) / 2, (F0 + CEIL) / 2, wallZ);
  k.r(box(WT, ROOF - F0, wallD), CREAM, P.none, 0.05, (COLS[2][1] + HANGAR_X[0]) / 2, (F0 + ROOF) / 2, wallZ);
  k.r(box(-LEFT_OUT + HANGAR_X[0], ROOF - F0, WT), CREAM, P.siding, 0, (LEFT_OUT + HANGAR_X[0]) / 2, (F0 + ROOF) / 2, BACK - WT / 2);
  k.r(box(RIGHT_OUT - HANGAR_X[0], CEIL - F0, WT), '#dfe4f6', P.panels, 0, (HANGAR_X[0] + RIGHT_OUT) / 2, (F0 + CEIL) / 2, BACK - WT / 2);
  // Hangar right wall around the big door.
  const rx = HANGAR_X[1] + WT / 2;
  const back0 = BACK - WT;
  k.r(box(WT, CEIL - F0, DOOR_Z[0] - back0), '#dfe4f6', P.panels, 0, rx, (F0 + CEIL) / 2, (back0 + DOOR_Z[0]) / 2);
  k.r(box(WT, CEIL - F0, zf - DOOR_Z[1]), '#dfe4f6', P.panels, 0, rx, (F0 + CEIL) / 2, (DOOR_Z[1] + zf) / 2);
  k.r(box(WT, CEIL - DOOR_TOP, DOOR_Z[1] - DOOR_Z[0]), '#dfe4f6', P.panels, 0, rx, (DOOR_TOP + CEIL) / 2, (DOOR_Z[0] + DOOR_Z[1]) / 2);
  // Outside door frame (hazard) facing the pad.
  k.r(box(0.3, DOOR_TOP - F0 + 0.5, 0.5), '#ffc83d', P.hazard, 0.1, RIGHT_OUT + 0.12, (F0 + DOOR_TOP + 0.5) / 2, DOOR_Z[0] - 0.25);
  k.r(box(0.3, DOOR_TOP - F0 + 0.5, 0.5), '#ffc83d', P.hazard, 0.1, RIGHT_OUT + 0.12, (F0 + DOOR_TOP + 0.5) / 2, DOOR_Z[1] + 0.25);
  k.r(box(0.3, 0.5, DOOR_Z[1] - DOOR_Z[0] + 1), '#ffc83d', P.hazard, 0.1, RIGHT_OUT + 0.12, DOOR_TOP + 0.25, (DOOR_Z[0] + DOOR_Z[1]) / 2);
  // Front pillars at every wall end (rounded, colorful bands).
  const pillars: Array<[number, number, number, string]> = [
    [LEFT_OUT + WT / 2, F0, ROOF + 0.4, PURPLE],
    [(COLS[0][1] + COLS[1][0]) / 2, F0, CEIL, TEAL],
    [(COLS[1][1] + COLS[2][0]) / 2, F0, CEIL, '#ff7ad9'],
    [(COLS[2][1] + HANGAR_X[0]) / 2, F0, ROOF + 0.4, '#ffc83d'],
    [HANGAR_X[1] + WT / 2, F0, CEIL + 0.2, '#ff9f43'],
  ];
  for (const [x, y0, y1, c] of pillars) {
    k.r(rbox(WT + 0.32, y1 - y0, 0.6, 0.14, 1), CREAM, P.none, 0.12, x, (y0 + y1) / 2, zf + 0.05);
    for (const yb of [y0 + 0.6, F0 + RH + SLAB / 2, Math.min(y1 - 0.5, CEIL - 0.3)]) k.paint(rbox(WT + 0.4, 0.3, 0.66, 0.1, 1), c, x, yb, zf + 0.05);
    k.paint(sph(0.34, 0.24, 0.34, 12, 6), c, x, y1 + 0.1, zf + 0.05);
  }
  // Room name plaques on the cut faces (upper rooms on the roof band, lower rooms on the slab).
  const plaque = (i: number, x: number, y: number) => {
    k.paint(rbox(3.0, 0.62, 0.12, 0.28, 1), '#20124d', x, y, zf + 0.33);
    k.decal(sub(AT.plaques, i, 1, 7), 2.85, 0.53, 1.35, x, y, zf + 0.4);
  };
  plaque(0, (COLS[0][0] + COLS[0][1]) / 2, CEIL + 0.35);
  plaque(1, (COLS[1][0] + COLS[1][1]) / 2, CEIL + 0.35);
  plaque(2, (COLS[2][0] + COLS[2][1]) / 2, CEIL + 0.35);
  plaque(3, (COLS[0][0] + COLS[0][1]) / 2, F0 + RH + SLAB / 2);
  plaque(4, (COLS[1][0] + COLS[1][1]) / 2, F0 + RH + SLAB / 2);
  plaque(5, (COLS[2][0] + COLS[2][1]) / 2, F0 + RH + SLAB / 2);
  buildArch(k, zf);
  plaque(6, ARCH.x, ARCH.y + ARCH.ro - 1.6);
}

/** The hangar's barrel roof: a thick arched shell with ribs, closed at the back. */
function buildArch(k: AKit, zf: number): void {
  const a0 = Math.acos((HANGAR_X[1] - ARCH.x) / ARCH.ri);
  const ao = Math.acos((RIGHT_OUT + 0.1 - ARCH.x) / ARCH.ro);
  const s = new Shape();
  s.absarc(0, 0, ARCH.ro, ao, Math.PI - ao, false);
  s.absarc(0, 0, ARCH.ri, Math.PI - a0, a0, true);
  s.closePath();
  const depth = -BACK + WT + zf + 0.3;
  const g = ext(s, depth, 0.08, 48);
  k.r(g, TEAL, P.ribs, 0, ARCH.x, ARCH.y, (BACK - WT + zf + 0.3) / 2);
  k.recolor(g, (x, y, z, nx, ny, nz) => {
    if (Math.abs(nz) > 0.7) return z > -1 ? PURPLE : '#4a2aa0';
    return (x - ARCH.x) * nx + (y - ARCH.y) * ny > 0 ? '#26bfae' : '#c9d0ec';
  });
  // Ribs on top.
  for (let i = 0; i < 5; i++) {
    const z = BACK + 0.6 + i * ((-BACK - 0.6) / 4);
    const rib = new Shape();
    rib.absarc(0, 0, ARCH.ro + 0.18, ao + 0.02, Math.PI - ao - 0.02, false);
    rib.absarc(0, 0, ARCH.ro - 0.05, Math.PI - ao - 0.02, ao + 0.02, true);
    rib.closePath();
    k.paint(ext(rib, 0.3, 0, 24), i === 4 ? '#ffc83d' : '#1fa596', ARCH.x, ARCH.y, z);
  }
  // Back gable under the arch.
  const gable = new Shape();
  gable.moveTo(-(HANGAR_X[1] - ARCH.x) - 0.2, CEIL - ARCH.y - 0.01);
  gable.absarc(0, 0, ARCH.ri + 0.05, Math.PI - a0, a0, true);
  gable.closePath();
  k.r(ext(gable, WT, 0, 40), '#c9d0ec', P.panels, 0, ARCH.x, ARCH.y, BACK - WT / 2);
  // Big round window in the gable (glowing, seen from inside).
  k.decalGeo(new CylinderGeometry(1.4, 1.4, 0.02, 36).rotateX(H), AT.window, 0.9, '#ffffff', ARCH.x, CEIL + 1.7, BACK + 0.05);
  k.metal(tor(1.45, 0.14, 8, 36), '#ffc83d', ARCH.x, CEIL + 1.7, BACK + 0.08);
  // Beacon and antenna on top.
  k.metal(cyl(0.06, 0.06, 2.0, 8), '#dfe5f5', ARCH.x + 3, ARCH.y + ARCH.ro - 0.3 + 1.0, -4);
  k.blink(sph(0.2, 0.2, 0.2, 12, 8), '#ff5d73', 0, 0.8, ARCH.x + 3, ARCH.y + ARCH.ro - 0.3 + 2.1, -4);
}

// ------------------------------------------------------------------ roof

export function buildRoof(k: AKit, halos: HaloList): void {
  const lib = (COLS[1][0] + COLS[1][1]) / 2;
  const y0 = ROOF + 0.1;
  // Observatory dome on a drum above the library.
  const dz = -4.6;
  k.r(cyl(3.7, 3.9, 1.6, 48), CREAM, P.siding, 0.05, lib, y0 + 0.8, dz);
  k.paint(cyl(3.95, 3.95, 0.3, 48), PURPLE, lib, y0 + 1.5, dz);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    k.blink(sph(0.09, 0.09, 0.09, 6, 4), '#ffe066', i / 12, -0.4, lib + Math.cos(a) * 3.97, y0 + 1.5, dz + Math.sin(a) * 3.97);
  }
  const dm = k.paint(dome(3.7, 3.5, 3.7, 32, 10), '#ece6ff', lib, y0 + 1.6, dz);
  k.grad(dm, '#cfc4f4', '#ffffff', y0 + 1.6, y0 + 5.1);
  // Ribs over the dome.
  for (let i = 0; i < 8; i++) {
    const g = new SphereGeometry(3.72, 2, 10, (i / 8) * Math.PI * 2 - 0.02, 0.04, 0, Math.PI / 2);
    g.scale(1, 3.5 / 3.7, 1);
    k.paint(g, '#b9a8f0', lib, y0 + 1.6, dz);
  }
  // The slit (dark band over the front-left) and the telescope poking out toward the sky.
  const slitAz = -0.35;
  const sg = new SphereGeometry(3.76, 6, 14, Math.PI / 2 + slitAz - 0.22, 0.44, 0.0, Math.PI / 2 + 0.02);
  sg.scale(1, 3.54 / 3.76, 1);
  k.paint(sg, '#1a1240', lib, y0 + 1.6, dz);
  k.at(lib, y0 + 2.4, dz, slitAz, 1, () => {
    k.metal(sph(0.6, 0.6, 0.6, 14, 10), '#5a6080', 0, 0, 0);
    const tube = new CylinderGeometry(0.42, 0.5, 4.6, 20);
    tube.translate(0, 2.0, 0);
    k.paint(tube, '#ffffff', 0, 0, 0.0, 0.85);
    const ring = new CylinderGeometry(0.56, 0.56, 0.35, 20);
    ring.translate(0, 4.2, 0);
    k.paint(ring, '#ff7ad9', 0, 0, 0, 0.85);
    const ring2 = new CylinderGeometry(0.53, 0.53, 0.25, 20);
    ring2.translate(0, 1.4, 0);
    k.paint(ring2, PURPLE, 0, 0, 0, 0.85);
  });
  // Radio mast and satellite dish above the trophy hall.
  const tx = (COLS[2][0] + COLS[2][1]) / 2;
  k.at(tx + 2.6, y0, -6.0, 0, 1, () => {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      k.metal(cyl(0.05, 0.06, 6.4, 6), '#dfe5f5', Math.cos(a) * 0.35, 3.2, Math.sin(a) * 0.35);
    }
    for (let j = 0; j < 7; j++) k.metal(tor(0.36, 0.03, 4, 12), '#ff9f43', 0, 0.6 + j * 0.85, 0, H);
    k.blink(sph(0.2, 0.2, 0.2, 12, 8), '#ff5d73', 0.3, 0.7, 0, 6.6, 0);
    k.metal(cyl(0.03, 0.03, 1.4, 6), '#dfe5f5', 0, 7.2, 0);
  });
  halos.add(tx + 2.6, y0 + 6.6, -6, '#ff5d73', 2.4);
  k.at(tx - 2.0, y0, -5.0, 0.5, 1, () => {
    k.metal(cyl(0.18, 0.28, 1.4, 12), '#c9d2ee', 0, 0.7, 0);
    k.metal(sph(0.3, 0.3, 0.3, 12, 8), '#5a6080', 0, 1.5, 0);
    k.at(0, 1.6, 0, 0, 1, () => {
      const d = dishGeo(1.6, 0.55, 0.06, 28);
      d.rotateX(-0.75);
      k.paint(d, '#ffffff', 0, 0, 0);
      const arm = new CylinderGeometry(0.04, 0.04, 1.3, 6);
      arm.translate(0, 0.65, 0);
      arm.rotateX(-0.75);
      k.metal(arm, '#5a6080', 0, 0, 0);
      k.blink(sph(0.12, 0.12, 0.12, 8, 6), '#4dd4ff', 0.6, -0.5, 0, 1.3 * Math.cos(0.75) * 1, 1.3 * Math.sin(0.75) * 1);
    });
  });
  // Solar panels on the back of the roof.
  for (let i = 0; i < 3; i++) {
    k.metal(rbox(2.4, 0.08, 1.4, 0.03, 1), '#2a4aa8', COLS[2][0] + 1.8 + i * 2.6, y0 + 0.9, BACK + 1.4, 0.45);
    k.metal(cyl(0.05, 0.05, 0.8, 6), '#c9d2ee', COLS[2][0] + 1.8 + i * 2.6, y0 + 0.4, BACK + 1.4);
  }
  // The glowing sign above Mission Control.
  const sx = (COLS[0][0] + COLS[0][1]) / 2 + 0.2;
  const sy = y0 + 3.05;
  const sz = -2.4;
  k.at(sx, 0, sz, 0.06, 1, () => {
    for (const px of [-3.2, 3.2]) {
      k.metal(rbox(0.3, 1.3, 0.3, 0.06, 1), '#5a6080', px, y0 + 0.65, -0.3);
      k.metal(box(0.08, 1.6, 0.08), '#5a6080', px, y0 + 0.9, -0.7, -0.6);
    }
    k.paint(ext(roundRectShape(10.6, 4.2, 0.9), 0.3, 0.1, 6), PURPLE, 0, sy, -0.2);
    k.paint(ext(roundRectShape(10.0, 3.6, 0.7), 0.1, 0, 6), '#20124d', 0, sy, 0.0);
    k.decal(AT.sign, 9.6, 3.75, 1.7, 0, sy, 0.12);
    // Marquee bulbs chasing around the frame.
    const n = 30;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const per = 2 * (10.2 + 3.8);
      let d = t * per;
      let x: number;
      let y: number;
      if (d < 10.2) [x, y] = [-5.1 + d, 1.9];
      else if ((d -= 10.2) < 3.8) [x, y] = [5.1, 1.9 - d];
      else if ((d -= 3.8) < 10.2) [x, y] = [5.1 - d, -1.9];
      else [x, y] = [-5.1, -1.9 + (d - 10.2)];
      k.blink(sph(0.1, 0.1, 0.08, 6, 4), '#fff1b8', (i % 3) / 3, 1.2, x, sy + y, 0.0);
    }
  });
  halos.add(sx, sy, sz + 0.6, '#ffd27a', 14, 0.22);
}

// ------------------------------------------------------------------ the hill

/** Terrain height: a flat hilltop around the building and pad, rolling slopes down all around. */
export function groundY(x: number, z: number): number {
  const px = Math.max(0, Math.abs(x - 8) - 44);
  const pf = Math.max(0, z - 15);
  const pb = Math.max(0, -26 - z);
  const d = Math.hypot(px, pf + pb);
  const bump = Math.sin(x * 0.07 + 1.3) * Math.sin(z * 0.09 + 0.4) * 1.6 + Math.sin(x * 0.023 - z * 0.031) * 3;
  const fall = d * d * 0.006 + d * 0.12;
  return -fall + bump * Math.min(1, d / 18);
}

function pathCenter(t: number): [number, number] {
  // From the foreground up to the lobby steps.
  const x = 1.0 + Math.sin(t * 2.4 + 0.3) * 4.5 * t;
  const z = 1.4 + t * 46;
  return [x, z];
}

export function buildGrounds(k: AKit, halos: HaloList): void {
  // Terrain grid (denser near the building).
  const xs: number[] = [];
  for (let x = -230; x < -100; x += 16) xs.push(x);
  for (let x = -100; x < -48; x += 6) xs.push(x);
  for (let x = -48; x < 66; x += 3) xs.push(x);
  for (let x = 66; x < 130; x += 6) xs.push(x);
  for (let x = 130; x <= 250; x += 16) xs.push(x);
  const zs: number[] = [];
  for (let z = -230; z < -70; z += 16) zs.push(z);
  for (let z = -70; z < -30; z += 6) zs.push(z);
  for (let z = -30; z < 30; z += 3) zs.push(z);
  for (let z = 30; z < 90; z += 5) zs.push(z);
  for (let z = 90; z <= 170; z += 16) zs.push(z);
  const nx = xs.length;
  const nz = zs.length;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const c0 = new Color('#5fcf5a');
  const c1 = new Color('#2f8a52');
  const cFar = new Color('#2a5a6a');
  const cPad = new Color('#b9b4cc');
  const tmp = new Color();
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = xs[i];
      const z = zs[j];
      const y = groundY(x, z);
      const o = (j * nx + i) * 3;
      pos[o] = x;
      pos[o + 1] = y;
      pos[o + 2] = z;
      const dist = Math.hypot(x - 8, z + 5);
      tmp.copy(c0).lerp(c1, Math.min(1, Math.max(0, -y / 14)));
      tmp.lerp(cFar, Math.min(1, Math.max(0, (dist - 90) / 140)));
      // Concrete apron around the launch pad and the crawlerway.
      const pd = Math.hypot(x - PAD.x, z - PAD.z);
      if (pd < 9.5 || (x > RIGHT_OUT && x < PAD.x && z > DOOR_Z[0] - 0.5 && z < DOOR_Z[1] + 0.5)) tmp.copy(cPad);
      col[o] = tmp.r;
      col[o + 1] = tmp.g;
      col[o + 2] = tmp.b;
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i;
      const b = a + 1;
      const c = a + nx;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const g = k.r(geo, '#ffffff', P.grass, 0);
  g.setAttribute('color', new BufferAttribute(col, 3));
  // Crawlerway from the hangar door to the pad, with a yellow center line.
  const cwL = PAD.x - 5 - RIGHT_OUT;
  k.r(box(cwL, 0.12, DOOR_Z[1] - DOOR_Z[0] + 0.4), '#c9c5da', P.concrete, 0, RIGHT_OUT + cwL / 2, 0.06, (DOOR_Z[0] + DOOR_Z[1]) / 2);
  for (let i = 0; i < 6; i++) k.glow(box(1.0, 0.02, 0.14), '#ffe066', RIGHT_OUT + 1 + i * 1.7, 0.13, (DOOR_Z[0] + DOOR_Z[1]) / 2);
  // Ramp from the hangar floor to the ground.
  k.r(box(1.6, 0.5, DOOR_Z[1] - DOOR_Z[0]), '#c9c5da', P.concrete, 0, RIGHT_OUT + 0.6, 0.18, (DOOR_Z[0] + DOOR_Z[1]) / 2, 0, 0, -0.28);
  // Paved terrace along the front of the building.
  k.r(box(RIGHT_OUT - LEFT_OUT + 3, 0.1, 3.2), '#eadfcc', P.paving, 0.05, (LEFT_OUT + RIGHT_OUT) / 2, 0.05, 2.4);
  k.r(box(RIGHT_OUT - LEFT_OUT + 3.2, 0.16, 0.24), '#b9a8e0', P.none, 0, (LEFT_OUT + RIGHT_OUT) / 2, 0.08, 4.05);
  // Winding stone path from the foreground to the lobby.
  const steps = 40;
  const pPos: number[] = [];
  const pIdx: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const [x, z] = pathCenter(t);
    const [x2, z2] = pathCenter(Math.min(1, t + 0.01));
    const [x1, z1] = pathCenter(Math.max(0, t - 0.01));
    let dx = x2 - x1;
    let dz = z2 - z1;
    const l = Math.hypot(dx, dz) || 1;
    dx /= l;
    dz /= l;
    const w = 1.5 + t * 0.6;
    for (const s of [-1, 1]) {
      const px = x + -dz * w * s;
      const pz = z + dx * w * s;
      pPos.push(px, groundY(px, pz) + 0.06, pz);
    }
    if (i < steps) {
      const a = i * 2;
      pIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const pg = new BufferGeometry();
  pg.setAttribute('position', new BufferAttribute(new Float32Array(pPos), 3));
  pg.setIndex(pIdx);
  pg.computeVertexNormals();
  k.r(pg, '#e8dcc8', P.paving, 0.05);
  // Lamps along the path and flower beds.
  const rng = new Rng('grounds');
  for (const t of [0.3, 0.52, 0.74]) {
    const [x, z] = pathCenter(t);
    for (const s of [-1, 1]) {
      const lx = x + s * 2.9;
      const ly = groundY(lx, z);
      k.at(lx, ly, z, 0, 1.25, () => lamp(k));
      halos.add(lx, ly + 2.5, z, '#ffd98a', 3.2, 0.5);
    }
  }
  const flowerCols = ['#ff7ad9', '#ffe066', '#ff5d73', '#ffffff', '#9b6bff', '#ff9f43'];
  const beds: Array<[number, number, number]> = [[-10, 5.4, 8], [-21.5, 5.4, 8], [13.5, 5.4, 6], [-3.4, 7.5, 3], [6.2, 8.5, 3]];
  for (const [bx, bz, bw] of beds) {
    k.r(sph(bw / 2 + 0.4, 0.35, 1.1, 18, 6), '#3fa04a', P.grass, 0, bx, groundY(bx, bz) + 0.05, bz);
    for (let i = 0; i < bw * 3; i++) {
      const fx = bx + rng.range(-bw / 2, bw / 2);
      const fz = bz + rng.range(-0.7, 0.7);
      k.paint(sph(0.13, 0.1, 0.13, 5, 3), rng.pick(flowerCols), fx, groundY(fx, fz) + 0.32, fz);
    }
  }
  // Trees around the hill.
  const trees: Array<[number, number, number]> = [
    [-36, -6, 1.3], [-40, 4, 1.1], [-34, 12, 0.95], [-44, -16, 1.4], [-30, 26, 1.0], [-52, 8, 1.5], [-24, 38, 1.15],
    [52, 2, 1.2], [56, -12, 1.4], [49, 14, 1.0], [62, 6, 1.3], [30, 30, 1.0], [42, 26, 1.2], [18, 40, 1.1],
    [-12, -30, 1.4], [24, -28, 1.3], [-60, -10, 1.6], [70, -20, 1.6],
  ];
  trees.forEach(([x, z, s], i) => {
    const y = groundY(x, z);
    k.at(x, y - 0.1, z, i * 1.3, s * 3.2, () => tree(k, i));
  });
  // Bushes at the building's feet.
  for (let i = 0; i < 14; i++) {
    const x = LEFT_OUT - 1.5 + rng.range(-1, 1) - (i < 7 ? 0 : 0);
    const z = BACK + 1 + i * 0.9;
    if (i >= 7) continue;
    const g2 = k.paint(rock(900 + i, 1.0, 0.8, 0.9, 1, 0.15, true), '#3fae55', x, 0.4, z);
    k.grad(g2, '#2a7a45', '#7ee05a', 0, 1.4);
  }
  // Village lights on the far hills.
  for (let i = 0; i < 26; i++) {
    const a = rng.range(-1.1, 1.1);
    const r = rng.range(170, 240);
    const x = 8 + Math.sin(a) * r;
    const z = -20 - Math.cos(a) * r;
    halos.add(x, farHillY(Math.atan2(x - 8, -(z + 20)), r) - 2 + rng.range(-3, 1), z, rng.chance(0.7) ? '#ffd27a' : '#ff9ad9', rng.range(2.5, 4.5), 0.9);
  }
}

/** Garden lamp (a lighter cousin of the surface lamp). */
function lamp(k: AKit): void {
  k.metal(lath([[0.36, 0], [0.36, 0.07], [0.3, 0.12], [0.14, 0.2], [0.09, 0.32], [0, 0.32]], 10), '#5a6080');
  k.metal(cyl(0.055, 0.07, 1.56, 8), '#c9d2ee', 0, 1.1);
  k.paint(tor(0.075, 0.04, 4, 10), '#6b3fd4', 0, 0.98, 0, H);
  k.metal(lath([[0, 2.14], [0.08, 2.14], [0.22, 2.13], [0.3, 2.11], [0.34, 2.15], [0.28, 2.24], [0.13, 2.31], [0, 2.32]], 10), '#5a6080');
  k.glow(sph(0.2, 0.18, 0.2, 10, 6), hot('#fff1b8', 3), 0, 2.0);
}

function tree(k: AKit, i: number): void {
  const det = 1;
  const trunk = k.r(lath([[0.2, 0], [0.13, 0.12], [0.1, 0.5], [0.085, 1.0], [0.04, 1.4], [0, 1.4]], 8), '#8a5a3a', P.none, 0);
  k.grad(trunk, '#5a3a28', '#9a6a42', 0, 1.2);
  const greens = [['#2f9a4a', '#8ae05a'], ['#2a8a5a', '#7ad8a0'], ['#3a9a3a', '#b0e860']][i % 3];
  const puffs: Array<[number, number, number, number, number]> = i % 2
    ? [[0, 1.55, 0, 0.62, 0.55], [-0.4, 1.25, 0.1, 0.42, 0.38], [0.44, 1.32, 0.06, 0.44, 0.4], [0.06, 2.0, -0.04, 0.42, 0.38]]
    : [[0, 1.4, 0, 0.5, 0.5], [0, 1.95, 0, 0.42, 0.44], [0, 2.4, 0, 0.3, 0.34]];
  puffs.forEach(([x, y, z, r, ry], j) => {
    const g = k.paint(rock(100 + i * 10 + j, r, ry, r * 0.85, det, 0.12, false), greens[0], x, y, z);
    k.grad(g, greens[0], greens[1], y - ry, y + ry);
    k.cavity(g, x, y, z, r, ry, r * 0.85, 2);
  });
}

// ------------------------------------------------------------------ launch pad and gantry

export function buildPad(k: AKit, halos: HaloList): void {
  const { x, z } = PAD;
  k.r(lath([[0, 0.9], [5.6, 0.9], [5.8, 0.75], [6.2, 0.6], [6.4, 0.0], [0, 0]], 48), '#d8d4e8', P.concrete, 0, x, -0.2, z);
  k.r(cyl(4.6, 4.6, 0.06, 48), '#c4c0d8', P.concrete, 0, x, 0.73, z);
  k.decalGeo(new CylinderGeometry(4.3, 4.3, 0.02, 48).rotateX(0).scale(1, 1, 1), AT.padMark, 0, '#ffffff', x, 0.77, z);
  // Rim lights chasing round.
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    k.blink(sph(0.12, 0.08, 0.12, 6, 4), i % 2 ? '#4dd4ff' : '#ffe066', i / 24, 0.6, x + Math.cos(a) * 5.65, 0.72, z + Math.sin(a) * 5.65);
  }
  // Steps up to the pad from the crawlerway.
  k.r(rbox(2.4, 0.35, 3.0, 0.05, 1), '#c9c5da', P.concrete, 0, x - 6.2, 0.18, z);
  // Floodlight towers at two corners.
  for (const [fx, fz, ry] of [[x - 7.5, z + 6.5, 0.6], [x + 7.0, z + 5.5, -0.7]] as Array<[number, number, number]>) {
    k.at(fx, 0, fz, ry, 1, () => {
      k.metal(cyl(0.12, 0.16, 7, 8), '#dfe5f5', 0, 3.5, 0);
      k.paint(rbox(1.4, 0.8, 0.4, 0.08, 1), '#3a3f66', 0, 7.1, 0, -0.5);
      for (let i = 0; i < 3; i++) k.glow(cyl(0.16, 0.16, 0.05, 12), hot('#fff4d8', 3), -0.45 + i * 0.45, 7.05, 0.22, H - 0.5);
    });
    halos.add(fx, 7.2, fz, '#fff1c8', 4, 0.6);
  }
  // Gantry tower: lattice, platforms, swing arm toward the pad, beacons.
  const gx = GANTRY.x;
  const gz = GANTRY.z;
  const gh = 18;
  const hw = 1.5;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.metal(box(0.28, gh, 0.28), '#ff9f43', gx + sx * hw, gh / 2, gz + sz * hw);
  for (let l = 0; l < 9; l++) {
    const y = 1 + l * 2;
    for (const sz of [-1, 1]) k.metal(box(hw * 2, 0.14, 0.14), '#ffb870', gx, y, gz + sz * hw);
    for (const sx of [-1, 1]) k.metal(box(0.14, 0.14, hw * 2), '#ffb870', gx + sx * hw, y, gz);
    // Diagonal braces on the front and sides.
    const dl = Math.hypot(hw * 2, 2);
    const ang = Math.atan2(2, hw * 2);
    k.metal(box(dl, 0.1, 0.1), '#fff6e0', gx, y + 1, gz + hw, 0, 0, l % 2 ? ang : -ang);
    k.metal(box(0.1, 0.1, dl), '#fff6e0', gx - hw, y + 1, gz, l % 2 ? ang : -ang, 0, 0);
    k.metal(box(0.1, 0.1, dl), '#fff6e0', gx + hw, y + 1, gz, l % 2 ? -ang : ang, 0, 0);
  }
  for (const y of [6, 12, gh]) k.r(rbox(hw * 2 + 1.0, 0.18, hw * 2 + 1.0, 0.05, 1), '#5a6080', P.panels, 0, gx, y, gz);
  // Swing arms toward the pad.
  for (const [y, len] of [[12, 4.6], [6, 4.0]] as Array<[number, number]>) {
    k.metal(box(0.9, 0.5, len), '#ff9f43', gx, y + 0.3, gz + hw + len / 2);
    k.metal(box(1.0, 0.08, len), '#fff6e0', gx, y + 0.58, gz + hw + len / 2);
    k.paint(rbox(1.3, 1.1, 0.8, 0.12, 1), '#fff6e0', gx, y + 0.5, gz + hw + len);
  }
  // Mast and beacons.
  k.metal(cyl(0.08, 0.1, 3.5, 8), '#dfe5f5', gx, gh + 1.75, gz);
  k.blink(sph(0.25, 0.25, 0.25, 12, 8), '#ff5d73', 0, 0.7, gx, gh + 3.6, gz);
  for (const y of [6.3, 12.3]) for (const sx of [-1, 1]) k.blink(sph(0.14, 0.14, 0.14, 8, 6), '#ff5d73', sx > 0 ? 0.5 : 0, 0.7, gx + sx * (hw + 0.5), y, gz + hw + 0.5);
  halos.add(gx, gh + 3.6, gz, '#ff5d73', 3, 0.7);
  // Water tanks and a little control hut beside the pad.
  k.at(x + 8.5, 0, z - 6.5, -0.4, 1, () => {
    k.paint(rbox(3.2, 2.4, 2.4, 0.2, 2), '#fff6e0', 0, 1.2, 0);
    k.paint(rbox(3.4, 0.3, 2.6, 0.1, 1), PURPLE, 0, 2.5, 0);
    k.decal(AT.radar, 1.2, 0.6, 1.3, -0.5, 1.4, 1.22);
    k.paint(rbox(0.8, 1.6, 0.1, 0.05, 1), TEAL, 0.9, 0.8, 1.2);
    k.metal(dishGeo(0.7, 0.25, 0.04, 16), '#dfe5f5', 0.8, 2.8, 0, -0.6);
  });
  for (const [tx, tz] of [[x - 9.5, z - 7], [x - 7.5, z - 9]] as Array<[number, number]>) {
    k.paint(cyl(1.1, 1.1, 3.2, 24), '#dfe5f5', tx, 1.6, tz);
    k.paint(dome(1.1, 0.5, 1.1, 24, 6), '#ff5d73', tx, 3.2, tz);
    k.paint(cyl(1.13, 1.13, 0.3, 24), '#4c7dff', tx, 2.1, tz);
  }
}

// ------------------------------------------------------------------ distant hills

function farHillY(az: number, r: number): number {
  const k = r / 240;
  const big = r < 220 ? 1.6 : 1;
  return -6 + k * (15 + big * (10 * Math.sin(az * 3.1 + 0.6 + r) + 7 * Math.sin(az * 7.3 + 2.1) + 4 * Math.sin(az * 15 + r * 0.1)));
}

export function buildFarHills(k: AKit): void {
  const rings: Array<[number, string, string]> = [[260, '#4a3c86', '#b07aa8'], [190, '#2f6458', '#6a8a9a']];
  for (const [r, top, base] of rings) {
    const n = 120;
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const cTop = new Color(top);
    const cBase = new Color(base);
    for (let i = 0; i <= n; i++) {
      const az = (i / n) * Math.PI * 2 - Math.PI;
      const y = farHillY(az, r);
      const sx = Math.sin(az);
      const sz = -Math.cos(az);
      const rows: Array<[number, number, Color]> = [[r - 30, groundY(8 + sx * (r - 30), -20 + sz * (r - 30)) - 4, cBase], [r, y, cTop], [r + 40, y * 0.5 - 20, cTop]];
      for (const [rr, yy, c] of rows) {
        pos.push(8 + sx * rr, yy, -20 + sz * rr);
        col.push(c.r, c.g, c.b);
      }
      if (i < n) {
        const a = i * 3;
        for (let q = 0; q < 2; q++) idx.push(a + q, a + q + 3, a + q + 1, a + q + 1, a + q + 3, a + q + 4);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const out = k.r(g, '#ffffff', P.none, 0.3);
    out.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  }
}

// ------------------------------------------------------------------ sky

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
const SKY_FRAG = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uGlow;
uniform vec3 uSun;
uniform float uTime;
varying vec3 vDir;
float sHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float sNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(sHash(i), sHash(i + vec2(1.0, 0.0)), f.x), mix(sHash(i + vec2(0.0, 1.0)), sHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  vec3 d = normalize(vDir);
  float e = d.y;
  vec3 col = mix(uMid, uZenith, smoothstep(0.04, 0.55, e));
  col = mix(uHorizon, col, smoothstep(-0.03, 0.2, e));
  vec2 hz = normalize(d.xz + 1e-5);
  float s = max(0.0, dot(hz, normalize(uSun.xz)));
  float g = pow(s, 3.0) * exp(-max(e, 0.0) * 7.0);
  col += uGlow * g;
  // Soft streaky clouds near the horizon, lit pink from the sunset side.
  float az = atan(d.x, -d.z);
  float band = smoothstep(0.015, 0.06, e) * (1.0 - smoothstep(0.1, 0.24, e));
  float n = sNoise(vec2(az * 9.0 + uTime * 0.004, e * 34.0)) * 0.65 + sNoise(vec2(az * 23.0, e * 70.0)) * 0.35;
  float c = smoothstep(0.55, 0.85, n) * band;
  vec3 cloud = mix(vec3(0.42, 0.3, 0.62), vec3(1.25, 0.62, 0.62), 0.25 + 0.75 * pow(s, 2.0));
  col = mix(col, cloud, c * 0.75);
  if (e < 0.0) col = mix(col, uHorizon * 0.55, smoothstep(0.0, -0.1, e));
  gl_FragColor = vec4(col, 1.0);
  ${OUTPUT_GLSL}
}`;

export function skyDome(sunDir: Vector3): Mesh {
  const m = new ShaderMaterial({
    uniforms: {
      uZenith: { value: new Color('#070a33') },
      uMid: { value: new Color('#2c2f8e') },
      uHorizon: { value: new Color('#ffab86').multiplyScalar(1.15) },
      uGlow: { value: new Color('#ff6f6f').multiplyScalar(0.9) },
      uSun: { value: sunDir },
      uTime: { value: 0 },
    },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: BackSide,
    depthWrite: false,
  });
  const dome = new Mesh(new SphereGeometry(1500, 32, 16), m);
  dome.renderOrder = -12;
  dome.frustumCulled = false;
  return dome;
}

const STAR_VERT = /* glsl */ `
attribute float aSize;
attribute float aPhase;
uniform float uTime;
uniform float uPx;
varying float vB;
void main() {
  vec3 d = normalize(position);
  float tw = 0.7 + 0.3 * sin(uTime * (1.2 + aPhase * 2.0) + aPhase * 40.0);
  vB = tw * smoothstep(0.06, 0.45, d.y);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
  gl_PointSize = max(1.0, aSize * uPx);
}`;
const STAR_FRAG = /* glsl */ `
varying float vB;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r2 = dot(c, c) * 4.0;
  float a = (exp(-r2 * 6.0) + exp(-r2 * 1.6) * 0.3) * vB;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vec3(1.0, 0.97, 0.92) * a * 1.4, 1.0);
  ${OUTPUT_GLSL}
}`;

export function skyStars(n: number, pixelRatio: number): Points {
  const rng = new Rng('academy-stars');
  const pos = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const phase = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const y = Math.pow(rng.next(), 0.8) * 0.95 + 0.03;
    const a = rng.range(0, Math.PI * 2);
    const r = Math.sqrt(1 - y * y);
    pos[i * 3] = Math.cos(a) * r * 1400;
    pos[i * 3 + 1] = y * 1400;
    pos[i * 3 + 2] = Math.sin(a) * r * 1400;
    size[i] = rng.next() < 0.9 ? rng.range(1.2, 2.4) : rng.range(2.8, 4.2);
    phase[i] = rng.next();
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aSize', new BufferAttribute(size, 1));
  g.setAttribute('aPhase', new BufferAttribute(phase, 1));
  const m = new ShaderMaterial({ uniforms: { uTime: { value: 0 }, uPx: { value: pixelRatio } }, vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending });
  const p = new Points(g, m);
  p.frustumCulled = false;
  p.renderOrder = -11;
  return p;
}

// ------------------------------------------------------------------ halos

const HALO_VERT = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
uniform float uHalfH;
uniform float uTime;
uniform float uGain;
varying vec3 vC;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aSize * projectionMatrix[1][1] * uHalfH / max(0.1, -mv.z), 0.0, 384.0);
  vC = aColor * uGain * (0.92 + 0.08 * sin(uTime * 2.3 + position.x * 0.7));
}`;
const HALO_FRAG = /* glsl */ `
varying vec3 vC;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  if (r > 1.0) discard;
  float a = exp(-r * r * 5.0) * (1.0 - r);
  gl_FragColor = vec4(vC * a, 1.0);
  ${OUTPUT_GLSL}
}`;

/** Collects soft glow sprites; `points()` makes one Points object for all of them. */
export class HaloList {
  private readonly pos: number[] = [];
  private readonly col: number[] = [];
  private readonly size: number[] = [];
  private readonly c = new Color();

  add(x: number, y: number, z: number, color: string, size: number, power = 0.6): void {
    this.c.set(color).multiplyScalar(power);
    this.pos.push(x, y, z);
    this.col.push(this.c.r, this.c.g, this.c.b);
    this.size.push(size);
  }

  /** `gain` < 1 on tiers without post-processing (each additive sprite is tone mapped on its own there). */
  points(gain = 1): Points {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute('aColor', new BufferAttribute(new Float32Array(this.col), 3));
    g.setAttribute('aSize', new BufferAttribute(new Float32Array(this.size), 1));
    const m = new ShaderMaterial({ uniforms: { uHalfH: { value: 360 }, uTime: { value: 0 }, uGain: { value: gain } }, vertexShader: HALO_VERT, fragmentShader: HALO_FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending });
    const p = new Points(g, m);
    p.renderOrder = 4;
    p.frustumCulled = false;
    return p;
  }
}


