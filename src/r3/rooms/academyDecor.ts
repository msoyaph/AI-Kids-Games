import { Group, PlaneGeometry, type Mesh, type Vector3 } from 'three';
import { cone, cyl, ext, lath, rbox, roundRectShape, sph, star, tint, tor } from '../surface/propKit';
import { AT } from './academyAtlas';
import { AKit, type AcademyMats } from './academyKit';
import { beanbag, cup, potPlant } from './academyRooms';

/**
 * Lounge decorations bought in the shop (DECOR styles): plant, rug, telescope, model, lavalamp,
 * mobile, plush, trophy, beanbag, globe. Bottom center origin, facing +z, about 1-2 units tall.
 * All static parts of all placed decorations merge into one build (a few draw calls); the planet
 * mobile's rotor turns on its own.
 */

export interface DecorBuild {
  group: Group;
  /** Spinning rotors (planet mobiles). */
  rotors: Group[];
}

const H = Math.PI / 2;

function telescope(k: AKit): void {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    k.metal(cyl(0.03, 0.04, 1.3, 6), '#c9d2ee', Math.sin(a) * 0.28, 0.62, Math.cos(a) * 0.28, Math.cos(a) * 0.42, 0, -Math.sin(a) * 0.42);
  }
  k.metal(sph(0.09, 0.09, 0.09, 10, 8), '#5a6080', 0, 1.25, 0);
  k.at(0, 1.32, 0, 0, 1, () => {
    k.paint(cyl(0.13, 0.17, 1.4, 16), '#6b3fd4', 0, 0.1, -0.1, -1.05);
    k.paint(cyl(0.19, 0.19, 0.16, 16), '#ffc83d', 0, 0.62, -0.38, -1.05);
    k.metal(cyl(0.05, 0.05, 0.25, 8), '#20124d', 0, -0.5, 0.25, -1.05);
  });
}

function modelRocket(k: AKit): void {
  k.paint(rbox(0.7, 0.14, 0.7, 0.05, 1), '#20124d', 0, 0.07, 0);
  k.metal(cyl(0.025, 0.025, 0.5, 6), '#c9d2ee', 0, 0.38, 0);
  k.at(0, 0.62, 0, 0, 1, () => {
    k.paint(lath([[0.0, 0], [0.14, 0.02], [0.17, 0.2], [0.17, 0.75], [0.12, 0.95], [0.04, 1.08], [0, 1.1]], 18), '#f4f7ff');
    k.paint(cyl(0.175, 0.175, 0.12, 18), '#ff5d73', 0, 0.62, 0);
    k.paint(lath([[0.0, 0.8], [0.13, 0.84], [0.08, 1.0], [0, 1.1]], 18), '#ff5d73');
    k.paint(sph(0.07, 0.07, 0.03, 10, 6), '#4dd4ff', 0, 0.48, 0.16);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      k.paint(rbox(0.04, 0.3, 0.2, 0.015, 1), '#ff5d73', Math.sin(a) * 0.2, 0.14, Math.cos(a) * 0.2, 0, a, 0);
    }
    k.glow(cone(0.1, 0.18, 10), '#ff9f43', 0, -0.06, 0, Math.PI);
  });
}

function lavaLamp(k: AKit): void {
  k.metal(lath([[0, 0], [0.26, 0], [0.24, 0.1], [0.14, 0.42], [0.12, 0.46], [0, 0.46]], 18), '#6b3fd4');
  k.glow(lath([[0, 0.44], [0.13, 0.44], [0.2, 0.8], [0.15, 1.15], [0.08, 1.3], [0, 1.3]], 18), tint('#ff7ad9', 0).multiplyScalar(1.2));
  for (let i = 0; i < 4; i++) k.blink(sph(0.07 + (i % 2) * 0.02, 0.09, 0.07, 10, 8), '#ffd060', i * 0.27, -0.25, (i % 2 ? 0.05 : -0.05), 0.6 + i * 0.16, 0.08);
  k.metal(lath([[0, 1.28], [0.09, 1.28], [0.07, 1.42], [0, 1.44]], 14), '#6b3fd4');
}

