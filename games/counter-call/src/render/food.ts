/** The food, modelled in code, plus little pictures of each model for buttons and order bubbles. */
import * as THREE from 'three';
import { MENU, type FoodId } from '../data/menu';
import { at, box, cone, cyl, dome, geo, mesh, soft, sphere } from './kit';

/** A food model about 0.3 units across, sitting on the ground at the origin. */
export function makeFood(id: FoodId): THREE.Group {
  const g = new THREE.Group();
  switch (id) {
    case 'juice':
      g.add(at(mesh(cyl(1, 0.78, 18), soft('#ffab30', 0.4), 0.09, 0.2, 0.09), 0, 0.1, 0));
      g.add(at(mesh(cyl(1, 1, 18), soft('#ffffff', 0.5), 0.098, 0.022, 0.098), 0, 0.21, 0));
      g.add(at(mesh(cyl(1, 1, 8), soft('#f25f5c', 0.5), 0.013, 0.18, 0.013), 0.03, 0.29, 0, 0, 0, -0.28));
      g.add(at(mesh(cyl(1, 1, 14), soft('#ffd24a', 0.5), 0.05, 0.014, 0.05), -0.075, 0.225, 0.02, Math.PI / 2, 0, 0.3));
      break;
    case 'fries': {
      const carton = geo('carton', () => new THREE.CylinderGeometry(1, 0.72, 1, 4).rotateY(Math.PI / 4));
      g.add(at(mesh(carton, soft('#f25f5c', 0.6), 0.16, 0.17, 0.1), 0, 0.085, 0));
      g.add(at(mesh(box(), soft('#ffffff', 0.6), 0.2, 0.035, 0.125), 0, 0.1, 0));
      const fry = soft('#ffd24a', 0.6);
      for (let i = 0; i < 8; i++) {
        const h = 0.13 + ((i * 7) % 5) * 0.018;
        g.add(at(mesh(box(), fry, 0.024, h, 0.024), -0.077 + i * 0.022, 0.15 + h / 2 - 0.04, i % 2 ? 0.018 : -0.018, 0, 0, (i - 3.5) * 0.035));
      }
      break;
    }
    case 'burger': {
      const bun = soft('#e9a85c', 0.7);
      g.add(at(mesh(cyl(1, 0.85, 20), bun, 0.14, 0.05, 0.14), 0, 0.025, 0));
      g.add(at(mesh(cyl(1, 1, 20), soft('#7a4a32', 0.8), 0.15, 0.045, 0.15), 0, 0.073, 0));
      g.add(at(mesh(box(), soft('#ffd24a', 0.6), 0.25, 0.013, 0.25), 0, 0.102, 0, 0, Math.PI / 4));
      g.add(at(mesh(cyl(1, 1, 10), soft('#7ac36a', 0.7), 0.162, 0.016, 0.162), 0, 0.116, 0));
      g.add(at(mesh(cyl(1, 1, 20), soft('#f25f5c', 0.6), 0.135, 0.018, 0.135), 0, 0.133, 0));
      g.add(at(mesh(dome(), bun, 0.146, 0.105, 0.146), 0, 0.142, 0));
      const seed = soft('#fff3d6', 0.6);
      for (let i = 0; i < 6; i++) {
        const a = i * 1.9, r = 0.03 + (i % 3) * 0.03;
        g.add(at(mesh(sphere(6), seed, 0.011, 0.006, 0.011), Math.cos(a) * r, 0.142 + 0.103 * Math.sqrt(1 - (r / 0.146) ** 2), Math.sin(a) * r));
      }
      break;
    }
    case 'icecream':
      g.add(at(mesh(cone(), soft('#e2a85c', 0.7), 0.075, 0.2, 0.075), 0, 0.1, 0, Math.PI));
      g.add(at(mesh(sphere(16), soft('#ff9ec4', 0.6), 0.088), 0, 0.235, 0));
      g.add(at(mesh(sphere(16), soft('#fff3d6', 0.6), 0.07), 0, 0.335, 0));
      g.add(at(mesh(sphere(10), soft('#e2374c', 0.35), 0.027), 0.01, 0.41, 0));
      break;
    case 'pizza': {
      const wedge = geo('wedge', () => new THREE.CylinderGeometry(1, 1, 1, 10, 1, false, -Math.PI / 5, (Math.PI * 2) / 5).translate(0, 0, -0.55));
      const slice = new THREE.Group();
      slice.add(at(mesh(wedge, soft('#e9b06a', 0.75), 0.33, 0.034, 0.33), 0, 0.017, 0));
      slice.add(at(mesh(wedge, soft('#ffd66b', 0.6), 0.285, 0.012, 0.285), 0, 0.04, -0.025));
      const pep = soft('#e2574c', 0.6);
      for (const [x, z] of [[0, -0.07], [-0.055, 0.045], [0.06, 0.05], [0, 0.0]] as const) slice.add(at(mesh(cyl(1, 1, 12), pep, 0.03, 0.01, 0.03), x, 0.05, z));
      slice.rotation.x = -0.35;
      slice.position.y = 0.06;
      g.add(slice);
      break;
    }
  }
  return g;
}

/**
 * Renders each food model once to a small picture (a data: URL), so the buttons and order bubbles
 * show the very same food as the 3D scene. Uses a tiny throwaway renderer.
 */
export function renderFoodIcons(size = 144): Record<FoodId, string> {
  const out = {} as Record<FoodId, string>;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#ffdcb8', 2.1));
  const sun = new THREE.DirectionalLight('#ffffff', 1.9);
  sun.position.set(-1.5, 3, 2);
  scene.add(sun);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  const dir = new THREE.Vector3(0.35, 0.62, 1).normalize();
  const center = new THREE.Vector3(), dims = new THREE.Vector3();
  for (const food of MENU) {
    const model = makeFood(food.id);
    scene.add(model);
    const bounds = new THREE.Box3().setFromObject(model);
    bounds.getCenter(center);
    const half = bounds.getSize(dims).length() * 0.5;
    camera.left = camera.bottom = -half;
    camera.right = camera.top = half;
    camera.position.copy(center).addScaledVector(dir, 4);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    out[food.id] = renderer.domElement.toDataURL('image/png');
    scene.remove(model);
  }
  renderer.dispose();
  renderer.forceContextLoss();
  return out;
}
