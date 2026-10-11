import * as THREE from 'three';
import { GameLoop } from './core/loop';
import { GameRenderer } from './render/renderer';

function nextFrame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

async function boot(): Promise<void> {
  const bootUi = window.__boot;
  const canvas = document.getElementById('gl') as HTMLCanvasElement;
  let gr: GameRenderer;
  try {
    gr = new GameRenderer(canvas);
  } catch (err) {
    console.warn('WebGL init failed', err);
    bootUi?.fail();
    return;
  }
  bootUi?.set(0.4, 'Painting karts');
  await nextFrame();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87d0ff);
  scene.fog = new THREE.Fog(0x87d0ff, 40, 160);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7a6a4a, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(10, 20, 8);
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x6cd36b }));
  scene.add(ground);
  const kart = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.4), new THREE.MeshLambertMaterial({ color: 0xff4d6d }));
  kart.position.y = 0.6;
  scene.add(kart);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 400);
  camera.position.set(0, 3.5, -7);
  camera.lookAt(0, 0.8, 0);

  const fpsEl = document.createElement('div');
  fpsEl.style.cssText = 'position:absolute;top:8px;left:8px;font:700 14px monospace;color:#fff;text-shadow:0 1px 2px #000;';
  document.getElementById('ui')!.appendChild(fpsEl);

  let t = 0;
  const loop = new GameLoop({
    step: (dt) => {
      t += dt;
      kart.rotation.y = t * 0.8;
    },
    render: (_alpha, frameDt) => {
      if (gr.quality.sample(frameDt)) gr.applyQuality();
      gr.render([{ scene, camera, rect: { x: 0, y: 0, w: 1, h: 1 } }]);
      fpsEl.textContent = `${gr.quality.fps} fps · ${gr.quality.level} · dpr ${gr.quality.pixelRatio().toFixed(2)}`;
    },
  });
  bootUi?.set(1, 'Ready');
  loop.start();
  bootUi?.done();
}

void boot();