function mobileStand(k: AKit): void {
  k.metal(lath([[0.4, 0], [0.4, 0.05], [0.1, 0.1], [0, 0.1]], 18), '#5a6080');
  k.metal(cyl(0.035, 0.035, 2.3, 8), '#c9d2ee', 0, 1.2, 0);
  k.metal(cyl(0.03, 0.03, 0.9, 8), '#c9d2ee', 0.4, 2.3, 0, 0, 0, -H);
  k.metal(sph(0.06, 0.06, 0.06, 8, 6), '#ffc83d', 0.85, 2.3, 0);
}

function mobileRotor(k: AKit): void {
  k.metal(cyl(0.012, 0.012, 0.3, 4), '#dfe5f5', 0, -0.15, 0);
  k.metal(cyl(0.02, 0.02, 1.1, 6), '#ffc83d', 0, -0.3, 0, 0, 0, H);
  k.metal(cyl(0.02, 0.02, 1.1, 6), '#ffc83d', 0, -0.3, 0, H, 0, 0);
  const planets: Array<[number, number, number, string, boolean]> = [[0.55, 0, 0.16, '#ff9f43', true], [-0.55, 0, 0.12, '#4c9dff', false], [0, 0.55, 0.1, '#ff5d73', false], [0, -0.55, 0.14, '#2de0c7', false]];
  for (const [x, z, r, c, ring] of planets) {
    const drop = 0.35 + r * 2;
    k.metal(cyl(0.008, 0.008, drop, 4), '#dfe5f5', x, -0.3 - drop / 2, z);
    k.paint(sph(r, r, r, 14, 10), c, x, -0.3 - drop - r, z);
    if (ring) k.paint(tor(r * 1.6, r * 0.12, 4, 20), '#ffe066', x, -0.3 - drop - r, z, H - 0.3);
  }
  k.glow(star(0.1, 0.03), '#fff1b8', 0, -0.95, 0);
}

function plush(k: AKit): void {
  const body = k.paint(sph(0.42, 0.4, 0.38, 18, 14), '#ff7ad9', 0, 0.4, 0);
  k.grad(body, '#e04fb8', '#ffb0e8', 0, 0.8);
  k.paint(sph(0.14, 0.1, 0.14, 10, 8), '#ff9ad9', -0.26, 0.08, 0.12);
  k.paint(sph(0.14, 0.1, 0.14, 10, 8), '#ff9ad9', 0.26, 0.08, 0.12);
  for (const s of [-1, 1]) {
    k.paint(cyl(0.025, 0.03, 0.4, 6), '#ff7ad9', s * 0.18, 0.88, 0, 0, 0, -s * 0.35);
    k.paint(sph(0.08, 0.08, 0.08, 10, 8), '#ffe066', s * 0.26, 1.06, 0);
    k.paint(sph(0.08, 0.1, 0.05, 10, 8), '#20124d', s * 0.13, 0.5, 0.34);
    k.paint(sph(0.03, 0.03, 0.02, 6, 4), '#ffffff', s * 0.13 - 0.02, 0.54, 0.38);
    k.paint(sph(0.06, 0.035, 0.02, 8, 6), '#ff4fa8', s * 0.24, 0.38, 0.34);
    k.paint(sph(0.08, 0.16, 0.08, 10, 8), '#ff7ad9', s * 0.38, 0.38, 0.06, 0, 0, s * 0.6);
  }
  k.paint(tor(0.06, 0.018, 4, 12, Math.PI), '#20124d', 0, 0.38, 0.36, 0, 0, Math.PI);
}

