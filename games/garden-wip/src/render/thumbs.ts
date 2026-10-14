// Card pictures: each plant drawn once by the game's own renderer into a small offscreen target and
// turned into an image, so the cards show the same plush 3D plants as the garden (no image files).
import * as THREE from 'three';
import { newPoses, type Model } from './models/types';
import { ModelLayer } from './instanced';

export function thumbnail(renderer: THREE.WebGLRenderer, model: Model, size = 160): string {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xe4f4ff, 0x6f9a4c, 1.35));
  const sun = new THREE.DirectionalLight(0xfff0d6, 1.7);
  sun.position.set(-2, 5, 6);
  scene.add(sun);
  const layer = new ModelLayer(model, 1);
  for (const mesh of layer.meshes) { mesh.castShadow = mesh.receiveShadow = false; scene.add(mesh); }
  layer.begin();
  layer.push(0, 0, 0, 0, 1, 1, 1, newPoses(model.parts.length));
  layer.end();
  const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  const h = model.height;
  cam.position.set(0, h * 1.15 + 0.35, h * 2.3 + 0.9);
  cam.lookAt(0, h * 0.45, 0);
  const target = new THREE.WebGLRenderTarget(size, size, { samples: 4 });
  const before = renderer.getRenderTarget(), clear = renderer.getClearAlpha(), shadows = renderer.shadowMap.enabled;
  renderer.shadowMap.enabled = false;
  renderer.setRenderTarget(target);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, cam);
  const pixels = new Uint8Array(size * size * 4);
  renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels);
  renderer.setRenderTarget(before);
  renderer.setClearAlpha(clear);
  renderer.shadowMap.enabled = shadows;
  target.dispose();
  for (const mesh of layer.meshes) mesh.dispose();
  // the target is upside down compared with a canvas
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) img.data.set(pixels.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}
