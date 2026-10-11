// Procedural low-poly buildings. Each builder returns a Group in local tile space
// (origin = structure's top-left tile corner at its ground level), doors face south (+z).
import * as THREE from 'three';
import type { Structure } from '../../sim/state';
import { PAL } from '../palette';
import { curved, vcolMat } from '../curve';
import { box, cone, cyl, ico, merge, part, sphere, torus } from './geo';

type P = THREE.BufferGeometry;

const vmat = vcolMat();
/** Glowing materials whose emissive intensity follows the time of day. */
export const glowMats = {
  lantern: curved(new THREE.MeshLambertMaterial({ color: 0xffe2a0, emissive: 0xffb54a, emissiveIntensity: 0.2, flatShading: true })),
  window: curved(new THREE.MeshLambertMaterial({ color: 0xbfe3f2, emissive: 0xffc977, emissiveIntensity: 0.0, flatShading: true })),
  beacon: curved(new THREE.MeshLambertMaterial({ color: 0x8d8aa0, emissive: 0xfff0b0, emissiveIntensity: 0.0, flatShading: true })),
};

function solid(parts: P[]): THREE.Mesh {
  const m = new THREE.Mesh(merge(parts), vmat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function glow(geo: P, mat: THREE.Material, x: number, y: number, z: number, s = 1): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.setScalar(s);
  return m;
}

/** 4-sided roof spanning w x d. */
function roof(w: number, d: number, h: number, color: number, x: number, y: number, z: number): P {
  const g = cone(Math.SQRT1_2, 1, 4);
  return part(g, color, { pos: [x, y + h / 2, z], rot: [0, Math.PI / 4, 0], scale: [w, h, d] });
}

/** Gable roof: triangular prism along x. */
function gable(w: number, d: number, h: number, color: number, x: number, y: number, z: number): P {
  const g = new THREE.CylinderGeometry(1, 1, 1, 3, 1);
  return part(g, color, { pos: [x, y + h * 0.25, z], rot: [Math.PI / 2, 0, Math.PI / 2], scale: [d * 0.62, w, h] });
}

function door(x: number, z: number, color = PAL.woodDark, h = 0.9): P[] {
  return [
    part(box(0.6, h, 0.08), color, { pos: [x, h / 2, z] }),
    part(sphere(0.04, 5, 4), 0xf5d36b, { pos: [x + 0.18, h * 0.5, z + 0.05] }),
  ];
}

function windowPane(g: THREE.Group, x: number, y: number, z: number, w = 0.45, h = 0.45): void {
  g.add(glow(box(w, h, 0.06), glowMats.window, x, y, z));
}

function lantern(g: THREE.Group, x: number, y: number, z: number, s = 1): void {
  g.add(glow(ico(0.16, 0), glowMats.lantern, x, y, z, s));
}

export function buildStructure(s: Structure, extra: { homeLevel?: number; lit?: boolean } = {}): THREE.Group {
  const g = new THREE.Group();
  const w = s.w, d = s.d;
  const cx = w / 2, cz = d / 2;
  const P: P[] = [];
  switch (s.type) {
    case 'hall': {
      P.push(part(box(w - 0.4, 0.2, d - 0.3), PAL.cliffBand, { pos: [cx, 0.1, cz] }));
      P.push(part(box(w - 0.7, 1.8, d - 0.7), PAL.cream, { pos: [cx, 1.1, cz] }));
      P.push(roof(w - 0.1, d + 0.2, 1.3, PAL.roofTeal, cx, 2.0, cz));
      P.push(part(cyl(0.28, 0.32, 0.6, 6), PAL.cream, { pos: [cx, 3.1, cz] }));
      P.push(part(cone(0.42, 0.5, 6), PAL.roofTeal, { pos: [cx, 3.65, cz] }));
      P.push(...door(cx, d - 0.33, PAL.woodDark, 1.1).map((p) => p));
      P.push(part(box(1.6, 0.35, 0.06), PAL.wood, { pos: [cx, 1.65, d - 0.33] }));
      g.add(solid(P));
      lantern(g, cx, 3.0, cz, 1.3);
      windowPane(g, cx - 1.6, 1.2, d - 0.33);
      windowPane(g, cx + 1.6, 1.2, d - 0.33);
      lantern(g, cx - 0.65, 1.3, d - 0.2, 0.6);
      lantern(g, cx + 0.65, 1.3, d - 0.2, 0.6);
      break;
    }
    case 'shopCart': {
      P.push(part(box(1.6, 0.6, 0.9), PAL.wood, { pos: [1, 0.55, 1.1] }));
      for (const [x, z] of [
        [0.3, 0.7],
        [1.7, 0.7],
        [0.3, 1.5],
        [1.7, 1.5],
      ] as const)
        P.push(part(cyl(0.04, 0.04, 1.6, 5), PAL.woodDark, { pos: [x, 0.8, z] }));
      for (let k = 0; k < 4; k++)
        P.push(part(box(0.45, 0.06, 1.1), k % 2 ? 0xffffff : PAL.roofPink, { pos: [0.33 + k * 0.45, 1.65, 1.1], rot: [0.12, 0, 0] }));
      P.push(part(cyl(0.22, 0.22, 0.08, 10), PAL.woodDark, { pos: [0.4, 0.22, 1.6], rot: [Math.PI / 2, 0, 0] }));
      P.push(part(cyl(0.22, 0.22, 0.08, 10), PAL.woodDark, { pos: [1.6, 0.22, 1.6], rot: [Math.PI / 2, 0, 0] }));
      P.push(part(ico(0.16, 0), 0xffa45c, { pos: [0.6, 0.95, 1.2] }), part(ico(0.14, 0), 0x9be38a, { pos: [1.2, 0.93, 1.0] }));
      g.add(solid(P));
      lantern(g, 1.75, 1.5, 1.6, 0.6);
      break;
    }
    case 'shop': {
      P.push(part(box(w - 0.6, 1.7, d - 0.9), 0xffe2c4, { pos: [cx, 0.85, cz - 0.1] }));
      P.push(roof(w - 0.2, d - 0.3, 1.1, PAL.roofPink, cx, 1.7, cz - 0.1));
      for (let k = 0; k < 6; k++)
        P.push(part(box((w - 0.6) / 6, 0.06, 0.7), k % 2 ? 0xffffff : 0x8ed0b8, { pos: [0.3 + (k + 0.5) * ((w - 0.6) / 6), 1.5, d - 0.45], rot: [0.35, 0, 0] }));
      P.push(...door(cx, d - 0.62));
      P.push(part(cyl(0.3, 0.3, 0.06, 10), PAL.wood, { pos: [cx, 2.0, d - 0.55], rot: [Math.PI / 2, 0, 0] }));
      P.push(part(ico(0.15, 0), 0x86c77a, { pos: [cx, 2.0, d - 0.5], scale: [1, 1.3, 0.4] }));
      g.add(solid(P));
      windowPane(g, cx - 1.3, 0.95, d - 0.62, 0.6, 0.5);
      windowPane(g, cx + 1.3, 0.95, d - 0.62, 0.6, 0.5);
      break;
    }
    case 'museumTent': {
      P.push(part(cone(2.2, 2.4, 8), PAL.roofLilac, { pos: [cx, 1.2, cz] }));
      P.push(part(cyl(0.05, 0.05, 0.6, 4), PAL.woodDark, { pos: [cx, 2.6, cz] }));
      P.push(part(box(0.3, 0.2, 0.02), 0xffe066, { pos: [cx + 0.15, 2.8, cz] }));
      P.push(part(box(0.8, 1.1, 0.1), 0x6f5a8f, { pos: [cx, 0.55, cz + 1.95], rot: [-0.3, 0, 0] }));
      g.add(solid(P));
      lantern(g, cx + 0.8, 1.0, cz + 1.9, 0.6);
      break;
    }
    case 'museum': {
      P.push(part(box(w - 0.3, 0.3, d - 0.3), 0xe8e2d4, { pos: [cx, 0.15, cz] }));
      P.push(part(box(w - 0.9, 2.0, d - 1.3), 0xf4efe6, { pos: [cx, 1.3, cz - 0.3] }));
      for (let k = 0; k < 4; k++) P.push(part(cyl(0.14, 0.16, 2.0, 8), 0xffffff, { pos: [0.9 + k * ((w - 1.8) / 3), 1.3, d - 0.55] }));
      P.push(part(box(w - 0.5, 0.25, 1.0), 0xe8e2d4, { pos: [cx, 2.4, d - 0.75] }));
      P.push(gable(w - 0.4, 1.6, 0.8, 0xd8cfe8, cx, 2.5, d - 0.8));
      P.push(part(new THREE.SphereGeometry(1.4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0xb9c8e8, { pos: [cx, 2.3, cz - 0.4] }));
      P.push(part(cone(0.12, 0.4, 6), 0xffd166, { pos: [cx, 3.85, cz - 0.4] }));
      P.push(...door(cx, d - 1.0, 0x6f5a8f, 1.2));
      g.add(solid(P));
      windowPane(g, cx - 1.6, 1.4, d - 0.98, 0.5, 0.7);
      windowPane(g, cx + 1.6, 1.4, d - 0.98, 0.5, 0.7);
      break;
    }
    case 'home': {
      const lvl = extra.homeLevel ?? 0;
      if (lvl <= 0) {
        // canvas tent
        P.push(part(new THREE.CylinderGeometry(1, 1, 1, 3, 1), 0xf3c57a, { pos: [cx, 0.62, 1.4], rot: [Math.PI / 2, 0, 0], scale: [1.25, 2.2, 1.6] }));
        P.push(part(box(0.7, 0.9, 0.05), 0xd58c5c, { pos: [cx, 0.45, 2.48] }));
        P.push(part(cyl(0.04, 0.04, 1.6, 4), PAL.woodDark, { pos: [cx, 0.8, 2.55] }));
        P.push(part(box(0.5, 0.06, 0.3), 0x8a6a4a, { pos: [cx + 1.3, 0.05, 2.8] }));
        g.add(solid(P));
        lantern(g, cx + 0.9, 0.9, 2.55, 0.55);
      } else {
        const big = lvl >= 2;
        const bw = big ? w - 0.4 : w - 1.0, bd = big ? d - 0.4 : d - 0.8;
        const bh = big ? 1.9 : 1.5;
        P.push(part(box(bw, bh, bd), big ? 0xfff0dc : 0xffe9d1, { pos: [cx, bh / 2, cz - 0.1] }));
        P.push(gable(bw + 0.4, bd + 0.4, big ? 1.4 : 1.1, big ? 0xe48f8f : 0xf2a07b, cx, bh, cz - 0.1));
        P.push(part(box(0.3, 0.7, 0.3), 0xb98a7a, { pos: [cx + bw * 0.28, bh + 0.7, cz - 0.3] }));
        P.push(...door(cx, cz - 0.1 + bd / 2 + 0.02));
        if (big) P.push(part(box(bw * 0.9, 0.12, 0.6), PAL.wood, { pos: [cx, 0.06, cz + bd / 2 + 0.25] }));
        g.add(solid(P));
        windowPane(g, cx - bw * 0.3, bh * 0.55, cz - 0.1 + bd / 2 + 0.02);
        windowPane(g, cx + bw * 0.3, bh * 0.55, cz - 0.1 + bd / 2 + 0.02);
        lantern(g, cx + 0.5, 1.0, cz + bd / 2 + 0.05, 0.5);
      }
      // mailbox
      const mb = solid([
        part(cyl(0.04, 0.04, 0.7, 4), PAL.woodDark, { pos: [0, 0.35, 0] }),
        part(box(0.3, 0.22, 0.4), 0x8fbfe0, { pos: [0, 0.75, 0] }),
      ]);
      mb.position.set(0.35, 0, d - 0.3);
      g.add(mb);
      break;
    }
    case 'villagerHome': {
      const colors = HOME_COLORS[(s.v ?? 0) % HOME_COLORS.length]!;
      P.push(part(box(w - 0.5, 1.4, d - 0.6), colors[0], { pos: [cx, 0.7, cz - 0.1] }));
      if ((s.v ?? 0) % 2 === 0) P.push(roof(w - 0.1, d - 0.1, 1.1, colors[1], cx, 1.4, cz - 0.1));
      else P.push(gable(w - 0.2, d - 0.2, 1.0, colors[1], cx, 1.4, cz - 0.1));
      P.push(...door(cx, cz - 0.1 + (d - 0.6) / 2 + 0.02, colors[2]));
      P.push(part(box(0.32, 0.05, 0.32), 0xb38a5e, { pos: [cx, 0.03, d - 0.1] }));
      g.add(solid(P));
      windowPane(g, cx + 0.75, 0.85, cz - 0.1 + (d - 0.6) / 2 + 0.02, 0.35, 0.35);
      lantern(g, cx - 0.55, 1.0, cz + (d - 0.6) / 2 + 0.05, 0.45);
      break;
    }
    case 'plot': {
      for (const [x, z] of [
        [0.2, 0.2],
        [w - 0.2, 0.2],
        [0.2, d - 0.2],
        [w - 0.2, d - 0.2],
      ] as const)
        P.push(part(cyl(0.05, 0.05, 0.5, 4), PAL.woodDark, { pos: [x, 0.25, z] }));
      P.push(part(box(w - 0.4, 0.03, 0.03), 0xf2e3c2, { pos: [cx, 0.4, 0.2] }));
      P.push(part(box(w - 0.4, 0.03, 0.03), 0xf2e3c2, { pos: [cx, 0.4, d - 0.2] }));
      P.push(part(box(0.03, 0.03, d - 0.4), 0xf2e3c2, { pos: [0.2, 0.4, cz] }));
      P.push(part(box(0.03, 0.03, d - 0.4), 0xf2e3c2, { pos: [w - 0.2, 0.4, cz] }));
      P.push(part(cyl(0.04, 0.04, 0.8, 4), PAL.woodDark, { pos: [cx, 0.4, d - 0.3] }));
      P.push(part(box(0.6, 0.4, 0.05), PAL.wood, { pos: [cx, 0.85, d - 0.28] }));
      g.add(solid(P));
      break;
    }
    case 'construction': {
      for (const [x, z] of [
        [0.3, 0.3],
        [w - 0.3, 0.3],
        [0.3, d - 0.3],
        [w - 0.3, d - 0.3],
      ] as const)
        P.push(part(cyl(0.06, 0.06, 2.0, 4), PAL.wood, { pos: [x, 1.0, z] }));
      P.push(part(box(w - 0.4, 0.06, 0.08), PAL.wood, { pos: [cx, 1.2, 0.3] }));
      P.push(part(box(w - 0.4, 0.06, 0.08), PAL.wood, { pos: [cx, 1.2, d - 0.3] }));
      P.push(part(box(w - 0.4, 0.06, 0.08), PAL.wood, { pos: [cx, 1.9, d - 0.3] }));
      P.push(part(box(w - 0.8, 0.8, d - 0.9), 0xf2e3c2, { pos: [cx, 0.4, cz] }));
      P.push(part(box(0.5, 0.5, 0.5), PAL.woodDark, { pos: [0.7, 0.25, d - 0.5] }));
      P.push(part(box(0.4, 0.4, 0.4), PAL.wood, { pos: [w - 0.7, 0.2, d - 0.6] }));
      P.push(part(cone(0.25, 0.4, 4), 0xffa45c, { pos: [cx, 0.2, d - 0.2] }));
      g.add(solid(P));
      break;
    }
    case 'workbench': {
      P.push(part(box(w - 0.15, 0.12, d - 0.2), PAL.wood, { pos: [cx, 0.62, cz] }));
      for (const [x, z] of [
        [0.18, 0.2],
        [w - 0.18, 0.2],
        [0.18, d - 0.2],
        [w - 0.18, d - 0.2],
      ] as const)
        P.push(part(box(0.08, 0.58, 0.08), PAL.woodDark, { pos: [x, 0.29, z] }));
      P.push(part(box(0.35, 0.08, 0.12), 0x9aa0a8, { pos: [cx - 0.3, 0.72, cz] }));
      P.push(part(cyl(0.03, 0.03, 0.3, 4), PAL.woodDark, { pos: [cx + 0.3, 0.72, cz], rot: [0, 0, Math.PI / 2] }));
      P.push(part(box(0.25, 0.15, 0.2), 0xd9ad7c, { pos: [cx + 0.6, 0.76, cz - 0.05] }));
      g.add(solid(P));
      break;
    }
    case 'lighthouse': {
      for (let k = 0; k < 5; k++)
        P.push(part(cyl(0.72 - k * 0.07, 0.78 - k * 0.07, 0.8, 10), k % 2 ? 0xf27c7c : 0xfff6ea, { pos: [1, 0.4 + k * 0.8, 1] }));
      P.push(part(cyl(0.7, 0.7, 0.12, 10), 0x6f6a8a, { pos: [1, 4.06, 1] }));
      P.push(part(cone(0.62, 0.7, 10), 0xf27c7c, { pos: [1, 5.2, 1] }));
      P.push(part(box(0.5, 0.8, 0.06), PAL.woodDark, { pos: [1, 0.4, 1.78] }));
      g.add(solid(P));
      const lamp = glow(cyl(0.42, 0.42, 0.75, 10), extra.lit ? glowMats.lantern : glowMats.beacon, 1, 4.5, 1);
      lamp.name = 'lamp';
      g.add(lamp);
      break;
    }
    case 'dock': {
      for (let k = 0; k < d * 3; k++) P.push(part(box(w - 0.1, 0.08, 0.3), k % 2 ? PAL.wood : 0xcf9f6c, { pos: [cx, 0.08, 0.17 + k * 0.33] }));
      for (let k = 0; k <= d; k += 2)
        for (const x of [0.08, w - 0.08]) P.push(part(cyl(0.07, 0.07, 1.2, 6), PAL.woodDark, { pos: [x, -0.25, Math.min(d - 0.1, k + 0.1)] }));
      g.add(solid(P));
      lantern(g, w - 0.1, 0.5, d - 0.1, 0.5);
      break;
    }
    case 'bridge': {
      const alongZ = s.dir === 0 || s.dir === 2;
      const len = alongZ ? d : w, wid = alongZ ? w : d;
      const planks = Math.round(len * 3);
      for (let k = 0; k < planks; k++) {
        const t = (k + 0.5) / planks;
        const arch = Math.sin(t * Math.PI) * 0.18;
        const pos: [number, number, number] = alongZ ? [cx, 0.08 + arch, t * len] : [t * len, 0.08 + arch, cz];
        P.push(part(box(alongZ ? wid - 0.05 : 0.3, 0.09, alongZ ? 0.3 : wid - 0.05), k % 2 ? PAL.wood : 0xcf9f6c, { pos }));
      }
      for (const side of [0.06, wid - 0.06]) {
        for (let k = 0; k <= len; k++) {
          const pos: [number, number, number] = alongZ ? [side, 0.4, Math.min(len - 0.06, Math.max(0.06, k))] : [Math.min(len - 0.06, Math.max(0.06, k)), 0.4, side];
          P.push(part(cyl(0.05, 0.05, 0.75, 5), PAL.woodDark, { pos }));
        }
        const rail: [number, number, number] = alongZ ? [side, 0.72, len / 2] : [len / 2, 0.72, side];
        P.push(part(box(alongZ ? 0.07 : len, 0.07, alongZ ? len : 0.07), PAL.woodDark, { pos: rail }));
      }
      g.add(solid(P));
      break;
    }
    case 'ramp': {
      const dir = s.dir ?? 0;
      // build pointing north (uphill toward -z) then rotate
      const len = 2, wid = 2;
      const steps = 8;
      for (let k = 0; k < steps; k++) {
        const t = (k + 0.5) / steps;
        P.push(part(box(wid - 0.1, 0.12 + t * 1.0, len / steps + 0.02), k % 2 ? 0xd8c7a8 : 0xcbb894, { pos: [0, (0.12 + t * 1.0) / 2, len / 2 - t * len] }));
      }
      for (const side of [-wid / 2 + 0.05, wid / 2 - 0.05]) P.push(part(box(0.1, 0.25, len * 1.05), 0xb79f86, { pos: [side, 0.55, 0], rot: [-Math.atan2(1, len), 0, 0] }));
      const mesh = solid(P);
      const holder = new THREE.Group();
      holder.add(mesh);
      holder.rotation.y = [0, -Math.PI / 2, Math.PI, Math.PI / 2][dir]!;
      holder.position.set(cx, 0, cz);
      g.add(holder);
      break;
    }
    case 'plazaLantern': {
      P.push(part(cyl(0.45, 0.55, 0.3, 8), 0xd8cfc2, { pos: [0.5, 0.15, 0.5] }));
      P.push(part(cyl(0.08, 0.1, 2.4, 6), 0x6f6a8a, { pos: [0.5, 1.5, 0.5] }));
      P.push(part(torus(0.3, 0.04, 4, 10), 0x6f6a8a, { pos: [0.5, 2.75, 0.5], rot: [Math.PI / 2, 0, 0] }));
      P.push(part(cone(0.35, 0.3, 6), 0x6f6a8a, { pos: [0.5, 3.25, 0.5] }));
      g.add(solid(P));
      lantern(g, 0.5, 2.95, 0.5, 1.6);
      break;
    }
    case 'noticeBoard': {
      P.push(part(cyl(0.05, 0.05, 1.4, 4), PAL.woodDark, { pos: [0.3, 0.7, 0.5] }));
      P.push(part(cyl(0.05, 0.05, 1.4, 4), PAL.woodDark, { pos: [w - 0.3, 0.7, 0.5] }));
      P.push(part(box(w - 0.3, 0.8, 0.08), PAL.wood, { pos: [cx, 1.05, 0.5] }));
      P.push(part(box(0.3, 0.35, 0.02), 0xffffff, { pos: [cx - 0.4, 1.1, 0.55], rot: [0, 0, 0.1] }));
      P.push(part(box(0.3, 0.3, 0.02), 0xfff1a6, { pos: [cx + 0.2, 1.0, 0.55], rot: [0, 0, -0.08] }));
      P.push(gable(w, 0.5, 0.25, PAL.roofTeal, cx, 1.45, 0.5));
      g.add(solid(P));
      break;
    }
    default:
      break;
  }
  return g;
}

/** wall / roof / door colors for villager homes */
export const HOME_COLORS: [number, number, number][] = [
  [0xffe3c9, 0xf28e6b, 0x9b6a4a],
  [0xe6f2ff, 0x7fa8e0, 0x5a6a9a],
  [0xfff5d6, 0x8fc77a, 0x6a8a4a],
  [0xffe6f0, 0xe08fb5, 0x9a5a7a],
  [0xf2ecff, 0xa58fe0, 0x6a5a9a],
  [0xe9fff2, 0x6fc4a8, 0x4a8a7a],
  [0xfff0e0, 0xd9a05b, 0x8a6a3a],
  [0xf6f1ea, 0x8a8aa0, 0x5a5a6a],
];