function trophyShelf(k: AKit): void {
  k.r(rbox(1.5, 1.3, 0.55, 0.06, 1), '#7b4ff0', 0, 0, 0, 0.65, 0);
  k.r(rbox(1.36, 0.06, 0.5, 0.02, 1), '#ffe9a8', 0, 0.2, 0, 0.65, 0.04);
  k.r(rbox(1.36, 0.06, 0.5, 0.02, 1), '#ffe9a8', 0, 0.2, 0, 1.28, 0.04);
  const cols = ['#d98a4a', '#ffc83d', '#dfe5f5'];
  cols.forEach((c, i) => k.at(-0.45 + i * 0.45, 1.31, 0.05, 0, 1, () => cup(k, i === 1 ? 0.55 : 0.42, c)));
  k.paint(star(0.12, 0.04), '#ffe066', 0, 0.45, 0.3);
}

function moonGlobe(k: AKit): void {
  k.metal(lath([[0, 0], [0.3, 0], [0.28, 0.06], [0.08, 0.12], [0.05, 0.6], [0, 0.6]], 18), '#5a6080');
  k.metal(tor(0.4, 0.025, 6, 32, Math.PI * 1.4), '#ffc83d', 0, 0.98, 0, 0, H, -0.7 - Math.PI / 2);
  k.blink(sph(0.34, 0.34, 0.34, 22, 16), tint('#fff4d6', 0).multiplyScalar(1.5), 0.2, -0.18, 0, 0.98, 0);
  for (const [x, y, z, r] of [[0.12, 1.08, 0.27, 0.07], [-0.15, 0.9, 0.28, 0.06], [0.2, 0.86, 0.22, 0.05]] as Array<[number, number, number, number]>) {
    k.blink(sph(r, r, r * 0.4, 10, 6), tint('#d8d0c0', 0).multiplyScalar(1.1), 0.2, -0.18, x, y, z);
  }
}

function rug(k: AKit): void {
  k.decalGeo(new PlaneGeometry(2.3, 2.3), AT.rugStar, 0, '#ffffff', 0, 0.035, 0, -H);
}

function decorKit(k: AKit, style: string): void {
  switch (style) {
    case 'plant':
      potPlant(k, 1.5, '#2de0c7', '#3fbf5a', 11);
      break;
    case 'rug':
      rug(k);
      break;
    case 'telescope':
      telescope(k);
      break;
    case 'model':
      modelRocket(k);
      break;
    case 'lavalamp':
      lavaLamp(k);
      break;
    case 'mobile':
      mobileStand(k);
      break;
    case 'plush':
      plush(k);
      break;
    case 'trophy':
      trophyShelf(k);
      break;
    case 'beanbag':
      beanbag(k, '#ff7ad9', 0.95);
      break;
    case 'globe':
      moonGlobe(k);
      break;
    default:
      k.paint(ext(roundRectShape(0.6, 0.6, 0.2), 0.3, 0.05, 6), '#ffc83d', 0, 0.3, 0);
  }
}

/** Build every decoration at its spot (styles in spot order; extra styles are ignored). */
export function buildDecor(mats: AcademyMats, styles: string[], spots: Array<{ pos: Vector3; rotY: number }>, shadows: boolean): DecorBuild {
  const group = new Group();
  const rotors: Group[] = [];
  const k = new AKit(mats);
  styles.slice(0, spots.length).forEach((style, i) => {
    const s = spots[i];
    k.at(s.pos.x, s.pos.y, s.pos.z, s.rotY, 1, () => decorKit(k, style));
    if (style === 'mobile') {
      const rk = new AKit(mats);
      mobileRotor(rk);
      const rotor = new Group();
      for (const m of rk.meshes(shadows)) rotor.add(m as Mesh);
      // Hang the rotor under the end of the arm (arm points along local +x).
      rotor.position.set(s.pos.x + Math.cos(s.rotY) * 0.85, s.pos.y + 2.3, s.pos.z - Math.sin(s.rotY) * 0.85);
      rotor.rotation.y = i;
      group.add(rotor);
      rotors.push(rotor);
    }
  });
  for (const m of k.meshes(shadows)) group.add(m);
  return { group, rotors };
}
