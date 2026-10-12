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
  const L = skyLights(sky);
  const hemi = new THREE.HemisphereLight(L.hemiSky, L.hemiGround, L.hemiIntensity);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(L.sun, L.sunIntensity);
  sun.position.copy(L.sunOffset);
  scene.add(sun);
  scene.add(sun.target);
  return { sun, dome };
}

/** Resolved light setup for a sky (used by the race scene and the scenery impostor atlas). */
export function skyLights(sky: SkyData): { hemiSky: THREE.Color; hemiGround: THREE.Color; hemiIntensity: number; sun: THREE.Color; sunIntensity: number; sunOffset: THREE.Vector3 } {
  const l = sky.light ?? {};
  const grade = new THREE.Color(l.grade ?? 0xffffff);
  const dir = l.sunDir ? new THREE.Vector3(...l.sunDir).normalize() : new THREE.Vector3(60, 120, 40).normalize();
  return {
    hemiSky: new THREE.Color(sky.ambient).multiply(grade),
    hemiGround: new THREE.Color(l.hemiGround ?? (sky.night ? 0x221a44 : 0x8a7a5a)).multiply(grade),
    hemiIntensity: l.hemiIntensity ?? (sky.night ? 1.1 : 1.45),
    sun: new THREE.Color(l.sun ?? sky.sun).multiply(grade),
    sunIntensity: l.sunIntensity ?? (sky.night ? 0.9 : 1.75),
    sunOffset: dir.multiplyScalar(140),
  };
}
