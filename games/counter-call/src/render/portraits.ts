/** Little pictures of characters (data: URLs), drawn once from their 3D models, for menus. */
import * as THREE from 'three';
import type { CharacterDef } from '../data/characters';
import { Chibi } from './chibi';

export function renderPortraits(defs: CharacterDef[], size = 176): Record<string, string> {
  const out: Record<string, string> = {};
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fff8ec', '#f6d2a8', 1.9));
  const sun = new THREE.DirectionalLight('#fff4e0', 1.9);
  sun.position.set(-2, 4, 5);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  for (const def of defs) {
    const chibi = new Chibi(def);
    chibi.update(0);
    scene.add(chibi.group);
    // The whole character, hair and all, from slightly above.
    const top = chibi.top;
    camera.position.set(0.5, top * 0.62, top * 2.15);
    camera.lookAt(0, top * 0.5, 0);
    renderer.render(scene, camera);
    out[def.id] = renderer.domElement.toDataURL('image/png');
    chibi.dispose();
  }
  renderer.dispose();
  renderer.forceContextLoss();
  return out;
}
