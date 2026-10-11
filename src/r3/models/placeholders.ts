import {
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  RingGeometry,
  SphereGeometry,
  Vector2,
  type Material,
} from 'three';
import { atmosphereMaterial, flameMaterial } from '../materials';

/**
 * Temporary stand-ins used by the Phase 1 title screen. The real procedural planets (Phase 2)
 * and the 52-part rocket (Phase 3) replace them.
 */
export function simpleRocket(main = '#f4f7ff', accent = '#ff5d73', windowColor = '#4dd4ff'): { group: Group; flame: Mesh } {
  const g = new Group();
  const paint = new MeshStandardMaterial({ color: main, roughness: 0.35, metalness: 0.1 });
  const red = new MeshStandardMaterial({ color: accent, roughness: 0.4, metalness: 0.1 });
  const metal = new MeshStandardMaterial({ color: '#c9d2ee', roughness: 0.25, metalness: 0.9 });
  const glass = new MeshStandardMaterial({ color: windowColor, roughness: 0.05, metalness: 0.2, emissive: windowColor, emissiveIntensity: 0.35 });
  const prof: Vector2[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const y = -1 + t * 2.2;
    const r = 0.55 * Math.sin(Math.PI * (0.18 + t * 0.62)) + 0.05;
    prof.push(new Vector2(Math.max(0.02, r), y));
  }
  const body = new Mesh(new LatheGeometry(prof, 40), paint);
  const nose = new Mesh(new ConeGeometry(0.36, 0.75, 40), red);
  nose.position.y = 1.52;
  const win = new Mesh(new SphereGeometry(0.2, 24, 16), glass);
  win.position.set(0, 0.45, 0.47);
  win.scale.set(1, 1, 0.45);
  const rim = new Mesh(new CylinderGeometry(0.23, 0.23, 0.05, 32, 1, true), metal);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, 0.45, 0.47);
  const bell = new Mesh(new CylinderGeometry(0.22, 0.34, 0.32, 32, 1, true), metal);
  bell.position.y = -1.12;
  (bell.material as Material).side = DoubleSide;
  g.add(body, nose, win, rim, bell);
  for (let i = 0; i < 3; i++) {
    const fin = new Mesh(new CylinderGeometry(0.02, 0.32, 0.8, 3, 1), red);
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    fin.scale.set(0.15, 1, 1.4);
    fin.position.set(Math.cos(a) * 0.52, -0.62, Math.sin(a) * 0.52);
    fin.rotation.y = -a;
    g.add(fin);
  }
  const flame = new Mesh(new ConeGeometry(0.26, 1.2, 24, 1, true), flameMaterial('#ff9f43', '#fff36b'));
  flame.rotation.x = Math.PI;
  flame.position.y = -1.85;
  g.add(flame);
  return { group: g, flame };
}

export function simplePlanet(radius: number, color: string, atmo: string | null, segments = 64, sunDir: [number, number, number] = [1, 0.3, 0.2]): Group {
  const g = new Group();
  const mat = new MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });
  g.add(new Mesh(new SphereGeometry(radius, segments, Math.round(segments / 2)), mat));
  if (atmo) {
    const shell = new Mesh(new SphereGeometry(radius * 1.06, segments, Math.round(segments / 2)), atmosphereMaterial(atmo, { intensity: 1.6, power: 2.6, sunDir }));
    g.add(shell);
  }
  return g;
}

export function simpleRings(inner: number, outer: number, color: string): Mesh {
  const geo = new RingGeometry(inner, outer, 96, 1);
  const m = new MeshStandardMaterial({ color, roughness: 0.9, transparent: true, opacity: 0.8, side: DoubleSide });
  const ring = new Mesh(geo, m);
  ring.rotation.x = -Math.PI / 2;
  return ring;
}
