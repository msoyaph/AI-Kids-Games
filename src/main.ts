import './ui/styles.css';
import * as THREE from 'three';
import { GameLoop } from './core/loop';
import { GameRenderer } from './render/renderer';
import { InputManager } from './input/manager';
import { ArenaModel } from './sim/arena';
import { TEST_ARENA } from './data/arenas';
import { World } from './sim/world';
import { KartVisual, buildSharedKartGeometry } from './render/kartModel';
import { ChaseCamera } from './render/camera';
import { buildArenaMesh } from './render/arenaMesh';
import { buildSky } from './render/sky';

function nextFrame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

async function boot(): Promise<void> {
  const bootUi = window.__boot;
  const canvas = document.getElementById('gl') as HTMLCanvasElement;
  const uiRoot = document.getElementById('ui') as HTMLDivElement;
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

  const input = new InputManager(uiRoot);
  input.inRace = true;
  if (gr.isTouch) input.touch.show(true);

  const ground = new ArenaModel(TEST_ARENA);
  const cfg = { body: 'zoomster', wheels: 'standard', glider: 'kite', paint: 'cherry', decal: 'none' };
  const world = new World({
    ground,
    speedClass: 'pro',
    seed: 1,
    racers: [
      { racerId: 'calex', kart: cfg, player: 0 },
      { racerId: 'calex', kart: { ...cfg, paint: 'ocean' }, player: -1 },
      { racerId: 'calex', kart: { ...cfg, paint: 'ocean' }, player: -1 },
    ],
    countdownTime: 0.1,
  });
  world.karts.forEach((k, i) => k.place(-20 + i * 4, 0, -50, 0));
  world.karts[0].autoAccel = gr.isTouch;

  const scene = new THREE.Scene();
  const profile = gr.quality.profile;
  const { dome } = buildSky(scene, TEST_ARENA.sky, profile.drawDistance);
  scene.add(buildArenaMesh(TEST_ARENA));
  const shared = buildSharedKartGeometry();
  const visuals = world.karts.map((k) => {
    const v = new KartVisual(k, shared);
    scene.add(v.root);
    return v;
  });
  const cam = new ChaseCamera(profile.drawDistance);

  const hud = document.createElement('div');
  hud.style.cssText = 'position:absolute;top:8px;left:8px;font:700 14px monospace;color:#fff;text-shadow:0 1px 2px #000;pointer-events:none;white-space:pre';
  uiRoot.appendChild(hud);

  (window as unknown as { __calex: unknown }).__calex = { world, input };
  let time = 0;
  const loop = new GameLoop({
    step: (dt) => {
      input.fillKartInput(0, world.karts[0].input, world.karts[0].autoAccel, world.phase === 'race');
      world.step(dt);
      world.events.clear();
    },
    render: (alpha, frameDt) => {
      time += frameDt;
      input.poll(frameDt);
      if (gr.quality.sample(frameDt)) gr.applyQuality();
      for (const v of visuals) v.update(alpha, frameDt, time);
      const k = world.karts[0];
      cam.update(k, alpha, frameDt, k.input.lookBack);
      dome.position.copy(cam.camera.position);
      gr.render([{ scene, camera: cam.camera, rect: { x: 0, y: 0, w: 1, h: 1 } }]);
      const st = gr.stats();
      hud.textContent = `${gr.quality.fps} fps · ${gr.quality.level} · dpr ${gr.quality.pixelRatio().toFixed(2)} · calls ${st.calls}\nspeed ${(k.speed * 3.6).toFixed(0)} km/h  drift ${k.drifting ? k.driftTier : '-'}  boost ${k.boostTime.toFixed(2)}  ${k.grounded ? 'ground' : 'air'}`;
    },
  });
  bootUi?.set(1, 'Ready');
  loop.start();
  bootUi?.done();
}

void boot();
