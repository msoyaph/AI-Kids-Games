import * as THREE from 'three';
import type { SkyData } from '../data/types';

/** Gradient sky dome + lights + fog for a course. Returns the objects added to the scene. */
export function buildSky(scene: THREE.Scene, sky: SkyData, drawDistance: number): { sun: THREE.DirectionalLight; dome: THREE.Mesh } {
  const r = drawDistance * 0.95;
  const geo = new THREE.SphereGeometry(r, 24, 12);
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const top = new THREE.Color(sky.top);
  const bottom = new THREE.Color(sky.bottom);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = Math.max(0, Math.min(1, pos.getY(i) / r * 1.6 + 0.15));
    c.copy(bottom).lerp(top, t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const dome = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  scene.add(dome);
  scene.background = new THREE.Color(sky.bottom);
  const near = (sky.fogNear ?? 0.35) * drawDistance;
  scene.fog = new THREE.Fog(sky.fog, near, drawDistance * 0.92);
  const hemi = new THREE.HemisphereLight(sky.ambient, sky.night ? 0x221a44 : 0x8a7a5a, sky.night ? 1.1 : 1.45);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(sky.sun, sky.night ? 0.9 : 1.75);
  sun.position.set(60, 120, 40);
  scene.add(sun);
  scene.add(sun.target);
  return { sun, dome };
}
